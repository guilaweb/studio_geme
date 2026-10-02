'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  FolderKanban,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Download,
  Eye,
  Sparkles,
  Layers,
  ShieldAlert
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Project } from '@/types/project';
import { generateEnterpriseReportPDF } from '@/lib/pdf/enterprise-report-engine';

interface MobileReportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

export function MobileReportWizard({
  open,
  onOpenChange,
  defaultProjectId
}: MobileReportWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<number>(1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId || '');

  // Step 2: Report Type
  const [reportType, setReportType] = useState<'executive' | 'daily' | 'measurement' | 'hseq'>('executive');

  // Step 3: Period & Sections
  const [period, setPeriod] = useState<'current_month' | 'last_30_days' | 'quarter'>('current_month');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeFinances, setIncludeFinances] = useState(true);
  const [includeRisks, setIncludeRisks] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);

  // Step 4: Generating state
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  // Fetch projects
  useEffect(() => {
    if (!open || !user) return;
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const snap = await getDocs(query(collection(db, 'projects'), limit(30)));
        const projs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
        setProjects(projs);
        if (!selectedProjectId && projs.length > 0) {
          setSelectedProjectId(defaultProjectId || projs[0].id);
        }
      } catch (err) {
        console.warn('Erro ao carregar projetos:', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [open, user, defaultProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleGeneratePdf = async () => {
    if (!selectedProject) {
      toast({ title: 'Selecione um projeto', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      // Build lightweight metadata and sections
      const sections = ['summary', 'identification', 'kpis'];
      if (includeFinances) sections.push('curva_s', 'eva');
      if (includeRisks) sections.push('risks_hseq');
      if (includeSignatures) sections.push('signatures');

      const doc = generateEnterpriseReportPDF({
        project: selectedProject,
        metadata: {
          docCode: `${selectedProject.code || 'PRJ'}-REL-${format(new Date(), 'yyyyMM')}`,
          revision: 'REV 01',
          emissionDate: format(new Date(), 'dd/MM/yyyy'),
          referencePeriod: period === 'current_month' ? 'Mês Atual' : 'Últimos 30 Dias',
          authorName: user?.displayName || 'Técnico Móvel',
          reviewerName: 'Fiscalização Residente',
          approverName: selectedProject.clientName || 'Dono da Obra',
          status: 'Aprovado',
          title: reportType === 'executive' ? 'RELATÓRIO EXECUTIVO DE OBRA' : 'RELATÓRIO TÉCNICO DE CAMPO',
          subtitle: `Empreitada: ${selectedProject.name}`,
          classification: 'CONFIDENCIAL / PROBATÓRIO',
          includeCover: true,
          includeToc: true
        },
        sections: sections as any,
        orientation: 'portrait',
        language: 'pt',
        currency: 'AOA',
        wbsItems: [],
        transactions: [],
        equipments: [],
        usageLogs: [],
        incidents: [],
        risks: [],
        dailyReports: [],
        measurements: [],
        supplierInvoices: []
      });

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setStep(4);
      toast({
        title: 'Relatório Gerado com Sucesso!',
        description: 'O PDF está pronto para pré-visualização e download.',
      });
    } catch (err: any) {
      console.error('Erro ao compilar relatório:', err);
      toast({
        title: 'Erro ao gerar PDF',
        description: err.message || 'Ocorreu um erro ao compilar o relatório.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBlobUrl || !selectedProject) return;
    const link = document.createElement('a');
    link.href = pdfBlobUrl;
    link.download = `Relatorio_${selectedProject.name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetAndClose = () => {
    setStep(1);
    setPdfBlobUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="w-[94vw] max-w-lg p-0 rounded-2xl overflow-hidden border shadow-2xl">
        <DialogHeader className="p-4 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold font-headline">
                  Gerador de Relatórios Mobile
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Passo {step} de 4 • Fluxo rápido de campo
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Etapa {step}/4
            </Badge>
          </div>
        </DialogHeader>

        {/* Step Progress Bar */}
        <div className="w-full bg-muted h-1">
          <div
            className="bg-primary h-1 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* STEP 1: Escolher Projeto */}
          {step === 1 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" />
                1. Escolha o Projeto / Empreitada
              </Label>
              {loadingProjects ? (
                <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs">A carregar projetos...</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="p-4 rounded-xl border bg-muted/30 text-center text-xs text-muted-foreground">
                  Nenhum projeto encontrado.
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map((p) => {
                    const isSelected = p.id === selectedProjectId;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProjectId(p.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer touch-target-44 flex items-center justify-between ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-xs font-medium'
                            : 'bg-card hover:bg-muted/40'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.clientName || 'Cliente'} • Progresso: {Math.round(p.progress || 0)}%
                          </p>
                        </div>
                        <Badge variant={isSelected ? 'default' : 'outline'} className="text-[10px] shrink-0">
                          {p.status || 'Ativo'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Escolher Relatório */}
          {step === 2 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                2. Selecione o Tipo de Relatório
              </Label>
              <div className="space-y-2">
                {[
                  {
                    id: 'executive',
                    title: 'Dossiê Executivo de Alta Direção',
                    desc: 'Curva S, progresso físico-financeiro, KPIs e principais marcos.',
                    badge: 'Recomendado'
                  },
                  {
                    id: 'daily',
                    title: 'Diário de Obra (RDO Consolidado)',
                    desc: 'Efetivo de mão de obra, equipamentos, clima e ocorrências do período.',
                    badge: 'Campo'
                  },
                  {
                    id: 'measurement',
                    title: 'Auto de Medição & Faturação',
                    desc: 'Quantidades executadas, mapa de medições e valores contratuais.',
                    badge: 'Financeiro'
                  },
                  {
                    id: 'hseq',
                    title: 'Registo de Segurança & Qualidade (HSEQ)',
                    desc: 'Incidentes, conformidades técnicas e ações corretivas.',
                    badge: 'Segurança'
                  }
                ].map((rep) => {
                  const isSelected = reportType === rep.id;
                  return (
                    <div
                      key={rep.id}
                      onClick={() => setReportType(rep.id as any)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer touch-target-44 flex flex-col gap-1 ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs'
                          : 'bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">{rep.title}</span>
                        <Badge variant={isSelected ? 'default' : 'secondary'} className="text-[10px]">
                          {rep.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{rep.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Período e Conteúdo */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  3. Período do Relatório
                </Label>
                <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
                  <SelectTrigger className="w-full h-11 text-sm bg-background">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_month">Mês Atual ({format(new Date(), 'MMMM yyyy')})</SelectItem>
                    <SelectItem value="last_30_days">Últimos 30 Dias</SelectItem>
                    <SelectItem value="quarter">Trimestre Atual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 border-t space-y-3">
                <Label className="text-sm font-semibold block">Conteúdos a Incluir no PDF</Label>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20 cursor-pointer touch-target-44">
                    <Checkbox checked={includeFinances} onCheckedChange={(v) => setIncludeFinances(!!v)} />
                    <span className="text-xs font-medium">Curva S e Análise Físico-Financeira</span>
                  </label>
                  <label className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20 cursor-pointer touch-target-44">
                    <Checkbox checked={includePhotos} onCheckedChange={(v) => setIncludePhotos(!!v)} />
                    <span className="text-xs font-medium">Registos Fotográficos & Evidências</span>
                  </label>
                  <label className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20 cursor-pointer touch-target-44">
                    <Checkbox checked={includeRisks} onCheckedChange={(v) => setIncludeRisks(!!v)} />
                    <span className="text-xs font-medium">Matriz de Riscos e Ocorrências HSEQ</span>
                  </label>
                  <label className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20 cursor-pointer touch-target-44">
                    <Checkbox checked={includeSignatures} onCheckedChange={(v) => setIncludeSignatures(!!v)} />
                    <span className="text-xs font-medium">Bloco de Termos e Assinaturas Oficiais</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Pré-visualizar & Baixar */}
          {step === 4 && (
            <div className="py-6 text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Relatório Pronto!</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  O documento PDF oficial com selo institucional do Profundidade foi gerado com sucesso.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handleDownload}
                  className="w-full h-12 text-sm font-bold bg-primary text-primary-foreground gap-2 shadow-md"
                >
                  <Download className="h-4 w-4" /> Descarregar PDF no Telemóvel
                </Button>
                {pdfBlobUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(pdfBlobUrl, '_blank')}
                    className="w-full h-11 text-xs gap-2"
                  >
                    <Eye className="h-4 w-4" /> Abrir no Navegador
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <DialogFooter className="p-3 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
          {step > 1 && step < 4 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(step - 1)}
              className="gap-1 text-xs h-9 touch-target-44"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Anterior
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={resetAndClose} className="text-xs h-9">
              Fechar
            </Button>
          )}

          {step < 3 && (
            <Button
              size="sm"
              disabled={step === 1 && !selectedProjectId}
              onClick={() => setStep(step + 1)}
              className="gap-1 text-xs h-9 font-semibold touch-target-44"
            >
              Próximo <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {step === 3 && (
            <Button
              size="sm"
              disabled={isGenerating || !selectedProjectId}
              onClick={handleGeneratePdf}
              className="gap-1.5 text-xs h-9 font-bold bg-primary text-primary-foreground shadow-sm touch-target-44"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Compilando PDF...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" /> Gerar Relatório
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
