'use client';

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { WbsItem } from '@/types/wbs';
import { differenceInDays, isSameDay, isWithinInterval, startOfDay } from 'date-fns';
import { TrendingUp, Activity, ChevronUp, ChevronDown, Layers, BarChart2 } from 'lucide-react';

interface GanttSCurvePanelProps {
  tasks: WbsItem[];
  dateRange: Date[];
  dayWidth: number;
  open: boolean;
  onToggle: () => void;
}

export function GanttSCurvePanel({
  tasks,
  dateRange,
  dayWidth,
  open,
  onToggle,
}: GanttSCurvePanelProps) {
  const PANEL_HEIGHT = 130;
  const GRAPH_HEIGHT = 90;

  // Cálculo dia a dia da Curva S Planeada e do Histograma de Frentes Ativas
  const dailyMetrics = useMemo(() => {
    if (tasks.length === 0 || dateRange.length === 0) return [];

    const totalWeight = tasks.reduce((sum, t) => sum + (t.weight || 5), 0) || 100;

    return dateRange.map((day) => {
      const currentDay = startOfDay(day);
      let dayActiveCount = 0;
      let dayAccumulatedProgress = 0;

      tasks.forEach((task) => {
        if (!task.startDate || !task.endDate) return;

        const taskStart = startOfDay(task.startDate instanceof Date ? task.startDate : (task.startDate as any).toDate());
        const taskEnd = startOfDay(task.endDate instanceof Date ? task.endDate : (task.endDate as any).toDate());
        const taskWeight = task.weight || 5;

        const taskDuration = Math.max(1, differenceInDays(taskEnd, taskStart) + 1);

        if (currentDay >= taskStart && currentDay <= taskEnd) {
          dayActiveCount += 1;
        }

        if (currentDay >= taskEnd) {
          // Tarefa já totalmente concluída no plano
          dayAccumulatedProgress += (taskWeight / totalWeight) * 100;
        } else if (currentDay >= taskStart && currentDay < taskEnd) {
          // Em andamento no plano
          const daysElapsed = differenceInDays(currentDay, taskStart) + 1;
          const taskFraction = Math.min(1, Math.max(0, daysElapsed / taskDuration));
          dayAccumulatedProgress += (taskWeight / totalWeight) * 100 * taskFraction;
        }
      });

      return {
        day,
        activeTasks: dayActiveCount,
        progressPercent: Math.min(100, Math.round(dayAccumulatedProgress * 10) / 10),
      };
    });
  }, [tasks, dateRange]);

  const maxActiveTasks = useMemo(() => {
    if (dailyMetrics.length === 0) return 1;
    return Math.max(1, ...dailyMetrics.map((m) => m.activeTasks));
  }, [dailyMetrics]);

  // Caminho SVG para a Curva S
  const sCurveSvgPath = useMemo(() => {
    if (dailyMetrics.length === 0) return '';

    return dailyMetrics
      .map((metric, i) => {
        const x = i * dayWidth + dayWidth / 2;
        // Y inverte (0% no fundo GRAPH_HEIGHT, 100% no topo 0)
        const y = GRAPH_HEIGHT - (metric.progressPercent / 100) * GRAPH_HEIGHT;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [dailyMetrics, dayWidth, GRAPH_HEIGHT]);

  const totalWidth = dateRange.length * dayWidth;

  return (
    <div className="border-t bg-card/95 backdrop-blur shadow-md">
      {/* Barra de Controle / Header do Painel */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/40 text-xs">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggle}
            className="h-6 px-1.5 text-xs font-bold text-foreground flex items-center gap-1 hover:bg-muted"
          >
            {open ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronUp className="h-4 w-4 text-primary" />}
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Painel de Curva S & Histograma de Frentes
            </span>
          </Button>

          {open && (
            <div className="hidden sm:flex items-center gap-4 text-[11px] text-muted-foreground font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span>Curva S Físico-Temporal (% Acumulado)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2 rounded-xs bg-blue-500/40 border border-blue-500" />
                <span>Histograma de Atividades Simultâneas (Pico: {maxActiveTasks})</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] h-4 font-mono">
            Sincronizado ao Calendário
          </Badge>
        </div>
      </div>

      {/* Conteúdo Expansível Alinhado ao Grid Temporal */}
      {open && (
        <div className="overflow-x-hidden relative" style={{ height: PANEL_HEIGHT }}>
          <div className="relative" style={{ width: totalWidth, height: PANEL_HEIGHT }}>
            {/* Linhas de Grade de Fundo (25%, 50%, 75%, 100%) */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute w-full border-b border-muted-foreground/10" style={{ top: 0 }} />
              <div className="absolute w-full border-b border-muted-foreground/10" style={{ top: GRAPH_HEIGHT * 0.25 }}>
                <span className="text-[9px] font-mono text-muted-foreground/60 pl-2">75%</span>
              </div>
              <div className="absolute w-full border-b border-muted-foreground/10" style={{ top: GRAPH_HEIGHT * 0.5 }}>
                <span className="text-[9px] font-mono text-muted-foreground/60 pl-2">50%</span>
              </div>
              <div className="absolute w-full border-b border-muted-foreground/10" style={{ top: GRAPH_HEIGHT * 0.75 }}>
                <span className="text-[9px] font-mono text-muted-foreground/60 pl-2">25%</span>
              </div>
              <div className="absolute w-full border-b border-muted-foreground/20" style={{ top: GRAPH_HEIGHT }}>
                <span className="text-[9px] font-mono text-muted-foreground/60 pl-2">0%</span>
              </div>
            </div>

            {/* BARRAS DO HISTOGRAMA (Frentes Simultâneas) */}
            {dailyMetrics.map((metric, idx) => {
              const barHeight = (metric.activeTasks / maxActiveTasks) * (GRAPH_HEIGHT * 0.85);
              const barX = idx * dayWidth + 1;
              const barY = GRAPH_HEIGHT - barHeight;

              return (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    left: barX,
                    top: barY,
                    width: Math.max(2, dayWidth - 2),
                    height: barHeight,
                  }}
                  className="bg-blue-500/25 border-t border-x border-blue-500/50 rounded-t-xs hover:bg-blue-500/50 transition-colors pointer-events-auto"
                  title={`${metric.activeTasks} tarefa(s) simultânea(s) | Avanço: ${metric.progressPercent}%`}
                />
              );
            })}

            {/* CURVA S SVG TRAÇADA */}
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              style={{ width: totalWidth, height: GRAPH_HEIGHT }}
            >
              {sCurveSvgPath && (
                <>
                  {/* Linha da Curva S */}
                  <path
                    d={sCurveSvgPath}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Pontos chave na Curva */}
                  {dailyMetrics
                    .filter((_, i) => i % Math.max(1, Math.floor(dailyMetrics.length / 15)) === 0)
                    .map((metric, i) => {
                      const x = (metric.day ? dailyMetrics.indexOf(metric) : 0) * dayWidth + dayWidth / 2;
                      const y = GRAPH_HEIGHT - (metric.progressPercent / 100) * GRAPH_HEIGHT;
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="3"
                          className="fill-primary stroke-background stroke-2"
                        />
                      );
                    })}
                </>
              )}
            </svg>

            {/* Marcadores Numéricos Inferiores */}
            <div
              className="absolute w-full flex items-center justify-between text-[10px] text-muted-foreground px-2"
              style={{ top: GRAPH_HEIGHT + 4 }}
            >
              <span>Início do Período</span>
              <span className="font-mono font-bold text-foreground">
                Avanço Físico Previsto no Período: {dailyMetrics[dailyMetrics.length - 1]?.progressPercent || 100}%
              </span>
              <span>Conclusão</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
