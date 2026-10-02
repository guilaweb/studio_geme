'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  DollarSign, 
  FileSignature, 
  Eye, 
  ChevronRight,
  BarChart3,
  Scale,
  Printer
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { compileExecutiveBoardDossierPDF } from '@/lib/pdf/technical-reports-pdf';
import { ExecutivePdfViewerModal } from '@/components/pdf/executive-pdf-viewer-modal';
import type { jsPDFWithAutoTable } from '@/lib/pdf/executive-pdf-engine';
import type { Project } from '@/types/project';
import type { Transaction } from '@/types/finance';
import type { SupplierInvoice } from '@/types/purchasing';
import type { Risk } from '@/types/risk';

interface ExecutiveCockpitViewProps {
  projectId: string;
  project: Project | null;
  onNavigateToTab?: (tab: string) => void;
}

export function ExecutiveCockpitView({ projectId, project, onNavigateToTab }: ExecutiveCockpitViewProps) {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<SupplierInvoice[]>([]);
  const [criticalRisks, setCriticalRisks] = useState<Risk[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // PDF Viewer Modal Direto no Cockpit (1 Clique)
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [generatedPdfDoc, setGeneratedPdfDoc] = useState<jsPDFWithAutoTable | null>(null);

  const handleOpenBoardDossierPdf = () => {
    if (!project) return;
    try {
      const doc = compileExecutiveBoardDossierPDF({
        project,
        transactions,
        risks: criticalRisks,
      });
      setGeneratedPdfDoc(doc);
      setPdfModalOpen(true);
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar dossiê executivo',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!projectId) return;

    // Transações financeiras reais
    const transQuery = query(collection(db, 'projects', projectId, 'transactions'));
    const unsubTrans = onSnapshot(transQuery, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    });

    // Faturas pendentes de aprovação da esteira de compras
    const invoicesQuery = query(collection(db, 'projects', projectId, 'supplierInvoices'), orderBy('invoiceDate', 'desc'));
    const unsubInvoices = onSnapshot(invoicesQuery, snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as SupplierInvoice));
      setPendingInvoices(items.filter(i => i.status === 'Pendente' || (i as any).status === 'Recebida' || (i as any).status === 'draft' || (i as any).status === 'pending'));
    }, err => {
      console.warn('Erro ao carregar faturas executivas:', err);
      setPendingInvoices([]);
    });

    // Riscos Críticos
    const risksQuery = query(collection(db, 'projects', projectId, 'risks'));
    const unsubRisks = onSnapshot(risksQuery, snap => {
      const allRisks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Risk));
      setCriticalRisks(allRisks.filter(r => (r.impact >= 4 && r.probability >= 3) || ((r as any).severity === 'Alta')));
    });

    return () => {
      unsubTrans();
      unsubInvoices();
      unsubRisks();
    };
  }, [projectId]);

  // Indicadores de Alto Nível de Engenharia Financeira
  const budgetBAC = project?.budget || 0;
  const progressPhysical = (project?.progress || 0) / 100;

  const actualCostAC = useMemo(() => {
    return transactions
      .filter(t => t.type === 'Despesa')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions]);

  // Earned Value (EV) = BAC * Progresso Físico
  const earnedValueEV = budgetBAC * progressPhysical;

  // Planned Value (PV) estimado proporcional ao tempo
  const plannedValuePV = budgetBAC * Math.min(1, Math.max(0.1, progressPhysical + 0.05));

  // CPI = EV / AC
  const cpi = actualCostAC > 0 ? earnedValueEV / actualCostAC : 1.0;
  // SPI = EV / PV
  const spi = plannedValuePV > 0 ? earnedValueEV / plannedValuePV : 1.0;

  // Estimativa no Término (EAC) = BAC / CPI
  const eac = cpi > 0 ? budgetBAC / cpi : budgetBAC;

  // Margem Estimada
  const estimatedOriginalMarginAOA = budgetBAC * 0.18; // 18% contratual padrão
  const estimatedCurrentMarginAOA = budgetBAC - eac + estimatedOriginalMarginAOA;
  const marginPct = budgetBAC > 0 ? (estimatedCurrentMarginAOA / budgetBAC) * 100 : 18;

  // Formatação Kz
  const fmtKz = (val: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Aprovação Executiva de Fatura em 1 Clique
  const handleApproveInvoice = async (invoiceId: string, supplierName?: string) => {
    setApprovingId(invoiceId);
    try {
      const invRef = doc(db, 'projects', projectId, 'supplierInvoices', invoiceId);
      await updateDoc(invRef, {
        status: 'Aprovada',
        approvedAt: Timestamp.now(),
      });
      toast({
        title: 'Fatura Aprovada com Sucesso!',
        description: `A ordem de pagamento para "${supplierName || 'Fornecedor'}" foi validada na alçada executiva.`,
      });
    } catch (err: any) {
      toast({ title: 'Erro na Aprovação', description: err.message, variant: 'destructive' });
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho do Modo Cockpit */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white rounded-xl p-6 shadow-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Cockpit Executivo & Direção</h1>
            <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider">
              CFO / Direção
            </Badge>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Visão de alto impacto: índices agregados de prazo, custo, rentabilidade e decisões que requerem aprovação.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Avanço Físico Real</div>
            <div className="text-lg font-bold font-mono text-emerald-400">{((project?.progress || 0)).toFixed(0)}%</div>
          </div>
          <div className="h-8 w-px bg-slate-700"></div>
          <Button
            size="sm"
            onClick={handleOpenBoardDossierPdf}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            Dossiê Executivo (PDF 1-Clique)
          </Button>

          {onNavigateToTab && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigateToTab('relatorios')}
              className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white text-xs"
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1" />
              Ver Relatórios
            </Button>
          )}
        </div>
      </div>

      {/* Os 4 Indicadores Macroeconómicos da Obra */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* INDICADOR 1: SPI (Desvio de Prazo) */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase">Índice de Prazo (SPI)</CardDescription>
              <Badge variant={spi >= 1.0 ? 'outline' : 'destructive'} className="text-[10px] font-mono">
                {spi >= 1.0 ? 'No Cronograma' : 'Atraso Moderado'}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-foreground">
              {spi.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {spi >= 1.0 ? (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Ritmo de produção em linha
              </span>
            ) : (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Ritmo {((1 - spi) * 100).toFixed(0)}% abaixo da meta
              </span>
            )}
          </CardContent>
        </Card>

        {/* INDICADOR 2: CPI (Desvio de Custo) */}
        <Card className={`border-l-4 ${cpi >= 1.0 ? 'border-l-emerald-500' : 'border-l-red-500'} shadow-sm`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase">Índice de Custo (CPI)</CardDescription>
              <Badge variant={cpi >= 1.0 ? 'outline' : 'destructive'} className="text-[10px] font-mono">
                {cpi >= 1.0 ? 'Eficiente' : 'Custo Elevado'}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-foreground">
              {cpi.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {cpi >= 1.0 ? (
              <span className="text-emerald-600 font-medium">Cada 1 Kz gasto produz {(cpi).toFixed(2)} Kz em valor</span>
            ) : (
              <span className="text-red-600 font-medium">Sobrecusto de {((1 - cpi) * 100).toFixed(0)}% na execução</span>
            )}
          </CardContent>
        </Card>

        {/* INDICADOR 3: Margem Real Projetada */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase">Margem Líquida Prevista</CardDescription>
              <span className="text-xs font-mono font-bold text-amber-600">{marginPct.toFixed(1)}%</span>
            </div>
            <CardTitle className="text-xl font-bold font-mono text-foreground">
              {fmtKz(estimatedCurrentMarginAOA)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Meta contratual: 18.0% ({fmtKz(estimatedOriginalMarginAOA)})
          </CardContent>
        </Card>

        {/* INDICADOR 4: Previsão no Término (EAC) */}
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase">Custo no Término (EAC)</CardDescription>
              <Badge variant="outline" className="text-[10px]">Projeção</Badge>
            </div>
            <CardTitle className="text-xl font-bold font-mono text-foreground">
              {fmtKz(eac)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Orçamento Original: {fmtKz(budgetBAC)}
          </CardContent>
        </Card>
      </div>

      {/* CENTRO DE ALERTAS VERMELHOS & DECISÕES QUE EXIGEM APROVAÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Faturas Pendentes de Aprovação (Alçada Executiva) */}
        <Card className="border-amber-200 dark:border-amber-900/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-foreground">
                <FileSignature className="h-4 w-4 text-amber-500" />
                Faturas Pendentes de Aprovação (Alçadas)
              </CardTitle>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 text-xs">
                {pendingInvoices.length} {pendingInvoices.length === 1 ? 'Pendente' : 'Pendentes'}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Validação executiva de compromissos com fornecedores de inertes, cimento e frotas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingInvoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                Todas as faturas foram validadas. Nenhuma aprovação pendente.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingInvoices.slice(0, 4).map(inv => {
                  const due = inv.dueDate ? ((inv.dueDate as any).toDate ? (inv.dueDate as any).toDate() : new Date(inv.dueDate as any)) : null;
                  const supplierDisplayName = (inv as any).supplierName || `Fornecedor (${inv.supplierId ? inv.supplierId.slice(0, 8) : 'Geral'})`;
                  return (
                    <div 
                      key={inv.id} 
                      className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{supplierDisplayName}</div>
                        <div className="text-muted-foreground text-[11px]">
                          Nº {inv.invoiceNumber || inv.id.slice(0, 8)} • Vencimento: {due ? due.toLocaleDateString('pt-PT') : 'Imediato'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-mono font-bold text-sm text-foreground">
                          {fmtKz(inv.totalAmount || 0)}
                        </div>
                        <Button
                          size="sm"
                          disabled={approvingId === inv.id}
                          onClick={() => handleApproveInvoice(inv.id, supplierDisplayName)}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {approvingId === inv.id ? 'A aprovar...' : 'Aprovar'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Riscos Críticos e Alertas de Conformidade */}
        <Card className="border-red-200 dark:border-red-900/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-foreground">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                Alertas Críticos de Risco & Segurança
              </CardTitle>
              <Badge variant="destructive" className="text-xs">
                {criticalRisks.length} Alertas
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Vulnerabilidades de impacto severo no custo ou na operação da obra.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {criticalRisks.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                Nenhum risco crítico de severidade alta assinalado no projeto.
              </div>
            ) : (
              <div className="space-y-3">
                {criticalRisks.slice(0, 4).map(r => (
                  <div 
                    key={r.id} 
                    className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-xs space-y-1"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-red-900 dark:text-red-200">{r.description}</span>
                      <Badge variant="destructive" className="text-[10px]">Impacto Alto</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      <strong>Plano de Mitigação:</strong> {r.mitigationPlan || 'Ações preventivas sob supervisão da fiscalização.'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Pré-Visualização & Download do PDF Executivo do Conselho */}
      <ExecutivePdfViewerModal
        open={pdfModalOpen}
        onOpenChange={setPdfModalOpen}
        pdfDoc={generatedPdfDoc}
        title={`Dossiê Executivo do Conselho: ${project?.name || 'Empreitada'}`}
        fileName={`Dossie_Executivo_Conselho_${project?.name?.replace(/\s+/g, '_') || 'Obra'}.pdf`}
        documentType="DOSSIÊ EXECUTIVO DE GOVERNANÇA (EVA / SPI / CPI)"
      />
    </div>
  );
}
