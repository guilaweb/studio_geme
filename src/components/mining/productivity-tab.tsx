'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, Clock, Scaling, BarChart, Layers, Mountain, Gauge, TrendingDown, ArrowUpRight } from 'lucide-react';
import { ProductionLog } from '@/types/mining';
import { 
    Bar, 
    BarChart as RechartsBarChart, 
    PieChart, 
    Pie, 
    Cell, 
    Legend, 
    XAxis, 
    YAxis, 
    ResponsiveContainer, 
    Tooltip, 
    ComposedChart, 
    Line, 
    CartesianGrid 
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WorkforceMember } from '@/types/workforce';
import type { Equipment } from '@/types/equipment';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface ProductivityTabProps {
    projectId: string;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
        maximumFractionDigits: 0,
    }).format(value);
};

export default function ProductivityTab({ projectId }: ProductivityTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [logs, setLogs] = useState<ProductionLog[]>([]);
    const [workforce, setWorkforce] = useState<WorkforceMember[]>([]);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId || !user) return;
        setLoading(true);

        const createSubscription = (path: string, setter: React.Dispatch<any>, q?: any) => {
            const queryToUse = q || query(collection(db, path), orderBy('date', 'desc'));
            return onSnapshot(queryToUse, (snapshot: any) => {
                const items = snapshot.docs.map((doc: any) => ({
                    id: doc.id, 
                    ...doc.data(),
                    date: (doc.data().date as Timestamp)?.toDate ? (doc.data().date as Timestamp).toDate() : new Date(doc.data().date),
                }));
                setter(items);
            }, (error: any) => {
                console.error(`Error fetching ${path}:`, error);
                toast({ title: `Erro ao carregar dados de ${path}`, variant: 'destructive' });
            });
        };
        
        const unsubLogs = createSubscription(`projects/${projectId}/production-logs`, setLogs);
        const unsubWorkforce = createSubscription('workforce', setWorkforce, query(collection(db, 'workforce'), where('author.uid', '==', user.uid)));
        const unsubEquipment = createSubscription('equipment', setEquipment, query(collection(db, 'equipment'), where('author.uid', '==', user.uid)));
        
        Promise.all([
            new Promise(res => onSnapshot(query(collection(db, `projects/${projectId}/production-logs`)), res)),
            new Promise(res => onSnapshot(query(collection(db, 'workforce'), where('author.uid', '==', user.uid)), res)),
            new Promise(res => onSnapshot(query(collection(db, 'equipment'), where('author.uid', '==', user.uid)), res)),
        ]).finally(() => setLoading(false));

        return () => {
            unsubLogs();
            unsubWorkforce();
            unsubEquipment();
        };
    }, [projectId, user, toast]);

    const kpiData = useMemo(() => {
        let totalTonnage = 0;
        let oreTonnage = 0;
        let wasteTonnage = 0;
        let totalHours = 0;
        let equipmentCost = 0;
        let laborCost = 0;

        logs.forEach(log => {
            totalTonnage += log.tonnage;
            const isWaste = log.materialType === 'Estéril' || log.material.toLowerCase().includes('estéril');
            if (isWaste) {
                wasteTonnage += log.tonnage;
            } else {
                oreTonnage += log.tonnage;
            }

            if (log.operationHours) {
                totalHours += log.operationHours;
            }

            if (log.team && log.operationHours) {
                log.team.forEach(teamMember => {
                    const memberDetails = workforce.find(w => w.id === teamMember.id);
                    if (memberDetails && memberDetails.costPerHour) {
                        const hoursPerPerson = log.operationHours! / (log.team!.length || 1);
                        laborCost += hoursPerPerson * memberDetails.costPerHour;
                    }
                });
            }

            if (log.equipment && log.operationHours) {
                log.equipment.forEach(eq => {
                    const eqDetails = equipment.find(e => e.id === eq.equipmentId);
                    if (eqDetails && eqDetails.operationalCostPerHour) {
                        equipmentCost += log.operationHours! * eqDetails.operationalCostPerHour;
                    }
                });
            }
        });
        
        const totalCost = equipmentCost + laborCost;
        const costPerTon = totalTonnage > 0 ? totalCost / totalTonnage : 0;
        const costPerOreTon = oreTonnage > 0 ? totalCost / oreTonnage : 0;
        const tonsPerHour = totalHours > 0 ? totalTonnage / totalHours : 0;
        const remRatio = oreTonnage > 0 ? wasteTonnage / oreTonnage : 0;

        return {
            totalTonnage,
            oreTonnage,
            wasteTonnage,
            totalHours,
            equipmentCost,
            laborCost,
            totalCost,
            costPerTon,
            costPerOreTon,
            tonsPerHour,
            remRatio,
        };
    }, [logs, workforce, equipment]);

    const productionByMaterial = useMemo(() => {
        const materialMap = new Map<string, number>();
        logs.forEach(log => {
            materialMap.set(log.material, (materialMap.get(log.material) || 0) + log.tonnage);
        });
        return Array.from(materialMap.entries()).map(([name, value]) => ({ name, value }));
    }, [logs]);

    const productionByShift = useMemo(() => {
        const byShift: { [key: string]: number } = { 'Dia': 0, 'Noite': 0 };
        logs.forEach(log => {
            if (log.shift) {
                byShift[log.shift] += log.tonnage;
            }
        });
        return Object.entries(byShift).map(([name, value]) => ({ name, value }));
    }, [logs]);

    const monthlyAnalysisData = useMemo(() => {
        if (logs.length === 0) return [];
        const sortedLogs = [...logs].sort((a, b) => a.date.getTime() - b.date.getTime());
        const firstLogDate = sortedLogs[0].date;
        const lastLogDate = sortedLogs[sortedLogs.length - 1].date;
        
        const interval = eachMonthOfInterval({
          start: startOfMonth(subMonths(firstLogDate, 1)),
          end: endOfMonth(lastLogDate)
        });
        const monthlyData: Record<string, { month: string, Tonelagem: number, Minerio: number, Esteril: number, Custo: number, CustoPorTon: number }> = {};
        
        interval.forEach(monthStart => {
             const monthKey = format(monthStart, 'MMM/yy', { locale: ptBR });
             monthlyData[monthKey] = { month: monthKey, Tonelagem: 0, Minerio: 0, Esteril: 0, Custo: 0, CustoPorTon: 0 };
        });

        logs.forEach(log => {
            const monthKey = format(log.date, 'MMM/yy', { locale: ptBR });
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].Tonelagem += log.tonnage;
                const isWaste = log.materialType === 'Estéril' || log.material.toLowerCase().includes('estéril');
                if (isWaste) {
                    monthlyData[monthKey].Esteril += log.tonnage;
                } else {
                    monthlyData[monthKey].Minerio += log.tonnage;
                }

                let entryCost = 0;
                if (log.team && log.operationHours) {
                    log.team.forEach(teamMember => {
                        const memberDetails = workforce.find(w => w.id === teamMember.id);
                        if (memberDetails?.costPerHour) {
                            entryCost += (log.operationHours! / (log.team!.length || 1)) * memberDetails.costPerHour;
                        }
                    });
                }
                if (log.equipment && log.operationHours) {
                    log.equipment.forEach(eq => {
                        const eqDetails = equipment.find(e => e.id === eq.equipmentId);
                        if (eqDetails?.operationalCostPerHour) {
                            entryCost += log.operationHours! * eqDetails.operationalCostPerHour;
                        }
                    });
                }
                monthlyData[monthKey].Custo += entryCost;
            }
        });
        
        Object.values(monthlyData).forEach(item => {
            item.CustoPorTon = item.Tonelagem > 0 ? Math.round(item.Custo / item.Tonelagem) : 0;
        });

        return Object.values(monthlyData);
    }, [logs, workforce, equipment]);

    // Cost Breakdown Data
    const costBreakdownData = useMemo(() => {
        return [
            { name: 'Equipamentos Pesados', value: Math.round(kpiData.equipmentCost) },
            { name: 'Mão de Obra de Turno', value: Math.round(kpiData.laborCost) },
        ];
    }, [kpiData]);

    // Productivity by Pit / Source Location
    const sourceProductivityTable = useMemo(() => {
        const pitMap = new Map<string, { tonnage: number, hours: number, cost: number, count: number }>();
        
        logs.forEach(log => {
            const src = log.sourceLocation || 'Não especificada';
            const curr = pitMap.get(src) || { tonnage: 0, hours: 0, cost: 0, count: 0 };
            
            curr.tonnage += log.tonnage;
            curr.hours += log.operationHours || 0;
            curr.count += 1;

            let logCost = 0;
            if (log.team && log.operationHours) {
                log.team.forEach(m => {
                    const member = workforce.find(w => w.id === m.id);
                    if (member?.costPerHour) {
                        logCost += (log.operationHours! / (log.team!.length || 1)) * member.costPerHour;
                    }
                });
            }
            if (log.equipment && log.operationHours) {
                log.equipment.forEach(eq => {
                    const eqObj = equipment.find(e => e.id === eq.equipmentId);
                    if (eqObj?.operationalCostPerHour) {
                        logCost += log.operationHours! * eqObj.operationalCostPerHour;
                    }
                });
            }
            curr.cost += logCost;

            pitMap.set(src, curr);
        });

        return Array.from(pitMap.entries()).map(([source, stats]) => ({
            source,
            tonnage: stats.tonnage,
            hours: stats.hours,
            cost: stats.cost,
            costPerTon: stats.tonnage > 0 ? stats.cost / stats.tonnage : 0,
            tonsPerHour: stats.hours > 0 ? stats.tonnage / stats.hours : 0,
            count: stats.count,
        })).sort((a, b) => b.tonnage - a.tonnage);
    }, [logs, workforce, equipment]);

    const PIE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
    const BAR_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
                <Loader2 className="animate-spin h-5 w-5 text-primary" /> Carregando análise de produtividade mineira...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header com Ações Executivas */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
                <div>
                    <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                        <Scaling className="h-5 w-5 text-primary" />
                        Análise de Produtividade & Custo Unitário de Lavra
                    </h3>
                    <p className="text-muted-foreground text-xs">
                        Acompanhamento do custo por tonelada ($Kz/t$), decomposição operacional e rendimentos das bancadas.
                    </p>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1.5 text-xs shadow-sm"
                    onClick={() => window.print()}
                >
                    <Printer className="h-3.5 w-3.5 text-primary" />
                    Imprimir Relatório de Produtividade
                </Button>
            </div>

            {/* Top KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Custo por Tonelada (Global)</CardTitle>
                        <Scaling className="h-4 w-4 text-primary"/>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(kpiData.costPerTon)} <span className="text-sm font-normal text-muted-foreground">/ t</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Custo unitário ponderado de lavra</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Custo / Tonelada Minério Útil</CardTitle>
                        <Mountain className="h-4 w-4 text-emerald-600 dark:text-emerald-400"/>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(kpiData.costPerOreTon)} <span className="text-sm font-normal text-muted-foreground">/ t minério</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Inclui custo de estéril decapado</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Custo Operacional Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-primary"/>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(kpiData.totalCost)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Máquinas: {((kpiData.equipmentCost / (kpiData.totalCost || 1)) * 100).toFixed(0)}% | Equipa: {((kpiData.laborCost / (kpiData.totalCost || 1)) * 100).toFixed(0)}%
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Rendimento Horário</CardTitle>
                        <Clock className="h-4 w-4 text-primary"/>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{kpiData.tonsPerHour.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">t/h</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Rácio REM: {kpiData.remRatio.toFixed(2)} : 1</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts: Monthly Trend of Production vs. Cost & Cost per Ton */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <BarChart className="h-4 w-4 text-primary" /> Análise de Tendência: Produção vs. Custo Operacional Mensal
                    </CardTitle>
                    <CardDescription>
                        Correlação contínua entre tonelagem movimentada e custos operacionais de extração em Kwanzas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{Tonelagem: { label: 'Tonelagem (t)', color: 'hsl(var(--chart-1))' }, Custo: { label: 'Custo Total (AOA)', color: 'hsl(var(--chart-2))'}}} className="h-80 w-full">
                        <ComposedChart data={monthlyAnalysisData}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis yAxisId="left" orientation="left" stroke="var(--color-Tonelagem)" tickFormatter={(value) => `${Number(value) / 1000}k`} />
                            <YAxis yAxisId="right" orientation="right" stroke="var(--color-Custo)" tickFormatter={(value) => `${(Number(value) / 1000000).toFixed(1)}M`} />
                            <Tooltip content={<ChartTooltipContent formatter={(value, name) => name === 'Tonelagem' ? `${(value as number).toLocaleString('pt-AO')} t` : formatCurrency(value as number)} />} />
                            <Legend />
                            <Bar dataKey="Tonelagem" fill="var(--color-Tonelagem)" radius={4} yAxisId="left" />
                            <Line type="monotone" dataKey="Custo" stroke="var(--color-Custo)" strokeWidth={2.5} yAxisId="right" dot />
                        </ComposedChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Produção por Material */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Mountain className="h-4 w-4 text-primary" /> Distribuição de Produção por Material
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="h-64 w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toLocaleString('pt-AO')} t`} />} />
                                    <Legend />
                                    <Pie data={productionByMaterial} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                                        {productionByMaterial.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Composição de Custos */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" /> Decomposição de Custos Operacionais
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="h-64 w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                                    <Legend />
                                    <Pie data={costBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                                        <Cell fill="hsl(var(--chart-1))" />
                                        <Cell fill="hsl(var(--chart-3))" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table: Productivity by Source / Pit */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" /> Produtividade & Custos por Frente de Lavra
                    </CardTitle>
                    <CardDescription>
                        Desempenho operacional discriminado por setor de lavra e ponto de extração.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-semibold text-xs">Frente de Lavra / Origem</TableHead>
                                    <TableHead className="font-semibold text-xs text-right">Apontamentos</TableHead>
                                    <TableHead className="font-semibold text-xs text-right">Massa Extraída (t)</TableHead>
                                    <TableHead className="font-semibold text-xs text-right">Horas Operadas</TableHead>
                                    <TableHead className="font-semibold text-xs text-right">Rendimento (t/h)</TableHead>
                                    <TableHead className="font-semibold text-xs text-right">Custo Total (AOA)</TableHead>
                                    <TableHead className="font-semibold text-xs text-right">Custo / Tonelada</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sourceProductivityTable.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                                            Nenhum dado de produtividade por frente registado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sourceProductivityTable.map(row => (
                                        <TableRow key={row.source} className="hover:bg-muted/10">
                                            <TableCell className="font-semibold text-sm">{row.source}</TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">{row.count}</TableCell>
                                            <TableCell className="text-right font-mono font-medium text-sm">
                                                {row.tonnage.toLocaleString('pt-AO')}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                {row.hours > 0 ? `${row.hours.toFixed(1)} h` : '---'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium text-xs">
                                                {row.tonsPerHour > 0 ? `${row.tonsPerHour.toFixed(1)} t/h` : '---'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                {formatCurrency(row.cost)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-sm text-primary">
                                                {row.costPerTon > 0 ? formatCurrency(row.costPerTon) : '---'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
