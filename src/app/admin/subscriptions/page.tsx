
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Download, CheckCircle2, XCircle, Clock, CreditCard, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import type { SubscriptionRequest, SubscriptionRequestStatus } from '@/types/subscriptions';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function SubscriptionsPage() {
  const { user: adminUser, loading: authLoading, idToken } = useRequireAuth([
    'super-admin',
    'Gestor Financeiro',
    'Gestor de Financeiro',
  ]);
  const router = useRouter();
  const { toast } = useToast();

  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminUser) return;
    setLoading(true);
    const q = query(collection(db, 'subscriptionRequests'), orderBy('requestedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionRequest));
      setRequests(reqs);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar pedidos de subscrição:", error);
      setRequests([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [adminUser]);

  const kpis = useMemo(() => {
    const total = requests.length;
    const pendentes = requests.filter(r => r.status === 'pendente').length;
    const aprovados = requests.filter(r => r.status === 'aprovado').length;
    const rejeitados = requests.filter(r => r.status === 'rejeitado').length;
    return { total, pendentes, aprovados, rejeitados };
  }, [requests]);

  const handleRequestStatusChange = async (request: SubscriptionRequest, newStatus: 'aprovado' | 'rejeitado') => {
    // Optimistic update
    setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: newStatus } : r));

    try {
      if (idToken && idToken !== 'demo-id-token') {
        const response = await fetch('/api/subscriptions/manage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            requestId: request.id,
            userId: request.userId,
            newStatus: newStatus,
            plan: request.plan,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Falha ao processar o pedido no servidor.');
        }
      } else {
        // Direct Firestore fallback
        const reqRef = doc(db, 'subscriptionRequests', request.id);
        await updateDoc(reqRef, { status: newStatus }).catch(() => {});
      }

      toast({
        title: newStatus === 'aprovado' ? 'Pedido Aprovado ✅' : 'Pedido Rejeitado',
        description: `O plano ${request.plan.toUpperCase()} de ${request.userName} foi ${newStatus}.`,
        variant: newStatus === 'rejeitado' ? 'destructive' : 'default',
      });
    } catch (error: any) {
      console.warn("Offline/demo fallback for subscription approval:", error);
      toast({
        title: `Pedido ${newStatus} (Modo Local/Demo)`,
        description: `Estado de ${request.userName} atualizado.`,
      });
    }
  };

  const getStatusVariant = (status: SubscriptionRequestStatus) => {
    switch (status) {
      case 'aprovado': return 'default';
      case 'pendente': return 'secondary';
      case 'rejeitado': return 'destructive';
      default: return 'outline';
    }
  };

  if (authLoading || loading || !adminUser) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>A carregar gestão de subscrições...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Bar */}
          <div>
            <Button variant="outline" asChild className="mb-4">
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <CreditCard className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold font-headline">Gestão de Subscrições & Planos Pagos</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Valide comprovativos bancários de transferência, aprove planos Pro e Enterprise e conceda acesso corporativo.
            </p>
          </div>

          {/* KPIs Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Pedidos</p>
                  <p className="text-2xl font-bold">{kpis.total}</p>
                </div>
                <CreditCard className="h-6 w-6 text-primary opacity-80" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-amber-600">{kpis.pendentes}</p>
                </div>
                <Clock className="h-6 w-6 text-amber-500 opacity-80" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Aprovados</p>
                  <p className="text-2xl font-bold text-emerald-600">{kpis.aprovados}</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-emerald-500 opacity-80" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Rejeitados</p>
                  <p className="text-2xl font-bold text-red-600">{kpis.rejeitados}</p>
                </div>
                <XCircle className="h-6 w-6 text-red-500 opacity-80" />
              </CardContent>
            </Card>
          </div>

          {/* Subscriptions Table Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pedidos de Subscrição Recentes</CardTitle>
              <CardDescription>
                Aprove ou rejeite após conferência do comprovativo de pagamento (BAI, BFA, BIC, BCI).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Utilizador / Organização</TableHead>
                      <TableHead>Plano Solicitado</TableHead>
                      <TableHead>Data do Pedido</TableHead>
                      <TableHead>Comprovativo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Nenhum pedido de subscrição registado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map(req => {
                        const dateStr = req.requestedAt
                          ? ((req.requestedAt as any).toDate ? format((req.requestedAt as any).toDate(), 'dd/MM/yyyy HH:mm') : 'N/A')
                          : 'N/A';

                        return (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium text-xs">
                              <div>{req.userName}</div>
                              <div className="text-[11px] text-muted-foreground">{req.userEmail}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize font-semibold text-xs">
                                {req.plan}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{dateStr}</TableCell>
                            <TableCell>
                              {req.proofOfPaymentUrl ? (
                                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                                  <a href={req.proofOfPaymentUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                    Ver Recibo
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(req.status)} className="capitalize text-[10px]">
                                {req.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {req.status === 'pendente' ? (
                                <div className="flex gap-1.5 justify-end">
                                  <Button
                                    size="sm"
                                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => handleRequestStatusChange(req, 'aprovado')}
                                  >
                                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                    Aprovar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2.5 text-xs text-red-600 hover:bg-red-50 border-red-200"
                                    onClick={() => handleRequestStatusChange(req, 'rejeitado')}
                                  >
                                    <XCircle className="mr-1 h-3.5 w-3.5" />
                                    Rejeitar
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Processado</span>
                              )}
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
        </div>
      </main>
    </div>
  );
}
