'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type CompactionTest, type RoadTestType, type RoadTestStatus } from '@/types/road';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, FlaskConical, Trash2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { UserRole } from '@/app/projects/[id]/page';

interface CompactionTestsTabProps {
  projectId: string;
  userRole: UserRole | null;
}

const TEST_STATUS_COLORS: Record<RoadTestStatus, string> = {
  'Aprovado': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'Reprovado': 'bg-destructive/10 text-destructive border-destructive/20',
  'Condicional': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'Em Análise': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
};

export default function CompactionTestsTab({ projectId, userRole }: CompactionTestsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = userRole === 'Gestor' || userRole === 'Editor';

  const [tests, setTests] = useState<CompactionTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [testNumber, setTestNumber] = useState('');
  const [stakeLocation, setStakeLocation] = useState('Km 4+150 (Eixo)');
  const [layerType, setLayerType] = useState<'Leito do Aterro' | 'Sub-Leito' | 'Sub-Base' | 'Base' | 'Solo Natural'>('Sub-Base');
  const [testType, setTestType] = useState<RoadTestType>('Densidade In Situ (Frasco de Areia)');
  const [requiredCompactionDegree, setRequiredCompactionDegree] = useState('98');
  const [measuredCompactionDegree, setMeasuredCompactionDegree] = useState('98.6');
  const [optimumMoisturePercentage, setOptimumMoisturePercentage] = useState('8.4');
  const [inSituMoisturePercentage, setInSituMoisturePercentage] = useState('8.1');
  const [cbrValue, setCbrValue] = useState('65');
  const [laboratoryTech, setLaboratoryTech] = useState('');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const q = query(
      collection(db, 'projects', projectId, 'compactionTests'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date || Date.now()),
        } as CompactionTest;
      });
      setTests(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching compaction tests:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os ensaios.', variant: 'destructive' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, toast]);

  const handleOpenCreate = () => {
    setTestNumber(`ENS-EST-${new Date().getFullYear()}-${String(tests.length + 1).padStart(3, '0')}`);
    setStakeLocation('Km 4+200 (Faixa Direita)');
    setRequiredCompactionDegree('98');
    setMeasuredCompactionDegree('98.4');
    setOptimumMoisturePercentage('8.5');
    setInSituMoisturePercentage('8.2');
    setCbrValue('60');
    setLaboratoryTech(user?.displayName || 'Técnico de Laboratório Geotécnico');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja eliminar este boletim de ensaio?')) return;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'compactionTests', id));
      toast({ title: 'Ensaio Eliminado', description: 'Boletim removido do histórico.' });
    } catch {
      toast({ title: 'Erro', description: 'Falha ao eliminar ensaio.', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber || !stakeLocation) {
      toast({ title: 'Campos Obrigatórios', description: 'Preencha o número do boletim e a localização.', variant: 'destructive' });
      return;
    }

    const reqComp = parseFloat(requiredCompactionDegree) || 95;
    const measComp = parseFloat(measuredCompactionDegree) || 0;

    let computedStatus: RoadTestStatus = 'Aprovado';
    if (measComp < reqComp - 2) {
      computedStatus = 'Reprovado';
    } else if (measComp < reqComp) {
      computedStatus = 'Condicional';
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'projects', projectId, 'compactionTests'), {
        testNumber,
        stakeLocation,
        layerType,
        testType,
        requiredCompactionDegree: reqComp,
        measuredCompactionDegree: measComp,
        optimumMoisturePercentage: parseFloat(optimumMoisturePercentage) || 0,
        inSituMoisturePercentage: parseFloat(inSituMoisturePercentage) || 0,
        cbrValue: cbrValue ? parseFloat(cbrValue) : null,
        status: computedStatus,
        laboratoryTech: laboratoryTech || 'Técnico Geotécnico',
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        author: {
          uid: user?.uid || 'anonymous',
          displayName: user?.displayName || 'Laboratório de Vias',
        },
      });

      toast({ title: 'Boletim Registado', description: `Ensaio ${testNumber} guardado como: ${computedStatus}.` });
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao guardar ensaio.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // KPIs
  const totalTests = tests.length;
  const approvedTests = tests.filter(t => t.status === 'Aprovado').length;
  const rejectedTests = tests.filter(t => t.status === 'Reprovado').length;
  const complianceRate = totalTests > 0 ? ((approvedTests / totalTests) * 100).toFixed(1) : '100';

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Total de Ensaios</div>
          <div className="text-2xl font-bold font-mono mt-1 text-foreground">{totalTests}</div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Taxa de Conformidade</div>
          <div className="text-2xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
            {complianceRate}%
          </div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Ensaios Aprovados</div>
          <div className="text-2xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
            {approvedTests}
          </div>
        </Card>
        <Card className="p-4 bg-card border shadow-sm">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Não Conformidades (Reprovados)</div>
          <div className="text-2xl font-bold font-mono mt-1 text-destructive">
            {rejectedTests}
          </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-bold font-headline flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" /> Ensaios Geotécnicos & Controlo de Compactação
            </CardTitle>
            <CardDescription className="text-xs">
              Acompanhamento de ensaios laboratoriais e in situ: Proctor Modificado (AASHTO T-180), Frasco de Areia, CBR e Viga Benkelman.
            </CardDescription>
          </div>
          {canEdit && (
            <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 rounded-lg">
              <Plus className="h-4 w-4" /> Registar Ensaio
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl space-y-3">
              <FlaskConical className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <h3 className="font-semibold text-sm">Nenhum ensaio geotécnico registado</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Lance os boletins de ensaio para comprovar o grau de compactação das camadas de aterro, sub-base e base da estrada.
              </p>
              {canEdit && (
                <Button onClick={handleOpenCreate} size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Registar Primeiro Ensaio
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-xl">
              <Table>
                <TableHeader className="bg-muted/40 text-xs">
                  <TableRow>
                    <TableHead className="font-semibold">Nº Boletim</TableHead>
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Estaca / Local</TableHead>
                    <TableHead className="font-semibold">Camada</TableHead>
                    <TableHead className="font-semibold">Tipo de Ensaio</TableHead>
                    <TableHead className="font-semibold text-right">Grau Exigido</TableHead>
                    <TableHead className="font-semibold text-right">Grau Obtido</TableHead>
                    <TableHead className="font-semibold text-right">Humidade (Ótima / In Situ)</TableHead>
                    <TableHead className="font-semibold text-right">CBR</TableHead>
                    <TableHead className="font-semibold">Resultado</TableHead>
                    {canEdit && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {tests.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-bold text-primary">{t.testNumber}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {t.date ? format(t.date as Date, 'dd/MM/yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">{t.stakeLocation}</TableCell>
                      <TableCell>{t.layerType}</TableCell>
                      <TableCell className="text-muted-foreground">{t.testType}</TableCell>
                      <TableCell className="font-mono text-right">{t.requiredCompactionDegree}%</TableCell>
                      <TableCell className="font-mono font-bold text-right text-foreground">
                        {t.measuredCompactionDegree}%
                      </TableCell>
                      <TableCell className="font-mono text-right text-muted-foreground">
                        {t.optimumMoisturePercentage}% / {t.inSituMoisturePercentage}%
                      </TableCell>
                      <TableCell className="font-mono text-right">
                        {t.cbrValue ? `${t.cbrValue}%` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TEST_STATUS_COLORS[t.status] || ''}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
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
              <FlaskConical className="h-5 w-5 text-primary" />
              Registar Boletim de Ensaio Geotécnico
            </DialogTitle>
            <DialogDescription className="text-xs">
              Introduza os valores medidos de massa volúmica seca, humidade e grau de compactação.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nº do Boletim *</Label>
                <Input
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  placeholder="Ex: ENS-EST-2026-001"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Localização por Estaca *</Label>
                <Input
                  value={stakeLocation}
                  onChange={(e) => setStakeLocation(e.target.value)}
                  placeholder="Ex: Km 4+150 (Eixo)"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Camada Estrutural</Label>
                <Select value={layerType} onValueChange={(val: any) => setLayerType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solo Natural">Solo Natural</SelectItem>
                    <SelectItem value="Leito do Aterro">Leito do Aterro</SelectItem>
                    <SelectItem value="Sub-Leito">Sub-Leito</SelectItem>
                    <SelectItem value="Sub-Base">Sub-Base</SelectItem>
                    <SelectItem value="Base">Base</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Método de Ensaio</Label>
                <Select value={testType} onValueChange={(val: any) => setTestType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Densidade In Situ (Frasco de Areia)">Frasco de Areia</SelectItem>
                    <SelectItem value="Massa Volúmica / Densímetro Nuclear">Densímetro Nuclear</SelectItem>
                    <SelectItem value="Proctor Modificado">Proctor Modificado</SelectItem>
                    <SelectItem value="Ensaio CBR (California Bearing Ratio)">Ensaio CBR</SelectItem>
                    <SelectItem value="Viga Benkelman (Deflexão)">Viga Benkelman</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Grau de Compactação Exigido (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={requiredCompactionDegree}
                  onChange={(e) => setRequiredCompactionDegree(e.target.value)}
                  placeholder="98"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Grau Obtido In Situ (%) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={measuredCompactionDegree}
                  onChange={(e) => setMeasuredCompactionDegree(e.target.value)}
                  placeholder="98.6"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Humidade Ótima (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={optimumMoisturePercentage}
                  onChange={(e) => setOptimumMoisturePercentage(e.target.value)}
                  placeholder="8.4"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Humidade In Situ (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={inSituMoisturePercentage}
                  onChange={(e) => setInSituMoisturePercentage(e.target.value)}
                  placeholder="8.1"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor CBR (%)</Label>
                <Input
                  type="number"
                  step="1"
                  value={cbrValue}
                  onChange={(e) => setCbrValue(e.target.value)}
                  placeholder="65"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Técnico Laboratorista / Engenheiro de Controlo</Label>
              <Input
                value={laboratoryTech}
                onChange={(e) => setLaboratoryTech(e.target.value)}
                placeholder="Ex: Manuel Agostinho (Laboratório Central)"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Registar Ensaio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
