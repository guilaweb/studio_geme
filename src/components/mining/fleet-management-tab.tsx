
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, orderBy, collectionGroup, writeBatch, doc, getDocs, addDoc, serverTimestamp, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Truck, Wrench, Fuel, Clock, BarChart, History } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Equipment, EquipmentUsageLog, MaintenanceRecord, MaintenanceType } from '@/types/equipment';
import type { WbsItem } from '@/types/wbs';
import type { UserRole } from '@/app/projects/[id]/page';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Bar as RechartsBar, BarChart as RechartsBarChart, XAxis, YAxis, ResponsiveContainer, Tooltip as ChartTooltipComponent } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface FleetManagementTabProps {
    projectId: string;
    userRole: UserRole | null;
}

type CombinedLog = (EquipmentUsageLog | MaintenanceRecord) & { logType: 'usage' | 'maintenance' };

const formatNumber = (value: number | undefined) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', { maximumFractionDigits: 0 }).format(value);
};

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

export default function FleetManagementTab({ projectId, userRole }: FleetManagementTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [fleet, setFleet] = useState<Equipment[]>([]);
    const [usageLogs, setUsageLogs] = useState<EquipmentUsageLog[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Maintenance Dialog state
    const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [isSubmittingMaint, setIsSubmittingMaint] = useState(false);
    const [maintenanceDate, setMaintenanceDate] = useState<Date | undefined>(new Date());
    const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('Preventiva');
    const [maintenanceNotes, setMaintenanceNotes] = useState('');
    const [maintenanceCost, setMaintenanceCost] = useState('');
    const [downtimeHours, setDowntimeHours] = useState('');
    const [maintWbsItemId, setMaintWbsItemId] = useState('none');
    
    // History logs
    const [logs, setLogs] = useState<Record<string, CombinedLog[]>>({});
    const [loadingLogs, setLoadingLogs] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        let fleetLoaded = false, logsLoaded = false, wbsLoaded = false;
        const checkLoadingDone = () => { if (fleetLoaded && logsLoaded && wbsLoaded) setLoading(false); };

        const fleetQuery = query(collection(db, 'equipment'), where('author.uid', '==', user.uid), where('category', 'in', ['Veículo Pesado', 'Veículo Leve']));
        const unsubFleet = onSnapshot(fleetQuery, snapshot => {
            setFleet(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
            fleetLoaded = true;
            checkLoadingDone();
        });

        const logsQuery = query(collectionGroup(db, 'usageLogs'), where('author.uid', '==', user.uid));
        const unsubLogs = onSnapshot(logsQuery, snapshot => {
            setUsageLogs(snapshot.docs.map(doc => ({...doc.data(), date: (doc.data().date as any).toDate() } as EquipmentUsageLog)));
            logsLoaded = true;
            checkLoadingDone();
        });

        const wbsQuery = query(collection(db, 'projects', projectId, 'wbs'));
        const unsubWbs = onSnapshot(wbsQuery, snapshot => {
            setWbsItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WbsItem)));
            wbsLoaded = true;
            checkLoadingDone();
        });

        return () => {
            unsubFleet();
            unsubLogs();
            unsubWbs();
        };
    }, [user, projectId]);

    const fetchLogs = async (equipmentId: string) => {
        if (logs[equipmentId]) return;
        setLoadingLogs(equipmentId);
        try {
            const maintenanceQuery = query(collection(db, `equipment/${equipmentId}/maintenanceRecords`), orderBy('date', 'desc'));
            const maintenanceSnapshot = await getDocs(maintenanceQuery);
            const maintenanceRecords = maintenanceSnapshot.docs.map(doc => ({ ...(doc.data() as MaintenanceRecord), logType: 'maintenance', id: doc.id }));
            
            const relevantUsageLogs = usageLogs
                .filter(log => log.equipmentId === equipmentId)
                .map(log => ({ ...log, logType: 'usage' as 'usage' }));
            
            const combined = [...relevantUsageLogs, ...maintenanceRecords]
                .sort((a, b) => ((b.date as Timestamp)?.toMillis() || 0) - ((a.date as Timestamp)?.toMillis() || 0));

            setLogs(prev => ({ ...prev, [equipmentId]: combined as CombinedLog[] }));
        } catch (e) {
            toast({ title: 'Erro ao carregar histórico', variant: 'destructive' });
        } finally {
            setLoadingLogs(null);
        }
    };
    
    const handleOpenMaintenanceDialog = (eq: Equipment) => {
        setSelectedEquipment(eq);
        setMaintenanceDate(new Date());
        setMaintenanceType('Preventiva');
        setMaintenanceNotes('');
        setMaintenanceCost('');
        setDowntimeHours('');
        setMaintWbsItemId('none');
        setIsMaintenanceDialogOpen(true);
    };

    const handleRegisterMaintenance = async () => {
        if (!user || !selectedEquipment || !maintenanceDate) {
            toast({ title: 'Dados insuficientes', variant: 'destructive' });
            return;
        }

        setIsSubmittingMaint(true);
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
                author: { uid: user.uid, displayName: user.displayName },
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
            
            if (projectId && cost > 0) {
                const wbsItem = wbsItems.find(item => item.id === maintWbsItemId);
                const transactionRef = doc(collection(db, 'projects', projectId, 'transactions'));
                batch.set(transactionRef, {
                    description: `Manutenção: ${selectedEquipment.name} (${maintenanceType})`,
                    amount: cost, date: maintenanceDate, type: 'Despesa', status: 'Pago',
                    accountId: 'equipment-maintenance', accountName: 'Manutenção de Equipamentos',
                    author: { uid: user.uid, displayName: user.displayName }, createdAt: serverTimestamp(),
                    wbsItemId: maintWbsItemId !== 'none' ? maintWbsItemId : null,
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
            setIsSubmittingMaint(false);
        }
    };
    
    const thisMonthLogs = useMemo(() => {
        const start = startOfMonth(new Date());
        const end = endOfMonth(new Date());
        return usageLogs.filter(log => {
            if (!log.date) return false;
            const logDate = (log.date as any).toDate ? (log.date as any).toDate() : new Date(log.date as any);
            return isWithinInterval(logDate, { start, end });
        });
    }, [usageLogs]);

    const kpiData = useMemo(() => {
        const totalHours = thisMonthLogs.reduce((sum, log) => sum + log.hoursUsed, 0);
        const totalFuel = thisMonthLogs.reduce((sum, log) => sum + (log.fuelConsumed || 0), 0);
        
        let totalCost = 0;
        thisMonthLogs.forEach(log => {
            const eq = fleet.find(f => f.id === log.equipmentId);
            if (eq && eq.operationalCostPerHour) {
                totalCost += log.hoursUsed * eq.operationalCostPerHour;
            }
        });

        const availability = fleet.length > 0 ? (fleet.filter(f => f.status === 'Disponível' || f.status === 'Em Uso').length / fleet.length) * 100 : 0;

        return { totalFleetSize: fleet.length, availability, totalHours, totalFuel, totalCost };
    }, [fleet, thisMonthLogs]);
    
    const performanceData = useMemo(() => {
        const perfMap: Record<string, {
            name: string;
            totalHours: number;
            totalCost: number;
            totalFuel: number;
        }> = {};
    
        fleet.forEach(eq => {
            perfMap[eq.id] = { name: eq.name, totalHours: 0, totalCost: 0, totalFuel: 0 };
        });
    
        thisMonthLogs.forEach(log => {
            if (log.equipmentId && perfMap[log.equipmentId]) {
                const hours = log.hoursUsed || 0;
                const eqData = fleet.find(e => e.id === log.equipmentId);
                const costPerHour = eqData?.operationalCostPerHour || 0;
                perfMap[log.equipmentId].totalHours += hours;
                perfMap[log.equipmentId].totalCost += hours * costPerHour;
                perfMap[log.equipmentId].totalFuel += log.fuelConsumed || 0;
            }
        });
    
        return Object.values(perfMap).filter(p => p.totalHours > 0 || p.totalCost > 0 || p.totalFuel > 0).sort((a,b) => b.totalCost - a.totalCost);
    }, [thisMonthLogs, fleet]);


    const getMaintenanceStatus = (eq: Equipment) => {
        if (!eq.maintenanceIntervalHours || eq.maintenanceIntervalHours === 0) {
            return { progress: 0, isUrgent: false, needsMaintenance: false, message: 'Intervalo não definido.' };
        }
        const hoursSinceLast = (eq.currentHours || 0) - (eq.lastMaintenanceHours || 0);
        const progress = Math.min((hoursSinceLast / eq.maintenanceIntervalHours) * 100, 100);
        const needsMaintenance = hoursSinceLast >= eq.maintenanceIntervalHours;
        const isUrgent = needsMaintenance && hoursSinceLast >= eq.maintenanceIntervalHours * 1.1; // 10% overdue
        const hoursRemaining = eq.maintenanceIntervalHours - hoursSinceLast;
        
        const message = needsMaintenance ? `Manutenção atrasada em ${-hoursRemaining.toFixed(0)}h` : `Manutenção em ${hoursRemaining.toFixed(0)}h`;
        return { progress, isUrgent, needsMaintenance, message };
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8"/></div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total de Veículos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{kpiData.totalFleetSize}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Disponibilidade</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{kpiData.availability.toFixed(0)}%</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Horas (Este Mês)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatNumber(kpiData.totalHours)}h</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Combustível (Este Mês)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatNumber(kpiData.totalFuel)} L</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Custo Operacional (Mês)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(kpiData.totalCost)}</p></CardContent></Card>
            </div>
            
            <Card>
                 <CardHeader>
                    <CardTitle>Estado da Frota</CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full" onValueChange={fetchLogs}>
                        {fleet.length === 0 ? <p className="text-sm text-muted-foreground text-center p-4">Nenhum veículo pesado ou leve registado no parque de equipamentos.</p> :
                            fleet.map(eq => {
                                const maintenance = getMaintenanceStatus(eq);
                                return (
                                    <AccordionItem value={eq.id} key={eq.id}>
                                        <div className="flex w-full items-center">
                                            <AccordionTrigger className="hover:no-underline flex-1">
                                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center w-full text-left">
                                                    <span className="font-semibold">{eq.name}</span>
                                                    <Badge variant={eq.status === 'Disponível' ? 'default' : 'secondary'}>{eq.status}</Badge>
                                                    <span className="hidden md:block">{eq.currentProjectName || 'Parque'}</span>
                                                    <span className="hidden md:block text-right font-mono">{eq.currentHours || 0} h</span>
                                                    <div className="flex items-center gap-2">
                                                        <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger className="w-full">
                                                            <Progress value={maintenance.progress} indicatorClassName={cn(maintenance.isUrgent && "bg-destructive", maintenance.needsMaintenance && "bg-yellow-500")}/>
                                                        </TooltipTrigger><TooltipContent><p>{maintenance.message}</p></TooltipContent></Tooltip></TooltipProvider>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <div className="px-4">
                                                <Button variant="outline" size="sm" onClick={() => handleOpenMaintenanceDialog(eq)}>
                                                    <Wrench className="h-4 w-4 mr-2" /> Registar
                                                </Button>
                                            </div>
                                        </div>
                                         <AccordionContent className="p-4 space-y-4">
                                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><History className="h-4 w-4"/>Histórico Recente</h4>
                                            {loadingLogs === eq.id && <div className="flex justify-center py-4"><Loader2 className="animate-spin"/></div>}
                                            {logs[eq.id] && (
                                                <div className="max-h-60 overflow-y-auto border rounded-md">
                                                <Table>
                                                     <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Detalhes</TableHead><TableHead className="text-right">Horas/Custo</TableHead></TableRow></TableHeader>
                                                    <TableBody>
                                                        {logs[eq.id].length === 0 && <TableRow><TableCell colSpan={4} className="text-center">Nenhum registo.</TableCell></TableRow>}
                                                        {logs[eq.id].map(log => (
                                                            <TableRow key={log.id}>
                                                                <TableCell>{format((log.date as Timestamp).toDate(), 'dd/MM/yyyy')}</TableCell>
                                                                <TableCell><Badge variant={log.logType === 'usage' ? 'secondary' : 'outline'}>{log.logType === 'usage' ? 'Utilização' : 'Manutenção'}</Badge></TableCell>
                                                                <TableCell className="text-xs">{log.logType === 'usage' ? (log as EquipmentUsageLog).notes : (log as MaintenanceRecord).description}</TableCell>
                                                                <TableCell className="text-right font-mono text-xs">
                                                                     {log.logType === 'usage' ? `${(log as EquipmentUsageLog).hoursUsed}h` : `${formatCurrency((log as MaintenanceRecord).cost)}`}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                                </div>
                                            )}
                                         </AccordionContent>
                                    </AccordionItem>
                                );
                            })
                        }
                    </Accordion>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Top 5 Veículos por Custo Operacional (Mês)</CardTitle></CardHeader>
                    <CardContent>
                        <ChartContainer config={{ cost: { label: "Custo" } }} className="h-64 w-full">
                             <RechartsBarChart data={performanceData.sort((a,b) => b.totalCost - a.totalCost).slice(0,5)} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} width={120}/>
                                <ChartTooltipComponent cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)}/>}/>
                                <RechartsBar dataKey="totalCost" name="Custo Operacional" fill="hsl(var(--chart-2))" radius={4} />
                            </RechartsBarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Top 5 Veículos por Horas de Uso (Mês)</CardTitle></CardHeader>
                     <CardContent>
                        <ChartContainer config={{ hours: { label: "Horas" } }} className="h-64 w-full">
                            <RechartsBarChart data={performanceData.sort((a,b) => b.totalHours - a.totalHours).slice(0,5)} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} width={120}/>
                                <ChartTooltipComponent cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}h`}/>} />
                                <RechartsBar dataKey="totalHours" name="Horas de Uso" fill="hsl(var(--chart-1))" radius={4} />
                            </RechartsBarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Desempenho Detalhado da Frota (Este Mês)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                             <TableRow>
                                <TableHead>Equipamento</TableHead>
                                <TableHead className="text-right">Horas de Uso</TableHead>
                                <TableHead className="text-right">Consumo (L)</TableHead>
                                <TableHead className="text-right">Custo Operacional</TableHead>
                                <TableHead className="text-right">Custo/Hora</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {performanceData.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhum dado de utilização este mês.</TableCell></TableRow>
                            ) : (
                                performanceData.map(data => (
                                    <TableRow key={data.name}>
                                        <TableCell className="font-medium">{data.name}</TableCell>
                                        <TableCell className="text-right font-mono">{data.totalHours.toFixed(1)} h</TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(data.totalFuel)} L</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(data.totalCost)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(data.totalHours > 0 ? data.totalCost / data.totalHours : 0)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader><DialogTitle>Registar Manutenção para {selectedEquipment?.name}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Data da Manutenção</Label>
                                <DatePicker date={maintenanceDate} setDate={setMaintenanceDate} />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select value={maintenanceType} onValueChange={v => setMaintenanceType(v as MaintenanceType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                                <Label htmlFor="downtime">Tempo de Paragem (Horas)</Label>
                                <Input id="downtime" type="number" value={downtimeHours} onChange={(e) => setDowntimeHours(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maintenance-notes">Notas do Serviço Realizado</Label>
                            <Textarea id="maintenance-notes" value={maintenanceNotes} onChange={(e) => setMaintenanceNotes(e.target.value)} placeholder="Descreva os serviços realizados..."/>
                        </div>
                        {projectId && parseFloat(maintenanceCost) > 0 && (
                            <div className="space-y-2 pt-4 border-t">
                                <Label>Atribuir Custo à EAP do Projeto</Label>
                                <Select value={maintWbsItemId} onValueChange={setMaintWbsItemId}>
                                    <SelectTrigger><SelectValue placeholder="Selecione um item..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Custo Geral do Projeto</SelectItem>
                                        {wbsItems.map(item => (
                                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsMaintenanceDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleRegisterMaintenance} disabled={isSubmittingMaint}>
                            {isSubmittingMaint ? <Loader2 className="animate-spin mr-2" /> : <Wrench className="mr-2 h-4 w-4" />}
                            Registar Manutenção
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
