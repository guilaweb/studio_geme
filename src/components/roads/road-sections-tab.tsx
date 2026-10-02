'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type RoadSection, type RoadSectionStatus, type RoadSurfaceType } from '@/types/road';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plus, Route, Trash2, Edit3, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import type { UserRole } from '@/app/projects/[id]/page';

interface RoadSectionsTabProps {
  projectId: string;
  userRole: UserRole | null;
}

const STATUS_COLORS: Record<RoadSectionStatus, string> = {
  'Não Iniciado': 'bg-secondary text-secondary-foreground border-border',
  'Desmatação': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'Terraplanagem': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  'Sub-Base': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  'Base': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  'Imprimação': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  'Pavimentado': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'Sinalizado': 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  'Concluído': 'bg-emerald-600 text-white border-emerald-600',
};

export default function RoadSectionsTab({ projectId, userRole }: RoadSectionsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = userRole === 'Gestor' || userRole === 'Editor';

  const [sections, setSections] = useState<RoadSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [startStake, setStartStake] = useState('Km 0+000');
  const [endStake, setEndStake] = useState('Km 5+000');
  const [startKm, setStartKm] = useState('0');
  const [endKm, setEndKm] = useState('5');
  const [lengthMeters, setLengthMeters] = useState('5000');
  const [widthMeters, setWidthMeters] = useState('10.5');
  const [surfaceType, setSurfaceType] = useState<RoadSurfaceType>('Betão Asfáltico (Capa)');
  const [status, setStatus] = useState<RoadSectionStatus>('Terraplanagem');
  const [progressPercentage, setProgressPercentage] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const q = query(
      collection(db, 'projects', projectId, 'roadSections'),
      orderBy('startKm', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoadSection));
      setSections(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching road sections:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os troços.', variant: 'destructive' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, toast]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setCode(`TR-0${sections.length + 1}`);
    setName(`Troço Lote 0${sections.length + 1}`);
    const lastSection = sections[sections.length - 1];
    const newStart = lastSection ? lastSection.endKm : 0;
    const newEnd = newStart + 5;
    setStartKm(String(newStart));
    setEndKm(String(newEnd));
    setStartStake(`Km ${newStart}+000`);
    setEndStake(`Km ${newEnd}+000`);
    setLengthMeters(String((newEnd - newStart) * 1000));
    setWidthMeters('10.5');
    setSurfaceType('Betão Asfáltico (Capa)');
    setStatus('Terraplanagem');
    setProgressPercentage('15');
    setNotes('');
    setIsDialogOpen(true);
  };

  const handleEdit = (section: RoadSection) => {
    setEditingId(section.id);
    setCode(section.code);
    setName(section.name);
    setStartStake(section.startStake);
    setEndStake(section.endStake);
    setStartKm(String(section.startKm));
    setEndKm(String(section.endKm));
    setLengthMeters(String(section.lengthMeters));
    setWidthMeters(String(section.widthMeters));
    setSurfaceType(section.surfaceType);
    setStatus(section.status);
    setProgressPercentage(String(section.progressPercentage));
    setNotes(section.notes || '');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente eliminar este troço linear?')) return;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'roadSections', id));
      toast({ title: 'Troço Eliminado', description: 'O troço foi removido com sucesso.' });
    } catch {
      toast({ title: 'Erro', description: 'Falha ao eliminar troço.', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) {
      toast({ title: 'Campos Obrigatórios', description: 'Preencha o código e o nome do troço.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        code,
        name,
        startStake,
        endStake,
        startKm: parseFloat(startKm) || 0,
        endKm: parseFloat(endKm) || 0,
        lengthMeters: parseFloat(lengthMeters) || 0,
        widthMeters: parseFloat(widthMeters) || 10.5,
        surfaceType,
        status,
        progressPercentage: Math.min(100, Math.max(0, parseFloat(progressPercentage) || 0)),
        notes: notes || '',
        createdAt: serverTimestamp(),
        author: {
          uid: user?.uid || 'anonymous',
          displayName: user?.displayName || 'Engenheiro de Vias',
        },
      };

      if (editingId) {
        await updateDoc(doc(db, 'projects', projectId, 'roadSections', editingId), data);
        toast({ title: 'Troço Atualizado', description: 'Informações do troço salvas com sucesso.' });
      } else {
        await addDoc(collection(db, 'projects', projectId, 'roadSections'), data);
        toast({ title: 'Troço Criado', description: 'Novo troço linear adicionado ao projeto.' });
      }
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao guardar troço.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Resumo de Extensão e Progresso
  const totalLengthM = sections.reduce((acc, s) => acc + (s.lengthMeters || 0), 0);
  const avgProgress = sections.length > 0 
    ? (sections.reduce((acc, s) => acc + (s.progressPercentage || 0), 0) / sections.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Total de Troços</div>
          <div className="text-2xl font-bold font-mono mt-1 text-foreground">{sections.length}</div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Extensão Mapeada</div>
          <div className="text-2xl font-bold font-mono mt-1 text-primary">
            {(totalLengthM / 1000).toFixed(2)} km
          </div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Avanço Médio</div>
          <div className="text-2xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
            {avgProgress}%
          </div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Pavimentados / Concluídos</div>
          <div className="text-2xl font-bold font-mono mt-1 text-foreground">
            {sections.filter(s => s.status === 'Pavimentado' || s.status === 'Concluído').length}
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-bold font-headline flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" /> Estaqueamento Linear & Troços de Estrada
            </CardTitle>
            <CardDescription className="text-xs">
              Segmentação contínua por estacas métricas ($Km\ 0+000 \rightarrow Km\ X+XXX$), larguras de plataforma e acabamento superficial.
            </CardDescription>
          </div>
          {canEdit && (
            <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 rounded-lg">
              <Plus className="h-4 w-4" /> Novo Troço
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl space-y-3">
              <Route className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <h3 className="font-semibold text-sm">Nenhum troço linear registado</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Adicione os segmentos de estaqueamento da sua estrada para acompanhar o avanço das frentes de pavimentação e terraplanagem.
              </p>
              {canEdit && (
                <Button onClick={handleOpenCreate} size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Criar Primeiro Troço
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-xl">
              <Table>
                <TableHeader className="bg-muted/40 text-xs">
                  <TableRow>
                    <TableHead className="font-semibold">Código</TableHead>
                    <TableHead className="font-semibold">Identificação do Troço</TableHead>
                    <TableHead className="font-semibold">Estacas (Início &rarr; Fim)</TableHead>
                    <TableHead className="font-semibold">Extensão / Largura</TableHead>
                    <TableHead className="font-semibold">Camada Superficial</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold w-36">Progresso Físico</TableHead>
                    {canEdit && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {sections.map((section) => (
                    <TableRow key={section.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-bold text-primary">{section.code}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">{section.name}</div>
                        {section.notes && <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{section.notes}</div>}
                      </TableCell>
                      <TableCell className="font-mono">
                        {section.startStake} &rarr; {section.endStake}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold">{(section.lengthMeters / 1000).toFixed(2)} km</span>
                        <span className="text-muted-foreground ml-1">({section.widthMeters}m)</span>
                      </TableCell>
                      <TableCell>{section.surfaceType}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[section.status] || ''}>
                          {section.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span>Avanço</span>
                            <span className="font-bold">{section.progressPercentage}%</span>
                          </div>
                          <Progress value={section.progressPercentage} className="h-1.5" />
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(section)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(section.id)}>
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

      {/* Modal Dialog Form */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline font-bold text-lg flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              {editingId ? 'Editar Troço de Estrada' : 'Novo Troço Linear de Estrada'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina as balizas métricas de estaqueamento, perfil transversal e meta física.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Código do Troço *</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: TR-01"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Designação do Troço *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Troço Catete - Benguela"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estaca Inicial *</Label>
                <Input
                  value={startStake}
                  onChange={(e) => setStartStake(e.target.value)}
                  placeholder="Ex: Km 0+000"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estaca Final *</Label>
                <Input
                  value={endStake}
                  onChange={(e) => setEndStake(e.target.value)}
                  placeholder="Ex: Km 12+500"
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
                  onChange={(e) => {
                    setStartKm(e.target.value);
                    const diff = (parseFloat(endKm) || 0) - (parseFloat(e.target.value) || 0);
                    if (diff > 0) setLengthMeters(String(diff * 1000));
                  }}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Km Final</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={endKm}
                  onChange={(e) => {
                    setEndKm(e.target.value);
                    const diff = (parseFloat(e.target.value) || 0) - (parseFloat(startKm) || 0);
                    if (diff > 0) setLengthMeters(String(diff * 1000));
                  }}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Largura (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={widthMeters}
                  onChange={(e) => setWidthMeters(e.target.value)}
                  placeholder="10.5"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Camada / Tipo de Superfície</Label>
                <Select value={surfaceType} onValueChange={(val) => setSurfaceType(val as RoadSurfaceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Terra Batida">Terra Batida</SelectItem>
                    <SelectItem value="Macadame">Macadame</SelectItem>
                    <SelectItem value="Sub-Base Granular">Sub-Base Granular</SelectItem>
                    <SelectItem value="Base Betuminosa">Base Betuminosa</SelectItem>
                    <SelectItem value="Betão Asfáltico (Capa)">Betão Asfáltico (Capa)</SelectItem>
                    <SelectItem value="Pavimento Rígido">Pavimento Rígido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estado Atual</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as RoadSectionStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Não Iniciado">Não Iniciado</SelectItem>
                    <SelectItem value="Desmatação">Desmatação</SelectItem>
                    <SelectItem value="Terraplanagem">Terraplanagem</SelectItem>
                    <SelectItem value="Sub-Base">Sub-Base</SelectItem>
                    <SelectItem value="Base">Base</SelectItem>
                    <SelectItem value="Imprimação">Imprimação</SelectItem>
                    <SelectItem value="Pavimentado">Pavimentado</SelectItem>
                    <SelectItem value="Sinalizado">Sinalizado</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Avanço Físico Ponderado (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={progressPercentage}
                onChange={(e) => setProgressPercentage(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações Geotécnicas / Requisitos Especiais</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Trecho com necessidade de enrocamento devido a lençol freático."
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editingId ? 'Guardar Alterações' : 'Criar Troço'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
