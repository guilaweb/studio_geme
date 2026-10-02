'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp, writeBatch, doc, getDocs, where, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Receipt, FileUp, CheckCircle, Package, Eye, Truck, MoreHorizontal, Send, Trash2 } from 'lucide-react';
import { type PurchaseOrder, type PurchaseRequestItem } from '@/types/purchasing';
import { type Supplier } from '@/types/suppliers';
import { type InventoryItem } from '@/types/inventory';
import type { UserRole } from '@/app/projects/[id]/page';
import { useAuth } from '@/hooks/use-auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { WbsItem } from '@/types/wbs';

interface PurchaseOrdersTabProps {
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

interface ReceptionItem {
    item: PurchaseRequestItem;
    receivedQuantity: string;
    isNewToInventory: boolean;
    inventoryItemId: string | null;
    unit: string;
    unitCost: string;
}

const DEFAULT_SUPPLIERS: Supplier[] = [
    { id: 'sup-cimangola', name: 'Nova Cimangola / Cimentos', contactPerson: 'Comercial', email: 'vendas@cimangola.co.ao', phone: '+244 923 000 001', category: 'Materiais Básicos' } as any,
    { id: 'sup-siderurgia', name: 'Aceros de Angola / Varão de Aço', contactPerson: 'Apoio a Obras', email: 'pedidos@aceros.co.ao', phone: '+244 923 000 002', category: 'Aço & Metalurgia' } as any,
    { id: 'sup-pedreira', name: 'Pedreira & Agregados do Bengo', contactPerson: 'Expedição', email: 'agregados@pedreira.co.ao', phone: '+244 923 000 003', category: 'Inertes e Areias' } as any,
    { id: 'sup-combustivel', name: 'Distribuidora de Combustíveis (Gasóleo)', contactPerson: 'Logística', email: 'combustivel@distribuidora.co.ao', phone: '+244 923 000 004', category: 'Combustíveis' } as any,
    { id: 'sup-local', name: 'Fornecedor Geral de Estaleiro', contactPerson: 'Balcão de Obras', email: 'comercial@estaleiro.co.ao', phone: '+244 923 000 005', category: 'Geral' } as any,
];

export default function PurchaseOrdersTab({ projectId, userRole }: PurchaseOrdersTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [loadingStates, setLoadingStates] = useState({
        pos: true,
        suppliers: true,
        inventory: true,
        wbs: true,
    });
    
    const availableSuppliers = useMemo(() => {
        return suppliers.length > 0 ? suppliers : DEFAULT_SUPPLIERS;
    }, [suppliers]);
    
    const isLoading = Object.values(loadingStates).some(state => state);
    
    // State for reception dialog
    const [receptionDialogOpen, setReceptionDialogOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [receptionItems, setReceptionItems] = useState<ReceptionItem[]>([]);
    const [isSubmittingReception, setIsSubmittingReception] = useState(false);

    // State for Direct PO dialog
    const [isDirectPoDialogOpen, setIsDirectPoDialogOpen] = useState(false);
    const [isSubmittingDirectPo, setIsSubmittingDirectPo] = useState(false);
    const [directPoSupplierId, setDirectPoSupplierId] = useState('');
    const [directPoItems, setDirectPoItems] = useState<Omit<PurchaseRequestItem, 'id'>[]>([]);
    const [directPoTotalAmount, setDirectPoTotalAmount] = useState('');
    
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
            createSubscription(`projects/${projectId}/inventory`, setInventory, 'inventory', 'name'),
            createSubscription(`projects/${projectId}/purchaseOrders`, setPurchaseOrders, 'pos', 'createdAt', 'desc'),
            createSubscription(`projects/${projectId}/wbs`, setWbsItems, 'wbs'),
        ];
        
        return () => unsubscribes.forEach(unsub => unsub());

    }, [projectId, toast]);

    const getSupplierName = (supplierId: string) => {
        const found = suppliers.find(s => s.id === supplierId) || DEFAULT_SUPPLIERS.find(s => s.id === supplierId);
        return found?.name || 'Fornecedor de Obra';
    };
    
    const getStatusVariant = (status: PurchaseOrder['status']) => {
        switch(status) {
            case 'Emitida': return 'secondary';
            case 'Recebida Parcialmente': return 'outline';
            case 'Recebida Totalmente': return 'default';
            default: return 'outline';
        }
    }
    
    const handleOpenReception = (po: PurchaseOrder) => {
        setSelectedPO(po);
        
        const receptionState = po.items.map(item => {
            const existingItem = inventory.find(invItem => invItem.name.toLowerCase() === item.name.toLowerCase());
            return {
                item: item,
                receivedQuantity: String(item.quantity), // Default to full quantity
                isNewToInventory: !existingItem,
                inventoryItemId: existingItem?.id || null,
                unit: existingItem?.unit || item.unit || '',
                unitCost: String(existingItem?.unitCost ?? 0),
            };
        });
        setReceptionItems(receptionState);
        setReceptionDialogOpen(true);
    };

    const handleReceptionItemChange = (index: number, field: keyof ReceptionItem, value: string) => {
        const newItems = [...receptionItems];
        (newItems[index] as any)[field] = value;
        setReceptionItems(newItems);
    };
    
    const handleConfirmReception = async () => {
        if (!selectedPO || !user) return;

        setIsSubmittingReception(true);
        const batch = writeBatch(db);

        try {
            for (const item of receptionItems) {
                const quantity = parseFloat(item.receivedQuantity);
                if (isNaN(quantity) || quantity <= 0) continue;

                if (item.isNewToInventory) {
                    // Create new inventory item
                    const newItemRef = doc(collection(db, 'projects', projectId, 'inventory'));
                    batch.set(newItemRef, {
                        name: item.item.name,
                        unit: item.unit,
                        unitCost: parseFloat(item.unitCost) || 0,
                        quantity: quantity,
                        author: { uid: user.uid, displayName: user.displayName },
                        createdAt: serverTimestamp(),
                    });
                } else {
                    // Update existing inventory item
                    const itemRef = doc(db, 'projects', projectId, 'inventory', item.inventoryItemId!);
                    batch.update(itemRef, { quantity: increment(quantity) });
                }
            }

            // Update PO status
            const poRef = doc(db, 'projects', projectId, 'purchaseOrders', selectedPO.id);
            batch.update(poRef, { status: 'Recebida Totalmente' });

            // Update related financial transaction status
            const transactionQuery = query(collection(db, 'projects', projectId, 'transactions'), where('purchaseOrderId', '==', selectedPO.id));
            const transactionSnapshot = await getDocs(transactionQuery);
            if (!transactionSnapshot.empty) {
                const transactionDoc = transactionSnapshot.docs[0];
                batch.update(transactionDoc.ref, { status: 'Pago' });
            }

            await batch.commit();
            toast({ title: 'Receção registada!', description: 'O stock e o estado financeiro foram atualizados.' });
            setReceptionDialogOpen(false);
            setSelectedPO(null);

        } catch (error) {
            console.error("Error confirming reception: ", error);
            toast({ title: 'Erro ao confirmar receção', variant: 'destructive' });
        } finally {
            setIsSubmittingReception(false);
        }
    };
    
    const handleCreateDirectPO = async () => {
        if (!canEdit || !user) return;
        if (!directPoSupplierId || directPoItems.length === 0 || !directPoTotalAmount) {
            toast({ title: 'Campos obrigatórios em falta.', variant: 'destructive' });
            return;
        }
        setIsSubmittingDirectPo(true);
        const batch = writeBatch(db);
        try {
            const supplier = availableSuppliers.find(s => s.id === directPoSupplierId) || { id: directPoSupplierId, name: 'Fornecedor de Obra' };

            // If supplier is not yet stored in project suppliers, persist it
            if (!suppliers.some(s => s.id === supplier.id)) {
                const supRef = doc(db, 'projects', projectId, 'suppliers', supplier.id);
                batch.set(supRef, {
                    name: supplier.name,
                    contactPerson: (supplier as any).contactPerson || 'Geral',
                    email: (supplier as any).email || '',
                    phone: (supplier as any).phone || '',
                    createdAt: serverTimestamp(),
                });
            }

            const poRef = doc(collection(db, 'projects', projectId, 'purchaseOrders'));
            batch.set(poRef, {
                supplierId: directPoSupplierId,
                items: directPoItems.map(item => ({...item, id: crypto.randomUUID() })),
                totalAmount: parseFloat(directPoTotalAmount),
                status: 'Emitida',
                createdAt: serverTimestamp(),
                approvedBy: {
                    uid: user.uid,
                    displayName: user.displayName,
                    date: serverTimestamp(),
                }
            });

            const transactionRef = doc(collection(db, 'projects', projectId, 'transactions'));
            batch.set(transactionRef, {
                description: `Ordem de Compra Direta para ${supplier.name}`,
                amount: parseFloat(directPoTotalAmount),
                date: serverTimestamp(),
                type: 'Despesa',
                status: 'Pendente',
                accountId: 'uncategorized',
                accountName: 'Sem Categoria',
                purchaseOrderId: poRef.id,
            });

            await batch.commit();
            toast({ title: 'Ordem de Compra Direta criada!' });
            setIsDirectPoDialogOpen(false);
            setDirectPoSupplierId('');
            setDirectPoItems([]);
            setDirectPoTotalAmount('');
        } catch (error) {
            console.error("Error creating direct PO:", error);
            toast({ title: 'Erro ao criar OC Direta', variant: 'destructive' });
        } finally {
            setIsSubmittingDirectPo(false);
        }
    };
    
    const AddPOItemForm = ({ onAddItem }: { onAddItem: (item: Omit<PurchaseRequestItem, 'id'>) => void }) => {
        const [itemName, setItemName] = useState('');
        const [quantity, setQuantity] = useState('');
        const [unit, setUnit] = useState('un');
        const [selectedInventoryItem, setSelectedInventoryItem] = useState('');

        const handleAddItem = () => {
            if (!itemName.trim() || !quantity || !unit.trim()) {
                toast({title: 'Item inválido', description: 'Nome, quantidade e unidade são obrigatórios.', variant: 'destructive'});
                return;
            }
            onAddItem({ name: itemName, quantity: parseFloat(quantity), unit });
            setItemName(''); setQuantity(''); setUnit('un'); setSelectedInventoryItem('');
        };
        const handleInventorySelect = (itemId: string) => {
            const item = inventory.find(i => i.id === itemId);
            if (item) {
                setItemName(item.name);
                setUnit(item.unit || 'un');
                setSelectedInventoryItem(itemId);
            }
        };

        return (
            <div className="space-y-3 pt-1">
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground block">Adicionar Insumo Frequente (1 Clique):</Label>
                    <div className="flex flex-wrap gap-1.5">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 rounded-full bg-background hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                            onClick={() => onAddItem({ name: 'Cimento Portland 42.5R (50kg)', quantity: 100, unit: 'saco' })}
                        >
                            + 100 Sacos Cimento
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 rounded-full bg-background hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                            onClick={() => onAddItem({ name: 'Areia Lavada de Rio', quantity: 20, unit: 'm³' })}
                        >
                            + 20 m³ Areia
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 rounded-full bg-background hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                            onClick={() => onAddItem({ name: 'Brita Granítica nº 1', quantity: 20, unit: 'm³' })}
                        >
                            + 20 m³ Brita
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 rounded-full bg-background hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                            onClick={() => onAddItem({ name: 'Varão de Aço Nervurado A500NR', quantity: 2000, unit: 'kg' })}
                        >
                            + 2 Ton Aço
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 rounded-full bg-background hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
                            onClick={() => onAddItem({ name: 'Bloco de Betão 15x20x40', quantity: 1500, unit: 'un' })}
                        >
                            + 1500 Blocos 15
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 rounded-full bg-background hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300"
                            onClick={() => onAddItem({ name: 'Gasóleo Rodoviário / Gerador', quantity: 1000, unit: 'L' })}
                        >
                            + 1000 L Gasóleo
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_auto] gap-2 items-end">
                    <div className="space-y-1">
                        <Label>Item (do Inventário ou Manual)</Label>
                        <Select onValueChange={handleInventorySelect} value={selectedInventoryItem}>
                            <SelectTrigger><SelectValue placeholder="Selecione um item..."/></SelectTrigger>
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
            </div>
        );
    };


    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary"/> Ordens de Compra</CardTitle>
                        <CardDescription>Acompanhe todas as ordens de compra emitidas, o estado da entrega e os pagamentos.</CardDescription>
                    </div>
                     {canEdit && (
                        <Dialog open={isDirectPoDialogOpen} onOpenChange={setIsDirectPoDialogOpen}>
                            <DialogTrigger asChild>
                                 <Button><Plus className="mr-2 h-4 w-4"/>Criar OC Direta</Button>
                            </DialogTrigger>
                             <DialogContent className="sm:max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>Criar Ordem de Compra Direta</DialogTitle>
                                    <DialogDescription>Crie uma OC diretamente quando o processo de cotação não for necessário.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="direct-po-supplier">Fornecedor</Label>
                                            <Select value={directPoSupplierId} onValueChange={setDirectPoSupplierId}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                                <SelectContent>
                                                    {availableSuppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="direct-po-amount">Valor Total (Kz)</Label>
                                            <Input id="direct-po-amount" type="number" value={directPoTotalAmount} onChange={e => setDirectPoTotalAmount(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Itens</Label>
                                         <div className="border rounded-md mt-2 p-2 space-y-2">
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qtd.</TableHead><TableHead>Un.</TableHead><TableHead></TableHead></TableRow></TableHeader>
                                                    <TableBody>
                                                        {directPoItems.map((item, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell>{item.name}</TableCell>
                                                                <TableCell>{item.quantity}</TableCell>
                                                                <TableCell>{item.unit}</TableCell>
                                                                <TableCell><Button variant="ghost" size="icon" onClick={() => setDirectPoItems(prev => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            <AddPOItemForm onAddItem={(item) => setDirectPoItems(prev => [...prev, item])} />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsDirectPoDialogOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleCreateDirectPO} disabled={isSubmittingDirectPo}>{isSubmittingDirectPo && <Loader2 className="mr-2 animate-spin"/>}Criar e Enviar</Button>
                                </DialogFooter>
                             </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                      <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                  ) : (
                      <div className="overflow-x-auto">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Nº da OC</TableHead>
                                      <TableHead>Fornecedor</TableHead>
                                      <TableHead>Data</TableHead>
                                      <TableHead>Valor</TableHead>
                                      <TableHead>Estado da Entrega</TableHead>
                                      {canEdit && <TableHead className="text-right">Ações</TableHead>}
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {purchaseOrders.length === 0 ? (
                                      <TableRow>
                                          <TableCell colSpan={canEdit ? 6 : 5} className="h-24 text-center">Nenhuma Ordem de Compra emitida.</TableCell>
                                      </TableRow>
                                  ) : (
                                      purchaseOrders.map(po => (
                                          <TableRow key={po.id}>
                                              <TableCell className="font-mono text-xs">{po.id.substring(0, 8)}...</TableCell>
                                              <TableCell className="font-medium">{getSupplierName(po.supplierId)}</TableCell>
                                              <TableCell>{po.createdAt ? format(po.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                              <TableCell className="font-semibold">{formatCurrency(po.totalAmount)}</TableCell>
                                              <TableCell>
                                                  <Badge variant={getStatusVariant(po.status)}>{po.status}</Badge>
                                              </TableCell>
                                              {canEdit && (
                                                  <TableCell className="text-right">
                                                      <DropdownMenu>
                                                          <DropdownMenuTrigger asChild>
                                                              <Button variant="ghost" size="icon">
                                                                  <MoreHorizontal className="h-4 w-4" />
                                                              </Button>
                                                          </DropdownMenuTrigger>
                                                          <DropdownMenuContent align="end">
                                                              <DropdownMenuItem onClick={() => handleOpenReception(po)} disabled={po.status === 'Recebida Totalmente'}>
                                                                  <Truck className="mr-2 h-4 w-4"/>
                                                                  Registar Receção
                                                              </DropdownMenuItem>
                                                              <DropdownMenuItem onClick={() => toast({title: 'Em breve'})}>
                                                                  <Eye className="mr-2 h-4 w-4"/>
                                                                  Ver Detalhes
                                                              </DropdownMenuItem>
                                                          </DropdownMenuContent>
                                                      </DropdownMenu>
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
            
            <Dialog open={receptionDialogOpen} onOpenChange={setReceptionDialogOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Registar Receção da Ordem de Compra</DialogTitle>
                        <DialogDescription>
                            Confirme os itens recebidos. Itens novos serão adicionados ao inventário, e existentes terão o stock atualizado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 max-h-[60vh] overflow-y-auto px-2 space-y-4">
                        {receptionItems.map((item, index) => (
                            <Card key={index} className={item.isNewToInventory ? 'border-blue-500' : ''}>
                                 <CardHeader className="p-4">
                                    <CardTitle className="text-base flex items-center gap-2">
                                         {item.item.name}
                                         {item.isNewToInventory && <Badge variant="outline" className="text-blue-600 border-blue-600">Novo no Inventário</Badge>}
                                    </CardTitle>
                                 </CardHeader>
                                 <CardContent className="p-4 pt-0 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label>Qtd. a Receber</Label>
                                        <Input type="number" value={item.receivedQuantity} onChange={(e) => handleReceptionItemChange(index, 'receivedQuantity', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Qtd. Pedida</Label>
                                        <Input value={item.item.quantity} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Unidade</Label>
                                        <Input value={item.unit} onChange={(e) => handleReceptionItemChange(index, 'unit', e.target.value)} disabled={!item.isNewToInventory} />
                                    </div>
                                     <div className="space-y-2">
                                        <Label>Custo Unitário</Label>
                                        <Input type="number" value={item.unitCost} onChange={(e) => handleReceptionItemChange(index, 'unitCost', e.target.value)} disabled={!item.isNewToInventory} />
                                    </div>
                                 </CardContent>
                            </Card>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setReceptionDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleConfirmReception} disabled={isSubmittingReception}>
                            {isSubmittingReception ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                            Confirmar e Atualizar Stock
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
