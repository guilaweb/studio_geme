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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PlusCircle, FlaskConical, CheckCircle2, XCircle, Clock, AlertTriangle,
  Package, FileText, Beaker, Archive, Truck, ShieldCheck, Loader2
} from 'lucide-react';
import type {
  MaterialDelivery, MaterialTestRecord, MaterialCategory,
  MaterialTestResult, DeliveryStatus
} from '@/types/materials-control';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const categoryLabel: Record<MaterialCategory, string> = {
  concrete:      'Betão',
  steel:         'Aço / Armaduras',
  cement:        'Cimento',
  aggregate:     'Inertes / Britas',
  admixture:     'Adjuvantes',
  waterproofing: 'Impermeabilização',
  other:         'Outro',
};

const categoryColor: Record<MaterialCategory, string> = {
  concrete:      'bg-slate-100 text-slate-800',
  steel:         'bg-blue-100 text-blue-800',
  cement:        'bg-stone-100 text-stone-800',
  aggregate:     'bg-amber-100 text-amber-800',
  admixture:     'bg-purple-100 text-purple-800',
  waterproofing: 'bg-teal-100 text-teal-800',
  other:         'bg-gray-100 text-gray-700',
};

const deliveryStatusConfig: Record<DeliveryStatus, { label: string; color: string }> = {
  received:    { label: 'Recebido',    color: 'bg-blue-100 text-blue-800 border-blue-200' },
  quarantined: { label: 'Quarentena',  color: 'bg-orange-100 text-orange-800 border-orange-200' },
  approved:    { label: 'Aprovado',    color: 'bg-green-100 text-green-800 border-green-200' },
  rejected:    { label: 'Reprovado',   color: 'bg-red-100 text-red-800 border-red-200' },
  consumed:    { label: 'Consumido',   color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const testResultConfig: Record<MaterialTestResult, { label: string; color: string; icon: React.ElementType }> = {
  approved:    { label: 'Conforme',     color: 'bg-green-100 text-green-800 border-green-200',  icon: CheckCircle2 },
  rejected:    { label: 'Não Conforme', color: 'bg-red-100 text-red-800 border-red-200',        icon: XCircle },
  pending:     { label: 'Em Análise',   color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  conditional: { label: 'Condicional',  color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface MaterialsControlTabProps {
  projectId: string;
}

export default function MaterialsControlTab({ projectId }: MaterialsControlTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deliveries, setDeliveries] = useState<MaterialDelivery[]>([]);
  const [testRecords, setTestRecords] = useState<MaterialTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeliveryDialog, setIsDeliveryDialog] = useState(false);
  const [isTestDialog, setIsTestDialog] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const qDeliv = query(collection(db, 'projects', projectId, 'materialDeliveries'), orderBy('createdAt', 'desc'));
    const qTests = query(collection(db, 'projects', projectId, 'materialTests'), orderBy('createdAt', 'desc'));

    const unsubDeliv = onSnapshot(qDeliv, (snapshot) => {
      setDeliveries(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaterialDelivery)));
      setLoading(false);
    }, (error) => {
      console.error("Error loading deliveries:", error);
      setLoading(false);
    });

    const unsubTests = onSnapshot(qTests, (snapshot) => {
      setTestRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaterialTestRecord)));
    }, (error) => {
      console.error("Error loading tests:", error);
    });

    return () => {
      unsubDeliv();
      unsubTests();
    };
  }, [projectId]);

  // Delivery form
  const [fDelivNum, setFDelivNum] = useState('');
  const [fDate, setFDate] = useState('');
  const [fCategory, setFCategory] = useState<MaterialCategory>('concrete');
  const [fMaterial, setFMaterial] = useState('');
  const [fSupplier, setFSupplier] = useState('');
  const [fQty, setFQty] = useState('');
  const [fUnit, setFUnit] = useState('');
  const [fBatch, setFBatch] = useState('');
  const [fGuia, setFGuia] = useState('');
  const [fSpec, setFSpec] = useState('');
  const [fDesign, setFDesign] = useState('');
  const [fTestReq, setFTestReq] = useState(true);
  const [fTestLab, setFTestLab] = useState(false);
  const [fLab, setFLab] = useState('');
  const [fReceivedBy, setFReceivedBy] = useState('');
  const [fNotes, setFNotes] = useState('');

  // Test form
  const [tDelivId, setTDelivId] = useState('');
  const [tType, setTType] = useState('');
  const [tLab, setTLab] = useState('');
  const [tSampleDate, setTSampleDate] = useState('');
  const [tTestDate, setTTestDate] = useState('');
  const [tReportNo, setTReportNo] = useState('');
  const [tSpec, setTSpec] = useState('');
  const [tMeasured, setTMeasured] = useState('');
  const [tUnit, setTUnit] = useState('');
  const [tResult, setTResult] = useState<MaterialTestResult>('approved');
  const [tNotes, setTNotes] = useState('');

  // Action Dialog State (Approve, Consume, Reject)
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'consume' | 'reject'>('approve');
  const [selectedDelivery, setSelectedDelivery] = useState<MaterialDelivery | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [consumptionQty, setConsumptionQty] = useState('');
  const [consumptionFront, setConsumptionFront] = useState('');

  // KPIs
  const total = deliveries.length;
  const quarantined = deliveries.filter(d => d.deliveryStatus === 'quarantined').length;
  const approved = deliveries.filter(d => d.deliveryStatus === 'approved' || d.deliveryStatus === 'consumed').length;
  const rejected = deliveries.filter(d => d.deliveryStatus === 'rejected').length;
  const pendingTests = deliveries.filter(d => d.testResult === 'pending').length;

  const handleSaveDelivery = async () => {
    if (!fMaterial.trim()) {
      toast({ title: 'Campo Obrigatório', description: 'O nome do material é obrigatório.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newDelData = {
        projectId,
        deliveryNumber: fDelivNum || `DL-${new Date().getFullYear()}-${String(deliveries.length + 1).padStart(3, '0')}`,
        deliveryDate: fDate || new Date().toISOString().split('T')[0],
        category: fCategory,
        materialName: fMaterial,
        supplier: fSupplier || 'Fornecedor Local',
        quantity: parseFloat(fQty) || 0,
        unit: fUnit || 'un',
        batchNumber: fBatch || `LOT-${Date.now()}`,
        deliveryNoteNumber: fGuia || `GR-${Date.now()}`,
        specReference: fSpec,
        designValue: fDesign,
        testRequired: fTestReq,
        testSentToLab: fTestLab,
        labName: fLab,
        testResult: 'pending',
        deliveryStatus: fTestReq ? 'quarantined' : 'received',
        quarantineReason: fTestReq ? 'Aguarda resultado de ensaio laboratorial.' : undefined,
        receivedBy: fReceivedBy || user?.displayName || 'Fiel de Armazém',
        notes: fNotes,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'projects', projectId, 'materialDeliveries'), newDelData);

      setIsDeliveryDialog(false);
      setFDelivNum(''); setFDate(''); setFMaterial(''); setFSupplier('');
      setFQty(''); setFUnit(''); setFBatch(''); setFGuia(''); setFSpec(''); setFDesign('');
      setFTestReq(true); setFTestLab(false); setFLab(''); setFReceivedBy(''); setFNotes('');
      toast({ title: 'Receção Registada!', description: `Material ${fMaterial} adicionado ao inventário de receção.` });
    } catch (error) {
      console.error("Error creating material delivery:", error);
      toast({ title: 'Erro ao registar material', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTest = async () => {
    if (!tDelivId || !tType.trim()) {
      toast({ title: 'Campos Obrigatórios', description: 'Selecione o lote do material e o tipo de ensaio.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const delivery = deliveries.find(d => d.id === tDelivId);
      const newTestData = {
        projectId,
        deliveryId: tDelivId,
        materialName: delivery?.materialName || 'Material',
        testType: tType,
        labName: tLab || 'Laboratório de Engenharia',
        sampleDate: tSampleDate || new Date().toISOString().split('T')[0],
        testDate: tTestDate || new Date().toISOString().split('T')[0],
        reportNumber: tReportNo || `REL-${Date.now()}`,
        specValue: tSpec,
        measuredValue: tMeasured,
        unit: tUnit || 'MPa',
        result: tResult,
        notes: tNotes,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'projects', projectId, 'materialTests'), newTestData);

      // Update delivery status in Firestore
      const delivRef = doc(db, 'projects', projectId, 'materialDeliveries', tDelivId);
      await updateDoc(delivRef, {
        testResult: tResult,
        measuredValue: tMeasured,
        deliveryStatus: tResult === 'approved' ? 'approved' : tResult === 'rejected' ? 'rejected' : 'quarantined',
      });

      setIsTestDialog(false);
      setTDelivId(''); setTType(''); setTLab(''); setTSampleDate(''); setTTestDate('');
      setTReportNo(''); setTSpec(''); setTMeasured(''); setTUnit(''); setTResult('approved'); setTNotes('');
      toast({ title: 'Ensaio Registado!', description: 'Resultado e estado do lote atualizados com sucesso.' });
    } catch (error) {
      console.error("Error saving material test:", error);
      toast({ title: 'Erro ao guardar ensaio', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAction = (delivery: MaterialDelivery, type: 'approve' | 'consume' | 'reject') => {
    setSelectedDelivery(delivery);
    setActionType(type);
    setActionNotes('');
    setConsumptionQty(String(delivery.quantity || ''));
    setConsumptionFront('');
    setIsActionDialogOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!selectedDelivery) return;
    setIsSubmitting(true);

    try {
      const delivRef = doc(db, 'projects', projectId, 'materialDeliveries', selectedDelivery.id);
      const timestamp = new Date().toISOString();
      const userName = user?.displayName || user?.email || 'Fiscal de Obra';

      if (actionType === 'approve') {
        await updateDoc(delivRef, {
          deliveryStatus: 'approved',
          testResult: 'approved',
          quarantineReason: null,
          approvalNote: actionNotes || 'Homologação técnica de receção em obra.',
          approvedBy: userName,
          approvedAt: timestamp,
        });
        toast({
          title: 'Lote Homologado!',
          description: `Material ${selectedDelivery.materialName} aprovado para incorporação em obra.`
        });
      } else if (actionType === 'consume') {
        const qty = parseFloat(consumptionQty) || selectedDelivery.quantity;
        await updateDoc(delivRef, {
          deliveryStatus: 'consumed',
          consumedQuantity: qty,
          consumptionFront: consumptionFront || 'Frente Geral',
          consumptionNotes: actionNotes,
          consumedBy: userName,
          consumedAt: timestamp,
        });
        toast({
          title: 'Consumo Registado!',
          description: `${qty} ${selectedDelivery.unit} de ${selectedDelivery.materialName} apontados em obra.`
        });
      } else if (actionType === 'reject') {
        if (!actionNotes.trim()) {
          toast({ title: 'Motivo obrigatório', description: 'Indique a justificação técnica da reprovação.', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        await updateDoc(delivRef, {
          deliveryStatus: 'rejected',
          testResult: 'rejected',
          quarantineReason: actionNotes,
          rejectedBy: userName,
          rejectedAt: timestamp,
        });
        toast({
          title: 'Lote Reprovado / Rejeitado',
          description: `Material marcado como não conforme para devolução ao fornecedor.`,
          variant: 'destructive',
        });
      }

      setIsActionDialogOpen(false);
      setSelectedDelivery(null);
    } catch (error) {
      console.error('Error executing material action:', error);
      toast({ title: 'Erro ao processar ação', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-purple-600" />
            Controlo de Materiais
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Receção e rastreabilidade de materiais — ensaios de laboratório, certificados e quarentena
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsTestDialog(true)}>
            <Beaker className="h-4 w-4 mr-2" />
            Registar Ensaio
          </Button>
          <Button onClick={() => setIsDeliveryDialog(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
            <PlusCircle className="h-4 w-4 mr-2" />
            Nova Entrega
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Entregas</div>
            <div className="text-3xl font-bold text-purple-700">{total}</div>
            <div className="text-xs text-muted-foreground mt-1">Registadas</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Aprovadas</div>
            <div className="text-3xl font-bold text-green-700">{approved}</div>
            <div className="text-xs text-muted-foreground mt-1">Incl. incorporadas</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Quarentena</div>
            <div className="text-3xl font-bold text-orange-700">{quarantined}</div>
            <div className="text-xs text-muted-foreground mt-1">Aguarda ensaio</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Rejeitadas</div>
            <div className="text-3xl font-bold text-red-700">{rejected}</div>
            <div className="text-xs text-muted-foreground mt-1">Devolver / abater</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Ensaios Pendentes</div>
            <div className="text-3xl font-bold text-yellow-700">{pendingTests}</div>
            <div className="text-xs text-muted-foreground mt-1">Lab. a aguardar</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Deliveries + Tests */}
      <Tabs defaultValue="deliveries">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deliveries" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Entregas e Receção
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            Ensaios Laboratoriais
          </TabsTrigger>
        </TabsList>

        {/* Deliveries */}
        <TabsContent value="deliveries">
          <Card>
            {deliveries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Truck className="h-8 w-8 text-muted-foreground/50 text-purple-600" />
                  <p className="font-medium text-foreground">Nenhuma guia de entrega de material registada.</p>
                  <p className="text-xs">Registe uma nova receção de materiais para iniciar o rastreio e controlo de qualidade.</p>
                  <Button onClick={() => setIsDeliveryDialog(true)} className="mt-2 bg-purple-600 hover:bg-purple-700 text-white">
                    <Truck className="h-4 w-4 mr-2" />
                    Registar Primeira Entrega
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile First View (< 768px): Cards Verticais Responsivos */}
                <div className="block md:hidden p-3 space-y-3">
                  {deliveries.map((d) => {
                    const dCfg = deliveryStatusConfig[d.deliveryStatus];
                    const tCfg = testResultConfig[d.testResult];
                    const TIcon = tCfg.icon;

                    return (
                      <div key={d.id} className="border rounded-xl p-3.5 space-y-2.5 bg-card shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold text-foreground">{d.deliveryNumber}</span>
                              <Badge className={`${categoryColor[d.category]} text-[10px] border-0`}>
                                {categoryLabel[d.category]}
                              </Badge>
                            </div>
                            <h4 className="font-bold text-sm text-foreground mt-1">{d.materialName}</h4>
                            <p className="text-xs text-muted-foreground">{d.supplier}</p>
                          </div>
                          <Badge className={`${dCfg.color} border text-[11px] shrink-0`}>
                            {dCfg.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2 rounded-lg">
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Quantidade:</span>
                            <span className="font-semibold text-foreground">{d.quantity} {d.unit}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Data Receção:</span>
                            <span className="font-mono text-foreground">{d.deliveryDate}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Lote / Guia:</span>
                            <span className="font-mono text-[11px] text-foreground">{d.batchNumber}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Ensaio Laboratorial:</span>
                            {d.testRequired ? (
                              <Badge className={`${tCfg.color} border text-[10px] flex items-center gap-1 w-fit mt-0.5`}>
                                <TIcon className="h-3 w-3" />
                                {tCfg.label}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">N/A</span>
                            )}
                          </div>
                        </div>

                        {d.quarantineReason && (
                          <div className="text-xs bg-orange-500/10 text-orange-800 dark:text-orange-300 p-2 rounded border border-orange-500/20">
                            ⚠️ {d.quarantineReason}
                          </div>
                        )}

                        {/* Ações Mobile com 44px de toque */}
                        <div className="flex flex-wrap gap-2 pt-1 border-t">
                          {(d.deliveryStatus === 'quarantined' || d.deliveryStatus === 'received') && (
                            <Button
                              size="sm"
                              className="h-10 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                              onClick={() => handleOpenAction(d, 'approve')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Homologar
                            </Button>
                          )}

                          {d.deliveryStatus === 'approved' && (
                            <Button
                              size="sm"
                              className="h-10 text-xs flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                              onClick={() => handleOpenAction(d, 'consume')}
                            >
                              <Package className="h-4 w-4 mr-1.5" /> Registar Consumo
                            </Button>
                          )}

                          {d.testRequired && d.testResult === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-10 text-xs flex-1"
                              onClick={() => {
                                setTDelivId(d.id);
                                setIsTestDialog(true);
                              }}
                            >
                              <Beaker className="h-4 w-4 mr-1.5 text-purple-600" /> Ensaio
                            </Button>
                          )}

                          {d.deliveryStatus !== 'rejected' && d.deliveryStatus !== 'consumed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-10 text-xs text-destructive hover:bg-destructive/10 px-2.5"
                              onClick={() => handleOpenAction(d, 'reject')}
                            >
                              <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View (>= 768px): Tabela Completa com Coluna de Ações */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Entrega</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Qty.</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Ensaio</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((d) => {
                        const dCfg = deliveryStatusConfig[d.deliveryStatus];
                        const tCfg = testResultConfig[d.testResult];
                        const TIcon = tCfg.icon;
                        return (
                          <TableRow key={d.id}>
                            <TableCell className="font-mono text-xs font-medium">{d.deliveryNumber}</TableCell>
                            <TableCell className="text-sm">{d.deliveryDate}</TableCell>
                            <TableCell>
                              <Badge className={`${categoryColor[d.category]} text-xs border-0`}>
                                {categoryLabel[d.category]}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[180px]">
                              <div className="truncate font-medium text-sm" title={d.materialName}>{d.materialName}</div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[140px]">
                              <div className="truncate" title={d.supplier}>{d.supplier}</div>
                            </TableCell>
                            <TableCell className="text-sm font-semibold">{d.quantity} {d.unit}</TableCell>
                            <TableCell className="font-mono text-xs">{d.batchNumber}</TableCell>
                            <TableCell>
                              {d.testRequired ? (
                                <Badge className={`${tCfg.color} border text-xs flex items-center gap-1 w-fit`}>
                                  <TIcon className="h-3 w-3" />
                                  {tCfg.label}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge className={`${dCfg.color} border text-xs`}>{dCfg.label}</Badge>
                                {d.quarantineReason && (
                                  <div className="text-xs text-orange-700 max-w-[120px] truncate" title={d.quarantineReason}>
                                    ⚠️ {d.quarantineReason}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {(d.deliveryStatus === 'quarantined' || d.deliveryStatus === 'received') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                                    onClick={() => handleOpenAction(d, 'approve')}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Homologar
                                  </Button>
                                )}
                                {d.deliveryStatus === 'approved' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                                    onClick={() => handleOpenAction(d, 'consume')}
                                  >
                                    <Package className="h-3.5 w-3.5 mr-1" /> Consumo
                                  </Button>
                                )}
                                {d.testRequired && d.testResult === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => {
                                      setTDelivId(d.id);
                                      setIsTestDialog(true);
                                    }}
                                  >
                                    <Beaker className="h-3.5 w-3.5 mr-1 text-purple-600" /> Ensaio
                                  </Button>
                                )}
                                {d.deliveryStatus !== 'rejected' && d.deliveryStatus !== 'consumed' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                    onClick={() => handleOpenAction(d, 'reject')}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        {/* Test Records */}
        <TabsContent value="tests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Beaker className="h-4 w-4 text-purple-600" />
                Registo de Ensaios Laboratoriais
              </CardTitle>
              {deliveries.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setIsTestDialog(true)}>
                  <PlusCircle className="h-4 w-4 mr-1.5 text-purple-600" /> Novo Ensaio
                </Button>
              )}
            </CardHeader>
            {testRecords.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="flex flex-col items-center justify-center gap-2">
                  <FlaskConical className="h-8 w-8 text-muted-foreground/50 text-purple-600" />
                  <p className="font-medium text-foreground">Nenhum ensaio laboratorial registado.</p>
                  <p className="text-xs">Registe ensaios laboratoriais para controlar a conformidade dos materiais entregues.</p>
                  <Button
                    onClick={() => {
                      if (deliveries.length > 0 && !tDelivId) {
                        setTDelivId(deliveries[0].id);
                      }
                      setIsTestDialog(true);
                    }}
                    disabled={deliveries.length === 0}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <Beaker className="h-4 w-4 mr-2" />
                    Registar Primeiro Ensaio
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile View Ensaios */}
                <div className="block md:hidden p-3 space-y-3">
                  {testRecords.map(tr => {
                    const cfg = testResultConfig[tr.result];
                    const Icon = cfg.icon;
                    return (
                      <div key={tr.id} className="border rounded-xl p-3 space-y-2 bg-card">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-xs font-bold text-muted-foreground">{tr.reportNumber}</span>
                            <h4 className="font-bold text-sm text-foreground">{tr.materialName}</h4>
                            <p className="text-xs text-muted-foreground">{tr.testType}</p>
                          </div>
                          <Badge className={`${cfg.color} border text-[10px] flex items-center gap-1`}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2 rounded">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Laboratório:</span>
                            <span>{tr.labName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Data do Ensaio:</span>
                            <span>{tr.testDate}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Valor Especif.:</span>
                            <span>{tr.specValue || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Valor Medido:</span>
                            <span className="font-bold text-emerald-700">{tr.measuredValue} {tr.unit}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View Ensaios */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Boletim</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Tipo de Ensaio</TableHead>
                        <TableHead>Laboratório</TableHead>
                        <TableHead>Data Amostra</TableHead>
                        <TableHead>Data Ensaio</TableHead>
                        <TableHead>Valor Esp.</TableHead>
                        <TableHead>Valor Med.</TableHead>
                        <TableHead>Unid.</TableHead>
                        <TableHead>Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testRecords.map(tr => {
                        const cfg = testResultConfig[tr.result];
                        const Icon = cfg.icon;
                        return (
                          <TableRow key={tr.id}>
                            <TableCell className="font-mono text-xs font-medium">{tr.reportNumber}</TableCell>
                            <TableCell className="text-sm font-medium max-w-[160px]">
                              <span className="truncate block" title={tr.materialName}>{tr.materialName}</span>
                            </TableCell>
                            <TableCell className="text-sm max-w-[180px]">
                              <span className="truncate block" title={tr.testType}>{tr.testType}</span>
                            </TableCell>
                            <TableCell className="text-sm">{tr.labName}</TableCell>
                            <TableCell className="text-sm">{tr.sampleDate}</TableCell>
                            <TableCell className="text-sm">{tr.testDate}</TableCell>
                            <TableCell className="text-sm">{tr.specValue}</TableCell>
                            <TableCell className="font-semibold text-emerald-700">{tr.measuredValue}</TableCell>
                            <TableCell className="text-sm">{tr.unit}</TableCell>
                            <TableCell>
                              <Badge className={`${cfg.color} border text-xs flex items-center gap-1 w-fit`}>
                                <Icon className="h-3 w-3" />
                                {cfg.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Delivery Dialog */}
      <Dialog open={isDeliveryDialog} onOpenChange={setIsDeliveryDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-600" />
              Registar Nova Entrega de Material
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Material / Produto *</Label>
                <span className="text-[11px] text-muted-foreground">Materiais comuns</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {[
                  { name: 'Betão C25/30', cat: 'concrete' as MaterialCategory, unit: 'm³', spec: 'EN 206-1', design: '≥ 25 MPa' },
                  { name: 'Betão C30/37', cat: 'concrete' as MaterialCategory, unit: 'm³', spec: 'EN 206-1', design: '≥ 30 MPa' },
                  { name: 'Aço A500NR Ø12', cat: 'steel' as MaterialCategory, unit: 'ton', spec: 'LNEC E449', design: 'Re ≥ 500 MPa' },
                  { name: 'Aço A500NR Ø16', cat: 'steel' as MaterialCategory, unit: 'ton', spec: 'LNEC E449', design: 'Re ≥ 500 MPa' },
                  { name: 'Cimento 42.5R', cat: 'cement' as MaterialCategory, unit: 'sacos', spec: 'EN 197-1', design: 'R28 ≥ 42.5 MPa' },
                  { name: 'Areia Lavada', cat: 'aggregate' as MaterialCategory, unit: 'm³', spec: 'EN 12620', design: 'MF 2.4 - 2.8' },
                  { name: 'Brita 1 (12/20)', cat: 'aggregate' as MaterialCategory, unit: 'm³', spec: 'EN 12620', design: 'C 90/15' },
                ].map(item => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      setFMaterial(item.name);
                      setFCategory(item.cat);
                      setFUnit(item.unit);
                      setFSpec(item.spec);
                      setFDesign(item.design);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      fMaterial === item.name
                        ? 'bg-purple-600 text-white border-purple-600 font-medium'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border hover:text-foreground'
                    }`}
                  >
                    + {item.name}
                  </button>
                ))}
              </div>
              <Input placeholder="ex.: Betão C25/30, Varão Ø12mm" value={fMaterial} onChange={e => setFMaterial(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select value={fCategory} onValueChange={v => setFCategory(v as MaterialCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(categoryLabel) as MaterialCategory[]).map(k => (
                      <SelectItem key={k} value={k}>{categoryLabel[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fornecedor</Label>
                <Input placeholder="Nome do fornecedor (opcional)" value={fSupplier} onChange={e => setFSupplier(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Quantidade</Label>
                <Input type="number" placeholder="ex.: 25" value={fQty} onChange={e => setFQty(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Unidade</Label>
                <Input placeholder="ton, m³, kg, sacos" value={fUnit} onChange={e => setFUnit(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Switch checked={fTestReq} onCheckedChange={setFTestReq} id="testReq" />
                <Label htmlFor="testReq" className="cursor-pointer text-xs font-medium">Ensaio laboratorial obrigatório</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={fTestLab} onCheckedChange={setFTestLab} id="testSent" disabled={!fTestReq} />
                <Label htmlFor="testSent" className={`cursor-pointer text-xs font-medium ${!fTestReq ? 'opacity-40' : ''}`}>Amostra enviada ao lab.</Label>
              </div>
            </div>

            <details className="rounded-lg border bg-muted/20 p-3 text-sm">
              <summary className="cursor-pointer font-medium text-xs text-muted-foreground hover:text-foreground">
                + Especificações Técnicas (Lote, Guia, Norma, Valor de Projeto)
              </summary>
              <div className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nº de Lote</Label>
                    <Input className="h-8 text-xs" placeholder="Auto-gerado se vazio" value={fBatch} onChange={e => setFBatch(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nº Guia de Remessa</Label>
                    <Input className="h-8 text-xs" placeholder="GR-XXXXX" value={fGuia} onChange={e => setFGuia(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Norma de Referência</Label>
                    <Input className="h-8 text-xs" placeholder="ex.: NP EN 197-1" value={fSpec} onChange={e => setFSpec(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor de Projeto</Label>
                    <Input className="h-8 text-xs" placeholder="ex.: ≥ 42.5 MPa" value={fDesign} onChange={e => setFDesign(e.target.value)} />
                  </div>
                </div>

                {fTestLab && (
                  <div className="space-y-1">
                    <Label className="text-xs">Laboratório de Ensaio</Label>
                    <Input className="h-8 text-xs" placeholder="ex.: LEM Luanda, ISQ" value={fLab} onChange={e => setFLab(e.target.value)} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Data de Receção</Label>
                    <Input className="h-8 text-xs" type="date" value={fDate} onChange={e => setFDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Recebido por</Label>
                    <Input className="h-8 text-xs" placeholder="Auto-preenchido com utilizador" value={fReceivedBy} onChange={e => setFReceivedBy(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Notas e Observações</Label>
                  <Textarea className="text-xs" rows={2} placeholder="Observações..." value={fNotes} onChange={e => setFNotes(e.target.value)} />
                </div>
              </div>
            </details>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeliveryDialog(false)}>Cancelar</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleSaveDelivery}
              disabled={!fMaterial.trim() || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Truck className="h-4 w-4 mr-2" />}
              Registar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Test Dialog */}
      <Dialog open={isTestDialog} onOpenChange={setIsTestDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-purple-600" />
              Registar Resultado de Ensaio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Entrega associada *</Label>
              <Select value={tDelivId} onValueChange={setTDelivId}>
                <SelectTrigger><SelectValue placeholder="Selecionar lote recebido..." /></SelectTrigger>
                <SelectContent>
                  {deliveries.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.deliveryNumber} – {d.materialName} ({d.batchNumber})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Tipo de Ensaio *</Label>
                <span className="text-[11px] text-muted-foreground">Ensaios padrão</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {[
                  'Compressão 28d',
                  'Compressão 7d',
                  'Abaixamento (Slump)',
                  'Tração de Varões',
                  'Granulometria',
                ].map(ens => (
                  <button
                    key={ens}
                    type="button"
                    onClick={() => setTType(ens)}
                    className={`text-xs px-2.5 py-0.5 rounded-full border transition-all ${
                      tType === ens
                        ? 'bg-purple-600 text-white border-purple-600 font-medium'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border hover:text-foreground'
                    }`}
                  >
                    + {ens}
                  </button>
                ))}
              </div>
              <Input placeholder="ex.: Resistência à compressão 28 dias" value={tType} onChange={e => setTType(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Laboratório</Label>
                <span className="text-[11px] text-muted-foreground">Entidades</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {['LEM Luanda', 'Laboratório Central', 'ISQ Angola', 'Lab da Obra'].map(lab => (
                  <button
                    key={lab}
                    type="button"
                    onClick={() => setTLab(lab)}
                    className="text-xs px-2 py-0.5 rounded-full border bg-muted/40 hover:bg-muted text-muted-foreground border-border hover:text-foreground"
                  >
                    {lab}
                  </button>
                ))}
              </div>
              <Input placeholder="ex.: LEM Luanda, ISQ, Cebacenter" value={tLab} onChange={e => setTLab(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data de Colheita</Label>
                <Input type="date" value={tSampleDate} onChange={e => setTSampleDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Data do Ensaio</Label>
                <Input type="date" value={tTestDate} onChange={e => setTTestDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Valor Especif.</Label>
                <Input placeholder="ex.: ≥ 25" value={tSpec} onChange={e => setTSpec(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Valor Medido</Label>
                <Input placeholder="ex.: 28.4" value={tMeasured} onChange={e => setTMeasured(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Unidade</Label>
                <Input placeholder="MPa, mm, %" value={tUnit} onChange={e => setTUnit(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Resultado *</Label>
              <Select value={tResult} onValueChange={v => setTResult(v as MaterialTestResult)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">✅ Aprovado – Conforme</SelectItem>
                  <SelectItem value="conditional">⚠️ Condicional – Aceite com reservas</SelectItem>
                  <SelectItem value="rejected">❌ Reprovado – Não conforme</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Nº Boletim / Relatório</Label>
              <Input placeholder="Auto-gerado se vazio" value={tReportNo} onChange={e => setTReportNo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea rows={2} placeholder="Observações sobre o resultado..." value={tNotes} onChange={e => setTNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialog(false)}>Cancelar</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleSaveTest}
              disabled={!tDelivId || !tType.trim() || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Beaker className="h-4 w-4 mr-2" />}
              Registar Ensaio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog: Homologar / Consumir / Rejeitar */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              {actionType === 'consume' && <Package className="h-5 w-5 text-blue-600" />}
              {actionType === 'reject' && <XCircle className="h-5 w-5 text-destructive" />}
              {actionType === 'approve' && 'Homologar Receção de Material'}
              {actionType === 'consume' && 'Registar Consumo em Obra'}
              {actionType === 'reject' && 'Reprovar / Rejeitar Lote'}
            </DialogTitle>
          </DialogHeader>

          {selectedDelivery && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Material:</span>
                  <span className="font-bold text-foreground">{selectedDelivery.materialName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lote / Entrega:</span>
                  <span className="font-mono">{selectedDelivery.batchNumber} ({selectedDelivery.deliveryNumber})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantidade Recebida:</span>
                  <span className="font-semibold text-foreground">{selectedDelivery.quantity} {selectedDelivery.unit}</span>
                </div>
              </div>

              {actionType === 'approve' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ao homologar este lote, o material é libertado de quarentena e autorizado para consumo e incorporação definitiva na obra.
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Notas de Homologação / Certificado (Opcional)</Label>
                    <Textarea
                      rows={2}
                      placeholder="Ex: Certificado de fábrica CE em anexo; ensaio visual e dimensional conforme."
                      value={actionNotes}
                      onChange={e => setActionNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {actionType === 'consume' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantidade Consumida ({selectedDelivery.unit}) *</Label>
                    <Input
                      type="number"
                      placeholder={`Máx: ${selectedDelivery.quantity}`}
                      value={consumptionQty}
                      onChange={e => setConsumptionQty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Frente de Serviço / Bloco / Elemento *</Label>
                    <Input
                      placeholder="Ex: Bloco B - Pilares do Piso 2"
                      value={consumptionFront}
                      onChange={e => setConsumptionFront(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Observações de Aplicação (Opcional)</Label>
                    <Textarea
                      rows={2}
                      placeholder="Detalhes adicionais do consumo..."
                      value={actionNotes}
                      onChange={e => setActionNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {actionType === 'reject' && (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20">
                    ⚠️ O lote será formalmente rejeitado. O material não poderá ser utilizado e ficará registado para devolução ou abatimento junto do fornecedor.
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Justificação Técnica da Reprovação *</Label>
                    <Textarea
                      rows={3}
                      placeholder="Ex: Teor de impurezas superior ao admitido na norma; betão com slump fora da tolerância; varões oxidados."
                      value={actionNotes}
                      onChange={e => setActionNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsActionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className={
                actionType === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : actionType === 'consume'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-destructive hover:bg-destructive/90 text-white'
              }
              onClick={handleExecuteAction}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : actionType === 'approve' ? (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              ) : actionType === 'consume' ? (
                <Package className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {actionType === 'approve' ? 'Homologar Lote' : actionType === 'consume' ? 'Confirmar Consumo' : 'Reprovar Lote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
