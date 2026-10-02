'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  PlusCircle,
  HelpCircle,
  ShieldAlert,
  Send,
  Camera,
  Layers,
  Check,
  ChevronRight,
  Filter,
  Loader2,
  XCircle,
  Eye,
  FileDown,
  BookOpen
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@/types/project';
import type {
  FiscalizacaoReport,
  InspectionTicket,
  NonConformance,
  RFIItem,
  MaterialApprovalItem,
  InspectionPointType,
  NonConformanceSeverity
} from '@/types/fiscalizacao';

interface ProjectFiscalizacaoTabProps {
  projectId: string;
  project?: Project | null;
  onNavigateTab?: (tab: string) => void;
}

export function ProjectFiscalizacaoTab({ projectId, project, onNavigateTab }: ProjectFiscalizacaoTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'diario' | 'inspecoes' | 'ncrs' | 'rfis' | 'aprovacoes'>('diario');
  const [loading, setLoading] = useState(true);

  // Estados de dados reais do Firestore
  const [reports, setReports] = useState<FiscalizacaoReport[]>([]);
  const [inspections, setInspections] = useState<InspectionTicket[]>([]);
  const [ncrs, setNcrs] = useState<NonConformance[]>([]);
  const [rfis, setRfis] = useState<RFIItem[]>([]);
  const [approvals, setApprovals] = useState<MaterialApprovalItem[]>([]);

  // Modais de Criação & Ciclo de Resolução
  const [openNewReportModal, setOpenNewReportModal] = useState(false);
  const [openNewInspectionModal, setOpenNewInspectionModal] = useState(false);
  const [openNewNcrModal, setOpenNewNcrModal] = useState(false);
  const [openNewRfiModal, setOpenNewRfiModal] = useState(false);
  const [openNewApprovalModal, setOpenNewApprovalModal] = useState(false);
  const [openCorrectiveActionModal, setOpenCorrectiveActionModal] = useState(false);
  const [selectedNcr, setSelectedNcr] = useState<NonConformance | null>(null);
  const [correctiveActionText, setCorrectiveActionText] = useState('');

  // Estados dos Formulários
  // 1. Diário de Fiscalização
  const [repWorkFront, setRepWorkFront] = useState('');
  const [repWeather, setRepWeather] = useState<'Limpo / Céu Aberto' | 'Nublado' | 'Chuva Ligeira' | 'Chuva Torrencial / Paralisação' | 'Poeira Intensa'>('Limpo / Céu Aberto');
  const [repObservedConditions, setRepObservedConditions] = useState('');
  const [repInstructions, setRepInstructions] = useState('');
  const [repPending, setRepPending] = useState('');
  const [repDirectLabor, setRepDirectLabor] = useState('');
  const [repSubLabor, setRepSubLabor] = useState('');

  // 2. Não Conformidade (NCR)
  const [ncrTitle, setNcrTitle] = useState('');
  const [ncrLocation, setNcrLocation] = useState('');
  const [ncrDescription, setNcrDescription] = useState('');
  const [ncrSeverity, setNcrSeverity] = useState<NonConformanceSeverity>('maior');
  const [ncrResponsible, setNcrResponsible] = useState('');
  const [ncrDueDate, setNcrDueDate] = useState('');

  // 3. Inspeção
  const [inspTitle, setInspTitle] = useState('');
  const [inspLocation, setInspLocation] = useState('');
  const [inspPointType, setInspPointType] = useState<InspectionPointType>('H');
  const [inspCategory, setInspCategory] = useState<'Estruturas' | 'Fundações' | 'Terras' | 'Acabamentos' | 'Instalações' | 'HSEQ' | 'Outro'>('Estruturas');
  const [inspItemsText, setInspItemsText] = useState('');

  // 4. RFI
  const [rfiSubject, setRfiSubject] = useState('');
  const [rfiQuestion, setRfiQuestion] = useState('');
  const [rfiUrgency, setRfiUrgency] = useState<'baixa' | 'media' | 'alta' | 'urgente'>('alta');

  // 5. Aprovação de Material
  const [aprovName, setAprovName] = useState('');
  const [aprovSupplier, setAprovSupplier] = useState('');
  const [aprovSpecs, setAprovSpecs] = useState('');
  const [aprovLabRef, setAprovLabRef] = useState('');

  // Carregamento de dados em tempo real
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const unsubReports = onSnapshot(
      query(collection(db, 'projects', projectId, 'fiscalizacao_reports'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setReports(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FiscalizacaoReport)));
      },
      (err) => console.warn('Erro ao carregar relatórios de fiscalização:', err)
    );

    const unsubInspections = onSnapshot(
      query(collection(db, 'projects', projectId, 'fiscalizacao_inspections'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setInspections(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InspectionTicket)));
      },
      (err) => console.warn('Erro ao carregar inspeções:', err)
    );

    const unsubNcrs = onSnapshot(
      query(collection(db, 'projects', projectId, 'fiscalizacao_ncrs'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setNcrs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as NonConformance)));
      },
      (err) => console.warn('Erro ao carregar NCRs:', err)
    );

    const unsubRfis = onSnapshot(
      query(collection(db, 'projects', projectId, 'fiscalizacao_rfis'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setRfis(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RFIItem)));
      },
      (err) => console.warn('Erro ao carregar RFIs:', err)
    );

    const unsubApprovals = onSnapshot(
      query(collection(db, 'projects', projectId, 'fiscalizacao_approvals'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setApprovals(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MaterialApprovalItem)));
        setLoading(false);
      },
      (err) => {
        console.warn('Erro ao carregar aprovações de materiais:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubReports();
      unsubInspections();
      unsubNcrs();
      unsubRfis();
      unsubApprovals();
    };
  }, [projectId]);

  // Contadores & Métricas Chave de Fiscalização
  const stats = useMemo(() => {
    const holdPointsPending = inspections.filter((i) => i.pointType === 'H' && i.status === 'pendente').length;
    const openNcrs = ncrs.filter((n) => n.status !== 'encerrada');
    const criticalNcrs = openNcrs.filter((n) => n.severity === 'critica').length;
    const pendingRfis = rfis.filter((r) => r.status === 'aberto' || r.status === 'em_analise').length;
    const pendingApprovals = approvals.filter((a) => a.decision === 'pendente').length;

    return {
      reportsCount: reports.length,
      holdPointsPending,
      openNcrsCount: openNcrs.length,
      criticalNcrs,
      pendingRfis,
      pendingApprovals,
    };
  }, [reports, inspections, ncrs, rfis, approvals]);

  // Gravar Diário de Fiscalização
  const handleCreateReport = async () => {
    if (!repWorkFront.trim()) {
      toast({ title: 'Campo Obrigatório', description: 'Indique a frente de trabalho fiscalizada.', variant: 'destructive' });
      return;
    }

    try {
      const reportNumber = `DF-${new Date().getFullYear()}-${String(reports.length + 1).padStart(3, '0')}`;
      const payload: Omit<FiscalizacaoReport, 'id'> = {
        projectId,
        reportNumber,
        date: new Date().toISOString().split('T')[0],
        weather: repWeather,
        workFront: repWorkFront.trim(),
        observedConditions: repObservedConditions.trim(),
        verifiedActivities: [],
        laborCount: {
          direct: parseInt(repDirectLabor) || 0,
          subcontractor: parseInt(repSubLabor) || 0,
          total: (parseInt(repDirectLabor) || 0) + (parseInt(repSubLabor) || 0),
        },
        equipmentObserved: [],
        materialsReceived: [],
        occurrences: '',
        instructionsToContractor: repInstructions.trim(),
        pendingItems: repPending.trim(),
        photos: [],
        inspector: {
          uid: user?.uid || 'fiscal-user',
          displayName: user?.displayName || 'Fiscal Residente',
          role: user?.role || 'Fiscalização',
        },
        status: 'emitido',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'projects', projectId, 'fiscalizacao_reports'), payload);
      toast({ title: 'Diário de Fiscalização Registado!', description: `${reportNumber} exarado no livro de obra.` });
      setOpenNewReportModal(false);
      setRepWorkFront('');
      setRepObservedConditions('');
      setRepInstructions('');
      setRepPending('');
      setRepDirectLabor('');
      setRepSubLabor('');
    } catch (e: any) {
      toast({ title: 'Erro ao gravar diário', description: e.message, variant: 'destructive' });
    }
  };

  // Gravar Não Conformidade (NCR)
  const handleCreateNcr = async () => {
    if (!ncrTitle.trim() || !ncrLocation.trim()) {
      toast({ title: 'Campos Obrigatórios', description: 'Indique o título e a localização da não conformidade.', variant: 'destructive' });
      return;
    }

    try {
      const ncrNumber = `RNC-${new Date().getFullYear()}-${String(ncrs.length + 1).padStart(3, '0')}`;
      const payload: Omit<NonConformance, 'id'> = {
        projectId,
        ncrNumber,
        title: ncrTitle.trim(),
        location: ncrLocation.trim(),
        description: ncrDescription.trim(),
        severity: ncrSeverity,
        photos: [],
        responsibleParty: ncrResponsible.trim() || 'Empreiteiro Geral',
        detectedDate: new Date().toISOString().split('T')[0],
        detectedBy: user?.displayName || 'Equipa de Fiscalização',
        dueDate: ncrDueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'aberta',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'projects', projectId, 'fiscalizacao_ncrs'), payload);
      toast({ title: 'Não Conformidade Registada!', description: `${ncrNumber} atribuída para resolução.` });
      setOpenNewNcrModal(false);
      setNcrTitle('');
      setNcrLocation('');
      setNcrDescription('');
      setNcrResponsible('');
      setNcrDueDate('');
    } catch (e: any) {
      toast({ title: 'Erro ao registar NCR', description: e.message, variant: 'destructive' });
    }
  };

  // Atualizar Estado da NCR (Ex: Encerrar após vistoria)
  const handleUpdateNcrStatus = async (ncrId: string, newStatus: NonConformance['status'], resolutionNotes?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      if (newStatus === 'encerrada') {
        updateData.closedDate = new Date().toISOString().split('T')[0];
        updateData.verifiedBy = user?.displayName || 'Fiscal Residente OEA';
        if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
      }
      await updateDoc(doc(db, 'projects', projectId, 'fiscalizacao_ncrs', ncrId), updateData);
      toast({ title: 'Estado da NCR Atualizado!', description: `Novo estado: ${newStatus === 'encerrada' ? 'Encerrada' : newStatus}` });
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar NCR', description: e.message, variant: 'destructive' });
    }
  };

  // Gravar Ação Corretiva do Empreiteiro
  const handleSaveCorrectiveAction = async () => {
    if (!selectedNcr || !correctiveActionText.trim()) {
      toast({ title: 'Ação Obrigatória', description: 'Descreva a ação corretiva executada ou proposta.', variant: 'destructive' });
      return;
    }
    try {
      await updateDoc(doc(db, 'projects', projectId, 'fiscalizacao_ncrs', selectedNcr.id), {
        correctiveActionPlan: correctiveActionText.trim(),
        status: 'aguarda_vistoria',
        updatedAt: new Date().toISOString(),
      });
      toast({ title: 'Ação Corretiva Registada!', description: 'NCR atualizada para aguardar vistoria final do fiscal.' });
      setOpenCorrectiveActionModal(false);
      setCorrectiveActionText('');
      setSelectedNcr(null);
    } catch (e: any) {
      toast({ title: 'Erro ao registar ação corretiva', description: e.message, variant: 'destructive' });
    }
  };

  // Gravar Ficha de Inspeção
  const handleCreateInspection = async () => {
    if (!inspTitle.trim()) {
      toast({ title: 'Título Obrigatório', description: 'Por favor, indique a atividade inspecionada.', variant: 'destructive' });
      return;
    }

    try {
      const code = `INSP-${new Date().getFullYear()}-${String(inspections.length + 1).padStart(3, '0')}`;
      const itemsList = inspItemsText.split('\n').filter((l) => l.trim().length > 0).map((l, idx) => ({
        id: `item-${idx + 1}`,
        description: l.trim(),
        result: 'conforme' as const,
      }));

      const payload: Omit<InspectionTicket, 'id'> = {
        projectId,
        code,
        title: inspTitle.trim(),
        location: inspLocation.trim() || 'Estaleiro / Frente de Obra',
        pointType: inspPointType,
        category: inspCategory,
        items: itemsList.length > 0 ? itemsList : [{ id: '1', description: 'Inspeção geral de conformidade', result: 'conforme' }],
        status: 'pendente',
        scheduledDate: new Date().toISOString().split('T')[0],
        inspectorName: user?.displayName || 'Fiscal Responsável',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'projects', projectId, 'fiscalizacao_inspections'), payload);
      toast({ title: 'Ficha de Inspeção Criada!', description: `${code} agendada para verificação.` });
      setOpenNewInspectionModal(false);
      setInspTitle('');
      setInspLocation('');
      setInspItemsText('');
    } catch (e: any) {
      toast({ title: 'Erro ao criar inspeção', description: e.message, variant: 'destructive' });
    }
  };

  // Gravar Pedido de Informação (RFI)
  const handleCreateRfi = async () => {
    if (!rfiSubject.trim() || !rfiQuestion.trim()) {
      toast({ title: 'Campos Obrigatórios', description: 'Preencha o assunto e a questão técnica.', variant: 'destructive' });
      return;
    }

    try {
      const rfiNumber = `RFI-${String(rfis.length + 1).padStart(3, '0')}`;
      const payload: Omit<RFIItem, 'id'> = {
        projectId,
        rfiNumber,
        subject: rfiSubject.trim(),
        question: rfiQuestion.trim(),
        askedBy: {
          uid: user?.uid || 'user',
          name: user?.displayName || 'Técnico de Obra',
          organization: 'Fiscalização / Empreiteiro',
        },
        assignedTo: {
          name: 'Gabinete de Projeto / Direção Técnica',
          role: 'Projetista / Fiscal Chefe',
        },
        questionDate: new Date().toISOString().split('T')[0],
        urgency: rfiUrgency,
        status: 'aberto',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'projects', projectId, 'fiscalizacao_rfis'), payload);
      toast({ title: 'Pedido de Informação Submetido!', description: `${rfiNumber} encaminhado para parecer técnico.` });
      setOpenNewRfiModal(false);
      setRfiSubject('');
      setRfiQuestion('');
    } catch (e: any) {
      toast({ title: 'Erro ao submeter RFI', description: e.message, variant: 'destructive' });
    }
  };

  // Gravar Aprovação de Material
  const handleCreateApproval = async () => {
    if (!aprovName.trim() || !aprovSupplier.trim()) {
      toast({ title: 'Campos Obrigatórios', description: 'Indique o material e o fornecedor.', variant: 'destructive' });
      return;
    }

    try {
      const code = `APM-${String(approvals.length + 1).padStart(3, '0')}`;
      const payload: Omit<MaterialApprovalItem, 'id'> = {
        projectId,
        code,
        materialName: aprovName.trim(),
        supplier: aprovSupplier.trim(),
        technicalSpecs: aprovSpecs.trim(),
        labTestReference: aprovLabRef.trim() || undefined,
        submittedDate: new Date().toISOString().split('T')[0],
        submittedBy: user?.displayName || 'Empreiteiro Geral',
        decision: 'pendente',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'projects', projectId, 'fiscalizacao_approvals'), payload);
      toast({ title: 'Material Submetido para Aprovação!', description: `${code} registado para parecer técnico.` });
      setOpenNewApprovalModal(false);
      setAprovName('');
      setAprovSupplier('');
      setAprovSpecs('');
      setAprovLabRef('');
    } catch (e: any) {
      toast({ title: 'Erro ao submeter material', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[300px] gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">A carregar registos de fiscalização da obra...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Banner de Comando da Fiscalização Técnica */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
              Fiscalização Técnica & Livro de Obra
            </span>
            <span className="text-xs text-slate-400 font-mono">Obra: {project?.code || projectId.slice(0, 8)}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-headline text-white mt-1">
            {project?.name || 'Fiscalização da Obra'}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Controlo de qualidade, conformidade contratual, livro de ocorrências e ordens ao empreiteiro.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            onClick={() => setOpenNewReportModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 gap-1.5 shadow-xs w-full sm:w-auto"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Emitir Diário de Fiscalização</span>
          </Button>
        </div>
      </div>

      {/* 2. KPIs Compactos de Fiscalização (Respondendo às Perguntas da Obra) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Diários Registados */}
        <Card className="p-3.5 border shadow-2xs bg-card">
          <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span>Diários no Livro</span>
            <BookOpen className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold font-headline mt-1 text-foreground">
            {stats.reportsCount}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Registos oficiais de fiscal</div>
        </Card>

        {/* Hold Points Críticos (H) */}
        <Card className="p-3.5 border shadow-2xs bg-card">
          <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span>Pontos de Paragem (H)</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className={`text-xl font-bold font-headline mt-1 ${stats.holdPointsPending > 0 ? 'text-destructive' : 'text-foreground'}`}>
            {stats.holdPointsPending}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {stats.holdPointsPending > 0 ? 'Bloqueiam avanço da obra' : 'Nenhum bloqueio ativo'}
          </div>
        </Card>

        {/* Não Conformidades (NCR) */}
        <Card className="p-3.5 border shadow-2xs bg-card">
          <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span>Não Conformidades</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className={`text-xl font-bold font-headline mt-1 ${stats.openNcrsCount > 0 ? 'text-amber-600' : 'text-foreground'}`}>
            {stats.openNcrsCount}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {stats.criticalNcrs > 0 ? (
              <span className="text-destructive font-bold">{stats.criticalNcrs} críticas em aberto</span>
            ) : (
              'Em acompanhamento'
            )}
          </div>
        </Card>

        {/* Pedidos de Informação (RFI) */}
        <Card className="p-3.5 border shadow-2xs bg-card">
          <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span>RFIs & Pareceres</span>
            <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-headline mt-1 text-foreground">
            {stats.pendingRfis}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {stats.pendingApprovals > 0 ? `${stats.pendingApprovals} mat. aguardam aprovação` : 'Sem pendências de projeto'}
          </div>
        </Card>
      </div>

      {/* 3. Sub-Abas do Módulo de Fiscalização */}
      <Tabs value={activeSubTab} onValueChange={(v: any) => setActiveSubTab(v)} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full h-10 p-1 bg-muted/60">
          <TabsTrigger value="diario" className="text-xs gap-1 font-medium">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Diário Fiscal</span>
          </TabsTrigger>
          <TabsTrigger value="inspecoes" className="text-xs gap-1 font-medium">
            <ClipboardCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Inspeções</span>
          </TabsTrigger>
          <TabsTrigger value="ncrs" className="text-xs gap-1 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Não Conf.</span>
            {stats.openNcrsCount > 0 && (
              <Badge variant="destructive" className="h-4 px-1 text-[9px] ml-0.5">
                {stats.openNcrsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rfis" className="text-xs gap-1 font-medium">
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">RFIs (Dúvidas)</span>
          </TabsTrigger>
          <TabsTrigger value="aprovacoes" className="text-xs gap-1 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Aprovações</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA 1: DIÁRIO DE FISCALIZAÇÃO ─── */}
        <TabsContent value="diario" className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-foreground">Diários de Fiscalização / Livro de Obra</h3>
              <p className="text-xs text-muted-foreground">Registo legal das condições, meios e instruções ao empreiteiro.</p>
            </div>
            <Button size="sm" onClick={() => setOpenNewReportModal(true)} className="text-xs h-8 gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" /> Novo Diário
            </Button>
          </div>

          {reports.length === 0 ? (
            <div className="text-center p-8 border rounded-xl bg-card border-dashed space-y-2">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <BookOpen className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold">Ainda não existem diários de fiscalização registados</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                O fiscal residente pode exarar no livro de obra as condições climáticas, efetivos, frentes de trabalho e instruções imediatas.
              </p>
              <Button size="sm" onClick={() => setOpenNewReportModal(true)} className="text-xs mt-2">
                Emitir Primeiro Diário de Fiscalização
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <Card key={rep.id} className="p-4 border shadow-2xs hover:border-primary/40 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm font-mono text-primary">{rep.reportNumber}</span>
                      <span className="text-xs text-muted-foreground">• Data: {rep.date}</span>
                      <Badge variant="outline" className="text-[10px]">{rep.weather}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Fiscal: <strong className="text-foreground">{rep.inspector.displayName}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
                    <div>
                      <span className="font-semibold text-muted-foreground block">Frente de Trabalho Inspecionada:</span>
                      <p className="text-foreground mt-0.5 font-medium">{rep.workFront}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground block">Efetivo Observado no Campo:</span>
                      <p className="text-foreground mt-0.5">
                        {rep.laborCount.direct} próprios • {rep.laborCount.subcontractor} subempreiteiros (Total: {rep.laborCount.total})
                      </p>
                    </div>
                  </div>

                  {rep.instructionsToContractor && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                      <span className="font-bold text-amber-800 dark:text-amber-300 block">
                        Instruções Exaradas ao Empreiteiro:
                      </span>
                      <p className="text-amber-900 dark:text-amber-200 mt-1 whitespace-pre-line">
                        {rep.instructionsToContractor}
                      </p>
                    </div>
                  )}

                  {rep.pendingItems && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Pendências: </span>
                      {rep.pendingItems}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── ABA 2: INSPEÇÕES E CHECKLISTS ─── */}
        <TabsContent value="inspecoes" className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-foreground">Inspeções Estruturadas & Pontos de Qualidade</h3>
              <p className="text-xs text-muted-foreground">Pontos de Paragem Obrigatória (H), Testemunho (W) e Revisão Documental (R).</p>
            </div>
            <Button size="sm" onClick={() => setOpenNewInspectionModal(true)} className="text-xs h-8 gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" /> Nova Inspeção
            </Button>
          </div>

          {inspections.length === 0 ? (
            <div className="text-center p-8 border rounded-xl bg-card border-dashed space-y-2">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold">Ainda não existem inspeções agendadas</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Crie fichas de verificação para armaduras, betonagens, compactação de aterros e acabamentos antes de libertar as frentes de trabalho.
              </p>
              <Button size="sm" onClick={() => setOpenNewInspectionModal(true)} className="text-xs mt-2">
                Criar Primeira Ficha de Inspeção
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {inspections.map((insp) => (
                <Card key={insp.id} className="p-3.5 border shadow-2xs hover:border-primary/40 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant="outline"
                        className={
                          insp.pointType === 'H'
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/30 font-bold'
                            : insp.pointType === 'W'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 font-bold'
                            : 'bg-blue-500/10 text-blue-600 border-blue-500/30 font-bold'
                        }
                      >
                        {insp.pointType === 'H' ? 'Ponto H (Paragem)' : insp.pointType === 'W' ? 'Ponto W (Testemunho)' : 'Ponto R (Revisão)'}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-primary">{insp.code}</span>
                      <h4 className="font-semibold text-xs text-foreground truncate">{insp.title}</h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="secondary"
                        className={
                          insp.status === 'aprovado'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : insp.status === 'reprovado_com_ncr'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {insp.status === 'aprovado' ? 'Aprovado ✓' : insp.status === 'reprovado_com_ncr' ? 'Reprovado ✗' : 'Pendente de Verificação'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                    <span>Localização: <strong className="text-foreground">{insp.location}</strong></span>
                    <span>Categoria: <strong className="text-foreground">{insp.category}</strong></span>
                    <span>Data: <strong className="text-foreground">{insp.scheduledDate}</strong></span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── ABA 3: NÃO CONFORMIDADES (NCR) ─── */}
        <TabsContent value="ncrs" className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-foreground">Relatórios de Não Conformidade (RNC / NCR)</h3>
              <p className="text-xs text-muted-foreground">Identificação, atribuição de responsável, prazos e validação de encerramento.</p>
            </div>
            <Button size="sm" onClick={() => setOpenNewNcrModal(true)} className="text-xs h-8 gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" /> Abrir NCR
            </Button>
          </div>

          {ncrs.length === 0 ? (
            <div className="text-center p-8 border rounded-xl bg-card border-dashed space-y-2">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold">Sem não conformidades registadas nesta obra</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Todos os trabalhos inspecionados encontram-se em conformidade com o caderno de encargos e especificações do projeto.
              </p>
              <Button size="sm" variant="outline" onClick={() => setOpenNewNcrModal(true)} className="text-xs mt-2">
                Registar Nova NCR se Detetada
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {ncrs.map((ncr) => (
                <Card key={ncr.id} className="p-4 border shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{ncr.ncrNumber}</span>
                      <Badge
                        variant="outline"
                        className={
                          ncr.severity === 'critica'
                            ? 'bg-destructive/10 text-destructive border-destructive/30 font-bold'
                            : ncr.severity === 'maior'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        Severidade: {ncr.severity.toUpperCase()}
                      </Badge>
                      <h4 className="font-bold text-sm text-foreground">{ncr.title}</h4>
                    </div>

                    <Badge
                      variant="secondary"
                      className={
                        ncr.status === 'encerrada'
                          ? 'bg-emerald-500/10 text-emerald-600 font-semibold'
                          : ncr.status === 'aguarda_vistoria'
                          ? 'bg-indigo-500/10 text-indigo-600 font-semibold'
                          : ncr.status === 'em_tratamento'
                          ? 'bg-blue-500/10 text-blue-600 font-semibold'
                          : 'bg-rose-500/10 text-rose-600 font-semibold'
                      }
                    >
                      {ncr.status === 'encerrada'
                        ? 'Encerrada pelo Fiscal ✓'
                        : ncr.status === 'aguarda_vistoria'
                        ? 'Ação Proposta • Aguarda Vistoria'
                        : ncr.status === 'em_tratamento'
                        ? 'Em Tratamento'
                        : 'Aberta (Pendente)'}
                    </Badge>
                  </div>

                  <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-lg leading-relaxed">
                    {ncr.description}
                  </p>

                  {/* Plano de Ação Corretiva do Empreiteiro */}
                  {ncr.correctiveActionPlan && (
                    <div className="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/30 text-xs text-indigo-900 dark:text-indigo-200 space-y-0.5">
                      <span className="font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Plano de Ação Corretiva Proposto:
                      </span>
                      <p className="text-foreground">{ncr.correctiveActionPlan}</p>
                    </div>
                  )}

                  {/* Parecer de Encerramento do Fiscal */}
                  {ncr.status === 'encerrada' && ncr.verifiedBy && (
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <span>✓ Verificada e homologada por: <strong>{ncr.verifiedBy}</strong></span>
                      {ncr.closedDate && <span>Data: {ncr.closedDate}</span>}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground border-t pt-2">
                    <div className="space-x-3">
                      <span>Localização: <strong className="text-foreground">{ncr.location}</strong></span>
                      <span>Responsável: <strong className="text-foreground">{ncr.responsibleParty}</strong></span>
                      <span>Prazo Limite: <strong className="text-rose-600 font-semibold">{ncr.dueDate}</strong></span>
                    </div>

                    {ncr.status !== 'encerrada' && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ncr.status === 'aberta' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateNcrStatus(ncr.id, 'em_tratamento')}
                            className="h-7 text-[11px]"
                          >
                            Iniciar Tratamento
                          </Button>
                        )}
                        {(ncr.status === 'aberta' || ncr.status === 'em_tratamento') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedNcr(ncr);
                              setCorrectiveActionText(ncr.correctiveActionPlan || '');
                              setOpenCorrectiveActionModal(true);
                            }}
                            className="h-7 text-[11px] border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                          >
                            Registar Ação Corretiva
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleUpdateNcrStatus(ncr.id, 'encerrada')}
                          className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Validar Encerramento ✓
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── ABA 4: PEDIDOS DE INFORMAÇÃO (RFI) ─── */}
        <TabsContent value="rfis" className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-foreground">Pedidos de Informação & Esclarecimento Técnico (RFI)</h3>
              <p className="text-xs text-muted-foreground">Fluxo formal: Questão Técnica ➔ Parecer do Projetista/Fiscal ➔ Homologação.</p>
            </div>
            <Button size="sm" onClick={() => setOpenNewRfiModal(true)} className="text-xs h-8 gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" /> Novo RFI
            </Button>
          </div>

          {rfis.length === 0 ? (
            <div className="text-center p-8 border rounded-xl bg-card border-dashed space-y-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold">Sem pedidos de informação em aberto</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Esclareça divergências de projeto, compatibilizações ou pedidos de alteração de forma documentada e rastreável.
              </p>
              <Button size="sm" onClick={() => setOpenNewRfiModal(true)} className="text-xs mt-2">
                Submeter Pedido de Informação (RFI)
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rfis.map((rfi) => (
                <Card key={rfi.id} className="p-4 border shadow-2xs space-y-2">
                  <div className="flex justify-between items-center gap-2 pb-2 border-b">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{rfi.rfiNumber}</span>
                      <h4 className="font-bold text-xs text-foreground">{rfi.subject}</h4>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Urgência: {rfi.urgency.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{rfi.question}</p>
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                    <span>Autor: {rfi.askedBy.name} ({rfi.questionDate})</span>
                    <span>Destinatário: {rfi.assignedTo.name}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── ABA 5: APROVAÇÕES TÉCNICAS DE MATERIAIS ─── */}
        <TabsContent value="aprovacoes" className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-foreground">Aprovações Técnicas de Materiais & Ensaios</h3>
              <p className="text-xs text-muted-foreground">Homologação de cimento, inertes, aditivos, aço e ensaios laboratoriais.</p>
            </div>
            <Button size="sm" onClick={() => setOpenNewApprovalModal(true)} className="text-xs h-8 gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" /> Submeter Material
            </Button>
          </div>

          {approvals.length === 0 ? (
            <div className="text-center p-8 border rounded-xl bg-card border-dashed space-y-2">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold">Sem materiais pendentes de homologação</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Submeta as fichas técnicas e ensaios de betão/aço para que a fiscalização valide antes da aplicação em obra.
              </p>
              <Button size="sm" onClick={() => setOpenNewApprovalModal(true)} className="text-xs mt-2">
                Submeter Primeiro Material
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {approvals.map((ap) => (
                <Card key={ap.id} className="p-3.5 border shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{ap.code}</span>
                      <h4 className="font-bold text-xs text-foreground">{ap.materialName}</h4>
                      <Badge variant="outline" className="text-[10px]">Fornecedor: {ap.supplier}</Badge>
                    </div>
                    {ap.labTestReference && (
                      <p className="text-[11px] text-muted-foreground">Ensaio / Certificado: {ap.labTestReference}</p>
                    )}
                  </div>

                  <Badge
                    variant="secondary"
                    className={
                      ap.decision === 'aprovado'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : ap.decision === 'rejeitado'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-amber-500/10 text-amber-600'
                    }
                  >
                    {ap.decision === 'aprovado' ? 'Homologado ✓' : ap.decision === 'rejeitado' ? 'Rejeitado ✗' : 'Pendente de Análise'}
                  </Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─────────────────── MODAL 1: NOVO DIÁRIO DE FISCALIZAÇÃO ─────────────────── */}
      <Dialog open={openNewReportModal} onOpenChange={setOpenNewReportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              Emitir Diário de Fiscalização (Livro de Obra)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registo oficial das condições de campo, efetivos e instruções ao empreiteiro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs font-semibold">Frente de Obra Fiscalizada *</Label>
              <Input
                placeholder="Ex: Bloco B - Betonagem de Vigas e Lajes Piso 2"
                value={repWorkFront}
                onChange={(e) => setRepWorkFront(e.target.value)}
                className="mt-1 text-xs"
                autoFocus
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Condições Meteorológicas</Label>
              <Select value={repWeather} onValueChange={(v: any) => setRepWeather(v)}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Limpo / Céu Aberto">Limpo / Céu Aberto</SelectItem>
                  <SelectItem value="Nublado">Nublado</SelectItem>
                  <SelectItem value="Chuva Ligeira">Chuva Ligeira</SelectItem>
                  <SelectItem value="Chuva Torrencial / Paralisação">Chuva Torrencial / Paralisação</SelectItem>
                  <SelectItem value="Poeira Intensa">Poeira Intensa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Mão de Obra Própria</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={repDirectLabor}
                  onChange={(e) => setRepDirectLabor(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Subempreiteiros</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={repSubLabor}
                  onChange={(e) => setRepSubLabor(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Instruções Exaradas ao Empreiteiro</Label>
              <Textarea
                placeholder="Ex: Notificado o encarregado para reforçar o escoramento das vigas antes do vazamento..."
                value={repInstructions}
                onChange={(e) => setRepInstructions(e.target.value)}
                className="mt-1 text-xs h-18"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Pendências para Próxima Vistoria</Label>
              <Input
                placeholder="Ex: Apresentar cubos de ensaio de betão aos 7 dias"
                value={repPending}
                onChange={(e) => setRepPending(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setOpenNewReportModal(false)} className="text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateReport} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              Gravar no Livro de Obra ✓
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────── MODAL 2: ABRIR NÃO CONFORMIDADE (NCR) ─────────────────── */}
      <Dialog open={openNewNcrModal} onOpenChange={setOpenNewNcrModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Registar Relatório de Não Conformidade (RNC)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Identifique o desvio técnico, a localização e defina o prazo de resolução.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs font-semibold">Título do Desvio *</Label>
              <Input
                placeholder="Ex: Segregação de betão no pilar P-12"
                value={ncrTitle}
                onChange={(e) => setNcrTitle(e.target.value)}
                className="mt-1 text-xs"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Localização *</Label>
                <Input
                  placeholder="Ex: Piso 1 - Eixo 4"
                  value={ncrLocation}
                  onChange={(e) => setNcrLocation(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Severidade</Label>
                <Select value={ncrSeverity} onValueChange={(v: any) => setNcrSeverity(v)}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="menor">Menor (Acabamentos)</SelectItem>
                    <SelectItem value="maior">Maior (Dimensões/Instalações)</SelectItem>
                    <SelectItem value="critica">Crítica (Estrutural/Segurança)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Descrição Detalhada do Desvio</Label>
              <Textarea
                placeholder="Ex: Detetada falta de recobrimento das armaduras longitudinais com exposição de varões..."
                value={ncrDescription}
                onChange={(e) => setNcrDescription(e.target.value)}
                className="mt-1 text-xs h-18"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Entidade Responsável</Label>
                <Input
                  placeholder="Ex: Subempreiteiro de Cofragens"
                  value={ncrResponsible}
                  onChange={(e) => setNcrResponsible(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Prazo de Resolução</Label>
                <Input
                  type="date"
                  value={ncrDueDate}
                  onChange={(e) => setNcrDueDate(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setOpenNewNcrModal(false)} className="text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateNcr} className="text-xs bg-amber-600 hover:bg-amber-700 text-white">
              Emitir NCR ✓
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────── MODAL 3: NOVA INSPEÇÃO ─────────────────── */}
      <Dialog open={openNewInspectionModal} onOpenChange={setOpenNewInspectionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Agendar Ficha de Inspeção Estruturada
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina o ponto de controlo de qualidade e os itens a verificar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs font-semibold">Atividade / Elemento a Inspecionar *</Label>
              <Input
                placeholder="Ex: Verificação de armaduras e espaçadores pré-betonagem"
                value={inspTitle}
                onChange={(e) => setInspTitle(e.target.value)}
                className="mt-1 text-xs"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Tipo de Ponto</Label>
                <Select value={inspPointType} onValueChange={(v: any) => setInspPointType(v)}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="H">Ponto H (Paragem Obrigatória)</SelectItem>
                    <SelectItem value="W">Ponto W (Testemunho)</SelectItem>
                    <SelectItem value="R">Ponto R (Revisão Documental)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Categoria</Label>
                <Select value={inspCategory} onValueChange={(v: any) => setInspCategory(v)}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Estruturas">Estruturas</SelectItem>
                    <SelectItem value="Fundações">Fundações</SelectItem>
                    <SelectItem value="Terras">Terras</SelectItem>
                    <SelectItem value="Acabamentos">Acabamentos</SelectItem>
                    <SelectItem value="Instalações">Instalações</SelectItem>
                    <SelectItem value="HSEQ">HSEQ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Localização no Estaleiro</Label>
              <Input
                placeholder="Ex: Laje do Piso 1 - Frente Norte"
                value={inspLocation}
                onChange={(e) => setInspLocation(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Itens de Verificação (1 por linha)</Label>
              <Textarea
                placeholder="Limpeza da cofragem&#10;Diâmetro e espaçamento dos varões&#10;Espessura dos espaçadores (recobrimento)"
                value={inspItemsText}
                onChange={(e) => setInspItemsText(e.target.value)}
                className="mt-1 text-xs h-18"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setOpenNewInspectionModal(false)} className="text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateInspection} className="text-xs">
              Criar Ficha ✓
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────── MODAL 4: NOVO RFI ─────────────────── */}
      <Dialog open={openNewRfiModal} onOpenChange={setOpenNewRfiModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              Pedido de Informação / Esclarecimento Técnico (RFI)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submeta uma questão técnica sobre plantas, detalhes construtivos ou compatibilizações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs font-semibold">Assunto / Tópico *</Label>
              <Input
                placeholder="Ex: Divergência de cotas entre desenho de arquitetura e estrutura"
                value={rfiSubject}
                onChange={(e) => setRfiSubject(e.target.value)}
                className="mt-1 text-xs"
                autoFocus
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Nível de Urgência</Label>
              <Select value={rfiUrgency} onValueChange={(v: any) => setRfiUrgency(v)}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa (Planeamento futuro)</SelectItem>
                  <SelectItem value="media">Média (Até 5 dias)</SelectItem>
                  <SelectItem value="alta">Alta (Até 48 horas)</SelectItem>
                  <SelectItem value="urgente">Urgente (Bloqueio de frente hoje)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Questão Técnica Fundamentada *</Label>
              <Textarea
                placeholder="Ex: A planta de fundações (fl. 04) indica cota de assentamento a -2.50m, enquanto a sondagem SP-02 sugere estrato resistente a -3.20m..."
                value={rfiQuestion}
                onChange={(e) => setRfiQuestion(e.target.value)}
                className="mt-1 text-xs h-24"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setOpenNewRfiModal(false)} className="text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateRfi} className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
              Submeter RFI ✓
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────── MODAL 5: APROVAÇÃO DE MATERIAL ─────────────────── */}
      <Dialog open={openNewApprovalModal} onOpenChange={setOpenNewApprovalModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Submissão de Material para Aprovação Técnica
            </DialogTitle>
            <DialogDescription className="text-xs">
              Homologação de materiais, fornecedores e certificados de ensaios laboratoriais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs font-semibold">Designação do Material *</Label>
              <Input
                placeholder="Ex: Cimento Portland Composto CPJ-32.5 (Nova Cimangola)"
                value={aprovName}
                onChange={(e) => setAprovName(e.target.value)}
                className="mt-1 text-xs"
                autoFocus
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Fabricante / Fornecedor *</Label>
              <Input
                placeholder="Ex: Cimenfort / Cimangola / Revendedor Autorizado"
                value={aprovSupplier}
                onChange={(e) => setAprovSupplier(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Referência do Certificado / Ensaio</Label>
              <Input
                placeholder="Ex: Certificado de Qualidade nº 2025/NOV-098"
                value={aprovLabRef}
                onChange={(e) => setAprovLabRef(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Especificações Técnicas de Aplicação</Label>
              <Textarea
                placeholder="Ex: Destinado a betão não estrutural de limpeza e alvenarias de elevação..."
                value={aprovSpecs}
                onChange={(e) => setAprovSpecs(e.target.value)}
                className="mt-1 text-xs h-18"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setOpenNewApprovalModal(false)} className="text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateApproval} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              Submeter Material ✓
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────── MODAL 6: REGISTO DE AÇÃO CORRETIVA (NCR) ─────────────────── */}
      <Dialog open={openCorrectiveActionModal} onOpenChange={setOpenCorrectiveActionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-indigo-700">
              <CheckCircle2 className="h-4 w-4 text-indigo-600" />
              Registo de Ação Corretiva • {selectedNcr?.ncrNumber}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Indique a intervenção técnica executada ou proposta pelo empreiteiro para sanar a não conformidade detetada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1 text-xs">
            <div className="p-2.5 rounded-lg bg-muted/40 border space-y-1">
              <span className="font-bold text-foreground">{selectedNcr?.title}</span>
              <p className="text-muted-foreground">{selectedNcr?.description}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição Pormenorizada da Ação Corretiva *</Label>
              <Textarea
                rows={4}
                placeholder="Ex: Demolição do troço com ninhos de gravilha, limpeza e aplicação de ponte de aderência epóxi seguida de argamassa de reparação estrutural tixotrópica R4..."
                value={correctiveActionText}
                onChange={(e) => setCorrectiveActionText(e.target.value)}
                className="text-xs"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setOpenCorrectiveActionModal(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCorrectiveAction}
              disabled={!correctiveActionText.trim()}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              Submeter para Vistoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default ProjectFiscalizacaoTab;
