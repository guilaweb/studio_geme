'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  HardHat,
  Search,
  Building2,
  Send,
  Loader2,
  Phone,
  Mail,
  AlertTriangle,
  UserCheck,
  UserMinus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type WorkforceMember } from '@/types/workforce';
import { type HrRequest, type HrTeam } from '@/types/hr';

interface MyTeamTabProps {
  workforce: WorkforceMember[];
  onRequestUpdated?: () => void;
  activeSection?: 'all' | 'team' | 'vacations' | 'absences';
}

export default function MyTeamTab({ workforce, onRequestUpdated, activeSection = 'all' }: MyTeamTabProps) {
  const { user, idToken } = useAuth();
  const { toast } = useToast();

  const [teamRequests, setTeamRequests] = useState<HrRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Action dialog state (approve or reject with comment)
  const [actionRequest, setActionRequest] = useState<HrRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [actionComment, setActionComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchTeamRequests = async () => {
    if (!idToken) return;
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/hr/requests', {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar solicitações da equipa.');
      const data = await res.json();
      setTeamRequests(data.requests || []);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao carregar pedidos', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchTeamRequests();
  }, [idToken]);

  // Equipa associada: membros pertencentes aos mesmos projetos do gestor ou departamento
  const teamMembers = useMemo(() => {
    if (!user) return [];
    const myProjectIds = new Set((user.assignedProjects || []).map(p => p.projectId));
    
    return workforce.filter(m => {
      // Não listar o próprio gestor como seu subordinado
      if (m.id === user.uid || (m.contact && m.contact.toLowerCase() === (user.email || '').toLowerCase())) {
        return false;
      }
      // Se estiver no mesmo projeto do gestor
      if (m.currentProjectId && myProjectIds.has(m.currentProjectId)) return true;
      // Se estiver no mesmo departamento
      if (user.department && (m as any).department && (m as any).department.toLowerCase() === user.department.toLowerCase()) return true;
      // Ou na equipa operacional de obras se o gestor for de Engenharia / Obras
      if (user.department && (user.department.toLowerCase().includes('obra') || user.department.toLowerCase().includes('engenharia')) && m.employmentType === 'Efetivo') return true;
      return false;
    });
  }, [workforce, user]);

  const filteredMembers = useMemo(() => {
    return teamMembers.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teamMembers, searchTerm]);

  // Pedidos que aguardam parecer da chefia (Pendente Gestor)
  const pendingApprovals = useMemo(() => {
    let list = teamRequests.filter(r => r.status === 'Pendente Gestor' && r.employeeUid !== user?.uid);
    if (activeSection === 'vacations') list = list.filter(r => r.type === 'Férias');
    if (activeSection === 'absences') list = list.filter(r => r.type !== 'Férias');
    return list;
  }, [teamRequests, user, activeSection]);

  // Próximas ausências e férias da equipa
  const upcomingLeaves = useMemo(() => {
    let list = teamRequests.filter(r => r.status === 'Aprovado' && new Date(r.endDate) >= new Date());
    if (activeSection === 'vacations') list = list.filter(r => r.type === 'Férias');
    if (activeSection === 'absences') list = list.filter(r => r.type !== 'Férias');
    return list;
  }, [teamRequests, activeSection]);

  const handleProcessAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionRequest) return;

    if (actionType === 'reject' && !actionComment.trim()) {
      toast({ title: 'Justificação obrigatória', description: 'Por favor, indique a razão da rejeição.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/hr/requests/${actionRequest.id}`, {
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
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao processar solicitação.');
      }

      toast({
        title: actionType === 'approve' ? 'Parecer Emitido com Sucesso!' : 'Solicitação Rejeitada',
        description: actionType === 'approve' 
          ? `O pedido de ${actionRequest.employeeName} foi aprovado pela chefia e encaminhado ao RH.`
          : `A solicitação foi recusada com parecer fundamentado.`,
      });

      setActionRequest(null);
      setActionComment('');
      await fetchTeamRequests();
      onRequestUpdated?.();
    } catch (err: any) {
      toast({ title: 'Falha no processamento', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. SEÇÃO DE APROVAÇÕES PENDENTES DE CHEFIA (PRIORIDADE OPERACIONAL) */}
      {(activeSection === 'all' || activeSection === 'team' || activeSection === 'vacations' || activeSection === 'absences') && (
        <Card className="border-amber-500/30 shadow-xs bg-gradient-to-br from-card to-amber-500/5">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                {activeSection === 'vacations'
                  ? `Solicitações de Férias da Equipa Pendentes de Parecer (${pendingApprovals.length})`
                  : activeSection === 'absences'
                  ? `Solicitações de Ausências da Equipa Pendentes de Parecer (${pendingApprovals.length})`
                  : `Solicitações da Equipa Pendentes de Parecer (${pendingApprovals.length})`}
              </CardTitle>
              <CardDescription className="text-xs">
                Como gestor de equipa, valide a compatibilidade das datas com a escala das obras antes de avançar para o RH.
              </CardDescription>
            </div>
          {pendingApprovals.length > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Ação Necessária
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="py-6 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              A carregar solicitações pendentes...
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Excelente! Não tem pedidos de férias ou ausência pendentes da sua equipa.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-center">Dias</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Ação de Chefia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals.map((req) => (
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
                            <p className="text-[10px] text-muted-foreground">{req.employeeRole || req.department}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{req.type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(req.startDate), 'dd/MM/yyyy')} a {format(new Date(req.endDate), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-xs text-center font-bold">{req.daysCount}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          onClick={() => {
                            setActionRequest(req);
                            setActionType('approve');
                            setActionComment('Parecer favorável emitido pela chefia direta. Sem conflito de escala.');
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Parecer Favorável
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setActionRequest(req);
                            setActionType('reject');
                            setActionComment('');
                          }}
                        >
                          <XCircle className="h-3 w-3" />
                          Recusar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* 2. MEMBROS DA MINHA EQUIPA (DIRETÓRIO PROFISSIONAL COM RESPEITO À PRIVACIDADE) */}
      {(activeSection === 'all' || activeSection === 'team') && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Membros da Minha Equipa ({filteredMembers.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Profissionais sob sua alocação direta em obras e frentes de serviço
              </CardDescription>
            </div>
            <div className="w-full md:w-64">
              <Input
                placeholder="Pesquisar membro ou função..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                Nenhum membro encontrado sob sua alocação de equipa de momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMembers.map((member) => (
                  <div key={member.id} className="p-4 rounded-xl border bg-card/60 shadow-2xs hover:shadow-xs transition-shadow space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-primary/20">
                        <AvatarImage src={member.photoURL} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-foreground truncate">{member.name}</h4>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <HardHat className="h-3 w-3 text-primary" />
                          {member.role}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t text-[11px]">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Status Operacional:</span>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          {member.status || 'Ativo'}
                        </Badge>
                      </div>
                      {member.currentProjectName && (
                        <div className="flex justify-between text-muted-foreground truncate">
                          <span>Obra Atual:</span>
                          <span className="font-semibold text-foreground truncate max-w-[130px]">{member.currentProjectName}</span>
                        </div>
                      )}
                      {member.contact && (
                        <div className="flex justify-between text-muted-foreground truncate">
                          <span>Contacto:</span>
                          <span className="font-medium text-foreground truncate">{member.contact}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. CALENDÁRIO / MAPA DE AUSÊNCIAS DA EQUIPA PARA PREVENÇÃO DE CONFLITOS */}
      {(activeSection === 'all' || activeSection === 'vacations' || activeSection === 'absences') && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {activeSection === 'vacations'
                ? 'Escala de Férias Programadas da Equipa'
                : activeSection === 'absences'
                ? 'Escala de Ausências e Licenças da Equipa'
                : 'Escala de Férias e Ausências Aprovadas da Equipa'}
            </CardTitle>
            <CardDescription className="text-xs">
              Acompanhe períodos programados para garantir cobertura técnica e de mão de obra nas obras
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingLeaves.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-xs">
                Nenhuma ausência programada na equipa para os próximos períodos.
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingLeaves.map((leave) => (
                  <div key={leave.id} className="p-3 rounded-lg border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">{leave.employeeName} ({leave.type})</p>
                        <p className="text-[11px] text-muted-foreground">{leave.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:text-right">
                      <div>
                        <p className="font-bold text-foreground">
                          {format(new Date(leave.startDate), 'dd/MM/yyyy')} a {format(new Date(leave.endDate), 'dd/MM/yyyy')}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{leave.daysCount} dias autorizados</p>
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[10px]">Aprovado</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL DE PARECER DA CHEFIA */}
      <Dialog open={!!actionRequest} onOpenChange={() => setActionRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleProcessAction}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                {actionType === 'approve' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {actionType === 'approve' ? 'Emitir Parecer Favorável' : 'Recusar Pedido de Ausência'}
              </DialogTitle>
              <DialogDescription>
                Colaborador: <span className="font-bold text-foreground">{actionRequest?.employeeName}</span> • {actionRequest?.type} ({actionRequest?.daysCount} dias)
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/40 border text-xs space-y-1">
                <p><span className="font-semibold text-muted-foreground">Período:</span> {actionRequest?.startDate ? format(new Date(actionRequest.startDate), 'dd/MM/yyyy') : ''} até {actionRequest?.endDate ? format(new Date(actionRequest.endDate), 'dd/MM/yyyy') : ''}</p>
                <p><span className="font-semibold text-muted-foreground">Justificação:</span> {actionRequest?.reason}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="action-comment">
                  {actionType === 'approve' ? 'Parecer da Chefia (Opcional)' : 'Motivo da Recusa *'}
                </Label>
                <Textarea
                  id="action-comment"
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder={actionType === 'approve' ? 'Ex: Cobertura de turno assegurada...' : 'Ex: Período coincide com betonagem crítica da fase 2...'}
                  rows={3}
                  required={actionType === 'reject'}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => setActionRequest(null)}>
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing}
                className={actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white gap-2' : 'bg-destructive text-destructive-foreground gap-2'}
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                {actionType === 'approve' ? 'Confirmar Parecer Favorável' : 'Confirmar Recusa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
