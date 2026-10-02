'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type PavingRecord, type PavingLayerType } from '@/types/road';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Layers, Trash2, Thermometer, CloudSun } from 'lucide-react';
import { format } from 'date-fns';
import type { UserRole } from '@/app/projects/[id]/page';

interface PavingControlTabProps {
  projectId: string;
  userRole: UserRole | null;
}

export default function PavingControlTab({ projectId, userRole }: PavingControlTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = userRole === 'Gestor' || userRole === 'Editor';

  const [records, setRecords] = useState<PavingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [startStake, setStartStake] = useState('Km 6+200');
  const [endStake, setEndStake] = useState('Km 6+950');
  const [lane, setLane] = useState<'Via Esquerda' | 'Via Direita' | 'Plena Faixa' | 'Banqueta / Acostamento'>('Plena Faixa');
  const [layerType, setLayerType] = useState<PavingLayerType>('Betão Asfáltico (Capa de Rolamento BB 0/14)');
  const [temperatureMixingC, setTemperatureMixingC] = useState('160');
  const [temperatureApplicationC, setTemperatureApplicationC] = useState('145');
  const [thicknessCm, setThicknessCm] = useState('5.0');
  const [areaM2, setAreaM2] = useState('7875');
  const [tonnageTons, setTonnageTons] = useState('945');
  const [asphaltPlantSource, setAsphaltPlantSource] = useState('Central Asfáltica Marçal / Viana');
  const [weatherCondition, setWeatherCondition] = useState('Tempo Aberto / Sol (28°C)');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const q = query(
      collection(db, 'projects', projectId, 'pavingRecords'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date || Date.now()),
        } as PavingRecord;
      });
      setRecords(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching paving records:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os registos de pavimentação.', variant: 'destructive' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, toast]);

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja eliminar este apontamento de pavimentação?')) return;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'pavingRecords', id));
      toast({ title: 'Registo Eliminado', description: 'Apontamento removido com sucesso.' });
    } catch {
      toast({ title: 'Erro', description: 'Falha ao eliminar registo.', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startStake || !endStake || !areaM2) {
      toast({ title: 'Campos Obrigatórios', description: 'Preencha as estacas e a área pavimentada.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'projects', projectId, 'pavingRecords'), {
        startStake,
        endStake,
        lane,
        layerType,
        temperatureMixingC: parseFloat(temperatureMixingC) || null,
        temperatureApplicationC: parseFloat(temperatureApplicationC) || null,
        thicknessCm: parseFloat(thicknessCm) || 5.0,
        areaM2: parseFloat(areaM2) || 0,
        tonnageTons: parseFloat(tonnageTons) || 0,
        asphaltPlantSource: asphaltPlantSource || '',
        weatherCondition: weatherCondition || '',
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        author: {
          uid: user?.uid || 'anonymous',
          displayName: user?.displayName || 'Encarregado de Pavimentação',
        },
      });

      toast({ title: 'Pavimentação Registada', description: 'Apontamento de massa asfáltica lançado com sucesso.' });
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao guardar apontamento.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // KPIs
  const totalAreaM2 = records.reduce((acc, r) => acc + (r.areaM2 || 0), 0);
  const totalTons = records.reduce((acc, r) => acc + (r.tonnageTons || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Total de Lançamentos</div>
          <div className="text-2xl font-bold font-mono mt-1 text-foreground">{records.length}</div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Área Pavimentada Total</div>
          <div className="text-2xl font-bold font-mono mt-1 text-primary">
            {totalAreaM2.toLocaleString('pt-AO')} m²
          </div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Massa Asfáltica Aplicada</div>
          <div className="text-2xl font-bold font-mono mt-1 text-foreground">
            {totalTons.toLocaleString('pt-AO')} Ton
          </div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Taxa Média de Aplicação</div>
          <div className="text-2xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
            {totalAreaM2 > 0 ? ((totalTons * 1000) / totalAreaM2).toFixed(1) : '0'} kg/m²
          </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-bold font-headline flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Pavimentação & Camadas Betuminosas
            </CardTitle>
            <CardDescription className="text-xs">
              Acompanhamento de imprimação betuminosa, rega de colagem, base britada e capa de rolamento (temperaturas, espessuras e tonelagens).
            </CardDescription>
          </div>
          {canEdit && (
            <Button onClick={() => setIsDialogOpen(true)} size="sm" className="gap-1.5 rounded-lg">
              <Plus className="h-4 w-4" /> Novo Lançamento de Pavimento
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
              <Layers className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <h3 className="font-semibold text-sm">Nenhum apontamento de pavimentação</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Registe os lotes de massa asfáltica ou sub-base aplicados pela vibroacabadora.
              </p>
              {canEdit && (
                <Button onClick={() => setIsDialogOpen(true)} size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Criar Primeiro Apontamento
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-xl">
              <Table>
                <TableHeader className="bg-muted/40 text-xs">
                  <TableRow>
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Estacas (Troço)</TableHead>
                    <TableHead className="font-semibold">Faixa / Via</TableHead>
                    <TableHead className="font-semibold">Camada Aplicada</TableHead>
                    <TableHead className="font-semibold text-right">Espessura (cm)</TableHead>
                    <TableHead className="font-semibold text-right">Área (m²)</TableHead>
                    <TableHead className="font-semibold text-right">Massa (Ton)</TableHead>
                    <TableHead className="font-semibold">Temperatura Espalhamento</TableHead>
                    <TableHead className="font-semibold">Condição Meteorológica</TableHead>
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
                        {r.startStake} &rarr; {r.endStake}
                      </TableCell>
                      <TableCell>{r.lane}</TableCell>
                      <TableCell className="font-medium text-foreground">{r.layerType}</TableCell>
                      <TableCell className="font-mono text-right">{r.thicknessCm} cm</TableCell>
                      <TableCell className="font-mono text-right font-semibold">
                        {r.areaM2.toLocaleString('pt-AO')}
                      </TableCell>
                      <TableCell className="font-mono text-right font-bold text-foreground">
                        {r.tonnageTons.toLocaleString('pt-AO')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.temperatureApplicationC ? (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                            <Thermometer className="h-3 w-3" /> {r.temperatureApplicationC}°C
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs truncate max-w-[150px]">
                        {r.weatherCondition || '-'}
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
              <Layers className="h-5 w-5 text-primary" />
              Lançar Apontamento de Pavimentação
            </DialogTitle>
            <DialogDescription className="text-xs">
              Introduza as estacas, temperaturas da mistura betuminosa e tonelagem aplicada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estaca Inicial *</Label>
                <Input
                  value={startStake}
                  onChange={(e) => setStartStake(e.target.value)}
                  placeholder="Ex: Km 6+200"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estaca Final *</Label>
                <Input
                  value={endStake}
                  onChange={(e) => setEndStake(e.target.value)}
                  placeholder="Ex: Km 6+950"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Faixa / Via</Label>
                <Select value={lane} onValueChange={(val: any) => setLane(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Plena Faixa">Plena Faixa (Ambas as vias)</SelectItem>
                    <SelectItem value="Via Esquerda">Via Esquerda</SelectItem>
                    <SelectItem value="Via Direita">Via Direita</SelectItem>
                    <SelectItem value="Banqueta / Acostamento">Banqueta / Acostamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Camada Betuminosa</Label>
                <Select value={layerType} onValueChange={(val: any) => setLayerType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sub-Base Granular">Sub-Base Granular</SelectItem>
                    <SelectItem value="Base Britada (BGS)">Base Britada (BGS)</SelectItem>
                    <SelectItem value="Imprimação Betuminosa (CM-30)">Imprimação (CM-30)</SelectItem>
                    <SelectItem value="Rega de Colagem (Emulsão ECR)">Rega de Colagem (ECR)</SelectItem>
                    <SelectItem value="Macadame Betuminoso">Macadame Betuminoso</SelectItem>
                    <SelectItem value="Betão Asfáltico (Capa de Rolamento BB 0/14)">Betão Asfáltico (Capa BB 0/14)</SelectItem>
                    <SelectItem value="Micromacadame a Frio">Micromacadame a Frio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Espessura (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={thicknessCm}
                  onChange={(e) => setThicknessCm(e.target.value)}
                  placeholder="5.0"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Área (m²) *</Label>
                <Input
                  type="number"
                  step="1"
                  value={areaM2}
                  onChange={(e) => setAreaM2(e.target.value)}
                  placeholder="7875"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tonelagem (Ton)</Label>
                <Input
                  type="number"
                  step="1"
                  value={tonnageTons}
                  onChange={(e) => setTonnageTons(e.target.value)}
                  placeholder="945"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Temp. Saída Central (°C)</Label>
                <Input
                  type="number"
                  value={temperatureMixingC}
                  onChange={(e) => setTemperatureMixingC(e.target.value)}
                  placeholder="160"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Temp. Espalhamento (°C)</Label>
                <Input
                  type="number"
                  value={temperatureApplicationC}
                  onChange={(e) => setTemperatureApplicationC(e.target.value)}
                  placeholder="145"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Central Fornecedora</Label>
                <Input
                  value={asphaltPlantSource}
                  onChange={(e) => setAsphaltPlantSource(e.target.value)}
                  placeholder="Central Asfáltica Marçal"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Condição Meteorológica</Label>
                <Input
                  value={weatherCondition}
                  onChange={(e) => setWeatherCondition(e.target.value)}
                  placeholder="Sol / 28°C"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Lançar Pavimentação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
