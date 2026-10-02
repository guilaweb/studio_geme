'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import type { WbsItem } from '@/types/wbs';
import { format, addDays, isWithinInterval, isBefore, isAfter, startOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CalendarRange, 
  PlayCircle, 
  CheckCircle2, 
  Clock, 
  Package, 
  Truck, 
  Ruler, 
  FileCheck, 
  AlertCircle,
  X,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GanttLookaheadPanelProps {
  tasks: WbsItem[];
  isOpen: boolean;
  onClose: () => void;
  lookaheadDays: 14 | 28;
  onLookaheadDaysChange: (days: 14 | 28) => void;
  onSelectTask: (task: WbsItem) => void;
}

export function GanttLookaheadPanel({
  tasks,
  isOpen,
  onClose,
  lookaheadDays,
  onLookaheadDaysChange,
  onSelectTask,
}: GanttLookaheadPanelProps) {
  const [checkedConstraints, setCheckedConstraints] = useState<Record<string, boolean>>({});

  const toggleConstraint = (key: string) => {
    setCheckedConstraints((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const {
    today,
    lookaheadEnd,
    startingTasks,
    ongoingTasks,
    finishingTasks,
    allLookaheadTasks,
  } = useMemo(() => {
    const today = startOfDay(new Date());
    const lookaheadEnd = addDays(today, lookaheadDays);

    const starting: WbsItem[] = [];
    const ongoing: WbsItem[] = [];
    const finishing: WbsItem[] = [];
    const all: WbsItem[] = [];

    tasks.forEach((t) => {
      if (!t.startDate || !t.endDate) return;
      const start = startOfDay(t.startDate instanceof Date ? t.startDate : (t.startDate as any).toDate());
      const end = startOfDay(t.endDate instanceof Date ? t.endDate : (t.endDate as any).toDate());

      const startsInWindow = start >= today && start <= lookaheadEnd;
      const endsInWindow = end >= today && end <= lookaheadEnd;
      const spansWindow = start <= today && end >= today;

      if (startsInWindow || endsInWindow || spansWindow) {
        all.push(t);
      }

      if (startsInWindow && (t.progress || 0) === 0) {
        starting.push(t);
      } else if (spansWindow && (t.progress || 0) > 0 && (t.progress || 0) < 100) {
        ongoing.push(t);
      }

      if (endsInWindow && (t.progress || 0) < 100) {
        finishing.push(t);
      }
    });

    return {
      today,
      lookaheadEnd,
      startingTasks: starting,
      ongoingTasks: ongoing,
      finishingTasks: finishing,
      allLookaheadTasks: all,
    };
  }, [tasks, lookaheadDays]);

  if (!isOpen) return null;

  return (
    <div className="border rounded-lg bg-card shadow-sm p-3.5 space-y-3">
      {/* Header do Lookahead */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-primary/10 text-primary flex items-center justify-center">
            <CalendarRange className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>Lookahead Operacional (Last Planner System)</span>
              <Badge variant="outline" className="text-[10px] h-4 font-mono">
                {format(today, 'dd/MM')} → {format(lookaheadEnd, 'dd/MM/yyyy')}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Foco estrito no curto prazo para mestres de obra e engenheiros residentes.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternador 14d vs 28d */}
          <div className="flex items-center border rounded-md p-0.5 bg-muted/30 text-xs">
            <button
              onClick={() => onLookaheadDaysChange(14)}
              className={cn(
                "px-2 py-0.5 rounded font-medium transition-colors",
                lookaheadDays === 14 ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              14 Dias (2 Semanas)
            </button>
            <button
              onClick={() => onLookaheadDaysChange(28)}
              className={cn(
                "px-2 py-0.5 rounded font-medium transition-colors",
                lookaheadDays === 28 ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              28 Dias (4 Semanas)
            </button>
          </div>

          <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Contadores do Período */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
          <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase flex items-center gap-1">
            <PlayCircle className="h-3 w-3" />
            A Iniciar
          </div>
          <div className="text-base font-bold text-blue-900 dark:text-blue-100 mt-0.5">
            {startingTasks.length} <span className="text-[10px] font-normal text-muted-foreground">tarefas</span>
          </div>
        </div>

        <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
          <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Em Andamento
          </div>
          <div className="text-base font-bold text-amber-900 dark:text-amber-100 mt-0.5">
            {ongoingTasks.length} <span className="text-[10px] font-normal text-muted-foreground">tarefas</span>
          </div>
        </div>

        <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            A Concluir
          </div>
          <div className="text-base font-bold text-emerald-900 dark:text-emerald-100 mt-0.5">
            {finishingTasks.length} <span className="text-[10px] font-normal text-muted-foreground">tarefas</span>
          </div>
        </div>

        <div className="p-2 rounded-md bg-muted/40 border">
          <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3" />
            Total Janela
          </div>
          <div className="text-base font-bold text-foreground mt-0.5">
            {allLookaheadTasks.length} <span className="text-[10px] font-normal text-muted-foreground">atividades</span>
          </div>
        </div>
      </div>

      {/* Lista de Atividades e Checklist de Restrições */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {/* Coluna 1 & 2: Atividades do Lookahead */}
        <div className="md:col-span-2 space-y-1.5">
          <div className="text-[11px] font-semibold text-foreground flex items-center justify-between px-0.5">
            <span>Atividades Programadas para o Período:</span>
            <span className="text-[10px] text-muted-foreground">Clique para editar</span>
          </div>

          {allLookaheadTasks.length === 0 ? (
            <div className="p-4 text-center border rounded text-xs text-muted-foreground">
              Nenhuma atividade programada para os próximos {lookaheadDays} dias.
            </div>
          ) : (
            <ScrollArea className="h-44 border rounded-md p-1.5 bg-muted/10">
              <div className="space-y-1">
                {allLookaheadTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="p-2 rounded border bg-card hover:bg-accent/40 cursor-pointer flex items-center justify-between text-xs transition-colors group"
                  >
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      {task.code && (
                        <span className="font-mono text-[10px] font-bold text-primary shrink-0">
                          [{task.code}]
                        </span>
                      )}
                      <span className="truncate font-medium text-foreground group-hover:underline">
                        {task.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[11px]">
                      <span className="text-muted-foreground font-mono">
                        {task.startDate && format(task.startDate instanceof Date ? task.startDate : (task.startDate as any).toDate(), 'dd/MM')} →{' '}
                        {task.endDate && format(task.endDate instanceof Date ? task.endDate : (task.endDate as any).toDate(), 'dd/MM')}
                      </span>
                      <Badge variant="outline" className="text-[9px] h-4 font-mono">
                        {task.progress || 0}%
                      </Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Coluna 3: Matriz de Desimpedimento de Restrições (LPS) */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-foreground px-0.5 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            Checklist de Restrições Operacionais:
          </div>

          <div className="border rounded-md p-2.5 bg-muted/20 space-y-2 text-xs">
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={checkedConstraints['materiais']}
                onCheckedChange={() => toggleConstraint('materiais')}
                className="mt-0.5"
              />
              <div>
                <span className="font-bold flex items-center gap-1 text-foreground">
                  <Package className="h-3 w-3 text-blue-500" /> Materiais & Cimento
                </span>
                <p className="text-[10px] text-muted-foreground">Insumos entregues ou confirmados pelo compras</p>
              </div>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={checkedConstraints['equipamentos']}
                onCheckedChange={() => toggleConstraint('equipamentos')}
                className="mt-0.5"
              />
              <div>
                <span className="font-bold flex items-center gap-1 text-foreground">
                  <Truck className="h-3 w-3 text-amber-500" /> Frotas & Equipamentos
                </span>
                <p className="text-[10px] text-muted-foreground">Máquinas ativas e diesel garantido</p>
              </div>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={checkedConstraints['topografia']}
                onCheckedChange={() => toggleConstraint('topografia')}
                className="mt-0.5"
              />
              <div>
                <span className="font-bold flex items-center gap-1 text-foreground">
                  <Ruler className="h-3 w-3 text-emerald-500" /> Frente & Topografia
                </span>
                <p className="text-[10px] text-muted-foreground">Piquetes e eixos locados pelo topógrafo</p>
              </div>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={checkedConstraints['projetos']}
                onCheckedChange={() => toggleConstraint('projetos')}
                className="mt-0.5"
              />
              <div>
                <span className="font-bold flex items-center gap-1 text-foreground">
                  <FileCheck className="h-3 w-3 text-primary" /> Telas & Licenciamento
                </span>
                <p className="text-[10px] text-muted-foreground">Pranchas para construção (IFC) aprovadas</p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
