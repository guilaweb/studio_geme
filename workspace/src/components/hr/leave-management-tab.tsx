'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, collectionGroup, onSnapshot, query, orderBy, doc, updateDoc, Timestamp, getDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { LeaveRequest, LeaveRequestStatus, WorkforceMember } from '@/types/workforce';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface EnrichedLeaveRequest extends LeaveRequest {
    workforceId: string;
    workforceName?: string;
}

export default function LeaveManagementTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [requests, setRequests] = useState<Omit<EnrichedLeaveRequest, 'workforceName'>[]>([]);
    const [workforce, setWorkforce] = useState<WorkforceMember[]>([]);
    const [loading, setLoading] = useState(true);

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

        const workforceQuery = query(collection(db, 'workforce'), where('author.uid', '==', user.uid));
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
        <Card>
            <CardHeader>
                <CardTitle>Gestão Central de Ausências</CardTitle>
                <CardDescription>Aprove ou rejeite os pedidos de férias e licenças de toda a equipa.</CardDescription>
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
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {enrichedRequests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Nenhum pedido de ausência encontrado.</TableCell>
                                </TableRow>
                            ) : (
                                enrichedRequests.map(req => (
                                    <TableRow key={req.id}>
                                        <TableCell className="font-medium">{req.workforceName}</TableCell>
                                        <TableCell>{req.type}</TableCell>
                                        <TableCell>{format(req.startDate, 'dd/MM/yy')} - {format(req.endDate, 'dd/MM/yy')}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(req.status)}>{req.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            {req.status === 'Pendente' ? (
                                                <div className="flex gap-2 justify-end">
                                                    <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700" onClick={() => handleLeaveStatusChange(req, 'Aprovado')}><Check className="mr-2 h-4 w-4"/>Aprovar</Button>
                                                    <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-100 hover:text-red-700" onClick={() => handleLeaveStatusChange(req, 'Rejeitado')}><X className="mr-2 h-4 w-4"/>Rejeitar</Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Processado</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
