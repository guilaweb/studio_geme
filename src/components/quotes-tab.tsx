
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, Timestamp, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Users, ShoppingCart, Send, FileText, Banknote, CheckCircle, Trash2, Mail, MoreHorizontal, FileDown } from 'lucide-react';
import { type Supplier } from '@/types/suppliers';
import { type PurchaseRequest, type Quote, RequestStatus, type PurchaseRequestItem } from '@/types/purchasing';
import { type WbsItem } from '@/types/wbs';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { type InventoryItem } from '@/types/inventory';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { generateRfqPdf } from '@/lib/rfq-generator';
import type { Project } from '@/types/project';


interface QuotesTabProps {
    projectId: string;
    userRole: UserRole | null;
    project: Project | null;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    fill="currentColor"
    viewBox="0 0 448 512"
    {...props}
  >
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 .9c34.9 0 67.7 13.5 92.8 38.6 25.1 25.1 38.6 57.9 38.6 92.8 0 97.8-79.2 177-177 177-31.9 0-62.7-8.4-89.4-24.3l-6.5-3.9-66.6 17.5 17.9-65.1-4.2-6.8c-18.9-30.6-28.9-66.5-28.9-103.3 0-97.8 79.2-177 177-177zm117.1 210.1l-20.1-9.9C259.4 293.7 243 282.8 240.2 279s-5.4-3.6-12.8 3.6c-7.4 7.3-27.1 26.6-33.6 31.9-6.5 5.3-12.8 5.9-23.7 2-10.9-3.9-46.3-17.1-88.3-53.1-33.1-28.4-55.5-63.5-59.8-71.3-4.3-7.8-1.5-12.1.8-16.4 2.3-4.3 5.1-7.3 7.8-9.8 2.7-2.5 5.3-4.3 7.8-6.1 2.5-1.8 1.3-4.2-.8-7.3-2.1-3-12.8-30.7-17.6-41.2-4.9-10.6-9.8-9.2-13.5-9.4-3.7-.2-7.9-.2-12.1.2-4.2.4-10.9 1.5-16.4 7.3s-17.6 16.4-17.6 40.2c0 23.8 17.9 46.3 20.4 49.3 2.5 3 35.1 55.8 86.1 76.6 49.8 20.2 55.5 16.4 65.2 15.1 9.7-1.3 30.7-12.5 35.1-24.3 4.3-11.8 4.3-21.9 3-24.3s-2.1-3.9-4.5-5.3z"/>
  </svg>
);


