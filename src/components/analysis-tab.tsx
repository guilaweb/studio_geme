'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Info, FileDown, AreaChart, BarChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WbsItem } from '@/types/wbs';
import type { Transaction, ClientInvoice } from '@/types/finance';
import { LineChart, Line, Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { eachDayOfInterval, format, differenceInDays, isAfter, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from './ui/button';
import { unparse } from 'papaparse';


interface AnalysisTabProps {
    projectId: string;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '0,00 Kz';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};


export default function AnalysisTab({ projectId }: AnalysisTabProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [clientInvoices, setClientInvoices] = useState<ClientInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Fetch data
    useEffect(() => {
        if (!projectId) return;
        setLoading(true);

        const unsubscribes: (() => void)[] = [];

        const collectionsToFetch = [
            { name: 'wbs', setter: setWbsItems },
            { name: 'transactions', setter: setTransactions },
            { name: 'clientInvoices', setter: setClientInvoices },
        ];

        let loadedCount = 0;
        const totalCollections = collectionsToFetch.length;

        collectionsToFetch.forEach(({ name, setter }) => {
            const q = query(collection(db, 'projects', projectId, name));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                 const items = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Convert Firestore Timestamps to JS Dates for relevant fields
                    if (data.startDate) data.startDate = (data.startDate as any).toDate();
                    if (data.endDate) data.endDate = (data.endDate as any).toDate();
                    if (data.date) data.date = (data.date as any).toDate();
                    if (data.issueDate) data.issueDate = (data.issueDate as any).toDate();
                    if (data.dueDate) data.dueDate = (data.dueDate as any).toDate();
                    return { id: doc.id, ...data };
                });
                setter(items as any);

                loadedCount++;
                if (loadedCount === totalCollections) {
                    setLoading(false);
                }
            }, (error) => {
                console.error(`Error fetching ${name}: `, error);
                toast({ title: `Erro ao carregar ${name} para análise`, variant: 'destructive' });
                setLoading(false);
            });
            unsubscribes.push(unsubscribe);
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [projectId, toast]);

    const earnedValueAnalysisData = useMemo(() => {
        if (wbsItems.length === 0) return { chartData: [], kpis: { cpi: 1, spi: 1, eac: 0, etc: 0, vac: 0 } };
        
        const allDates = wbsItems.flatMap(item => [item.startDate, item.endDate]).filter((d): d is Date => d instanceof Date);
        if (allDates.length === 0) {
            return { chartData: [], kpis: { cpi: 1, spi: 1, eac: 0, etc: 0, vac: 0 } };
        }

        const projectStartDate = new Date(Math.min.apply(null, allDates.map(d => d.getTime())));
        const projectEndDate = new Date(Math.max.apply(null, allDates.map(d => d.getTime())));

        if (isAfter(projectStartDate, projectEndDate)) return { chartData: [], kpis: { cpi: 1, spi: 1, eac: 0, etc: 0, vac: 0 } };

        const today = new Date();
        const timeline = eachDayOfInterval({ start: projectStartDate, end: projectEndDate });
        const dataByDate = new Map<string, { date: string, pv: number, ac: number, ev: number }>();
    
        timeline.forEach(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            dataByDate.set(dateKey, { date: format(day, 'dd/MM'), pv: 0, ac: 0, ev: 0 });
        });
    
        // Calculate Planned Value (PV)
        wbsItems.forEach(item => {
            if (item.startDate && item.endDate && item.budget && item.budget > 0) {
                const duration = differenceInDays(item.endDate, item.startDate) + 1;
                const dailyBudget = item.budget / duration;
                const itemTimeline = eachDayOfInterval({ start: item.startDate, end: item.endDate });
                itemTimeline.forEach(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    if (dataByDate.has(dateKey)) {
                        dataByDate.get(dateKey)!.pv += dailyBudget;
                    }
                });
            }
        });
    
        // Calculate Actual Cost (AC)
        transactions.forEach(t => {
            if (t.type === 'Despesa' && t.date && isAfter(today, t.date)) {
                const dateKey = format(t.date, 'yyyy-MM-dd');
                if (dataByDate.has(dateKey)) {
                    dataByDate.get(dateKey)!.ac += t.amount;
                }
            }
        });
        
        let cumulativePV = 0, cumulativeAC = 0;
        const chartData = Array.from(dataByDate.values()).map(d => {
            cumulativePV += d.pv;
            cumulativeAC += d.ac;
            return { ...d, pv: cumulativePV, ac: cumulativeAC };
        });

        const totalProjectBudget = wbsItems.reduce((sum, item) => sum + (item.budget || 0), 0);
        const totalEarnedValue = wbsItems.reduce((sum, item) => {
            return sum + ((item.progress || 0) / 100) * (item.budget || 0);
        }, 0);
        
        const todayKey = format(today, 'dd/MM');
        const todayIndex = chartData.findIndex(d => d.date === todayKey);
        
        chartData.forEach((d, i) => {
            if (i <= todayIndex) {
                d.ev = totalEarnedValue;
            } else {
                d.ev = null as any; 
            }
        });

        const latestDataPoint = todayIndex >= 0 ? chartData[todayIndex] : chartData[chartData.length -1];
        const totalPV = latestDataPoint ? latestDataPoint.pv : 0;
        const totalAC = latestDataPoint ? latestDataPoint.ac : 0;

        const cpi = totalAC > 0 ? totalEarnedValue / totalAC : 1;
        const spi = totalPV > 0 ? totalEarnedValue / totalPV : 1;

        // Forecast Calculations
        const eac = cpi > 0 ? totalProjectBudget / cpi : totalProjectBudget; // Estimate at Completion
        const etc = eac - totalAC; // Estimate to Complete
        const vac = totalProjectBudget - eac; // Variance at Completion

        return { chartData, kpis: { cpi, spi, eac, etc, vac } };
    }, [wbsItems, transactions]);
    
     const cashflowData = useMemo(() => {
        const dataByMonth = new Map<string, { month: string; entradas: number; saidas: number; }>();
        const allDates = [
            ...transactions.map(t => t.date),
            ...clientInvoices.map(i => i.dueDate)
        ].filter(Boolean) as Date[];

        if (allDates.length === 0) return [];

        const projectStartDate = allDates.reduce((min, date) => (date < min ? date : min), allDates[0]);
        const projectEndDate = allDates.reduce((max, date) => (date > max ? date : max), allDates[0]);
        
        let currentDate = startOfMonth(projectStartDate);
        while (currentDate <= projectEndDate) {
            const monthKey = format(currentDate, 'yyyy-MM');
            dataByMonth.set(monthKey, { month: format(currentDate, 'MMM/yy', {locale: ptBR}), entradas: 0, saidas: 0 });
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        }

        transactions.forEach(t => {
            if (t.type === 'Despesa' && t.date) {
                const monthKey = format(t.date, 'yyyy-MM');
                if (dataByMonth.has(monthKey)) {
                    dataByMonth.get(monthKey)!.saidas += t.amount;
                }
            }
        });

        clientInvoices.forEach(i => {
            if (i.dueDate) {
                const monthKey = format(i.dueDate, 'yyyy-MM');
                if (dataByMonth.has(monthKey)) {
                    dataByMonth.get(monthKey)!.entradas += i.totalAmount;
                }
            }
        });
        
        let cumulativeBalance = 0;
        return Array.from(dataByMonth.values()).map(d => {
            cumulativeBalance += d.entradas - d.saidas;
            return {
                ...d,
                saldo: d.entradas - d.saidas,
                saldoAcumulado: cumulativeBalance,
            };
        });

    }, [transactions, clientInvoices]);

    const handleExport = () => {
        const dataToExport = earnedValueAnalysisData.chartData.map(item => ({
            'Data': item.date,
            'Custo Planeado (PV)': item.pv.toFixed(2),
            'Custo Real (AC)': item.ac.toFixed(2),
            'Valor Agregado (EV)': item.ev ? item.ev.toFixed(2) : 'N/A',
        }));

        const csv = unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `analise_valor_agregado_${projectId}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Exportação Iniciada', description: 'O seu ficheiro CSV será descarregado.' });
    };

    const chartConfigEva = {
        pv: { label: "Custo Planeado (PV)", color: "hsl(var(--secondary-foreground))" },
        ac: { label: "Custo Real (AC)", color: "hsl(var(--destructive))" },
        ev: { label: "Valor Agregado (EV)", color: "hsl(var(--primary))" },
    };

    const chartConfigCashflow = {
        entradas: { label: "Entradas", color: "hsl(var(--chart-1))" },
        saidas: { label: "Saídas", color: "hsl(var(--chart-2))" },
        saldoAcumulado: { label: "Saldo Acumulado", color: "hsl(var(--primary))"},
    }

    const KpiCard = ({ title, value, interpretation, tooltipText, isCurrency = false }: { title: string, value: string, interpretation: string, tooltipText: string, isCurrency?: boolean }) => {
        let badgeVariant: "default" | "secondary" | "destructive" = 'secondary';
        if (!isCurrency) {
            const valueNum = parseFloat(value);
            if (valueNum < 0.95) badgeVariant = 'destructive';
            if (valueNum > 1.05) badgeVariant = 'default';
        } else {
             if (parseFloat(value) < 0) badgeVariant = 'destructive';
        }

        return (
            <Card>
                <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-base font-medium flex items-center justify-between">
                        {title}
                        <TooltipProvider>
                            <UiTooltip>
                                <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">{tooltipText}</p>
                                </TooltipContent>
                            </UiTooltip>
                        </TooltipProvider>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex flex-col items-center justify-center">
                    <p className="text-2xl md:text-3xl font-bold font-mono">{value}</p>
                    <p className="text-sm text-muted-foreground mt-2 text-center">{interpretation}</p>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="p-4 space-y-6">
             <Card className="md:col-span-2">
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary"/> Curva S & Análise de Valor Agregado (EVA)</CardTitle>
                        <CardDescription>Acompanhe o desempenho do projeto e veja as previsões de custo e prazo.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={earnedValueAnalysisData.chartData.length === 0}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Exportar CSV
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard
                            title="IDC - Desempenho de Custo"
                            value={earnedValueAnalysisData.kpis.cpi.toFixed(2)}
                            interpretation={earnedValueAnalysisData.kpis.cpi < 1 ? "Acima do orçamento" : "Dentro do orçamento"}
                            tooltipText="Índice de Desempenho de Custo (EV/AC). >1 é bom, <1 é mau."
                        />
                        <KpiCard
                            title="IDP - Desempenho de Prazo"
                            value={earnedValueAnalysisData.kpis.spi.toFixed(2)}
                            interpretation={earnedValueAnalysisData.kpis.spi < 1 ? "Atrasado" : "Adiantado ou no prazo"}
                            tooltipText="Índice de Desempenho de Prazo (EV/PV). >1 é bom, <1 é mau."
                        />
                         <KpiCard
                            title="EAC - Custo Final Previsto"
                            value={formatCurrency(earnedValueAnalysisData.kpis.eac)}
                            interpretation="Previsão do custo total do projeto."
                            tooltipText="Estimativa no Final (Orçamento / IDC). Mostra o custo total provável se a tendência atual continuar."
                            isCurrency={true}
                        />
                        <KpiCard
                            title="VAC - Variação Final"
                            value={formatCurrency(earnedValueAnalysisData.kpis.vac)}
                            interpretation={earnedValueAnalysisData.kpis.vac < 0 ? "Prejuízo previsto" : "Lucro previsto"}
                            tooltipText="Variação no Final (Orçamento - EAC). Mostra o desvio final esperado em relação ao orçamento original."
                            isCurrency={true}
                        />
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center h-[250px]"><Loader2 className="animate-spin"/> Carregando gráfico...</div>
                    ) : (
                        <ChartContainer config={chartConfigEva} className="min-h-[300px] w-full">
                            <LineChart data={earnedValueAnalysisData.chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <XAxis dataKey="date" tickMargin={10}/>
                                <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} />
                                <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)}/>} />
                                <Legend />
                                <Line type="monotone" dataKey="pv" name="Planeado" stroke="var(--color-pv)" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="ac" name="Real" stroke="var(--color-ac)" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="ev" name="Agregado" stroke="var(--color-ev)" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><AreaChart className="h-5 w-5 text-primary"/> Fluxo de Caixa (Cash Flow)</CardTitle>
                    <CardDescription>Visualize as entradas e saídas de caixa previstas para o projeto ao longo do tempo.</CardDescription>
                </CardHeader>
                 <CardContent>
                     {loading ? (
                        <div className="flex items-center justify-center h-[250px]"><Loader2 className="animate-spin"/> Carregando gráfico...</div>
                    ) : cashflowData.length === 0 ? (
                        <div className="text-center text-muted-foreground p-8 border rounded-lg">
                             <p>Nenhuma transação ou fatura registada para gerar o fluxo de caixa.</p>
                        </div>
                    ) : (
                         <ChartContainer config={chartConfigCashflow} className="min-h-[300px] w-full">
                            <RechartsBarChart data={cashflowData}>
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} />
                                <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)}/>} />
                                <Legend />
                                <Bar dataKey="entradas" fill="var(--color-entradas)" radius={4} name="Entradas" />
                                <Bar dataKey="saidas" fill="var(--color-saidas)" radius={4} name="Saídas" />
                                <Line type="monotone" dataKey="saldoAcumulado" stroke="var(--color-saldoAcumulado)" strokeWidth={3} dot={false} />
                            </RechartsBarChart>
                        </ChartContainer>
                    )}
                 </CardContent>
            </Card>
        </div>
    );
}
