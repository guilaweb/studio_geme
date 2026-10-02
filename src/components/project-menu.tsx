'use client';

import React, { useMemo } from 'react';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  GanttChart,
  Target,
  Calendar,
  AlertTriangle,
  FileText,
  Map,
  TrendingUp,
  ShieldAlert,
  HeartPulse,
  Users2,
  Settings,
  Wallet,
  ShoppingCart,
  Menu,
  Truck,
  ClipboardList,
  FileSignature,
  SlidersHorizontal,
  ChevronDown,
  Building,
  CheckCircle2,
  Sparkles,
  Archive,
  Layers,
  Diamond,
  Zap,
  ClipboardCheck,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import type { UserRole } from '@/app/projects/[id]/page';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/project';
import { useExperienceMode } from '@/hooks/use-experience-mode';

interface ProjectMenuProps {
  onMenuSelect: (tab: string) => void;
  activeTab?: string;
  userRole?: UserRole | null;
  projectType?: Project['type'];
}

interface MenuItemDef {
  id: string;
  label: string;
  icon: React.ElementType;
  description?: string;
  advancedOnly?: boolean;
}

interface StageMenuDef {
  id: string;
  label: string;
  stepNumber: string;
  color: string;
  icon: React.ElementType;
  defaultTab: string;
  items: MenuItemDef[];
}

