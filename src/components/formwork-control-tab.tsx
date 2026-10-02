'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PlusCircle, Layers, CheckCircle2, XCircle, AlertTriangle, Clock,
  Wrench, Package, BarChart3, CalendarClock, ArrowRightLeft, Loader2
} from 'lucide-react';
import type { FormworkRecord, FormworkType, AlignmentStatus, FormworkStatus, FormworkInventoryItem } from '@/types/formwork';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

// ─── Demo data ────────────────────────────────────────────────────────────────

const TOLERANCE_MM = 5; // Tolerância de prumo/nível em mm

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<FormworkStatus, { label: string; color: string; icon: React.ElementType }> = {
  in_use:      { label: 'Em Uso',       color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: Clock },
  available:   { label: 'Disponível',   color: 'bg-green-100 text-green-800 border-green-200',    icon: CheckCircle2 },
  maintenance: { label: 'Manutenção',   color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
  scrapped:    { label: 'Abatido',      color: 'bg-red-100 text-red-800 border-red-200',          icon: XCircle },
};

const alignmentConfig: Record<AlignmentStatus, { label: string; color: string }> = {
  approved: { label: 'Conforme',  color: 'bg-green-100 text-green-800 border-green-200' },
  adjusted: { label: 'Ajustado',  color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  rejected: { label: 'Reprovado', color: 'bg-red-100 text-red-800 border-red-200' },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface FormworkControlTabProps {
  projectId: string;
}

export default function FormworkControlTab({ projectId }: FormworkControlTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<FormworkRecord[]>([]);
  const [inventory, setInventory] = useState<FormworkInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const qRecords = query(
      collection(db, 'projects', projectId, 'formworkRecords'),
      orderBy('createdAt', 'desc')
    );

    const qInventory = query(
      collection(db, 'projects', projectId, 'formworkInventory')
    );

    const unsubRecords = onSnapshot(qRecords, (snapshot) => {
      setRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FormworkRecord)));
      setLoading(false);
    }, (error) => {
      console.error("Error loading formwork records:", error);
      setLoading(false);
    });

    const unsubInventory = onSnapshot(qInventory, (snapshot) => {
      setInventory(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FormworkInventoryItem)));
    }, (error) => {
      console.error("Error loading formwork inventory:", error);
    });

    return () => {
      unsubRecords();
      unsubInventory();
    };
  }, [projectId]);

  // Form state
  const [formElement, setFormElement] = useState('');
  const [formFloor, setFormFloor] = useState('');
  const [formType, setFormType] = useState<FormworkType>('metal');
  const [formSupplier, setFormSupplier] = useState('');
  const [formInstallDate, setFormInstallDate] = useState('');
  const [formStripDate, setFormStripDate] = useState('');
  const [formVertical, setFormVertical] = useState('');
  const [formHorizontal, setFormHorizontal] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formReuseCount, setFormReuseCount] = useState('');
  const [formReleasingAgent, setFormReleasingAgent] = useState('');
  const [formReleasingApplied, setFormReleasingApplied] = useState(true);
  const [formBracingOk, setFormBracingOk] = useState(true);
  const [formAccessOk, setFormAccessOk] = useState(true);
  const [formEngineer, setFormEngineer] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // KPIs
  const inUse = records.filter(r => r.status === 'in_use').length;
  const available = records.filter(r => r.status === 'available').length;
  const totalArea = records.reduce((s, r) => s + r.formworkArea, 0);
  const areaInUse = records.filter(r => r.status === 'in_use').reduce((s, r) => s + r.formworkArea, 0);
  const outOfTolerance = records.filter(r =>
    r.verticalAlignmentMm > TOLERANCE_MM || r.horizontalAlignmentMm > TOLERANCE_MM
  ).length;

  const deriveAlignmentStatus = (v: number, h: number): AlignmentStatus => {
    const max = Math.max(v, h);
    if (max <= TOLERANCE_MM) return 'approved';
    if (max <= TOLERANCE_MM * 2) return 'adjusted';
    return 'rejected';
  };

  const handleSave = async () => {
    if (!formElement.trim()) {
      toast({ title: 'Campo Obrigatório', description: 'Indique o elemento estrutural da cofragem.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const v = parseFloat(formVertical) || 0;
      const h = parseFloat(formHorizontal) || 0;
      const newRecordData = {
        projectId,
        recordNumber: `COF-${String(records.length + 1).padStart(3, '0')}`,
        element: formElement,
        floor: formFloor || 'Piso Térreo',
        formworkType: formType,
        supplier: formSupplier || 'Cofragens de Angola',
        installDate: formInstallDate || new Date().toISOString().split('T')[0],
        plannedStripDate: formStripDate || new Date().toISOString().split('T')[0],
        verticalAlignmentMm: v,
        horizontalAlignmentMm: h,
        alignmentStatus: deriveAlignmentStatus(v, h),
        reuseCount: parseInt(formReuseCount) || 0,
        maxReuseAllowed: 50,
        condition: 'good',
        formworkArea: parseFloat(formArea) || 0,
        releasingAgent: formReleasingAgent || 'Desmoldante Ecológico',
        releasingAgentApplied: formReleasingApplied,
        bracingOk: formBracingOk,
        accessOk: formAccessOk,
        notes: formNotes,
        responsibleEngineer: formEngineer || user?.displayName || 'Engenheiro de Estruturas',
        status: 'in_use',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'projects', projectId, 'formworkRecords'), newRecordData);

      setIsDialogOpen(false);
      resetForm();
      toast({
        title: 'Cofragem Registada!',
        description: `Controlo de cofragem para ${formElement} guardado com sucesso.`,
      });
    } catch (error) {
      console.error("Error saving formwork record:", error);
      toast({ title: 'Erro ao guardar cofragem', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormElement(''); setFormFloor(''); setFormType('metal'); setFormSupplier('');
    setFormInstallDate(''); setFormStripDate(''); setFormVertical(''); setFormHorizontal('');
    setFormArea(''); setFormReuseCount(''); setFormReleasingAgent('');
    setFormReleasingApplied(true); setFormBracingOk(true); setFormAccessOk(true);
    setFormEngineer(''); setFormNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-amber-600" />
            Controlo de Cofragem
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gestão de cofragem, escoramentos, verificações de prumo/nível e inventário de painéis
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white">
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Cofragem
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Em Utilização</div>
            <div className="text-3xl font-bold text-blue-700">{inUse}</div>
            <div className="text-xs text-muted-foreground mt-1">{areaInUse} m² de cofragem ativa</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Disponíveis</div>
            <div className="text-3xl font-bold text-green-700">{available}</div>
            <div className="text-xs text-muted-foreground mt-1">Prontas para reutilização</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Área Total Gerida</div>
            <div className="text-3xl font-bold text-orange-700">{totalArea.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground mt-1">m² de cofragem no projeto</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Fora de Tolerância</div>
            <div className="text-3xl font-bold text-red-700">{outOfTolerance}</div>
            <div className="text-xs text-muted-foreground mt-1">Desvio &gt; {TOLERANCE_MM}mm (prumo/nível)</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Records + Inventory */}
      <Tabs defaultValue="records">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="records" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Registos de Cofragem
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventário de Painéis
          </TabsTrigger>
        </TabsList>

        {/* Records Table */}
        <TabsContent value="records">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Registo</TableHead>
                    <TableHead>Elemento</TableHead>
                    <TableHead>Piso</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Área (m²)</TableHead>
                    <TableHead>Prumo (mm)</TableHead>
                    <TableHead>Nível (mm)</TableHead>
                    <TableHead>Alinhamento</TableHead>
                    <TableHead>Reutilização</TableHead>
                    <TableHead>Inst.</TableHead>
                    <TableHead>Descofragem</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="p-8 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Layers className="h-8 w-8 text-muted-foreground/50" />
                          <p className="font-medium">Nenhum registo de cofragem encontrado.</p>
                          <p className="text-xs">Registe uma nova montagem ou inspeção de cofragem para este projeto.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((r) => {
                    const sCfg = statusConfig[r.status];
                    const SIcon = sCfg.icon;
                    const aCfg = alignmentConfig[r.alignmentStatus];
                    const reuseRatio = (r.reuseCount / r.maxReuseAllowed) * 100;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm font-medium">{r.recordNumber}</TableCell>
                        <TableCell className="font-medium max-w-[180px] truncate" title={r.element}>{r.element}</TableCell>
                        <TableCell>{r.floor}</TableCell>
                        <TableCell className="capitalize">{r.formworkType}</TableCell>
                        <TableCell>{r.formworkArea} m²</TableCell>
                        <TableCell>
                          <span className={r.verticalAlignmentMm > TOLERANCE_MM ? 'text-red-600 font-semibold' : 'text-green-700'}>
                            {r.verticalAlignmentMm} mm
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={r.horizontalAlignmentMm > TOLERANCE_MM ? 'text-red-600 font-semibold' : 'text-green-700'}>
                            {r.horizontalAlignmentMm} mm
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${aCfg.color} border text-xs`}>{aCfg.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <Progress value={reuseRatio} className="h-2 w-14" />
                            <span className="text-xs text-muted-foreground">{r.reuseCount}x</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{r.installDate}</TableCell>
                        <TableCell className="text-sm">
                          {r.actualStripDate
                            ? <span className="text-green-700">{r.actualStripDate}</span>
                            : <span className="text-muted-foreground">{r.plannedStripDate}*</span>}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${sCfg.color} border text-xs flex items-center gap-1 w-fit`}>
                            <SIcon className="h-3 w-3" />
                            {sCfg.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-600" />
                Inventário de Painéis e Acessórios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Referência</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Dimensões</TableHead>
                      <TableHead>Qtd.</TableHead>
                      <TableHead>Reutilizações</TableHead>
                      <TableHead>Desgaste</TableHead>
                      <TableHead>Último Uso</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="p-8 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Wrench className="h-8 w-8 text-muted-foreground/50" />
                            <p className="font-medium">Nenhum item em inventário registado.</p>
                            <p className="text-xs">Os painéis, escoras e vigas adicionados aparecerão aqui.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      inventory.map((item) => {
                      const sCfg = statusConfig[item.status];
                      const SIcon = sCfg.icon;
                      const usageRatio = (item.reuseCount / item.maxReuseAllowed) * 100;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm font-medium">{item.panelRef}</TableCell>
                          <TableCell className="capitalize">{item.formworkType}</TableCell>
                          <TableCell>{item.dimensions}</TableCell>
                          <TableCell>{item.quantity} un.</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={usageRatio} className="h-2 w-20" />
                              <span className="text-xs text-muted-foreground">{item.reuseCount}/{item.maxReuseAllowed}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={usageRatio > 80 ? 'text-red-600 font-semibold' : usageRatio > 60 ? 'text-yellow-600' : 'text-green-700'}>
                              {usageRatio.toFixed(0)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.lastUsedDate || '—'}</TableCell>
                          <TableCell>
                            <Badge className={`${sCfg.color} border text-xs flex items-center gap-1 w-fit`}>
                              <SIcon className="h-3 w-3" />
                              {sCfg.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Formwork Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-600" />
              Registar Nova Cofragem
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Elemento a Cofrar *</Label>
                <Input placeholder="ex.: Pilares P01-P08, Piso 2" value={formElement} onChange={e => setFormElement(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Piso / Nível *</Label>
                <Input placeholder="ex.: Piso 2, Fundação" value={formFloor} onChange={e => setFormFloor(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo de Cofragem</Label>
                <Select value={formType} onValueChange={v => setFormType(v as FormworkType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metal">Metálica</SelectItem>
                    <SelectItem value="wood">Madeira</SelectItem>
                    <SelectItem value="plastic">Plástica</SelectItem>
                    <SelectItem value="mixed">Mista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fornecedor / Marca</Label>
                <Input placeholder="ex.: Alsina, Ulma, Doka" value={formSupplier} onChange={e => setFormSupplier(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data de Colocação *</Label>
                <Input type="date" value={formInstallDate} onChange={e => setFormInstallDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Data Prevista de Descofragem</Label>
                <Input type="date" value={formStripDate} onChange={e => setFormStripDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Desvio de prumo (mm)</Label>
                <Input type="number" step="0.5" placeholder="mm" value={formVertical} onChange={e => setFormVertical(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Desvio de nível (mm)</Label>
                <Input type="number" step="0.5" placeholder="mm" value={formHorizontal} onChange={e => setFormHorizontal(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Área de cofragem (m²)</Label>
                <Input type="number" placeholder="m²" value={formArea} onChange={e => setFormArea(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Produto desmoldante</Label>
                <Input placeholder="ex.: FOSROC MD, Sika" value={formReleasingAgent} onChange={e => setFormReleasingAgent(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Nº de reutilizações dos painéis</Label>
                <Input type="number" placeholder="ex.: 5" value={formReuseCount} onChange={e => setFormReuseCount(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Switch checked={formReleasingApplied} onCheckedChange={setFormReleasingApplied} id="releasing" />
                <Label htmlFor="releasing" className="cursor-pointer">Desmoldante aplicado</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formBracingOk} onCheckedChange={setFormBracingOk} id="bracing" />
                <Label htmlFor="bracing" className="cursor-pointer">Escoramentos OK</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formAccessOk} onCheckedChange={setFormAccessOk} id="access" />
                <Label htmlFor="access" className="cursor-pointer">Acessos OK</Label>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Engenheiro Responsável *</Label>
              <Input placeholder="Eng. Nome Apelido" value={formEngineer} onChange={e => setFormEngineer(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Notas / Observações</Label>
              <Textarea placeholder="Observações relevantes sobre a cofragem" value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleSave}
              disabled={!formElement || !formFloor || !formInstallDate || !formEngineer}
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Registar Cofragem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
