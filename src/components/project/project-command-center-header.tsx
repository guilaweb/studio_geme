'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { WbsItem } from '@/types/wbs';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  Activity,
} from 'lucide-react';
import type { Project, ProjectLifecycleStage } from '@/types/project';
import { ProjectLifecycleModal, LIFECYCLE_STAGES } from './project-lifecycle-modal';
import { useExperienceMode } from '@/hooks/use-experience-mode';
import { safeParseDate } from '@/lib/date-utils';

interface ProjectCommandCenterHeaderProps {
  project: Project;
  projectId: string;
  onNavigateTab: (tab: string) => void;
  activeTab?: string;
  physicalProgress?: number;
  financialProgress?: number;
  spi?: number;
  cpi?: number;
  daysRemaining?: number;
  wbsItems?: WbsItem[];
}

export function ProjectCommandCenterHeader({
  project,
  projectId,
  onNavigateTab,
  activeTab = 'dashboard',
  physicalProgress = 0,
  financialProgress = 0,
  spi = 1.0,
  cpi = 1.0,
  daysRemaining = 0,
  wbsItems = [],
}: ProjectCommandCenterHeaderProps) {
  const [lifecycleModalOpen, setLifecycleModalOpen] = useState(false);
  const { isBasic, isAdvanced } = useExperienceMode();
  
  const currentStageId = (project.lifecycleStage as ProjectLifecycleStage) || 'planning';
  const currentStageIndex = LIFECYCLE_STAGES.findIndex((s) => s.id === currentStageId);

  // Próximas Ações essenciais derivadas do cronograma
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  type ActionItem = { label: string; variant: 'delayed' | 'at-risk' };
  const urgentActions: ActionItem[] = [];

  for (const item of wbsItems) {
    if (urgentActions.length >= 3) break;
    if (!item.endDate || (item.progress ?? 0) >= 100) continue;
    const end = safeParseDate(item.endDate);
    if (!end || isNaN(end.getTime())) continue;
    if (end < today) {
      urgentActions.push({ label: `Atrasada: ${item.name}`, variant: 'delayed' });
    } else if (end <= sevenDaysFromNow && (item.progress ?? 0) < 80) {
      urgentActions.push({ label: `Atenção: ${item.name}`, variant: 'at-risk' });
    }
  }

  return (
    <div className="border-b bg-gradient-to-r from-card via-card/90 to-muted/20 px-3 sm:px-4 py-2 space-y-2">
      {/* Linha do Ciclo de Vida: 6 Estágios Conduzidos */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
            Fase Atual:
          </span>
          {LIFECYCLE_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <React.Fragment key={stage.id}>
                <button
                  type="button"
                  onClick={() => setLifecycleModalOpen(true)}
                  className={`px-2 py-0.5 sm:py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/30'
                      : isCompleted
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-border/50'
                  }`}
                  title={`Fase: ${stage.label} - Clique para alterar`}
                >
                  {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                  {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse shrink-0" />}
                  <span>{stage.label}</span>
                </button>
                {idx < LIFECYCLE_STAGES.length - 1 && (
                  <span className="text-muted-foreground/30 text-xs hidden md:inline">➔</span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Indicadores Essenciais e Botão de Gestão */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end text-xs">
          {/* Em modo básico: indicadores simples em português. Em modo avançado: IDP / IDC */}
          {isBasic ? (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                spi >= 1.0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200'
              }`}>
                {spi >= 1.0 ? '🟢 No Prazo' : '🟡 Atenção ao Prazo'}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                cpi >= 1.0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200'
              }`}>
                {cpi >= 1.0 ? '🟢 No Orçamento' : '🔴 Custo Elevado'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${
                        spi >= 1.0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      }`}
                    >
                      IDP: {spi.toFixed(2)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Índice de Desempenho de Prazo: &gt;1.0 = adiantado, &lt;1.0 = atrasado</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${
                        cpi >= 1.0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                      }`}
                    >
                      IDC: {cpi.toFixed(2)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Índice de Desempenho de Custo: &gt;1.0 = abaixo do orçamento, &lt;1.0 = desvio de custo</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Resumo de Progresso Rápido */}
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground border-l pl-2.5">
            <span>Físico: <strong className="text-foreground font-mono">{Math.round(physicalProgress)}%</strong></span>
            <span>Financeiro: <strong className="text-foreground font-mono">{Math.round(financialProgress)}%</strong></span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLifecycleModalOpen(true)}
            className="h-6 text-[11px] font-semibold text-primary hover:bg-primary/10 px-1.5"
          >
            Avançar Fase <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Strip de Ações Imediatas (quando existirem tarefas atrasadas ou em risco) */}
      {urgentActions.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide pt-0.5 border-t border-border/30">
          <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider shrink-0">
            Atenção imediata:
          </span>
          {urgentActions.map((action, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border shrink-0 ${
                action.variant === 'delayed'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  action.variant === 'delayed' ? 'bg-red-500' : 'bg-amber-500'
                }`}
              />
              <span className="max-w-[200px] truncate">{action.label}</span>
            </span>
          ))}
        </div>
      )}

      {/* Modal de Ciclo de Vida */}
      <ProjectLifecycleModal
        open={lifecycleModalOpen}
        onOpenChange={setLifecycleModalOpen}
        project={project}
        projectId={projectId}
      />
    </div>
  );
}