export default function QuotesTab({ projectId, userRole, project }: QuotesTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    
    const [loadingStates, setLoadingStates] = useState({
        requests: true,
        quotes: true,
        suppliers: true,
        wbs: true,
        inventory: true,
    });
    const isLoading = Object.values(loadingStates).some(state => state);

    // New Request Form state
    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [description, setDescription] = useState('');
    const [requestItems, setRequestItems] = useState<Omit<PurchaseRequestItem, 'id'>[]>([]);
    const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
    const [selectedWbsItemId, setSelectedWbsItemId] = useState<string>('none');
    
    // Add Quote Form State
    const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
    const [quoteAmount, setQuoteAmount] = useState('');
    const [quoteSupplierId, setQuoteSupplierId] = useState('');

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
            createSubscription(`projects/${projectId}/suppliers`, setSuppliers, 'suppliers', 'name'),
            createSubscription(`projects/${projectId}/purchaseRequests`, setRequests, 'requests', 'createdAt', 'desc'),
            createSubscription(`projects/${projectId}/quotes`, setQuotes, 'quotes', 'createdAt'),
            createSubscription(`projects/${projectId}/wbs`, setWbsItems, 'wbs'),
            createSubscription(`projects/${projectId}/inventory`, setInventory, 'inventory', 'name'),
        ];
        
        return () => unsubscribes.forEach(unsub => unsub());
    }, [projectId, toast]);
    
    const handleCreateRequest = async () => {
        if (!canEdit || !user) return;
        if (!description.trim() || requestItems.length === 0 || selectedSupplierIds.length === 0) {
            toast({ title: 'Campos em falta', description: 'Descrição, pelo menos um item e um fornecedor são obrigatórios.', variant: 'destructive' });
            return;
        }

        setIsSubmittingRequest(true);
        try {
            await addDoc(collection(db, 'projects', projectId, 'purchaseRequests'), {
                description,
                items: requestItems.map(item => ({ ...item, id: crypto.randomUUID() })),
                status: 'Aguardando Cotações',
                supplierIds: selectedSupplierIds,
                wbsItemId: selectedWbsItemId === 'none' ? null : selectedWbsItemId,
                author: {
                    uid: user.uid,
                    displayName: user.displayName || user.email,
                },
                createdAt: serverTimestamp(),
            });

            toast({ title: 'Pedido de Cotação criado!' });
            // Reset form
            setDescription('');
            setRequestItems([]);
            setSelectedSupplierIds([]);
            setSelectedWbsItemId('none');
            setIsRequestDialogOpen(false);
        } catch (error) {
            console.error("Error creating purchase request:", error);
            toast({ title: 'Erro ao criar pedido', variant: 'destructive' });
        } finally {
            setIsSubmittingRequest(false);
        }
    };
    
    const handleAddQuote = async () => {
        if (!canEdit || !selectedRequest || !quoteSupplierId || !quoteAmount) {
             toast({ title: 'Campos em falta', variant: 'destructive' });
             return;
        }
        
        try {
            await addDoc(collection(db, 'projects', projectId, 'quotes'), {
                requestId: selectedRequest.id,
                supplierId: quoteSupplierId,
                amount: parseFloat(quoteAmount),
                status: 'Pendente',
                createdAt: serverTimestamp(),
            });
            
            toast({ title: 'Cotação adicionada!'});
            setQuoteAmount('');
            setQuoteSupplierId('');

        } catch (error) {
            console.error("Error adding quote:", error);
            toast({ title: 'Erro ao adicionar cotação', variant: 'destructive' });
        }
    };

    const handleApproveQuote = async (quoteToApprove: Quote, request: PurchaseRequest) => {
        if (!canEdit || !user) {
            toast({ title: 'Ação não permitida', variant: 'destructive' });
            return;
        }
        
        const batch = writeBatch(db);

        // 1. Update status of all related quotes
        const relatedQuotes = quotes.filter(q => q.requestId === request.id);
        relatedQuotes.forEach(q => {
            const quoteRef = doc(db, 'projects', projectId, 'quotes', q.id);
            if (q.id === quoteToApprove.id) {
                batch.update(quoteRef, { status: 'Aprovada' });
            } else {
                batch.update(quoteRef, { status: 'Rejeitada' });
            }
        });

        // 2. Update request status
        const requestRef = doc(db, 'projects', projectId, 'purchaseRequests', request.id);
        batch.update(requestRef, { status: 'Concluído' });

        // 3. Create Purchase Order
        const poRef = doc(collection(db, 'projects', projectId, 'purchaseOrders'));
        batch.set(poRef, {
            quoteId: quoteToApprove.id,
            requestId: request.id,
            supplierId: quoteToApprove.supplierId,
            items: request.items, // The structured list of items is carried over
            totalAmount: quoteToApprove.amount,
            status: 'Emitida',
            createdAt: serverTimestamp(),
            approvedBy: {
                uid: user.uid,
                displayName: user.displayName,
                date: serverTimestamp(),
            }
        });

        // 4. Create financial transaction
        const transactionRef = doc(collection(db, 'projects', projectId, 'transactions'));
        batch.set(transactionRef, {
            description: `Ordem de Compra: ${request.description}`,
            amount: quoteToApprove.amount,
            date: serverTimestamp(),
            type: 'Despesa',
            status: 'Pendente',
            accountId: 'uncategorized',
            accountName: 'Sem Categoria',
            wbsItemId: request.wbsItemId || null,
            wbsItemName: wbsItems.find(i => i.id === request.wbsItemId)?.name || '',
            purchaseOrderId: poRef.id,
        });
        
        try {
            await batch.commit();
            toast({ title: 'Cotação Aprovada!', description: 'Ordem de Compra e despesa pendente criadas no financeiro.'});
        } catch (error) {
            console.error("Error approving quote: ", error);
            toast({ title: 'Erro ao aprovar cotação', variant: 'destructive' });
        }
    };
    
    const getItemsAsText = (items: PurchaseRequestItem[]): string => {
        return items.map(item => `- ${item.quantity} ${item.unit} de ${item.name}`).join('\n');
    }

    const handleShareRequestViaWhatsapp = (request: PurchaseRequest) => {
        const itemsAsText = getItemsAsText(request.items);
        if (!request.description.trim() || !itemsAsText.trim()) {
            toast({ title: 'Campos em falta', description: 'Preencha a descrição e os itens antes de partilhar.', variant: 'destructive' });
            return;
        }
        const selectedSuppliers = suppliers.filter(s => request.supplierIds.includes(s.id)).map(s => s.name).join(', ');
        
        let message = `*PEDIDO DE COTAÇÃO*\n\n`;
        message += `*Obra:* ${project?.name || 'N/D'}\n`;
        message += `*Descrição:* ${request.description}\n\n`;
        message += `*Itens a cotar:*\n${itemsAsText}\n\n`;
        message += `Agradecemos o envio da vossa melhor proposta.\n\n`;
        message += `_(Este pedido foi enviado para: ${selectedSuppliers})_`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleShareRequestByEmail = (request: PurchaseRequest) => {
        const itemsAsText = getItemsAsText(request.items);
        if (!request.description.trim() || !itemsAsText.trim()) {
            toast({ title: 'Campos em falta', description: 'Preencha a descrição e os itens antes de partilhar.', variant: 'destructive' });
            return;
        }

        const selectedSupplierEmails = suppliers.filter(s => request.supplierIds.includes(s.id) && s.email).map(s => s.email).join(',');

        if (!selectedSupplierEmails) {
            toast({ title: 'Nenhum email encontrado', description: 'Os fornecedores selecionados não têm emails registados.', variant: 'destructive'});
            return;
        }

        let body = `Exmos. Srs.,\n\nVimos por este meio solicitar a vossa melhor cotação para os seguintes materiais/serviços:\n\n`;
        body += `*Obra:* ${project?.name || '[NOME DA OBRA]'}\n`;
        body += `*Descrição:* ${request.description}\n\n`;
        body += `*Itens a cotar:*\n${itemsAsText}\n\n`;
        body += `Agradecemos o envio da vossa melhor proposta para este email.\n\nCom os melhores cumprimentos,`;

        const subject = `Pedido de Cotação: ${request.description}`;
        const mailtoUrl = `mailto:${selectedSupplierEmails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl, '_blank');
    };
    
    const handleDownloadRfqPdf = async (request: PurchaseRequest) => {
        if (!project) {
            toast({ title: 'Erro', description: 'Dados do projeto não carregados.', variant: 'destructive' });
            return;
        }
        const requestSuppliers = suppliers.filter(s => request.supplierIds.includes(s.id));
        if (requestSuppliers.length === 0) {
            toast({ title: 'Erro', description: 'Nenhum fornecedor encontrado para este pedido.', variant: 'destructive' });
            return;
        }
        toast({ title: 'A gerar PDF do Pedido...' });
        await generateRfqPdf(project, request, requestSuppliers);
    };

    const handleShareFromDialog = (type: 'whatsapp' | 'email') => {
        const tempRequest = {
            description,
            items: requestItems,
            supplierIds: selectedSupplierIds,
        } as PurchaseRequest;
        
        if (type === 'whatsapp') {
            handleShareRequestViaWhatsapp(tempRequest);
        } else {
            handleShareRequestByEmail(tempRequest);
        }
    };
    
    const getStatusVariant = (status: RequestStatus) => {
        switch (status) {
            case 'Concluído': return 'default';
            case 'Aguardando Cotações': return 'secondary';
            case 'Pendente': return 'outline';
            default: return 'outline';
        }
    };

    const AddReqItemForm = ({ onAddItem }: { onAddItem: (item: Omit<PurchaseRequestItem, 'id'>) => void }) => {
        const [itemName, setItemName] = useState('');
        const [quantity, setQuantity] = useState('');
        const [unit, setUnit] = useState('un');
        const [selectedInventoryItem, setSelectedInventoryItem] = useState<string>('');

        const handleAddItem = () => {
            if (!itemName.trim() || !quantity || !unit.trim()) {
                toast({title: 'Item inválido', description: 'Nome, quantidade e unidade são obrigatórios.', variant: 'destructive'});
                return;
            }
            onAddItem({ name: itemName, quantity: parseFloat(quantity), unit });
            setItemName(''); setQuantity(''); setUnit('un'); setSelectedInventoryItem('');
        };

        const handleInventorySelect = (itemId: string) => {
            if (itemId === 'none') {
                setItemName('');
                setUnit('un');
                setSelectedInventoryItem('');
                return;
            }
            const item = inventory.find(i => i.id === itemId);
            if (item) {
                setItemName(item.name);
                setUnit(item.unit);
                setSelectedInventoryItem(itemId);
            }
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_auto] gap-2 items-end">
                <div className="space-y-1">
                    <Label>Item (do Inventário)</Label>
                    <Select onValueChange={handleInventorySelect} value={selectedInventoryItem}>
                        <SelectTrigger><SelectValue placeholder="Ou selecione do inventário..."/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Nenhum (inserir manualmente)</SelectItem>
                            {inventory.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-1">
                    <Label>Quantidade</Label>
                    <Input type="number" placeholder="10" value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>
                <div className="space-y-1">
                    <Label>Unidade</Label>
                    <Input placeholder="m³" value={unit} onChange={e => setUnit(e.target.value)} />
                </div>
                <Button onClick={handleAddItem} className="self-end">Adicionar</Button>
            </div>
        );
    };


    return (
        <div className="p-4 space-y-6">
            <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                 <Card>
                    <CardHeader className="flex-row items-start justify-between">
                        <div>
                            <CardTitle>Pedidos de Cotação</CardTitle>
                            <CardDescription>Acompanhe os seus pedidos e as propostas recebidas dos fornecedores.</CardDescription>
                        </div>
                        {canEdit && (
                            <DialogTrigger asChild>
                                <Button><Plus className="mr-2"/>Novo Pedido de Cotação</Button>
                            </DialogTrigger>
                        )}
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin"/> Carregando...</div>
                        ) : (
                            <Accordion type="single" collapsible className="w-full">
                                {requests.length === 0 ? <p className='text-muted-foreground text-center p-4'>Nenhum pedido de cotação criado ainda.</p> :
                                requests.map(req => {
                                    const requestQuotes = quotes.filter(q => q.requestId === req.id);
                                    const isRequestConcluded = req.status === 'Concluído';
                                    return (
                                    <AccordionItem value={req.id} key={req.id}>
                                         <div className="flex items-center border-b">
                                            <AccordionTrigger className="flex-1 hover:no-underline">
                                                <div className="flex justify-between items-center w-full pr-4">
                                                    <span className="font-semibold text-base">{req.description}</span>
                                                    <Badge variant={getStatusVariant(req.status)}>{req.status}</Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="mr-2" onClick={e => e.stopPropagation()}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleDownloadRfqPdf(req)}>
                                                        <FileDown className="mr-2 h-4 w-4" />
                                                        Download Pedido (PDF)
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleShareRequestViaWhatsapp(req)}>
                                                        <WhatsAppIcon className="h-4 w-4 mr-2" />
                                                        Partilhar via WhatsApp
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleShareRequestByEmail(req)}>
                                                        <Mail className="h-4 w-4 mr-2" />
                                                        Enviar por Email
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <AccordionContent className="p-4 space-y-6">
                                            <div>
                                                <h4 className="font-semibold">Itens do Pedido:</h4>
                                                <ul className="text-sm list-disc pl-5 mt-2 text-muted-foreground">
                                                    {req.items.map((item: PurchaseRequestItem, index: number) => (
                                                        <li key={index}>{item.quantity} {item.unit} - {item.name}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">Respostas dos Fornecedores:</h4>
                                                <ul className='mt-2 space-y-2'>
                                                    {requestQuotes.map(q => {
                                                        const supplier = suppliers.find(s => s.id === q.supplierId);
                                                        const isApproved = q.status === 'Aprovada';
                                                        return (
                                                            <li key={q.id} className={cn('flex justify-between items-center p-2 border rounded-md', isApproved && 'bg-green-100 dark:bg-green-900/30 border-green-500')}>
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold">{supplier?.name || 'Fornecedor Desconhecido'}</span>
                                                                    <span className='font-bold text-lg'>{formatCurrency(q.amount)}</span>
                                                                </div>
                                                                {isRequestConcluded ? (isApproved && <Badge variant="default" className="flex gap-2"><CheckCircle className="h-4 w-4"/> Aprovada</Badge>) : (canEdit && <Button size="sm" variant="outline" onClick={() => handleApproveQuote(q, req)}>Aprovar</Button>)}
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                                {requestQuotes.length === 0 && <p className='text-sm text-muted-foreground mt-2'>Nenhuma cotação recebida ainda.</p>}
                                            </div>
                                            {!isRequestConcluded && canEdit && (
                                                <div className='border-t pt-4'>
                                                    <h4 className="font-semibold mb-2">Adicionar Cotação Recebida</h4>
                                                    <div className="flex flex-wrap items-end gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`quote-supplier-${req.id}`}>Fornecedor</Label>
                                                            <Select onValueChange={setQuoteSupplierId} value={quoteSupplierId}>
                                                                <SelectTrigger id={`quote-supplier-${req.id}`} className="w-[200px]"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                                                <SelectContent>
                                                                    {suppliers.filter(s => req.supplierIds.includes(s.id)).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`quote-amount-${req.id}`}>Valor Total (Kz)</Label>
                                                            <Input id={`quote-amount-${req.id}`} type="number" placeholder="550000" value={quoteAmount} onChange={e => setQuoteAmount(e.target.value)} />
                                                        </div>
                                                        <Button onClick={() => handleAddQuote()} size="sm" onFocus={() => setSelectedRequest(req)}><Plus className="mr-2 h-4 w-4"/> Adicionar</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                    )
                                })}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Novo Pedido de Cotação</DialogTitle>
                        <DialogDescription>Crie um pedido para receber propostas de múltiplos fornecedores.</DialogDescription>
                    </DialogHeader>
                     <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto px-2">
                        <div className="space-y-2">
                            <Label htmlFor="req-desc">Descrição do Pedido</Label>
                            <Input id="req-desc" placeholder="Ex: Material para fundações do Bloco A" value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Atividade da EAP (Opcional)</Label>
                            <Select value={selectedWbsItemId} onValueChange={setSelectedWbsItemId}>
                                <SelectTrigger><SelectValue placeholder="Selecione um item da EAP..."/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhuma</SelectItem>
                                    {wbsItems.filter(item => !item.parentId).map(item => (<SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-4">
                            <Label>Itens e Quantidades</Label>
                            <div className="p-4 border rounded-md space-y-4">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qtd.</TableHead><TableHead>Unidade</TableHead><TableHead></TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {requestItems.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>{item.unit}</TableCell>
                                                <TableCell><Button variant="ghost" size="icon" onClick={() => setRequestItems(prev => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <AddReqItemForm onAddItem={(item) => setRequestItems(prev => [...prev, item])} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Enviar Para Fornecedores</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">{selectedSupplierIds.length > 0 ? `${selectedSupplierIds.length} selecionado(s)` : 'Selecione os fornecedores'}</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start"><Command><CommandList><CommandGroup className='max-h-48 overflow-y-auto'>
                                    {suppliers.map(supplier => (<CommandItem key={supplier.id} onSelect={() => setSelectedSupplierIds(prev => prev.includes(supplier.id) ? prev.filter(id => id !== supplier.id) : [...prev, supplier.id])}><Check className={cn("mr-2 h-4 w-4", selectedSupplierIds.includes(supplier.id) ? "opacity-100" : "opacity-0")} />{supplier.name}</CommandItem>))}
                                </CommandGroup></CommandList></Command></PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:justify-between">
                         <div className="flex gap-2">
                             <Button variant="outline" onClick={() => handleShareFromDialog('email')}>
                                 <Mail className="h-4 w-4 mr-2" />
                                 Enviar por Email
                            </Button>
                             <Button variant="outline" onClick={() => handleShareFromDialog('whatsapp')}>
                                <WhatsAppIcon className="h-4 w-4 mr-2" />
                                Partilhar
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => { setIsRequestDialogOpen(false); }}>Cancelar</Button>
                            <Button onClick={handleCreateRequest} disabled={isSubmittingRequest}>{isSubmittingRequest ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}Criar Pedido</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
