'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Clock,
  FileText,
  User,
  Building2,
  Users,
  HardHat,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  CalendarPlus,
  Send,
  Loader2,
  FolderKanban,
  Star,
  CheckSquare,
  ShieldCheck,
  ExternalLink,
  FileCheck2,
  HeartHandshake
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type HrRequest, type HrLeaveType } from '@/types/hr';

interface MyHrData {
  userProfile: {
    uid: string;
    email: string;
    displayName: string;
    jobTitle: string;
    department: string;
    role: string;
    profileId: string;
    assignedProjects?: Array<{ projectId: string; projectName?: string; projectRole?: string; responsibility?: string }>;
  };
  workforceRecord?: any;
  vacationBalance: {
    year: number;
    totalDaysEntitled: number;
    daysUsed: number;
    daysPending: number;
    daysRemaining: number;
  };
  myRequests: HrRequest[];
  myDocuments: any[];
  myReviews: any[];
  myBenefits?: Array<{ name: string; status: string; provider?: string; coverage?: string; description?: string }>;
}

interface MyHrTabProps {
  onRequestCreated?: () => void;
  activeSection?: 'all' | 'profile' | 'vacation' | 'absences' | 'documents' | 'requests';
}

export default function MyHrTab({ onRequestCreated, activeSection = 'all' }: MyHrTabProps) {
  const { user, idToken } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<MyHrData | null>(null);
  const [loading, setLoading] = useState(true);

  // Request Vacation / Absence Dialog
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState<HrLeaveType>('Férias');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History timeline dialog for a request
  const [selectedRequest, setSelectedRequest] = useState<HrRequest | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  const fetchMyHr = async () => {
    if (!idToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/hr/me', {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar dados pessoais de RH.');
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao carregar Meu RH', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyHr();
  }, [idToken]);

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    return differenceInDays(end, start) + 1;
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const days = calculateDays();
    if (days <= 0) {
      toast({ title: 'Datas inválidas', description: 'A data de término deve ser igual ou posterior à data de início.', variant: 'destructive' });
      return;
    }
    if (!reason.trim()) {
      toast({ title: 'Justificação obrigatória', description: 'Por favor, indique o motivo da solicitação.', variant: 'destructive' });
      return;
    }

    if (requestType === 'Férias' && data?.vacationBalance && days > data.vacationBalance.daysRemaining) {
      toast({
        title: 'Saldo insuficiente',
        description: `Solicitou ${days} dias mas tem apenas ${data.vacationBalance.daysRemaining} dias de férias disponíveis.`,
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/hr/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          type: requestType,
          startDate,
          endDate,
          daysCount: days,
          reason,
          attachmentUrl: attachmentUrl.trim() || null,
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao submeter pedido.');
      }

      toast({
        title: 'Solicitação Enviada com Sucesso!',
        description: `O seu pedido de ${requestType.toLowerCase()} (${days} dias) foi registado e está em análise.`,
      });

      setIsRequestDialogOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      setAttachmentUrl('');
      await fetchMyHr();
      onRequestCreated?.();
    } catch (err: any) {
      toast({ title: 'Falha no envio', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Deseja realmente cancelar este pedido?')) return;
    try {
      const res = await fetch(`/api/hr/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ action: 'cancel', comment: 'Cancelado pelo colaborador.' })
      });
      if (!res.ok) throw new Error('Não foi possível cancelar o pedido.');
      toast({ title: 'Pedido cancelado', description: 'A solicitação foi anulada.' });
      await fetchMyHr();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Aprovado</Badge>;
      case 'Pendente Gestor':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 gap-1"><Clock className="h-3 w-3" /> Parecer do Gestor</Badge>;
      case 'Pendente RH':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 gap-1"><Clock className="h-3 w-3" /> Homologação do RH</Badge>;
      case 'Rejeitado':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejeitado</Badge>;
      case 'Cancelado':
        return <Badge variant="outline" className="text-muted-foreground gap-1"><AlertCircle className="h-3 w-3" /> Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const displayedRequests = useMemo(() => {
    const list = data?.myRequests || [];
    if (activeSection === 'vacation') return list.filter(r => r.type === 'Férias');
    if (activeSection === 'absences') return list.filter(r => r.type !== 'Férias');
    return list;
  }, [data?.myRequests, activeSection]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">A carregar o seu espaço pessoal Meu RH...</p>
      </div>
    );
  }

  const profile = data?.userProfile;
  const balance = data?.vacationBalance || { year: new Date().getFullYear(), totalDaysEntitled: 22, daysUsed: 0, daysPending: 0, daysRemaining: 22 };
  const vacationPercentUsed = Math.min(100, Math.round(((balance.daysUsed + balance.daysPending) / balance.totalDaysEntitled) * 100));

  return (
    <div className="space-y-6">
      {/* 1. CARTÃO CENTRAL DE IDENTIDADE PROFISSIONAL (QUEM SOU & ONDE TRABALHO) */}
      {(activeSection === 'all' || activeSection === 'profile') && (
        <Card className="border-primary/20 shadow-sm bg-gradient-to-br from-card via-card to-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/30 shadow-md">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'ME'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight">{user?.displayName || 'Colaborador'}</h2>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                      Ativo
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <HardHat className="h-3.5 w-3.5 text-primary" />
                    {profile?.jobTitle || 'Técnico de Engenharia'}
                    <span className="text-muted-foreground/40">•</span>
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {profile?.department || 'Engenharia & Obras'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Button
                  onClick={() => {
                    setRequestType('Férias');
                    setIsRequestDialogOpen(true);
                  }}
                  className="gap-2 bg-primary text-primary-foreground shadow-sm flex-1 md:flex-none"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Marcar Férias
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRequestType('Licença Médica');
                    setIsRequestDialogOpen(true);
                  }}
                  className="gap-2 flex-1 md:flex-none"
                >
                  <Clock className="h-4 w-4" />
                  Registar Ausência
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. GRID DE QUADROS (SALDO DE FÉRIAS, PROJETOS ATRIBUÍDOS & EQUIPA) */}
      {(activeSection === 'all' || activeSection === 'profile' || activeSection === 'vacation') && (
        <div className={`grid grid-cols-1 ${activeSection === 'vacation' ? 'md:grid-cols-1 max-w-xl' : 'md:grid-cols-3'} gap-6`}>
          {/* Painel Saldo de Férias */}
          {(activeSection === 'all' || activeSection === 'vacation') && (
            <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Saldo de Férias {balance.year}
              </span>
              <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                {balance.daysRemaining} dias livres
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Direito anual legal de {balance.totalDaysEntitled} dias úteis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>Gozados / Marcados: {balance.daysUsed + balance.daysPending} dias</span>
                <span>{vacationPercentUsed}%</span>
              </div>
              <Progress value={vacationPercentUsed} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-xs">
              <div className="p-2 rounded bg-muted/40">
                <p className="text-muted-foreground text-[10px] uppercase font-bold">Direito</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{balance.totalDaysEntitled}</p>
              </div>
              <div className="p-2 rounded bg-muted/40">
                <p className="text-muted-foreground text-[10px] uppercase font-bold">Gozados</p>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">{balance.daysUsed}</p>
              </div>
              <div className="p-2 rounded bg-muted/40">
                <p className="text-muted-foreground text-[10px] uppercase font-bold">Pendentes</p>
                <p className="text-sm font-bold text-amber-600 mt-0.5">{balance.daysPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

        {/* Projetos em que participo */}
        {(activeSection === 'all' || activeSection === 'profile') && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" />
                Projetos Atribuídos
              </CardTitle>
              <CardDescription className="text-xs">
                Obras onde está oficialmente alocado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(!profile?.assignedProjects || profile.assignedProjects.length === 0) ? (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  Não tem obras atribuídas de momento.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {profile.assignedProjects.map((p, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <p className="text-xs font-semibold truncate">{p.projectName || `Projeto #${p.projectId.slice(0, 6)}`}</p>
                        <p className="text-[11px] text-muted-foreground">{p.projectRole || 'Membro da Equipa'}</p>
                      </div>
                      {p.responsibility && (
                        <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                          {p.responsibility}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Desempenho e Formações */}
        {(activeSection === 'all' || activeSection === 'profile') && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Minhas Avaliações
              </CardTitle>
              <CardDescription className="text-xs">
                Resultados de desempenho homologados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(!data?.myReviews || data.myReviews.length === 0) ? (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  Ainda não foram disponibilizadas avaliações para o seu perfil.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-48 overflow-y-auto">
                  {data.myReviews.map((rev, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border bg-muted/20 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">{rev.cycleName}</span>
                        <Badge variant="secondary" className="font-bold text-amber-600">
                          ★ {rev.overallScore}/5
                        </Badge>
                      </div>
                      {rev.goals && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          <span className="font-medium text-foreground">Metas:</span> {rev.goals}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    )}

      {/* 3. TABELA DE SOLICITAÇÕES RECENTES COM WORKFLOW VISÍVEL */}
      {(activeSection === 'all' || activeSection === 'vacation' || activeSection === 'absences' || activeSection === 'requests') && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {activeSection === 'vacation'
                  ? 'Minhas Solicitações de Férias'
                  : activeSection === 'absences'
                  ? 'Minhas Ausências e Faltas Justificadas'
                  : 'Minhas Solicitações de Férias & Ausências'}
              </CardTitle>
              <CardDescription className="text-xs">
                Acompanhe o estado de aprovação e o histórico das suas solicitações
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (activeSection === 'vacation') setRequestType('Férias');
                else if (activeSection === 'absences') setRequestType('Licença Médica');
                setIsRequestDialogOpen(true);
              }}
              className="gap-1.5 text-xs h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Solicitação
            </Button>
          </CardHeader>
          <CardContent>
            {(!displayedRequests || displayedRequests.length === 0) ? (
              <div className="py-12 text-center text-muted-foreground text-sm space-y-2">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/30" />
                <p>Nenhuma solicitação registada até ao momento.</p>
                <Button variant="outline" size="sm" onClick={() => setIsRequestDialogOpen(true)}>
                  Criar primeira solicitação
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile Cards View (< 768px) */}
                <div className="md:hidden space-y-2.5">
                  {displayedRequests.map((req: HrRequest) => (
                    <div key={req.id} className="p-3.5 rounded-xl border bg-card/70 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{req.type}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                            {req.daysCount} {req.daysCount === 1 ? 'dia' : 'dias'}
                          </span>
                        </div>
                        {getStatusBadge(req.status)}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Período: </span>
                        {req.startDate ? format(new Date(req.startDate), 'dd/MM/yyyy') : '-'} até {req.endDate ? format(new Date(req.endDate), 'dd/MM/yyyy') : '-'}
                      </div>

                      {req.reason && (
                        <p className="text-xs text-muted-foreground/90 italic bg-muted/30 p-2 rounded-lg">
                          "{req.reason}"
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs px-3"
                          onClick={() => {
                            setSelectedRequest(req);
                            setIsTimelineOpen(true);
                          }}
                        >
                          Histórico
                        </Button>
                        {(req.status === 'Pendente Gestor' || req.status === 'Pendente RH') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:text-destructive px-3 border-destructive/20"
                            onClick={() => handleCancelRequest(req.id)}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View (>= 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-center">Dias</TableHead>
                        <TableHead>Motivo / Observações</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedRequests.map((req: HrRequest) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-semibold text-xs">
                            {req.type}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {req.startDate ? format(new Date(req.startDate), 'dd/MM/yyyy') : '-'} até {req.endDate ? format(new Date(req.endDate), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-xs text-center font-bold">
                            {req.daysCount}
                          </TableCell>
                          <TableCell className="text-xs max-w-xs truncate" title={req.reason}>
                            {req.reason}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(req.status)}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setSelectedRequest(req);
                                setIsTimelineOpen(true);
                              }}
                            >
                              Histórico
                            </Button>
                            {(req.status === 'Pendente Gestor' || req.status === 'Pendente RH') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => handleCancelRequest(req.id)}
                              >
                                Cancelar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. DOCUMENTOS AUTORIZADOS & BENEFÍCIOS CORPORATIVOS */}
      {(activeSection === 'all' || activeSection === 'documents' || activeSection === 'profile') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Documentos Autorizados */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                Meus Documentos Autorizados ({data?.myDocuments?.length || 0})
              </CardTitle>
              <CardDescription className="text-xs">
                Declarações, certificados e fichas disponibilizadas pelos Recursos Humanos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(!data?.myDocuments || data.myDocuments.length === 0) ? (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  Nenhum documento anexado ao seu processo individual até ao momento.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {data.myDocuments.map((doc, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <div className="truncate">
                          <p className="font-semibold text-foreground truncate">{doc.title || doc.name}</p>
                          <p className="text-[11px] text-muted-foreground">{doc.type || 'Documento Pessoal'}</p>
                        </div>
                      </div>
                      {doc.url ? (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 shrink-0" asChild>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                            Ver
                          </a>
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Registado</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Benefícios & Regalias */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HeartHandshake className="h-4 w-4 text-emerald-600" />
                Benefícios & Regalias Corporativas
              </CardTitle>
              <CardDescription className="text-xs">
                Coberturas de saúde, transportes e apoios associados à sua função
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {(data?.myBenefits || []).map((b, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{b.name}</span>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          {b.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{b.coverage || b.description || b.provider}</p>
                    </div>
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL DE NOVA SOLICITAÇÃO (FÉRIAS OU AUSÊNCIA) */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateRequest}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <CalendarPlus className="h-5 w-5 text-primary" />
                Nova Solicitação de RH
              </DialogTitle>
              <DialogDescription>
                Submeta o seu pedido para análise e aprovação sequencial da chefia e do departamento de RH.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="req-type">Tipo de Pedido *</Label>
                <Select value={requestType} onValueChange={(val: HrLeaveType) => setRequestType(val)}>
                  <SelectTrigger id="req-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Férias">Férias Anuais</SelectItem>
                    <SelectItem value="Licença Médica">Licença Médica / Baixa</SelectItem>
                    <SelectItem value="Falta Justificada">Falta Justificada</SelectItem>
                    <SelectItem value="Casamento">Licença de Casamento</SelectItem>
                    <SelectItem value="Maternidade / Paternidade">Maternidade / Paternidade</SelectItem>
                    <SelectItem value="Luto">Dispensa por Luto</SelectItem>
                    <SelectItem value="Formação">Formação / Capacitação</SelectItem>
                    <SelectItem value="Outro">Outro Motivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="req-start">Data de Início *</Label>
                  <Input
                    id="req-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="req-end">Data de Fim *</Label>
                  <Input
                    id="req-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {startDate && endDate && (
                <div className="p-2.5 rounded-lg bg-muted/40 border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Duração calculada:</span>
                  <span className="font-bold text-foreground">{calculateDays()} dia(s)</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="req-reason">Justificação / Detalhes *</Label>
                <Textarea
                  id="req-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o motivo ou plano do período..."
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="req-url">Comprovativo / Documento Anexo (Opcional)</Label>
                <Input
                  id="req-url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="URL do atestado, declaração ou comprovativo..."
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => setIsRequestDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submeter Pedido
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE HISTÓRICO / WORKFLOW TIMELINE */}
      <Dialog open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Histórico da Solicitação
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.type} ({selectedRequest?.daysCount} dias) • {selectedRequest?.status}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4">
            {(!selectedRequest?.history || selectedRequest.history.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem registos adicionais de histórico.</p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {selectedRequest.history.map((h, i) => (
                  <div key={i} className="relative text-xs space-y-1">
                    <div className="absolute -left-6 top-0.5 h-3.5 w-3.5 rounded-full bg-primary border-2 border-background" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{h.action}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {h.timestamp ? format(new Date(h.timestamp), 'dd/MM/yyyy HH:mm') : ''}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{h.comment || 'Ação registada.'}</p>
                    <p className="text-[10px] text-primary/80 font-medium">Por: {h.actorName} ({h.actorRole})</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTimelineOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
