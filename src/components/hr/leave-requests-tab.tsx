'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  collectionGroup, onSnapshot, query, doc, updateDoc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CalendarOff, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { UserRole } from '@/app/projects/[id]/page';
import type { LeaveType, LeaveRequestStatus } from '@/types/workforce';

interface LeaveRequestDoc {
  id: string;
  workforceId: string;
  workerName: string;
  workerRole?: string;
  type: LeaveType;
  status: LeaveRequestStatus;
  startDate: Date;
  endDate: Date;
  notes?: string;
  requester?: { uid: string; displayName: string | null };
  projectId?: string;
  createdAt?: Timestamp;
  ref: string;
}

const TYPE_ICONS: Record<LeaveType, string> = {
  'Ferias': '\uD83C\uDFD6',
  'Licenca Medica': '\uD83C\uDFE5',
  'Falta Justificada': '\uD83D\uDCCB',
  'Outro': '\uD83D\uDCCC',
} as any;

const getTypeIcon = (t: LeaveType) => {
  if (t === 'Férias') return '🏖';
  if (t === 'Licença Médica') return '🏥';
  if (t === 'Falta Justificada') return '📋';
  return '📌';
};

const STATUS_COLOR: Record<LeaveRequestStatus, string> = {
  'Pendente':  'text-amber-700 bg-amber-100 border-amber-200',
  'Aprovado':  'text-emerald-700 bg-emerald-100 border-emerald-200',
  'Rejeitado': 'text-red-700 bg-red-100 border-red-200',
};

interface LeaveRequestsTabProps {
  userRole: UserRole | null;
}

export default function LeaveRequestsTab({ userRole }: LeaveRequestsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canApprove = userRole
    ? (userRole === 'Gestor' || userRole === 'Editor' || (userRole as string) === 'super-admin')
    : true;

  useEffect(() => {
    const q = query(collectionGroup(db, 'leaveRequests'));
    const unsub = onSnapshot(q, (snap) => {
      const docs: LeaveRequestDoc[] = snap.docs.map(d => {
        const data = d.data() as Record<string, any>;
        const toDate = (v: any): Date => {
          if (v instanceof Timestamp) return v.toDate();
          if (v && typeof v.toDate === 'function') return v.toDate();
          return new Date(v);
        };
        return {
          id: d.id,
          workforceId: d.ref.parent.parent?.id || '',
          workerName: data.workerName || 'Desconhecido',
          workerRole: data.workerRole,
          type: data.type as LeaveType,
          status: data.status as LeaveRequestStatus,
          startDate: toDate(data.startDate),
          endDate: toDate(data.endDate),
          notes: data.notes,
          requester: data.requester,
          projectId: data.projectId,
          createdAt: data.createdAt,
          ref: d.ref.path,
        };
      });
      setRequests(docs);
      setLoading(false);
    }, (err) => {
      console.warn('Could not fetch leave requests:', err);
      setRequests([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAction = async (req: LeaveRequestDoc, newStatus: 'Aprovado' | 'Rejeitado') => {
    if (!canApprove || !user) return;
    setActionLoading(req.id);
    try {
      await updateDoc(doc(db, req.ref), {
        status: newStatus,
        approver: { uid: user.uid, displayName: user.displayName || 'Gestor' },
        [`${newStatus === 'Aprovado' ? 'approved' : 'rejected'}At`]: serverTimestamp(),
      });
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: newStatus } : r));
      toast({
        title: newStatus === 'Aprovado' ? `Pedido aprovado ✅` : 'Pedido rejeitado',
        description: `Pedido de ${req.type} de ${req.workerName} foi ${newStatus.toLowerCase()}.`,
        variant: newStatus === 'Rejeitado' ? 'destructive' : 'default',
      });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao processar pedido', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const grouped = useMemo(() => ({
    Pendente:  requests.filter(r => r.status === 'Pendente'),
    Aprovado:  requests.filter(r => r.status === 'Aprovado'),
    Rejeitado: requests.filter(r => r.status === 'Rejeitado'),
  }), [requests]);

  const RequestTable = ({ items, showActions }: { items: LeaveRequestDoc[]; showActions: boolean }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Período</TableHead>
            <TableHead className="text-center">Dias</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Estado</TableHead>
            {showActions && canApprove && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions && canApprove ? 7 : 6} className="h-24 text-center text-muted-foreground">
                Nenhum pedido nesta categoria.
              </TableCell>
            </TableRow>
          ) : (
            items.map(req => {
              const days = differenceInCalendarDays(req.endDate, req.startDate) + 1;
              const isActioning = actionLoading === req.id;
              return (
                <TableRow key={req.id}>
                  <TableCell>
                    <div className="font-medium">{req.workerName}</div>
                    {req.workerRole && <div className="text-xs text-muted-foreground">{req.workerRole}</div>}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm">
                      {getTypeIcon(req.type)} {req.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{format(req.startDate, 'dd MMM', { locale: ptBR })}</div>
                    <div className="text-muted-foreground text-xs">até {format(req.endDate, 'dd MMM yyyy', { locale: ptBR })}</div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">{days}</TableCell>
                  <TableCell className="max-w-[180px] text-xs text-muted-foreground truncate" title={req.notes}>
                    {req.notes || '—'}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLOR[req.status]}`}>
                      {req.status}
                    </span>
                  </TableCell>
                  {showActions && canApprove && (
                    <TableCell className="text-right">
                      {req.status === 'Pendente' ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            disabled={isActioning}
                            onClick={() => handleAction(req, 'Aprovado')}
                          >
                            {isActioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            <span className="ml-1 text-xs">Aprovar</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-red-700 border-red-200 hover:bg-red-50"
                            disabled={isActioning}
                            onClick={() => handleAction(req, 'Rejeitado')}
                          >
                            {isActioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                            <span className="ml-1 text-xs">Rejeitar</span>
                          </Button>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Processado</span>}
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarOff className="h-5 w-5 text-amber-600" />
          Gestão de Ausências e Férias
        </CardTitle>
        <CardDescription>
          Reveja e processe pedidos de ausência de toda a equipa. Pedidos aprovados ficam visíveis na Escala &amp; Calendário.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border p-4 text-center">
                <Clock className="h-5 w-5 mx-auto text-amber-600 mb-1" />
                <div className="text-2xl font-bold text-amber-700">{grouped.Pendente.length}</div>
                <div className="text-xs text-muted-foreground">Pendentes</div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
                <div className="text-2xl font-bold text-emerald-700">{grouped.Aprovado.length}</div>
                <div className="text-xs text-muted-foreground">Aprovados</div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <XCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
                <div className="text-2xl font-bold text-red-700">{grouped.Rejeitado.length}</div>
                <div className="text-xs text-muted-foreground">Rejeitados</div>
              </div>
            </div>

            <Tabs defaultValue="pendente">
              <TabsList>
                <TabsTrigger value="pendente" className="flex items-center gap-2">
                  Pendentes
                  {grouped.Pendente.length > 0 && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs ml-1">
                      {grouped.Pendente.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="aprovado">Aprovados</TabsTrigger>
                <TabsTrigger value="rejeitado">Rejeitados</TabsTrigger>
              </TabsList>
              <TabsContent value="pendente" className="mt-4">
                <RequestTable items={grouped.Pendente} showActions={true} />
              </TabsContent>
              <TabsContent value="aprovado" className="mt-4">
                <RequestTable items={grouped.Aprovado} showActions={false} />
              </TabsContent>
              <TabsContent value="rejeitado" className="mt-4">
                <RequestTable items={grouped.Rejeitado} showActions={false} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}
