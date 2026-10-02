'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc, type Timestamp, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  Wallet,
  ShoppingCart,
  Landmark,
  AlertTriangle,
  Milestone,
  Wand2,
  Activity,
  CheckCircle2,
  FileText,
  BarChart,
  FileDown,
  Sparkles,
  TrendingUp,
  Clock,
  Calendar,
  Layers,
  ShieldAlert,
  FileSignature,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Boxes,
} from 'lucide-react';
import type { WbsItem } from '@/types/wbs';
import type { Transaction } from '@/types/finance';
import type { Annotation, Project } from '@/types/project';
import type { DailyReport } from '@/types/daily-reports';
import type { Risk } from '@/types/risk';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, subDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { summarizeDailyReports, type DailyReportSummaryOutput } from '@/ai/flows/daily-report-summary-flow';
import { safeParseDate, safeToIsoString } from '@/lib/date-utils';
import {
  Bar,
  BarChart as RechartsBarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { exportExecutiveProjectReport } from '@/lib/executive-report-generator';
import { cn } from '@/lib/utils';

interface ProjectDashboardTabProps {
  projectId: string;
  projectName: string;
  projectProgress: number;
  wbsItems: WbsItem[];
  transactions: Transaction[];
  project?: Project;
  onNavigateTab?: (tab: string) => void;
}

const formatCurrency = (value?: number) => {
  if (typeof value !== 'number') return '0 Kz';
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0,
  }).format(value);
};

