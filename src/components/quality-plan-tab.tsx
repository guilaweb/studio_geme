'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import {
  PlusCircle, ClipboardList, CheckCircle2, XCircle, Clock, AlertTriangle,
  Minus, BookOpen, ShieldCheck, TrendingUp, BarChart3, Flame, Loader2
} from 'lucide-react';
import type {
  QualityCheckpoint, NonConformanceReport, InspectionPointType,
  CheckpointStatus, NonConformanceSeverity, NonConformanceStatus, QualityPlan
} from '@/types/quality-plan';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pointTypeConfig: Record<InspectionPointType, { label: string; desc: string; color: string }> = {
  H: { label: 'H', desc: 'Hold Point – Paragem Obrigatória', color: 'bg-red-100 text-red-700 border-red-300 font-bold' },
  W: { label: 'W', desc: 'Witness Point – Testemunho',       color: 'bg-yellow-100 text-yellow-700 border-yellow-300 font-bold' },
  R: { label: 'R', desc: 'Review Point – Revisão Doc.',      color: 'bg-blue-100 text-blue-700 border-blue-300 font-bold' },
};

const checkpointStatusConfig: Record<CheckpointStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:        { label: 'Pendente',      color: 'bg-gray-100 text-gray-600 border-gray-200',       icon: Clock },
  scheduled:      { label: 'Agendado',      color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: Clock },
  passed:         { label: 'Aprovado',      color: 'bg-green-100 text-green-800 border-green-200',    icon: CheckCircle2 },
  failed:         { label: 'Reprovado',     color: 'bg-red-100 text-red-800 border-red-200',          icon: XCircle },
  waived:         { label: 'Dispensado',    color: 'bg-gray-100 text-gray-500 border-gray-200',       icon: Minus },
  not_applicable: { label: 'N/A',           color: 'bg-gray-50 text-gray-400 border-gray-100',        icon: Minus },
};

const ncrSeverityConfig: Record<NonConformanceSeverity, { label: string; color: string; icon: React.ElementType }> = {
  minor:    { label: 'Menor',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: AlertTriangle },
  major:    { label: 'Maior',    color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle },
  critical: { label: 'Crítica',  color: 'bg-red-100 text-red-800 border-red-200',          icon: Flame },
};

