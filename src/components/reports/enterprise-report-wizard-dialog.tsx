'use client';

import React, { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers,
  ShieldCheck,
  Eye,
  Sliders,
  Building2,
  Coins,
  Clock,
  HardHat,
  Truck,
  AlertTriangle,
  FileCheck2,
  Camera,
  Signature,
  FileSpreadsheet,
  Gauge,
  Check,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@/types/project';
import type { WbsItem } from '@/types/wbs';
import type { Transaction } from '@/types/finance';
import type { Equipment, EquipmentUsageLog } from '@/types/equipment';
import type { Incident } from '@/types/hseq';
import type { Risk } from '@/types/risk';
import type {
  ReportType,
  ReportSectionId,
  ReportOrientation,
  ReportLanguage,
  ReportCurrency,
  ReportDocumentStatus,
  ReportDocumentMetadata
} from '@/types/reports';
import {
  generateEnterpriseReportPDF,
  getPresetReportConfig,
  buildReportFileName
} from '@/lib/pdf/enterprise-report-engine';
import { ExecutivePdfViewerModal } from '@/components/pdf/executive-pdf-viewer-modal';
import type { jsPDFWithAutoTable } from '@/lib/pdf/executive-pdf-engine';

interface EnterpriseReportWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  wbsItems?: WbsItem[];
  transactions?: Transaction[];
  equipments?: Equipment[];
  usageLogs?: EquipmentUsageLog[];
  incidents?: Incident[];
  risks?: Risk[];
  dailyReports?: any[];
  measurements?: any[];
  supplierInvoices?: any[];
  currentUserRole?: string;
  currentUserName?: string;
  onReportGenerated?: (reportInfo: {
    id: string;
    title: string;
    fileName: string;
    docCode: string;
    createdAt: string;
  }) => void;
}

