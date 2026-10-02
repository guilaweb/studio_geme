'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HardHat,
  Users,
  Coins,
  FileSignature,
  Layers,
  ChevronRight,
} from 'lucide-react';
import type { Project } from '@/types/project';
import type { WbsItem } from '@/types/wbs';

interface ProjectMultiLevelPlanningProps {
  projectId: string;
  project: Project;
  wbsItems: WbsItem[];
  onNavigateTab?: (tab: string) => void;
}

export function ProjectMultiLevelPlanning({
  projectId,
  project,
  wbsItems,
  onNavigateTab,
}: ProjectMultiLevelPlanningProps) {
  const [activeLevel, setActiveLevel] = useState<'annual' | 'monthly' | 'weekly' | 'daily'>('weekly');

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header com o Pipeline Conceitual: Planeamento -> Execução -> Medição -> Custo */}
      <div className="bg-card border p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                <TrendingUp className="h-3.5 w-3.5 mr-1" /> PLANEAMENTO MULTI-NÍVEL
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Lookahead & Produção
              </Badge>
            </div>
            <h2 className="text-xl font-bold font-headline mt-1">Estratificação Operacional do Tempo</h2>
            <p className="text-xs text-muted-foreground">
              Da visão estratégica plurianual ao apontamento de tarefas diárias das equipas de estaleiro.
            </p>
          </div>

          {/* O Pipeline de Engenharia */}
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-muted/40 border font-mono text-xs">
            <span className="font-bold text-indigo-500">Planeamento</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-bold text-orange-500">Execução</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-bold text-emerald-500">Medição</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-bold text-amber-500">Custo</span>
          </div>
        </div>

        {/* Abas dos 4 Níveis de Planeamento */}
        <Tabs value={activeLevel} onValueChange={(val: any) => setActiveLevel(val)} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-muted/50 rounded-xl">
            <TabsTrigger value="annual" className="py-2 text-xs font-semibold data-[state=active]:bg-card">
              📅 1. Anual (Fases & Marcos)
            </TabsTrigger>
            <TabsTrigger value="monthly" className="py-2 text-xs font-semibold data-[state=active]:bg-card">
              🗓️ 2. Mensal (Metas & Recursos)
            </TabsTrigger>
            <TabsTrigger value="weekly" className="py-2 text-xs font-semibold data-[state=active]:bg-card">
              📋 3. Semanal (Lookahead Equipas)
            </TabsTrigger>
            <TabsTrigger value="daily" className="py-2 text-xs font-semibold data-[state=active]:bg-card">
              🚜 4. Diário (Execução & RDO)
            </TabsTrigger>
          </TabsList>

          {/* 1. Nível Anual */}
          <TabsContent value="annual" className="mt-4 space-y-4">
            <Card className="border shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold font-headline">Planeamento Anual: Grandes Fases e Marcos Contratuais</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Alinhamento com o dono da obra e cronograma físico-financeiro contratual.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">Horizonte: 12 - 36 Meses</Badge>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mt-4">
                <div className="p-4 rounded-xl bg-background border space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Fase 1: Infraestrutura</span>
                  <div className="text-sm font-bold text-foreground">Fundações & Contenções</div>
                  <div className="text-xs text-muted-foreground">Meta: Conclusão até 30 de Junho</div>
                  <Badge variant="secondary" className="text-[10px]">Em Andamento</Badge>
                </div>

                <div className="p-4 rounded-xl bg-background border space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Fase 2: Superestrutura</span>
                  <div className="text-sm font-bold text-foreground">Pilares, Lajes e Alvenarias</div>
                  <div className="text-xs text-muted-foreground">Meta: Conclusão até 30 de Outubro</div>
                  <Badge variant="outline" className="text-[10px]">Planeado</Badge>
                </div>

                <div className="p-4 rounded-xl bg-background border space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Fase 3: Acabamentos</span>
                  <div className="text-sm font-bold text-foreground">Instalações, Pinturas e Entrega</div>
                  <div className="text-xs text-muted-foreground">Meta: Conclusão até 20 de Dezembro</div>
                  <Badge variant="outline" className="text-[10px]">Futuro</Badge>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* 2. Nível Mensal */}
          <TabsContent value="monthly" className="mt-4 space-y-4">
            <Card className="border shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold font-headline">Planeamento Mensal: Produção Físico-Financeira e Recursos</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dimensionamento de consumo de brita, cimento, gasóleo e requisições de compras para o mês.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">Horizonte: 30 Dias</Badge>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-xl bg-background border space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>Meta de Produção Físico do Mês</span>
                    <span className="text-primary font-mono">+12.5%</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Betonagem de laje piso 3: 420 m³</div>
                    <div>• Alvenaria de elevação: 1.800 m²</div>
                    <div>• Escavação de valas de drenagem: 650 ml</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-background border space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>Recursos & Suprimentos Alocados</span>
                    <span className="text-amber-500 font-mono">24.500.000 Kz</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Cimento CP-IV: 3.200 sacos</div>
                    <div>• Gasóleo para frotas: 8.500 Litros</div>
                    <div>• Efetivo médio mobilizado: 45 operários</div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* 3. Nível Semanal (Lookahead) */}
          <TabsContent value="weekly" className="mt-4 space-y-4">
            <Card className="border shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold font-headline">Planeamento Semanal: Lookahead e Atividades de Equipa</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Programação das frentes de serviço para os próximos 7 dias e remoção de restrições operacionais.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">Horizonte: 7 Dias</Badge>
              </div>

              <div className="space-y-2 mt-4">
                {wbsItems.slice(0, 4).map((item, idx) => (
                  <div key={item.id || idx} className="p-3 rounded-xl bg-background border flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-foreground flex items-center gap-2">
                        <span className="font-mono text-muted-foreground">{item.code || `Atividade #${idx + 1}`}</span>
                        <span>{item.name}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Responsável: {item.assignedToName || 'Encarregado Geral'} • Unidade: {item.unit || 'm²'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono">
                        <div className="font-bold text-foreground">{item.progress || 0}%</div>
                        <div className="text-[10px] text-muted-foreground">Executado</div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Em Frente</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* 4. Nível Diário */}
          <TabsContent value="daily" className="mt-4 space-y-4">
            <Card className="border shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold font-headline">Planeamento Diário: Execução de Campo & Diário de Obra (RDO)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Apontamento detalhado no estaleiro via aplicativo offline com fotos geolocalizadas.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">Horizonte: Diário (24h)</Badge>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border space-y-3 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <HardHat className="h-4 w-4 text-orange-500" /> RDO de Hoje • Frentes Operacionais
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateTab && onNavigateTab('daily-reports')}
                    className="text-xs h-7 gap-1"
                  >
                    Abrir Diário de Obras <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O apontamento das tarefas executadas hoje alimenta automaticamente o cálculo de progresso físico ponderado e a esteira de custos da EAP.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
