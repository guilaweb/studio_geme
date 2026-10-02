
'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { type ChangeRequest, type ChangeRequestStatus } from '@/types/change-management';
import { type WbsItem } from '@/types/wbs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, GitCommitVertical, Send, FilePenLine, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChangeManagementTabProps {
    projectId: string;
    userRole: UserRole | null;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};


export default function ChangeManagementTab({ projectId, userRole }: ChangeManagementTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    const [requests, setRequests] = useState<ChangeRequest[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedWbsItemId, setSelectedWbsItemId] = useState('none');


    // State for updating a request
    const [editingRequest, setEditingRequest] = useState<ChangeRequest | null>(null);
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
    const [costImpact, setCostImpact] = useState('');
    const [scheduleImpact, setScheduleImpact] = useState('');
    const [newStatus, setNewStatus] = useState<ChangeRequestStatus>('Em Análise');

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'changeRequests'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChangeRequest));
            setRequests(fetchedRequests);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching change requests:", error);
            setLoading(false);
        });

        // Fetch WBS items for the dropdown
        const wbsQuery = query(collection(db, 'projects', projectId, 'wbs'), orderBy('name', 'asc'));
        const wbsUnsub = onSnapshot(wbsQuery, (snapshot) => {
            setWbsItems(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as WbsItem));
        });

        return () => {
            unsubscribe();
            wbsUnsub();
        }
    }, [projectId]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setSelectedWbsItemId('none');
        setIsDialogOpen(false);
    };

    const resetUpdateForm = () => {
        setEditingRequest(null);
        setCostImpact('');
        setScheduleImpact('');
        setNewStatus('Em Análise');
        setIsUpdateDialogOpen(false);
    }
    
    const handleSubmit = async () => {
        if (!user) return;
        if (!title.trim() || !description.trim()) {
            toast({ title: 'Campos obrigatórios em falta', variant: 'destructive'});
            return;
        }

        setIsSubmitting(true);
        try {
            const wbsItem = wbsItems.find(item => item.id === selectedWbsItemId);

            await addDoc(collection(db, 'projects', projectId, 'changeRequests'), {
                title,
                description,
                status: 'Submetido',
                requester: { uid: user.uid, displayName: user.displayName },
                wbsItemId: selectedWbsItemId === 'none' ? null : selectedWbsItemId,
                wbsItemName: wbsItem ? wbsItem.name : null,
                costImpact: 0,
                scheduleImpact: 'N/D',
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Pedido de Alteração submetido!'});
            resetForm();
        } catch (error) {
            console.error("Error submitting change request:", error);
            toast({ title: 'Erro ao submeter pedido', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateRequest = async () => {
        if (!canEdit || !editingRequest || !user) return;

        setIsSubmitting(true);
        const batch = writeBatch(db);
        try {
            const costImpactNum = parseFloat(costImpact) || 0;

            const updateData: any = {
                status: newStatus,
                costImpact: costImpactNum,
                scheduleImpact: scheduleImpact || editingRequest.scheduleImpact,
            };

            const requestRef = doc(db, 'projects', projectId, 'changeRequests', editingRequest.id);

            // If the status is changing to 'Aprovado' and it wasn't before
            if (newStatus === 'Aprovado' && editingRequest.status !== 'Aprovado') {
                updateData.approvedBy = { uid: user.uid, displayName: user.displayName };
                updateData.approvedAt = serverTimestamp();

                // And if there is a cost impact, create a financial transaction
                if (costImpactNum !== 0) {
                    const transactionRef = doc(collection(db, 'projects', projectId, 'transactions'));
                    const wbsItem = wbsItems.find(item => item.id === editingRequest.wbsItemId);

                    batch.set(transactionRef, {
                        description: `Custo de Pedido de Alteração: ${editingRequest.title}`,
                        amount: costImpactNum,
                        date: serverTimestamp(),
                        type: costImpactNum > 0 ? 'Despesa' : 'Receita',
                        status: 'Pago', 
                        accountId: 'change-orders',
                        accountName: 'Alterações de Escopo',
                        wbsItemId: editingRequest.wbsItemId || null,
                        wbsItemName: wbsItem?.name || null,
                        changeRequestId: editingRequest.id,
                    });
                }
            }
            
            batch.update(requestRef, updateData);

            await batch.commit();

            toast({ title: 'Pedido de alteração atualizado!'});
            resetUpdateForm();
            
        } catch (error) {
             console.error("Error updating change request:", error);
            toast({ title: 'Erro ao atualizar pedido', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };

    const openUpdateDialog = (request: ChangeRequest) => {
        setEditingRequest(request);
        setCostImpact(String(request.costImpact || ''));
        setScheduleImpact(request.scheduleImpact || '');
        setNewStatus(request.status);
        setIsUpdateDialogOpen(true);
    };

    const getStatusVariant = (status: ChangeRequestStatus) => {
        switch (status) {
            case 'Aprovado': return 'default';
            case 'Submetido':
            case 'Em Análise':
                return 'secondary';
            case 'Rejeitado': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2"><GitCommitVertical className="h-5 w-5 text-primary"/> Gestão de Mudanças</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">Gira todo o ciclo de vida de uma alteração de escopo, desde o pedido inicial até à sua aprovação e impacto no orçamento, garantindo que tudo fica registado.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardTitle>
                        <CardDescription>Registe, avalie e aprove formalmente todas as alterações ao escopo do projeto.</CardDescription>
                    </div>
                     <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4" /> Novo Pedido</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Submeter Pedido de Alteração</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cr-title">Título do Pedido</Label>
                                    <Input id="cr-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Adicionar um novo ponto de luz na sala" />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="cr-desc">Descrição e Justificação</Label>
                                    <Textarea id="cr-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva em detalhe a alteração solicitada e o porquê de ser necessária." rows={5}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cr-wbs">Item da EAP Afetado (Opcional)</Label>
                                    <Select value={selectedWbsItemId} onValueChange={setSelectedWbsItemId}>
                                        <SelectTrigger id="cr-wbs">
                                            <SelectValue placeholder="Selecione um item..."/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhum / Alteração Geral</SelectItem>
                                            {wbsItems.map(item => (
                                                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                                <Button onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2"/>}
                                    Submeter Pedido
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Título</TableHead>
                                    <TableHead>Item da EAP</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Impacto Custo</TableHead>
                                    <TableHead>Estado</TableHead>
                                    {canEdit && <TableHead className="text-right">Ações</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={canEdit ? 6 : 5} className="h-24 text-center">Nenhum pedido de alteração registado.</TableCell>
                                    </TableRow>
                                ) : (
                                    requests.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium max-w-xs truncate">{req.title}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{req.wbsItemName || 'N/A'}</TableCell>
                                            <TableCell>{req.createdAt ? format((req.createdAt as any).toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                            <TableCell>{formatCurrency(req.costImpact)}</TableCell>
                                            <TableCell><Badge variant={getStatusVariant(req.status)}>{req.status}</Badge></TableCell>
                                            {canEdit && (
                                                <TableCell className="text-right">
                                                    <Button variant="outline" size="sm" onClick={() => openUpdateDialog(req)}>
                                                        <FilePenLine className="h-4 w-4 mr-2"/>
                                                        Analisar
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

             <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
                {editingRequest && (
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Analisar Pedido de Alteração</DialogTitle>
                            <DialogDescription className="truncate">"{editingRequest.title}"</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="p-3 bg-secondary rounded-md text-sm">
                                <p><strong>Descrição Original:</strong> {editingRequest.description}</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cr-status">Alterar Estado</Label>
                                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ChangeRequestStatus)}>
                                    <SelectTrigger id="cr-status"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Submetido">Submetido</SelectItem>
                                        <SelectItem value="Em Análise">Em Análise</SelectItem>
                                        <SelectItem value="Aprovado">Aprovado</SelectItem>
                                        <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cr-cost">Impacto no Custo (Kz)</Label>
                                    <Input id="cr-cost" type="number" value={costImpact} onChange={e => setCostImpact(e.target.value)} placeholder="Ex: 50000 ou -20000" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cr-schedule">Impacto no Prazo</Label>
                                    <Input id="cr-schedule" value={scheduleImpact} onChange={e => setScheduleImpact(e.target.value)} placeholder="Ex: +5 dias, -1 semana" />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={resetUpdateForm}>Cancelar</Button>
                            <Button onClick={handleUpdateRequest} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2"/>}
                                Atualizar Pedido
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>
        </>
    );
}
