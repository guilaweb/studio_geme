'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WbsItem } from '@/types/wbs';
import { format, differenceInDays } from 'date-fns';
import { 
  AlertTriangle, 
  Truck, 
  Users, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert,
  ChevronRight,
  Sparkles 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResourceConflict {
  resourceName: string;
  resourceType: 'equipment' | 'person';
  taskA: WbsItem;
  taskB: WbsItem;
  overlapDays: number;
  startDate: Date;
  endDate: Date;
  isCritical: boolean;
}

interface GanttResourceConflictsPanelProps {
  tasks: WbsItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (task: WbsItem) => void;
}

export function GanttResourceConflictsPanel({
  tasks,
  isOpen,
  onClose,
  onSelectTask,
}: GanttResourceConflictsPanelProps) {
  const conflicts = useMemo(() => {
    if (!isOpen || tasks.length < 2) return [];

    const conflictList: ResourceConflict[] = [];

    // Mapeamento de recursos por tarefa
    const taskResources = tasks.map((t) => {
      const start = t.startDate instanceof Date ? t.startDate : (t.startDate as any)?.toDate ? (t.startDate as any).toDate() : new Date(t.startDate || 0);
      const end = t.endDate instanceof Date ? t.endDate : (t.endDate as any)?.toDate ? (t.endDate as any).toDate() : new Date(t.endDate || 0);

      const equipments = (t as any).assignedEquipment || [];
      const people = (t as any).assignedWorkforce || [];
      if ((t as any).assignedToName) people.push((t as any).assignedToName);

      return {
        task: t,
        start,
        end,
        equipments,
        people,
        isCritical: !!t.isCriticalPath,
      };
    });

    // Análise de Sobreposição Par a Par
    for (let i = 0; i < taskResources.length; i++) {
      for (let j = i + 1; j < taskResources.length; j++) {
        const a = taskResources[i];
        const b = taskResources[j];

        // Verifica se há sobreposição temporal
        const overlapStart = a.start > b.start ? a.start : b.start;
        const overlapEnd = a.end < b.end ? a.end : b.end;

        if (overlapStart <= overlapEnd) {
          const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;

          // 1. Conflito em Equipamentos
          a.equipments.forEach((eq: string) => {
            if (b.equipments.includes(eq)) {
              conflictList.push({
                resourceName: eq,
                resourceType: 'equipment',
                taskA: a.task,
                taskB: b.task,
                overlapDays,
                startDate: overlapStart,
                endDate: overlapEnd,
                isCritical: a.isCritical || b.isCritical,
              });
            }
          });

          // 2. Conflito em Pessoas / Encarregados
          a.people.forEach((p: string) => {
            if (b.people.includes(p)) {
              conflictList.push({
                resourceName: p,
                resourceType: 'person',
                taskA: a.task,
                taskB: b.task,
                overlapDays,
                startDate: overlapStart,
                endDate: overlapEnd,
                isCritical: a.isCritical || b.isCritical,
              });
            }
          });
        }
      }
    }

    return conflictList;
  }, [tasks, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="border rounded-lg bg-card shadow-sm p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>Detector de Conflitos & Superalocação de Recursos</span>
              <Badge variant={conflicts.length > 0 ? "destructive" : "outline"} className="text-[10px] h-4 font-mono">
                {conflicts.length} {conflicts.length === 1 ? 'conflito' : 'conflitos'}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Identifica máquinas ou encarregados concorrentes na mesma janela de execução.
            </div>
          </div>
        </div>

        <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Lista de Conflitos */}
      {conflicts.length === 0 ? (
        <div className="p-6 text-center border rounded-lg bg-emerald-500/5 border-emerald-500/20 space-y-1.5">
          <CheckCircle2 className="h-7 w-7 text-emerald-600 mx-auto" />
          <div className="text-xs font-bold text-foreground">Zero Conflitos de Recursos!</div>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            Todas as frotas e equipas alocadas possuem janelas independentes sem sobreposições concorrentes.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <ScrollArea className="h-44 border rounded-md p-2 bg-muted/10">
            <div className="space-y-2">
              {conflicts.map((c, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-2.5 rounded-lg border bg-card text-xs space-y-1.5 shadow-2xs",
                    c.isCritical && "border-rose-500/40 bg-rose-500/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      {c.resourceType === 'equipment' ? (
                        <Truck className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <Users className="h-3.5 w-3.5 text-blue-500" />
                      )}
                      <span>Recurso: <strong>{c.resourceName}</strong></span>
                      {c.isCritical && (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1 py-0 uppercase">
                          No Caminho Crítico
                        </Badge>
                      )}
                    </div>

                    <Badge variant="outline" className="text-[10px] font-mono">
                      {c.overlapDays}d sobreposição ({format(c.startDate, 'dd/MM')} - {format(c.endDate, 'dd/MM')})
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t text-muted-foreground">
                    <div
                      onClick={() => onSelectTask(c.taskA)}
                      className="p-1.5 rounded hover:bg-muted/60 cursor-pointer flex items-center justify-between group"
                    >
                      <span className="truncate">
                        {c.taskA.code && `[${c.taskA.code}] `}<strong>{c.taskA.name}</strong>
                      </span>
                      <ChevronRight className="h-3 w-3 shrink-0 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                    </div>

                    <div
                      onClick={() => onSelectTask(c.taskB)}
                      className="p-1.5 rounded hover:bg-muted/60 cursor-pointer flex items-center justify-between group"
                    >
                      <span className="truncate">
                        {c.taskB.code && `[${c.taskB.code}] `}<strong>{c.taskB.name}</strong>
                      </span>
                      <ChevronRight className="h-3 w-3 shrink-0 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
