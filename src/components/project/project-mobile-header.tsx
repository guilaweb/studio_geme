'use client';

import React, { useMemo } from 'react';
import { 
  BarChart3, 
  Clock, 
  Coins, 
  AlertTriangle, 
  Calendar, 
  BookOpen, 
  Ruler, 
  Wallet, 
  Users, 
  FileText, 
  Truck, 
  ShieldAlert, 
  Settings, 
  ChevronRight,
  Sparkles,
  Camera,
  CheckSquare,
  ClipboardCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/project';
import type { WbsItem } from '@/types/wbs';
import { safeParseDate } from '@/lib/date-utils';

interface ProjectMobileHeaderProps {
  project: Project;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  wbsItems?: WbsItem[];
  onOpenQuickFieldAction?: (action: 'photo' | 'daily' | 'measure' | 'incident') => void;
}

export function ProjectMobileHeader({
  project,
  activeTab,
  onTabChange,
  wbsItems = [],
  onOpenQuickFieldAction,
}: ProjectMobileHeaderProps) {
  // 1. Calcular KPIs compactos do projeto
  const progress = Math.round(project.progress || 0);

  const daysRemaining = useMemo(() => {
    if (!project.endDate) return null;
    const end = safeParseDate(project.endDate);
    if (!end || isNaN(end.getTime())) return null;
    const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [project.endDate]);

  const formattedBudget = useMemo(() => {
    const val = project.budget || 0;
    if (val >= 1_000_000_000) {
      return `${(val / 1_000_000_000).toFixed(1).replace('.', ',')} B Kz`;
    }
    if (val >= 1_000_000) {
      return `${(val / 1_000_000).toFixed(1).replace('.', ',')} M Kz`;
    }
    if (val > 0) {
      return `${Math.round(val / 1_000)} k Kz`;
    }
    return '0 Kz';
  }, [project.budget]);

  // Alertas e pendências
  const delayedTasksCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return wbsItems.filter(item => {
      if (!item.endDate || (item.progress ?? 0) >= 100) return false;
      const end = safeParseDate(item.endDate);
      return end && !isNaN(end.getTime()) && end < today;
    }).length;
  }, [wbsItems]);

  // 2. Abas contextuais do projeto organizadas para mobile
  const mobileProjectTabs = [
    { id: 'dashboard', label: 'Visão Geral', icon: BarChart3 },
    { id: 'fiscalizacao', label: 'Fiscalização', icon: ClipboardCheck },
    { id: 'daily-report', label: 'Diário de Obra', icon: BookOpen },
    { id: 'wbs', label: 'Planeamento', icon: Calendar },
    { id: 'measurement-certificates', label: 'Medições', icon: Ruler },
    { id: 'controle-custos', label: 'Custos', icon: Wallet },
    { id: 'equipa', label: 'Equipa', icon: Users },
    { id: 'relatorios-hub', label: 'Relatórios', icon: FileText },
    { id: 'equipment', label: 'Equipamentos', icon: Truck },
    { id: 'riscos', label: 'Riscos', icon: ShieldAlert },
    { id: 'dados-gerais', label: 'Configurar', icon: Settings },
  ];

  return (
    <div className="md:hidden border-b bg-card space-y-3 px-3.5 py-3">
      {/* Nome e Estado do Projeto */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
              {project.type || 'Construção'}
            </Badge>
            <Badge 
              variant="secondary" 
              className={cn(
                'text-[10px] px-1.5 py-0',
                project.status === 'Em Execução' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted'
              )}
            >
              {project.status || 'Em Execução'}
            </Badge>
          </div>
          <h1 className="text-lg font-bold font-headline text-foreground truncate mt-1">
            {project.name}
          </h1>
        </div>
      </div>

      {/* 4 Cartões Compactos de KPIs no Mobile (Section 6) */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        {/* Progresso */}
        <div className="p-2.5 rounded-xl border bg-muted/30 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Progresso</span>
          <div className="mt-0.5">
            <span className="text-xl font-black text-foreground">{progress}%</span>
            <span className="text-[10px] text-primary font-medium block">concluído</span>
          </div>
        </div>

        {/* Prazo */}
        <div className="p-2.5 rounded-xl border bg-muted/30 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Prazo</span>
          <div className="mt-0.5">
            {daysRemaining !== null ? (
              <>
                <span className="text-xl font-black text-foreground">{daysRemaining} dias</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">restantes</span>
              </>
            ) : (
              <>
                <span className="text-base font-bold text-foreground">Sem prazo</span>
                <span className="text-[10px] text-muted-foreground font-medium block">data fim não def.</span>
              </>
            )}
          </div>
        </div>

        {/* Orçamento */}
        <div className="p-2.5 rounded-xl border bg-muted/30 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Orçamento</span>
          <div className="mt-0.5">
            <span className="text-lg font-black text-foreground font-mono">{formattedBudget}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
              {(project.budget || 0) > 0 ? 'planeado' : 'não definido'}
            </span>
          </div>
        </div>

        {/* Alertas */}
        <div className="p-2.5 rounded-xl border bg-muted/30 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Atrasos</span>
          <div className="mt-0.5">
            <span className={cn('text-xl font-black', delayedTasksCount > 0 ? 'text-destructive' : 'text-emerald-600')}>
              {delayedTasksCount}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium block">
              {delayedTasksCount === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}
            </span>
          </div>
        </div>
      </div>

      {/* Ações Rápidas de Campo para o Trabalhador no Smartphone */}
      <div className="flex items-center gap-2 pt-1 overflow-x-auto touch-scroll-horizontal pb-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (onOpenQuickFieldAction) onOpenQuickFieldAction('daily');
            else onTabChange('daily-report');
          }}
          className="gap-1.5 text-xs h-8 px-2.5 shrink-0 bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 font-medium touch-target-44"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Registar Diário</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (onOpenQuickFieldAction) onOpenQuickFieldAction('measure');
            else onTabChange('measurement-certificates');
          }}
          className="gap-1.5 text-xs h-8 px-2.5 shrink-0 bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 font-medium touch-target-44"
        >
          <Ruler className="h-3.5 w-3.5" />
          <span>Fazer Medição</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (onOpenQuickFieldAction) onOpenQuickFieldAction('incident');
            else onTabChange('riscos');
          }}
          className="gap-1.5 text-xs h-8 px-2.5 shrink-0 bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 font-medium touch-target-44"
        >
          <Camera className="h-3.5 w-3.5" />
          <span>Foto / Ocorrência</span>
        </Button>
      </div>

      {/* Seletor Deslizante Horizontal de Eixos / Abas do Projeto */}
      <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll-horizontal pt-1 pb-0.5 border-t">
        {mobileProjectTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all touch-target-44 active:scale-95',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
