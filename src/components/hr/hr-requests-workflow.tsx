'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  Check,
  Calendar,
  Building2,
  Loader2,
  History,
  Send,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type HrRequest } from '@/types/hr';

interface HrRequestsWorkflowProps {
  requests: HrRequest[];
  onRefresh: () => void;
  canApproveDirectly: boolean;
}

export default function HrRequestsWorkflow({ requests, onRefresh, canApproveDirectly }: HrRequestsWorkflowProps) {
  const { user, idToken } = useAuth();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Action Dialog state
  const [activeRequest, setActiveRequest] = useState<HrRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [actionComment, setActionComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // History timeline dialog
  const [timelineRequest, setTimelineRequest] = useState<HrRequest | null>(null);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesSearch = 
        r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.reason.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesType = typeFilter === 'all' || r.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, searchTerm, statusFilter, typeFilter]);

  const kpis = useMemo(() => {
    const total = requests.length;
    const pendingManager = requests.filter(r => r.status === 'Pendente Gestor').length;
    const pendingHr = requests.filter(r => r.status === 'Pendente RH').length;
    const approved = requests.filter(r => r.status === 'Aprovado').length;
    return { total, pendingManager, pendingHr, approved };
  }, [requests]);

  const handleProcessAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    if (actionType === 'reject' && !actionComment.trim()) {
      toast({ title: 'Justificação obrigatória', description: 'Por favor, indique a razão da rejeição.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/hr/requests/${activeRequest.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          action: actionType,
          comment: actionComment.trim() || undefined,
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao processar solicitação.');
      }

      toast({
        title: actionType === 'approve' ? 'Solicitação Aprovada!' : 'Solicitação Rejeitada',
        description: `O pedido de ${activeRequest.employeeName} foi atualizado com sucesso.`,
      });

      setActiveRequest(null);
      setActionComment('');
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return <Badge className="bg-emerald-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Aprovado</Badge>;
      case 'Pendente Gestor':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-900 gap-1"><Clock className="h-3 w-3" /> Parecer Chefia</Badge>;
      case 'Pendente RH':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-900 gap-1"><Clock className="h-3 w-3" /> Homologação RH</Badge>;
      case 'Rejeitado':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejeitado</Badge>;
      case 'Cancelado':
        return <Badge variant="outline" className="text-muted-foreground gap-1"><AlertCircle className="h-3 w-3" /> Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. KPIS DO WORKFLOW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card/60 shadow-2xs space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Total de Pedidos</p>
          <p className="text-2xl font-bold text-foreground">{kpis.total}</p>
        </div>
        <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 shadow-2xs space-y-1">
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Aguardam Parecer Chefia</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{kpis.pendingManager}</p>
        </div>
        <div className="p-4 rounded-xl border bg-blue-500/5 border-blue-500/20 shadow-2xs space-y-1">
          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Aguardam Homologação RH</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{kpis.pendingHr}</p>
        </div>
        <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 shadow-2xs space-y-1">
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Pedidos Aprovados</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{kpis.approved}</p>
        </div>
      </div>

      {/* 2. FILTROS E BUSCA */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Gestão de Solicitações (Workflow Sequencial)
            </CardTitle>
            <CardDescription className="text-xs">
              Fluxo completo: Colaborador solicita → Chefia analisa → RH homologa
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-48">
              <Input
                placeholder="Pesquisar por colaborador ou motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Estados</SelectItem>
                <SelectItem value="Pendente Gestor">Pendente Gestor</SelectItem>
                <SelectItem value="Pendente RH">Pendente RH</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
                <SelectItem value="Rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="Férias">Férias</SelectItem>
                <SelectItem value="Licença Médica">Licença Médica</SelectItem>
                <SelectItem value="Falta Justificada">Falta Justificada</SelectItem>
                <SelectItem value="Casamento">Casamento</SelectItem>
                <SelectItem value="Luto">Luto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Nenhuma solicitação encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-center">Dias</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Estado Atual</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-semibold text-xs">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {req.employeeName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-foreground">{req.employeeName}</p>
                            <p className="text-[10px] text-muted-foreground">{req.employeeEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {req.department}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {req.type}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(req.startDate), 'dd/MM/yyyy')} a {format(new Date(req.endDate), 'dd/MM/yyyy')}
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
                          onClick={() => setTimelineRequest(req)}
                        >
                          Histórico
                        </Button>
                        {canApproveDirectly && (req.status === 'Pendente RH' || req.status === 'Pendente Gestor') && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              onClick={() => {
                                setActiveRequest(req);
                                setActionType('approve');
                                setActionComment('Solicitação homologada pelo departamento de RH.');
                              }}
                            >
                              <Check className="h-3 w-3" />
                              Homologar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setActiveRequest(req);
                                setActionType('reject');
                                setActionComment('');
                              }}
                            >
                              Rejeitar
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE DECISÃO (HOMOLOGAR / REJEITAR) */}
      <Dialog open={!!activeRequest} onOpenChange={() => setActiveRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleProcessAction}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                {actionType === 'approve' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {actionType === 'approve' ? 'Homologar Solicitação de RH' : 'Rejeitar Solicitação de RH'}
              </DialogTitle>
              <DialogDescription>
                Colaborador: <span className="font-bold text-foreground">{activeRequest?.employeeName}</span> ({activeRequest?.type}, {activeRequest?.daysCount} dias)
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="action-comment">
                  {actionType === 'approve' ? 'Observações de Homologação (Opcional)' : 'Fundamentação da Recusa *'}
                </Label>
                <Textarea
                  id="action-comment"
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder={actionType === 'approve' ? 'Ex: Homologado conforme mapa anual de férias.' : 'Ex: Período incompatível com requisitos do projeto...'}
                  rows={3}
                  required={actionType === 'reject'}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => setActiveRequest(null)}>
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing}
                className={actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white gap-2' : 'bg-destructive text-destructive-foreground gap-2'}
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                {actionType === 'approve' ? 'Homologar Definitivamente' : 'Confirmar Rejeição'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE HISTÓRICO WORKFLOW */}
      <Dialog open={!!timelineRequest} onOpenChange={() => setTimelineRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" />
              Histórico do Pedido
            </DialogTitle>
            <DialogDescription>
              {timelineRequest?.employeeName} • {timelineRequest?.type} ({timelineRequest?.daysCount} dias)
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4">
            {(!timelineRequest?.history || timelineRequest.history.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem registos adicionais de histórico.</p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {timelineRequest.history.map((h, i) => (
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
            <Button variant="outline" onClick={() => setTimelineRequest(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