export function ProjectMenu({
  onMenuSelect,
  activeTab = 'dashboard',
  userRole,
  projectType,
}: ProjectMenuProps) {
  const isMobile = useIsMobile();
  const { isBasic, isAdvanced } = useExperienceMode();

  // Os 6 Eixos Sequenciais do Fluxo Principal de Obra em Angola
  const stageMenus: StageMenuDef[] = useMemo(() => {
    return [
      {
        id: 'configurar',
        stepNumber: '1',
        label: 'Configurar',
        color: 'text-blue-500',
        icon: LayoutDashboard,
        defaultTab: 'dashboard',
        items: [
          { id: 'dashboard', label: 'Centro de Comando', icon: LayoutDashboard, description: 'Visão geral da obra e indicadores' },
          { id: 'dados-gerais', label: 'Dados Gerais & Contrato', icon: FileText, description: 'Escopo, cliente e prazos' },
          { id: 'team', label: 'Equipa & Responsáveis', icon: Users2, description: 'Diretor, fiscal e mestres' },
          { id: 'settings', label: 'Definições do Projeto', icon: Settings, description: 'Parâmetros e moedas' },
        ],
      },
      {
        id: 'planear',
        stepNumber: '2',
        label: 'Planear',
        color: 'text-indigo-500',
        icon: GanttChart,
        defaultTab: 'wbs',
        items: [
          { id: 'wbs', label: 'EAP / Atividades', icon: GanttChart, description: 'Divisão de serviços e quantidades' },
          { id: 'cronograma', label: 'Cronograma & Prazos', icon: Calendar, description: 'Linha de base e datas' },
          { id: 'workforce', label: 'Mão de Obra', icon: Users2, description: 'Efetivo e encarregados' },
          { id: 'equipment', label: 'Equipamentos & Máquinas', icon: Truck, description: 'Frota alocada ao estaleiro' },
          { id: 'requirements', label: 'Requisitos Técnicos', icon: Target, description: 'Caderno de encargos', advancedOnly: true },
        ],
      },
      {
        id: 'executar',
        stepNumber: '3',
        label: 'Executar',
        color: 'text-amber-500',
        icon: ClipboardList,
        defaultTab: 'daily-reports',
        items: [
          { id: 'daily-reports', label: 'Diário de Obra (RDO)', icon: Calendar, description: 'Apontamento diário e fotos' },
          { id: 'daily-dashboard', label: 'Painel Diário de Campo', icon: ClipboardList, description: 'Presenças e frente de serviço' },
          { id: 'materials-control', label: 'Controlo de Materiais', icon: Layers, description: 'Consumo real vs previsto' },
          { id: 'compras', label: 'Compras & Stocks', icon: ShoppingCart, description: 'Requisições de cimento, aço, etc.' },
        ],
      },
      {
        id: 'fiscalizar',
        stepNumber: '4',
        label: 'Fiscalizar',
        color: 'text-rose-500',
        icon: ClipboardCheck,
        defaultTab: 'fiscalizacao',
        items: [
          { id: 'fiscalizacao', label: 'Fiscalização Técnica', icon: ClipboardCheck, description: 'Livro de Obra e Pontos H/W/R' },
          { id: 'pendencias', label: 'Não Conformidades (NCR)', icon: AlertTriangle, description: 'Registo e ações corretivas' },
          { id: 'quality-plan', label: 'Plano de Qualidade', icon: Target, description: 'Inspeções e ensaios' },
          { id: 'concrete-pour', label: 'Betonagens & Ensaios', icon: Building, description: 'Controlo de slumps e cubos' },
          { id: 'reinforcement-inspection', label: 'Armaduras & Aço', icon: CheckCircle2, description: 'Vistorias pré-betonagem' },
          { id: 'formwork-control', label: 'Encofragens & Cofragens', icon: Layers, description: 'Liberações de forma' },
        ],
      },
      {
        id: 'controlar',
        stepNumber: '5',
        label: 'Controlar',
        color: 'text-emerald-500',
        icon: FileSignature,
        defaultTab: 'measurement-certificates',
        items: [
          { id: 'measurement-certificates', label: 'Autos de Medição', icon: FileSignature, description: 'Folhas de medição oficiais' },
          { id: 'controle-custos', label: 'Gestão de Custos & EAC', icon: TrendingUp, description: 'Desvios orçamentais' },
          { id: 'finance', label: 'Financeiro & Pagamentos', icon: Wallet, description: 'Faturas e fluxo de caixa' },
          { id: 'subcontractor-management', label: 'Subempreiteiros', icon: Building, description: 'Contratos e medições de terceiros' },
        ],
      },
      {
        id: 'reportar',
        stepNumber: '6',
        label: 'Reportar',
        color: 'text-purple-500',
        icon: FileText,
        defaultTab: 'relatorios',
        items: [
          { id: 'relatorios', label: 'Centro de Relatórios', icon: FileText, description: 'Dossiês executivos em PDF' },
          { id: 'encerramento', label: 'Encerramento de Obra', icon: Archive, description: 'Receção provisória e fecho' },
          { id: 'post-construction', label: 'Pós-Construção & Telas', icon: CheckCircle2, description: 'Garantias e telas finais' },
        ],
      },
    ];
  }, []);

  // Módulo Avançado (riscos, hseq, bim, motores)
  const advancedMenuItems: MenuItemDef[] = useMemo(() => {
    return [
      { id: 'engineering', label: 'Modelos BIM / IFC 3D', icon: Map, description: 'Visualizador técnico' },
      { id: 'risks', label: 'Matriz de Riscos 5x5', icon: ShieldAlert, description: 'Mitigação e probabilidade' },
      { id: 'hseq', label: 'HSEQ (Segurança e Qualidade)', icon: HeartPulse, description: 'Auditorias e incidentes' },
      { id: 'motores-operacionais', label: 'Motores de Decisão (IA)', icon: Sparkles, description: 'Previsão de desvio e cenários' },
    ];
  }, []);

  // Determinar qual estágio está ativo com base na tab atual
  const activeStageId = useMemo(() => {
    for (const stage of stageMenus) {
      if (stage.items.some((i) => i.id === activeTab)) {
        return stage.id;
      }
    }
    return 'configurar';
  }, [stageMenus, activeTab]);

  // Se for versão móvel
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs font-semibold">
            <Menu className="h-4 w-4" />
            <span>Navegação do Projeto</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
          <SheetHeader className="text-left pb-3 border-b">
            <SheetTitle className="text-base font-bold">Fluxo Principal da Obra</SheetTitle>
            <SheetDescription className="text-xs">
              Condução sequencial: de Configurar até Reportar
            </SheetDescription>
          </SheetHeader>

          <Accordion type="single" collapsible defaultValue={activeStageId} className="w-full mt-3">
            {stageMenus.map((stage) => {
              const StageIcon = stage.icon;
              return (
                <AccordionItem value={stage.id} key={stage.id}>
                  <AccordionTrigger className="py-2.5 text-xs font-bold hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span className={cn('h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-muted', stage.color)}>
                        {stage.stepNumber}
                      </span>
                      <span>{stage.label}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 pb-2 space-y-1">
                    {stage.items
                      .filter((item) => (!isBasic || !item.advancedOnly))
                      .map((item) => {
                        const Icon = item.icon;
                        const isCurrent = activeTab === item.id;
                        return (
                          <SheetClose asChild key={item.id}>
                            <Button
                              variant={isCurrent ? 'secondary' : 'ghost'}
                              size="sm"
                              className={cn(
                                'w-full justify-start text-xs h-8 font-medium',
                                isCurrent && 'font-bold bg-accent'
                              )}
                              onClick={() => onMenuSelect(item.id)}
                            >
                              <Icon className={cn('mr-2 h-3.5 w-3.5', stage.color)} />
                              <span>{item.label}</span>
                            </Button>
                          </SheetClose>
                        );
                      })}
                  </AccordionContent>
                </AccordionItem>
              );
            })}

            {!isBasic && (
              <AccordionItem value="avancado">
                <AccordionTrigger className="py-2.5 text-xs font-bold hover:no-underline text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Ferramentas Avançadas</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-2 space-y-1">
                  {advancedMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isCurrent = activeTab === item.id;
                    return (
                      <SheetClose asChild key={item.id}>
                        <Button
                          variant={isCurrent ? 'secondary' : 'ghost'}
                          size="sm"
                          className={cn('w-full justify-start text-xs h-8', isCurrent && 'font-bold bg-accent')}
                          onClick={() => onMenuSelect(item.id)}
                        >
                          <Icon className="mr-2 h-3.5 w-3.5 text-slate-500" />
                          <span>{item.label}</span>
                        </Button>
                      </SheetClose>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </SheetContent>
      </Sheet>
    );
  }

  // DESKTOP: Menubar linear limpo, organizado pelos 5 passos
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-hide">
      <Menubar className="border-none bg-transparent p-0 h-auto gap-0.5 shadow-none">
        {stageMenus.map((stage) => {
          const isStageActive = activeStageId === stage.id;
          const StageIcon = stage.icon;

          // Se for Modo Básico: 1 decisão por vez (clique direto leva para a tela principal daquela etapa)
          if (isBasic) {
            return (
              <Button
                key={stage.id}
                variant={isStageActive ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onMenuSelect(stage.defaultTab)}
                className={cn(
                  'h-7 px-2.5 text-xs font-semibold gap-1.5 rounded-lg transition-all',
                  isStageActive && 'bg-primary/10 text-primary font-bold shadow-xs'
                )}
              >
                <span className={cn('h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold bg-muted', stage.color)}>
                  {stage.stepNumber}
                </span>
                <span>{stage.label}</span>
              </Button>
            );
          }

          // Modo Profissional & Avançado: Dropdown agrupado limpo
          return (
            <MenubarMenu key={stage.id}>
              <MenubarTrigger
                className={cn(
                  'h-7 px-2.5 text-xs font-semibold gap-1.5 rounded-lg cursor-pointer transition-all data-[state=open]:bg-accent',
                  isStageActive && 'bg-primary/10 text-primary font-bold'
                )}
              >
                <span className={cn('h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold bg-muted shrink-0', stage.color)}>
                  {stage.stepNumber}
                </span>
                <span>{stage.label}</span>
                <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
              </MenubarTrigger>

              <MenubarContent align="start" className="w-56 p-1.5 shadow-xl rounded-xl border bg-popover/95 backdrop-blur-md">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b mb-1">
                  Etapa {stage.stepNumber}: {stage.label}
                </div>
                {stage.items
                  .filter((item) => (!isBasic || !item.advancedOnly))
                  .map((item) => {
                    const Icon = item.icon;
                    const isCurrent = activeTab === item.id;
                    return (
                      <MenubarItem
                        key={item.id}
                        onClick={() => onMenuSelect(item.id)}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-colors',
                          isCurrent && 'bg-accent font-bold text-primary'
                        )}
                      >
                        <Icon className={cn('h-3.5 w-3.5 shrink-0', stage.color)} />
                        <div className="flex flex-col">
                          <span>{item.label}</span>
                          {item.description && (
                            <span className="text-[10px] text-muted-foreground font-normal">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </MenubarItem>
                    );
                  })}
              </MenubarContent>
            </MenubarMenu>
          );
        })}

        {/* Menu "⚙️ Avançado" apenas visível quando em modo Avançado */}
        {isAdvanced && (
          <MenubarMenu>
            <MenubarTrigger className="h-7 px-2 text-xs font-semibold gap-1 text-muted-foreground rounded-lg cursor-pointer data-[state=open]:bg-accent">
              <SlidersHorizontal className="h-3 w-3" />
              <span>Avançado</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </MenubarTrigger>
            <MenubarContent align="start" className="w-56 p-1.5 shadow-xl rounded-xl border bg-popover/95 backdrop-blur-md">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b mb-1">
                Especialista & BIM
              </div>
              {advancedMenuItems.map((item) => {
                const Icon = item.icon;
                const isCurrent = activeTab === item.id;
                return (
                  <MenubarItem
                    key={item.id}
                    onClick={() => onMenuSelect(item.id)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs',
                      isCurrent && 'bg-accent font-bold text-primary'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {item.description}
                      </span>
                    </div>
                  </MenubarItem>
                );
              })}
            </MenubarContent>
          </MenubarMenu>
        )}
      </Menubar>
    </div>
  );
}
