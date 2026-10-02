'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  PlusCircle, Users2, Building2, FileText, TrendingUp, AlertCircle,
  CheckCircle2, Clock, XCircle, Star, StarHalf, CreditCard, ShieldCheck,
  Package, CalendarDays, BadgePercent, Briefcase, Loader2
} from 'lucide-react';
import type { Subcontractor, WorkPackage, SubcontractorStatus, WorkPackageStatus, PaymentStatus, ContractType } from '@/types/subcontractor';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const subStatusConfig: Record<SubcontractorStatus, { label: string; color: string; icon: React.ElementType }> = {
  active:    { label: 'Activo',     color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  inactive:  { label: 'Inactivo',   color: 'bg-gray-100 text-gray-600 border-gray-200',    icon: Clock },
  suspended: { label: 'Suspenso',   color: 'bg-red-100 text-red-800 border-red-200',       icon: XCircle },
  completed: { label: 'Concluído',  color: 'bg-blue-100 text-blue-800 border-blue-200',    icon: CheckCircle2 },
};

const wpStatusConfig: Record<WorkPackageStatus, { label: string; color: string }> = {
  pending:     { label: 'Pendente',     color: 'bg-gray-100 text-gray-700 border-gray-200' },
  in_progress: { label: 'Em Execução',  color: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed:   { label: 'Concluído',    color: 'bg-green-100 text-green-800 border-green-200' },
  disputed:    { label: 'Contestado',   color: 'bg-red-100 text-red-800 border-red-200' },
  cancelled:   { label: 'Cancelado',    color: 'bg-gray-50 text-gray-400 border-gray-100' },
};

const payStatusConfig: Record<PaymentStatus, { label: string; color: string }> = {
  pending: { label: 'Pagamento Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  partial: { label: 'Pago Parcial',       color: 'bg-blue-100 text-blue-800 border-blue-200' },
  paid:    { label: 'Liquidado',          color: 'bg-green-100 text-green-800 border-green-200' },
  overdue: { label: 'Vencido',            color: 'bg-red-100 text-red-800 border-red-200' },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(v);

function ScoreBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SubcontractorManagementTabProps {
  projectId: string;
}

export default function SubcontractorManagementTab({ projectId }: SubcontractorManagementTabProps) {
  const { toast } = useToast();
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubDialog, setIsSubDialog] = useState(false);
  const [isWpDialog, setIsWpDialog] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const qSubs = query(collection(db, 'projects', projectId, 'subcontractors'), orderBy('createdAt', 'desc'));
    const qWps = query(collection(db, 'projects', projectId, 'workPackages'), orderBy('createdAt', 'desc'));

    const unsubSubs = onSnapshot(qSubs, (snapshot) => {
      setSubcontractors(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Subcontractor)));
      setLoading(false);
    }, (error) => {
      console.error("Error loading subcontractors:", error);
      setLoading(false);
    });

    const unsubWps = onSnapshot(qWps, (snapshot) => {
      setWorkPackages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WorkPackage)));
    }, (error) => {
      console.error("Error loading work packages:", error);
    });

    return () => {
      unsubSubs();
      unsubWps();
    };
  }, [projectId]);

  // Sub form
  const [fName, setFName] = useState('');
  const [fNif, setFNif] = useState('');
  const [fContact, setFContact] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fSpecialty, setFSpecialty] = useState('');
  const [fContractNo, setFContractNo] = useState('');
  const [fContractType, setFContractType] = useState<ContractType>('global_price');
  const [fValue, setFValue] = useState('');
  const [fStart, setFStart] = useState('');
  const [fEnd, setFEnd] = useState('');
  const [fAlvara, setFAlvara] = useState('');
  const [fNotes, setFNotes] = useState('');

  // WP form
  const [wpSubId, setWpSubId] = useState('');
  const [wpDesc, setWpDesc] = useState('');
  const [wpWbs, setWpWbs] = useState('');
  const [wpUnit, setWpUnit] = useState('');
  const [wpQty, setWpQty] = useState('');
  const [wpUnitPrice, setWpUnitPrice] = useState('');
  const [wpStart, setWpStart] = useState('');
  const [wpEnd, setWpEnd] = useState('');
  const [wpRetention, setWpRetention] = useState('5');
  const [wpNotes, setWpNotes] = useState('');

  // KPIs
  const totalContractValue = subcontractors.reduce((s, sub) => s + sub.contractValue, 0);
  const totalPaid = workPackages.reduce((s, wp) => s + wp.amountPaid, 0);
  const activeCount = subcontractors.filter(s => s.status === 'active').length;
  const today = new Date().toISOString().split('T')[0];
  const expiringDocs = subcontractors.filter(s =>
    s.insuranceExpiry < today || s.alvaraExpiry < today || s.segurancaTrabalhoExpiry < today
  ).length;

  const handleSaveSub = async () => {
    if (!fName.trim()) {
      toast({ title: 'Campo Obrigatório', description: 'O nome do subempreiteiro é obrigatório.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newSubData = {
        projectId,
        name: fName,
        nif: fNif,
        contact: fContact,
        email: fEmail,
        phone: fPhone,
        specialty: fSpecialty || 'Construção Civil',
        status: 'active',
        contractNumber: fContractNo || `SUB-${new Date().getFullYear()}-${String(subcontractors.length + 1).padStart(3, '0')}`,
        contractType: fContractType,
        contractValue: parseFloat(fValue) || 0,
        startDate: fStart || new Date().toISOString().split('T')[0],
        endDate: fEnd || '',
        insuranceExpiry: '',
        alvara: fAlvara,
        alvaraExpiry: '',
        segurancaTrabalhoExpiry: '',
        qualityScore: 85,
        safetyScore: 90,
        scheduleScore: 85,
        notes: fNotes,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'projects', projectId, 'subcontractors'), newSubData);

      setIsSubDialog(false);
      setFName(''); setFNif(''); setFContact(''); setFEmail(''); setFPhone(''); setFSpecialty('');
      setFContractNo(''); setFValue(''); setFStart(''); setFEnd(''); setFAlvara(''); setFNotes('');
      toast({ title: 'Subempreiteiro Criado!', description: `${fName} foi adicionado à carteira de subcontratos.` });
    } catch (error) {
      console.error("Error creating subcontractor:", error);
      toast({ title: 'Erro ao registar subempreiteiro', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveWp = async () => {
    if (!wpSubId || !wpDesc.trim()) {
      toast({ title: 'Campos Obrigatórios', description: 'Selecione o subempreiteiro e descreva o pacote.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const sub = subcontractors.find(s => s.id === wpSubId);
      const qty = parseFloat(wpQty) || 0;
      const up = parseFloat(wpUnitPrice) || 0;
      const newWpData = {
        projectId,
        subcontractorId: wpSubId,
        subcontractorName: sub?.name || 'Subempreiteiro',
        description: wpDesc,
        wbsRef: wpWbs || 'Geral',
        unit: wpUnit || 'un',
        plannedQty: qty,
        completedQty: 0,
        unitPrice: up,
        totalValue: qty * up,
        startDate: wpStart || new Date().toISOString().split('T')[0],
        endDate: wpEnd || '',
        status: 'pending',
        paymentStatus: 'pending',
        amountPaid: 0,
        retentionPct: parseFloat(wpRetention) || 5,
        retentionReleased: false,
        notes: wpNotes,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'projects', projectId, 'workPackages'), newWpData);

      setIsWpDialog(false);
      setWpSubId(''); setWpDesc(''); setWpWbs(''); setWpUnit(''); setWpQty('');
      setWpUnitPrice(''); setWpStart(''); setWpEnd(''); setWpRetention('5'); setWpNotes('');
      toast({ title: 'Pacote de Trabalho Criado!', description: 'O pacote foi atribuído com sucesso.' });
    } catch (error) {
      console.error("Error creating work package:", error);
      toast({ title: 'Erro ao criar pacote de trabalho', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredWps = selectedSubId
    ? workPackages.filter(w => w.subcontractorId === selectedSubId)
    : workPackages;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-violet-600" />
            Gestão de Subempreiteiros
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Registo, acompanhamento de subempreiteiros, pacotes de trabalho, pagamentos e conformidade
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsWpDialog(true)}>
            <Package className="h-4 w-4 mr-2" />
            Novo Pacote
          </Button>
          <Button onClick={() => setIsSubDialog(true)} className="bg-violet-600 hover:bg-violet-700 text-white">
            <PlusCircle className="h-4 w-4 mr-2" />
            Novo Subempreiteiro
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Subempreiteiros Ativos</div>
            <div className="text-3xl font-bold text-violet-700">{activeCount}</div>
            <div className="text-xs text-muted-foreground mt-1">de {subcontractors.length} registados</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Valor Total Contratado</div>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalContractValue)}</div>
            <div className="text-xs text-muted-foreground mt-1">Pago: {formatCurrency(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Pacotes de Trabalho</div>
            <div className="text-3xl font-bold text-orange-700">{workPackages.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {workPackages.filter(w => w.status === 'in_progress').length} em curso
            </div>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${expiringDocs > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Documentos Expirados</div>
            <div className={`text-3xl font-bold ${expiringDocs > 0 ? 'text-red-700' : 'text-green-700'}`}>{expiringDocs}</div>
            <div className="text-xs text-muted-foreground mt-1">Seguros / Alvarás / ACT</div>
          </CardContent>
        </Card>
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="subcontractors">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subcontractors" className="flex items-center gap-2">
            <Users2 className="h-4 w-4" />
            Subempreiteiros
          </TabsTrigger>
          <TabsTrigger value="workpackages" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Pacotes de Trabalho
          </TabsTrigger>
        </TabsList>

        {/* Subcontractors */}
        <TabsContent value="subcontractors">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {subcontractors.map((sub) => {
              const sCfg = subStatusConfig[sub.status];
              const SIcon = sCfg.icon;
              const avgScore = Math.round((sub.qualityScore + sub.safetyScore + sub.scheduleScore) / 3);
              const initials = sub.name.split(/[–\s,]+/).slice(0, 2).map(w => w[0]).join('');
              const hasExpiry = sub.insuranceExpiry < today || sub.alvaraExpiry < today;

              return (
                <Card
                  key={sub.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedSubId === sub.id ? 'ring-2 ring-violet-500' : ''}`}
                  onClick={() => setSelectedSubId(selectedSubId === sub.id ? null : sub.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 bg-violet-100 border border-violet-200">
                          <AvatarFallback className="text-violet-700 font-bold text-sm">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-sm leading-tight">{sub.name}</div>
                          <div className="text-xs text-muted-foreground">{sub.specialty}</div>
                        </div>
                      </div>
                      <Badge className={`${sCfg.color} border text-xs flex items-center gap-1`}>
                        <SIcon className="h-3 w-3" />
                        {sCfg.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Contrato</span>
                        <div className="font-mono font-medium">{sub.contractNumber}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor</span>
                        <div className="font-semibold text-violet-700">{formatCurrency(sub.contractValue)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Início</span>
                        <div>{sub.startDate}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fim</span>
                        <div>{sub.endDate}</div>
                      </div>
                    </div>

                    {/* Performance scores */}
                    <div className="space-y-1.5 pt-1">
                      <ScoreBar value={sub.qualityScore} label="Qualidade" />
                      <ScoreBar value={sub.safetyScore} label="Segurança" />
                      <ScoreBar value={sub.scheduleScore} label="Prazos" />
                    </div>

                    {/* Compliance alerts */}
                    {hasExpiry && (
                      <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded p-2 border border-red-200">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        Documento(s) expirado(s) — verificar compliance
                      </div>
                    )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Alvará: {sub.alvara}
                        </div>
                        <div className="font-medium text-violet-700">Score: {avgScore}/100</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

          {subcontractors.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30 text-violet-500" />
              <p className="font-medium text-foreground">Nenhum subempreiteiro registado no projeto.</p>
              <p className="text-xs mt-1 text-muted-foreground">Registe empresas especializadas para acompanhar contratos, autos de medição e conformidade.</p>
              <Button onClick={() => setIsSubDialog(true)} className="mt-4 bg-violet-600 hover:bg-violet-700 text-white">
                <PlusCircle className="h-4 w-4 mr-2" />
                Registar Primeiro Subempreiteiro
              </Button>
            </div>
          )}

          {selectedSubId && (
            <div className="mt-2 text-sm text-muted-foreground text-center">
              A filtrar pacotes de trabalho por subempreiteiro selecionado.{' '}
              <button onClick={() => setSelectedSubId(null)} className="text-violet-600 underline">Limpar filtro</button>
            </div>
          )}
        </TabsContent>

        {/* Work Packages */}
        <TabsContent value="workpackages">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-violet-600" />
                  Pacotes de Trabalho
                </span>
                {selectedSubId && (
                  <Badge variant="secondary" className="text-xs">
                    A filtrar: {subcontractors.find(s => s.id === selectedSubId)?.name}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Descrição</TableHead>
                      <TableHead>Subempreiteiro</TableHead>
                      <TableHead>EAP</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead>Retenção</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Pagamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWps.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="p-8 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Briefcase className="h-8 w-8 text-muted-foreground/50" />
                            <p className="font-medium text-foreground">Nenhum pacote de trabalho registado.</p>
                            <p className="text-xs">Atribua pacotes de tarefas aos subempreiteiros para controlo de quantidades e pagamentos.</p>
                            <Button onClick={() => setIsWpDialog(true)} variant="outline" size="sm" className="mt-2">
                              <Package className="h-4 w-4 mr-2" />
                              Criar Pacote de Trabalho
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWps.map((wp) => {
                      const wCfg = wpStatusConfig[wp.status];
                      const pCfg = payStatusConfig[wp.paymentStatus];
                      const progress = wp.plannedQty > 0 ? (wp.completedQty / wp.plannedQty) * 100 : 0;
                      const retention = (wp.totalValue * wp.retentionPct) / 100;
                      return (
                        <TableRow key={wp.id}>
                          <TableCell className="font-medium max-w-[200px]">
                            <div className="truncate" title={wp.description}>{wp.description}</div>
                            <div className="text-xs text-muted-foreground">{wp.startDate} → {wp.endDate}</div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[150px]">
                            <div className="truncate" title={wp.subcontractorName}>{wp.subcontractorName}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{wp.wbsRef}</TableCell>
                          <TableCell>
                            <div className="min-w-[80px] space-y-1">
                              <Progress value={progress} className="h-2" />
                              <div className="text-xs text-muted-foreground text-center">{progress.toFixed(0)}%</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">{formatCurrency(wp.totalValue)}</TableCell>
                          <TableCell>
                            <div className="text-sm">{formatCurrency(wp.amountPaid)}</div>
                            <div className="text-xs text-muted-foreground">
                              {wp.totalValue > 0 ? Math.round((wp.amountPaid / wp.totalValue) * 100) : 0}%
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <BadgePercent className="h-3 w-3 text-muted-foreground" />
                              <span>{formatCurrency(retention)}</span>
                              {wp.retentionReleased && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${wCfg.color} border text-xs`}>{wCfg.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${pCfg.color} border text-xs`}>{pCfg.label}</Badge>
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

      {/* New Subcontractor Dialog */}
      <Dialog open={isSubDialog} onOpenChange={setIsSubDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-violet-600" />
              Registar Novo Subempreiteiro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome da Empresa ou Prestador *</Label>
              <Input placeholder="Ex.: Mota & Filhos Construções, Lda." value={fName} onChange={e => setFName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Especialidade / Âmbito</Label>
                <span className="text-[11px] text-muted-foreground">Escolha rápida ou digite abaixo</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {[
                  'Estruturas e Betão',
                  'Alvenarias e Rebocos',
                  'Instalações Hidráulicas e Elétricas',
                  'Caixilharia e Serralharia',
                  'Pinturas e Acabamentos',
                  'Movimentação de Terras',
                ].map(spec => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setFSpecialty(spec)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      fSpecialty === spec
                        ? 'bg-violet-600 text-white border-violet-600 font-medium'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
              <Input placeholder="Ou especifique outra especialidade..." value={fSpecialty} onChange={e => setFSpecialty(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Valor do Contrato (Kz)</Label>
                <Input type="number" placeholder="ex.: 15000000" value={fValue} onChange={e => setFValue(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Contacto Telefónico</Label>
                <Input placeholder="+244 9..." value={fPhone} onChange={e => setFPhone(e.target.value)} />
              </div>
            </div>

            <details className="rounded-lg border bg-muted/20 p-3 text-sm">
              <summary className="cursor-pointer font-medium text-xs text-muted-foreground hover:text-foreground">
                + Dados Adicionais (NIF, Nº Contrato, Alvará, Datas)
              </summary>
              <div className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">NIF / Identificação Fiscal</Label>
                    <Input className="h-8 text-xs" placeholder="500000000" value={fNif} onChange={e => setFNif(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nº de Contrato</Label>
                    <Input className="h-8 text-xs" placeholder="Auto-gerado se vazio" value={fContractNo} onChange={e => setFContractNo(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Responsável / Contacto</Label>
                    <Input className="h-8 text-xs" placeholder="Eng. Responsável" value={fContact} onChange={e => setFContact(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input className="h-8 text-xs" type="email" placeholder="contacto@empresa.com" value={fEmail} onChange={e => setFEmail(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Contrato</Label>
                    <Select value={fContractType} onValueChange={v => setFContractType(v as ContractType)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global_price">Preço Global</SelectItem>
                        <SelectItem value="unit_price">Preço Unitário</SelectItem>
                        <SelectItem value="cost_plus">Custo + Honorários</SelectItem>
                        <SelectItem value="time_materials">Tempo e Materiais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data de Início</Label>
                    <Input className="h-8 text-xs" type="date" value={fStart} onChange={e => setFStart(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data de Fim</Label>
                    <Input className="h-8 text-xs" type="date" value={fEnd} onChange={e => setFEnd(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Nº Alvará de Construção</Label>
                  <Input className="h-8 text-xs" placeholder="ex.: OP/12345" value={fAlvara} onChange={e => setFAlvara(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Notas e Observações</Label>
                  <Textarea className="text-xs" placeholder="Observações..." value={fNotes} onChange={e => setFNotes(e.target.value)} rows={2} />
                </div>
              </div>
            </details>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubDialog(false)}>Cancelar</Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={handleSaveSub}
              disabled={!fName.trim() || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Building2 className="h-4 w-4 mr-2" />}
              Registar Subempreiteiro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Work Package Dialog */}
      <Dialog open={isWpDialog} onOpenChange={setIsWpDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-violet-600" />
              Registar Pacote de Trabalho
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Subempreiteiro *</Label>
              <Select value={wpSubId} onValueChange={setWpSubId}>
                <SelectTrigger><SelectValue placeholder="Selecionar subempreiteiro..." /></SelectTrigger>
                <SelectContent>
                  {subcontractors.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Descrição do Trabalho *</Label>
                <span className="text-[11px] text-muted-foreground">Modelos frequentes</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {[
                  { label: 'Betão Armado', unit: 'm³', price: '95000' },
                  { label: 'Alvenaria de Blocos', unit: 'm²', price: '12000' },
                  { label: 'Reboco Projetado', unit: 'm²', price: '7500' },
                  { label: 'Instalação Elétrica', unit: 'vg', price: '250000' },
                  { label: 'Redes Hidrossanitárias', unit: 'vg', price: '200000' },
                  { label: 'Pinturas', unit: 'm²', price: '5000' },
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setWpDesc(item.label);
                      setWpUnit(item.unit);
                      if (!wpUnitPrice) setWpUnitPrice(item.price);
                    }}
                    className="text-xs px-2 py-0.5 rounded-full border bg-muted/40 hover:bg-muted text-muted-foreground border-border hover:text-foreground transition-all"
                  >
                    + {item.label}
                  </button>
                ))}
              </div>
              <Textarea placeholder="ex.: Betão armado – pilares e vigas, Piso 3" value={wpDesc} onChange={e => setWpDesc(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Ref. EAP (WBS)</Label>
                <Input placeholder="ex.: 1.3.2" value={wpWbs} onChange={e => setWpWbs(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Unidade</Label>
                <Input placeholder="ex.: m², m³, un, vg" value={wpUnit} onChange={e => setWpUnit(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Quantidade</Label>
                <Input type="number" placeholder="ex.: 250" value={wpQty} onChange={e => setWpQty(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Preço Unitário (Kz)</Label>
                <Input type="number" placeholder="ex.: 12000" value={wpUnitPrice} onChange={e => setWpUnitPrice(e.target.value)} />
              </div>
            </div>

            {wpQty && wpUnitPrice && (
              <div className="p-2.5 rounded-md bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 flex items-center justify-between text-xs">
                <span className="text-violet-800 dark:text-violet-300 font-medium">Valor Total Calculado:</span>
                <span className="text-violet-900 dark:text-violet-200 font-bold text-sm">
                  {formatCurrency((parseFloat(wpQty) || 0) * (parseFloat(wpUnitPrice) || 0))}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data de Início</Label>
                <Input type="date" value={wpStart} onChange={e => setWpStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Data de Fim</Label>
                <Input type="date" value={wpEnd} onChange={e => setWpEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Retenção de Garantia (%)</Label>
              <Input type="number" placeholder="5" value={wpRetention} onChange={e => setWpRetention(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea placeholder="Notas adicionais" value={wpNotes} onChange={e => setWpNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWpDialog(false)}>Cancelar</Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={handleSaveWp}
              disabled={!wpSubId || !wpDesc.trim() || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Package className="h-4 w-4 mr-2" />}
              Registar Pacote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