export function EnterpriseReportWizardDialog({
  open,
  onOpenChange,
  project,
  wbsItems = [],
  transactions = [],
  equipments = [],
  usageLogs = [],
  incidents = [],
  risks = [],
  dailyReports = [],
  measurements = [],
  supplierInvoices = [],
  currentUserRole,
  currentUserName,
  onReportGenerated
}: EnterpriseReportWizardDialogProps) {
  const { toast } = useToast();

  // Wizard Step State (1: Tipo, 2: Período, 3: Conteúdo, 4: Aparência & Assinaturas)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [reportType, setReportType] = useState<ReportType>('executive');
  const [periodPreset, setPeriodPreset] = useState<'current_month' | 'last_30_days' | 'quarter' | 'all' | 'custom'>('current_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Sections Selection State
  const [selectedSections, setSelectedSections] = useState<ReportSectionId[]>([
    'summary',
    'identification',
    'kpis',
    'curva_s',
    'eva',
    'risks_hseq',
    'recommendations',
    'signatures'
  ]);

  // Document Control & Formatting State
  const [docCode, setDocCode] = useState(`${project.code || 'PRJ-001'}-DE-${format(new Date(), 'yyyyMM')}`);
  const [revision, setRevision] = useState('REV 01');
  const [status, setStatus] = useState<ReportDocumentStatus>('Aprovado');
  const [orientation, setOrientation] = useState<ReportOrientation>('portrait');
  const [language, setLanguage] = useState<ReportLanguage>('pt');
  const [currency, setCurrency] = useState<ReportCurrency>('AOA');
  const [title, setTitle] = useState('DOSSIÊ EXECUTIVO DE ALTA DIREÇÃO');
  const [subtitle, setSubtitle] = useState(`Empreitada: ${project.name} • Análise Físico-Financeira e Curva S`);
  const [classification, setClassification] = useState('CONFIDENCIAL / PROBATÓRIO');

  // Signatories
  const [authorName, setAuthorName] = useState(currentUserName || 'Eng. Diretor de Obra');
  const [reviewerName, setReviewerName] = useState('Fiscalização Técnica Residente');
  const [approverName, setApproverName] = useState(project.clientName || 'Representante do Dono da Obra');

  // PDF Generation & Viewer State
  const [isCompiling, setIsCompiling] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [compiledPdf, setCompiledPdf] = useState<jsPDFWithAutoTable | null>(null);
  const [compiledFileName, setCompiledFileName] = useState('');

  // Handle Preset Change
  const handleSelectReportType = (type: ReportType) => {
    setReportType(type);
    const preset = getPresetReportConfig(type, project);
    setTitle(preset.title);
    setSubtitle(preset.subtitle);
    setSelectedSections(preset.sections);
    setDocCode(preset.docCode);
  };

  // Toggle Single Section
  const toggleSection = (secId: ReportSectionId) => {
    setSelectedSections((prev) =>
      prev.includes(secId) ? prev.filter((id) => id !== secId) : [...prev, secId]
    );
  };

  // Reference Period Calculation
  const computedReferencePeriod = useMemo(() => {
    const now = new Date();
    if (periodPreset === 'current_month') {
      return format(now, 'MMMM yyyy');
    }
    if (periodPreset === 'last_30_days') {
      return `Últimos 30 dias (até ${format(now, 'dd/MM/yyyy')})`;
    }
    if (periodPreset === 'quarter') {
      const q = Math.floor(now.getMonth() / 3) + 1;
      return `${q}º Trimestre de ${now.getFullYear()}`;
    }
    if (periodPreset === 'custom') {
      if (customStartDate && customEndDate) {
        return `${customStartDate} a ${customEndDate}`;
      }
      return 'Período Personalizado';
    }
    return `Ciclo Completo da Empreitada (${format(now, 'yyyy')})`;
  }, [periodPreset, customStartDate, customEndDate]);

  // Compile and Preview PDF
  const handleGenerateAndPreview = () => {
    if (selectedSections.length === 0) {
      toast({
        title: 'Selecione pelo menos uma secção',
        description: 'O relatório necessita de conteúdo para ser gerado.',
        variant: 'destructive'
      });
      return;
    }

    setIsCompiling(true);
    try {
      const metadata: ReportDocumentMetadata = {
        title,
        subtitle,
        docCode,
        revision,
        status,
        referencePeriod: computedReferencePeriod,
        emissionDate: new Date(),
        authorName,
        authorRole: currentUserRole || 'Diretor de Obra',
        reviewerName,
        reviewerRole: 'Fiscal Técnico',
        approverName,
        approverRole: 'Dono da Obra',
        classification,
        companyName: 'PROFUNDIDADE ENGINEERING',
        clientName: project.clientName,
        contractorName: 'Consórcio Construtor',
        supervisionName: 'Fiscalização Independente',
        location: project.location?.province || 'Angola',
        includeCover: true,
        includeToc: selectedSections.length >= 6
      };

      const doc = generateEnterpriseReportPDF({
        project,
        metadata,
        sections: selectedSections,
        orientation,
        language,
        currency,
        wbsItems,
        transactions,
        equipments,
        usageLogs,
        incidents,
        risks,
        dailyReports,
        measurements,
        supplierInvoices
      });

      const fileName = buildReportFileName({
        projectCode: project.code,
        projectName: project.name,
        reportType,
        referencePeriod: computedReferencePeriod,
        revision
      });

      setCompiledPdf(doc);
      setCompiledFileName(fileName);
      setViewerOpen(true);

      // Persist in Firestore Project Reports Collection
      try {
        const reportRecord = {
          projectId: project.id,
          title,
          fileName,
          reportType,
          docCode,
          revision,
          status,
          referencePeriod: computedReferencePeriod,
          createdAt: new Date().toISOString(),
          createdBy: authorName,
          pageCount: doc.getNumberOfPages(),
          sections: selectedSections,
          timestamp: serverTimestamp()
        };

        addDoc(collection(db, 'projects', project.id, 'reports'), reportRecord).then((ref) => {
          if (onReportGenerated) {
            onReportGenerated({
              id: ref.id,
              title,
              fileName,
              docCode,
              createdAt: format(new Date(), 'dd/MM/yyyy HH:mm')
            });
          }
        }).catch((err) => {
          console.warn('Nota: Histórico local registrado. Erro ao salvar cloud:', err);
        });
      } catch (err) {
        console.warn('Persistência opcional do relatório em background:', err);
      }

      toast({
        title: 'Relatório Executivo Compilado!',
        description: `Documento "${fileName}" gerado com sucesso (${doc.getNumberOfPages()} páginas).`
      });
    } catch (err: any) {
      console.error('Erro na compilação do relatório:', err);
      toast({
        title: 'Erro na Compilação',
        description: err?.message || 'Ocorreu um erro ao gerar o relatório em PDF.',
        variant: 'destructive'
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const reportTypeCards: Array<{
    type: ReportType;
    title: string;
    desc: string;
    icon: any;
    target: string;
    badge: string;
  }> = [
    {
      type: 'executive',
      title: 'Relatório Executivo de Alta Direção',
      desc: 'Visão consolidada para Conselho de Administração e Acionistas. Curva S, indicadores EVA (SPI/CPI), previsão de custo no término (EAC) e riscos estratégicos.',
      icon: Gauge,
      target: 'Conselho de Administração & CFO',
      badge: 'Recomendado'
    },
    {
      type: 'progress_monthly',
      title: 'Relatório Mensal de Progresso',
      desc: 'Acompanhamento periódico integral de obra: avanço físico, cumprimento de prazos da EAP, medições do período, custos faturados e fotos de campo.',
      icon: FileSpreadsheet,
      target: 'Dono da Obra & Direção de Engenharia',
      badge: 'Mensal'
    },
    {
      type: 'supervision',
      title: 'Relatório de Fiscalização & Dono de Obra',
      desc: 'Conformidade legal e técnica estrita, livros de obra regulamentados, inspeções de materiais, não-conformidades e homologação de trabalhos.',
      icon: ShieldCheck,
      target: 'Fiscalização Independente & Donos de Obra',
      badge: 'Auditável'
    },
    {
      type: 'measurement',
      title: 'Relatório de Medição & Faturamento',
      desc: 'Caderno de medição detalhado de artigos contratuais executados no período, quantidades acumuladas, retenções de garantia e valores líquidos.',
      icon: FileCheck2,
      target: 'Departamento Financeiro & Medição',
      badge: 'Contratual'
    },
    {
      type: 'daily_rdo',
      title: 'Relatório de Diário de Obra (RDO)',
      desc: 'Consolidação de apontamentos diários de campo, efetivo de pessoal, máquinas em operação, condições de tempo e ocorrências com carimbo GPS.',
      icon: HardHat,
      target: 'Encarregados & Engenheiros Residentes',
      badge: 'Operacional'
    },
    {
      type: 'cost_financial',
      title: 'Relatório de Custos, CPU & Compras',
      desc: 'Extrato analítico de compras, faturas liquidadas vs comprometidas, composições de custo unitário e desvios face ao orçamento aprovado.',
      icon: Coins,
      target: 'Orçamentistas & Controlers Financeiros',
      badge: 'Financeiro'
    },
    {
      type: 'planning_wbs',
      title: 'Relatório de Planeamento & Caminho Crítico',
      desc: 'Estrutura Analítica do Projeto (EAP / WBS), dependências de predecessoras, análise de folgas, linha de base e marcos contratuais.',
      icon: Clock,
      target: 'Planeadores & Gestores de Projeto',
      badge: 'Técnico'
    },
    {
      type: 'hseq',
      title: 'Relatório de Segurança & HSEQ',
      desc: 'Estatísticas de acidentabilidade, dias sem acidentes, auditorias de segurança, inspeções de EPIs e conformidade com normas regulamentadoras.',
      icon: AlertTriangle,
      target: 'Responsáveis de Segurança & Ambiente',
      badge: 'HSEQ'
    },
    {
      type: 'fleet_equipment',
      title: 'Relatório de Eficiência de Frotas',
      desc: 'Parque de máquinas alocado ao projeto, horímetros acumulados, horas produtivas vs improdutivas, consumos de gasóleo e disponibilidade.',
      icon: Truck,
      target: 'Gestores de Frotas & Equipamentos',
      badge: 'Equipamentos'
    },
    {
      type: 'technical_full',
      title: 'Relatório Técnico Integral',
      desc: 'Dossiê completo multidisciplinar contendo todas as secções do projeto, com Índice automático de capítulos e metadados formais de encerramento.',
      icon: Layers,
      target: 'Dossiê Técnico Global da Empreitada',
      badge: 'Completo'
    }
  ];

  const sectionOptions: Array<{
    id: ReportSectionId;
    title: string;
    desc: string;
    group: string;
  }> = [
    { id: 'summary', title: 'Sumário Executivo & Diagnóstico Causal', desc: 'Análise sintética dos factos gerada a partir dos dados reais', group: 'Estratégia & Diagnóstico' },
    { id: 'identification', title: 'Identificação da Empreitada', desc: 'Dados do contrato, dono da obra, localização e agentes intervenientes', group: 'Estratégia & Diagnóstico' },
    { id: 'kpis', title: 'Painel de Indicadores Chave (KPIs)', desc: 'Cartões visuais com avanço físico, SPI, CPI, orçamento e despesas', group: 'Estratégia & Diagnóstico' },
    { id: 'curva_s', title: 'Curva S Integrada (Vetorizada)', desc: 'Gráfico vetorial de alta definição com PV, EV, AC e data de corte', group: 'Progresso & Engenharia' },
    { id: 'eva', title: 'Análise de Valor Ganho (EVA & EAC)', desc: 'SPI, CPI, Variância de Custo (CV) e Custo Estimado no Término (EAC)', group: 'Progresso & Engenharia' },
    { id: 'wbs', title: 'Estrutura Analítica do Projeto (EAP / WBS)', desc: 'Tabela de pacotes de trabalho, durações, avanço e caminho crítico', group: 'Progresso & Engenharia' },
    { id: 'costs', title: 'Engenharia de Custos & Fornecedores', desc: 'Faturas liquidadas, compromissos de compra e desvios de orçamento', group: 'Custos & Medições' },
    { id: 'measurements', title: 'Autos de Medição & Faturamento', desc: 'Artigos medidos no período, quantidades acumuladas e retenções', group: 'Custos & Medições' },
    { id: 'rdo', title: 'Diário de Campo / RDO & Condições', desc: 'Efetivo de mão de obra em estaleiro, clima e anomalias diárias', group: 'Operações de Campo' },
    { id: 'equipment', title: 'Frotas, Equipamentos & Horímetros', desc: 'Máquinas em uso, horímetros acumulados e estado de conservação', group: 'Operações de Campo' },
    { id: 'risks_hseq', title: 'Riscos, Incidentes & Conformidade HSEQ', desc: 'Dias sem acidentes, matriz de riscos e planos de mitigação', group: 'Governança & Riscos' },
    { id: 'photos', title: 'Registo Fotográfico com Georreferenciação', desc: 'Evidências fotográficas com moldura técnica, GPS e carimbo temporal', group: 'Governança & Riscos' },
    { id: 'recommendations', title: 'Recomendações Técnicas & Conclusões', desc: 'Pareceres da fiscalização e orientações técnicas de engenharia', group: 'Governança & Riscos' },
    { id: 'signatures', title: 'Termo de Responsabilidade & Assinaturas', desc: 'Bloco formal com espaço para Elaborado, Verificado e Aprovado', group: 'Governança & Riscos' }
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 overflow-hidden shadow-2xl">
          {/* Header do Wizard */}
          <div className="p-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold">
                    Construtor Profissional de Relatórios Técnicos
                  </DialogTitle>
                  <Badge variant="outline" className="text-[10px] font-bold border-blue-500/30 text-blue-600 bg-blue-500/10">
                    PADRÃO FIDIC / OEA
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Empreitada: <strong>{project.name}</strong> • Passo {currentStep} de 4
                </DialogDescription>
              </div>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold">
              {[
                { step: 1, label: 'Tipo' },
                { step: 2, label: 'Período' },
                { step: 3, label: 'Conteúdo' },
                { step: 4, label: 'Aparência' }
              ].map((s) => (
                <div
                  key={s.step}
                  onClick={() => setCurrentStep(s.step)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full cursor-pointer transition-all ${
                    currentStep === s.step
                      ? 'bg-blue-600 text-white shadow-sm'
                      : currentStep > s.step
                      ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <span>{s.step}.</span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body do Wizard com Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ETAPA 1: ESCOLHA DO TIPO DE RELATÓRIO */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Passo 1: Selecione o Modelo / Finalidade do Relatório
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    O sistema configura automaticamente a linguagem, métricas e capítulos recomendados para o destinatário.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                  {reportTypeCards.map((card) => {
                    const Icon = card.icon;
                    const isSelected = reportType === card.type;
                    return (
                      <div
                        key={card.type}
                        onClick={() => handleSelectReportType(card.type)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-md ring-1 ring-blue-600'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                {card.title}
                              </h4>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Destinatário: {card.target}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[9px] font-semibold shrink-0 ${
                            isSelected ? 'bg-blue-600 text-white border-transparent' : 'text-slate-500'
                          }`}>
                            {card.badge}
                          </Badge>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {card.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ETAPA 2: ESCOLHA DO PERÍODO DE REFERÊNCIA */}
            {currentStep === 2 && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Passo 2: Defina o Período de Análise & Corte
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Os dados reais de medição, faturas, RDO e avanço da EAP serão sincronizados com esta janela temporal.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    { id: 'current_month', label: `Mês Atual (${format(new Date(), 'MMMM yyyy')})`, desc: 'Recomendado para relatórios mensais de acompanhamento e autos de medição' },
                    { id: 'last_30_days', label: 'Últimos 30 Dias Móveis', desc: 'Ideal para auditorias operacionais rápidas e acompanhamento de equipas' },
                    { id: 'quarter', label: 'Trimestre Corrente', desc: 'Consolidação trimestral de desempenho financeiro e governança executiva' },
                    { id: 'all', label: 'Todo o Ciclo da Empreitada (Início ao Fim)', desc: 'Consolida todos os dados acumulados desde a ordem de serviço' },
                    { id: 'custom', label: 'Intervalo de Datas Personalizado', desc: 'Selecione uma data inicial e final específica para este relatório' }
                  ].map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setPeriodPreset(p.id as any)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        periodPreset === p.id
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-blue-600" />
                          {p.label}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.desc}</p>
                      </div>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        periodPreset === p.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                      }`}>
                        {periodPreset === p.id && <Check className="h-2.5 w-2.5" />}
                      </div>
                    </div>
                  ))}
                </div>

                {periodPreset === 'custom' && (
                  <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="custom-start" className="text-xs font-semibold">Data Inicial</Label>
                      <Input
                        id="custom-start"
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="custom-end" className="text-xs font-semibold">Data Final</Label>
                      <Input
                        id="custom-end"
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 3: SELEÇÃO MODULAR DE CONTEÚDO */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Passo 3: Escolha os Capítulos a Incluir no Relatório
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Estrutura 100% modular. O índice automático será gerado em harmonia com as secções ativas.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSections(sectionOptions.map((s) => s.id))}
                      className="h-7 text-xs"
                    >
                      Selecionar Todos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSections(['summary', 'identification', 'kpis', 'curva_s', 'signatures'])}
                      className="h-7 text-xs"
                    >
                      Apenas Essenciais
                    </Button>
                  </div>
                </div>

                {/* Secções Agrupadas */}
                {['Estratégia & Diagnóstico', 'Progresso & Engenharia', 'Custos & Medições', 'Operações de Campo', 'Governança & Riscos'].map((group) => {
                  const groupSections = sectionOptions.filter((s) => s.group === group);
                  return (
                    <div key={group} className="space-y-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {group}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {groupSections.map((sec) => {
                          const isChecked = selectedSections.includes(sec.id);
                          return (
                            <div
                              key={sec.id}
                              onClick={() => toggleSection(sec.id)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                                isChecked
                                  ? 'border-blue-500/50 bg-blue-50/30 dark:bg-blue-950/20'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 opacity-70'
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleSection(sec.id)}
                                className="mt-0.5"
                              />
                              <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                  {sec.title}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                  {sec.desc}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ETAPA 4: METADADOS DOCUMENTAIS, ASSINATURAS E APARÊNCIA */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Passo 4: Controlo Documental, Aparência & Assinaturas Oficiais
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina os códigos de auditoria, signatários responsáveis e formato de folha do PDF.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Código do Documento</Label>
                    <Input
                      value={docCode}
                      onChange={(e) => setDocCode(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Revisão</Label>
                    <Input
                      value={revision}
                      onChange={(e) => setRevision(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Estado de Homologação</Label>
                    <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aprovado">Aprovado Oficial</SelectItem>
                        <SelectItem value="Para Revisão">Para Revisão</SelectItem>
                        <SelectItem value="Rascunho">Rascunho Interno</SelectItem>
                        <SelectItem value="Emitido">Emitido / Homologado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Orientação da Folha</Label>
                    <Select value={orientation} onValueChange={(val: any) => setOrientation(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">A4 Vertical (Retrato)</SelectItem>
                        <SelectItem value="landscape">A4 Horizontal (Paisagem)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Moeda dos Valores</Label>
                    <Select value={currency} onValueChange={(val: any) => setCurrency(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AOA">Kwanzas (Kz / AOA)</SelectItem>
                        <SelectItem value="EUR">Euros (€ / EUR)</SelectItem>
                        <SelectItem value="USD">Dólares ($ / USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Classificação</Label>
                    <Input
                      value={classification}
                      onChange={(e) => setClassification(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Signature className="h-3.5 w-3.5 text-blue-600" />
                    Signatários e Responsáveis Técnicos pelo Documento
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Elaborado por (Engenheiro)</Label>
                      <Input
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="Nome do elaborador"
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Verificado por (Fiscalização)</Label>
                      <Input
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        placeholder="Nome da fiscalização"
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Aprovado por (Dono da Obra)</Label>
                      <Input
                        value={approverName}
                        onChange={(e) => setApproverName(e.target.value)}
                        placeholder="Nome do aprovador"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer do Wizard com Ações de Navegação */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div>
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="gap-1.5 text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 4 ? (
                <Button
                  size="sm"
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs font-semibold shadow-sm"
                >
                  Próximo
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={isCompiling}
                  onClick={handleGenerateAndPreview}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  {isCompiling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A Compilar Relatório...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Pré-visualizar & Gerar PDF
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO DEDICADA */}
      <ExecutivePdfViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        pdfDoc={compiledPdf}
        title={title}
        fileName={compiledFileName}
        documentType={title}
      />
    </>
  );
}
