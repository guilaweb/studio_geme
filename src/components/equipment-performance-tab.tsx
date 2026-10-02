'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, getDocs, collectionGroup, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, DollarSign, Clock, BarChart3 as BarChart, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from './ui/chart';
import type { ProjectEquipment, EquipmentUsageLog, Equipment } from '@/types/equipment';
import { useAuth } from '@/hooks/use-auth';

interface EquipmentPerformanceTabProps {
    projectId: string;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

interface PerformanceData {
    equipmentId: string;
    name: string;
    totalHours: number;
    totalCost: number;
    usageCount: number;
}

export default function EquipmentPerformanceTab({ projectId }: EquipmentPerformanceTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [projectEquipment, setProjectEquipment] = useState<ProjectEquipment[]>([]);
    const [usageLogs, setUsageLogs] = useState<EquipmentUsageLog[]>([]);
    const [globalEquipment, setGlobalEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId || !user) return;
        setLoading(true);

        let dataLoaded = { logs: false, equipment: false, projectEq: false };
        const checkLoadingDone = () => {
            if (Object.values(dataLoaded).every(Boolean)) {
                setLoading(false);
            }
        };

        const logsQuery = query(collectionGroup(db, 'usageLogs'), where('projectId', '==', projectId));
        const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EquipmentUsageLog));
            setUsageLogs(fetchedLogs);
            dataLoaded.logs = true;
            checkLoadingDone();
        }, error => {
            console.error("Error fetching usage logs:", error);
            dataLoaded.logs = true;
            checkLoadingDone();
        });

        const globalEqQuery = query(collection(db, 'equipment'), where('author.uid', '==', user.uid));
        const unsubEquipment = onSnapshot(globalEqQuery, (snapshot) => {
            setGlobalEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
            dataLoaded.equipment = true;
            checkLoadingDone();
        }, error => {
            console.error("Error fetching global equipment: ", error);
            dataLoaded.equipment = true;
            checkLoadingDone();
        });

        const projectEqQuery = query(collection(db, 'projects', projectId, 'equipment'));
        const unsubProjectEq = onSnapshot(projectEqQuery, (snapshot) => {
            setProjectEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectEquipment)));
            dataLoaded.projectEq = true;
            checkLoadingDone();
        }, error => {
            console.error("Error fetching project equipment:", error);
            dataLoaded.projectEq = true;
            checkLoadingDone();
        });


        return () => {
            unsubLogs();
            unsubEquipment();
            unsubProjectEq();
        };
    }, [projectId, user, toast]);

    const performanceData = useMemo((): PerformanceData[] => {
        const performanceMap: Record<string, PerformanceData> = {};

        projectEquipment.forEach(eq => {
            performanceMap[eq.equipmentId] = {
                equipmentId: eq.equipmentId,
                name: eq.name,
                totalHours: 0,
                totalCost: 0,
                usageCount: 0,
            };
        });
        
        usageLogs.forEach(log => {
            if (log.equipmentId && performanceMap[log.equipmentId]) {
                const globalEq = globalEquipment.find(g => g.id === log.equipmentId);
                const costPerHour = globalEq?.operationalCostPerHour || 0;
                
                performanceMap[log.equipmentId].totalHours += log.hoursUsed;
                performanceMap[log.equipmentId].totalCost += log.hoursUsed * costPerHour;
                performanceMap[log.equipmentId].usageCount += 1;
            }
        });
        
        return Object.values(performanceMap).filter(p => p.totalHours > 0);
    }, [usageLogs, projectEquipment, globalEquipment]);

    const kpiData = useMemo(() => {
        const totalHours = performanceData.reduce((sum, data) => sum + data.totalHours, 0);
        const totalCost = performanceData.reduce((sum, data) => sum + data.totalCost, 0);
        const avgCostPerHour = totalHours > 0 ? totalCost / totalHours : 0;
        return { totalHours, totalCost, avgCostPerHour };
    }, [performanceData]);

    const chartConfig = {
      totalHours: { label: "Horas de Uso", color: "hsl(var(--chart-1))" },
      totalCost: { label: "Custo Operacional", color: "hsl(var(--chart-2))" },
    };

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8"/></div>
    }
    
    return (
         <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Horas de Uso</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{kpiData.totalHours.toFixed(1)} h</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custo Operacional Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(kpiData.totalCost)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custo Médio por Hora</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(kpiData.avgCostPerHour)}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Utilização por Equipamento</CardTitle>
                </CardHeader>
                <CardContent>
                     <ChartContainer config={chartConfig} className="h-72 w-full">
                        <RechartsBarChart data={performanceData} margin={{ left: 20 }}>
                             <XAxis dataKey="name" tick={false} axisLine={false} />
                            <YAxis tickFormatter={(value) => `${value.toLocaleString()} h`} />
                            <Tooltip content={<ChartTooltipContent formatter={(value, name) => `${(value as number).toFixed(1)}h`} />} />
                            <Legend />
                            <Bar dataKey="totalHours" fill="var(--color-totalHours)" radius={4} name="Horas de Uso"/>
                        </RechartsBarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle>Tabela de Desempenho Detalhada</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Equipamento</TableHead>
                                <TableHead className="text-right">Total de Horas</TableHead>
                                <TableHead className="text-right">Custo Operacional</TableHead>
                                <TableHead className="text-right">Custo/Hora</TableHead>
                                <TableHead className="text-right">Nº de Utilizações</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            {performanceData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Nenhum dado de utilização registado para este projeto.</TableCell>
                                </TableRow>
                            ) : (
                                performanceData.map(data => (
                                    <TableRow key={data.equipmentId}>
                                        <TableCell className="font-medium">{data.name}</TableCell>
                                        <TableCell className="text-right font-mono">{data.totalHours.toFixed(1)} h</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(data.totalCost)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(data.totalHours > 0 ? data.totalCost / data.totalHours : 0)}</TableCell>
                                        <TableCell className="text-right font-mono">{data.usageCount}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
