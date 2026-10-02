

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp, writeBatch, doc, getDocs, where, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Receipt, FileUp, CheckCircle, Package, Eye, Truck, MoreHorizontal, Send, Trash2 } from 'lucide-react';
import { type PurchaseOrder, type SupplierInvoice, type SupplierInvoiceStatus } from '@/types/purchasing';
import { type Supplier } from '@/types/suppliers';
import type { WbsItem } from '@/types/wbs';
import type { UserRole } from '@/app/projects/[id]/page';
import { useAuth } from '@/hooks/use-auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface SupplierInvoicesTabProps {
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

export default function SupplierInvoicesTab({ projectId, userRole }: SupplierInvoicesTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();

    const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [loadingStates, setLoadingStates] = useState({
        invoices: true,
        pos: true,
        suppliers: true,
        wbs: true,
    });
    const isLoading = Object.values(loadingStates).some(state => state);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(new Date());
    const [dueDate, setDueDate] = useState<Date | undefined>();
    const [totalAmount, setTotalAmount] = useState('');
    const [linkedPoIds, setLinkedPoIds] = useState<string[]>([]);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [selectedWbsItemId, setSelectedWbsItemId] = useState<string>('none');

    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    useEffect(() => {
        if (!projectId) return;

        const createSubscription = (path: string, setter: React.Dispatch<any>, key: keyof typeof loadingStates, orderByField?: string, orderDirection: 'asc' | 'desc' = 'asc') => {
            const collRef = collection(db, path);
            const q = orderByField ? query(collRef, orderBy(orderByField, orderDirection)) : query(collRef);
            return onSnapshot(q, (snapshot) => {
                const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setter(items);
                setLoadingStates(prev => ({ ...prev, [key]: false }));
            }, (error) => {
                console.error(`Error fetching ${path}:`, error);
                toast({ title: `Erro ao carregar dados de ${path}`, variant: 'destructive' });
                setLoadingStates(prev => ({ ...prev, [key]: false }));
            });
        };

        const unsubscribes = [
            createSubscription(`projects/${projectId}/suppliers`, setSuppliers, 'suppliers'),
            createSubscription(`projects/${projectId}/purchaseOrders`, setPurchaseOrders, 'pos', 'createdAt', 'desc'),
            createSubscription(`projects/${projectId}/supplierInvoices`, setInvoices, 'invoices', 'invoiceDate', 'desc'),
            createSubscription(`projects/${projectId}/wbs`, setWbsItems, 'wbs'),
        ];
        
        return () => unsubscribes.forEach(unsub => unsub());

    }, [projectId, toast]);

    const resetForm = () => {
        setIsDialogOpen(false);
        setIsSubmitting(false);
        setInvoiceNumber('');
        setSelectedSupplierId('');
        setInvoiceDate(new Date());
        setDueDate(undefined);
        setTotalAmount('');
        setLinkedPoIds([]);
        setInvoiceFile(null);
        setSelectedWbsItemId('none');
    };

    const handleAddInvoice = async () => {
        if (!canEdit || !user || !idToken) return;
        if (!invoiceNumber || !selectedSupplierId || !invoiceDate || !totalAmount || !invoiceFile) {
            toast({ title: 'Campos obrigatórios em falta', description: 'Todos os campos são obrigatórios.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('file', invoiceFile);
            formData.append('invoiceNumber', invoiceNumber);
            formData.append('supplierId', selectedSupplierId);
            formData.append('invoiceDate', invoiceDate.toISOString());
            if (dueDate) formData.append('dueDate', dueDate.toISOString());
            formData.append('totalAmount', totalAmount);
            linkedPoIds.forEach(id => formData.append('purchaseOrderIds[]', id));
            
            if (selectedWbsItemId !== 'none') {
                const wbsItem = wbsItems.find(item => item.id === selectedWbsItemId);
                if (wbsItem) {
                    formData.append('wbsItemId', selectedWbsItemId);
                    formData.append('wbsItemName', wbsItem.name);
                }
            }

            const response = await fetch(`/api/projects/${projectId}/supplier-invoices`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${idToken}` },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao registar a fatura.');
            }

            toast({ title: 'Fatura registada com sucesso!' });
            resetForm();

        } catch (error: any) {
            console.error('Error adding supplier invoice:', error);
            toast({ title: 'Erro ao registar fatura', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleMarkAsPaid = async (invoice: SupplierInvoice) => {
        if (!canEdit || !idToken) return;
        
        try {
             const batch = writeBatch(db);
             
             // Update invoice status
             const invoiceRef = doc(db, 'projects', projectId, 'supplierInvoices', invoice.id);
             batch.update(invoiceRef, { status: 'Paga' });
             
             // Update related financial transaction status
             const transactionQuery = query(
               collection(db, 'projects', projectId, 'transactions'),
               where('supplierInvoiceId', '==', invoice.id)
             );
             const transactionSnapshot = await getDocs(transactionQuery);
             if (!transactionSnapshot.empty) {
                const transactionDocRef = transactionSnapshot.docs[0].ref;
                batch.update(transactionDocRef, { status: 'Pago' });
             }

             await batch.commit();
             toast({ title: 'Fatura marcada como Paga!'});
        } catch (error) {
            console.error("Error marking invoice as paid: ", error);
            toast({ title: 'Erro ao marcar como paga', variant: 'destructive'});
        }
    };
    
    const getStatusVariant = (status: SupplierInvoiceStatus) => {
        switch(status) {
            case 'Paga': return 'default';
            case 'Pendente':
            case 'Em Processamento':
                 return 'secondary';
            case 'Disputa': return 'destructive';
            default: return 'outline';
        }
    };
    
    const availablePOsForSupplier = useMemo(() => {
        if (!selectedSupplierId) return [];
        return purchaseOrders.filter(po => po.supplierId === selectedSupplierId);
    }, [selectedSupplierId, purchaseOrders]);

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary"/> Faturas de Fornecedores</CardTitle>
                        <CardDescription>Registe e controle os pagamentos das faturas recebidas.</CardDescription>
                    </div>
                    {canEdit && (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button><Plus className="mr-2"/>Adicionar Fatura</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl">
                                 <DialogHeader>
                                    <DialogTitle>Registar Nova Fatura de Fornecedor</DialogTitle>
                                </DialogHeader>
                                <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto px-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="inv-supplier">Fornecedor</Label>
                                            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                                                <SelectTrigger id="inv-supplier"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="inv-number">Nº da Fatura</Label>
                                            <Input id="inv-number" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Data da Fatura</Label>
                                            <DatePicker date={invoiceDate} setDate={setInvoiceDate} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Data de Vencimento</Label>
                                            <DatePicker date={dueDate} setDate={setDueDate} />
                                        </div>
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="inv-amount">Valor Total (Kz)</Label>
                                        <Input id="inv-amount" type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="inv-wbs">Associar à Atividade da EAP (Opcional)</Label>
                                        <Select value={selectedWbsItemId} onValueChange={setSelectedWbsItemId}>
                                            <SelectTrigger id="inv-wbs">
                                                <SelectValue placeholder="Selecione um item da EAP..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Custo Geral do Projeto</SelectItem>
                                                {wbsItems.map(item => (
                                                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Ordens de Compra Associadas (Opcional)</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={!selectedSupplierId}>
                                                    {linkedPoIds.length > 0 ? `${linkedPoIds.length} selecionada(s)` : 'Selecione as OCs...'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                <Command>
                                                    <CommandList>
                                                        <CommandEmpty>Nenhuma OC para este fornecedor.</CommandEmpty>
                                                        <CommandGroup className="max-h-48 overflow-y-auto">
                                                        {availablePOsForSupplier.map(po => (
                                                            <CommandItem key={po.id} onSelect={() => {
                                                                const newSelection = linkedPoIds.includes(po.id) ? linkedPoIds.filter(id => id !== po.id) : [...linkedPoIds, po.id];
                                                                setLinkedPoIds(newSelection);
                                                            }}>
                                                                <Check className={cn("mr-2 h-4 w-4", linkedPoIds.includes(po.id) ? "opacity-100" : "opacity-0")} />
                                                                {po.id.substring(0, 8)}... ({formatCurrency(po.totalAmount)})
                                                            </CommandItem>
                                                        ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="inv-file">Anexar Fatura (PDF)</Label>
                                        <Input id="inv-file" type="file" onChange={e => setInvoiceFile(e.target.files?.[0] || null)} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                                    <Button onClick={handleAddInvoice} disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="animate-spin mr-2"/>}
                                        Registar Fatura
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                      {isLoading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nº Fatura</TableHead>
                                        <TableHead>Fornecedor</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Valor</TableHead>
                                        <TableHead>Estado</TableHead>
                                        {canEdit && <TableHead className="text-right">Ações</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={canEdit ? 6 : 5} className="h-24 text-center">Nenhuma fatura de fornecedor registada.</TableCell>
                                        </TableRow>
                                    ) : (
                                        invoices.map(inv => (
                                            <TableRow key={inv.id}>
                                                <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                                                <TableCell>{suppliers.find(s => s.id === inv.supplierId)?.name || inv.supplierId}</TableCell>
                                                <TableCell>{inv.invoiceDate ? format((inv.invoiceDate as unknown as Timestamp).toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                                <TableCell className="font-semibold">{formatCurrency(inv.totalAmount)}</TableCell>
                                                <TableCell><Badge variant={getStatusVariant(inv.status)}>{inv.status}</Badge></TableCell>
                                                {canEdit && (
                                                    <TableCell className="text-right">
                                                        {inv.status === 'Pendente' && (
                                                            <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(inv)}>
                                                                <CheckCircle className="mr-2 h-4 w-4"/> Marcar como Paga
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                      )}
                </CardContent>
            </Card>
        </>
    );
}
