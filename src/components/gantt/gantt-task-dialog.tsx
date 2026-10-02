'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { WbsItem, ActivityStatus } from '@/types/wbs';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Calendar, Clock, GitBranch, Diamond, CheckCircle2, AlertTriangle, Loader2, UserCheck } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';

interface GanttTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: WbsItem | null;
  allTasks: WbsItem[];
  projectId: string;
}

export function GanttTaskDialog({
  open,
  onOpenChange,
  task,
  allTasks,
  projectId,
}: GanttTaskDialogProps) {
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ActivityStatus>('not_started');
  const [isMilestone, setIsMilestone] = useState(false);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [dependencyType, setDependencyType] = useState<'FS' | 'SS' | 'FF'>('FS');
  const [dependencyLagDays, setDependencyLagDays] = useState(0);
  const [deliverable, setDeliverable] = useState('');
  const [assignedToUid, setAssignedToUid] = useState<string>('unassigned');
  const [projectTeam, setProjectTeam] = useState<Array<{ uid: string; displayName: string; role?: string; responsibility?: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!projectId || !open) return;
    const teamCol = collection(db, 'projects', projectId, 'team');
    const unsub = onSnapshot(teamCol, (snap) => {
      const members = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as any));
      setProjectTeam(members);
    });
    return () => unsub();
  }, [projectId, open]);

  useEffect(() => {
    if (task) {
      setName(task.name || '');
      setCode(task.code || '');
      setStartDateStr(
        task.startDate
          ? format(task.startDate instanceof Date ? task.startDate : (task.startDate as any).toDate(), 'yyyy-MM-dd')
          : ''
      );
      setEndDateStr(
        task.endDate
          ? format(task.endDate instanceof Date ? task.endDate : (task.endDate as any).toDate(), 'yyyy-MM-dd')
          : ''
      );
      setProgress(task.progress ?? 0);
      setStatus((task.status as ActivityStatus) ?? (task.progress === 100 ? 'completed' : task.progress && task.progress > 0 ? 'in_progress' : 'not_started'));
      setIsMilestone(!!task.isMilestone);
      setDependencies(task.dependencies || []);
      setDependencyType(((task as any).dependencyType as any) || 'FS');
      setDependencyLagDays(Number((task as any).dependencyLagDays) || 0);
      setDeliverable(task.deliverable || '');
      setAssignedToUid(task.assignedToUid || 'unassigned');
    }
  }, [task]);

  const durationDays = React.useMemo(() => {
    if (!startDateStr || !endDateStr) return 0;
    try {
      const start = parseISO(startDateStr);
      const end = parseISO(endDateStr);
      return Math.max(1, differenceInDays(end, start) + 1);
    } catch {
      return 0;
    }
  }, [startDateStr, endDateStr]);

  const availablePredecessors = React.useMemo(() => {
    if (!task) return [];
    return allTasks.filter((t) => t.id !== task.id);
  }, [allTasks, task]);

  const toggleDependency = (depId: string) => {
    setDependencies((prev) =>
      prev.includes(depId) ? prev.filter((id) => id !== depId) : [...prev, depId]
    );
  };

  const handleSave = async () => {
    if (!task || !projectId) return;

    if (!name.trim()) {
      toast({
        title: 'Nome Obrigatório',
        description: 'A atividade deve ter um nome válido.',
        variant: 'destructive',
      });
      return;
    }

    if (!startDateStr || !endDateStr) {
      toast({
        title: 'Datas Obrigatórias',
        description: 'Indique a data de início e conclusão da atividade.',
        variant: 'destructive',
      });
      return;
    }

    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);

    if (end < start) {
      toast({
        title: 'Data Inválida',
        description: 'A data de conclusão não pode ser anterior à data de início.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const taskRef = doc(db, 'projects', projectId, 'wbs', task.id);

      // Auto-determina status se progresso for 100%
      let finalStatus = status;
      if (progress >= 100 && status !== 'completed') {
        finalStatus = 'completed';
      } else if (progress > 0 && progress < 100 && status === 'not_started') {
        finalStatus = 'in_progress';
      }

      const assignedMember = projectTeam.find((m) => m.uid === assignedToUid);

      await updateDoc(taskRef, {
        name: name.trim(),
        code: code.trim() || null,
        startDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        durationDays,
        progress,
        status: finalStatus,
        isMilestone,
        dependencies,
        dependencyType,
        dependencyLagDays: Number(dependencyLagDays) || 0,
        deliverable: deliverable.trim() || null,
        assignedToUid: assignedToUid !== 'unassigned' ? assignedToUid : null,
        assignedToName: assignedMember ? assignedMember.displayName : null,
      });

      toast({
        title: 'Cronograma Atualizado',
        description: `A atividade "${name}" foi reprogramada com sucesso.`,
      });

      onOpenChange(false);
    } catch (err: any) {
      console.error('Erro ao atualizar atividade no cronograma:', err);
      toast({
        title: 'Erro ao Salvar',
        description: err.message || 'Não foi possível salvar as alterações da atividade.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
              {code || 'EAP'}
            </span>
            <DialogTitle className="text-base font-bold truncate">
              {name || 'Editar Atividade do Cronograma'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Ajuste durações, datas de execução, progresso físico e amarração de precedências na rede.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome e Código */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-1 space-y-1">
              <Label className="text-xs">Código EAP</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ex: 1.2.3"
                className="text-xs h-8 font-mono"
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <Label className="text-xs">Nome da Atividade *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Betonagem dos Pilares e Vigas Piso 1"
                className="text-xs h-8 font-semibold"
              />
            </div>
          </div>

          {/* Datas & Duração */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border bg-muted/20">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Data de Início *
              </Label>
              <Input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Data de Conclusão *
              </Label>
              <Input
                type="date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Duração Calculada
              </Label>
              <div className="h-8 flex items-center px-3 rounded-md bg-card border text-xs font-bold text-foreground">
                {durationDays} {durationDays === 1 ? 'dia' : 'dias'}
              </div>
            </div>
          </div>

          {/* Progresso & Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg border bg-card">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Progresso Físico</Label>
                <span className="text-xs font-bold text-primary">{progress}%</span>
              </div>
              <Slider
                value={[progress]}
                onValueChange={([val]) => setProgress(val)}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span onClick={() => setProgress(0)} className="cursor-pointer hover:underline">0%</span>
                <span onClick={() => setProgress(25)} className="cursor-pointer hover:underline">25%</span>
                <span onClick={() => setProgress(50)} className="cursor-pointer hover:underline">50%</span>
                <span onClick={() => setProgress(75)} className="cursor-pointer hover:underline">75%</span>
                <span onClick={() => setProgress(100)} className="cursor-pointer hover:underline">100%</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Estado Operacional</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as ActivityStatus)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Não Iniciada</SelectItem>
                  <SelectItem value="planning">Em Planeamento</SelectItem>
                  <SelectItem value="in_progress">Em Execução</SelectItem>
                  <SelectItem value="paused">Em Pausa / Suspensa</SelectItem>
                  <SelectItem value="completed">Concluída (100%)</SelectItem>
                  <SelectItem value="delayed">Atrasada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Responsável da Atividade (Equipa Alocada ao Projecto) */}
          <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
            <Label className="text-xs flex items-center gap-1.5 font-semibold text-foreground">
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              Responsável da Tarefa (Equipa Alocada ao Projecto)
            </Label>
            <Select value={assignedToUid} onValueChange={setAssignedToUid}>
              <SelectTrigger className="h-8 text-xs bg-card">
                <SelectValue placeholder="Sem responsável atribuído" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Sem responsável direto</SelectItem>
                {projectTeam.map((member) => (
                  <SelectItem key={member.uid} value={member.uid} className="text-xs">
                    {member.displayName} {member.role ? `(${member.role})` : ''} {member.responsibility ? `• ${member.responsibility}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projectTeam.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic">
                Nenhum membro alocado a este projeto ainda. Adicione membros na aba Equipa do projeto.
              </p>
            )}
          </div>

          {/* Marco Contratual (Milestone) */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
            <div className="flex items-center gap-2">
              <Diamond className="h-4 w-4 text-amber-500 fill-amber-500/20" />
              <div>
                <div className="text-xs font-bold text-foreground">Marco Contratual (Milestone)</div>
                <div className="text-[11px] text-muted-foreground">
                  Marcos representam eventos chave de duração zero (ex: Entrega de Licença, Fim da Estrutura).
                </div>
              </div>
            </div>
            <Switch checked={isMilestone} onCheckedChange={setIsMilestone} />
          </div>

          {/* Predecessoras / Dependências */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <GitBranch className="h-3.5 w-3.5 text-primary" />
                Predecessoras (Dependências de Rede CPM)
              </span>
              <span className="text-[11px] text-muted-foreground">
                {dependencies.length} selecionada(s)
              </span>
            </Label>

            {availablePredecessors.length === 0 ? (
              <div className="text-xs text-muted-foreground p-3 border rounded-lg text-center">
                Não existem outras atividades cadastradas no projeto para amarrar dependência.
              </div>
            ) : (
              <ScrollArea className="h-32 border rounded-lg p-2 bg-muted/10">
                <div className="space-y-1.5">
                  {availablePredecessors.map((pred) => {
                    const isChecked = dependencies.includes(pred.id);
                    return (
                      <div
                        key={pred.id}
                        onClick={() => toggleDependency(pred.id)}
                        className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors text-xs ${
                          isChecked
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Checkbox checked={isChecked} onCheckedChange={() => toggleDependency(pred.id)} />
                          {pred.code && <span className="font-mono text-[10px] text-muted-foreground">[{pred.code}]</span>}
                          <span className="truncate text-foreground">{pred.name}</span>
                        </div>
                        {pred.durationDays && (
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {pred.durationDays}d
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Configuração de Relação & Defasagem (Lag) */}
            {dependencies.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-lg border bg-muted/20 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Tipo de Vínculo
                  </Label>
                  <Select value={dependencyType} onValueChange={(val: any) => setDependencyType(val)}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FS">Término-Início (FS - Padrão)</SelectItem>
                      <SelectItem value="SS">Início-Início (SS - Paralelo)</SelectItem>
                      <SelectItem value="FF">Término-Término (FF)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Defasagem Técnica / Lag (Dias)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={dependencyLagDays}
                    onChange={(e) => setDependencyLagDays(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="ex: 7 (cura de betão)"
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="font-bold">
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Salvar no Cronograma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
