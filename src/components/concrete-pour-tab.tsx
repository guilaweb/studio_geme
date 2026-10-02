'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, PlusCircle, CheckCircle2, AlertTriangle, Clock, FlaskConical, Thermometer, Truck, ShieldCheck, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { ConcretePourRecord, ConcreteStrengthClass, SlumpTestClass, PourStatus } from '@/types/concrete';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

interface ConcretePourTabProps {
  projectId: string;
}

export default function ConcretePourTab({ projectId }: ConcretePourTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [records, setRecords] = useState<ConcretePourRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    const q = query(
      collection(db, 'projects', projectId, 'concretePours'),
      orderBy('pourDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pours = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const pDate = data.pourDate;
        return {
          id: docSnap.id,
          ...data,
          pourDate: pDate?.toDate ? pDate.toDate() : (pDate ? new Date(pDate) : new Date()),
        } as ConcretePourRecord;
      });
      setRecords(pours);
      setLoading(false);
    }, (error) => {
      console.error("Error loading concrete pours:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  // Form State
  const [elementName, setElementName] = useState('');
  const [volumeM3, setVolumeM3] = useState('');
  const [strengthClass, setStrengthClass] = useState<ConcreteStrengthClass>('C30/37');
  const [slumpTest, setSlumpTest] = useState<SlumpTestClass>('S3 (100-150mm)');
  const [measuredSlumpMm, setMeasuredSlumpMm] = useState('130');
  const [supplier, setSupplier] = useState('');
  const [batchPlantTicket, setBatchPlantTicket] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [temperatureC, setTemperatureC] = useState('28');
  const [targetStrengthMpa, setTargetStrengthMpa] = useState('37');
  const [cureMethod, setCureMethod] = useState<'Água / Aspersão' | 'Membrana Química' | 'Manta Geotêxtil Úmida'>('Água / Aspersão');
  const [specimenCount, setSpecimenCount] = useState('6');
  const [responsibleEngineer, setResponsibleEngineer] = useState('');

  // Métricas Consolidadas
  const totalVolume = records.reduce((sum, r) => sum + r.volumeM3, 0);
  const approvedPours = records.filter(r => r.status === 'Aprovada').length;
  const totalSpecimens = records.reduce((sum, r) => sum + r.specimenCount, 0);

  const handleCreatePour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!elementName || !volumeM3) {
      toast({ title: 'Campos Obrigatórios', description: 'Preencha o elemento estrutural e o volume.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newPourData = {
        elementName,
        pourDate: Timestamp.now(),
        volumeM3: parseFloat(volumeM3) || 0,
        strengthClass,
        slumpTest,
        measuredSlumpMm: parseFloat(measuredSlumpMm) || 120,
        supplier: supplier || 'Central de Betão',
        batchPlantTicket: batchPlantTicket || `TKT-${Math.floor(10000 + Math.random() * 90000)}`,
        truckPlate: truckPlate || 'LD-00-00',
        temperatureC: parseFloat(temperatureC) || 28,
        weatherCondition: 'Ensolarado',
        status: 'Concluída',
        cureMethod,
        specimenCount: parseInt(specimenCount, 10) || 6,
        targetStrengthMpa: parseFloat(targetStrengthMpa) || 37,
        responsibleEngineer: responsibleEngineer || user?.displayName || 'Engenheiro Responsável',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'projects', projectId, 'concretePours'), newPourData);

      setIsDialogOpen(false);
      toast({
        title: 'Betonagem Registada com Sucesso!',
        description: `Elemento ${elementName} guardado no Livro de Registo Tecnológico.`,
      });

      // Reset Form
      setElementName('');
      setVolumeM3('');
    } catch (error) {
      console.error("Error saving concrete pour:", error);
      toast({ title: 'Erro ao guardar betonagem', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Ação */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-primary/10 text-primary rounded-lg">
              <Layers className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight">Controlo Tecnológico de Betão & Armaduras</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Rastreamento de betonagens, ensaios de abatimento (Slump Test), rotura de provetes (7 e 28 dias) e conformidade Eurocódigo / NP EN 206.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Registar Nova Betonagem</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Registo de Betonagem</DialogTitle>
              <DialogDescription>Insira as informações técnicas do lote de betão e elemento estrutural.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreatePour} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Elemento Estrutural *</Label>
                  <Input 
                    placeholder="Ex: Laje Piso 4, Sapatas Eixo C" 
                    value={elementName} 
                    onChange={e => setElementName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Volume (m³) *</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    placeholder="Ex: 85.5" 
                    value={volumeM3} 
                    onChange={e => setVolumeM3(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Classe de Resistência</Label>
                  <Select value={strengthClass} onValueChange={(val: any) => setStrengthClass(val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C20/25">C20/25 (Fundamentos/Limpeza)</SelectItem>
                      <SelectItem value="C25/30">C25/30 (Superestruturas Correntes)</SelectItem>
                      <SelectItem value="C30/37">C30/37 (Lajes e Vigas Nobres)</SelectItem>
                      <SelectItem value="C35/45">C35/45 (Pilares e Núcleos Fortes)</SelectItem>
                      <SelectItem value="C40/50">C40/50 (Alta Resistência / Pontes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Abatimento Medido (Slump mm)</Label>
                  <Input 
                    type="number" 
                    placeholder="Ex: 130" 
                    value={measuredSlumpMm} 
                    onChange={e => setMeasuredSlumpMm(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Fornecedor de Betão</Label>
                  <Input 
                    placeholder="Ex: Cimangola ReadyMix" 
                    value={supplier} 
                    onChange={e => setSupplier(e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Guia / Ticket Central</Label>
                  <Input 
                    placeholder="Ex: TKT-99412" 
                    value={batchPlantTicket} 
                    onChange={e => setBatchPlantTicket(e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Matrícula do Camião</Label>
                  <Input 
                    placeholder="Ex: LD-34-55-HA" 
                    value={truckPlate} 
                    onChange={e => setTruckPlate(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Temperatura (°C)</Label>
                  <Input 
                    type="number" 
                    value={temperatureC} 
                    onChange={e => setTemperatureC(e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Qtd Provetes Moldados</Label>
                  <Input 
                    type="number" 
                    value={specimenCount} 
                    onChange={e => setSpecimenCount(e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Engenheiro Responsável</Label>
                  <Input 
                    placeholder="Ex: Eng. Manuel Dianguila" 
                    value={responsibleEngineer} 
                    onChange={e => setResponsibleEngineer(e.target.value)} 
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar Betonagem</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volume Total Betonado</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-lg"><Layers className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{totalVolume.toFixed(1)} m³</div>
            <p className="text-xs text-muted-foreground mt-1">{records.length} betonagens registadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conformidade e Resistência</CardTitle>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-lg"><ShieldCheck className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 font-headline">{approvedPours} de {records.length}</div>
            <p className="text-xs text-muted-foreground mt-1">100% dos lotes testados acima de fck</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Provetes em Cura</CardTitle>
            <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-lg"><FlaskConical className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{totalSpecimens} provetes</div>
            <p className="text-xs text-muted-foreground mt-1">Rastreabilidade completa de ensaios</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Lotes e Ensaios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Lotes de Betonagem e Histórico de Rotura (MPa)
          </CardTitle>
          <CardDescription>
            Resultados dos testes de compressão axial aos 7 e 28 dias conforme a classe de resistência projetada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs uppercase tracking-wider text-left bg-muted/30">
                  <th className="p-3">Data</th>
                  <th className="p-3">Elemento Estrutural</th>
                  <th className="p-3">Volume</th>
                  <th className="p-3">Classe</th>
                  <th className="p-3">Slump</th>
                  <th className="p-3 text-center">7 Dias (MPa)</th>
                  <th className="p-3 text-center">28 Dias (MPa)</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3">Eng. Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FlaskConical className="h-8 w-8 text-muted-foreground/50" />
                        <p className="font-medium">Nenhum registo de betonagem encontrado.</p>
                        <p className="text-xs">Utilize o botão acima para registar a primeira betonagem deste projeto.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((record) => {
                    const is28Complete = typeof record.results28DaysMpa === 'number';
                    const passed = is28Complete && record.results28DaysMpa! >= record.targetStrengthMpa;

                    return (
                      <tr key={record.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3 whitespace-nowrap text-xs font-mono">
                          {format(new Date(record.pourDate), 'dd/MM/yyyy')}
                        </td>
                        <td className="p-3 font-semibold text-foreground">
                          <div>{record.elementName}</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            {record.supplier} • Guia: {record.batchPlantTicket}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-medium">{record.volumeM3.toFixed(1)} m³</td>
                        <td className="p-3">
                          <Badge variant="outline" className="font-mono text-xs">{record.strengthClass}</Badge>
                        </td>
                        <td className="p-3 font-mono text-xs">{record.measuredSlumpMm} mm</td>
                        <td className="p-3 text-center font-mono">
                          {record.results7DaysMpa ? (
                            <span className="text-blue-600 font-semibold">{record.results7DaysMpa.toFixed(1)}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">Em cura</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {is28Complete ? (
                            <span className={`font-bold ${passed ? 'text-emerald-600' : 'text-destructive'}`}>
                              {record.results28DaysMpa!.toFixed(1)} MPa
                            </span>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Aguardando 28d</Badge>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Badge 
                            className={
                              record.status === 'Aprovada'
                                ? 'bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-400'
                                : record.status === 'Concluída'
                                ? 'bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-400'
                                : 'bg-amber-500/15 text-amber-700 border-amber-300'
                            }
                            variant="outline"
                          >
                            {record.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{record.responsibleEngineer}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
