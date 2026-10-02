'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type EarthworkRecord, type EarthworkOperation, type EarthworkMaterial } from '@/types/road';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Shovel, Trash2, Scale, Truck, Calendar as CalendarIcon, ArrowDownUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { UserRole } from '@/app/projects/[id]/page';

interface EarthworkTabProps {
  projectId: string;
  userRole: UserRole | null;
}

export default function EarthworkTab({ projectId, userRole }: EarthworkTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = userRole === 'Gestor' || userRole === 'Editor';

  const [records, setRecords] = useState<EarthworkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [stakeLocation, setStakeLocation] = useState('Km 2+400 - Km 2+850');
  const [operation, setOperation] = useState<EarthworkOperation>('Escavação / Corte');
  const [materialType, setMaterialType] = useState<EarthworkMaterial>('Solo Comum (1ª Categoria)');
  const [volumeM3, setVolumeM3] = useState('1450');
  const [equipmentUsed, setEquipmentUsed] = useState('Escavadora CAT 336, 4x Camião Basculante 20m³');
  const [loadTrips, setLoadTrips] = useState('72');
  const [borrowPitName, setBorrowPitName] = useState('Bota-Fora KM 4 Sul');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const q = query(
      collection(db, 'projects', projectId, 'earthworkRecords'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date || Date.now()),
        } as EarthworkRecord;
      });
      setRecords(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching earthwork records:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os registos de terraplanagem.', variant: 'destructive' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, toast]);

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja eliminar este registo de terraplanagem?')) return;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'earthworkRecords', id));
      toast({ title: 'Registo Eliminado', description: 'O registo foi removido com sucesso.' });
    } catch {
      toast({ title: 'Erro', description: 'Falha ao eliminar registo.', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stakeLocation || !volumeM3) {
      toast({ title: 'Campos Obrigatórios', description: 'Preencha a localização por estacas e o volume.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'projects', projectId, 'earthworkRecords'), {
        stakeLocation,
        operation,
        materialType,
        volumeM3: parseFloat(volumeM3) || 0,
        equipmentUsed,
        loadTrips: parseInt(loadTrips) || 0,
        borrowPitName: borrowPitName || '',
        notes: notes || '',
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        author: {
          uid: user?.uid || 'anonymous',
          displayName: user?.displayName || 'Encarregado de Terraplanagem',
        },
      });

      toast({ title: 'Apontamento Registado', description: 'Volume de terraplanagem lançado no sistema com sucesso.' });
      setIsDialogOpen(false);
      // Reset form
      setVolumeM3('1200');
      setNotes('');
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao guardar apontamento.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // KPIs
  const totalCorteM3 = records
    .filter(r => r.operation === 'Escavação / Corte')
    .reduce((acc, r) => acc + (r.volumeM3 || 0), 0);

  const totalAterroM3 = records
    .filter(r => r.operation === 'Aterro Compactado')
    .reduce((acc, r) => acc + (r.volumeM3 || 0), 0);

  const totalTransportadoM3 = records
    .filter(r => r.operation === 'Transporte a Bota-Fora')
    .reduce((acc, r) => acc + (r.volumeM3 || 0), 0);

  const saldoBalancoM3 = totalCorteM3 - totalAterroM3;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Total Escavado (Corte)</div>
          <div className="text-2xl font-bold font-mono mt-1 text-orange-600 dark:text-orange-400">
            {totalCorteM3.toLocaleString('pt-AO')} m³
          </div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Total Aterro Compactado</div>
          <div className="text-2xl font-bold font-mono mt-1 text-blue-600 dark:text-blue-400">
            {totalAterroM3.toLocaleString('pt-AO')} m³
          </div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Balanço de Massas</div>
          <div className={`text-2xl font-bold font-mono mt-1 ${saldoBalancoM3 >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {saldoBalancoM3 >= 0 ? `+${saldoBalancoM3.toLocaleString('pt-AO')} m³ (Bota-fora)` : `${saldoBalancoM3.toLocaleString('pt-AO')} m³ (Défice)`}
          </div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Total Transportado</div>
          <div className="text-2xl font-bold font-mono mt-1 text-foreground">
            {totalTransportadoM3.toLocaleString('pt-AO')} m³
          </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-bold font-headline flex items-center gap-2">
              <Shovel className="h-5 w-5 text-primary" /> Apontamento Diário de Terraplanagem
            </CardTitle>
            <CardDescription className="text-xs">
              Registo de volumes movimentados por estaca, categoria de solo (1ª, 2ª e 3ª categoria) e balanço corte/aterro.
            </CardDescription>
          </div>
          {canEdit && (
            <Button onClick={() => setIsDialogOpen(true)} size="sm" className="gap-1.5 rounded-lg">
              <Plus className="h-4 w-4" /> Novo Apontamento de Volume
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl space-y-3">
              <Shovel className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <h3 className="font-semibold text-sm">Nenhum registo de terraplanagem</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Lance os volumes diários executados pelas equipas de escavadoras, motoniveladoras e camiões basculantes.
              </p>
              {canEdit && (
                <Button onClick={() => setIsDialogOpen(true)} size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Registar Primeiro Volume
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-xl">
              <Table>
                <TableHeader className="bg-muted/40 text-xs">
                  <TableRow>
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Estacas (Localização)</TableHead>
                    <TableHead className="font-semibold">Operação</TableHead>
                    <TableHead className="font-semibold">Classificação do Solo</TableHead>
                    <TableHead className="font-semibold text-right">Volume (m³)</TableHead>
                    <TableHead className="font-semibold text-right">Viagens</TableHead>
                    <TableHead className="font-semibold">Equipamentos Utilizados</TableHead>
                    <TableHead className="font-semibold">Destino / Empréstimo</TableHead>
                    {canEdit && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {records.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-muted-foreground">
                        {r.date ? format(r.date as Date, 'dd/MM/yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-foreground">
                        {r.stakeLocation}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          r.operation === 'Escavação / Corte' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                          r.operation === 'Aterro Compactado' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          'bg-muted text-muted-foreground'
                        }>
                          {r.operation}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.materialType}</TableCell>
                      <TableCell className="font-mono font-bold text-right text-foreground">
                        {r.volumeM3.toLocaleString('pt-AO')}
                      </TableCell>
                      <TableCell className="font-mono text-right text-muted-foreground">
                        {r.loadTrips || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[200px]" title={r.equipmentUsed}>
                        {r.equipmentUsed}
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[150px]">
                        {r.borrowPitName || '-'}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}>
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
              <Shovel className="h-5 w-5 text-primary" />
              Lançar Apontamento de Terraplanagem
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registe a produção diária de escavação, corte, aterro ou transporte.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Localização por Estacas *</Label>
              <Input
                value={stakeLocation}
                onChange={(e) => setStakeLocation(e.target.value)}
                placeholder="Ex: Km 3+150 - Km 3+600 (Plena Faixa)"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Operação *</Label>
                <Select value={operation} onValueChange={(val) => setOperation(val as EarthworkOperation)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Desmatação / Limpeza">Desmatação / Limpeza</SelectItem>
                    <SelectItem value="Escavação / Corte">Escavação / Corte</SelectItem>
                    <SelectItem value="Aterro Compactado">Aterro Compactado</SelectItem>
                    <SelectItem value="Regularização de Leito">Regularização de Leito</SelectItem>
                    <SelectItem value="Transporte a Bota-Fora">Transporte a Bota-Fora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Classificação do Solo</Label>
                <Select value={materialType} onValueChange={(val) => setMaterialType(val as EarthworkMaterial)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solo Comum (1ª Categoria)">Solo Comum (1ª Categoria)</SelectItem>
                    <SelectItem value="Solo Rocha Branda (2ª Categoria)">Solo Rocha Branda (2ª Categoria)</SelectItem>
                    <SelectItem value="Rocha Viva / Desmonte (3ª Categoria)">Rocha Viva / Desmonte (3ª Categoria)</SelectItem>
                    <SelectItem value="Solo de Empréstimo Selecionado">Solo de Empréstimo Selecionado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Volume Produzido (m³) *</Label>
                <Input
                  type="number"
                  step="1"
                  value={volumeM3}
                  onChange={(e) => setVolumeM3(e.target.value)}
                  placeholder="Ex: 1450"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Número de Carradas / Viagens</Label>
                <Input
                  type="number"
                  value={loadTrips}
                  onChange={(e) => setLoadTrips(e.target.value)}
                  placeholder="Ex: 72"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Equipamentos Envolvidos</Label>
              <Input
                value={equipmentUsed}
                onChange={(e) => setEquipmentUsed(e.target.value)}
                placeholder="Ex: Motoniveladora CAT 140K, Rolo Compactador Dynapac"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Bota-Fora / Jazigo de Empréstimo</Label>
              <Input
                value={borrowPitName}
                onChange={(e) => setBorrowPitName(e.target.value)}
                placeholder="Ex: Bota-Fora KM 4 Sul"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notas e Condições de Campo</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Solo com elevada humidade natural devido a chuvas anteriores."
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Lançar Volume
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
