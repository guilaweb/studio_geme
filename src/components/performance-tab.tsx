
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, Timestamp, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Activity, BarChart, Clock, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TimesheetEntry, ProductionEntry, ProjectWorkforceMember } from '@/types/workforce';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface PerformanceTabProps {
    projectId: string;
}

interface PerformanceData {
    workforceId: string;
    name: string;
    role: string;
    totalHours: number;
    totalCost: number;
    production: { [unit: string]: number };
    productivity: { [unit: string]: number };
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

export default function PerformanceTab({ projectId }: PerformanceTabProps) {
    const { toast } = useToast();
    const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
    const [production, setProduction] = useState<ProductionEntry[]>([]);
    const [projectWorkforce, setProjectWorkforce] = useState<ProjectWorkforceMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        let loadedCount = 0;
        const totalCollections = 3;

        const handleLoad = () => {
            loadedCount++;
            if (loadedCount === totalCollections) {
                setLoading(false);
            }
        };

        const createSubscription = (path: string, setter: React.Dispatch<any>) => {
            const q = query(collection(db, path));
            return onSnapshot(q, (snapshot) => {
                const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setter(items);
                handleLoad();
            }, (error) => {
                console.error(`Error fetching ${path}:`, error);
                toast({ title: `Erro ao carregar dados de ${path}`, variant: 'destructive' });
                setter([]);
                handleLoad();
            });
        };

        const unsubscribes = [
            createSubscription(`projects/${projectId}/timesheets`, setTimesheets),
            createSubscription(`projects/${projectId}/productionEntries`, setProduction),
            createSubscription(`projects/${projectId}/workforce`, setProjectWorkforce),
        ];

        return () => unsubscribes.forEach(unsub => unsub());
    }, [projectId, toast]);


    const performanceData = useMemo((): PerformanceData[] => {
        const performanceMap: Record<string, PerformanceData> = {};

        projectWorkforce.forEach(member => {
            performanceMap[member.workforceId] = {
                workforceId: member.workforceId,
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
            if (performanceMap[entry.workforceId]) {
                const unit = entry.unit || 'un';
                if (!performanceMap[entry.workforceId].production[unit]) {
                    performanceMap[entry.workforceId].production[unit] = 0;
                }
                performanceMap[entry.workforceId].production[unit] += entry.quantity;
            }
        });
        
        Object.values(performanceMap).forEach(data => {
            if (data.totalHours > 0) {
                Object.entries(data.production).forEach(([unit, qty]) => {
                    data.productivity[unit] = qty / data.totalHours;
                });
            }
        });
        
        return Object.values(performanceMap).sort((a, b) => a.name.localeCompare(b.name));
    }, [projectWorkforce, timesheets, production]);

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


    return (
        <div className="space-y-6 pt-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary"/> Desempenho da Mão de Obra</CardTitle>
                    <CardDescription>Análise da produtividade e custo da mão de obra alocada a este projeto.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /> Carregando...</div>
                    ) : (
                        <div className="space-y-8">
                            {performanceData.length > 0 && (
                                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4"/>Custo por Funcionário</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ChartContainer config={{}} className="h-64 w-full">
                                                <RechartsBarChart data={performanceData} layout="vertical" margin={{ left: 10, right: 10}}>
                                                    <XAxis type="number" hide />
                                                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                                                    <Bar dataKey="totalCost" name="Custo Total" fill="hsl(var(--chart-1))" radius={4} />
                                                </RechartsBarChart>
                                            </ChartContainer>
                                        </CardContent>
                                    </Card>
                                     <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4"/>Horas por Funcionário</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                             <ChartContainer config={{}} className="h-64 w-full">
                                                <RechartsBarChart data={performanceData} layout="vertical" margin={{ left: 10, right: 10}}>
                                                    <XAxis type="number" hide />
                                                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}h`} />} />
                                                    <Bar dataKey="totalHours" name="Total de Horas" fill="hsl(var(--chart-2))" radius={4} />
                                                </RechartsBarChart>
                                            </ChartContainer>
                                        </CardContent>
                                    </Card>
                                     <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2"><BarChart className="h-4 w-4"/>Produtividade ({firstProductionUnit || 'N/A'})</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                             <ChartContainer config={{}} className="h-64 w-full">
                                                <RechartsBarChart data={productivityChartData} layout="vertical" margin={{ left: 10, right: 10}}>
                                                    <XAxis type="number" hide />
                                                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)} ${firstProductionUnit}/h`} />} />
                                                    <Bar dataKey="value" name={`Produtividade (${firstProductionUnit})`} fill="hsl(var(--chart-3))" radius={4} />
                                                </RechartsBarChart>
                                            </ChartContainer>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

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
                                                <TableCell colSpan={6} className="h-24 text-center">Nenhum dado de desempenho para exibir.</TableCell>
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
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
