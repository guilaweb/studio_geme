'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { WbsItem } from '@/types/wbs';
import { format, addDays, differenceInDays, isBefore, isSameDay } from 'date-fns';
import { GitMerge, ArrowRight, CheckCircle2, AlertTriangle, Loader2, Sparkles, Clock } from 'lucide-react';

interface GanttCascadeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  tasks: WbsItem[];
  onCascadeApplied?: () => void;
}

interface CascadeAdjustment {
  taskId: string;
  taskName: string;
  taskCode?: string;
  currentStart: Date;
  currentEnd: Date;
  newStart: Date;
  newEnd: Date;
  shiftDays: number;
  causedByTaskName: string;
}

export function GanttCascadeModal({
  open,
  onOpenChange,
  projectId,
  tasks,
  onCascadeApplied,
}: GanttCascadeModalProps) {
  const { toast } = useToast();
  const [isApplying, setIsApplying] = useState(false);

  // Algoritmo de Reprogramação Topológica em Cascata
  const adjustments = useMemo(() => {
    if (!open || tasks.length === 0) return [];

    const taskMap = new Map<string, { start: Date; end: Date; duration: number; original: WbsItem }>();
    
    // Inicializa mapa com cópias das datas
    tasks.forEach((t) => {
      if (t.startDate && t.endDate) {
        const start = t.startDate instanceof Date ? t.startDate : (t.startDate as any).toDate ? (t.startDate as any).toDate() : new Date(t.startDate);
        const end = t.endDate instanceof Date ? t.endDate : (t.endDate as any).toDate ? (t.endDate as any).toDate() : new Date(t.endDate);
        const duration = t.isMilestone ? 0 : Math.max(1, differenceInDays(end, start) + 1);
        taskMap.set(t.id, { start, end, duration, original: t });
      }
    });

    const results: CascadeAdjustment[] = [];
    let changed = true;
    let iterations = 0;
    const maxIterations = 50; // Previne ciclos infinitos em caso de dependências circulares anómalas

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      tasks.forEach((task) => {
        if (!task.dependencies || task.dependencies.length === 0) return;

        const currentData = taskMap.get(task.id);
        if (!currentData) return;

        let latestPredecessorEnd: Date | null = null;
        let mainPredecessorName = '';

        task.dependencies.forEach((predId) => {
          const predData = taskMap.get(predId);
          if (predData) {
            if (!latestPredecessorEnd || isBefore(latestPredecessorEnd, predData.end)) {
              latestPredecessorEnd = predData.end;
              mainPredecessorName = predData.original.name;
            }
          }
        });

        if (latestPredecessorEnd) {
          // A tarefa deve começar no dia seguinte ao término da predecessora (Finish-to-Start)
          const requiredStart = addDays(latestPredecessorEnd, 1);

          if (isBefore(currentData.start, requiredStart)) {
            const shiftDays = differenceInDays(requiredStart, currentData.start);
            const newStart = requiredStart;
            const newEnd = currentData.original.isMilestone
              ? newStart
              : addDays(newStart, Math.max(1, currentData.duration) - 1);

            // Atualiza no mapa temporário para propagar aos sucessores deste
            taskMap.set(task.id, {
              ...currentData,
              start: newStart,
              end: newEnd,
            });

            // Regista ou atualiza no sumário
            const existingIdx = results.findIndex((r) => r.taskId === task.id);
            const adjustmentItem: CascadeAdjustment = {
              taskId: task.id,
              taskName: task.name,
              taskCode: task.code,
              currentStart: (task.startDate as any).toDate ? (task.startDate as any).toDate() : new Date(task.startDate!),
              currentEnd: (task.endDate as any).toDate ? (task.endDate as any).toDate() : new Date(task.endDate!),
              newStart,
              newEnd,
              shiftDays: differenceInDays(newStart, (task.startDate as any).toDate ? (task.startDate as any).toDate() : new Date(task.startDate!)),
              causedByTaskName: mainPredecessorName,
            };

            if (existingIdx >= 0) {
              results[existingIdx] = adjustmentItem;
            } else {
              results.push(adjustmentItem);
            }

            changed = true;
          }
        }
      });
    }

    return results;
  }, [tasks, open]);

  const handleApplyCascade = async () => {
    if (adjustments.length === 0 || !projectId) return;

    setIsApplying(true);
    try {
      const batch = writeBatch(db);

      adjustments.forEach((adj) => {
        const taskRef = doc(db, 'projects', projectId, 'wbs', adj.taskId);
        batch.update(taskRef, {
          startDate: Timestamp.fromDate(adj.newStart),
          endDate: Timestamp.fromDate(adj.newEnd),
        });
      });

      await batch.commit();

      toast({
        title: 'Reprogramação Concluída!',
        description: `${adjustments.length} atividades foram empurradas em cascata garantindo as dependências CPM.`,
      });

      if (onCascadeApplied) onCascadeApplied();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Erro ao aplicar cascata:', err);
      toast({
        title: 'Erro na Reprogramação',
        description: err.message || 'Falha ao salvar as novas datas.',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-1">
            <GitMerge className="h-5 w-5" />
          </div>
          <DialogTitle className="text-base font-bold">
            Reprogramação Automática em Cascata (Auto-Schedule CPM)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Ajusta as datas de início de todas as atividades dependentes cujo início viola o término de suas predecessoras.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {adjustments.length === 0 ? (
            <div className="p-8 text-center border rounded-lg bg-emerald-500/5 border-emerald-500/20 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <div className="text-sm font-bold text-foreground">
                Cronograma 100% Alinhado!
              </div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Todas as tarefas com dependências já respeitam o término de suas predecessoras. Não é necessário nenhum deslocamento.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {adjustments.length} {adjustments.length === 1 ? 'atividade será empurrada' : 'atividades serão empurradas'}:
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Preserva Durações
                </Badge>
              </div>

              <ScrollArea className="h-64 border rounded-lg p-2 bg-muted/10">
                <div className="space-y-2">
                  {adjustments.map((adj) => (
                    <div
                      key={adj.taskId}
                      className="p-2.5 rounded-lg border bg-card text-xs space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-foreground truncate pr-2">
                          {adj.taskCode && (
                            <span className="font-mono text-primary mr-1.5">[{adj.taskCode}]</span>
                          )}
                          {adj.taskName}
                        </div>
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5 py-0 font-bold shrink-0">
                          +{adj.shiftDays} {adj.shiftDays === 1 ? 'dia' : 'dias'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                        <div>
                          Anterior:{' '}
                          <span className="line-through text-muted-foreground/80">
                            {format(adj.currentStart, 'dd/MM/yy')} → {format(adj.currentEnd, 'dd/MM/yy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                          <ArrowRight className="h-3 w-3" />
                          {format(adj.newStart, 'dd/MM/yy')} → {format(adj.newEnd, 'dd/MM/yy')}
                        </div>
                      </div>

                      <div className="text-[10px] text-muted-foreground italic truncate">
                        Motivo: Aguarda conclusão de "{adj.causedByTaskName}"
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isApplying}>
            Cancelar
          </Button>
          {adjustments.length > 0 && (
            <Button size="sm" onClick={handleApplyCascade} disabled={isApplying} className="font-bold">
              {isApplying && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Aplicar Reprogramação ({adjustments.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
