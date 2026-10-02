
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, collectionGroup, onSnapshot, query, orderBy, doc, updateDoc, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { LeaveRequest, LeaveRequestStatus, WorkforceMember } from '@/types/workforce';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Calendar as CalendarIcon, UserX, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, isWithinInterval, eachDayOfInterval, startOfDay, addDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EnrichedLeaveRequest extends LeaveRequest {
    workforceId: string;
    workforceName?: string;
}

const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export default function LeaveManagementTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [requests, setRequests] = useState<Omit<EnrichedLeaveRequest, 'workforceName'>[]>([]);
    const [workforce, setWorkforce] = useState<WorkforceMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        let workforceLoaded = false;
        let requestsLoaded = false;

        const checkDone = () => {
            if (workforceLoaded && requestsLoaded) {
                setLoading(false);
            }
        };

        const workforceQuery = query(collection(db, 'workforce'));
        const unsubWorkforce = onSnapshot(workforceQuery, (snapshot) => {
            setWorkforce(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkforceMember)));
            workforceLoaded = true;
            checkDone();
        }, (error) => {
            console.error("Error fetching workforce:", error);
            workforceLoaded = true;
            checkDone();
        });
        
        const leaveQuery = query(collectionGroup(db, 'leaveRequests'), orderBy('createdAt', 'desc'));
        const unsubLeave = onSnapshot(leaveQuery, (snapshot) => {
            const fetchedRequests = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const workforceId = docSnap.ref.parent.parent?.id;
                if (!workforceId) return null;

                return {
                    id: docSnap.id,
                    ...data,
                    startDate: (data.startDate as Timestamp).toDate(),
                    endDate: (data.endDate as Timestamp).toDate(),
                    workforceId: workforceId,
                } as Omit<EnrichedLeaveRequest, 'workforceName'>;
            }).filter((r): r is Omit<EnrichedLeaveRequest, 'workforceName'> => r !== null);
            
            setRequests(fetchedRequests);
            requestsLoaded = true;
            checkDone();
        }, (error) => {
            console.error("Error fetching leave requests:", error);
            toast({ title: 'Erro ao carregar pedidos', variant: 'destructive' });
            requestsLoaded = true;
            checkDone();
        });

        return () => {
            unsubWorkforce();
            unsubLeave();
        };
    }, [user, toast]);

    const enrichedRequests = useMemo(() => {
        const workforceMap = new Map(workforce.map(w => [w.id, w.name]));
        return requests.map(req => ({
            ...req,
            workforceName: workforceMap.get(req.workforceId) || 'Desconhecido'
        }));
    }, [requests, workforce]);

    const { pendingRequests, historicalRequests } = useMemo(() => {
        const pending = enrichedRequests.filter(req => req.status === 'Pendente');
        const historical = enrichedRequests
            .filter(req => req.status !== 'Pendente')
            .sort((a,b) => b.startDate.getTime() - a.startDate.getTime());
        return { pendingRequests: pending, historicalRequests: historical };
    }, [enrichedRequests]);
    
    const kpiData = useMemo(() => {
        const today = new Date();
        const onLeaveToday = enrichedRequests.filter(req => 
            req.status === 'Aprovado' && 
            isWithinInterval(startOfDay(today), { start: startOfDay(req.startDate), end: startOfDay(req.endDate) })
        ).length;

        return {
            onLeaveToday,
            pendingCount: pendingRequests.length,
        };
    }, [enrichedRequests, pendingRequests]);

    const approvedLeaveDates = useMemo(() => {
        const dates = new Set<string>();
        enrichedRequests.forEach(req => {
            if (req.status === 'Aprovado') {
                const interval = eachDayOfInterval({ start: req.startDate, end: req.endDate });
                interval.forEach(day => dates.add(format(day, 'yyyy-MM-dd')));
            }
        });
        return Array.from(dates).map(dateStr => new Date(dateStr));
    }, [enrichedRequests]);

    const membersOnLeaveForSelectedDay = useMemo(() => {
        if (!selectedDate) return [];
        return enrichedRequests.filter(req => 
            req.status === 'Aprovado' && 
            isWithinInterval(startOfDay(selectedDate), { start: startOfDay(req.startDate), end: startOfDay(req.endDate) })
        );
    }, [selectedDate, enrichedRequests]);

    const handleLeaveStatusChange = async (req: EnrichedLeaveRequest, newStatus: LeaveRequestStatus) => {
        if (!user) return;
        const leaveRef = doc(db, 'workforce', req.workforceId, 'leaveRequests', req.id);
        try {
            await updateDoc(leaveRef, {
                status: newStatus,
                approver: {
                    uid: user.uid,
                    displayName: user.displayName
                }
            });
            
            if (newStatus === 'Aprovado' && new Date() >= req.startDate && new Date() <= req.endDate) {
                 const memberRef = doc(db, 'workforce', req.workforceId);
                 await updateDoc(memberRef, { status: 'De Férias' });
            }

            toast({ title: `Pedido ${newStatus === 'Aprovado' ? 'aprovado' : 'rejeitado'}.` });
        } catch (error) {
            toast({ title: 'Erro ao atualizar pedido', variant: 'destructive' });
        }
    };
    
    const getStatusVariant = (status: LeaveRequestStatus) => {
        switch(status) {
            case 'Aprovado': return 'default';
            case 'Pendente': return 'secondary';
            case 'Rejeitado': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Funcionários Ausentes Hoje</CardTitle>
                        <UserX className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin"/> : kpiData.onLeaveToday}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin"/> : kpiData.pendingCount}</div>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-primary"/> Calendário de Ausências</CardTitle>
                    <CardDescription>Visualize as ausências aprovadas da equipa e gira os pedidos pendentes.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-md border p-4 w-full justify-center"
                        modifiers={{ onLeave: approvedLeaveDates }}
                        modifiersClassNames={{ onLeave: 'bg-destructive/20 rounded-full' }}
                        disabled={loading}
                    />
                     <div className="space-y-4">
                        <h3 className="font-semibold">
                            Equipa Ausente em {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''}
                        </h3>
                        {loading ? <Loader2 className="animate-spin" /> : membersOnLeaveForSelectedDay.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">Ninguém ausente neste dia.</p>
                        ) : (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {membersOnLeaveForSelectedDay.map(req => (
                                    <div key={req.id} className="flex items-center gap-3 p-2 bg-secondary rounded-md">
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback>{getInitials(req.workforceName)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">{req.workforceName}</p>
                                            <p className="text-xs text-muted-foreground">{req.type}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                     </div>
                </CardContent>
            </Card>

             <Tabs defaultValue="pending" className="w-full">
                <TabsList>
                    <TabsTrigger value="pending">Pedidos Pendentes</TabsTrigger>
                    <TabsTrigger value="history">Histórico</TabsTrigger>
                </TabsList>
                <TabsContent value="pending" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pedidos de Ausência Pendentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Funcionário</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Período</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingRequests.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">Nenhum pedido de ausência pendente.</TableCell>
                                            </TableRow>
                                        ) : (
                                            pendingRequests.map(req => (
                                                <TableRow key={req.id}>
                                                    <TableCell className="font-medium">{req.workforceName}</TableCell>
                                                    <TableCell>{req.type}</TableCell>
                                                    <TableCell>{format(req.startDate, 'dd/MM/yy')} - {format(req.endDate, 'dd/MM/yy')}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex gap-2 justify-end">
                                                            <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700" onClick={() => handleLeaveStatusChange(req, 'Aprovado')}><Check className="mr-2 h-4 w-4"/>Aprovar</Button>
                                                            <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-100 hover:text-red-700" onClick={() => handleLeaveStatusChange(req, 'Rejeitado')}><X className="mr-2 h-4 w-4"/>Rejeitar</Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="history" className="mt-4">
                    <Card>
                         <CardHeader>
                            <CardTitle>Histórico de Pedidos</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {loading ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Funcionário</TableHead>
                                            <TableHead>Período</TableHead>
                                            <TableHead>Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {historicalRequests.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center">Nenhum pedido no histórico.</TableCell>
                                            </TableRow>
                                        ) : (
                                            historicalRequests.map(req => (
                                                <TableRow key={req.id}>
                                                    <TableCell className="font-medium">{req.workforceName}</TableCell>
                                                    <TableCell>{format(req.startDate, 'dd/MM/yy')} - {format(req.endDate, 'dd/MM/yy')}</TableCell>
                                                    <TableCell><Badge variant={getStatusVariant(req.status)}>{req.status}</Badge></TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
