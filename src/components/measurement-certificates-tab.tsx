'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  PlusCircle, FileCheck2, CheckCircle2, Clock, AlertTriangle, XCircle,
  CreditCard, TrendingUp, ChevronDown, ChevronUp, Printer, Send, Loader2, Sparkles
} from 'lucide-react';
import type {
  MeasurementCertificate, MeasurementLineItem, MeasurementStatus, MeasurementParty
} from '@/types/measurement-certificate';
import type { Project } from '@/types/project';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { MeasurementWizardModal } from '@/components/wizards/measurement-wizard-modal';
import { compileExecutiveMeasurementBookPDF } from '@/lib/pdf/measurement-book-pdf';
import { ExecutivePdfViewerModal } from '@/components/pdf/executive-pdf-viewer-modal';
import type { jsPDFWithAutoTable } from '@/lib/pdf/executive-pdf-engine';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<MeasurementStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: 'Rascunho',    color: 'bg-gray-100 text-gray-700 border-gray-200',    icon: Clock },
  submitted: { label: 'Submetido',   color: 'bg-blue-100 text-blue-800 border-blue-200',    icon: Send },
  approved:  { label: 'Aprovado',    color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  disputed:  { label: 'Disputado',   color: 'bg-red-100 text-red-800 border-red-200',       icon: XCircle },
  paid:      { label: 'Pago',        color: 'bg-purple-100 text-purple-800 border-purple-200', icon: CreditCard },
};

const partyLabel: Record<MeasurementParty, string> = {
  client:        'Auto DO / Cliente',
  contractor:    'Empreiteiro Geral',
  subcontractor: 'Subempreiteiro',
};

const formatKz = (v: number) =>
  new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(v);
const formatEUR = formatKz; // Aliased for full backwards compatibility

// ─── Component ────────────────────────────────────────────────────────────────

interface MeasurementCertificatesTabProps {
  projectId: string;
  project?: Project | null;
}

