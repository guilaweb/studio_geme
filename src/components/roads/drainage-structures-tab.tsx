'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type DrainageStructure, type DrainageStructureType, type StructureStatus } from '@/types/road';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plus, Waves, Trash2, Edit3 } from 'lucide-react';
import type { UserRole } from '@/app/projects/[id]/page';

interface DrainageStructuresTabProps {
  projectId: string;
  userRole: UserRole | null;
}

const STRUCTURE_STATUS_COLORS: Record<StructureStatus, string> = {
  'Em Escavação': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'Armadura / Cofragem': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  'Betonagem': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  'Cura / Aterro Contíguo': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  'Concluído': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

export default function DrainageStructuresTab({ projectId, userRole }: DrainageStructuresTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = userRole === 'Gestor' || userRole === 'Editor';

  const [structures, setStructures] = useState<DrainageStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<DrainageStructureType>('Passagem Hidráulica Celular (PHC Box)');
  const [stakeLocation, setStakeLocation] = useState('Km 4+350');
  const [lengthOrSpanMeters, setLengthOrSpanMeters] = useState('18.5');
  const [concreteClass, setConcreteClass] = useState('C30/37');
  const [status, setStatus] = useState<StructureStatus>('Armadura / Cofragem');
  const [progressPercentage, setProgressPercentage] = useState('45');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const q = query(
      collection(db, 'projects', projectId, 'drainageStructures'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DrainageStructure));
      setStructures(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching drainage structures:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as obras de arte.', variant: 'destructive' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, toast]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setCode(`PHC-0${structures.length + 1}`);
    setName(`Passagem Hidráulica Dupla 2x2.0m`);
    setStakeLocation('Km 5+100');
    setType('Passagem Hidráulica Celular (PHC Box)');
    setLengthOrSpanMeters('16.0');
    setConcreteClass('C30/37');
    setStatus('Em Escavação');
    setProgressPercentage('10');
    setNotes('');
    setIsDialogOpen(true);
  };

  const handleEdit = (s: DrainageStructure) => {
    setEditingId(s.id);
    setCode(s.code);
    setName(s.name);
    setType(s.type);
    setStakeLocation(s.stakeLocation);
    setLengthOrSpanMeters(String(s.lengthOrSpanMeters));
    setConcreteClass(s.concreteClass || 'C30/37');
    setStatus(s.status);
    setProgressPercentage(String(s.progressPercentage));
    setNotes(s.notes || '');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja eliminar esta obra de arte?')) return;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'drainageStructures', id));
      toast({ title: 'Estrutura Eliminada', description: 'Registo removido com sucesso.' });
    } catch {
      toast({ title: 'Erro', description: 'Falha ao eliminar registo.', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !stakeLocation) {
      toast({ title: 'Campos Obrigatórios', description: 'Preencha código, nome e localização.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        code,
        name,
        type,
        stakeLocation,
        lengthOrSpanMeters: parseFloat(lengthOrSpanMeters) || 0,
        concreteClass,
        status,
        progressPercentage: Math.min(100, Math.max(0, parseFloat(progressPercentage) || 0)),
        notes: notes || '',
        createdAt: serverTimestamp(),
        author: {
          uid: user?.uid || 'anonymous',
          displayName: user?.displayName || 'Engenheiro de Obras de Arte',
        },
      };

      if (editingId) {
        await updateDoc(doc(db, 'projects', projectId, 'drainageStructures', editingId), data);
        toast({ title: 'Estrutura Atualizada', description: 'Dados guardados com sucesso.' });
      } else {
        await addDoc(collection(db, 'projects', projectId, 'drainageStructures'), data);
        toast({ title: 'Estrutura Criada', description: 'Nova obra de arte adicionada ao projeto.' });
      }
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao guardar obra de arte.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Total de Estruturas</div>
          <div className="text-2xl font-bold font-mono mt-1 text-foreground">{structures.length}</div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Passagens Hidráulicas (PHC)</div>
          <div className="text-2xl font-bold font-mono mt-1 text-primary">
            {structures.filter(s => s.type.includes('Passagem') || s.type.includes('Aqueduto')).length}
          </div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Pontes & Pontões</div>
          <div className="text-2xl font-bold font-mono mt-1 text-blue-600 dark:text-blue-400">
            {structures.filter(s => s.type.includes('Pontão') || s.type.includes('Ponte')).length}
          </div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Concluídas</div>
          <div className="text-2xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
            {structures.filter(s => s.status === 'Concluído').length}
          </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-bold font-headline flex items-center gap-2">
              <Waves className="h-5 w-5 text-primary" /> Obras de Arte Especiais & Drenagem Longitudinal/Transversal
            </CardTitle>
            <CardDescription className="text-xs">
              Acompanhamento de pontes, pontões, passagens hidráulicas celulares (PHC), aquedutos e valetas de crista/plataforma.
            </CardDescription>
          </div>
          {canEdit && (
            <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 rounded-lg">
              <Plus className="h-4 w-4" /> Nova Obra de Arte
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : structures.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl space-y-3">
              <Waves className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <h3 className="font-semibold text-sm">Nenhuma obra de arte registada</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Adicione as passagens de água, pontões e valetas ao longo do alinhamento da estrada.
              </p>
              {canEdit && (
                <Button onClick={handleOpenCreate} size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Criar Primeira Estrutura
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-xl">
              <Table>
                <TableHeader className="bg-muted/40 text-xs">
                  <TableRow>
                    <TableHead className="font-semibold">Código</TableHead>
                    <TableHead className="font-semibold">Designação da Estrutura</TableHead>
                    <TableHead className="font-semibold">Tipo de Obra</TableHead>
                    <TableHead className="font-semibold">Estaca</TableHead>
                    <TableHead className="font-semibold text-right">Extensão / Vão</TableHead>
                    <TableHead className="font-semibold">Classe de Betão</TableHead>
                    <TableHead className="font-semibold">Fase Executiva</TableHead>
                    <TableHead className="font-semibold w-36">Avanço</TableHead>
                    {canEdit && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {structures.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-bold text-primary">{s.code}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">{s.name}</div>
                        {s.notes && <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{s.notes}</div>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.type}</TableCell>
                      <TableCell className="font-mono font-bold">{s.stakeLocation}</TableCell>
                      <TableCell className="font-mono text-right">{s.lengthOrSpanMeters} m</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{s.concreteClass || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STRUCTURE_STATUS_COLORS[s.status] || ''}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span>Avanço</span>
                            <span className="font-bold">{s.progressPercentage}%</span>
                          </div>
                          <Progress value={s.progressPercentage} className="h-1.5" />
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(s)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)}>
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
              <Waves className="h-5 w-5 text-primary" />
              {editingId ? 'Editar Obra de Arte' : 'Nova Obra de Arte / Drenagem'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina as dimensões geométricas, classe de betão e avanço físico da estrutura.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Código da Estrutura *</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: PHC-03"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Designação *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Passagem Hidráulica Celular 2.0x2.0m"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Obra de Arte</Label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Passagem Hidráulica Celular (PHC Box)">Passagem Hidráulica Celular (PHC Box)</SelectItem>
                    <SelectItem value="Aqueduto Tubular (PHC)">Aqueduto Tubular (PHC)</SelectItem>
                    <SelectItem value="Valeta Triangular Revestida">Valeta Triangular Revestida</SelectItem>
                    <SelectItem value="Valeta Trapezoidal">Valeta Trapezoidal</SelectItem>
                    <SelectItem value="Pontão de Betão Armado">Pontão de Betão Armado</SelectItem>
                    <SelectItem value="Ponte Mista / Viga Pré-esforçada">Ponte Mista / Pré-esforçada</SelectItem>
                    <SelectItem value="Descida de Águas / Dissipador">Descida de Águas / Dissipador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Localização por Estaca *</Label>
                <Input
                  value={stakeLocation}
                  onChange={(e) => setStakeLocation(e.target.value)}
                  placeholder="Ex: Km 4+350"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Extensão ou Vão (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={lengthOrSpanMeters}
                  onChange={(e) => setLengthOrSpanMeters(e.target.value)}
                  placeholder="18.5"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Classe de Betão</Label>
                <Input
                  value={concreteClass}
                  onChange={(e) => setConcreteClass(e.target.value)}
                  placeholder="Ex: C30/37"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Fase Executiva Atual</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em Escavação">Em Escavação</SelectItem>
                    <SelectItem value="Armadura / Cofragem">Armadura / Cofragem</SelectItem>
                    <SelectItem value="Betonagem">Betonagem</SelectItem>
                    <SelectItem value="Cura / Aterro Contíguo">Cura / Aterro Contíguo</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Progresso (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={progressPercentage}
                  onChange={(e) => setProgressPercentage(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notas Técnicas / Condições Hidráulicas</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Execução de enrocamento de proteção a montante e jusante."
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editingId ? 'Guardar Alterações' : 'Criar Estrutura'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
