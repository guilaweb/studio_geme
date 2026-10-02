
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, Timestamp, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { TimesheetEntry, ProductionEntry, WorkforceMember } from '@/types/workforce';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, Clock, BarChart3 as BarChart, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, ComposedChart, Line, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';

interface PerformanceAnalysisTabProps {
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
    workforceId: string;
    name: string;
    role: string;
    totalHours: number;
    totalCost: number;
    production: { [unit: string]: number };
    productivity: { [unit: string]: number };
}

export default function PerformanceAnalysisTab({ projectId }: PerformanceAnalysisTabProps) {
    const { user: authUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [workforce, setWorkforce] = useState<WorkforceMember[]>([]);
    const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
    const [production, setProduction] = useState<ProductionEntry[]>([]);
    const [loadingData, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });


    useEffect(() => {
        if (authLoading || !authUser) return;
        setLoading(true);

        const isGlobal = projectId === 'global';
        
        let loadedCount = 0;
        const totalToLoad = 3;
        const checkDone = () => {
            loadedCount++;
            if (loadedCount === totalToLoad) {
                setLoading(false);
            }
        };

        const createSubscription = (subcollection: string, setter: React.Dispatch<any>, dateField: string) => {
            let collRef: any = isGlobal 
                ? collectionGroup(db, subcollection) 
                : collection(db, 'projects', projectId, subcollection);
            
            const q = query(
                collRef, 
                where('date', '>=', dateRange.from),
                where('date', '<=', addDays(dateRange.to, 1))
            );
            
            return onSnapshot(q, (snapshot) => {
                const items = snapshot.docs.map(doc => {
                     const data = doc.data() as Record<string, any>;
                     const dateVal = data[dateField] as Timestamp | undefined;
                     return { ...data, id: doc.id, date: dateVal?.toDate ? dateVal.toDate() : (dateVal ? new Date(dateVal as any) : new Date()) };
                });
                setter(items);
                checkDone();
            }, (error) => {
                console.error(`Error fetching ${subcollection}:`, error);
                toast({ title: `Erro ao carregar dados de ${subcollection}`, variant: 'destructive' });
                checkDone();
            });
        };
        
        const q = query(collection(db, 'workforce'));
        const unsubWorkforce = onSnapshot(q, snapshot => {
            setWorkforce(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkforceMember)));
            checkDone();
        });

        const unsubTimesheets = createSubscription('timesheets', setTimesheets, 'date');
        const unsubProduction = createSubscription('productionEntries', setProduction, 'date');


        return () => {
            unsubTimesheets();
            unsubProduction();
            unsubWorkforce();
        };
    }, [authLoading, authUser, projectId, dateRange, toast]);

    const performanceData = useMemo((): PerformanceData[] => {
        if (workforce.length === 0) return [];
        
        const performanceMap: Record<string, PerformanceData> = {};

        workforce.forEach(member => {
            performanceMap[member.id] = {
                workforceId: member.id,
                name: member.name,
                role: member.role,
                totalHours: 0,
                totalCost: 0,
                production: {},
                productivity: {},
            };
        });

        timesheets.forEach(entry => {
            if (performanceMap[entry.workforceId]) {
                performanceMap[entry.workforceId].totalHours += entry.hours;
                performanceMap[entry.workforceId].totalCost += entry.cost || 0;
            }
        });

        production.forEach(entry => {
            const member = workforce.find(w => w.id === entry.workforceId);
            if (member && performanceMap[entry.workforceId]) {
                const unit = entry.unit || 'un';
                if (!performanceMap[entry.workforceId].production[unit]) {
                    performanceMap[entry.workforceId].production[unit] = 0;
                }
                performanceMap[entry.workforceId].production[unit] += entry.quantity;
            }
        });
        
        // Calculate productivity
        Object.values(performanceMap).forEach(data => {
            if (data.totalHours > 0) {
                Object.entries(data.production).forEach(([unit, qty]) => {
                    data.productivity[unit] = qty / data.totalHours;
                });
            }
        });
        
        return Object.values(performanceMap).filter(p => p.totalHours > 0 || Object.keys(p.production).length > 0).sort((a, b) => b.totalCost - a.totalCost);
    }, [workforce, timesheets, production]);

    const kpiData = useMemo(() => {
        const totalHours = performanceData.reduce((sum, data) => sum + data.totalHours, 0);
        const totalCost = performanceData.reduce((sum, data) => sum + data.totalCost, 0);
        const avgCostPerHour = totalHours > 0 ? totalCost / totalHours : 0;
        return { totalHours, totalCost, avgCostPerHour };
    }, [performanceData]);

    const chartDataByRole = useMemo(() => {
        const roleMap: Record<string, { role: string, totalCost: number, totalHours: number, memberCount: number }> = {};
        performanceData.forEach(data => {
            if (!roleMap[data.role]) {
                roleMap[data.role] = { role: data.role, totalCost: 0, totalHours: 0, memberCount: 0 };
            }
            roleMap[data.role].totalCost += data.totalCost;
            roleMap[data.role].totalHours += data.totalHours;
            roleMap[data.role].memberCount += 1;
        });
        return Object.values(roleMap);
    }, [performanceData]);

    const firstProductionUnit = useMemo(() => {
        for (const data of performanceData) {
            const units = Object.keys(data.production);
            if (units.length > 0) {
                return units[0];
            }
        }
        return null;
    }, [performanceData]);

    const productivityChartData = useMemo(() => {
        if (!firstProductionUnit) return [];
        return performanceData.map(data => ({
            name: data.name,
            value: data.productivity[firstProductionUnit] || 0,
        }));
    }, [performanceData, firstProductionUnit]);

    const chartConfig = {
      Custo: { label: "Custo", color: "hsl(var(--chart-1))" },
      Horas: { label: "Horas", color: "hsl(var(--chart-2))" },
    };

    if (authLoading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8"/></div>
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Filtros de Análise</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                     <div className="space-y-2">
                        <Label>Data de Início</Label>
                        <DatePicker date={dateRange.from} setDate={(d) => setDateRange(prev => ({...prev, from: d || prev.from}))}/>
                    </div>
                    <div className="space-y-2">
                        <Label>Data de Fim</Label>
                        <DatePicker date={dateRange.to} setDate={(d) => setDateRange(prev => ({...prev, to: d || prev.to}))}/>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{loadingData ? <Loader2 className="h-6 w-6 animate-spin"/> : `${kpiData.totalHours.toFixed(1)} h`}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custo Total da Mão de Obra</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{loadingData ? <Loader2 className="h-6 w-6 animate-spin"/> : formatCurrency(kpiData.totalCost)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custo Médio por Hora</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{loadingData ? <Loader2 className="h-6 w-6 animate-spin"/> : formatCurrency(kpiData.avgCostPerHour)}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Desempenho Agregado por Função</CardTitle>
                    <CardDescription>Compare o custo e as horas trabalhadas entre as diferentes funções para o período selecionado.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingData ? <div className="flex h-72 items-center justify-center"><Loader2 className="animate-spin h-8 w-8"/></div> :
                        <ChartContainer config={chartConfig} className="h-72 w-full">
                            <ComposedChart data={chartDataByRole}>
                                 <XAxis dataKey="role" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                <YAxis yAxisId="left" orientation="left" stroke="var(--color-Custo)" tickFormatter={(value) => `${Number(value) / 1000}k`} />
                                 <YAxis yAxisId="right" orientation="right" stroke="var(--color-Horas)" tickFormatter={(value) => `${value}`} />
                                <Tooltip content={<ChartTooltipContent formatter={(value, name) => name === 'Custo' ? formatCurrency(value as number) : `${(value as number).toFixed(1)}h`}/>} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="totalCost" fill="var(--color-Custo)" radius={4} name="Custo"/>
                                <Bar yAxisId="right" dataKey="totalHours" fill="var(--color-Horas)" radius={4} name="Horas"/>
                            </ComposedChart>
                        </ChartContainer>
                    }
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle>Tabela de Desempenho Detalhada</CardTitle>
                    <CardDescription>Análise individual do desempenho de cada funcionário no período selecionado.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingData ? <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div> : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Funcionário</TableHead>
                                        <TableHead>Função</TableHead>
                                        <TableHead className="text-right">Horas Trabalhadas</TableHead>
                                        <TableHead>Produção Total</TableHead>
                                        <TableHead className="text-right">Produtividade</TableHead>
                                        <TableHead className="text-right">Custo Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                 <TableBody>
                                    {performanceData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">Nenhum dado de desempenho para exibir no período selecionado.</TableCell>
                                        </TableRow>
                                    ) : (
                                        performanceData.map(data => {
                                            const productionString = Object.entries(data.production).map(([unit, qty]) => `${qty.toFixed(2)} ${unit}`).join(', ') || 'N/A';
                                            const productivityString = data.totalHours > 0 ? Object.entries(data.productivity).map(([unit, rate]) => `${rate.toFixed(2)} ${unit}/h`).join(', ') : 'N/A';
                                            
                                            return (
                                                <TableRow key={data.workforceId}>
                                                    <TableCell className="font-medium">{data.name}</TableCell>
                                                    <TableCell className="text-muted-foreground">{data.role}</TableCell>
                                                    <TableCell className="text-right font-mono">{data.totalHours.toFixed(2)} h</TableCell>
                                                    <TableCell>{productionString}</TableCell>
                                                    <TableCell className="text-right text-muted-foreground">{productivityString}</TableCell>
                                                    <TableCell className="text-right font-semibold">{formatCurrency(data.totalCost)}</TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
