'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type LinearScheduleItem, type RoadActivityType } from '@/types/road';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plus, CalendarRange, Trash2, Edit3, CheckCircle2, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import type { UserRole } from '@/app/projects/[id]/page';

interface LinearPlanningTabProps {
  projectId: string;
  userRole: UserRole | null;
}

const ACTIVITY_COLORS: Record<RoadActivityType, string> = {
  'Desmatação': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Escavação / Corte': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Aterro': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Sub-Base': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  'Base Britada': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'Imprimação': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Capa Asfáltica': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Drenagem / Valetas': 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  'Sinalização': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
};

export default function LinearPlanningTab({ projectId, userRole }: LinearPlanningTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = userRole === 'Gestor' || userRole === 'Editor';

  const [items, setItems] = useState<LinearScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activityName, setActivityName] = useState('');
  const [activityType, setActivityType] = useState<RoadActivityType>('Capa Asfáltica');
  const [startStake, setStartStake] = useState('Km 0+000');
  const [endStake, setEndStake] = useState('Km 8+500');
  const [startKm, setStartKm] = useState('0');
  const [endKm, setEndKm] = useState('8.5');
  const [currentStakeKm, setCurrentStakeKm] = useState('4.2');
  const [currentStakeLabel, setCurrentStakeLabel] = useState('Km 4+200');
  const [progressPercentage, setProgressPercentage] = useState('49.4');
  const [plannedStartDate, setPlannedStartDate] = useState('2026-09-01');
  const [plannedEndDate, setPlannedEndDate] = useState('2026-11-30');
  const [plannedDailyRateKm, setPlannedDailyRateKm] = useState('0.15'); // 150m / dia
  const [teamLeader, setTeamLeader] = useState('Eng. Costa / Encarregado Silva');
  const [status, setStatus] = useState<'Planeado' | 'Em Andamento' | 'Concluído' | 'Atrasado'>('Em Andamento');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const q = query(
      collection(db, 'projects', projectId, 'linearSchedule'),
      orderBy('startKm', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          plannedStartDate: data.plannedStartDate?.toDate ? data.plannedStartDate.toDate() : new Date(data.plannedStartDate || Date.now()),
          plannedEndDate: data.plannedEndDate?.toDate ? data.plannedEndDate.toDate() : new Date(data.plannedEndDate || Date.now()),
        } as LinearScheduleItem;
      });
      setItems(fetched);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching linear schedule:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar o planeamento linear.', variant: 'destructive' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, toast]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setActivityName('Execução de Capa de Rolamento BB 0/14');
    setActivityType('Capa Asfáltica');
    setStartStake('Km 0+000');
    setEndStake('Km 10+000');
    setStartKm('0');
    setEndKm('10');
    setCurrentStakeKm('4.5');
    setCurrentStakeLabel('Km 4+500');
    setProgressPercentage('45');
    setPlannedDailyRateKm('0.20');
    setStatus('Em Andamento');
    setIsDialogOpen(true);
  };

  const handleEdit = (item: LinearScheduleItem) => {
    setEditingId(item.id);
    setActivityName(item.activityName);
    setActivityType(item.activityType);
    setStartStake(item.startStake);
    setEndStake(item.endStake);
    setStartKm(String(item.startKm));
    setEndKm(String(item.endKm));
    setCurrentStakeKm(String(item.currentStakeKm || 0));
    setCurrentStakeLabel(item.currentStakeLabel || '');
    setProgressPercentage(String(item.progressPercentage));
    setPlannedDailyRateKm(String(item.plannedDailyRateKm || 0.1));
    setTeamLeader(item.teamLeader || '');
    setStatus(item.status);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja eliminar esta frente do planeamento linear?')) return;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'linearSchedule', id));
      toast({ title: 'Frente Eliminada', description: 'Atividade removida com sucesso.' });
    } catch {
      toast({ title: 'Erro', description: 'Falha ao eliminar atividade.', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityName || !startStake || !endStake) {
      toast({ title: 'Campos Obrigatórios', description: 'Preencha os dados da atividade e as estacas.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const sKm = parseFloat(startKm) || 0;
      const eKm = parseFloat(endKm) || 0;
      const cKm = parseFloat(currentStakeKm) || sKm;
      const computedProg = eKm > sKm ? Math.min(100, Math.max(0, ((cKm - sKm) / (eKm - sKm)) * 100)) : parseFloat(progressPercentage);

      const data = {
        activityName,
        activityType,
        startStake,
        endStake,
        startKm: sKm,
        endKm: eKm,
        currentStakeKm: cKm,
        currentStakeLabel: currentStakeLabel || `Km ${cKm.toFixed(3).replace('.', '+')}`,
        progressPercentage: parseFloat(computedProg.toFixed(1)),
        plannedDailyRateKm: parseFloat(plannedDailyRateKm) || 0.1,
        teamLeader: teamLeader || '',
        status,
        plannedStartDate: new Date(plannedStartDate),
        plannedEndDate: new Date(plannedEndDate),
        createdAt: serverTimestamp(),
        author: {
          uid: user?.uid || 'anonymous',
          displayName: user?.displayName || 'Planeador de Vias',
        },
      };

      if (editingId) {
        await updateDoc(doc(db, 'projects', projectId, 'linearSchedule', editingId), data);
        toast({ title: 'Planeamento Atualizado', description: 'Frente de avanço salva com sucesso.' });
      } else {
        await addDoc(collection(db, 'projects', projectId, 'linearSchedule'), data);
        toast({ title: 'Frente Adicionada', description: 'Nova frente linear criada no cronograma.' });
      }
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao guardar planeamento.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Diagrama Tempo-Caminho (March-Chart preview visual)
  const maxProjectKm = items.length > 0 ? Math.max(...items.map(i => i.endKm)) : 10;

  return (
    <div className="space-y-6">
      {/* Visual March-Chart / Diagrama Linear de Frentes */}
      <Card className="border shadow-sm bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold font-headline flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-primary" />
                Diagrama Linear de Frentes de Trabalho (Tempo-Caminho)
              </CardTitle>
              <CardDescription className="text-xs">
                Visualização espacial do avanço de cada frente ao longo das estacas da rodovia ($Km\ 0+000 \rightarrow Km\ {maxProjectKm.toFixed(0)}+000$).
              </CardDescription>
            </div>
            {canEdit && (
              <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 rounded-lg">
                <Plus className="h-4 w-4" /> Nova Frente Linear
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              Nenhuma frente linear configurada no cronograma. Clique em &quot;Nova Frente Linear&quot; para iniciar o planeamento por estacas.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Régua de Estacas */}
              <div className="relative pt-6 pb-2 border-b">
                <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Km 0+000</span>
                  <span>Km {(maxProjectKm / 4).toFixed(1)}+000</span>
                  <span>Km {(maxProjectKm / 2).toFixed(1)}+000</span>
                  <span>Km {(maxProjectKm * 0.75).toFixed(1)}+000</span>
                  <span>Km {maxProjectKm.toFixed(1)}+000</span>
                </div>
                <div className="w-full h-1 bg-border rounded-full mt-1.5" />
              </div>

              {/* Frentes Ativas */}
              <div className="space-y-3">
                {items.map((item) => {
                  const leftPercent = (item.startKm / maxProjectKm) * 100;
                  const widthPercent = Math.max(2, ((item.endKm - item.startKm) / maxProjectKm) * 100);
                  const executedPercent = (item.progressPercentage / 100) * widthPercent;

                  return (
                    <div key={item.id} className="p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={ACTIVITY_COLORS[item.activityType] || ''}>
                            {item.activityType}
                          </Badge>
                          <span className="font-bold text-foreground">{item.activityName}</span>
                          <span className="text-muted-foreground font-mono">
                            ({item.startStake} &rarr; {item.endStake})
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-muted-foreground">Estaca Atual:</span>
                          <span className="font-bold text-primary">{item.currentStakeLabel || `Km ${item.currentStakeKm}`}</span>
                          <span className="font-bold text-foreground">{item.progressPercentage}%</span>
                        </div>
                      </div>

                      {/* Barra Linear de Avanço Espacial */}
                      <div className="relative w-full h-4 bg-muted rounded-md overflow-hidden border">
                        {/* Faixa Planeada Total */}
                        <div
                          className="absolute top-0 bottom-0 bg-primary/20"
                          style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                        />
                        {/* Faixa Já Executada */}
                        <div
                          className="absolute top-0 bottom-0 bg-primary"
                          style={{ left: `${leftPercent}%`, width: `${executedPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Gestão de Frentes e Ritmo Diário */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold font-headline">
            Controlo de Ritmo Diário & Frentes de Trabalho
          </CardTitle>
          <CardDescription className="text-xs">
            Acompanhamento de metas diárias de avanço físico (km/dia), equipas responsáveis e datas contratuais.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? null : (
            <div className="overflow-x-auto border rounded-xl">
              <Table>
                <TableHeader className="bg-muted/40 text-xs">
                  <TableRow>
                    <TableHead className="font-semibold">Atividade</TableHead>
                    <TableHead className="font-semibold">Troço (Estacas)</TableHead>
                    <TableHead className="font-semibold">Estaca Atual</TableHead>
                    <TableHead className="font-semibold text-right">Ritmo Planeado</TableHead>
                    <TableHead className="font-semibold">Prazo Contratual</TableHead>
                    <TableHead className="font-semibold">Responsável / Encarregado</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold w-28">Avanço</TableHead>
                    {canEdit && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {items.map((it) => (
                    <TableRow key={it.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-foreground">
                        {it.activityName}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {it.startStake} &rarr; {it.endStake}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-primary">
                        {it.currentStakeLabel || `Km ${it.currentStakeKm}`}
                      </TableCell>
                      <TableCell className="font-mono text-right">
                        {it.plannedDailyRateKm ? `${(it.plannedDailyRateKm * 1000).toFixed(0)} m/dia` : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground text-[11px]">
                        {it.plannedStartDate ? format(it.plannedStartDate as Date, 'dd/MM/yy') : ''} &rarr;{' '}
                        {it.plannedEndDate ? format(it.plannedEndDate as Date, 'dd/MM/yy') : ''}
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[160px]">
                        {it.teamLeader || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          it.status === 'Concluído' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          it.status === 'Em Andamento' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          it.status === 'Atrasado' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          'bg-muted text-muted-foreground'
                        }>
                          {it.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span>{it.progressPercentage}%</span>
                          </div>
                          <Progress value={it.progressPercentage} className="h-1.5" />
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(it)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(it.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline font-bold text-lg flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-primary" />
              {editingId ? 'Editar Frente Linear' : 'Nova Frente de Trabalho Linear'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina as balizas métricas de início, fim e estaca atual alcançada no terreno.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da Atividade / Frente *</Label>
              <Input
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                placeholder="Ex: Aplicação de Base Britada (BGS)"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Disciplina / Tipo</Label>
                <Select value={activityType} onValueChange={(val: any) => setActivityType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Desmatação">Desmatação</SelectItem>
                    <SelectItem value="Escavação / Corte">Escavação / Corte</SelectItem>
                    <SelectItem value="Aterro">Aterro</SelectItem>
                    <SelectItem value="Sub-Base">Sub-Base</SelectItem>
                    <SelectItem value="Base Britada">Base Britada</SelectItem>
                    <SelectItem value="Imprimação">Imprimação</SelectItem>
                    <SelectItem value="Capa Asfáltica">Capa Asfáltica</SelectItem>
                    <SelectItem value="Drenagem / Valetas">Drenagem / Valetas</SelectItem>
                    <SelectItem value="Sinalização">Sinalização</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estado Atual</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planeado">Planeado</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                    <SelectItem value="Atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estaca Inicial (Ex: Km 0+000)</Label>
                <Input
                  value={startStake}
                  onChange={(e) => setStartStake(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estaca Final (Ex: Km 10+000)</Label>
                <Input
                  value={endStake}
                  onChange={(e) => setEndStake(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Km Inicial</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={startKm}
                  onChange={(e) => setStartKm(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Km Final</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={endKm}
                  onChange={(e) => setEndKm(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estaca Atual (Km)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentStakeKm}
                  onChange={(e) => {
                    setCurrentStakeKm(e.target.value);
                    const val = parseFloat(e.target.value) || 0;
                    setCurrentStakeLabel(`Km ${val.toFixed(3).replace('.', '+')}`);
                  }}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data de Início Planeada</Label>
                <Input
                  type="date"
                  value={plannedStartDate}
                  onChange={(e) => setPlannedStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data de Conclusão Planeada</Label>
                <Input
                  type="date"
                  value={plannedEndDate}
                  onChange={(e) => setPlannedEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ritmo Diário Médio (Km/dia)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={plannedDailyRateKm}
                  onChange={(e) => setPlannedDailyRateKm(e.target.value)}
                  placeholder="0.15"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Encarregado / Equipa</Label>
                <Input
                  value={teamLeader}
                  onChange={(e) => setTeamLeader(e.target.value)}
                  placeholder="Ex: Equipa Alfa / Mestre João"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editingId ? 'Guardar Alterações' : 'Adicionar Frente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
