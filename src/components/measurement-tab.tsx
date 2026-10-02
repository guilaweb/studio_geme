
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Calculator, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WbsItem, WbsItemWithChildren } from '@/types/wbs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { useAuth } from '@/hooks/use-auth';

interface MeasurementTabProps {
    projectId: string;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

// Helper function to flatten the WBS tree
const flattenWbs = (items: WbsItemWithChildren[]): WbsItemWithChildren[] => {
    let allItems: WbsItemWithChildren[] = [];
    items.forEach(item => {
        allItems.push(item);
        if (item.children && item.children.length > 0) {
            allItems = [...allItems, ...flattenWbs(item.children)];
        }
    });
    return allItems;
};


export default function MeasurementTab({ projectId }: MeasurementTabProps) {
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useAuth();

    // State for the measurement dialog
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Fetch WBS items
    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'wbs'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WbsItem));
            setWbsItems(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching WBS for measurement: ", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [projectId]);
    
     const hierarchicalWbs = useMemo((): WbsItemWithChildren[] => {
        const itemsById: { [key: string]: WbsItemWithChildren } = {};
        wbsItems.forEach(item => {
            itemsById[item.id] = { ...item, children: [] };
        });
        const roots: WbsItemWithChildren[] = [];
        wbsItems.forEach(item => {
            if (item.parentId && itemsById[item.parentId]) {
                itemsById[item.parentId].children.push(itemsById[item.id]);
            } else {
                roots.push(itemsById[item.id]);
            }
        });
        return roots;
    }, [wbsItems]);

    const flatWbsItems = useMemo(() => flattenWbs(hierarchicalWbs), [hierarchicalWbs]);

    const itemsForMeasurement = useMemo(() => {
        return flatWbsItems.filter(item => (item.progress || 0) > 0 && !item.isMilestone);
    }, [flatWbsItems]);

    const calculation = useMemo(() => {
        const totalToBill = itemsForMeasurement.reduce((acc, item) => {
            if (selectedItems[item.id]) {
                const itemValue = (item.budget || 0) * ((item.progress || 0) / 100);
                return acc + itemValue;
            }
            return acc;
        }, 0);
        return { totalToBill };
    }, [selectedItems, itemsForMeasurement]);
    
    const handleSelectAll = (checked: boolean) => {
        const newSelection: Record<string, boolean> = {};
        if (checked) {
            itemsForMeasurement.forEach(item => {
                newSelection[item.id] = true;
            });
        }
        setSelectedItems(newSelection);
    };
    
    const handleGenerateInvoice = async () => {
        if (!user) return;
        const itemsToBill = itemsForMeasurement.filter(item => selectedItems[item.id]);
        if (itemsToBill.length === 0) {
            toast({ title: 'Nenhum item selecionado', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);

            // 1. Create the ClientInvoice document
            const invoiceRef = doc(collection(db, 'projects', projectId, 'clientInvoices'));
            const invoiceData = {
                projectId,
                invoiceNumber: `FAT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
                issueDate: serverTimestamp(),
                dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // Due in 30 days
                totalAmount: calculation.totalToBill,
                status: 'Pendente',
                items: itemsToBill.map(item => ({
                    id: item.id,
                    description: item.name,
                    quantity: item.progress,
                    unitPrice: (item.budget || 0) / 100, // Simplified: price per percentage point
                    total: (item.budget || 0) * ((item.progress || 0) / 100),
                })),
                author: {
                    uid: user.uid,
                    displayName: user.displayName,
                },
                createdAt: serverTimestamp(),
            };
            batch.set(invoiceRef, invoiceData);

            // 2. Create the corresponding 'Receita' transaction
            const transactionRef = doc(collection(db, 'projects', projectId, 'transactions'));
            batch.set(transactionRef, {
                description: `Fatura: ${invoiceData.invoiceNumber}`,
                amount: calculation.totalToBill,
                date: serverTimestamp(),
                type: 'Receita',
                status: 'Pendente',
                accountId: 'client-invoicing',
                accountName: 'Faturação a Clientes',
                invoiceId: invoiceRef.id,
            });

            await batch.commit();
            
            toast({ title: 'Fatura Gerada!', description: `A fatura ${invoiceData.invoiceNumber} foi criada e uma receita pendente foi lançada.` });
            setIsDialogOpen(false);
            setSelectedItems({});

        } catch (error) {
            console.error('Error generating invoice:', error);
            toast({ title: 'Erro ao gerar fatura', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary"/> Autos de Medição</CardTitle>
                    <CardDescription>Crie autos de medição com base no progresso da EAP para gerar faturas para o cliente.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin"/> Carregando dados da EAP...</div>
                    ) : itemsForMeasurement.length === 0 ? (
                         <div className="p-8 text-center text-muted-foreground border rounded-lg">
                            <p>Nenhuma atividade com progresso registado. Atualize a EAP para criar um auto de medição.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-start gap-4">
                             <p className="text-sm text-muted-foreground">Existem {itemsForMeasurement.length} atividades com progresso registado, prontas para serem incluídas num auto de medição.</p>
                            <DialogTrigger asChild>
                                <Button><Plus className="mr-2"/> Criar Auto de Medição e Fatura</Button>
                            </DialogTrigger>
                        </div>
                    )}
                </CardContent>
            </Card>

             <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Criar Novo Auto de Medição e Fatura</DialogTitle>
                    <DialogDescription>
                        Selecione as atividades concluídas ou parcialmente concluídas para incluir. O valor a faturar será calculado com base no progresso e no orçamento de cada item.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto my-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <Checkbox 
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                        checked={Object.keys(selectedItems).length > 0 && Object.keys(selectedItems).length === itemsForMeasurement.length}
                                    />
                                </TableHead>
                                <TableHead>Atividade</TableHead>
                                <TableHead className="w-[120px]">Progresso</TableHead>
                                <TableHead className="w-[150px]">Orçamento</TableHead>
                                <TableHead className="w-[150px] text-right">Valor a Medir</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {itemsForMeasurement.map(item => (
                                <TableRow key={item.id} data-state={selectedItems[item.id] && "selected"}>
                                    <TableCell>
                                        <Checkbox 
                                            checked={selectedItems[item.id] || false}
                                            onCheckedChange={(checked) => {
                                                setSelectedItems(prev => ({...prev, [item.id]: !!checked}))
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Progress value={item.progress} className="h-2" />
                                            <span>{item.progress}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatCurrency(item.budget)}</TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {formatCurrency((item.budget || 0) * ((item.progress || 0) / 100))}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <DialogFooter className="sm:justify-between items-center bg-muted/50 p-4 rounded-b-lg">
                    <div className="text-lg">
                        <span className="font-semibold">Total a Faturar:</span>
                        <span className="ml-2 font-bold text-primary font-mono">{formatCurrency(calculation.totalToBill)}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleGenerateInvoice} disabled={calculation.totalToBill === 0 || isSubmitting}>
                           {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <FileText className="mr-2 h-4 w-4"/>}
                           {isSubmitting ? 'A gerar...' : 'Gerar Fatura'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
