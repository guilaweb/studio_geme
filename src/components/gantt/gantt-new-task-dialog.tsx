'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { WbsItemCategories, type WbsItem, type WbsItemCategory } from '@/types/wbs';
import { format, addDays, parseISO } from 'date-fns';
import { Plus, Calendar, Clock, GitBranch, Diamond, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { onSnapshot } from 'firebase/firestore';

interface GanttNewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  existingTasks: WbsItem[];
}

export function GanttNewTaskDialog({
  open,
  onOpenChange,
  projectId,
  existingTasks,
}: GanttNewTaskDialogProps) {
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<WbsItemCategory>('Estrutura');
  const [startDateStr, setStartDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [durationDays, setDurationDays] = useState(7);
  const [isMilestone, setIsMilestone] = useState(false);
  const [predecessorId, setPredecessorId] = useState<string>('none');
  const [weight, setWeight] = useState(5);
  const [assignedToUid, setAssignedToUid] = useState<string>('unassigned');
  const [projectTeam, setProjectTeam] = useState<Array<{ uid: string; displayName: string; role?: string; responsibility?: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!projectId || !open) return;
    const teamCol = collection(db, 'projects', projectId, 'team');
    const unsub = onSnapshot(teamCol, (snap) => {
      const members = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as any));
      setProjectTeam(members);
    });
    return () => unsub();
  }, [projectId, open]);

  // Calcula data de término automática
  const endDateStr = React.useMemo(() => {
    if (!startDateStr) return '';
    try {
      const start = parseISO(startDateStr);
      const end = addDays(start, isMilestone ? 0 : Math.max(1, durationDays) - 1);
      return format(end, 'yyyy-MM-dd');
    } catch {
      return '';
    }
  }, [startDateStr, durationDays, isMilestone]);

  const handleCreateTask = async () => {
    if (!name.trim()) {
      toast({
        title: 'Nome Obrigatório',
        description: 'Por favor, indique o nome da atividade.',
        variant: 'destructive',
      });
      return;
    }

    if (!startDateStr) {
      toast({
        title: 'Data Obrigatória',
        description: 'Selecione a data de início da atividade.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const start = parseISO(startDateStr);
      const end = isMilestone ? start : addDays(start, Math.max(1, durationDays) - 1);

      const dependencies: string[] = [];
      if (predecessorId && predecessorId !== 'none') {
        dependencies.push(predecessorId);
      }

      const assignedMember = projectTeam.find((m) => m.uid === assignedToUid);

      const newTaskData = {
        name: name.trim(),
        code: code.trim() || null,
        category,
        startDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        durationDays: isMilestone ? 0 : durationDays,
        progress: 0,
        status: 'not_started',
        isMilestone,
        dependencies,
        weight: Number(weight) || 5,
        level: isMilestone ? 'activity' : 'activity',
        assignedToUid: assignedToUid !== 'unassigned' ? assignedToUid : null,
        assignedToName: assignedMember ? assignedMember.displayName : null,
        createdAt: Timestamp.now(),
      };

      const wbsCollection = collection(db, 'projects', projectId, 'wbs');
      await addDoc(wbsCollection, newTaskData);

      toast({
        title: 'Atividade Adicionada!',
        description: `A atividade "${name}" foi incluída com sucesso no cronograma.`,
      });

      // Limpar form
      setName('');
      setCode('');
      setDurationDays(7);
      setIsMilestone(false);
      setPredecessorId('none');
      setAssignedToUid('unassigned');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Erro ao adicionar atividade no cronograma:', err);
      toast({
        title: 'Erro ao Criar',
        description: err.message || 'Falha ao salvar a atividade no banco de dados.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-1">
            <Plus className="h-5 w-5" />
          </div>
          <DialogTitle className="text-base font-bold">
            Adicionar Nova Atividade ao Cronograma
          </DialogTitle>
          <DialogDescription className="text-xs">
            Insira os dados da tarefa para integrá-la automaticamente à rede do projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {/* Nome e Código */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Código EAP</Label>
              <Input
                placeholder="ex: 2.1.4"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Nome da Atividade *</Label>
              <Input
                placeholder="ex: Assentamento de Blocos Alvenaria"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Categoria / Fase */}
          <div className="space-y-1">
            <Label className="text-xs">Fase / Categoria da EAP</Label>
            <Select value={category} onValueChange={(val) => setCategory(val as WbsItemCategory)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WbsItemCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Datas e Duração */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg border bg-muted/20">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3 text-primary" />
                Início *
              </Label>
              <Input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3 text-primary" />
                Duração (dias)
              </Label>
              <Input
                type="number"
                min={1}
                disabled={isMilestone}
                value={isMilestone ? 0 : durationDays}
                onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Término Previsto</Label>
              <div className="h-8 flex items-center px-2.5 rounded-md border bg-card text-xs font-mono font-bold text-foreground">
                {endDateStr}
              </div>
            </div>
          </div>

          {/* Responsável da Atividade (Equipa do Projecto) */}
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1 text-muted-foreground">
              <UserCheck className="h-3 w-3 text-primary" />
              Responsável da Tarefa (Equipa Alocada ao Projecto)
            </Label>
            <Select value={assignedToUid} onValueChange={setAssignedToUid}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Sem responsável atribuído" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Sem responsável direto</SelectItem>
                {projectTeam.map((member) => (
                  <SelectItem key={member.uid} value={member.uid}>
                    {member.displayName} {member.role ? `(${member.role})` : ''}
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

          {/* Predecessora Imediata */}
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1 text-muted-foreground">
              <GitBranch className="h-3 w-3 text-primary" />
              Predecessora (Dependência Inicial)
            </Label>
            <Select value={predecessorId} onValueChange={setPredecessorId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Sem predecessora (Início livre)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (Início Independente)</SelectItem>
                {existingTasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.code ? `[${t.code}] ` : ''}{t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Marco Contratual */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border bg-amber-500/5 border-amber-500/20">
            <div className="flex items-center gap-2">
              <Diamond className="h-4 w-4 text-amber-500 fill-amber-500/20" />
              <div>
                <div className="text-xs font-bold text-foreground">Marco de Prazo (Milestone)</div>
                <div className="text-[10px] text-muted-foreground">
                  Duração zero dias. Marca uma entrega ou aprovação chave.
                </div>
              </div>
            </div>
            <Switch checked={isMilestone} onCheckedChange={setIsMilestone} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleCreateTask} disabled={isSubmitting} className="font-bold">
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Criar e Inserir no Cronograma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
