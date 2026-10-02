
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, increment, writeBatch, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Box, ArrowRight, ArrowLeft, Wrench, CheckCircle, History } from 'lucide-react';
import { type InventoryItem, type StockMovement } from '@/types/inventory';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { type WbsItem } from '@/types/wbs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface InventoryTabProps {
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


export default function InventoryTab({ projectId, userRole }: InventoryTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [movements, setMovements] = useState<Record<string, StockMovement[]>>({});
    const [loadingMovements, setLoadingMovements] = useState<string | null>(null);

    const [isAddMaterialDialogOpen, setIsAddMaterialDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [unitCost, setUnitCost] = useState('');
    const [initialQuantity, setInitialQuantity] = useState('');
    const [minStockLevel, setMinStockLevel] = useState('');
    const [reorderQuantity, setReorderQuantity] = useState('');
    const [showAdvancedStock, setShowAdvancedStock] = useState(false);
    
    // State for movement dialog
    const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
    const [movementType, setMovementType] = useState<'Entrada' | 'Saída'>();
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [movementQuantity, setMovementQuantity] = useState('');
    const [movementReason, setMovementReason] = useState('');
    const [movementWbsItemId, setMovementWbsItemId] = useState<string>('none');

    const canEdit = userRole === 'Editor' || userRole === 'Gestor' || userRole === 'Fiel de Armazém';

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'inventory'), orderBy('name', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching inventory: ", error);
            toast({ title: 'Erro ao carregar inventário', variant: 'destructive' });
            setLoading(false);
        });
        
        // Fetch WBS items for the dropdown
        const wbsQuery = query(collection(db, 'projects', projectId, 'wbs'));
        const unsubWbs = onSnapshot(wbsQuery, (snapshot) => {
            setWbsItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WbsItem)));
        });

        return () => {
            unsubscribe();
            unsubWbs();
        };
    }, [projectId, toast]);

    const fetchMovements = (itemId: string) => {
        if (movements[itemId] || !itemId) return; // Already fetched or no item selected

        setLoadingMovements(itemId);
        const movementsQuery = query(collection(db, 'projects', projectId, 'inventory', itemId, 'movements'), orderBy('date', 'desc'));
        onSnapshot(movementsQuery, (snapshot) => {
            const fetchedMovements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockMovement));
            setMovements(prev => ({ ...prev, [itemId]: fetchedMovements }));
            setLoadingMovements(null);
        }, (error) => {
            console.error(`Error fetching movements for item ${itemId}:`, error);
            setLoadingMovements(null);
        });
    };

    const resetAddMaterialForm = () => {
        setName('');
        setUnit('');
        setUnitCost('');
        setInitialQuantity('');
        setMinStockLevel('');
        setReorderQuantity('');
        setShowAdvancedStock(false);
        setIsAddMaterialDialogOpen(false);
    };

    const resetMovementForm = () => {
        setSelectedItem(null);
        setMovementQuantity('');
        setMovementReason('');
        setMovementWbsItemId('none');
        setIsMovementDialogOpen(false);
    };

    const handleAddMaterial = async () => {
        if (!canEdit || !user) return;
        if (!name.trim() || !unit.trim() || !unitCost) {
            toast({ title: 'Campos obrigatórios em falta', description: 'Nome, Unidade e Custo Unitário são obrigatórios.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'projects', projectId, 'inventory'), {
                name,
                unit,
                unitCost: parseFloat(unitCost) || 0,
                quantity: parseFloat(initialQuantity) || 0,
                minStockLevel: parseFloat(minStockLevel) || 0,
                reorderQuantity: parseFloat(reorderQuantity) || 0,
                author: { uid: user.uid, displayName: user.displayName || user.email },
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Material adicionado ao inventário!' });
            resetAddMaterialForm();
        } catch (error) {
            console.error("Error adding material:", error);
            toast({ title: 'Erro ao adicionar material', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const openMovementDialog = (item: InventoryItem, type: 'Entrada' | 'Saída') => {
        setSelectedItem(item);
        setMovementType(type);
        setIsMovementDialogOpen(true);
    };

    const handleRegisterMovement = async () => {
        if (!canEdit || !user || !selectedItem || !movementType || !movementQuantity) {
            toast({ title: 'Campos em falta', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        const qtyChange = parseFloat(movementQuantity);
        if (isNaN(qtyChange) || qtyChange <= 0) {
            toast({ title: 'Quantidade inválida', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }

        if (movementType === 'Saída' && qtyChange > selectedItem.quantity) {
             toast({ title: 'Stock Insuficiente', description: `Apenas existem ${selectedItem.quantity} unidades em stock.`, variant: 'destructive' });
             setIsSubmitting(false);
             return;
        }
        
        const finalQtyChange = movementType === 'Saída' ? -qtyChange : qtyChange;
        const wbsItem = wbsItems.find(w => w.id === movementWbsItemId);
        const batch = writeBatch(db);

        // 1. Update quantity on main item doc
        const itemRef = doc(db, 'projects', projectId, 'inventory', selectedItem.id);
        batch.update(itemRef, {
            quantity: increment(finalQtyChange)
        });

        // 2. Add a record of the movement to the subcollection
        const movementRef = doc(collection(itemRef, 'movements'));
        batch.set(movementRef, {
            type: movementType,
            quantity: qtyChange,
            reason: movementReason,
            wbsItemId: movementWbsItemId === 'none' ? null : movementWbsItemId,
            date: serverTimestamp(),
            author: { uid: user.uid, displayName: user.displayName || user.email }
        });
        
         // 3. If it's a 'Saída', create a corresponding financial transaction
        if (movementType === 'Saída' && selectedItem.unitCost && selectedItem.unitCost > 0) {
            const transactionCost = qtyChange * selectedItem.unitCost;
            const transactionRef = doc(collection(db, 'projects', projectId, 'transactions'));
            batch.set(transactionRef, {
                description: `Consumo de material: ${selectedItem.name}`,
                amount: transactionCost,
                date: serverTimestamp(),
                type: 'Despesa',
                status: 'Pago', // Assuming consumed material is a 'paid' cost
                accountId: 'material-consumption', // A default account for material costs
                accountName: 'Consumo de Materiais',
                wbsItemId: movementWbsItemId === 'none' ? null : movementWbsItemId,
                wbsItemName: wbsItem?.name || null
            });
        }
        
        // 4. Check for low stock and create a purchase request
        const newQuantity = selectedItem.quantity + finalQtyChange;
        const minStock = selectedItem.minStockLevel || 0;
        const reorderQty = selectedItem.reorderQuantity || 0;
        let stockIsLow = false;

        if (movementType === 'Saída' && minStock > 0 && reorderQty > 0 && newQuantity < minStock) {
            stockIsLow = true;
            const purchaseRequestRef = doc(collection(db, 'projects', projectId, 'purchaseRequests'));
            batch.set(purchaseRequestRef, {
                description: `Pedido Automático: Stock Baixo de ${selectedItem.name}`,
                items: [{
                    id: selectedItem.id,
                    name: selectedItem.name,
                    quantity: reorderQty,
                    unit: selectedItem.unit,
                }],
                status: 'Pendente',
                supplierIds: [],
                wbsItemId: null,
                author: { uid: 'system', displayName: 'Sistema Automático' },
                createdAt: serverTimestamp(),
            });
        }

        try {
            await batch.commit();
            toast({ title: 'Movimento de stock registado!' });
             if (stockIsLow) {
                toast({
                    title: 'Alerta de Stock Baixo!',
                    description: `Foi gerado um novo pedido de compra para ${selectedItem.name}.`,
                    variant: 'destructive',
                });
            }
            resetMovementForm();
        } catch (error) {
            console.error("Error registering movement:", error);
            toast({ title: 'Erro ao registar movimento', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <>
            <Dialog open={isAddMaterialDialogOpen} onOpenChange={setIsAddMaterialDialogOpen}>
                 <Card>
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Box className="h-5 w-5 text-primary"/> Gestão de Stocks em Obra</CardTitle>
                            <CardDescription>Controle a entrada e saída de materiais chave no estaleiro e consulte o histórico de movimentações.</CardDescription>
                        </div>
                        {canEdit && (
                            <DialogTrigger asChild>
                                <Button><Plus className="mr-2 h-4 w-4"/>Adicionar Material</Button>
                            </DialogTrigger>
                        )}
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin"/> Carregando...</div>
                        ) : inventory.length === 0 ? (
                            <p className="text-muted-foreground text-center p-4">Nenhum material registado no inventário.</p>
                        ) : (
                            <Accordion type="single" collapsible className="w-full" onValueChange={fetchMovements}>
                                {inventory.map(item => (
                                    <AccordionItem value={item.id} key={item.id}>
                                        <div className="flex items-center border-b">
                                            <AccordionTrigger className="hover:no-underline flex-1">
                                                <div className="grid grid-cols-4 w-full items-center text-left">
                                                    <span className="font-medium">{item.name}</span>
                                                    <span>{formatCurrency(item.unitCost)}</span>
                                                    <span className="font-semibold text-lg">{item.quantity}</span>
                                                    <span>{item.unit}</span>
                                                </div>
                                            </AccordionTrigger>
                                            {canEdit && (
                                                <div className="text-right space-x-2 pr-4">
                                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openMovementDialog(item, 'Entrada'); }}>
                                                        <ArrowRight className="h-4 w-4 mr-2 text-green-500" />
                                                        Entrada
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openMovementDialog(item, 'Saída'); }}>
                                                        <ArrowLeft className="h-4 w-4 mr-2 text-red-500" />
                                                        Saída
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        <AccordionContent>
                                            <div className="p-4 bg-secondary/50 rounded-md">
                                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><History className="h-4 w-4"/>Histórico de Movimentações</h4>
                                                {loadingMovements === item.id && <Loader2 className="animate-spin my-4 mx-auto"/>}
                                                {movements[item.id] && movements[item.id].length > 0 ? (
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Data</TableHead>
                                                                <TableHead>Tipo</TableHead>
                                                                <TableHead>Qtd.</TableHead>
                                                                <TableHead>Motivo</TableHead>
                                                                <TableHead>Utilizador</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {movements[item.id].map(mov => (
                                                                <TableRow key={mov.id}>
                                                                    <TableCell>{mov.date ? (mov.date as any).toDate().toLocaleString() : '-'}</TableCell>
                                                                    <TableCell>{mov.type}</TableCell>
                                                                    <TableCell>{mov.quantity}</TableCell>
                                                                    <TableCell>{mov.reason || '-'}</TableCell>
                                                                    <TableCell>{mov.author?.displayName || '-'}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                ) : (
                                                    !loadingMovements && <p className="text-xs text-muted-foreground text-center p-4">Nenhum movimento registado.</p>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Adicionar Novo Material ao Inventário</DialogTitle>
                        <DialogDescription>Registe um novo tipo de material que será controlado no stock da obra.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto px-2">
                        {/* Quick Presets */}
                        <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/40 border border-muted-foreground/10">
                            <Label className="text-xs font-semibold text-muted-foreground block">Materiais Mais Usados em Obra (1 Clique):</Label>
                            <div className="flex flex-wrap gap-1.5">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 rounded-full bg-background hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                                    onClick={() => {
                                        setName('Cimento Portland 42.5R (50kg)');
                                        setUnit('saco');
                                        setUnitCost('5500');
                                        setMinStockLevel('50');
                                        setReorderQuantity('100');
                                    }}
                                >
                                    + Cimento 42.5R
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 rounded-full bg-background hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                                    onClick={() => {
                                        setName('Areia Lavada de Rio');
                                        setUnit('m³');
                                        setUnitCost('8500');
                                        setMinStockLevel('20');
                                        setReorderQuantity('40');
                                    }}
                                >
                                    + Areia Lavada
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 rounded-full bg-background hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                                    onClick={() => {
                                        setName('Brita Granítica nº 1');
                                        setUnit('m³');
                                        setUnitCost('14000');
                                        setMinStockLevel('15');
                                        setReorderQuantity('30');
                                    }}
                                >
                                    + Brita nº 1
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 rounded-full bg-background hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                    onClick={() => {
                                        setName('Varão de Aço A500NR (12mm)');
                                        setUnit('kg');
                                        setUnitCost('950');
                                        setMinStockLevel('500');
                                        setReorderQuantity('1000');
                                    }}
                                >
                                    + Aço A500NR
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 rounded-full bg-background hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
                                    onClick={() => {
                                        setName('Bloco de Betão 15x20x40');
                                        setUnit('un');
                                        setUnitCost('180');
                                        setMinStockLevel('1000');
                                        setReorderQuantity('2000');
                                    }}
                                >
                                    + Bloco Betão 15
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 rounded-full bg-background hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300"
                                    onClick={() => {
                                        setName('Gasóleo Rodoviário / Gerador');
                                        setUnit('L');
                                        setUnitCost('300');
                                        setMinStockLevel('200');
                                        setReorderQuantity('500');
                                    }}
                                >
                                    + Gasóleo (L)
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="material-name">Nome do Material</Label>
                            <Input id="material-name" placeholder="Ex: Saco de Cimento Portland" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="material-unit">Unidade</Label>
                                <Input id="material-unit" placeholder="Ex: un, m², kg, saco, L" value={unit} onChange={e => setUnit(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="material-cost">Custo Unitário (Kz)</Label>
                                <Input id="material-cost" type="number" placeholder="5500" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="material-initial">Qtd. Inicial (Opcional)</Label>
                                <Input id="material-initial" type="number" placeholder="0" value={initialQuantity} onChange={e => setInitialQuantity(e.target.value)} />
                            </div>
                        </div>

                        {/* Progressive Disclosure for Alert & Reorder Thresholds */}
                        <div className="pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground hover:text-foreground px-0"
                                onClick={() => setShowAdvancedStock(!showAdvancedStock)}
                            >
                                {showAdvancedStock ? '− Ocultar alertas de stock' : '+ Configurar alertas de stock mínimo e recompra (Opcional)'}
                            </Button>
                            {showAdvancedStock && (
                                <div className="grid grid-cols-2 gap-4 pt-3 mt-1 border-t">
                                    <div className="space-y-2">
                                        <Label htmlFor="min-stock">Nível Mínimo de Stock</Label>
                                        <Input id="min-stock" type="number" placeholder="Ex: 20" value={minStockLevel} onChange={e => setMinStockLevel(e.target.value)} />
                                        <p className="text-[11px] text-muted-foreground">Dispara aviso quando o saldo for inferior a este valor.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reorder-qty">Quantidade de Recompra</Label>
                                        <Input id="reorder-qty" type="number" placeholder="Ex: 50" value={reorderQuantity} onChange={e => setReorderQuantity(e.target.value)} />
                                        <p className="text-[11px] text-muted-foreground">Lote económico recomendado para nova encomenda.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={resetAddMaterialForm}>Cancelar</Button>
                        <Button onClick={handleAddMaterial} disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin mr-2" />}Adicionar ao Inventário</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isMovementDialogOpen} onOpenChange={resetMovementForm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registar {movementType} de Stock: {selectedItem?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="movement-qty">Quantidade</Label>
                                <Input id="movement-qty" type="number" value={movementQuantity} onChange={e => setMovementQuantity(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Unidade</Label>
                                <Input value={selectedItem?.unit || ''} disabled />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="movement-reason">Motivo (Opcional)</Label>
                            <Input id="movement-reason" placeholder={movementType === 'Entrada' ? "Ex: Receção da OC-123" : "Ex: Uso na frente de trabalho X"} value={movementReason || ''} onChange={e => setMovementReason(e.target.value)} />
                        </div>
                        {movementType === 'Saída' && (
                            <div className="space-y-2">
                                <Label htmlFor="movement-wbs">Atividade da EAP (Onde o material foi usado)</Label>
                                <Select value={movementWbsItemId} onValueChange={setMovementWbsItemId}>
                                    <SelectTrigger id="movement-wbs">
                                        <SelectValue placeholder="Selecione uma atividade..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Custo Geral</SelectItem>
                                        {wbsItems.map(item => (
                                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={resetMovementForm}>Cancelar</Button>
                        <Button onClick={handleRegisterMovement} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                            Confirmar Movimento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