export default function MeasurementCertificatesTab({ projectId, project }: MeasurementCertificatesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [certs, setCerts] = useState<MeasurementCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<MeasurementStatus | 'all'>('all');

  // Dispute / Rejection State
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [selectedCertForDispute, setSelectedCertForDispute] = useState<MeasurementCertificate | null>(null);
  const [disputeReasonText, setDisputeReasonText] = useState('');

  // PDF Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activePdfDoc, setActivePdfDoc] = useState<jsPDFWithAutoTable | null>(null);
  const [viewerTitle, setViewerTitle] = useState('');
  const [viewerFileName, setViewerFileName] = useState('');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    const q = query(
      collection(db, 'projects', projectId, 'measurementCertificates'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCerts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MeasurementCertificate)));
      setLoading(false);
    }, (error) => {
      console.error("Error loading measurement certificates:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  // New certificate form state
  const [fPeriod, setFPeriod] = useState('');
  const [fStart, setFStart] = useState('');
  const [fEnd, setFEnd] = useState('');
  const [fParty, setFParty] = useState<MeasurementParty>('subcontractor');
  const [fSubName, setFSubName] = useState('');
  const [fContract, setFContract] = useState('');
  const [fRetention, setFRetention] = useState('5');
  const [fPreparedBy, setFPreparedBy] = useState('');
  const [fCheckedBy, setFCheckedBy] = useState('');
  const [fNotes, setFNotes] = useState('');

  // KPIs
  const totalCerts = certs.length;
  const totalPaid = certs.filter(c => c.status === 'paid').reduce((s, c) => s + c.currentPeriodValue, 0);
  const totalApproved = certs.filter(c => c.status === 'approved').reduce((s, c) => s + c.currentPeriodValue, 0);
  const totalSubmitted = certs.filter(c => c.status === 'submitted').reduce((s, c) => s + c.currentPeriodValue, 0);
  const totalRetention = certs.reduce((s, c) => s + c.retentionAmount, 0);

  const filtered = filterStatus === 'all' ? certs : certs.filter(c => c.status === filterStatus);

  const handleCreate = async () => {
    if (!fPeriod.trim()) {
      toast({ title: 'Campo Obrigatório', description: 'Indique o período de referência do auto (ex: Mês/Ano).', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newCertData = {
        projectId,
        certificateNumber: `AM-${new Date().getFullYear()}-${String(certs.length + 1).padStart(3, '0')}`,
        period: fPeriod,
        periodStart: fStart || new Date().toISOString().split('T')[0],
        periodEnd: fEnd || new Date().toISOString().split('T')[0],
        party: fParty,
        subcontractorName: fSubName || (fParty === 'subcontractor' ? 'Subempreiteiro' : 'Cliente / DO'),
        contractNumber: fContract || `CTR-${new Date().getFullYear()}-01`,
        status: 'draft',
        lineItems: [],
        previousAccumulated: 0,
        currentPeriodValue: 0,
        newAccumulated: 0,
        contractTotalValue: 0,
        retentionPct: parseFloat(fRetention) || 5,
        retentionAmount: 0,
        netPayable: 0,
        preparedBy: fPreparedBy || user?.displayName || 'Medidor Orçamentista',
        checkedBy: fCheckedBy || 'Diretor de Obra',
        notes: fNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'projects', projectId, 'measurementCertificates'), newCertData);

      setIsDialogOpen(false);
      setFPeriod(''); setFStart(''); setFEnd(''); setFSubName('');
      setFContract(''); setFRetention('5'); setFPreparedBy(''); setFCheckedBy(''); setFNotes('');
      toast({ title: 'Auto de Medição Criado!', description: 'O auto foi gravado em estado de rascunho.' });
    } catch (error) {
      console.error("Error creating measurement certificate:", error);
      toast({ title: 'Erro ao criar auto de medição', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusAdvance = async (id: string) => {
    const cert = certs.find(c => c.id === id);
    if (!cert) return;
    const order: MeasurementStatus[] = ['draft', 'submitted', 'approved', 'paid'];
    const idx = order.indexOf(cert.status);
    if (idx < order.length - 1 || cert.status === 'disputed') {
      const nextStatus = cert.status === 'disputed' ? 'submitted' : order[idx + 1];
      try {
        const certRef = doc(db, 'projects', projectId, 'measurementCertificates', id);
        const currentTrail = cert.auditTrail || [];
        const newTrail = [
          ...currentTrail,
          {
            status: nextStatus,
            changedBy: user?.displayName || user?.email || 'Gestor de Obra',
            date: new Date().toISOString(),
            notes: cert.status === 'disputed' 
              ? 'Auto corrigido e ressubmetido para homologação'
              : `Transição formal para ${statusConfig[nextStatus].label}`,
          }
        ];
        const updatePayload: any = { 
          status: nextStatus, 
          updatedAt: new Date().toISOString(),
          auditTrail: newTrail
        };
        if (nextStatus === 'approved') {
          updatePayload.approvedBy = user?.displayName || 'Fiscal / Diretor';
          updatePayload.approvalDate = new Date().toISOString().split('T')[0];
        }
        await updateDoc(certRef, updatePayload);
        toast({ title: 'Estado Atualizado', description: `Auto avançado para ${statusConfig[nextStatus].label}.` });
      } catch (error) {
        console.error("Error advancing measurement status:", error);
        toast({ title: 'Erro ao atualizar estado do auto', variant: 'destructive' });
      }
    }
  };

  const handleDisputeCert = async () => {
    if (!selectedCertForDispute || !disputeReasonText.trim()) {
      toast({ title: 'Motivo Obrigatório', description: 'Por favor, indique a justificação técnica para a disputa/rejeição.', variant: 'destructive' });
      return;
    }
    try {
      const certRef = doc(db, 'projects', projectId, 'measurementCertificates', selectedCertForDispute.id);
      const currentTrail = selectedCertForDispute.auditTrail || [];
      const newTrail = [
        ...currentTrail,
        {
          status: 'disputed' as MeasurementStatus,
          changedBy: user?.displayName || user?.email || 'Fiscal da Empreitada',
          date: new Date().toISOString(),
          notes: disputeReasonText.trim(),
        }
      ];
      await updateDoc(certRef, {
        status: 'disputed',
        disputeReason: disputeReasonText.trim(),
        updatedAt: new Date().toISOString(),
        auditTrail: newTrail
      });
      toast({ title: 'Auto em Disputa', description: 'O auto foi colocado em disputa com registo formal do motivo.' });
      setDisputeDialogOpen(false);
      setDisputeReasonText('');
      setSelectedCertForDispute(null);
    } catch (err: any) {
      toast({ title: 'Erro ao disputar auto', description: err.message, variant: 'destructive' });
    }
  };

  const handlePrintCert = (cert: MeasurementCertificate) => {
    try {
      const realProj: Project = project || {
        id: projectId,
        name: 'Obra Principal',
        budget: cert.contractTotalValue || cert.currentPeriodValue * 2,
        progress: 0,
        status: 'Em Execução',
        ownerId: user?.uid || 'user'
      };

      const lineItems: MeasurementLineItem[] = cert.lineItems && cert.lineItems.length > 0 ? cert.lineItems : [
        {
          id: 'li-1',
          wbsRef: '1.0',
          description: `Trabalhos Medidos no Período - ${cert.period}`,
          unit: 'vg',
          unitPrice: cert.currentPeriodValue,
          previousQty: cert.previousAccumulated > 0 ? 1 : 0,
          currentQty: 1,
          totalQty: 1,
          contractQty: 1,
          currentValue: cert.currentPeriodValue,
          totalValue: cert.newAccumulated || cert.currentPeriodValue,
          contractValue: cert.contractTotalValue || cert.currentPeriodValue,
          deviationPct: 0
        }
      ];

      const doc = compileExecutiveMeasurementBookPDF({
        project: realProj,
        certificate: cert,
        items: lineItems
      });

      setActivePdfDoc(doc);
      setViewerTitle(`Auto de Medição Oficial • ${cert.certificateNumber}`);
      setViewerFileName(`Auto_Medicao_${cert.certificateNumber.replace(/[\/\s]/g, '_')}`);
      setViewerOpen(true);
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-emerald-600" />
            Autos de Medição
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Certificados formais de medição para controlo de pagamentos e homologação fiscal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setIsWizardOpen(true)} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Novo Auto (Wizard Inteligente)
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="text-xs"
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            Manual
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total de Autos</div>
            <div className="text-3xl font-bold text-emerald-700">{totalCerts}</div>
            <div className="text-xs text-muted-foreground mt-1">Emitidos no projeto</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Liquidado</div>
            <div className="text-xl font-bold text-green-700">{formatEUR(totalPaid)}</div>
            <div className="text-xs text-muted-foreground mt-1">Pagamentos processados</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Aprovado / Submetido</div>
            <div className="text-xl font-bold text-blue-700">{formatEUR(totalApproved + totalSubmitted)}</div>
            <div className="text-xs text-muted-foreground mt-1">A aguardar pagamento</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Retenção Acumulada</div>
            <div className="text-xl font-bold text-orange-700">{formatEUR(totalRetention)}</div>
            <div className="text-xs text-muted-foreground mt-1">Garantia por liberar</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Filtrar:</span>
        {(['all', 'draft', 'submitted', 'approved', 'disputed', 'paid'] as const).map(s => (
          <Button
            key={s}
            variant={filterStatus === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(s)}
            className={filterStatus === s ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            {s === 'all' ? 'Todos' : statusConfig[s as MeasurementStatus].label}
          </Button>
        ))}
      </div>

      {/* Certificates */}
      <div className="space-y-3">
        {filtered.map(cert => {
          const cfg = statusConfig[cert.status];
          const Icon = cfg.icon;
          const isExpanded = expandedId === cert.id;
          const pct = cert.contractTotalValue > 0
            ? (cert.newAccumulated / cert.contractTotalValue) * 100
            : 0;
          const canAdvance = cert.status !== 'paid' && cert.status !== 'disputed';

          return (
            <Card key={cert.id} className="overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : cert.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-200">
                    <FileCheck2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{cert.certificateNumber}</span>
                      <span className="text-muted-foreground">—</span>
                      <span className="text-sm font-medium">{cert.period}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {partyLabel[cert.party]}
                      {cert.subcontractorName && ` · ${cert.subcontractorName}`}
                      {' · '}{cert.contractNumber}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <div className="font-bold text-emerald-700">{formatEUR(cert.currentPeriodValue)}</div>
                    <div className="text-xs text-muted-foreground">Período atual</div>
                  </div>
                  <div className="hidden lg:block min-w-[120px]">
                    <Progress value={Math.min(pct, 100)} className="h-1.5" />
                    <div className="text-xs text-muted-foreground text-center mt-1">{pct.toFixed(1)}% do contrato</div>
                  </div>
                  <Badge className={`${cfg.color} border flex items-center gap-1`}>
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t bg-muted/10 p-4 space-y-4">
                  {/* Summary row */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: 'Acumulado Anterior', value: formatKz(cert.previousAccumulated), color: 'text-gray-700' },
                      { label: 'Período Atual',      value: formatKz(cert.currentPeriodValue),  color: 'text-emerald-700 font-bold' },
                      { label: 'Novo Acumulado',     value: formatKz(cert.newAccumulated),      color: 'text-blue-700' },
                      { label: `Retenção (${cert.retentionPct}%)`, value: formatKz(cert.retentionAmount), color: 'text-orange-700' },
                      { label: 'Líquido a Pagar',    value: formatKz(cert.netPayable),          color: 'text-green-700 font-bold text-lg' },
                    ].map(item => (
                      <div key={item.label} className="bg-card rounded-xl border p-3 text-center shadow-2xs">
                        <div className="text-xs text-muted-foreground">{item.label}</div>
                        <div className={`text-sm ${item.color}`}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Disputed Alert Banner */}
                  {cert.status === 'disputed' && cert.disputeReason && (
                    <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/80 dark:bg-red-950/40 text-xs text-red-900 dark:text-red-200 flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Motivo da Disputa Técnica / Rejeição: </span>
                        <span>{cert.disputeReason}</span>
                      </div>
                    </div>
                  )}

                  {/* Audit Trail Badge Strip */}
                  {cert.auditTrail && cert.auditTrail.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-muted/40 border text-[11px] text-muted-foreground space-y-1">
                      <span className="font-semibold text-foreground">Histórico de Validação:</span>
                      <div className="flex flex-wrap gap-2">
                        {cert.auditTrail.map((trail, tIdx) => (
                          <span key={tIdx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-background border text-[10px]">
                            <strong>{trail.changedBy}</strong> ({statusConfig[trail.status]?.label || trail.status}) em {trail.date.split('T')[0]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Line items: MOBILE FIRST CARDS */}
                  {cert.lineItems.length > 0 && (
                    <>
                      {/* Mobile Cards (View for screen < 768px) */}
                      <div className="block md:hidden space-y-2.5">
                        {cert.lineItems.map(li => (
                          <div key={li.id} className="p-3 bg-card rounded-xl border text-xs space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-primary">{li.wbsRef}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {li.unit}
                              </Badge>
                            </div>
                            <p className="font-semibold text-foreground leading-snug">{li.description}</p>
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t text-[11px]">
                              <div>
                                <span className="text-muted-foreground">Qt. Atual: </span>
                                <span className="font-bold text-emerald-700">{li.currentQty.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">P. Unit: </span>
                                <span className="font-mono">{formatKz(li.unitPrice)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Valor Período: </span>
                                <span className="font-bold text-foreground">{formatKz(li.currentValue)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Desvio: </span>
                                <span className={li.deviationPct < 0 ? 'text-blue-600' : li.deviationPct > 10 ? 'text-red-600' : 'text-green-600'}>
                                  {li.deviationPct > 0 ? '+' : ''}{li.deviationPct.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table (View for screen >= 768px) */}
                      <div className="hidden md:block overflow-x-auto rounded-xl border bg-card">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 text-xs">
                              <TableHead>EAP</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead>Un.</TableHead>
                              <TableHead>P.Unit. (Kz)</TableHead>
                              <TableHead>Qt. Ant.</TableHead>
                              <TableHead>Qt. Atual</TableHead>
                              <TableHead>Qt. Acum.</TableHead>
                              <TableHead>Qt. Contrato</TableHead>
                              <TableHead>Desvio</TableHead>
                              <TableHead>Valor Período (Kz)</TableHead>
                              <TableHead>Valor Acum. (Kz)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cert.lineItems.map(li => (
                              <TableRow key={li.id} className="text-sm">
                                <TableCell className="font-mono text-xs">{li.wbsRef}</TableCell>
                                <TableCell className="max-w-[200px]">
                                  <span title={li.description}>{li.description}</span>
                                </TableCell>
                                <TableCell>{li.unit}</TableCell>
                                <TableCell className="font-mono">{formatKz(li.unitPrice)}</TableCell>
                                <TableCell className="text-muted-foreground">{li.previousQty.toFixed(2)}</TableCell>
                                <TableCell className="font-semibold text-emerald-700">{li.currentQty.toFixed(2)}</TableCell>
                                <TableCell>{li.totalQty.toFixed(2)}</TableCell>
                                <TableCell className="text-muted-foreground">{li.contractQty.toFixed(2)}</TableCell>
                                <TableCell>
                                  <span className={li.deviationPct < 0 ? 'text-blue-600' : li.deviationPct > 10 ? 'text-red-600' : 'text-green-600'}>
                                    {li.deviationPct > 0 ? '+' : ''}{li.deviationPct.toFixed(1)}%
                                  </span>
                                </TableCell>
                                <TableCell className="font-semibold">{formatKz(li.currentValue)}</TableCell>
                                <TableCell className="font-mono">{formatKz(li.totalValue)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                  {cert.lineItems.length === 0 && (
                    <div className="text-center text-muted-foreground py-4 text-sm">
                      Nenhuma linha adicionada — auto em rascunho.
                    </div>
                  )}

                  {/* Footer: metadata + actions */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>Preparado por: <span className="font-medium text-foreground">{cert.preparedBy}</span></div>
                      {cert.checkedBy && <div>Verificado por: <span className="font-medium text-foreground">{cert.checkedBy}</span></div>}
                      {cert.approvedBy && <div>Aprovado por: <span className="font-medium text-emerald-700 font-bold">{cert.approvedBy}</span> em {cert.approvalDate}</div>}
                      {cert.notes && <div className="italic text-muted-foreground mt-1">{cert.notes}</div>}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button size="sm" variant="outline" onClick={() => handlePrintCert(cert)} className="text-xs h-8">
                        <Printer className="h-3.5 w-3.5 mr-1.5" />
                        PDF Oficial
                      </Button>
                      {/* Dispute button when in submitted state */}
                      {cert.status === 'submitted' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCertForDispute(cert);
                            setDisputeReasonText('');
                            setDisputeDialogOpen(true);
                          }}
                          className="text-xs h-8"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                          Disputar / Rejeitar
                        </Button>
                      )}
                      {canAdvance && (
                        <Button
                          size="sm"
                          className={cn(
                            'text-xs h-8 text-white',
                            cert.status === 'disputed' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                          )}
                          onClick={(e) => { e.stopPropagation(); handleStatusAdvance(cert.id); }}
                        >
                          {cert.status === 'draft' && <><Send className="h-3.5 w-3.5 mr-1.5" />Submeter Auto</>}
                          {cert.status === 'submitted' && <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Aprovar Medição</>}
                          {cert.status === 'disputed' && <><Send className="h-3.5 w-3.5 mr-1.5" />Ressubmeter Auto</>}
                          {cert.status === 'approved' && <><CreditCard className="h-3.5 w-3.5 mr-1.5" />Marcar Pago</>}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* New Certificate Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-emerald-600" />
              Criar Novo Auto de Medição
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Período *</Label>
              <Input placeholder="ex.: Março 2025" value={fPeriod} onChange={e => setFPeriod(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data Início</Label>
                <Input type="date" value={fStart} onChange={e => setFStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Data Fim</Label>
                <Input type="date" value={fEnd} onChange={e => setFEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Parte</Label>
              <Select value={fParty} onValueChange={v => setFParty(v as MeasurementParty)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subcontractor">Subempreiteiro</SelectItem>
                  <SelectItem value="contractor">Empreiteiro Geral</SelectItem>
                  <SelectItem value="client">Dono de Obra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {fParty === 'subcontractor' && (
              <div className="space-y-1">
                <Label>Nome do Subempreiteiro</Label>
                <Input placeholder="Nome da empresa" value={fSubName} onChange={e => setFSubName(e.target.value)} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nº Contrato</Label>
                <Input placeholder="CTR-2025-XXX" value={fContract} onChange={e => setFContract(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Retenção (%)</Label>
                <Input type="number" value={fRetention} onChange={e => setFRetention(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Preparado por *</Label>
                <Input placeholder="Eng. Nome" value={fPreparedBy} onChange={e => setFPreparedBy(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Verificado por</Label>
                <Input placeholder="Dir. Nome" value={fCheckedBy} onChange={e => setFCheckedBy(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea rows={2} value={fNotes} onChange={e => setFNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCreate}
              disabled={!fPeriod || !fPreparedBy}
            >
              <FileCheck2 className="h-4 w-4 mr-2" />
              Criar Auto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wizard Modal de Medição Guiado */}
      <MeasurementWizardModal
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        projectId={projectId}
        project={project || null}
      />

      {/* Visualizador Executivo de Alta Fidelidade */}
      <ExecutivePdfViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        pdfDoc={activePdfDoc}
        title={viewerTitle}
        fileName={viewerFileName}
        documentType="AUTO OFICIAL DE MEDIÇÃO"
      />

      {/* Modal de Disputa / Rejeição Formal de Medição */}
      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5 text-destructive" />
              Disputar / Rejeitar Auto de Medição
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Registe a inconformidade técnica que impede a homologação deste auto. O registo será gravado no histórico de auditoria e notificado ao empreiteiro.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Justificação Técnica Obrigatória *</Label>
              <Textarea
                rows={3}
                placeholder="Ex.: Quantidade de betão C25/30 na laje L-02 superior à tela final vistoriada; aguarda ensaio laboratorial aos 28 dias."
                value={disputeReasonText}
                onChange={e => setDisputeReasonText(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDisputeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisputeCert}
              disabled={!disputeReasonText.trim()}
              className="gap-1.5"
            >
              <XCircle className="h-4 w-4" />
              Confirmar Disputa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
