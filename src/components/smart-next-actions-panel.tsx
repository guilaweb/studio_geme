'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  CheckCircle2, 
  ClipboardList, 
  BookOpen, 
  Clock, 
  Coins, 
  AlertCircle,
  Sparkles,
  Play
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/project';

export interface ActionItem {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  category: 'measurement' | 'daily_log' | 'schedule' | 'finance' | 'general';
  text: string;
  projectName: string;
  projectId: string;
  href: string;
  actionCode?: string;
  actionLabel?: string;
}

interface SmartNextActionsPanelProps {
  projects: Project[];
  myTasks: Array<{
    id: string;
    text: string;
    projectId: string;
    projectName: string;
    priority: string;
  }>;
  className?: string;
  onRunAction?: (actionCode: string, projectId: string) => void;
}

const TYPE_CONFIG = {
  urgent: { dot: 'bg-red-500', badgeClass: 'border-red-200 text-red-700 bg-red-50 dark:bg-red-950/40' },
  warning: { dot: 'bg-amber-500', badgeClass: 'border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/40' },
  info: { dot: 'bg-blue-500', badgeClass: 'border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950/40' },
  success: { dot: 'bg-emerald-500', badgeClass: 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40' }
};

function buildActions(
  projects: Project[],
  myTasks: SmartNextActionsPanelProps['myTasks']
): ActionItem[] {
  const items: ActionItem[] = [];

  // 1. Tarefas explícitas urgentes
  for (const task of myTasks) {
    if (task.priority === 'Alta') {
      items.push({
        id: `task-urgent-${task.id}`,
        type: 'urgent',
        category: 'general',
        text: task.text,
        projectName: task.projectName,
        projectId: task.projectId,
        href: `/projects/${task.projectId}`,
        actionLabel: 'Resolver'
      });
    }
  }

  // 2. Projetos em execução: orientar ações imediatas (Medição, Diário de Obra, Atrasos)
  const activeProjects = projects.filter(p => p.status === 'Em Execução' || p.status === 'Planeamento');

  for (const p of activeProjects.slice(0, 3)) {
    // Ação: Registar Medição
    items.push({
      id: `measure-${p.id}`,
      type: 'info',
      category: 'measurement',
      text: `Registar medição da produção de "${p.name}"`,
      projectName: p.name,
      projectId: p.id,
      href: `/projects/${p.id}?tab=measurement-certificates`,
      actionCode: 'open_measurement_wizard',
      actionLabel: 'Medir'
    });

    // Ação: Atualizar Diário de Obra
    items.push({
      id: `daily-${p.id}`,
      type: 'info',
      category: 'daily_log',
      text: `Atualizar diário de obra e condições climáticas`,
      projectName: p.name,
      projectId: p.id,
      href: `/projects/${p.id}?tab=daily-report`,
      actionCode: 'open_daily_report',
      actionLabel: 'Preencher'
    });

    // Ação: Se progresso for baixo ou início recente
    if ((p.progress || 0) < 10) {
      items.push({
        id: `finance-${p.id}`,
        type: 'warning',
        category: 'finance',
        text: `Validar orçamento inicial e requisições de compra`,
        projectName: p.name,
        projectId: p.id,
        href: `/projects/${p.id}?tab=finance`,
        actionLabel: 'Aprovar'
      });
    } else if ((p.progress || 0) > 85) {
      items.push({
        id: `close-${p.id}`,
        type: 'warning',
        category: 'general',
        text: `Preparar auto de receção provisória e vistoria final`,
        projectName: p.name,
        projectId: p.id,
        href: `/projects/${p.id}?tab=post-construction`,
        actionLabel: 'Concluir'
      });
    }
  }

  // Se ainda estiver com poucos itens, adicionar tarefas normais
  for (const task of myTasks) {
    if (task.priority !== 'Alta' && items.length < 5) {
      items.push({
        id: `task-warning-${task.id}`,
        type: 'warning',
        category: 'general',
        text: task.text,
        projectName: task.projectName,
        projectId: task.projectId,
        href: `/projects/${task.projectId}`,
        actionLabel: 'Ver'
      });
    }
  }

  return items;
}

export function SmartNextActionsPanel({
  projects,
  myTasks,
  className,
  onRunAction,
}: SmartNextActionsPanelProps) {
  const allActions = buildActions(projects, myTasks);
  const visibleActions = allActions.slice(0, 5);

  const handleActionClick = (action: ActionItem) => {
    if (action.actionCode && onRunAction) {
      onRunAction(action.actionCode, action.projectId);
      return;
    }
    if (action.actionCode && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('profundidade_run_action', { detail: action.actionCode })
      );
    }
  };

  if (visibleActions.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 py-8 text-center bg-card rounded-xl border p-4',
          className
        )}
      >
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        <p className="text-sm font-bold text-foreground">
          Tudo em Dia!
        </p>
        <p className="text-xs text-muted-foreground">
          Sem ações pendentes imediatas para os seus projetos ativos.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col space-y-2', className)}>
      {visibleActions.map((action) => {
        const config = TYPE_CONFIG[action.type];

        return (
          <div
            key={action.id}
            className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors shadow-xs"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Dot de prioridade */}
              <span
                className={cn('h-2.5 w-2.5 rounded-full shrink-0', config.dot)}
                aria-hidden="true"
              />

              {/* Texto descritivo e projeto */}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-foreground truncate leading-snug">
                  {action.text}
                </span>
                <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                  Obra: {action.projectName}
                </span>
              </div>
            </div>

            {/* Botão de ação rápida */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5 gap-1 font-semibold border-primary/30 text-primary hover:bg-primary/10"
                asChild
              >
                <Link href={action.href} onClick={() => handleActionClick(action)}>
                  <span>{action.actionLabel || 'Executar'}</span>
                  <ArrowRight className="h-3 w-3 ml-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
