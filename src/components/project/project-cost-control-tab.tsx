'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Filter,
  FileDown,
  ArrowRight,
  Sparkles,
  Layers,
  Search,
  FileSignature,
  Scale,
} from 'lucide-react';
import type { Project } from '@/types/project';
import type { WbsItem } from '@/types/wbs';
import type { Transaction } from '@/types/finance';
import type { MeasurementCertificate } from '@/types/measurement-certificate';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ProjectCostControlTabProps {
  projectId: string;
  project: Project;
  wbsItems: WbsItem[];
  transactions: Transaction[];
  onNavigateTab?: (tab: string) => void;
}

const formatAOA = (value: number) => {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0,
  }).format(value);
};

export function ProjectCostControlTab({
  projectId,
  project,
  wbsItems,
  transactions,
  onNavigateTab,
}: ProjectCostControlTabProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'alert' | 'ok'>('all');
  const [measurementCertificates, setMeasurementCertificates] = useState<MeasurementCertificate[]>([]);

  // Escuta dos Autos de Medição em tempo real para cálculo de produção e faturamento
  useEffect(() => {
    if (!projectId) return;

    const q = query(collection(db, 'projects', projectId, 'measurementCertificates'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setMeasurementCertificates(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MeasurementCertificate)));
    }, () => {
      // Fallback para convenção com hífen se aplicável
      const qAlt = query(collection(db, 'projects', projectId, 'measurement-certificates'), orderBy('createdAt', 'desc'));
      onSnapshot(qAlt, (snapAlt) => {
        setMeasurementCertificates(snapAlt.docs.map(d => ({ id: d.id, ...d.data() } as MeasurementCertificate)));
      }, () => {});
    });

    return () => unsub();
  }, [projectId]);

  // Cálculos Globais de Custos
  const costMetrics = useMemo(() => {
    // 1. Orçamento Aprovado (BAC)
    const approvedBudget = project.approvedBudget || project.budget || wbsItems.reduce((acc, item) => acc + (item.budget || 0), 0);

    // 2. Custo Realizado (AC)
    const actualCost = transactions
      .filter((t) => t.type === 'Despesa')
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    // 3. Custo Comprometido
    // Transações pendentes/comprometidas + wbsItems com comprometido declarado
    const committedTransactions = transactions
      .filter((t) => (t as any).status === 'Comprometido' || (t as any).status === 'Pendente')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const declaredCommitted = wbsItems.reduce((acc, i) => acc + (i.committedCost || 0), 0);
    // Custo Comprometido real = valores contratados/comprometidos pendentes + custos já realizados
    const committedCost = Math.max(committedTransactions + actualCost, declaredCommitted, actualCost);

    // 4. Autos de Medição Homologados e Pendentes
    const approvedCerts = measurementCertificates.filter(m => m.status === 'approved' || m.status === 'paid');
    const certifiedProduction = approvedCerts.reduce((acc, c) => acc + (c.currentPeriodValue || c.newAccumulated || 0), 0);
    const pendingCerts = measurementCertificates.filter(m => m.status === 'submitted');
    const pendingProduction = pendingCerts.reduce((acc, c) => acc + (c.currentPeriodValue || 0), 0);

    // 5. Progresso Ponderado Global
    const totalWeight = wbsItems.filter((i) => !i.parentId).reduce((acc, i) => acc + (i.weight || 1), 0) || 1;
    const weightedProgress =
      wbsItems
        .filter((i) => !i.parentId)
        .reduce((acc, i) => acc + ((i.progress || 0) * (i.weight || 1)), 0) / totalWeight;

    // EV = se houver medições aprovadas, a produção homologada é a base mais rigorosa; senão BAC * Progresso
    const earnedValue = certifiedProduction > 0 
      ? certifiedProduction 
      : approvedBudget * (Math.min(100, Math.max(0, weightedProgress)) / 100);

    // CPI = EV / AC (Índice de Desempenho de Custo)
    const cpi = actualCost > 0 ? earnedValue / actualCost : 1.0;

    // 6. Previsão Final (EAC - Estimate at Completion)
    const eac = cpi > 0 ? approvedBudget / cpi : approvedBudget;

    // 7. Desvio Previsto no Término (VAC = BAC - EAC)
    const varianceAtCompletion = approvedBudget - eac;
    const variancePredictedAmount = Math.abs(varianceAtCompletion);
    const isOverbudget = eac > approvedBudget;

    // 8. Margem de Contribuição Operacional (Produção Medida Homologada - Custo Realizado)
    const operationalMargin = certifiedProduction - actualCost;
    const operationalMarginPct = certifiedProduction > 0 ? (operationalMargin / certifiedProduction) * 100 : 0;

    // 9. Saldo Disponível do Orçamento
    const availableBalance = approvedBudget - actualCost - Math.max(0, committedCost - actualCost);

    return {
      approvedBudget,
      committedCost,
      actualCost,
      eac,
      varianceAtCompletion,
      variancePredictedAmount,
      isOverbudget,
      availableBalance,
      cpi,
      earnedValue,
      weightedProgress,
      certifiedProduction,
      pendingProduction,
      pendingCertsCount: pendingCerts.length,
      operationalMargin,
      operationalMarginPct,
    };
  }, [project, wbsItems, transactions, measurementCertificates]);

  // Breakdown por Pacotes de Trabalho da EAP
  const phaseBreakdowns = useMemo(() => {
    return wbsItems
      .filter((item) => !item.parentId || item.level === 'phase')
      .map((phase) => {
        // Encontrar todos os filhos recursivos
        const childIds = new Set<string>();
        const collectChildren = (parentId: string) => {
          childIds.add(parentId);
          wbsItems.filter((w) => w.parentId === parentId).forEach((c) => collectChildren(c.id));
        };
        collectChildren(phase.id);

        const phaseBudget = wbsItems
          .filter((w) => childIds.has(w.id))
          .reduce((acc, w) => acc + (w.budget || 0), 0) || phase.budget || 0;

        const phaseActual = transactions
          .filter((t) => t.type === 'Despesa' && t.wbsItemId && childIds.has(t.wbsItemId))
          .reduce((acc, t) => acc + (t.amount || 0), 0);

        const phaseCommitted = wbsItems
          .filter((w) => childIds.has(w.id))
          .reduce((acc, w) => acc + (w.committedCost || 0), 0) || phaseActual;

        const phaseProgress = phase.progress || 0;
        const phaseEv = phaseBudget * (phaseProgress / 100);
        const phaseCpi = phaseActual > 0 ? phaseEv / phaseActual : 1.0;
        const phaseEac = phaseCpi > 0 ? phaseBudget / phaseCpi : phaseBudget;
        const phaseVariance = phaseBudget - phaseEac;
        const isPhaseOver = phaseEac > phaseBudget;

        return {
          id: phase.id,
          code: phase.code || '1.0',
          name: phase.name,
          budget: phaseBudget,
          committed: phaseCommitted,
          actual: phaseActual,
          eac: phaseEac,
          variance: phaseVariance,
          isOver: isPhaseOver,
          progress: phaseProgress,
          cpi: phaseCpi,
        };
      })
      .filter((p) => {
        if (filterQuery && !p.name.toLowerCase().includes(filterQuery.toLowerCase()) && !p.code.includes(filterQuery)) {
          return false;
        }
        if (statusFilter === 'alert' && !p.isOver) return false;
        if (statusFilter === 'ok' && p.isOver) return false;
        return true;
      });
  }, [wbsItems, transactions, filterQuery, statusFilter]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header com Explicação do Fluxo de Custos */}
      <div className="bg-card border p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-semibold bg-amber-500/10 text-amber-600 border-amber-500/30">
              <Coins className="h-3.5 w-3.5 mr-1" /> GESTÃO DE CUSTOS & COST CONTROL
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Project Controls
            </Badge>
          </div>
          <h2 className="text-xl font-bold font-headline mt-1">Esteira de Custos: Do Orçamento à Previsão Final</h2>
          <p className="text-xs text-muted-foreground">
            Acompanhamento analítico da esteira: Orçamento &rarr; Comprometido &rarr; Realizado &rarr; Previsão Final (EAC). Descubra onde o desvio está a acontecer.
          </p>
        </div>

        <div className="flex gap-2">
          {onNavigateTab && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab('measurement-certificates')}
                className="text-xs gap-1.5 shrink-0"
              >
                <FileSignature className="h-3.5 w-3.5 text-blue-600" /> Autos de Medição
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab('wbs')}
                className="text-xs gap-1.5 shrink-0"
              >
                <Layers className="h-3.5 w-3.5 text-primary" /> Ajustar Orçamento
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Banner de Margem Operacional & Produção Homologada */}
      <Card className="border shadow-sm bg-gradient-to-r from-blue-900/10 via-card to-emerald-900/10 p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Balanço Operacional Homologado</span>
              {costMetrics.pendingCertsCount > 0 && (
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                  {costMetrics.pendingCertsCount} Auto(s) a aguardar aprovação ({formatAOA(costMetrics.pendingProduction)})
                </Badge>
              )}
            </div>
            <div className="text-2xl font-black font-headline text-foreground">
              Margem Operacional: {costMetrics.operationalMargin >= 0 ? '+' : ''}{formatAOA(costMetrics.operationalMargin)}{' '}
              <span className={costMetrics.operationalMargin >= 0 ? 'text-emerald-600 text-lg' : 'text-destructive text-lg'}>
                ({costMetrics.operationalMarginPct.toFixed(1)}%)
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Produção homologada pela fiscalização ({formatAOA(costMetrics.certifiedProduction)}) deduzida dos custos reais incorridos na obra ({formatAOA(costMetrics.actualCost)}).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-background rounded-xl border text-center min-w-[110px]">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Índice CPI</div>
              <div className={`text-xl font-bold font-mono ${costMetrics.cpi >= 1 ? 'text-emerald-600' : 'text-destructive'}`}>
                {costMetrics.cpi.toFixed(2)}
              </div>
              <div className="text-[10px] text-muted-foreground">{costMetrics.cpi >= 1 ? 'Eficiente' : 'Sobrecusto'}</div>
            </div>
            <div className="p-3 bg-background rounded-xl border text-center min-w-[110px]">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Saldo BAC</div>
              <div className="text-xl font-bold font-mono text-blue-600">
                {formatAOA(costMetrics.availableBalance)}
              </div>
              <div className="text-[10px] text-muted-foreground">Disponível</div>
            </div>
          </div>
        </div>
      </Card>

      {/* A Esteira dos 5 Grandes Indicadores de Custo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Orçamento Aprovado */}
        <Card className="border shadow-sm p-4 bg-card hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Orçamento (BAC)</span>
            <span className="text-blue-500 font-bold">1</span>
          </div>
          <div className="text-xl font-bold font-headline mt-1 text-foreground">
            {formatAOA(costMetrics.approvedBudget)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Linha de base aprovada</div>
        </Card>

        {/* 2. Custo Comprometido */}
        <Card className="border shadow-sm p-4 bg-card hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Comprometido</span>
            <span className="text-amber-500 font-bold">2</span>
          </div>
          <div className="text-xl font-bold font-headline mt-1 text-amber-600 dark:text-amber-400">
            {formatAOA(costMetrics.committedCost)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Contratos & Ordens emitidas</div>
        </Card>

        {/* 3. Custo Realizado */}
        <Card className="border shadow-sm p-4 bg-card hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Realizado (AC)</span>
            <span className="text-emerald-500 font-bold">3</span>
          </div>
          <div className="text-xl font-bold font-headline mt-1 text-emerald-600 dark:text-emerald-400">
            {formatAOA(costMetrics.actualCost)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Faturas & Despesas pagas</div>
        </Card>

        {/* 4. Previsão Final (EAC) */}
        <Card className="border shadow-sm p-4 bg-card hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Previsão Final (EAC)</span>
            <span className="text-purple-500 font-bold">4</span>
          </div>
          <div className="text-xl font-bold font-headline mt-1 text-purple-600 dark:text-purple-400">
            {formatAOA(costMetrics.eac)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Custo projetado no término</div>
        </Card>

        {/* 5. Desvio Previsto (VAC) */}
        <Card
          className={`border shadow-sm p-4 transition-all ${
            costMetrics.isOverbudget
              ? 'bg-destructive/5 border-destructive/30 hover:border-destructive'
              : 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={costMetrics.isOverbudget ? 'text-destructive' : 'text-emerald-600'}>
              Desvio Previsto (VAC)
            </span>
            <span className="font-bold">5</span>
          </div>
          <div
            className={`text-xl font-bold font-headline mt-1 ${
              costMetrics.isOverbudget ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {costMetrics.isOverbudget ? '+' : '-'} {formatAOA(costMetrics.variancePredictedAmount)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {costMetrics.isOverbudget ? 'Alerta de Sobrecusto' : 'Economia Projetada'}
          </div>
        </Card>
      </div>

      {/* Tabela e Cards de Desdobramento: Onde o Desvio Está a Acontecer? */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Diagnóstico Causal de Custos por Pacote de Trabalho
              </CardTitle>
              <CardDescription className="text-xs">
                Desdobramento analítico para identificar exatamente quais fases ou pacotes estão a provocar desvios.
              </CardDescription>
            </div>

            {/* Filtros e Busca */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filtrar pacote..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button
                variant={statusFilter === 'alert' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(statusFilter === 'alert' ? 'all' : 'alert')}
                className="text-xs h-8 shrink-0"
              >
                Apenas Desvios
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {phaseBreakdowns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              Nenhum pacote de trabalho encontrado com os filtros selecionados.
            </div>
          ) : (
            <>
              {/* Mobile First View (< 768px): Cards estruturados */}
              <div className="block md:hidden p-3 space-y-3">
                {phaseBreakdowns.map((phase) => (
                  <div key={phase.id} className="border rounded-xl p-3.5 space-y-2.5 bg-card shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-muted-foreground">{phase.code}</span>
                        <h4 className="font-bold text-sm text-foreground">{phase.name}</h4>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${
                          phase.isOver
                            ? 'bg-destructive/10 text-destructive border-destructive/30'
                            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        }`}
                      >
                        {phase.isOver ? 'Sobrecusto' : 'No Orçamento'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2 rounded-lg">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Orçamento (BAC):</span>
                        <span className="font-mono font-medium">{formatAOA(phase.budget)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Realizado (AC):</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatAOA(phase.actual)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Previsão (EAC):</span>
                        <span className="font-mono text-purple-600 dark:text-purple-400">
                          {formatAOA(phase.eac)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Desvio (VAC):</span>
                        <span
                          className={`font-mono font-bold ${
                            phase.isOver ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {phase.isOver ? '+' : '-'} {formatAOA(Math.abs(phase.variance))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View (>= 768px): Tabela Completa */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead className="w-16">Código</TableHead>
                      <TableHead>Fase / Pacote de Trabalho</TableHead>
                      <TableHead className="text-right">Orçamento (BAC)</TableHead>
                      <TableHead className="text-right">Comprometido</TableHead>
                      <TableHead className="text-right">Realizado (AC)</TableHead>
                      <TableHead className="text-right">Previsão Final (EAC)</TableHead>
                      <TableHead className="text-right">Desvio (VAC)</TableHead>
                      <TableHead className="text-center w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phaseBreakdowns.map((phase) => (
                      <TableRow key={phase.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-mono font-bold text-muted-foreground">{phase.code}</TableCell>
                        <TableCell className="font-semibold text-foreground">{phase.name}</TableCell>
                        <TableCell className="text-right font-mono">{formatAOA(phase.budget)}</TableCell>
                        <TableCell className="text-right font-mono text-amber-600 dark:text-amber-400">
                          {formatAOA(phase.committed)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {formatAOA(phase.actual)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-purple-600 dark:text-purple-400">
                          {formatAOA(phase.eac)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-bold ${
                            phase.isOver ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {phase.isOver ? '+' : '-'} {formatAOA(Math.abs(phase.variance))}
                        </TableCell>
                        <TableCell className="text-center">
                          {phase.isOver ? (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                              Sobrecusto
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              No Orçamento
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
