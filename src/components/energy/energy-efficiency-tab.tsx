'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Activity, 
    Zap, 
    Gauge, 
    DollarSign, 
    Fuel, 
    TrendingUp, 
    Layers, 
    BarChart3, 
    Cpu 
} from 'lucide-react';
import { 
    Bar, 
    BarChart as RechartsBarChart, 
    XAxis, 
    YAxis, 
    ResponsiveContainer, 
    Tooltip, 
    CartesianGrid, 
    Cell, 
    Legend, 
    Line, 
    ComposedChart 
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { EnergyProductionLog } from '@/types/energy';
import type { Equipment } from '@/types/equipment';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EnergyEfficiencyTabProps {
    logs: EnergyProductionLog[];
    equipment: Equipment[];
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

export default function EnergyEfficiencyTab({ logs, equipment }: EnergyEfficiencyTabProps) {

    // Detailed asset performance analysis
    const assetPerformance = useMemo(() => {
        const statsMap = new Map<string, {
            id: string;
            name: string;
            type: string;
            totalProduction: number;
            totalOpHours: number;
            totalDowntime: number;
            totalFuel: number;
            totalCost: number;
            logCount: number;
        }>();

        equipment.forEach(eq => {
            statsMap.set(eq.id, {
                id: eq.id,
                name: eq.name,
                type: eq.category || 'Energia',
                totalProduction: 0,
                totalOpHours: 0,
                totalDowntime: 0,
                totalFuel: 0,
                totalCost: 0,
                logCount: 0,
            });
        });

        logs.forEach(log => {
            const assetKey = log.assetId;
            const current = statsMap.get(assetKey) || {
                id: assetKey,
                name: log.assetName,
                type: log.assetType || 'Energia',
                totalProduction: 0,
                totalOpHours: 0,
                totalDowntime: 0,
                totalFuel: 0,
                totalCost: 0,
                logCount: 0,
            };

            current.totalProduction += log.productionKWh;
            current.totalOpHours += log.operationalHours;
            current.totalDowntime += log.downtimeHours || 0;
            current.totalFuel += log.fuelConsumedLiters || 0;
            current.totalCost += log.costAOA || 0;
            current.logCount += 1;

            statsMap.set(assetKey, current);
        });

        return Array.from(statsMap.values()).map(item => {
            const efficiency = item.totalOpHours > 0 ? item.totalProduction / item.totalOpHours : 0;
            const totalHours = item.totalOpHours + item.totalDowntime;
            const availability = totalHours > 0 ? (item.totalOpHours / totalHours) * 100 : 100;
            const costPerKWh = item.totalProduction > 0 ? item.totalCost / item.totalProduction : 0;
            const fuelPerKWh = item.totalProduction > 0 && item.totalFuel > 0 ? item.totalFuel / item.totalProduction : 0;

            return {
                ...item,
                efficiency,
                availability,
                costPerKWh,
                fuelPerKWh,
            };
        }).sort((a, b) => b.totalProduction - a.totalProduction);
    }, [logs, equipment]);

    // Comparison Chart Data (Efficiency & Cost per kWh)
    const chartData = useMemo(() => {
        return assetPerformance
            .filter(a => a.totalProduction > 0)
            .map(a => ({
                name: a.name.length > 18 ? `${a.name.slice(0, 16)}...` : a.name,
                eficiencia: Number(a.efficiency.toFixed(1)),
                custoKWh: Math.round(a.costPerKWh),
            }));
    }, [assetPerformance]);

    // Top Level Summary Stats
    const summaryStats = useMemo(() => {
        const totalProduction = logs.reduce((sum, l) => sum + l.productionKWh, 0);
        const totalOpHours = logs.reduce((sum, l) => sum + l.operationalHours, 0);
        const avgGlobalEfficiency = totalOpHours > 0 ? totalProduction / totalOpHours : 0;

        const totalCost = logs.reduce((sum, l) => sum + (l.costAOA || 0), 0);
        const globalCostPerKWh = totalProduction > 0 ? totalCost / totalProduction : 0;

        const totalFuel = logs.reduce((sum, l) => sum + (l.fuelConsumedLiters || 0), 0);
        const dieselKWh = logs.filter(l => (l.fuelConsumedLiters || 0) > 0).reduce((sum, l) => sum + l.productionKWh, 0);
        const avgLitersPerKWh = dieselKWh > 0 ? totalFuel / dieselKWh : 0;

        return {
            avgGlobalEfficiency,
            globalCostPerKWh,
            totalFuel,
            avgLitersPerKWh,
        };
    }, [logs]);

    return (
        <div className="space-y-6">
            {/* Top Efficiency KPI Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Eficiência Global da Central
                        </CardTitle>
                        <Activity className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatNumber(summaryStats.avgGlobalEfficiency, 1)} <span className="text-sm font-normal text-muted-foreground">kWh/h</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Rendimento específico médio em carga
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Custo Médio Unitário (LCOE)
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatCurrency(summaryStats.globalCostPerKWh)} <span className="text-sm font-normal text-muted-foreground">/ kWh</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Custo operacional por unidade gerada
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Consumo de Combustível (Diesel)
                        </CardTitle>
                        <Fuel className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatNumber(summaryStats.totalFuel)} <span className="text-sm font-normal text-muted-foreground">L</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Consumo específico: {formatNumber(summaryStats.avgLitersPerKWh, 3)} L/kWh
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Ativos Monitorizados
                        </CardTitle>
                        <Cpu className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {assetPerformance.length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {assetPerformance.filter(a => a.totalProduction > 0).length} ativos em produção ativa
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Comparison Chart */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" /> Eficiência (kWh/h) vs. Custo Unitário (Kz/kWh)
                    </CardTitle>
                    <CardDescription>
                        Comparação direta de produtividade energética e viabilidade económica de cada ativo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {chartData.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-xs">
                            Sem dados suficientes de produção para gerar o gráfico comparativo.
                        </div>
                    ) : (
                        <ChartContainer config={{ 
                            eficiencia: { label: 'Eficiência (kWh/h)', color: 'hsl(var(--chart-1))' },
                            custoKWh: { label: 'Custo por kWh (AOA)', color: 'hsl(var(--chart-2))' }
                        }} className="h-80 w-full">
                            <ComposedChart data={chartData}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                <YAxis yAxisId="left" orientation="left" stroke="var(--color-eficiencia)" tickFormatter={(v) => `${v}`} />
                                <YAxis yAxisId="right" orientation="right" stroke="var(--color-custoKWh)" tickFormatter={(v) => `${v} Kz`} />
                                <Tooltip content={<ChartTooltipContent formatter={(value, name) => name === 'eficiencia' ? `${formatNumber(value as number, 1)} kWh/h` : `${formatCurrency(value as number)}/kWh`} />} />
                                <Legend />
                                <Bar dataKey="eficiencia" fill="var(--color-eficiencia)" radius={4} yAxisId="left" />
                                <Line type="monotone" dataKey="custoKWh" stroke="var(--color-custoKWh)" strokeWidth={2.5} yAxisId="right" dot />
                            </ComposedChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>

            {/* Comprehensive Table */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" /> Balanço Analítico de Eficiência & Ativos
                    </CardTitle>
                    <CardDescription>
                        Quadro comparativo de disponibilidade técnica, horas operadas, paragens, consumos e custos operacionais por ativo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="text-xs font-semibold">Ativo Energético</TableHead>
                                    <TableHead className="text-xs font-semibold text-right">Geração (kWh)</TableHead>
                                    <TableHead className="text-xs font-semibold text-right">Horas Operadas</TableHead>
                                    <TableHead className="text-xs font-semibold text-right">Paragens</TableHead>
                                    <TableHead className="text-xs font-semibold text-right">Disponibilidade</TableHead>
                                    <TableHead className="text-xs font-semibold text-right">Eficiência Média</TableHead>
                                    <TableHead className="text-xs font-semibold text-right">Combustível</TableHead>
                                    <TableHead className="text-xs font-semibold text-right">Custo / kWh</TableHead>
                                    <TableHead className="text-xs font-semibold text-right">Custo Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assetPerformance.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground text-xs">
                                            Nenhum ativo registado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    assetPerformance.map(asset => (
                                        <TableRow key={asset.id} className="hover:bg-muted/10">
                                            <TableCell className="font-medium text-xs">
                                                <div>
                                                    <span className="font-semibold block">{asset.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">{asset.type}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-xs">
                                                {formatNumber(asset.totalProduction)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                {formatNumber(asset.totalOpHours, 1)}h
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                {formatNumber(asset.totalDowntime, 1)}h
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge 
                                                    variant="outline" 
                                                    className={cn(
                                                        "text-[10px]",
                                                        asset.availability >= 95 ? "text-emerald-600 border-emerald-300" :
                                                        asset.availability >= 85 ? "text-amber-600 border-amber-300" :
                                                        "text-destructive border-destructive/30"
                                                    )}
                                                >
                                                    {formatNumber(asset.availability, 1)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-semibold text-xs text-primary">
                                                {asset.efficiency > 0 ? `${formatNumber(asset.efficiency, 1)} kWh/h` : '---'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                {asset.totalFuel > 0 ? `${formatNumber(asset.totalFuel)} L` : '---'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-semibold">
                                                {asset.costPerKWh > 0 ? `${formatCurrency(asset.costPerKWh)}` : '---'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                {asset.totalCost > 0 ? formatCurrency(asset.totalCost) : '---'}
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
