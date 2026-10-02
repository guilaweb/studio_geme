'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Fuel, 
  Coins, 
  ShoppingBag, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Percent, 
  Plus, 
  FileSpreadsheet,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, Timestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project } from '@/types/project';
import type { ProjectCpuItem } from '@/types/engine-scenarios';
import type { Transaction } from '@/types/finance';

interface CostEngineerViewProps {
  projectId: string;
  project: Project | null;
  onNavigateToTab?: (tab: string) => void;
}

export function CostEngineerView({ projectId, project, onNavigateToTab }: CostEngineerViewProps) {
  const { toast } = useToast();
  const [cpus, setCpus] = useState<ProjectCpuItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Adicionar Nova CPU (Ação em 2 Cliques)
  const [isAddCpuOpen, setIsAddCpuOpen] = useState(false);
  const [isSubmittingCpu, setIsSubmittingCpu] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUnit, setNewUnit] = useState('m³');
  const [newPrice, setNewPrice] = useState('');
  const [newCementShare, setNewCementShare] = useState('30');
  const [newDieselShare, setNewDieselShare] = useState('20');
  const [newLaborShare, setNewLaborShare] = useState('50');

  // Variáveis de Simulação What-If Rápida para o Orçamentista
  const [dieselVarPct, setDieselVarPct] = useState(10); // +10%
  const [usdVarPct, setUsdVarPct] = useState(8);       // +8%
  const [cementVarPct, setCementVarPct] = useState(12);   // +12%

  const handleCreateCpu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim() || !newPrice) {
      toast({ title: 'Campos Obrigatórios', description: 'Preencha a descrição e o preço base.', variant: 'destructive' });
      return;
    }
    setIsSubmittingCpu(true);
    try {
      const generatedCode = newCode.trim() || `CPU-${(cpus.length + 1).toString().padStart(2, '0')}`;
      await addDoc(collection(db, 'projects', projectId, 'cpus'), {
        code: generatedCode,
        description: newDesc,
        unit: newUnit,
        basePriceAOA: parseFloat(newPrice) || 0,
        cementShare: (parseFloat(newCementShare) || 0) / 100,
        dieselShare: (parseFloat(newDieselShare) || 0) / 100,
        laborShare: (parseFloat(newLaborShare) || 0) / 100,
        createdAt: Timestamp.now(),
      });
      toast({
        title: 'CPU Cadastrada com Sucesso!',
        description: `A composição "${generatedCode}" foi inserida na árvore de custos.`,
      });
      setIsAddCpuOpen(false);
      setNewCode('');
      setNewDesc('');
      setNewPrice('');
    } catch (err: any) {
      toast({ title: 'Erro ao criar CPU', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmittingCpu(false);
    }
  };

  const handleLoadStandardCPUs = async () => {
    setIsSubmittingCpu(true);
    try {
      const standardCPUs = [
        { code: 'CPU-01', description: 'Betão Armado em Sapatas e Estrutura C25/30', unit: 'm³', basePriceAOA: 95000, cementShare: 0.40, dieselShare: 0.15, laborShare: 0.45 },
        { code: 'CPU-02', description: 'Alvenaria de Elevação em Blocos de Betão 15x20x40', unit: 'm²', basePriceAOA: 8500, cementShare: 0.35, dieselShare: 0.05, laborShare: 0.60 },
        { code: 'CPU-03', description: 'Escavação Mecânica em Solo de 1ª Categoria', unit: 'm³', basePriceAOA: 4200, cementShare: 0.0, dieselShare: 0.65, laborShare: 0.35 },
        { code: 'CPU-04', description: 'Reboco Tradicional Afagado de Argamassa 1:4', unit: 'm²', basePriceAOA: 5800, cementShare: 0.45, dieselShare: 0.05, laborShare: 0.50 },
        { code: 'CPU-05', description: 'Fornecimento e Moldagem de Varão de Aço A500NR', unit: 'kg', basePriceAOA: 1250, cementShare: 0.0, dieselShare: 0.10, laborShare: 0.40 },
      ];
      const batch = writeBatch(db);
      for (const item of standardCPUs) {
        const ref = doc(collection(db, 'projects', projectId, 'cpus'));
        batch.set(ref, {
          ...item,
          createdAt: Timestamp.now()
        });
      }
      await batch.commit();
      toast({ title: 'Tabela Padrão Carregada!', description: '5 composições analíticas padrão adicionadas ao projeto.' });
    } catch (err: any) {
      toast({ title: 'Erro ao carregar composições padrão', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmittingCpu(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const cpusQuery = query(collection(db, 'projects', projectId, 'cpus'), orderBy('code', 'asc'));
    const transQuery = query(collection(db, 'projects', projectId, 'transactions'));

    const unsubCpus = onSnapshot(cpusQuery, snap => {
      setCpus(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectCpuItem)));
      setLoading(false);
    }, err => {
      console.warn('Erro ao carregar CPUs:', err);
      setCpus([]);
      setLoading(false);
    });

    const unsubTrans = onSnapshot(transQuery, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    });

    return () => {
      unsubCpus();
      unsubTrans();
    };
  }, [projectId]);

  // Cálculos de Custos Orçado vs. Realizado
  const totalBudgetAOA = project?.budget || 0;
  const totalActualCostAOA = useMemo(() => {
    return transactions
      .filter(t => t.type === 'Despesa')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions]);

  const costVarianceAOA = totalBudgetAOA - totalActualCostAOA;
  const costVariancePct = totalBudgetAOA > 0 ? (totalActualCostAOA / totalBudgetAOA) * 100 : 0;

  // Formatação Kz
  const fmtKz = (val: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Cálculo de Impacto nos CPUs com os sliders
  const simulatedCpus = useMemo(() => {
    return cpus.map(cpu => {
      const base = cpu.basePriceAOA || 0;
      const dieselDelta = (cpu.dieselShare || 0) * (dieselVarPct / 100);
      const usdDelta = (cpu.importUsdShare || 0) * (usdVarPct / 100);
      const cementDelta = (cpu.cementShare || 0) * (cementVarPct / 100);
      const totalDeltaPct = dieselDelta + usdDelta + cementDelta;
      const simulatedPrice = base * (1 + totalDeltaPct);

      return {
        ...cpu,
        simulatedPrice,
        totalDeltaPct: totalDeltaPct * 100
      };
    });
  }, [cpus, dieselVarPct, usdVarPct, cementVarPct]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho do Orçamentista / Engenheiro de Custos */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Engenharia de Custos & CPUs</h1>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-medium">
              Orçamentista
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Composições de Preço Unitário (CPU), estrutura analítica de custos e sensibilidade financeira.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            size="sm" 
            onClick={() => setIsAddCpuOpen(true)}
            className="text-xs bg-primary text-primary-foreground font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova CPU
          </Button>

          {onNavigateToTab && (
            <>
              <Button size="sm" variant="outline" onClick={() => onNavigateToTab('compras')} className="text-xs">
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                Cotações & Compras
              </Button>
              <Button size="sm" variant="outline" onClick={() => onNavigateToTab('finance')} className="text-xs">
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                Lançamentos Financeiros
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Cartões Principais: Orçado vs Realizado & Variação */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Orçamento Base Aprovado</CardDescription>
            <CardTitle className="text-xl font-bold text-foreground">{fmtKz(totalBudgetAOA)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Total contratado para a empreitada
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Custo Real Acumulado</CardDescription>
            <CardTitle className="text-xl font-bold text-foreground">{fmtKz(totalActualCostAOA)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Consumido até à data</span>
            <Badge variant={costVariancePct > 100 ? 'destructive' : 'outline'} className="text-[10px]">
              {costVariancePct.toFixed(1)}% do total
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Saldo Orçamental Disponível</CardDescription>
            <CardTitle className={`text-xl font-bold ${costVarianceAOA >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmtKz(costVarianceAOA)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
            {costVarianceAOA >= 0 ? (
              <>
                <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600 font-medium">Dentro do teto orçamentado</span>
              </>
            ) : (
              <>
                <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                <span className="text-red-600 font-medium">Desvio de custo identificado</span>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Árvore e Tabela de Composições de Preço Unitário (CPUs) */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Tabela de Composições de Preço Unitário (CPUs Ativas)
              </CardTitle>
              <CardDescription className="text-xs">
                Estrutura de custos unitários com drivers de combustíveis, cimento e risco cambial.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs self-start sm:self-auto font-mono">
              {cpus.length} {cpus.length === 1 ? 'CPU Registada' : 'CPUs Registadas'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {cpus.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm border border-dashed rounded-lg space-y-3">
              <Calculator className="h-8 w-8 mx-auto opacity-40 text-primary" />
              <p className="font-semibold text-foreground">Nenhuma Composição de Preço Unitário (CPU) registada neste projeto.</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                As CPUs permitem decompor custos em cimento, gasóleo e mão de obra para simular o impacto de choques económicos.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleLoadStandardCPUs}
                  disabled={isSubmittingCpu}
                  className="text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Carregar 5 Composições Padrão (1 Clique)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddCpuOpen(true)}
                  className="text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Criar CPU Manual
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">CÓDIGO</TableHead>
                    <TableHead>DESCRIÇÃO DO ARTIGO DE ENGENHARIA</TableHead>
                    <TableHead className="w-16 text-center">UNID</TableHead>
                    <TableHead className="text-right">PREÇO BASE (KZ)</TableHead>
                    <TableHead className="text-right">PREÇO SIMULADO</TableHead>
                    <TableHead className="text-center">VARIAÇÃO</TableHead>
                    <TableHead className="w-48">PESO DOS DRIVERS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulatedCpus.map((cpu, index) => (
                    <TableRow key={cpu.id || index}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {cpu.code}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {cpu.description}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {cpu.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        {fmtKz(cpu.basePriceAOA)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {fmtKz(cpu.simulatedPrice)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={cpu.totalDeltaPct > 0 ? 'destructive' : 'outline'}
                          className="text-[10px] font-mono"
                        >
                          {cpu.totalDeltaPct >= 0 ? `+${cpu.totalDeltaPct.toFixed(1)}%` : `${cpu.totalDeltaPct.toFixed(1)}%`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 text-[10px]">
                          {(cpu.dieselShare || 0) > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 text-[9px] px-1.5 py-0">
                              Diesel {Math.round((cpu.dieselShare || 0) * 100)}%
                            </Badge>
                          )}
                          {(cpu.cementShare || 0) > 0 && (
                            <Badge variant="outline" className="bg-stone-100 text-stone-900 border-stone-300 dark:bg-stone-900 dark:text-stone-200 text-[9px] px-1.5 py-0">
                              Cimento {Math.round((cpu.cementShare || 0) * 100)}%
                            </Badge>
                          )}
                          {(cpu.steelShare || 0) > 0 && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-200 text-[9px] px-1.5 py-0">
                              Aço {Math.round((cpu.steelShare || 0) * 100)}%
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simulador Rápido de Sensibilidade de Custos (What-If para o Orçamentista) */}
      <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-500" />
            Simulador Rápido de Sensibilidade de Drivers
          </CardTitle>
          <CardDescription className="text-xs">
            Ajuste as variações de mercado para antecipar o impacto unitário no contrato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Variação do Gasóleo:</span>
                <span className="font-mono text-amber-600 font-bold">+{dieselVarPct}%</span>
              </div>
              <Slider
                min={0}
                max={50}
                step={1}
                value={[dieselVarPct]}
                onValueChange={vals => setDieselVarPct(vals[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Câmbio USD/AOA:</span>
                <span className="font-mono text-blue-600 font-bold">+{usdVarPct}%</span>
              </div>
              <Slider
                min={0}
                max={50}
                step={1}
                value={[usdVarPct]}
                onValueChange={vals => setUsdVarPct(vals[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Preço do Cimento:</span>
                <span className="font-mono text-stone-700 dark:text-stone-300 font-bold">+{cementVarPct}%</span>
              </div>
              <Slider
                min={0}
                max={50}
                step={1}
                value={[cementVarPct]}
                onValueChange={vals => setCementVarPct(vals[0])}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MODAL: NOVA COMPOSIÇÃO DE PREÇO UNITÁRIO (CPU) */}
      <Dialog open={isAddCpuOpen} onOpenChange={setIsAddCpuOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateCpu}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Plus className="h-4 w-4 text-primary" />
                Nova Composição de Preço Unitário (CPU)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cadastre um novo serviço de engenharia com decomposição analítica em Kwanzas (AOA).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3">
              {/* Quick Presets */}
              <div className="space-y-1.5 p-2 rounded-lg bg-muted/40 border border-muted-foreground/10">
                <Label className="text-[11px] font-semibold text-muted-foreground block">Modelos Frequentes de Engenharia (1 Clique):</Label>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-[11px] h-6 px-2 rounded-full bg-background hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                    onClick={() => {
                      setNewCode(`CPU-${(cpus.length + 1).toString().padStart(2, '0')}`);
                      setNewDesc('Betão Armado em Sapatas e Estrutura C25/30');
                      setNewUnit('m³');
                      setNewPrice('95000');
                      setNewCementShare('40');
                      setNewDieselShare('15');
                      setNewLaborShare('45');
                    }}
                  >
                    + Betão Estrutural
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-[11px] h-6 px-2 rounded-full bg-background hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                    onClick={() => {
                      setNewCode(`CPU-${(cpus.length + 1).toString().padStart(2, '0')}`);
                      setNewDesc('Alvenaria de Elevação em Blocos de Betão 15x20x40');
                      setNewUnit('m²');
                      setNewPrice('8500');
                      setNewCementShare('35');
                      setNewDieselShare('5');
                      setNewLaborShare('60');
                    }}
                  >
                    + Alvenaria Bloco 15
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-[11px] h-6 px-2 rounded-full bg-background hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                    onClick={() => {
                      setNewCode(`CPU-${(cpus.length + 1).toString().padStart(2, '0')}`);
                      setNewDesc('Escavação Mecânica em Solo de 1ª Categoria');
                      setNewUnit('m³');
                      setNewPrice('4200');
                      setNewCementShare('0');
                      setNewDieselShare('65');
                      setNewLaborShare('35');
                    }}
                  >
                    + Escavação
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-[11px] h-6 px-2 rounded-full bg-background hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
                    onClick={() => {
                      setNewCode(`CPU-${(cpus.length + 1).toString().padStart(2, '0')}`);
                      setNewDesc('Reboco Tradicional Afagado com Argamassa 1:4');
                      setNewUnit('m²');
                      setNewPrice('5800');
                      setNewCementShare('45');
                      setNewDieselShare('5');
                      setNewLaborShare('50');
                    }}
                  >
                    + Reboco
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-[11px] h-6 px-2 rounded-full bg-background hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                    onClick={() => {
                      setNewCode(`CPU-${(cpus.length + 1).toString().padStart(2, '0')}`);
                      setNewDesc('Fornecimento e Moldagem de Varão de Aço A500NR');
                      setNewUnit('kg');
                      setNewPrice('1250');
                      setNewCementShare('0');
                      setNewDieselShare('10');
                      setNewLaborShare('40');
                    }}
                  >
                    + Aço A500NR
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <Label className="text-xs">Código</Label>
                  <Input 
                    value={newCode} 
                    onChange={e => setNewCode(e.target.value)} 
                    placeholder="Ex: CPU-05" 
                    className="mt-1 text-xs font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Unidade de Medida</Label>
                  <Select value={newUnit} onValueChange={setNewUnit}>
                    <SelectTrigger className="mt-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m³">Metro Cúbico (m³)</SelectItem>
                      <SelectItem value="m²">Metro Quadrado (m²)</SelectItem>
                      <SelectItem value="ml">Metro Linear (ml)</SelectItem>
                      <SelectItem value="kg">Quilograma (kg)</SelectItem>
                      <SelectItem value="ton">Tonelada (ton)</SelectItem>
                      <SelectItem value="un">Unidade (un)</SelectItem>
                      <SelectItem value="vg">Verba Global (vg)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Descrição do Serviço / Artigo</Label>
                <Input 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)} 
                  placeholder="Ex: Fornecimento e Aplicação de Betão Armado C25/30" 
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs">Preço Unitário Base (Kwanzas - AOA)</Label>
                <div className="relative mt-1">
                  <Coins className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="number"
                    value={newPrice} 
                    onChange={e => setNewPrice(e.target.value)} 
                    placeholder="Ex: 215000" 
                    className="pl-9 text-sm font-semibold font-mono"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Sensibilidade a Insumos Críticos (%):
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <Label className="text-[10px]">Cimento (%)</Label>
                    <Input 
                      type="number" 
                      value={newCementShare} 
                      onChange={e => setNewCementShare(e.target.value)} 
                      className="mt-0.5 text-xs font-mono h-7"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Gasóleo (%)</Label>
                    <Input 
                      type="number" 
                      value={newDieselShare} 
                      onChange={e => setNewDieselShare(e.target.value)} 
                      className="mt-0.5 text-xs font-mono h-7"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Mão de Obra (%)</Label>
                    <Input 
                      type="number" 
                      value={newLaborShare} 
                      onChange={e => setNewLaborShare(e.target.value)} 
                      className="mt-0.5 text-xs font-mono h-7"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCpuOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isSubmittingCpu} className="bg-primary text-primary-foreground font-semibold">
                {isSubmittingCpu ? 'A Gravar...' : 'Gravar CPU'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
