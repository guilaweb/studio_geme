'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Sliders, 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  Truck, 
  Calendar, 
  Zap, 
  ArrowRight, 
  RefreshCw
} from 'lucide-react';
import { 
  SensitivityVariables, 
  ProjectFinancialSimulation, 
  ProjectCpuItem,
  EarthworkOptimizationPlan, 
  ScheduleScenarioComparison 
} from '@/types/engine-scenarios';
import { scenarioSimulationEngine } from '@/lib/engines/scenario-simulation-engine';

interface ScenarioSimulationTabProps {
  projectId: string;
  project?: any;
  transactions?: any[];
}

export function ScenarioSimulationTab({ projectId, project, transactions = [] }: ScenarioSimulationTabProps) {
  // Scenario simulation sliders
  const [dieselPct, setDieselPct] = useState<number>(15); // +15%
  const [usdPct, setUsdPct] = useState<number>(10); // +10%
  const [cementPct, setCementPct] = useState<number>(12); // +12%
  const [steelPct, setSteelPct] = useState<number>(8); // +8%
  const [laborPct, setLaborPct] = useState<number>(5); // +5%

  // Real Project CPUs
  const [projectCpus, setProjectCpus] = useState<ProjectCpuItem[]>([]);

  useEffect(() => {
    if (!projectId) return;
    const q = query(collection(db, 'projects', projectId, 'cpus'), orderBy('code', 'asc'));
    const unsub = onSnapshot(q, snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectCpuItem));
      setProjectCpus(items);
    }, err => {
      console.warn("Could not fetch project CPUs:", err);
      setProjectCpus([]);
    });
    return () => unsub();
  }, [projectId]);

  // Baseline config a partir dos dados reais do projeto
  const budgetTotalAOA = project?.budget || 0;
  const actualCostAOA = useMemo(() => {
    if (!transactions || transactions.length === 0) return 0;
    return transactions.filter((t: any) => t.type === 'Despesa').reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
  }, [transactions]);

  const variables: SensitivityVariables = useMemo(() => ({
    dieselPriceChangePct: dieselPct,
    usdExchangeRateChangePct: usdPct,
    cementPriceChangePct: cementPct,
    steelPriceChangePct: steelPct,
    laborCostChangePct: laborPct
  }), [dieselPct, usdPct, cementPct, steelPct, laborPct]);

  // Recalculate financial scenario
  const simulation: ProjectFinancialSimulation = useMemo(() => {
    const realProject = project || { id: projectId, name: 'Projeto', status: 'Em Execução', progress: 0, ownerId: '' };
    return scenarioSimulationEngine.simulateFinancialSensitivity(
      realProject,
      budgetTotalAOA,
      actualCostAOA,
      variables,
      projectCpus
    );
  }, [projectId, project, budgetTotalAOA, actualCostAOA, variables, projectCpus]);

  // Earthwork optimization plan
  const earthworkPlan: EarthworkOptimizationPlan = useMemo(() => {
    return scenarioSimulationEngine.optimizeEarthworkMasses(
      scenarioSimulationEngine.getProjectEarthworkMasses([]),
      65
    );
  }, []);

  // Schedule crash scenarios
  const crashComparison: ScheduleScenarioComparison = useMemo(() => {
    return scenarioSimulationEngine.compareCrashSchedules([], 2, 2, 2_500_000);
  }, []);

  const formatKz = (val: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(val).replace('AOA', 'Kz');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sliders className="w-3.5 h-3.5" />
              Simulador What-If & Engenharia de Valor
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Simulação de Cenários de Mercado & Otimização</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
              Modele dinamicamente o impacto de choques inflacionários, desvalorização cambial (USD/AOA) e variações de combustíveis
              sobre os Custos Unitários (CPUs), a margem final do contrato e a velocidade de execução da obra.
            </p>
          </div>
          <button 
            onClick={() => {
              setDieselPct(0);
              setUsdPct(0);
              setCementPct(0);
              setSteelPct(0);
              setLaborPct(0);
            }}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Repor Valores Base
          </button>
        </div>
      </div>

      {/* 1. SEÇÃO: SENSIBILIDADE MACROECONÓMICA & IMPACTO NO CONTRATO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Painel de Variáveis / Sliders */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            Variáveis de Stress Cambial & Insumos
          </h3>

          {/* Slider Combustível */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">Variação Gasóleo Rodoviário</span>
              <span className="text-indigo-600 font-bold">+{dieselPct}%</span>
            </div>
            <input 
              type="range" 
              min={-20} 
              max={100} 
              step={5} 
              value={dieselPct} 
              onChange={e => setDieselPct(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">Impacta diretamente terraplanagem, britagem e geradores.</p>
          </div>

          {/* Slider Câmbio USD/AOA */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">Depreciação Cambial AOA vs. USD</span>
              <span className="text-indigo-600 font-bold">+{usdPct}%</span>
            </div>
            <input 
              type="range" 
              min={0} 
              max={60} 
              step={5} 
              value={usdPct} 
              onChange={e => setUsdPct(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">Impacta peças sobressalentes e equipamentos importados.</p>
          </div>

          {/* Slider Cimento */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">Preço do Cimento (Saco 50kg)</span>
              <span className="text-indigo-600 font-bold">+{cementPct}%</span>
            </div>
            <input 
              type="range" 
              min={0} 
              max={60} 
              step={2} 
              value={cementPct} 
              onChange={e => setCementPct(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Slider Aço */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">Preço do Aço (Varão CA-50)</span>
              <span className="text-indigo-600 font-bold">+{steelPct}%</span>
            </div>
            <input 
              type="range" 
              min={0} 
              max={60} 
              step={2} 
              value={steelPct} 
              onChange={e => setSteelPct(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Slider Mão de Obra */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">Ajuste Salarial Mão de Obra</span>
              <span className="text-indigo-600 font-bold">+{laborPct}%</span>
            </div>
            <input 
              type="range" 
              min={0} 
              max={50} 
              step={5} 
              value={laborPct} 
              onChange={e => setLaborPct(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Dashboard de Impacto Financeiro (EAC & Margem) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Impacto no EAC (Estimate at Completion) & Margem Contratual
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Recálculo paramétrico em tempo real com base no plano de custos do projeto.
            </p>

            {/* KPIs de Comparação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 uppercase font-semibold">Orçamento Inicial</span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatKz(simulation.baselineBudgetAOA)}</p>
                <p className="text-xs text-slate-400 mt-1">Margem prevista: {simulation.originalMarginPct}%</p>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                <span className="text-xs text-amber-700 dark:text-amber-400 uppercase font-semibold">Novo EAC Projetado</span>
                <p className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-1">{formatKz(simulation.simulatedEstimateAtCompletionAOA)}</p>
                <p className="text-xs text-rose-600 font-semibold mt-1">
                  Impacto: {formatKz(simulation.profitImpactAOA)}
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${
                simulation.simulatedMarginPct > 12 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                simulation.simulatedMarginPct > 5 ? 'bg-amber-50 border-amber-200 text-amber-900' :
                'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <span className="text-xs uppercase font-semibold opacity-75">Margem Residual</span>
                <p className="text-xl font-bold mt-1">{simulation.simulatedMarginPct.toFixed(1)}%</p>
                <div className="flex items-center gap-1 text-xs mt-1">
                  {simulation.simulatedMarginPct < simulation.originalMarginPct ? (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span>Variação: {(simulation.simulatedMarginPct - simulation.originalMarginPct).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Impacto detalhado nos CPUs */}
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Sensibilidade por Composição de Preço Unitário (CPU):
            </h4>
            <div className="space-y-2">
              {simulation.affectedCpus.length === 0 ? (
                <div className="py-8 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  <Sliders className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nenhuma Composição de Preço Unitário (CPU) registada no projeto
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                    Insira as composições de custo unitário e artigos de medição da obra para projetar o impacto de variações de combustível, câmbio e matérias-primas.
                  </p>
                </div>
              ) : (
                simulation.affectedCpus.map(cpu => (
                  <div 
                    key={cpu.cpuCode}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                  >
                    <div className="max-w-[45%]">
                      <span className="font-mono text-slate-400">{cpu.cpuCode}</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{cpu.description}</p>
                      <p className="text-[11px] text-slate-400">Driver crítico: {cpu.mainDriver}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-slate-500">Base: {formatKz(cpu.originalUnitCostAOA)}/{cpu.unit}</div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        Simulado: {formatKz(cpu.simulatedUnitCostAOA)}/{cpu.unit}
                      </div>
                    </div>

                    <div className="text-right pl-4">
                      <span className={`px-2 py-1 rounded font-bold ${
                        cpu.variancePct > 15 ? 'bg-rose-100 text-rose-700' :
                        cpu.variancePct > 5 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        +{cpu.variancePct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-500">Revisão de Preços no Contrato:</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              Gatilho do Decreto Presidencial de Revisão de Preços aplicável se variação &gt; 10%
            </span>
          </div>
        </div>
      </div>

      {/* 2. SEÇÃO: OTIMIZADOR DE MOVIMENTAÇÃO DE TERRAS (DMT) & CRASH SCHEDULING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Otimização de DMT / Terraplanagem */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Otimização de DMT (Movimentação de Terras)</h3>
            </div>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full font-semibold">
              - {earthworkPlan.savingsPct}% Custo de Transporte
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Algoritmo de transporte que minimiza a Distância Média de Transporte entre as zonas de corte, aterro e bota-fora da obra linear.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400">Custo Logístico Sem Otimização:</span>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">{formatKz(earthworkPlan.baselineLogisticsCostAOA)}</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
              <span className="text-emerald-700 dark:text-emerald-400">Logística Otimizada com IA:</span>
              <p className="text-base font-bold text-emerald-800 dark:text-emerald-300">{formatKz(earthworkPlan.optimizedLogisticsCostAOA)}</p>
              <p className="text-[10px] text-emerald-600">Poupança direta: {formatKz(earthworkPlan.savingsAOA)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Rotas de Transporte Otimizadas:</h4>
            {earthworkPlan.routes.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs py-6">
                Nenhuma frente de terraplanagem com corte/aterro configurada para otimização de DMT.
              </div>
            ) : (
              earthworkPlan.routes.map((r, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{r.from}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{r.to}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white">{r.volumeM3.toLocaleString()} m³</span>
                    <span className="text-slate-400 ml-2">({r.dmtKm} km)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Simulação de Aceleração de Cronograma (Crash Scheduling) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Curvas de Aceleração (Crash Scheduling)</h3>
            </div>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full font-semibold">
              Recuperação: {crashComparison.daysRecovered} dias
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Avalie o custo de adicionar turnos e equipas para antecipar a entrega e evitar multas de mora contratuais.
          </p>

          {crashComparison.curves.length === 0 ? (
            <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs py-6">
              Nenhuma tarefa com desvio no caminho crítico registada para aceleração de cronograma (*crash scheduling*).
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Turnos Adicionados:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">+{crashComparison.additionalShiftsCount} Turnos</p>
                </div>
                <div>
                  <span className="text-slate-400">Máquinas Extras:</span>
                  <p className="font-bold text-purple-700 dark:text-purple-400 mt-0.5">+{crashComparison.additionalEquipmentCount} Unidades</p>
                </div>
                <div>
                  <span className="text-slate-400">Dias Antecipados:</span>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">-{crashComparison.daysRecovered} Dias</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400">Custo Aceleração:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{formatKz(crashComparison.extraAccelerationCostAOA)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Multas Evitadas:</span>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">{formatKz(crashComparison.savedContractDelayPenaltiesAOA)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Benefício Líquido:</span>
                  <p className="font-bold text-indigo-600 dark:text-indigo-400">{formatKz(crashComparison.netBenefitAOA)}</p>
                </div>
              </div>

              {/* Curvas comparativas */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avanço Físico Projetado (%):</span>
                <div className="grid grid-cols-6 gap-2 mt-2 text-center text-xs">
                  {crashComparison.curves.map((c, i) => (
                    <div key={i} className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400">{c.date}</div>
                      <div className="font-bold text-emerald-600">{c.acceleratedProgressPct}%</div>
                      <div className="text-[9px] text-slate-400">Base: {c.baselineProgressPct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