export default function ProjectDashboardTab({
  projectId,
  projectName,
  projectProgress,
  wbsItems,
  transactions,
  project,
  onNavigateTab,
}: ProjectDashboardTabProps) {
  const { toast } = useToast();
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [measurementCount, setMeasurementCount] = useState({ total: 0, approved: 0, totalValue: 0 });
  const [committedPurchases, setCommittedPurchases] = useState<number>(0);
  const [pendingHoldPointsCount, setPendingHoldPointsCount] = useState<number>(0);
  const [openNcrsCount, setOpenNcrsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [summaryAI, setSummaryAI] = useState<DailyReportSummaryOutput | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const oneWeekAgo = subDays(new Date(), 7);

    // Diários de Obra
    const unsubReports = onSnapshot(
      query(collection(db, 'projects', projectId, 'daily-reports'), where('date', '>=', oneWeekAgo), orderBy('date', 'desc')),
      (snapshot) => {
        setDailyReports(snapshot.docs.map((d) => {
          const data = d.data();
          const parsedDate = safeParseDate(data.date) || new Date();
          return { ...data, id: d.id, date: parsedDate } as DailyReport;
        }));
      },
      (err) => console.warn('Erro ao carregar relatórios diários:', err)
    );

    // Pendências
    const unsubAnnotations = onSnapshot(
      query(collection(db, 'projects', projectId, 'annotations'), orderBy('createdAt', 'desc'), limit(15)),
      (snapshot) => {
        setAnnotations(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Annotation)));
      },
      (err) => console.warn('Erro ao carregar anotações:', err)
    );

    // Riscos
    const unsubRisks = onSnapshot(
      query(collection(db, 'projects', projectId, 'risks')),
      (snapshot) => {
        setRisks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Risk)));
      },
      (err) => console.warn('Erro ao carregar riscos:', err)
    );

    // Autos de Medição
    const unsubMeasurements = onSnapshot(
      query(collection(db, 'projects', projectId, 'measurementCertificates')),
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data());
        const approved = items.filter((m: any) => m.status === 'Aprovado' || m.status === 'Homologado');
        const totalVal = approved.reduce((acc: number, m: any) => acc + (m.totalAmount || m.netAmount || 0), 0);
        setMeasurementCount({ total: items.length, approved: approved.length, totalValue: totalVal });
      },
      (err) => console.warn('Erro ao carregar medições:', err)
    );

    // Faturas de Fornecedores / Compras Comprometidas
    const unsubInvoices = onSnapshot(
      query(collection(db, 'projects', projectId, 'supplierInvoices')),
      (snapshot) => {
        const sum = snapshot.docs.reduce((acc, d) => {
          const inv = d.data();
          if (inv.status === 'Pendente' || inv.status === 'Aprovada') {
            return acc + (inv.totalAmount || inv.amount || 0);
          }
          return acc;
        }, 0);
        setCommittedPurchases(sum);
      },
      (err) => console.warn('Erro ao carregar faturas:', err)
    );

    // Fiscalização - Hold Points (Pontos de Paragem Obrigatória H)
    const unsubHoldPoints = onSnapshot(
      query(collection(db, 'projects', projectId, 'fiscalizacao_inspections')),
      (snapshot) => {
        const pending = snapshot.docs.filter(d => {
          const data = d.data();
          return data.pointType === 'H' && (data.status === 'pendente' || data.status === 'em_inspecao');
        }).length;
        setPendingHoldPointsCount(pending);
      },
      (err) => console.warn('Erro ao carregar hold points:', err)
    );

    // Fiscalização - Não Conformidades (NCR)
    const unsubNcrs = onSnapshot(
      query(collection(db, 'projects', projectId, 'fiscalizacao_ncrs')),
      (snapshot) => {
        const open = snapshot.docs.filter(d => {
          const data = d.data();
          return data.status !== 'encerrada';
        }).length;
        setOpenNcrsCount(open);
      },
      (err) => console.warn('Erro ao carregar ncrs:', err)
    );

    const timer = setTimeout(() => setLoading(false), 1500);

    return () => {
      unsubReports();
      unsubAnnotations();
      unsubRisks();
      unsubMeasurements();
      unsubInvoices();
      unsubHoldPoints();
      unsubNcrs();
      clearTimeout(timer);
    };
  }, [projectId]);

  // Cálculos Consolidados de Finanças, Produção, Prazos e EVA
  const dashboardData = useMemo(() => {
    // 1. Orçamento Aprovado (BAC)
    const approvedBudget = project?.approvedBudget || project?.budget || wbsItems.reduce((acc, item) => acc + (item.budget || 0), 0);
    const contractValue = project?.contractValue || approvedBudget;

    // 2. Custo Realizado (AC)
    const actualCost = transactions
      .filter((t) => t.type === 'Despesa')
      .reduce((acc, item) => acc + item.amount, 0);

    // 3. Custo Comprometido
    const committedCost = project?.committedCost || (actualCost + committedPurchases);

    // 4. Saldo Disponível
    const availableBalance = approvedBudget - actualCost;

    // 5. Progresso Ponderado por Produção Real
    const totalWeight = wbsItems.filter((i) => !i.parentId).reduce((acc, i) => acc + (i.weight || 1), 0) || 1;
    const computedWeightedProgress =
      wbsItems
        .filter((i) => !i.parentId)
        .reduce((acc, i) => acc + ((i.progress || 0) * (i.weight || 1)), 0) / totalWeight;
    const physicalProgress = projectProgress > 0 ? projectProgress : Math.round(computedWeightedProgress);

    // 6. Progresso Financeiro
    const financialProgress = approvedBudget > 0 ? Math.min(100, Math.round((actualCost / approvedBudget) * 100)) : 0;

    // 7. Prazos e Progresso Temporal
    const startDate = project?.startDate || project?.contractStartDate || (project?.createdAt ? new Date(project.createdAt) : new Date());
    const endDate = project?.endDate || project?.contractEndDate || new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const totalDays = Math.max(1, differenceInDays(new Date(endDate), new Date(startDate)));
    const elapsedDays = Math.max(0, differenceInDays(new Date(), new Date(startDate)));
    const remainingDays = Math.max(0, differenceInDays(new Date(endDate), new Date()));
    const scheduleProgress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

    // 8. Estado das Atividades da EAP
    const activities = wbsItems.filter((i) => Boolean(i.parentId) || i.level === 'activity');
    const completedTasks = activities.filter((i) => (i.progress || 0) >= 100 || i.status === 'completed').length;
    const inProgressTasks = activities.filter((i) => (i.progress || 0) > 0 && (i.progress || 0) < 100 && i.status !== 'delayed').length;
    const delayedTasks = activities.filter((i) => i.status === 'delayed' || ((i.progress || 0) < 100 && i.endDate && new Date(i.endDate) < new Date())).length;
    const notStartedTasks = activities.length - completedTasks - inProgressTasks - delayedTasks;

    // 9. Riscos Abertos
    const openRisks = risks.filter((r) => r.status !== 'Mitigado' && r.status !== 'Fechado');
    const criticalRisks = openRisks.filter((r) => r.impact >= 4 && r.probability >= 3);
    const highRisks = openRisks.filter((r) => r.impact >= 3 && r.probability >= 3 && !criticalRisks.includes(r));
    const mediumRisks = openRisks.filter((r) => !criticalRisks.includes(r) && !highRisks.includes(r));

    // 10. Indicadores EVA
    const plannedValue = approvedBudget * (scheduleProgress / 100);
    const earnedValue = approvedBudget * (physicalProgress / 100);
    const spi = plannedValue > 0 ? earnedValue / plannedValue : 1.0;
    const cpi = actualCost > 0 ? earnedValue / actualCost : 1.0;
    const eac = cpi > 0 ? approvedBudget / cpi : approvedBudget;
    const vac = approvedBudget - eac;
    const tcpi = (approvedBudget - earnedValue) > 0 && (approvedBudget - actualCost) > 0
      ? (approvedBudget - earnedValue) / (approvedBudget - actualCost)
      : 1.0;

    // Diagnóstico textual automatizado
    let evaDiagnosis = 'Desempenho equilibrado de prazos e custos.';
    if (spi < 0.95 && cpi < 0.95) {
      evaDiagnosis = 'ALERTA CRÍTICO: Projeto com atraso no cronograma e sobrecusto financeiro.';
    } else if (spi < 0.95 && cpi >= 1.0) {
      evaDiagnosis = 'Atrasado no prazo, porém dentro do orçamento com economia de custos.';
    } else if (spi >= 1.0 && cpi < 0.95) {
      evaDiagnosis = 'Adiantado no cronograma, mas consumindo acima do custo planeado.';
    } else if (spi >= 1.0 && cpi >= 1.0) {
      evaDiagnosis = 'EXCELENTE: Adiantado no prazo e operando abaixo do orçamento.';
    }

    return {
      contractValue,
      approvedBudget,
      actualCost,
      committedCost,
      availableBalance,
      physicalProgress,
      financialProgress,
      scheduleProgress,
      startDate,
      endDate,
      elapsedDays,
      remainingDays,
      completedTasks,
      inProgressTasks,
      delayedTasks,
      notStartedTasks: Math.max(0, notStartedTasks),
      totalTasks: activities.length || wbsItems.length,
      openRisksCount: openRisks.length,
      criticalRisksCount: criticalRisks.length,
      highRisksCount: highRisks.length,
      mediumRisksCount: mediumRisks.length,
      openAnnotations: annotations.filter((a) => a.status === 'Aberta').length,
      criticalAnnotations: annotations.filter((a) => a.status === 'Aberta' && a.priority === 'Alta').length,
      plannedValue,
      earnedValue,
      spi,
      cpi,
      eac,
      vac,
      tcpi,
      evaDiagnosis,
    };
  }, [project, wbsItems, transactions, projectProgress, risks, annotations]);

  // Curva S Acumulada Real (Baseada no cronograma, despesas reais e medições)
  const sCurveData = useMemo(() => {
    const bac = dashboardData.approvedBudget;
    // Se não houver orçamento nem despesas nem tarefas, retornar lista vazia para estado vazio profissional
    if (bac <= 0 && transactions.length === 0 && wbsItems.length === 0) {
      return [];
    }

    const start = new Date(dashboardData.startDate);
    const end = new Date(dashboardData.endDate);
    const validStart = !isNaN(start.getTime()) ? start : new Date();
    const validEnd = !isNaN(end.getTime()) && end > validStart ? end : new Date(validStart.getTime() + 180 * 24 * 60 * 60 * 1000);

    const now = new Date();
    const pointsCount = 6;
    const timeStep = (validEnd.getTime() - validStart.getTime()) / (pointsCount - 1);

    const points = [];
    for (let i = 0; i < pointsCount; i++) {
      const pointDate = new Date(validStart.getTime() + i * timeStep);
      const isPastOrCurrent = pointDate <= now || i === 0;

      // Planned Value (PV) acumulado até esta data
      const timeRatio = Math.min(1, Math.max(0, (pointDate.getTime() - validStart.getTime()) / (validEnd.getTime() - validStart.getTime())));
      const scheduledTasksBudget = wbsItems
        .filter(t => t.endDate && new Date(t.endDate) <= pointDate)
        .reduce((sum, t) => sum + (t.budget || 0), 0);
      const pv = scheduledTasksBudget > 0 ? scheduledTasksBudget : Math.round(bac * timeRatio);

      // Actual Cost (AC) acumulado de transações reais até esta data
      let ac: number | null = null;
      let ev: number | null = null;

      if (isPastOrCurrent) {
        ac = transactions
          .filter(t => t.type === 'Despesa' && t.date && new Date(t.date) <= pointDate)
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        if (i === 0 && ac === 0) ac = 0;

        // Earned Value (EV) baseado no progresso de tarefas concluídas ou medidas até esta data
        const earnedFromTasks = wbsItems
          .filter(t => t.endDate && new Date(t.endDate) <= pointDate)
          .reduce((sum, t) => sum + ((t.budget || 0) * ((t.progress || 0) / 100)), 0);

        ev = earnedFromTasks > 0 ? Math.round(earnedFromTasks) : Math.round(pv * (dashboardData.physicalProgress / 100));
      }

      const label = format(pointDate, 'MMM/yy', { locale: ptBR });
      points.push({
        name: label.charAt(0).toUpperCase() + label.slice(1),
        PV: pv,
        EV: isPastOrCurrent ? ev : null,
        AC: isPastOrCurrent ? ac : null,
      });
    }

    return points;
  }, [dashboardData, transactions, wbsItems]);

  // Próximas Ações do Projeto (Direcionamento Imediato de Execução)
  const projectNextActions = useMemo(() => {
    const actions: { id: string; type: 'urgent' | 'warning' | 'info'; text: string; subtext: string; tab: string; actionLabel: string }[] = [];

    // 1. Atividades atrasadas no cronograma
    if (dashboardData.delayedTasks > 0) {
      actions.push({
        id: 'delayed-tasks',
        type: 'urgent',
        text: `${dashboardData.delayedTasks} ${dashboardData.delayedTasks === 1 ? 'atividade está atrasada' : 'atividades estão atrasadas'} no cronograma`,
        subtext: 'Requer replaneamento ou intervenção na frente de obra',
        tab: 'wbs',
        actionLabel: 'Ver Planeamento',
      });
    }

    // 2. Medições pendentes de validação
    const pendingMeasurements = measurementCount.total - measurementCount.approved;
    if (pendingMeasurements > 0) {
      actions.push({
        id: 'pending-measurements',
        type: 'warning',
        text: `${pendingMeasurements} ${pendingMeasurements === 1 ? 'medição aguarda validação' : 'medições aguardam validação e auto'}`,
        subtext: 'Necessário certificar produção para libertação de pagamento',
        tab: 'measurement-certificates',
        actionLabel: 'Ver Medições',
      });
    }

    // 3. Diário de obra de hoje
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const hasTodayReport = dailyReports.some(r => {
      try {
        return format(new Date(r.date), 'yyyy-MM-dd') === todayStr;
      } catch {
        return false;
      }
    });
    if (!hasTodayReport) {
      actions.push({
        id: 'missing-daily-report',
        type: 'info',
        text: 'Diário de obra de hoje ainda não foi registado',
        subtext: 'Registe condições climáticas, efetivos e ocorrências da jornada',
        tab: 'daily-report',
        actionLabel: 'Registar Diário',
      });
    }

    // 4. Sobrecusto financeiro
    if (dashboardData.availableBalance < 0) {
      actions.push({
        id: 'budget-overrun',
        type: 'urgent',
        text: `O custo executado ultrapassou o orçamento previsto (${formatCurrency(Math.abs(dashboardData.availableBalance))})`,
        subtext: 'Necessário rever custos unitários ou submeter adenda contratual',
        tab: 'controle-custos',
        actionLabel: 'Controlo de Custos',
      });
    }

    // 5. Riscos críticos na matriz 5x5
    if (dashboardData.criticalRisksCount > 0) {
      actions.push({
        id: 'critical-risks',
        type: 'warning',
        text: `${dashboardData.criticalRisksCount} ${dashboardData.criticalRisksCount === 1 ? 'risco crítico identificado' : 'riscos críticos identificados'} na matriz 5x5`,
        subtext: 'Exige plano de mitigação imediato',
        tab: 'riscos',
        actionLabel: 'Gerir Riscos',
      });
    }

    // 6. Pendências de campo
    if (dashboardData.criticalAnnotations > 0) {
      actions.push({
        id: 'critical-annotations',
        type: 'urgent',
        text: `${dashboardData.criticalAnnotations} não-conformidades de alta prioridade em aberto`,
        subtext: 'Apontadas em vistorias de campo',
        tab: 'fvs',
        actionLabel: 'Resolver Pendências',
      });
    }

    // 7. Fiscalização - Pontos de Paragem Obrigatória (H)
    if (pendingHoldPointsCount > 0) {
      actions.push({
        id: 'hold-points-pending',
        type: 'urgent',
        text: `${pendingHoldPointsCount} Ponto(s) de Paragem (Hold Points H) aguardando vistoria`,
        subtext: 'O avanço dos trabalhos está bloqueado até aprovação do Fiscal',
        tab: 'fiscalizacao',
        actionLabel: 'Ver Fiscalização',
      });
    }

    // 8. Fiscalização - Não Conformidades (NCR)
    if (openNcrsCount > 0) {
      actions.push({
        id: 'open-ncrs',
        type: 'warning',
        text: `${openNcrsCount} Não Conformidade(s) (NCR) registadas pela fiscalização`,
        subtext: 'Exige plano de ação corretiva e comprovação fotográfica',
        tab: 'fiscalizacao',
        actionLabel: 'Tratar NCRs',
      });
    }

    return actions;
  }, [dashboardData, measurementCount, dailyReports, pendingHoldPointsCount, openNcrsCount]);

  // Distribuição de Custos por Fase Principal
  const costDistributionData = useMemo(() => {
    return wbsItems
      .filter((item) => !item.parentId)
      .map((item) => {
        const childIds = new Set<string>();
        const collectIds = (id: string) => {
          childIds.add(id);
          wbsItems.filter((w) => w.parentId === id).forEach((child) => collectIds(child.id));
        };
        collectIds(item.id);

        const phaseCost = transactions
          .filter((t) => t.type === 'Despesa' && t.wbsItemId && childIds.has(t.wbsItemId))
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          name: item.name,
          Orçamento: item.budget || 0,
          Realizado: phaseCost,
        };
      })
      .filter((d) => d.Orçamento > 0 || d.Realizado > 0)
      .slice(0, 6);
  }, [wbsItems, transactions]);

  const hasSCurveData = useMemo(() => {
    return sCurveData.length > 0 && sCurveData.some((d) => (d.PV ?? 0) > 0 || (d.EV ?? 0) > 0 || (d.AC ?? 0) > 0);
  }, [sCurveData]);

  const hasCostDistributionData = useMemo(() => {
    return costDistributionData.length > 0;
  }, [costDistributionData]);

  const handleGenerateSummary = async () => {
    if (dailyReports.length === 0) {
      toast({
        title: 'Sem dados suficientes',
        description: 'Não foram encontrados diários de obra recentes para resumir.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const serializableReports = dailyReports.map((r) => ({
        ...r,
        date: safeToIsoString(r.date, new Date().toISOString()),
      }));
      const result = await summarizeDailyReports({ reports: serializableReports });
      setSummaryAI(result);
      toast({ title: 'Resumo da Semana Gerado com IA!' });
    } catch (error: any) {
      console.error('Error generating summary:', error);
      toast({ title: 'Erro ao gerar resumo', description: error.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportPDF = () => {
    try {
      const currentProject: Project = project || {
        id: projectId,
        name: projectName,
        progress: projectProgress,
        status: 'Em Execução',
        ownerId: '',
      };
      exportExecutiveProjectReport(currentProject, wbsItems, transactions);
      toast({
        title: 'Relatório Executivo Gerado!',
        description: 'O dossiê em PDF foi descarregado com sucesso.',
      });
    } catch (err: any) {
      toast({
        title: 'Falha ao gerar relatório',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground animate-pulse font-medium">
          A carregar centro de comando do projeto...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Barra de Identificação & Ação Executiva */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              {project?.lifecycleStage ? `Fase: ${project.lifecycleStage.toUpperCase()}` : 'Monitoramento Ativo'}
            </span>
            <span className="text-xs text-slate-400 font-mono">Código: {project?.code || projectId.slice(0, 8)}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-headline text-white">{projectName}</h2>
          <p className="text-xs text-slate-300">
            Cliente: <strong className="text-white">{project?.clientName || 'Não especificado'}</strong> • Localização: <strong className="text-white">{project?.location?.province ? `${project.location.province}, Angola` : (typeof project?.location === 'string' ? project.location : 'Não especificada')}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={handleExportPDF}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm flex items-center gap-2 w-full sm:w-auto text-xs"
          >
            <FileDown className="h-4 w-4" />
            <span>Relatório Executivo (PDF)</span>
          </Button>
        </div>
      </div>

      {/* 1.5 PRÓXIMAS AÇÕES DO PROJETO (Orientação Imediata ao Utilizador) */}
      {projectNextActions.length > 0 && (
        <Card className="border-2 border-primary/20 bg-card shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <CardTitle className="text-sm font-bold text-foreground">
                O que precisa de atenção nesta obra agora?
              </CardTitle>
            </div>
            <Badge variant="secondary" className="text-[11px] font-semibold">
              {projectNextActions.length} {projectNextActions.length === 1 ? 'ação pendente' : 'ações pendentes'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {projectNextActions.map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={cn(
                      'h-2.5 w-2.5 rounded-full shrink-0',
                      action.type === 'urgent' ? 'bg-destructive' : action.type === 'warning' ? 'bg-amber-500' : 'bg-primary'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{action.text}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{action.subtext}</p>
                  </div>
                </div>

                {onNavigateTab && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigateTab(action.tab)}
                    className="h-7 text-xs px-2.5 gap-1 shrink-0 font-semibold border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <span>{action.actionLabel}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 2. Os 5 Cards Financeiros Principais (User Spec) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-4 border shadow-sm bg-card hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Valor Contratado</span>
            <Landmark className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-headline mt-1.5 text-foreground">
            {formatCurrency(dashboardData.contractValue)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Montante contratual global</div>
        </Card>

        <Card className="p-4 border shadow-sm bg-card hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Orçamento Aprovado (BAC)</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-headline mt-1.5 text-foreground">
            {formatCurrency(dashboardData.approvedBudget)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Meta orçamentária base</div>
        </Card>

        <Card className="p-4 border shadow-sm bg-card hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Custo Realizado (AC)</span>
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-headline mt-1.5 text-emerald-600 dark:text-emerald-400">
            {formatCurrency(dashboardData.actualCost)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Despesas pagas & lançadas</div>
        </Card>

        <Card className="p-4 border shadow-sm bg-card hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Custo Comprometido</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-headline mt-1.5 text-amber-600 dark:text-amber-400">
            {formatCurrency(dashboardData.committedCost)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Ordens de compra & contratos</div>
        </Card>

        <Card className="p-4 border shadow-sm bg-card hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Saldo Disponível</span>
            <Wallet className="h-4 w-4 text-blue-600" />
          </div>
          <div className={`text-lg sm:text-xl font-bold font-headline mt-1.5 ${dashboardData.availableBalance < 0 ? 'text-destructive' : 'text-blue-600 dark:text-blue-400'}`}>
            {formatCurrency(dashboardData.availableBalance)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {dashboardData.availableBalance < 0 ? 'Défice de saldo' : 'Margem orçamentária livre'}
          </div>
        </Card>
      </div>

      {/* 3. Triplo Progresso & Prazos (Físico, Financeiro, Temporal) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progresso Físico Ponderado */}
        <Card className="border p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider">Progresso Físico</span>
            <span className="text-lg font-bold font-mono text-primary">{dashboardData.physicalProgress}%</span>
          </div>
          <Progress value={dashboardData.physicalProgress} className="h-2.5" />
          <div className="text-[11px] text-muted-foreground">Ponderado pela produção real das atividades da EAP</div>
        </Card>

        {/* Progresso Financeiro */}
        <Card className="border p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider">Progresso Financeiro</span>
            <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{dashboardData.financialProgress}%</span>
          </div>
          <Progress value={dashboardData.financialProgress} className="h-2.5" />
          <div className="text-[11px] text-muted-foreground">Custo Realizado (AC) vs. Orçamento Aprovado (BAC)</div>
        </Card>

        {/* Progresso Temporal */}
        <Card className="border p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider">Progresso Temporal</span>
            <span className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400">{dashboardData.scheduleProgress}%</span>
          </div>
          <Progress value={dashboardData.scheduleProgress} className="h-2.5" />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{dashboardData.elapsedDays} dias decorridos</span>
            <span>{dashboardData.remainingDays} dias restantes</span>
          </div>
        </Card>
      </div>

      {/* 4. Saúde Operacional: Atividades, Riscos, Pendências e Medições */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Atividades */}
        <Card className="p-3.5 border shadow-sm bg-card">
          <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span>Atividades EAP</span>
            <Layers className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold font-headline mt-1 text-foreground">
            {dashboardData.totalTasks}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
            <span className="text-emerald-500 font-bold">{dashboardData.completedTasks} conc.</span> •
            <span className="text-blue-500 font-bold">{dashboardData.inProgressTasks} andam.</span> •
            <span className="text-destructive font-bold">{dashboardData.delayedTasks} atras.</span>
          </div>
        </Card>

        {/* Riscos Abertos */}
        <Card className="p-3.5 border shadow-sm bg-card">
          <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span>Riscos 5x5</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-headline mt-1 text-foreground">
            {dashboardData.openRisksCount}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
            <span className="text-destructive font-bold">{dashboardData.criticalRisksCount} críticos</span> •
            <span className="text-amber-500 font-bold">{dashboardData.highRisksCount} altos</span>
          </div>
        </Card>

        {/* Pendências de Campo */}
        <Card className="p-3.5 border shadow-sm bg-card">
          <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span>Pendências (Ações)</span>
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
          </div>
          <div className="text-xl font-bold font-headline mt-1 text-foreground">
            {dashboardData.openAnnotations}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {dashboardData.criticalAnnotations > 0 ? (
              <span className="text-destructive font-bold">{dashboardData.criticalAnnotations} de alta prioridade</span>
            ) : (
              'Sem bloqueios críticos'
            )}
          </div>
        </Card>

        {/* Medições Contratuais */}
        <Card className="p-3.5 border shadow-sm bg-card">
          <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span>Autos de Medição</span>
            <FileSignature className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-headline mt-1 text-foreground">
            {measurementCount.total}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            <span className="text-emerald-500 font-bold">{measurementCount.approved} aprovados</span> • {formatCurrency(measurementCount.totalValue)}
          </div>
        </Card>
      </div>

      {/* 5. Bloco de Project Controls & EVA (Análise de Valor Ganho) */}
      <Card className="border shadow-sm bg-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Análise de Valor Ganho (EVA / EVM) & Project Controls
            </CardTitle>
            <CardDescription className="text-xs">
              Conexão matemática entre planeamento, execução física e custos reais.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={`text-xs ${
              dashboardData.spi >= 1.0 && dashboardData.cpi >= 1.0
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
            }`}
          >
            {dashboardData.evaDiagnosis}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-muted/40 border">
            <div className="text-[10px] text-muted-foreground uppercase">Valor Planeado (PV)</div>
            <div className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(dashboardData.plannedValue)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/40 border">
            <div className="text-[10px] text-muted-foreground uppercase">Valor Agregado (EV)</div>
            <div className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(dashboardData.earnedValue)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/40 border">
            <div className="text-[10px] text-muted-foreground uppercase">Custo Real (AC)</div>
            <div className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(dashboardData.actualCost)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/40 border">
            <div className="text-[10px] text-muted-foreground uppercase">Índice Prazos (IDP/SPI)</div>
            <div className={`text-sm font-bold mt-0.5 ${dashboardData.spi >= 1.0 ? 'text-emerald-600' : 'text-amber-500'}`}>
              {dashboardData.spi.toFixed(2)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/40 border">
            <div className="text-[10px] text-muted-foreground uppercase">Índice Custos (IDC/CPI)</div>
            <div className={`text-sm font-bold mt-0.5 ${dashboardData.cpi >= 1.0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {dashboardData.cpi.toFixed(2)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/40 border">
            <div className="text-[10px] text-muted-foreground uppercase">Previsão Final (EAC)</div>
            <div className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(dashboardData.eac)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/40 border">
            <div className="text-[10px] text-muted-foreground uppercase">Desvio Final (VAC)</div>
            <div className={`text-sm font-bold mt-0.5 ${dashboardData.vac >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {formatCurrency(dashboardData.vac)}
            </div>
          </div>
        </div>
      </Card>

      {/* 6. Gráficos: Curva S & Distribuição de Custos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Curva S */}
        <Card className="lg:col-span-7 border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Curva S (Planeado × Agregado × Realizado)
                </CardTitle>
                <CardDescription className="text-xs">
                  Acompanhamento contínuo de PV (Planeado), EV (Agregado) e AC (Real).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hasSCurveData ? (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sCurveData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} />
                    <YAxis fontSize={10} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} tickLine={false} />
                    <RechartsTooltip formatter={(val: any) => formatCurrency(val)} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line type="monotone" dataKey="PV" stroke="#3b82f6" strokeWidth={2} name="PV (Planeado)" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="EV" stroke="#10b981" strokeWidth={2} name="EV (Agregado)" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="AC" stroke="#ef4444" strokeWidth={2} name="AC (Realizado)" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 w-full flex flex-col items-center justify-center text-center p-6 bg-muted/10 rounded-lg border border-dashed">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Ainda não existem dados para traçar a Curva S</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  A Curva S será calculada e projetada automaticamente assim que estruturar as atividades na EAP com prazos/orçamento e registar medições ou despesas.
                </p>
                {onNavigateTab && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs h-8 gap-1.5"
                    onClick={() => onNavigateTab('wbs')}
                  >
                    <Layers className="h-3.5 w-3.5 text-primary" /> Estruturar EAP / Cronograma
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição de Custos por Fase Principal */}
        <Card className="lg:col-span-5 border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart className="h-4 w-4 text-primary" /> Distribuição de Custos por Fase
            </CardTitle>
            <CardDescription className="text-xs">
              Confronto direto entre Orçado e Custo Real por pacote WBS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasCostDistributionData ? (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={costDistributionData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" fontSize={10} tickLine={false} />
                    <YAxis fontSize={10} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} tickLine={false} />
                    <RechartsTooltip formatter={(val: any) => formatCurrency(val)} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="Orçamento" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Orçado" />
                    <Bar dataKey="Realizado" fill="#10b981" radius={[4, 4, 0, 0]} name="Realizado" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 w-full flex flex-col items-center justify-center text-center p-6 bg-muted/10 rounded-lg border border-dashed">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <BarChart className="h-5 w-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Ainda não existem custos por fase</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Crie os pacotes principais na EAP e associe lançamentos de custos para comparar o orçamento com o custo realizado.
                </p>
                {onNavigateTab && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs h-8 gap-1.5"
                    onClick={() => onNavigateTab('controle-custos')}
                  >
                    <Wallet className="h-3.5 w-3.5 text-primary" /> Controlo de Custos
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 7. Resumo Inteligente com IA & Próximos Marcos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Profundidade Intelligence — Diagnóstico Semanal
              </CardTitle>
              <CardDescription className="text-xs">
                Análise causal baseada nos apontamentos de diário de obra, avanço e custos.
              </CardDescription>
            </div>
            <Button onClick={handleGenerateSummary} disabled={isAnalyzing} size="sm" variant="secondary" className="text-xs h-8">
              {isAnalyzing ? <Loader2 className="animate-spin mr-1.5 h-3.5 w-3.5" /> : <Wand2 className="mr-1.5 h-3.5 w-3.5" />}
              {isAnalyzing ? 'A analisar...' : 'Gerar Diagnóstico'}
            </Button>
          </CardHeader>
          <CardContent>
            {summaryAI ? (
              <div className="p-4 bg-muted/40 rounded-xl space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <h4 className="font-bold flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" /> Destaques Operacionais
                    </h4>
                    <ul className="space-y-1 text-muted-foreground">
                      {summaryAI.highlights.map((h, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span>•</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold flex items-center gap-1.5 text-primary">
                      <Milestone className="h-4 w-4" /> Próxima Semana
                    </h4>
                    <p className="text-muted-foreground leading-relaxed italic">{summaryAI.nextWeekOutlook}</p>
                  </div>
                </div>

                {summaryAI.blockers && summaryAI.blockers.length > 0 && (
                  <div className="p-3 bg-destructive/10 border-l-4 border-destructive rounded-r-md">
                    <h4 className="font-bold text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Alertas de Bloqueio & Desvio
                    </h4>
                    <ul className="mt-1 space-y-1 text-foreground">
                      {summaryAI.blockers.map((b, i) => (
                        <li key={i}>
                          <strong>{format(new Date(b.date), 'dd/MM')}:</strong> {b.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                <Sparkles className="h-6 w-6 mx-auto mb-2 text-primary opacity-60" />
                <p className="text-xs">
                  Clique em "Gerar Diagnóstico" para analisar os diários de obra recentes e correlacionar frotas, clima e avanço.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos Marcos */}
        <Card className="lg:col-span-4 border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Milestone className="h-4 w-4 text-purple-500" /> Próximos Marcos Contratuais
            </CardTitle>
            <CardDescription className="text-xs">Eventos de entrega e faturação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {wbsItems
              .filter((i) => i.isMilestone && i.endDate)
              .slice(0, 4)
              .map((m) => (
                <div key={m.id} className="p-2.5 rounded-lg bg-muted/40 border flex items-center justify-between text-xs">
                  <span className="font-medium truncate pr-2" title={m.name}>
                    {m.name}
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                    {m.endDate ? format(new Date(m.endDate), 'dd/MM/yy') : 'N/D'}
                  </Badge>
                </div>
              ))}
            {wbsItems.filter((i) => i.isMilestone).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                Nenhum marco cadastrado na EAP.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
