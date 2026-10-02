
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, writeBatch, Timestamp, addDoc, serverTimestamp, collectionGroup, orderBy, getDocs, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth, useRequireAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Equipment, MaintenanceRecord, MaintenanceType, EquipmentCategory, EquipmentStatus, EquipmentUsageLog } from '@/types/equipment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, Wrench, ArrowLeft, HelpCircle, Pencil, Truck, PlayCircle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subMonths, isAfter } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Header } from '@/components/Header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell, Legend, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { WbsItem } from '@/types/wbs';


interface MaintenancePageProps {}

export default function MaintenancePage({}: MaintenancePageProps) {
    const { user: adminUser, loading: authLoading } = useRequireAuth(['super-admin', 'Gestor de Frota']);
    const { toast } = useToast();
    const router = useRouter();
    const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Dialog state for new maintenance record
    const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [maintenanceDate, setMaintenanceDate] = useState<Date | undefined>(new Date());
    const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('Preventiva');
    const [maintenanceNotes, setMaintenanceNotes] = useState('');
    const [maintenanceCost, setMaintenanceCost] = useState('');
    const [downtimeHours, setDowntimeHours] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Dialog state for editing equipment
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState<Partial<Equipment> | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);


    // History state
    const [maintenanceLogs, setMaintenanceLogs] = useState<Record<string, MaintenanceRecord[]>>({});
    const [allUsageLogs, setAllUsageLogs] = useState<EquipmentUsageLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState<string | null>(null);

    // Filter states
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [maintenanceFilter, setMaintenanceFilter] = useState('all');

    // Charting state
    const [allMaintenanceLogs, setAllMaintenanceLogs] = useState<MaintenanceRecord[]>([]);

    // New state for WBS items
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [selectedWbsItemId, setSelectedWbsItemId] = useState<string>('none');


    useEffect(() => {
        if (!adminUser) return;

        setLoading(true);
        const globalEqQuery = query(collection(db, 'equipment'));
        const maintenanceLogsQuery = query(collectionGroup(db, 'maintenanceRecords'));
        const usageLogsQuery = query(collectionGroup(db, 'usageLogs'));

        const unsubEquipment = onSnapshot(globalEqQuery, (snapshot) => {
            const fetchedEquipment = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment));
            setEquipmentList(fetchedEquipment);
            checkLoadingComplete();
        }, (error) => {
            console.error("Error fetching global equipment: ", error);
            toast({ title: 'Erro ao carregar equipamentos', variant: 'destructive' });
            checkLoadingComplete();
        });

        const unsubMaintenance = onSnapshot(maintenanceLogsQuery, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as Timestamp).toDate()
            } as MaintenanceRecord));
            setAllMaintenanceLogs(logs);
            checkLoadingComplete();
        }, (error) => {
            console.error("Error fetching all maintenance logs:", error);
            checkLoadingComplete();
        });
        
        const unsubUsage = onSnapshot(usageLogsQuery, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as Timestamp).toDate()
            } as EquipmentUsageLog));
            setAllUsageLogs(logs);
            checkLoadingComplete();
        }, (error) => {
             console.error("Error fetching all usage logs:", error);
             checkLoadingComplete();
        });

        let loadedCount = 0;
        const totalToLoad = 3;
        const checkLoadingComplete = () => {
            loadedCount++;
            if (loadedCount === totalToLoad) {
                setLoading(false);
            }
        }

        return () => {
            unsubEquipment();
            unsubMaintenance();
            unsubUsage();
        };
    }, [adminUser, toast]);

    
    const fetchLogs = (equipmentId: string) => {
        if (!equipmentId || maintenanceLogs[equipmentId]) return;
        setLoadingLogs(equipmentId);
        const logsQuery = query(collection(db, 'equipment', equipmentId, 'maintenanceRecords'), orderBy('date', 'desc'));
        onSnapshot(logsQuery, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as Timestamp).toDate()
            } as MaintenanceRecord));
            setMaintenanceLogs(prev => ({ ...prev, [equipmentId]: logs }));
            setLoadingLogs(null);
        }, error => {
            console.error("Error fetching logs:", error);
            setLoadingLogs(null);
        });
    };

    const handleOpenMaintenanceDialog = (equipment: Equipment) => {
        setSelectedEquipment(equipment);
        setMaintenanceDate(new Date());
        setMaintenanceType('Preventiva');
        setMaintenanceNotes('');
        setMaintenanceCost('');
        setDowntimeHours('');
        setSelectedWbsItemId('none'); // Reset
        setWbsItems([]); // Reset

        if (equipment.currentProjectId) {
            const wbsQuery = query(collection(db, 'projects', equipment.currentProjectId, 'wbs'));
            onSnapshot(wbsQuery, (snapshot) => {
                const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WbsItem));
                setWbsItems(items);
            });
        }
        
        setIsMaintenanceDialogOpen(true);
    };

    const handleOpenEditDialog = (equipment: Equipment) => {
        setEditingEquipment(equipment);
        setIsEditDialogOpen(true);
    };

    const handleRegisterMaintenance = async () => {
        if (!adminUser || !selectedEquipment || !maintenanceDate) {
            toast({ title: 'Dados insuficientes', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        const batch = writeBatch(db);
        try {
            const cost = parseFloat(maintenanceCost) || 0;

            const maintenanceRef = doc(collection(db, 'equipment', selectedEquipment.id, 'maintenanceRecords'));
            batch.set(maintenanceRef, {
                date: maintenanceDate,
                type: maintenanceType,
                description: maintenanceNotes,
                cost: cost,
                downtimeHours: parseFloat(downtimeHours) || 0,
                author: { uid: adminUser.uid, displayName: adminUser.displayName },
                createdAt: serverTimestamp(),
            });

            const equipmentRef = doc(db, 'equipment', selectedEquipment.id);
            const statusUpdate: any = {
                lastMaintenanceDate: maintenanceDate,
                lastMaintenanceHours: selectedEquipment.currentHours || 0,
            };

            if (maintenanceType === 'Avaria' || maintenanceType === 'Corretiva') {
                statusUpdate.status = 'Em Manutenção';
            }
            batch.update(equipmentRef, statusUpdate);
            
            if (selectedEquipment.currentProjectId && cost > 0) {
                const wbsItem = wbsItems.find(item => item.id === selectedWbsItemId);
                const transactionRef = doc(collection(db, 'projects', selectedEquipment.currentProjectId, 'transactions'));
                batch.set(transactionRef, {
                    description: `Manutenção: ${selectedEquipment.name} (${maintenanceType})`,
                    amount: cost,
                    date: maintenanceDate,
                    type: 'Despesa',
                    status: 'Pago',
                    accountId: 'equipment-maintenance',
                    accountName: 'Manutenção de Equipamentos',
                    author: { uid: adminUser.uid, displayName: adminUser.displayName },
                    createdAt: serverTimestamp(),
                    wbsItemId: selectedWbsItemId !== 'none' ? selectedWbsItemId : null,
                    wbsItemName: wbsItem?.name || null,
                });
            }
            
            await batch.commit();

            toast({title: 'Manutenção Registada', description: `Manutenção para ${selectedEquipment.name} registada com sucesso.`});
            setIsMaintenanceDialogOpen(false);
        } catch (error) {
            console.error("Error registering maintenance: ", error);
            toast({title: 'Erro ao registar', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleUpdateEquipment = async () => {
        if (!editingEquipment?.id || !editingEquipment?.name) {
            toast({ title: 'Dados inválidos', variant: 'destructive' });
            return;
        }

        setIsUpdating(true);
        try {
            const { id, ...dataToUpdate } = editingEquipment;
            const eqRef = doc(db, 'equipment', id);
            
            const updatePayload = {
                ...dataToUpdate,
                cost: Number(dataToUpdate.cost) || 0,
                operationalCostPerHour: Number(dataToUpdate.operationalCostPerHour) || 0,
                maintenanceIntervalHours: Number(dataToUpdate.maintenanceIntervalHours) || undefined,
                currentHours: Number(dataToUpdate.currentHours) || 0,
            };

            await updateDoc(eqRef, updatePayload);
            
            toast({ title: 'Equipamento atualizado!' });
            setIsEditDialogOpen(false);
            setEditingEquipment(null);
        } catch (error) {
            console.error("Error updating equipment: ", error);
            toast({ title: 'Erro ao atualizar', variant: 'destructive' });
        } finally {
            setIsUpdating(false);
        }
    };


    const getMaintenanceStatus = (eq: Equipment) => {
        if (!eq.maintenanceIntervalHours || eq.maintenanceIntervalHours === 0) {
            return { progress: 0, isUrgent: false, needsMaintenance: false, message: 'Intervalo não definido.' };
        }
        const hoursSinceLast = (eq.currentHours || 0) - (eq.lastMaintenanceHours || 0);
        const progress = Math.min((hoursSinceLast / eq.maintenanceIntervalHours) * 100, 100);
        const needsMaintenance = hoursSinceLast >= eq.maintenanceIntervalHours;
        const isUrgent = hoursSinceLast >= eq.maintenanceIntervalHours * 1.1; // 10% overdue
        const hoursRemaining = eq.maintenanceIntervalHours - hoursSinceLast;
        
        let message = '';
        if (needsMaintenance) {
            message = `Manutenção atrasada em ${-hoursRemaining.toFixed(0)}h`;
        } else {
            message = `${hoursRemaining.toFixed(0)}h restantes`;
        }
        return { 
            progress, 
            isUrgent, 
            needsMaintenance,
            message,
        };
    };

    const filteredEquipmentList = useMemo(() => {
        return equipmentList.filter(eq => {
            const maintenanceStatus = getMaintenanceStatus(eq);
            const categoryMatch = categoryFilter === 'all' || eq.category === categoryFilter;
            const statusMatch = statusFilter === 'all' || eq.status === statusFilter;
            
            let maintenanceMatch = true;
            if (maintenanceFilter !== 'all') {
                if (maintenanceFilter === 'ok') maintenanceMatch = !maintenanceStatus.needsMaintenance;
                else if (maintenanceFilter === 'needed') maintenanceMatch = maintenanceStatus.needsMaintenance && !maintenanceStatus.isUrgent;
                else if (maintenanceFilter === 'urgent') maintenanceMatch = maintenanceStatus.isUrgent;
            }

            return categoryMatch && statusMatch && maintenanceMatch;
        });
    }, [equipmentList, categoryFilter, statusFilter, maintenanceFilter]);
    
    const performanceData = useMemo(() => {
        const perfMap: Record<string, { name: string, totalHours: number, totalCost: number }> = {};
        equipmentList.forEach(eq => {
            perfMap[eq.id] = { name: eq.name, totalHours: 0, totalCost: 0 };
        });

        allUsageLogs.forEach(log => {
            if (log.equipmentId && perfMap[log.equipmentId]) {
                const hours = log.hoursUsed || 0;
                const eqData = equipmentList.find(e => e.id === log.equipmentId);
                const costPerHour = eqData?.operationalCostPerHour || 0;
                perfMap[log.equipmentId].totalHours += hours;
                perfMap[log.equipmentId].totalCost += hours * costPerHour;
            }
        });

        return Object.values(perfMap);
    }, [allUsageLogs, equipmentList]);

    const usageByEquipmentChartData = useMemo(() => {
        return performanceData
            .filter(d => d.totalHours > 0)
            .sort((a, b) => b.totalHours - a.totalHours)
            .slice(0, 5)
            .map(d => ({ name: d.name, Horas: d.totalHours }));
    }, [performanceData]);
    
    const costByEquipmentChartData = useMemo(() => {
        return performanceData
            .filter(d => d.totalCost > 0)
            .sort((a, b) => b.totalCost - a.totalCost)
            .slice(0, 5)
            .map(d => ({ name: d.name, Custo: d.totalCost }));
    }, [performanceData]);

    const chartsData = useMemo(() => {
        const sixMonthsAgo = subMonths(new Date(), 6);

        const monthlyCosts: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
            const month = subMonths(new Date(), i);
            const monthKey = format(month, 'MMM/yy');
            monthlyCosts[monthKey] = 0;
        }

        const typeDistribution: Record<MaintenanceType, number> = {
            'Preventiva': 0,
            'Corretiva': 0,
            'Avaria': 0,
        };

        allMaintenanceLogs.forEach(log => {
            const logDate = (log.date as any)?.toDate ? (log.date as any).toDate() : (log.date as Date);
            if (logDate && isAfter(logDate, sixMonthsAgo)) {
                const monthKey = format(logDate, 'MMM/yy');
                if (monthlyCosts[monthKey] !== undefined) {
                    monthlyCosts[monthKey] += log.cost || 0;
                }
            }
            if(log.type) {
                typeDistribution[log.type]++;
            }
        });

        const monthlyCostData = Object.entries(monthlyCosts).map(([name, value]) => ({ name, value }));
        const typeDistributionData = Object.entries(typeDistribution).map(([name, value]) => ({ name, value })).filter(item => item.value > 0);
        const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

        return { monthlyCostData, typeDistributionData, COLORS };
    }, [allMaintenanceLogs]);

    const kpiData = useMemo(() => ({
        totalEquipment: equipmentList.length,
        inUse: equipmentList.filter(e => e.status === 'Em Uso').length,
        available: equipmentList.filter(e => e.status === 'Disponível').length,
        underMaintenance: equipmentList.filter(e => e.status === 'Em Manutenção').length,
    }), [equipmentList]);


    if (authLoading || !adminUser) {
      return (
        <div className="flex min-h-screen w-full flex-col bg-background">
          <Header />
          <main className="flex flex-1 items-center justify-center">
            <p>Carregando...</p>
          </main>
        </div>
      );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-secondary/50">
            <Header />
            <main className="flex-1 p-4 md:p-8">
                 <TooltipProvider>
                    <div className="max-w-7xl mx-auto space-y-8">
                        <div>
                            <Button variant="outline" asChild className="mb-4">
                                <Link href="/admin">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
                                </Link>
                            </Button>
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold font-headline">Gestão de Frota e Manutenção</h1>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mb-4"><HelpCircle className="h-4 w-4 text-muted-foreground"/></Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p className="max-w-xs">Acompanhe o estado de manutenção de toda a sua frota de equipamentos com base no horímetro e nos intervalos definidos para cada um.</p></TooltipContent>
                                </Tooltip>
                            </div>
                            <p className="text-muted-foreground">Acompanhe o estado, custos e desempenho de toda a sua frota.</p>
                        </div>
                        
                         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Equipamentos</CardTitle><Truck className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><p className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin"/> : kpiData.totalEquipment}</p></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Disponíveis</CardTitle><CheckCircle className="h-4 w-4 text-green-500" /></CardHeader>
                                <CardContent><p className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin"/> : kpiData.available}</p></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Em Uso</CardTitle><PlayCircle className="h-4 w-4 text-blue-500" /></CardHeader>
                                <CardContent><p className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin"/> : kpiData.inUse}</p></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Em Manutenção</CardTitle><Wrench className="h-4 w-4 text-yellow-500" /></CardHeader>
                                <CardContent><p className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin"/> : kpiData.underMaintenance}</p></CardContent>
                            </Card>
                        </div>

                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader><CardTitle>Top 5 Equipamentos por Horas de Uso</CardTitle></CardHeader>
                                <CardContent>
                                     <ChartContainer config={{ Horas: {label: 'Horas', color: 'hsl(var(--chart-1))'}}} className="h-64 w-full">
                                        <RechartsBarChart data={usageByEquipmentChartData} layout="vertical" margin={{ left: 20 }}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                                            <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}h`} />} />
                                            <Bar dataKey="Horas" fill="var(--color-Horas)" radius={4} />
                                        </RechartsBarChart>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Top 5 Equipamentos por Custo Operacional</CardTitle></CardHeader>
                                <CardContent>
                                     <ChartContainer config={{ Custo: {label: 'Custo', color: 'hsl(var(--chart-2))'}}} className="h-64 w-full">
                                        <RechartsBarChart data={costByEquipmentChartData} layout="vertical" margin={{ left: 20 }}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                                            <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(value as number)} />} />
                                            <Bar dataKey="Custo" fill="var(--color-Custo)" radius={4} />
                                        </RechartsBarChart>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                        </div>


                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Custo Total de Manutenção (Últimos 6 Meses)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer config={{value: {label: 'Custo', color: 'hsl(var(--chart-1))'}}} className="h-64 w-full">
                                        <RechartsBarChart data={chartsData.monthlyCostData} accessibilityLayer>
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                            <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} stroke="hsl(var(--muted-foreground))" fontSize={12}/>
                                            <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(value as number)}/>} />
                                            <Bar dataKey="value" name="Custo" fill="var(--color-value)" radius={4} />
                                        </RechartsBarChart>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Distribuição por Tipo de Manutenção</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="h-64 w-full">
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <RechartsTooltip content={<ChartTooltipContent />} />
                                                <Pie data={chartsData.typeDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                                    {chartsData.typeDistributionData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={chartsData.COLORS[index % chartsData.COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                        </div>


                        <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Estado da Frota</CardTitle>
                                    <div className="flex flex-wrap gap-4 pt-4">
                                        <div className="flex items-center gap-2">
                                            <Label>Categoria</Label>
                                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todas</SelectItem>
                                                    <SelectItem value="Veículo Pesado">Veículo Pesado</SelectItem>
                                                    <SelectItem value="Veículo Leve">Veículo Leve</SelectItem>
                                                    <SelectItem value="Ferramenta Elétrica">Ferramenta Elétrica</SelectItem>
                                                    <SelectItem value="Energia">Energia</SelectItem>
                                                    <SelectItem value="Outros">Outros</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="flex items-center gap-2">
                                            <Label>Estado</Label>
                                             <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="Disponível">Disponível</SelectItem>
                                                    <SelectItem value="Em Uso">Em Uso</SelectItem>
                                                    <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                                                    <SelectItem value="Inativo">Inativo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="flex items-center gap-2">
                                            <Label>Manutenção</Label>
                                             <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
                                                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos os Estados</SelectItem>
                                                    <SelectItem value="ok">OK</SelectItem>
                                                    <SelectItem value="needed">Manutenção Necessária</SelectItem>
                                                    <SelectItem value="urgent">Manutenção Urgente</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loading ? (
                                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /> Carregando...</div>
                                    ) : (
                                        <Accordion type="single" collapsible className="w-full" onValueChange={fetchLogs}>
                                            {filteredEquipmentList.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center p-4">Nenhum equipamento corresponde aos filtros selecionados.</p>
                                            ) : (
                                                filteredEquipmentList.map(eq => {
                                                    const status = getMaintenanceStatus(eq);
                                                    return (
                                                        <AccordionItem value={eq.id} key={eq.id}>
                                                            <div className="flex w-full items-center">
                                                                <AccordionTrigger className="flex-1 hover:no-underline">
                                                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center w-full text-left">
                                                                        <span className="font-medium">{eq.name}</span>
                                                                        <span>{eq.currentHours || 0} h</span>
                                                                        <span>{eq.maintenanceIntervalHours ? `${eq.maintenanceIntervalHours} h` : 'N/D'}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <Progress value={status.progress} indicatorClassName={cn(status.isUrgent ? 'bg-destructive' : status.needsMaintenance ? 'bg-yellow-500' : 'bg-primary')} />
                                                                            <span className="text-xs text-muted-foreground">{status.progress.toFixed(0)}%</span>
                                                                        </div>
                                                                         <div>{eq.currentProjectName ? <Badge variant="secondary">{eq.currentProjectName}</Badge> : <Badge variant="outline">Disponível</Badge>}</div>
                                                                    </div>
                                                                </AccordionTrigger>
                                                                <div className="px-4 flex items-center gap-2">
                                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(eq)}><Pencil className="h-4 w-4"/></Button>
                                                                    <Button variant="outline" size="sm" onClick={() => handleOpenMaintenanceDialog(eq)}>
                                                                        <Wrench className="h-4 w-4 mr-2" /> Registar
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            <AccordionContent className="p-4 bg-secondary/50">
                                                                <h4 className="font-semibold text-sm mb-2">Histórico de Manutenção</h4>
                                                                {loadingLogs === eq.id && <Loader2 className="animate-spin" />}
                                                                {maintenanceLogs[eq.id] && (
                                                                     <Table>
                                                                        <TableHeader>
                                                                            <TableRow>
                                                                                <TableHead>Data</TableHead>
                                                                                <TableHead>Tipo</TableHead>
                                                                                <TableHead>Descrição</TableHead>
                                                                                <TableHead className="text-right">Custo</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {maintenanceLogs[eq.id].length === 0 ? <TableRow><TableCell colSpan={4} className="text-center">Nenhum registo.</TableCell></TableRow> :
                                                                                maintenanceLogs[eq.id].map(log => (
                                                                                    <TableRow key={log.id}>
                                                                                        <TableCell>{format((log.date as any)?.toDate ? (log.date as any).toDate() : (log.date as Date), 'dd/MM/yyyy')}</TableCell>
                                                                                        <TableCell>{log.type}</TableCell>
                                                                                        <TableCell>{log.description}</TableCell>
                                                                                        <TableCell className="text-right">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(log.cost || 0)}</TableCell>
                                                                                    </TableRow>
                                                                                ))
                                                                            }
                                                                        </TableBody>
                                                                    </Table>
                                                                )}
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    )
                                                })
                                            )}
                                        </Accordion>
                                    )}
                                </CardContent>
                            </Card>

                            <DialogContent className="sm:max-w-xl">
                                <DialogHeader>
                                    <DialogTitle>Registar Manutenção para {selectedEquipment?.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Data da Manutenção</Label>
                                            <DatePicker date={maintenanceDate} setDate={setMaintenanceDate} />
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Tipo</Label>
                                            <Select value={maintenanceType} onValueChange={(v) => setMaintenanceType(v as MaintenanceType)}>
                                                <SelectTrigger><SelectValue/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Preventiva">Preventiva</SelectItem>
                                                    <SelectItem value="Corretiva">Corretiva</SelectItem>
                                                    <SelectItem value="Avaria">Avaria</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="maintenance-cost">Custo da Manutenção (Kz)</Label>
                                            <Input id="maintenance-cost" type="number" value={maintenanceCost} onChange={e => setMaintenanceCost(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="downtime">Tempo de Paragem (horas)</Label>
                                            <Input id="downtime" type="number" value={downtimeHours} onChange={e => setDowntimeHours(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Notas do Serviço Realizado</Label>
                                        <Textarea value={maintenanceNotes} onChange={(e) => setMaintenanceNotes(e.target.value)} placeholder="Descreva os serviços realizados..."/>
                                    </div>
                                    {selectedEquipment?.currentProjectId && parseFloat(maintenanceCost) > 0 && (
                                        <div className="space-y-2 pt-4 border-t">
                                            <Label>Atribuir Custo à EAP do Projeto</Label>
                                            <Select value={selectedWbsItemId} onValueChange={setSelectedWbsItemId}>
                                                <SelectTrigger><SelectValue placeholder="Selecione um item..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Custo Geral do Projeto</SelectItem>
                                                    {wbsItems.map(item => (
                                                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">Este custo será lançado como uma despesa no projeto '{selectedEquipment.currentProjectName}'.</p>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsMaintenanceDialogOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleRegisterMaintenance} disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Wrench className="mr-2 h-4 w-4" />}
                                        Registar Manutenção
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        
                         <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                            <DialogContent className="sm:max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Editar Equipamento: {editingEquipment?.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Nome</Label>
                                            <Input value={editingEquipment?.name || ''} onChange={(e) => setEditingEquipment(prev => ({...prev, name: e.target.value}))}/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Categoria</Label>
                                             <Select value={editingEquipment?.category || 'Outros'} onValueChange={(v) => setEditingEquipment(prev => ({...prev, category: v as EquipmentCategory}))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Veículo Pesado">Veículo Pesado</SelectItem>
                                                    <SelectItem value="Veículo Leve">Veículo Leve</SelectItem>
                                                    <SelectItem value="Ferramenta Elétrica">Ferramenta Elétrica</SelectItem>
                                                    <SelectItem value="Energia">Energia</SelectItem>
                                                    <SelectItem value="Outros">Outros</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                     <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Horímetro Atual</Label>
                                            <Input type="number" value={editingEquipment?.currentHours || ''} onChange={(e) => setEditingEquipment(prev => ({...prev, currentHours: parseFloat(e.target.value) || 0}))}/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Intervalo de Manutenção (horas)</Label>
                                            <Input type="number" value={editingEquipment?.maintenanceIntervalHours || ''} onChange={(e) => setEditingEquipment(prev => ({...prev, maintenanceIntervalHours: parseFloat(e.target.value) || 0}))}/>
                                        </div>
                                     </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleUpdateEquipment} disabled={isUpdating}>
                                        {isUpdating && <Loader2 className="animate-spin mr-2" />}
                                        Guardar Alterações
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                         </Dialog>

                    </div>
                </TooltipProvider>
            </main>
        </div>
    );
}
