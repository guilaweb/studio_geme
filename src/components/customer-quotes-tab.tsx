'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, where, doc, getDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, FileSpreadsheet, Percent, Calculator, CheckCircle, Trash2, MoreHorizontal, Download, Edit, Check } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { Opportunity, CustomerQuote, QuoteItem, CustomerQuoteStatus } from '@/types/crm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { generateQuotePdf } from '@/lib/quote-generator';
import { type WbsItem } from '@/types/wbs';
import { type InventoryItem } from '@/types/inventory';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';


interface CustomerQuotesTabProps {
    context: 'project' | 'opportunity';
    contextId: string;
    userRole: UserRole | null;
    onApprove?: (quote: CustomerQuote) => void;
    opportunity?: Opportunity;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

interface CatalogItem { id: string; name: string; cost: number; unit: string; source: 'EAP' | 'Inventário' };

export default function CustomerQuotesTab({ context, contextId, userRole, onApprove, opportunity }: CustomerQuotesTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [quotes, setQuotes] = useState<CustomerQuote[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state for a new quote
    const [quoteTitle, setQuoteTitle] = useState('');
    const [quoteItems, setQuoteItems] = useState<Omit<QuoteItem, 'id'>[]>([]);
    const [markup, setMarkup] = useState(20);

    const canEdit = userRole === 'Editor' || userRole === 'Gestor';
    const hasApprovedQuote = useMemo(() => quotes.some(q => q.status === 'Aprovada'), [quotes]);

    useEffect(() => {
        if (!contextId) return;
        
        let loadedQuotes = false;
        let loadedWbs = context !== 'project';
        let loadedInventory = context !== 'project';

        const checkAllLoaded = () => {
            if (loadedQuotes && loadedWbs && loadedInventory) {
                setLoading(false);
            }
        };

        const collectionPath = context === 'project'
            ? `projects/${contextId}/customerQuotes`
            : `opportunities/${contextId}/customerQuotes`;

        const quotesQuery = query(collection(db, collectionPath), orderBy('createdAt', 'desc'));
        const quotesUnsub = onSnapshot(quotesQuery, (snapshot) => {
            const fetchedQuotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerQuote));
            setQuotes(fetchedQuotes);
            loadedQuotes = true;
            checkAllLoaded();
        }, (error) => {
            console.error(`Error fetching quotes from ${collectionPath}:`, error);
            toast({title: 'Erro ao carregar propostas', variant: 'destructive'});
            loadedQuotes = true;
            checkAllLoaded();
        });

        const unsubscribes = [quotesUnsub];

        if (context === 'project') {
            const wbsQuery = query(collection(db, 'projects', contextId, 'wbs'));
            const unsubWbs = onSnapshot(wbsQuery, (snapshot) => {
                setWbsItems(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as WbsItem));
                loadedWbs = true;
                checkAllLoaded();
            });

            const inventoryQuery = query(collection(db, 'projects', contextId, 'inventory'));
            const unsubInventory = onSnapshot(inventoryQuery, (snapshot) => {
                setInventory(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as InventoryItem));
                loadedInventory = true;
                checkAllLoaded();
            });
            
            unsubscribes.push(unsubWbs, unsubInventory);
        } else {
            setLoading(false);
        }

