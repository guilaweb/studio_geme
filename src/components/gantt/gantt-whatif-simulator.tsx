'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WbsItem } from '@/types/wbs';
import { format, addDays, differenceInDays } from 'date-fns';
import { 
  Sparkles, 
  X, 
  Flame, 
  ArrowRight, 
  RotateCcw, 
  Check, 
  AlertTriangle, 
  CloudRain, 
  Truck, 
  Zap 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GanttWhatIfSimulatorProps {
  tasks: WbsItem[];
  isOpen: boolean;
  onClose: () => void;
  simulatedShifts: Record<string, number>; // taskId -> deltaDays
  onSimulatedShiftsChange: (shifts: Record<string, number>) => void;
  onApplyScenario: () => void;
}

export function GanttWhatIfSimulator({
  tasks,
  isOpen,
  onClose,
  simulatedShifts,
  onSimulatedShiftsChange,
  onApplyScenario,
}: GanttWhatIfSimulatorProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  // Seleciona a primeira tarefa por padrão
  React.useEffect(() => {
    if (tasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [tasks, selectedTaskId]);

  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId);
  }, [tasks, selectedTaskId]);

  const currentTaskShift = simulatedShifts[selectedTaskId] || 0;

  const handleShiftChange = (delta: number) => {
    if (!selectedTaskId) return;
    onSimulatedShiftsChange({
      ...simulatedShifts,
      [selectedTaskId]: delta,
    });
  };

  const handleClearAll = () => {
    onSimulatedShiftsChange({});
  };

  // Pre-definições de Cenários Típicos de Engenharia
  const applyPreset = (type: 'rain' | 'cement' | 'overtime') => {
    const newShifts: Record<string, number> = {};

    if (type === 'rain') {
      // +14 dias em tarefas de Fundações ou Terraplanagem
      tasks.forEach((t) => {
        if (
          t.category === 'Fundações' ||
          t.name.toLowerCase().includes('escava') ||
          t.name.toLowerCase().includes('terrapl')
        ) {
          newShifts[t.id] = 14;
        }
      });
    } else if (type === 'cement') {
      // +10 dias em tarefas de Estrutura e Betonagem
      tasks.forEach((t) => {
        if (
          t.category === 'Estrutura' ||
          t.name.toLowerCase().includes('bet') ||
          t.name.toLowerCase().includes('pilar')
        ) {
          newShifts[t.id] = 10;
        }
      });
    } else if (type === 'overtime') {
      // -7 dias de aceleração nas tarefas críticas
      tasks.forEach((t) => {
        if (t.isCriticalPath) {
          newShifts[t.id] = -5;
        }
      });
    }

    onSimulatedShiftsChange(newShifts);
  };

  // Cálculo da data final real vs simulada
  const simulationMetrics = useMemo(() => {
    if (tasks.length === 0) return { realEnd: new Date(), simulatedEnd: new Date(), deltaDays: 0 };

    const realEnd = tasks.reduce((latest, t) => {
      const end = t.endDate instanceof Date ? t.endDate : (t.endDate as any).toDate ? (t.endDate as any).toDate() : new Date(t.endDate!);
      return end > latest ? end : latest;
    }, new Date(0));

    let simulatedEnd = realEnd;

    // Calcula novas datas finais de cada tarefa com o shift simulado
    tasks.forEach((t) => {
      const shift = simulatedShifts[t.id] || 0;
      if (shift !== 0 && t.endDate) {
        const taskEnd = t.endDate instanceof Date ? t.endDate : (t.endDate as any).toDate ? (t.endDate as any).toDate() : new Date(t.endDate);
        const taskSimulatedEnd = addDays(taskEnd, shift);
        if (taskSimulatedEnd > simulatedEnd) {
          simulatedEnd = taskSimulatedEnd;
        }
      }
    });

    const deltaDays = differenceInDays(simulatedEnd, realEnd);

    return { realEnd, simulatedEnd, deltaDays };
  }, [tasks, simulatedShifts]);

  const activeShiftCount = Object.values(simulatedShifts).filter((d) => d !== 0).length;

  if (!isOpen) return null;

  return (
    <div className="border rounded-lg bg-gradient-to-br from-card via-card to-purple-950/10 border-purple-500/30 shadow-md p-3.5 space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>Simulador de Cenários "What-If"</span>
              <Badge variant="outline" className="text-[10px] h-4 border-purple-500 text-purple-600">
                Modo Simulação Ativo
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Simule desvios sem alterar os dados oficiais do projeto.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeShiftCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearAll}
              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Limpar ({activeShiftCount})
            </Button>
          )}

          <Button
            size="sm"
            onClick={onApplyScenario}
            disabled={activeShiftCount === 0}
            className="h-7 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Gravar Cenário no Cronograma
          </Button>

          <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Painel de Métricas de Impacto no Prazo da Obra */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-2.5 rounded-lg border bg-purple-500/5 border-purple-500/20 text-xs">
        <div>
          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Término Contratual:</span>
          <span className="font-bold text-foreground text-sm font-mono">
            {format(simulationMetrics.realEnd, 'dd/MM/yyyy')}
          </span>
        </div>

        <div>
          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Término Simulado:</span>
          <span className="font-bold text-purple-600 dark:text-purple-400 text-sm font-mono flex items-center gap-1">
            {format(simulationMetrics.simulatedEnd, 'dd/MM/yyyy')}
          </span>
        </div>

        <div>
          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Impacto Global:</span>
          <div className="flex items-center gap-1 mt-0.5">
            {simulationMetrics.deltaDays === 0 ? (
              <Badge variant="outline" className="text-[10px] font-mono">Sem Desvio</Badge>
            ) : simulationMetrics.deltaDays > 0 ? (
              <Badge variant="destructive" className="text-xs font-bold font-mono">
                +{simulationMetrics.deltaDays} dias de atraso
              </Badge>
            ) : (
              <Badge className="text-xs font-bold font-mono bg-emerald-600">
                {simulationMetrics.deltaDays} dias de adiantamento
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Cenários Rápidos de Engenharia */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <span className="text-[11px] font-semibold text-muted-foreground">Cenários Típicos em 1 Clique:</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => applyPreset('rain')}
          className="h-6 text-[11px] px-2 bg-card hover:border-blue-500"
        >
          <CloudRain className="h-3 w-3 mr-1 text-blue-500" />
          Época das Chuvas (+14d Solos)
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => applyPreset('cement')}
          className="h-6 text-[11px] px-2 bg-card hover:border-amber-500"
        >
          <Truck className="h-3 w-3 mr-1 text-amber-500" />
          Atraso Fornecimento Cimento (+10d)
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => applyPreset('overtime')}
          className="h-6 text-[11px] px-2 bg-card hover:border-emerald-500"
        >
          <Zap className="h-3 w-3 mr-1 text-emerald-500" />
          Turno Dobrado (-5d no CPM)
        </Button>
      </div>

      {/* Seletor de Atividade e Slider de Desvio */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-2.5 rounded-lg border bg-card text-xs">
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-xs">Atividade a Simular:</Label>
          <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecione uma tarefa..." />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.code ? `[${t.code}] ` : ''}{t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Desvio Simulado:</Label>
            <span className={cn("text-xs font-bold font-mono", currentTaskShift > 0 ? "text-rose-600" : currentTaskShift < 0 ? "text-emerald-600" : "text-foreground")}>
              {currentTaskShift > 0 ? `+${currentTaskShift} dias` : `${currentTaskShift} dias`}
            </span>
          </div>
          <Slider
            value={[currentTaskShift]}
            onValueChange={([val]) => handleShiftChange(val)}
            min={-20}
            max={40}
            step={1}
            className="w-full pt-1"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>-20d</span>
            <span>0</span>
            <span>+40d</span>
          </div>
        </div>
      </div>
    </div>
  );
}
