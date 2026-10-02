'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Zap, 
    BarChart3, 
    Clock, 
    DollarSign, 
    Gauge, 
    AlertTriangle, 
    Leaf, 
    Activity, 
    CheckCircle2, 
    TrendingUp, 
    Wrench 
} from 'lucide-react';
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
    CartesianGrid 
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { format, subDays, differenceInDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EnergyProductionLog, EnergyMaintenancePlan } from '@/types/energy';
import type { Equipment } from '@/types/equipment';
import type { Transaction } from '@/types/finance';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface EnergyDashboardTabProps {
    logs: EnergyProductionLog[];
    equipment: Equipment[];
    transactions: Transaction[];
    maintenancePlans: EnergyMaintenancePlan[];
    onNavigateToTab?: (tab: string) => void;
}

const formatNumber = (value: number | undefined, decimals = 0) => {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return new Intl.NumberFormat('pt-AO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
};

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number' || isNaN(value)) return 'Kz 0';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
        maximumFractionDigits: 0,
    }).format(value);
};

export default function EnergyDashboardTab({ 
    logs, 
    equipment, 
    transactions, 
    maintenancePlans,
    onNavigateToTab 
}: EnergyDashboardTabProps) {

    // KPIs calculation
    const kpis = useMemo(() => {
        const start = startOfMonth(new Date());
        const end = endOfMonth(new Date());
        
        const thisMonthLogs = logs.filter(log => isWithinInterval(log.date, { start, end }));
        const thisMonthTransactions = transactions.filter(t => t.date && isWithinInterval((t.date as any).toDate ? (t.date as any).toDate() : new Date(t.date as any), { start, end }));

        const totalProductionKWh = thisMonthLogs.reduce((sum, log) => sum + log.productionKWh, 0);
        const totalOpHours = thisMonthLogs.reduce((sum, log) => sum + log.operationalHours, 0);
        const totalDowntimeHours = thisMonthLogs.reduce((sum, log) => sum + (log.downtimeHours || 0), 0);

        const totalHoursPeriod = totalOpHours + totalDowntimeHours;
        const technicalAvailability = totalHoursPeriod > 0 ? (totalOpHours / totalHoursPeriod) * 100 : 100;
        const avgEfficiency = totalOpHours > 0 ? totalProductionKWh / totalOpHours : 0;

        const totalCost = thisMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
        const costPerKWh = totalProductionKWh > 0 ? totalCost / totalProductionKWh : 0;

        // CO2 avoided (approx 0.45 kg/kWh for solar/hydro vs diesel)
        const renewableKWh = thisMonthLogs
            .filter(l => l.assetType === 'Solar Fotovoltaico' || l.assetType === 'Hídrico / PCH' || l.assetType === 'Eólico')
            .reduce((sum, l) => sum + l.productionKWh, 0);
        const co2AvoidedTons = (renewableKWh * 0.45) / 1000;

        // Pending and Overdue maintenance
        const pendingMaintenance = maintenancePlans.filter(p => p.status === 'Pendente' || p.status === 'Programada').length;
        const overdueMaintenance = maintenancePlans.filter(p => p.status === 'Atrasada').length;

        return {
            totalProductionKWh,
            totalOpHours,
            totalDowntimeHours,
            technicalAvailability,
            avgEfficiency,
            totalCost,
            costPerKWh,
            co2AvoidedTons,
            pendingMaintenance,
            overdueMaintenance,
        };
    }, [logs, transactions, maintenancePlans]);

    // Daily production chart for last 30 days
    const dailyChartData = useMemo(() => {
        const dataMap = new Map<string, { production: number, opHours: number, downtime: number }>();
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const d = subDays(new Date(), i);
            return format(d, 'dd/MM');
        }).reverse();

        last30Days.forEach(day => dataMap.set(day, { production: 0, opHours: 0, downtime: 0 }));

        logs.forEach(log => {
            if (differenceInDays(new Date(), log.date) < 30) {
                const dayKey = format(log.date, 'dd/MM');
                if (dataMap.has(dayKey)) {
                    const curr = dataMap.get(dayKey)!;
                    curr.production += log.productionKWh;
                    curr.opHours += log.operationalHours;
                    curr.downtime += log.downtimeHours || 0;
                }
            }
        });

        return Array.from(dataMap.entries()).map(([date, val]) => ({
            date,
            production: Math.round(val.production),
            opHours: Number(val.opHours.toFixed(1)),
            downtime: Number(val.downtime.toFixed(1)),
        }));
    }, [logs]);

    // Downtime reasons chart
    const downtimeReasonsData = useMemo(() => {
        const reasonMap = new Map<string, number>();
        logs.forEach(log => {
            if (log.downtimeHours && log.downtimeHours > 0) {
                const reason = log.downtimeReason || 'Outro / Não especificado';
                reasonMap.set(reason, (reasonMap.get(reason) || 0) + log.downtimeHours);
            }
        });

        return Array.from(reasonMap.entries())
            .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }))
            .sort((a, b) => b.value - a.value);
    }, [logs]);

    // Asset status list
    const assetStatusList = useMemo(() => {
        return equipment.map(eq => {
            const eqLogs = logs.filter(l => l.assetId === eq.id || (eq as any).equipmentId === l.assetId);
            const totalProd = eqLogs.reduce((s, l) => s + l.productionKWh, 0);
            const totalHours = eqLogs.reduce((s, l) => s + l.operationalHours, 0);
            const efficiency = totalHours > 0 ? totalProd / totalHours : 0;
            const lastLog = eqLogs.length > 0 ? eqLogs[0] : null;

            return {
                id: eq.id,
                name: eq.name,
                category: eq.category,
                status: eq.status || 'Disponível',
                totalProd,
                totalHours,
                efficiency,
                lastProductionDate: lastLog?.date,
            };
        });
    }, [equipment, logs]);

    const PIE_COLORS = [
        "hsl(var(--chart-1))", 
        "hsl(var(--chart-2))", 
        "hsl(var(--chart-3))", 
        "hsl(var(--chart-4))", 
        "hsl(var(--chart-5))"
    ];

    return (
        <div className="space-y-6">
            {/* Top KPI Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Produção de Energia (Mês)
                        </CardTitle>
                        <Zap className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {kpis.totalProductionKWh >= 1000000 
                                ? `${formatNumber(kpis.totalProductionKWh / 1000000, 2)} GWh`
                                : kpis.totalProductionKWh >= 1000 
                                ? `${formatNumber(kpis.totalProductionKWh / 1000, 2)} MWh`
                                : `${formatNumber(kpis.totalProductionKWh)} kWh`}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                            {formatNumber(kpis.totalProductionKWh)} kWh gerados no período
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Disponibilidade Técnica
                        </CardTitle>
                        <Gauge className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatNumber(kpis.technicalAvailability, 1)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {formatNumber(kpis.totalOpHours, 1)}h operadas | {formatNumber(kpis.totalDowntimeHours, 1)}h paragem
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Eficiência Média
                        </CardTitle>
                        <Activity className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatNumber(kpis.avgEfficiency, 1)} <span className="text-sm font-normal text-muted-foreground">kWh/h</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Custo Médio: <span className="font-semibold text-foreground">{formatCurrency(kpis.costPerKWh)}/kWh</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Custos & Sustentabilidade
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatCurrency(kpis.totalCost)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Leaf className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            {formatNumber(kpis.co2AvoidedTons, 2)} t CO₂ eq evitadas
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Alert banner for maintenance if needed */}
            {(kpis.overdueMaintenance > 0 || kpis.pendingMaintenance > 0) && (
                <div className="flex items-center justify-between p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                            Existem <strong>{kpis.pendingMaintenance}</strong> intervenções de manutenção programadas 
                            {kpis.overdueMaintenance > 0 && <span className="text-destructive font-bold"> ({kpis.overdueMaintenance} em atraso)</span>}.
                        </span>
                    </div>
                    {onNavigateToTab && (
                        <button 
                            onClick={() => onNavigateToTab('maintenance')}
                            className="text-primary hover:underline font-semibold flex items-center gap-1"
                        >
                            Ver Planeamento <Wrench className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            )}

            {/* Daily Generation Trend Chart */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" /> Produção Diária de Energia (Últimos 30 Dias)
                    </CardTitle>
                    <CardDescription>
                        Monitorização da geração diária agregada de todos os ativos energéticos do projeto em kWh.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{ production: { label: 'Produção (kWh)', color: 'hsl(var(--chart-1))' } }} className="h-72 w-full">
                        <RechartsBarChart data={dailyChartData}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                            <YAxis tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`} />
                            <Tooltip content={<ChartTooltipContent formatter={(value) => `${formatNumber(value as number)} kWh`} />} />
                            <Bar dataKey="production" fill="var(--color-production)" radius={4} />
                        </RechartsBarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Downtime Reasons Pie Chart */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" /> Análise de Indisponibilidade & Paragens
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Distribuição das horas de paragem por causa raiz identificada.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {downtimeReasonsData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-56 text-muted-foreground text-xs gap-1">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-80" />
                                <p className="font-semibold text-foreground">Sem paragens registadas</p>
                                <p>Os ativos operaram com 100% de disponibilidade contínua.</p>
                            </div>
                        ) : (
                            <ChartContainer config={{}} className="h-60 w-full">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${formatNumber(value as number, 1)} horas`} />} />
                                        <Legend />
                                        <Pie data={downtimeReasonsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                                            {downtimeReasonsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Status of Energy Assets */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" /> Estado dos Ativos de Geração
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Visão consolidada dos equipamentos de energia afetos ao projeto.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-x-auto max-h-60 overflow-y-auto">
                            <Table>
                                <TableHeader className="bg-muted/50 sticky top-0">
                                    <TableRow>
                                        <TableHead className="text-xs font-semibold">Ativo</TableHead>
                                        <TableHead className="text-xs font-semibold">Estado</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">Produção Acumulada</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">Eficiência</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assetStatusList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-20 text-center text-muted-foreground text-xs">
                                                Nenhum ativo de energia registado no projeto.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        assetStatusList.map(asset => (
                                            <TableRow key={asset.id} className="hover:bg-muted/10">
                                                <TableCell className="font-medium text-xs">
                                                    <div>
                                                        <span className="font-semibold block">{asset.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">{asset.category}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge 
                                                        variant={asset.status === 'Disponível' || asset.status === 'Em Uso' ? 'default' : 'secondary'}
                                                        className="text-[10px]"
                                                    >
                                                        {asset.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    {formatNumber(asset.totalProd)} kWh
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs text-primary font-semibold">
                                                    {asset.efficiency > 0 ? `${formatNumber(asset.efficiency, 1)} kWh/h` : '---'}
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
        </div>
    );
}
