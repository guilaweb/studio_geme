'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { WbsItem } from '@/types/wbs';
import { Bookmark, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface GanttBaselineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  tasks: WbsItem[];
  onBaselineSaved?: () => void;
}

export function GanttBaselineModal({
  open,
  onOpenChange,
  projectId,
  tasks,
  onBaselineSaved,
}: GanttBaselineModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSnapshotBaseline = async () => {
    if (!projectId || tasks.length === 0) return;

    setIsSaving(true);
    try {
      const batch = writeBatch(db);

      tasks.forEach((task) => {
        if (!task.id) return;
        const taskRef = doc(db, 'projects', projectId, 'wbs', task.id);

        const start = task.startDate instanceof Date 
          ? task.startDate 
          : (task.startDate as any)?.toDate 
            ? (task.startDate as any).toDate() 
            : task.startDate ? new Date(task.startDate) : null;

        const end = task.endDate instanceof Date 
          ? task.endDate 
          : (task.endDate as any)?.toDate 
            ? (task.endDate as any).toDate() 
            : task.endDate ? new Date(task.endDate) : null;

        const updateData: Record<string, any> = {};
        if (start) updateData.baselineStartDate = Timestamp.fromDate(start);
        if (end) updateData.baselineEndDate = Timestamp.fromDate(end);
        if (task.budget || task.totalValue) {
          updateData.baselineBudget = task.budget || task.totalValue;
        }

        if (Object.keys(updateData).length > 0) {
          batch.update(taskRef, updateData);
        }
      });

      await batch.commit();

      toast({
        title: 'Linha de Base Gravada!',
        description: `O cronograma atual de ${tasks.length} atividades foi congelado como Linha de Base Oficial.`,
      });

      if (onBaselineSaved) onBaselineSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Erro ao gravar linha de base:', err);
      toast({
        title: 'Erro ao Gravar',
        description: err.message || 'Falha ao gravar a linha de base no banco de dados.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
            <Bookmark className="h-5 w-5" />
          </div>
          <DialogTitle className="text-base font-bold">
            Gravar Linha de Base Contratual (Baseline)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Esta operação congela o cronograma atual como a meta aprovada do projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs text-muted-foreground">
          <div className="p-3 bg-muted/40 rounded-lg border space-y-1.5 text-foreground">
            <div className="flex items-center gap-2 font-semibold text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              O que acontece ao gravar a Linha de Base?
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground pl-1">
              <li>As datas de início e fim vigentes de <strong>{tasks.length} atividades</strong> serão gravadas.</li>
              <li>Permite comparar visualmente atrasos e adiantamentos (desvio em dias).</li>
              <li>Alimenta o cálculo de <strong>Valor Planeado (PV)</strong> na Análise de Valor Ganho (EVA).</li>
            </ul>
          </div>

          <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="text-[11px] leading-tight">
              Apenas grave uma nova Linha de Base no início formal da obra ou após aprovação de aditivo contratual de prazo pelo Dono da Obra.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSnapshotBaseline} disabled={isSaving} className="font-bold">
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Confirmar e Gravar Linha de Base
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