const ncrStatusConfig: Record<NonConformanceStatus, { label: string; color: string }> = {
  open:         { label: 'Aberta',       color: 'bg-red-100 text-red-700 border-red-200' },
  in_treatment: { label: 'Em Tratamento', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  closed:       { label: 'Encerrada',    color: 'bg-green-100 text-green-700 border-green-200' },
  cancelled:    { label: 'Cancelada',    color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const formatEUR = (v: number) =>
  new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(v);

// ─── Component ────────────────────────────────────────────────────────────────

interface QualityPlanTabProps {
  projectId: string;
}

export default function QualityPlanTab({ projectId }: QualityPlanTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plan, setPlan] = useState<QualityPlan | null>(null);
  const [checkpoints, setCheckpoints] = useState<QualityCheckpoint[]>([]);
  const [ncrs, setNcrs] = useState<NonConformanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNcrDialog, setIsNcrDialog] = useState(false);
  const [filterPhase, setFilterPhase] = useState('all');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const qCheckpoints = query(
      collection(db, 'projects', projectId, 'qualityCheckpoints'),
      orderBy('order', 'asc')
    );

    const qNcrs = query(
      collection(db, 'projects', projectId, 'nonConformances'),
      orderBy('createdAt', 'desc')
    );

    const unsubCheckpoints = onSnapshot(qCheckpoints, (snapshot) => {
      setCheckpoints(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QualityCheckpoint)));
      setLoading(false);
    }, (error) => {
      console.error("Error loading quality checkpoints:", error);
      setLoading(false);
    });

    const unsubNcrs = onSnapshot(qNcrs, (snapshot) => {
      setNcrs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NonConformanceReport)));
    }, (error) => {
      console.error("Error loading NCRs:", error);
    });

    return () => {
      unsubCheckpoints();
      unsubNcrs();
    };
  }, [projectId]);

  // NCR form
  const [fLocation, setFLocation] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fSeverity, setFSeverity] = useState<NonConformanceSeverity>('major');
  const [fRootCause, setFRootCause] = useState('');
  const [fAction, setFAction] = useState('');
  const [fResponsible, setFResponsible] = useState('');
  const [fDue, setFDue] = useState('');
  const [fDetectedBy, setFDetectedBy] = useState('');
  const [fNotes, setFNotes] = useState('');

  // Stats
  const passed = checkpoints.filter(c => c.status === 'passed').length;
  const failed = checkpoints.filter(c => c.status === 'failed').length;
  const pending = checkpoints.filter(c => c.status === 'pending' || c.status === 'scheduled').length;
  const completionPct = checkpoints.length > 0 ? Math.round((passed / checkpoints.length) * 100) : 0;
  const openNcrs = ncrs.filter(n => n.status === 'open' || n.status === 'in_treatment').length;
  const totalNcrCost = ncrs.reduce((s, n) => s + (n.cost || 0), 0);

  const phases = ['all', ...Array.from(new Set(checkpoints.map(c => c.phase)))];
  const filteredCheckpoints = filterPhase === 'all'
    ? checkpoints
    : checkpoints.filter(c => c.phase === filterPhase);

  const handleSaveNcr = async () => {
    if (!fDesc.trim()) {
      toast({ title: 'Campo Obrigatório', description: 'Descreva a não conformidade identificada.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newNcrData = {
        projectId,
        ncrNumber: `NCR-${new Date().getFullYear()}-${String(ncrs.length + 1).padStart(3, '0')}`,
        detectedDate: new Date().toISOString().split('T')[0],
        detectedBy: fDetectedBy || user?.displayName || 'Inspetor de Qualidade',
        location: fLocation || 'Frente de Obra',
        description: fDesc,
        severity: fSeverity,
        rootCause: fRootCause,
        correctiveAction: fAction,
        responsibleParty: fResponsible || 'Empreiteiro Geral',
        dueDate: fDue || '',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'projects', projectId, 'nonConformances'), newNcrData);

      setIsNcrDialog(false);
      setFLocation(''); setFDesc(''); setFSeverity('major'); setFRootCause('');
      setFAction(''); setFResponsible(''); setFDue(''); setFDetectedBy(''); setFNotes('');
      toast({ title: 'NCR Emitido!', description: 'Relatório de Não Conformidade criado com sucesso.' });
    } catch (error) {
      console.error("Error creating NCR:", error);
      toast({ title: 'Erro ao emitir NCR', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-teal-600" />
            Plano de Qualidade (PPAQ)
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Pontos de inspeção H/W/R, checkpoints por fase e não conformidades (NCR)
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="font-medium">{plan ? plan.title : 'Plano de Garantia da Qualidade da Obra'}</span>
            {plan?.revision && <Badge variant="secondary">{plan.revision}</Badge>}
            {plan?.approvedBy && <span>Aprovado: {plan.approvedBy} · {plan.approvalDate}</span>}
          </div>
        </div>
        <Button onClick={() => setIsNcrDialog(true)} className="bg-red-600 hover:bg-red-700 text-white">
          <PlusCircle className="h-4 w-4 mr-2" />
          Emitir NCR
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-teal-500 md:col-span-2">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-muted-foreground">Progresso dos Checkpoints</div>
                <div className="text-3xl font-bold text-teal-700">{completionPct}%</div>
                <div className="text-xs text-muted-foreground mt-1">{passed} de {checkpoints.length} inspecionados</div>
              </div>
              <TrendingUp className="h-8 w-8 text-teal-200" />
            </div>
            <Progress value={completionPct} className="h-2 mt-3" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Aprovados</div>
            <div className="text-3xl font-bold text-green-700">{passed}</div>
            <div className="text-xs text-muted-foreground mt-1">Checkpoints OK</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">NCRs Abertas</div>
            <div className="text-3xl font-bold text-red-700">{openNcrs}</div>
            <div className="text-xs text-muted-foreground mt-1">de {ncrs.length} total</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Custo de Correções</div>
            <div className="text-xl font-bold text-orange-700">{formatEUR(totalNcrCost)}</div>
            <div className="text-xs text-muted-foreground mt-1">Não conformidades</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="checkpoints">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="checkpoints" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Checkpoints H/W/R
          </TabsTrigger>
          <TabsTrigger value="ncrs" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Não Conformidades (NCR)
            {openNcrs > 0 && (
              <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs ml-1">{openNcrs}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Checkpoints */}
        <TabsContent value="checkpoints" className="space-y-3">
          {/* Phase filter */}
          <div className="flex flex-wrap gap-2">
            {phases.map(phase => (
              <Button
                key={phase}
                variant={filterPhase === phase ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterPhase(phase)}
                className={filterPhase === phase ? 'bg-teal-600 hover:bg-teal-700' : ''}
              >
                {phase === 'all' ? 'Todas as Fases' : phase}
              </Button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            {(Object.keys(pointTypeConfig) as InspectionPointType[]).map(pt => (
              <div key={pt} className="flex items-center gap-1.5">
                <Badge className={`${pointTypeConfig[pt].color} border w-6 h-6 flex items-center justify-center p-0 rounded`}>{pt}</Badge>
                <span>{pointTypeConfig[pt].desc}</span>
              </div>
            ))}
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Fase</TableHead>
                    <TableHead>Actividade / Ponto de Controlo</TableHead>
                    <TableHead className="w-12">Tipo</TableHead>
                    <TableHead>Norma</TableHead>
                    <TableHead>Critério de Aceitação</TableHead>
                    <TableHead>Inspetor</TableHead>
                    <TableHead>Freq.</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>NCR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCheckpoints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                        <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="font-medium text-foreground">Nenhum ponto de controlo (checkpoint) registado</p>
                        <p className="text-xs text-muted-foreground mt-1">Os marcos e pontos de paragem H/W/R deste projeto aparecerão aqui.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCheckpoints.map(cp => {
                    const sCfg = checkpointStatusConfig[cp.status];
                    const SIcon = sCfg.icon;
                    const ptCfg = pointTypeConfig[cp.pointType];
                    return (
                      <React.Fragment key={cp.id}>
                        <TableRow className={cp.status === 'failed' ? 'bg-red-50' : cp.status === 'passed' ? 'bg-green-50/30' : ''}>
                          <TableCell className="text-xs text-muted-foreground font-mono">{cp.sequenceNo}</TableCell>
                          <TableCell className="text-xs font-medium text-muted-foreground max-w-[100px]">
                            <span title={cp.phase} className="truncate block">{cp.phase}</span>
                          </TableCell>
                          <TableCell className="font-medium text-sm max-w-[220px]">
                            <span title={cp.activity} className="truncate block">{cp.activity}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${ptCfg.color} border w-7 h-7 flex items-center justify-center p-0 rounded text-sm`} title={ptCfg.desc}>
                              {cp.pointType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{cp.applicableSpec}</TableCell>
                          <TableCell className="text-xs max-w-[180px]">
                            <span title={cp.acceptanceCriteria} className="truncate block">{cp.acceptanceCriteria}</span>
                          </TableCell>
                          <TableCell className="text-xs">{cp.inspectorRole}</TableCell>
                          <TableCell className="text-xs">{cp.frequency}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {cp.completedDate || cp.scheduledDate || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${sCfg.color} border text-xs flex items-center gap-1 w-fit whitespace-nowrap`}>
                              <SIcon className="h-3 w-3" />
                              {sCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {cp.linkedNcrIds.length > 0
                              ? <Badge variant="destructive" className="text-xs">{cp.linkedNcrIds.length} NCR</Badge>
                              : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                        </TableRow>
                        {cp.result && (
                          <TableRow className={cp.status === 'failed' ? 'bg-red-50' : 'bg-green-50/30'}>
                            <TableCell colSpan={11} className="py-1 pl-12 text-xs text-muted-foreground italic border-b">
                              💬 {cp.result}
                              {cp.notes && <span className="ml-2 text-orange-600">{cp.notes}</span>}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* NCRs */}
        <TabsContent value="ncrs" className="space-y-3">
          {ncrs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="font-medium text-foreground">Nenhuma não conformidade (NCR) registada</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Não existem relatórios de anomalias ou desvios de qualidade abertos para este projeto.
                </p>
                <Button onClick={() => setIsNcrDialog(true)} variant="outline" className="mt-4 border-red-500 text-red-600 hover:bg-red-50">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Emitir Novo NCR
                </Button>
              </CardContent>
            </Card>
          ) : (
            ncrs.map(ncr => {
            const sevCfg = ncrSeverityConfig[ncr.severity];
            const SevIcon = sevCfg.icon;
            const stCfg = ncrStatusConfig[ncr.status];
            return (
              <Card key={ncr.id} className={`border-l-4 ${ncr.severity === 'critical' ? 'border-l-red-600' : ncr.severity === 'major' ? 'border-l-orange-500' : 'border-l-yellow-400'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-sm">{ncr.ncrNumber}</span>
                      <Badge className={`${sevCfg.color} border text-xs flex items-center gap-1`}>
                        <SevIcon className="h-3 w-3" />
                        {sevCfg.label}
                      </Badge>
                      <Badge className={`${stCfg.color} border text-xs`}>{stCfg.label}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{ncr.detectedDate} · {ncr.detectedBy}</div>
                  </div>
                  <div className="text-sm font-medium text-foreground">{ncr.location}</div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Descrição da Não Conformidade</div>
                      <p>{ncr.description}</p>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Causa Raiz</div>
                      <p className="text-muted-foreground">{ncr.rootCause}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ação Corretiva</div>
                      <p className="text-emerald-700">{ncr.correctiveAction}</p>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>Responsável: <span className="font-medium text-foreground">{ncr.responsibleParty}</span></div>
                      <div>Prazo: <span className="font-medium">{ncr.dueDate}</span></div>
                      {ncr.closedDate && <div>Encerrado: <span className="font-medium text-green-700">{ncr.closedDate}</span> por {ncr.verifiedBy}</div>}
                      {ncr.cost && ncr.cost > 0 && <div>Custo de correção: <span className="font-medium text-orange-700">{formatEUR(ncr.cost)}</span></div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
        </TabsContent>
      </Tabs>

      {/* NCR Dialog */}
      <Dialog open={isNcrDialog} onOpenChange={setIsNcrDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Emitir Relatório de Não Conformidade (NCR)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Local / Elemento *</Label>
                <Input placeholder="ex.: Piso 2 – Pilar P07" value={fLocation} onChange={e => setFLocation(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Severidade *</Label>
                <Select value={fSeverity} onValueChange={v => setFSeverity(v as NonConformanceSeverity)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">⚠️ Menor</SelectItem>
                    <SelectItem value="major">🔶 Maior</SelectItem>
                    <SelectItem value="critical">🔴 Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descrição da Não Conformidade *</Label>
              <Textarea rows={3} placeholder="Descreva detalhadamente a não conformidade detectada" value={fDesc} onChange={e => setFDesc(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Causa Raiz</Label>
              <Textarea rows={2} placeholder="Causa provável da não conformidade" value={fRootCause} onChange={e => setFRootCause(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Acção Corretiva Proposta</Label>
              <Textarea rows={2} placeholder="Descreva as ações de correção" value={fAction} onChange={e => setFAction(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Parte Responsável</Label>
                <Input placeholder="Subempreiteiro / Empresa" value={fResponsible} onChange={e => setFResponsible(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Prazo de Correção</Label>
                <Input type="date" value={fDue} onChange={e => setFDue(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Detectado por *</Label>
              <Input placeholder="Eng. Nome" value={fDetectedBy} onChange={e => setFDetectedBy(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNcrDialog(false)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleSaveNcr}
              disabled={!fLocation || !fDesc || !fDetectedBy}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Emitir NCR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