        return () => unsubscribes.forEach(unsub => unsub());
    }, [context, contextId, toast]);
    
    const calculation = useMemo(() => {
        const totalCost = quoteItems.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
        const salePrice = totalCost * (1 + markup / 100);
        const margin = salePrice - totalCost;
        return { totalCost, salePrice, margin };
    }, [quoteItems, markup]);

    const resetFullForm = () => {
        setShowForm(false);
        setQuoteTitle('');
        setQuoteItems([]);
        setMarkup(20);
    }

    const handleSaveQuote = async () => {
        if (!canEdit || !user) return;
        if (!quoteTitle.trim()) {
            toast({ title: 'Título obrigatório', description: 'O título da proposta é obrigatório.', variant: 'destructive' });
            return;
        }
         if (quoteItems.length === 0) {
            toast({ title: 'Itens obrigatórios', description: 'Adicione pelo menos um item à proposta.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const collectionPath = context === 'project'
                ? `projects/${contextId}/customerQuotes`
                : `opportunities/${contextId}/customerQuotes`;
            
            const quoteData: Omit<CustomerQuote, 'id'> = {
                title: quoteTitle,
                status: 'Rascunho',
                items: quoteItems.map(item => ({ ...item, id: crypto.randomUUID() })),
                totalCost: calculation.totalCost,
                salePrice: calculation.salePrice,
                margin: calculation.margin,
                markup: markup,
                createdAt: serverTimestamp() as any,
                author: {
                    uid: user.uid,
                    displayName: user.displayName || user.email || 'Utilizador',
                },
            };
            
            await addDoc(collection(db, collectionPath), quoteData);
            
            toast({ title: 'Proposta guardada como rascunho!' });
            resetFullForm();

        } catch (error) {
            console.error("Error saving customer quote: ", error);
            toast({ title: 'Erro ao guardar proposta', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDownloadPdf = async (quote: CustomerQuote) => {
        if (context === 'project') {
            toast({ title: 'Funcionalidade não disponível', description: 'A geração de PDF de propostas só está disponível no contexto de uma oportunidade de CRM.', variant: 'destructive'});
            return;
        }
        if (!opportunity) {
            toast({ title: 'Erro', description: 'Dados da oportunidade não encontrados para gerar o PDF.', variant: 'destructive'});
            return;
        }
        toast({ title: 'A gerar PDF...', description: 'Por favor, aguarde um momento.'});
        await generateQuotePdf(opportunity, quote);
        await handleQuoteStatusChange(quote.id, 'Enviada');
    };

    const handleQuoteStatusChange = async (quoteId: string, status: CustomerQuoteStatus) => {
        if(!canEdit) return;
        const collectionPath = context === 'project' ? `projects/${contextId}/customerQuotes` : `opportunities/${contextId}/customerQuotes`;
        const quoteRef = doc(db, collectionPath, quoteId);
        try {
            await updateDoc(quoteRef, { status });
            toast({ title: 'Estado da proposta atualizado!' });
        } catch (error) {
            console.error('Error updating quote status:', error);
            toast({ title: 'Erro ao atualizar estado', variant: 'destructive'});
        }
    };

    const AddItemForm = ({ onAddItem }: { onAddItem: (item: Omit<QuoteItem, 'id'>) => void }) => {
        const [itemName, setItemName] = useState('');
        const [itemQuantity, setItemQuantity] = useState('1');
        const [itemUnit, setItemUnit] = useState('un');
        const [itemCost, setItemCost] = useState('');
        const [isCatalogOpen, setIsCatalogOpen] = useState(false);

        const combinedCatalog: CatalogItem[] = useMemo(() => {
            if (context !== 'project') return [];
            const wbsAsCatalog: CatalogItem[] = wbsItems
                .filter(i => !i.parentId) // Only root items for now for simplicity
                .map(item => ({
                id: item.id,
                name: item.name,
                cost: item.budget || 0,
                unit: 'un',
                source: 'EAP'
                }));
            const inventoryAsCatalog: CatalogItem[] = inventory.map(item => ({
                id: item.id,
                name: item.name,
                cost: item.unitCost,
                unit: item.unit,
                source: 'Inventário'
            }));
            return [...wbsAsCatalog, ...inventoryAsCatalog].sort((a,b) => a.name.localeCompare(b.name));
        }, [wbsItems, inventory]);
        
        const handleCatalogSelect = (itemId: string) => {
            const item = combinedCatalog.find(i => i.id === itemId);
            if (item) {
                setItemName(item.name);
                setItemCost(String(item.cost));
                setItemUnit(item.unit);
            }
            setIsCatalogOpen(false);
        };

        const handleAddItem = () => {
            if (!itemName.trim() || !itemCost) {
                toast({title: 'Item inválido', description: 'Nome e custo do item são obrigatórios.', variant: 'destructive'});
                return;
            }
            onAddItem({ name: itemName, cost: parseFloat(itemCost), quantity: parseFloat(itemQuantity) || 1, unit: itemUnit });
            setItemName('');
            setItemCost('');
            setItemQuantity('1');
            setItemUnit('un');
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_150px_auto] gap-2 items-end p-2 bg-secondary/50">
                {context === 'project' ? (
                     <div className="space-y-1">
                        <Label>Descrição do Item</Label>
                         <Popover open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal" >
                                    {itemName || 'Procurar no catálogo ou inserir...'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                               <Command>
                                    <CommandInput placeholder="Procurar item..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                                        <CommandGroup className='max-h-48 overflow-y-auto'>
                                            {combinedCatalog.map(item => (
                                                <CommandItem key={`${item.source}-${item.id}`} onSelect={() => handleCatalogSelect(item.id)}>
                                                    <span className="flex-1">{item.name}</span>
                                                    <Badge variant="outline" className="text-xs">{item.source}</Badge>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                               </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <Label>Descrição do Item</Label>
                        <Input placeholder="Ex: Fornecimento de betão" value={itemName} onChange={e => setItemName(e.target.value)}/>
                    </div>
                )}
                <div className="space-y-1">
                    <Label>Quantidade</Label>
                    <Input type="number" placeholder="1" value={itemQuantity} onChange={e => setItemQuantity(e.target.value)}/>
                </div>
                 <div className="space-y-1">
                    <Label>Unidade</Label>
                    <Input placeholder="un" value={itemUnit} onChange={e => setItemUnit(e.target.value)}/>
                </div>
                 <div className="space-y-1">
                    <Label>Custo Unitário</Label>
                    <Input type="number" placeholder="Custo" value={itemCost} onChange={e => setItemCost(e.target.value)}/>
                </div>
                <Button onClick={handleAddItem} className="self-end">Adicionar</Button>
            </div>
        );
    }


    const renderQuoteForm = () => (
        <Card>
            <CardHeader>
                <CardTitle>Criar Nova Proposta</CardTitle>
                <CardDescription>Construa a proposta para o cliente adicionando itens e definindo a margem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="quote-title">Título da Proposta</Label>
                    <Input id="quote-title" placeholder="Ex: Orçamento para construção de moradia T3" value={quoteTitle} onChange={e => setQuoteTitle(e.target.value)} />
                </div>
                
                <div>
                    <Label>Itens da Proposta</Label>
                    <div className="border rounded-md mt-2">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="w-[100px]">Qtd.</TableHead>
                                    <TableHead className="w-[100px]">Un.</TableHead>
                                    <TableHead className="w-[150px]">Custo Unitário</TableHead>
                                    <TableHead className="w-[80px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quoteItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell>{formatCurrency(item.cost)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => setQuoteItems(prev => prev.filter((_, i) => i !== index))}>
                                                <Trash2 className="h-4 w-4 text-destructive"/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <AddItemForm onAddItem={(item) => setQuoteItems(prev => [...prev, item])} />
                    </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6 items-end pt-4">
                     <div className="space-y-2">
                        <Label>Custo Total dos Itens</Label>
                        <p className="text-2xl font-bold font-mono">{formatCurrency(calculation.totalCost)}</p>
                    </div>
                     <div className="flex items-center gap-2">
                        <div className="space-y-2">
                            <Label htmlFor="markup">Markup (BDI)</Label>
                            <div className="flex items-center">
                                <Input id="markup" type="number" value={markup} onChange={e => setMarkup(parseFloat(e.target.value) || 0)} className="w-24" />
                                <Percent className="h-5 w-5 ml-2 text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg text-right">
                        <Label>Preço Final de Venda</Label>
                        <p className="text-3xl font-bold text-primary">{formatCurrency(calculation.salePrice)}</p>
                        <p className="text-xs text-muted-foreground">Margem de Lucro: {formatCurrency(calculation.margin)}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button onClick={handleSaveQuote} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <FileSpreadsheet className="mr-2" />}
                        Guardar Rascunho da Proposta
                    </Button>
                     <Button variant="ghost" onClick={resetFullForm}>Cancelar</Button>
                </div>
            </CardContent>
        </Card>
    );

    const getStatusVariant = (status: CustomerQuoteStatus) => {
        switch (status) {
            case 'Aprovada': return 'default';
            case 'Enviada': return 'secondary';
            case 'Rejeitada': return 'destructive';
            case 'Rascunho':
            default:
                return 'outline';
        }
    };


    const renderQuoteList = () => (
         <Card>
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle>Propostas para Cliente</CardTitle>
                    <CardDescription>Consulte, edite e envie as propostas comerciais geradas.</CardDescription>
                </div>
                 {canEdit && !hasApprovedQuote && <Button onClick={() => setShowForm(true)}><Plus className="mr-2"/> Nova Proposta</Button>}
                 {hasApprovedQuote && <Badge variant="default" className="text-sm"><CheckCircle className="mr-2"/> Proposta Aprovada</Badge>}
            </CardHeader>
            <CardContent>
                {loading ? <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin"/> Carregando...</div> :
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Preço de Venda</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                     <TableBody>
                        {quotes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">Nenhuma proposta criada.</TableCell>
                            </TableRow>
                        ) : (
                            quotes.map(q => (
                                <TableRow key={q.id}>
                                    <TableCell className="font-medium">{q.title}</TableCell>
                                    <TableCell><Badge variant={getStatusVariant(q.status)}>{q.status}</Badge></TableCell>
                                    <TableCell className="font-semibold">{formatCurrency(q.salePrice)}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleDownloadPdf(q)}>
                                                    <Download className="mr-2 h-4 w-4" />
                                                    Download PDF
                                                </DropdownMenuItem>
                                                {canEdit && (
                                                    <>
                                                        <DropdownMenuSub>
                                                            <DropdownMenuSubTrigger>Atualizar Estado</DropdownMenuSubTrigger>
                                                            <DropdownMenuSubContent>
                                                                <DropdownMenuItem onClick={() => handleQuoteStatusChange(q.id, 'Rascunho')}>Rascunho</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleQuoteStatusChange(q.id, 'Enviada')}>Enviada</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleQuoteStatusChange(q.id, 'Aprovada')}>Aprovada</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleQuoteStatusChange(q.id, 'Rejeitada')}>Rejeitada</DropdownMenuItem>
                                                            </DropdownMenuSubContent>
                                                        </DropdownMenuSub>
                                                        <DropdownMenuItem disabled>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Editar (em breve)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {onApprove && !hasApprovedQuote && q.status !== 'Aprovada' && (
                                                            <DropdownMenuItem onClick={() => onApprove(q)}>
                                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                                Aprovar e Criar Projeto
                                                            </DropdownMenuItem>
                                                        )}
                                                         <DropdownMenuItem className="text-destructive" disabled>
                                                            <Trash2 className="mr-2 h-4 w-4"/>
                                                            Eliminar (em breve)
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                }
            </CardContent>
        </Card>
    );

    return (
        <div className="p-4 space-y-6">
            {showForm ? renderQuoteForm() : renderQuoteList()}
        </div>
    );
}
