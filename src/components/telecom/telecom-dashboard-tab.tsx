'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    TowerControl, 
    Radio, 
    CheckCircle2, 
    Clock, 
    Layers, 
    MapPin, 
    TrendingUp, 
    Download, 
    Printer, 
    Signal, 
    Activity, 
    Building2 
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
import type { TelecomSite } from '@/types/telecom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TelecomDashboardTabProps {
    sites: TelecomSite[];
    onNavigateToTab?: (tab: string) => void;
}

const formatNumber = (value: number | undefined, decimals = 0) => {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return new Intl.NumberFormat('pt-AO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
};

export default function TelecomDashboardTab({ sites, onNavigateToTab }: TelecomDashboardTabProps) {

    // KPIs calculation
    const kpis = useMemo(() => {
        const totalSites = sites.length;
        const activeSites = sites.filter(s => s.status === 'Ativo').length;
        const inProgressSites = sites.filter(s => 
            s.status === 'Obra Civil' || 
            s.status === 'Instalação Telecom' || 
            s.status === 'Comissionamento' || 
            s.status === 'Site Acquisition'
        ).length;
        const plannedSites = sites.filter(s => s.status === 'Planeado').length;

        const rolloutCompletionRate = totalSites > 0 ? (activeSites / totalSites) * 100 : 0;
        
        let totalEquipments = 0;
        sites.forEach(s => {
            totalEquipments += s.equipments?.length || 0;
        });

        const provincesCount = new Set(sites.map(s => s.province)).size;

        return {
            totalSites,
            activeSites,
            inProgressSites,
            plannedSites,
            rolloutCompletionRate,
            totalEquipments,
            provincesCount,
        };
    }, [sites]);

    // Sites by Type Pie Chart Data
    const sitesByTypeData = useMemo(() => {
        const typeMap = new Map<string, number>();
        sites.forEach(s => {
            typeMap.set(s.type, (typeMap.get(s.type) || 0) + 1);
        });

        return Array.from(typeMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [sites]);

    // Sites by Province Bar Chart Data
    const sitesByProvinceData = useMemo(() => {
        const provMap = new Map<string, { total: number, active: number }>();
        sites.forEach(s => {
            const curr = provMap.get(s.province) || { total: 0, active: 0 };
            curr.total += 1;
            if (s.status === 'Ativo') curr.active += 1;
            provMap.set(s.province, curr);
        });

        return Array.from(provMap.entries())
            .map(([province, data]) => ({
                province,
                Total: data.total,
                Ativos: data.active,
            }))
            .sort((a, b) => b.Total - a.Total)
            .slice(0, 8); // Top 8 provinces
    }, [sites]);

    const handlePrintRolloutReport = () => {
        window.print();
    };

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
                            Rede de Sites & Torres
                        </CardTitle>
                        <TowerControl className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {kpis.totalSites}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Distribuídos em {kpis.provincesCount} províncias
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Sites On-Air (Ativos)
                        </CardTitle>
                        <Radio className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {kpis.activeSites} <span className="text-xs text-muted-foreground font-normal">/ {kpis.totalSites}</span>
                        </div>
                        <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                                <span>Progresso Geral do Rollout</span>
                                <span className="font-semibold text-foreground">{formatNumber(kpis.rolloutCompletionRate, 1)}%</span>
                            </div>
                            <Progress value={kpis.rolloutCompletionRate} className="h-1.5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Sites em Implantação
                        </CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {kpis.inProgressSites}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {kpis.plannedSites} sites adicionais planeados
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Ativos & Equipamentos RF/TX
                        </CardTitle>
                        <Signal className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {kpis.totalEquipments}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Antenas, RRUs, Micro-ondas e Energia
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts: Types & Geographic Spread */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribution by Site Type */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" /> Distribuição por Tipologia de Site
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Proporção entre torres Greenfield, rooftops urbanos, postes e small cells.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sitesByTypeData.length === 0 ? (
                            <div className="flex items-center justify-center h-60 text-xs text-muted-foreground">
                                Sem sites registados.
                            </div>
                        ) : (
                            <ChartContainer config={{}} className="h-60 w-full">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${value} sites`} />} />
                                        <Legend />
                                        <Pie data={sitesByTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                                            {sitesByTypeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Distribution by Province */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" /> Implantação por Província (Top Regiões)
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Volume total de sites vs. sites ativos com transmissão funcional (On-Air).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sitesByProvinceData.length === 0 ? (
                            <div className="flex items-center justify-center h-60 text-xs text-muted-foreground">
                                Sem dados geográficos registados.
                            </div>
                        ) : (
                            <ChartContainer config={{ 
                                Total: { label: 'Total Sites', color: 'hsl(var(--chart-1))' },
                                Ativos: { label: 'On-Air (Ativos)', color: 'hsl(var(--chart-2))' }
                            }} className="h-60 w-full">
                                <RechartsBarChart data={sitesByProvinceData}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="province" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                                    <YAxis tickLine={false} axisLine={false} fontSize={11} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Bar dataKey="Total" fill="var(--color-Total)" radius={4} />
                                    <Bar dataKey="Ativos" fill="var(--color-Ativos)" radius={4} />
                                </RechartsBarChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Summary Rollout Status Table & Report Export */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" /> Relatório Executivo de Rollout de Rede
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Acompanhamento do status de entrega de cada site de telecomunicações no projeto.
                        </CardDescription>
                    </div>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handlePrintRolloutReport}
                        className="h-8 text-xs shadow-sm"
                    >
                        <Printer className="mr-1.5 h-3.5 w-3.5 text-primary" /> Imprimir Relatório de Rollout
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="text-xs font-semibold">Site ID / Nome</TableHead>
                                    <TableHead className="text-xs font-semibold">Tipo</TableHead>
                                    <TableHead className="text-xs font-semibold">Província / Município</TableHead>
                                    <TableHead className="text-xs font-semibold">Operadora</TableHead>
                                    <TableHead className="text-xs font-semibold">Altura Torre</TableHead>
                                    <TableHead className="text-xs font-semibold">Avanço (%)</TableHead>
                                    <TableHead className="text-xs font-semibold text-right">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sites.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                                            Nenhum site registado no projeto de telecomunicações.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sites.slice(0, 10).map(site => (
                                        <TableRow key={site.id} className="hover:bg-muted/10">
                                            <TableCell className="font-medium text-xs">
                                                <div>
                                                    <span className="font-bold font-mono text-primary">{site.siteId}</span>
                                                    <span className="block text-foreground">{site.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {site.type}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {site.province} {site.municipality && `• ${site.municipality}`}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {site.operator || 'Partilhado'}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono">
                                                {site.towerHeightMeters ? `${site.towerHeightMeters}m` : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex items-center gap-2">
                                                    <Progress value={site.progressPercent || 0} className="w-16 h-1.5" />
                                                    <span className="font-mono text-[11px]">{site.progressPercent || 0}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge 
                                                    variant={
                                                        site.status === 'Ativo' ? 'default' : 
                                                        site.status === 'Planeado' ? 'secondary' : 
                                                        site.status === 'Desativado' ? 'destructive' : 'outline'
                                                    }
                                                    className={cn(
                                                        "text-[10px]",
                                                        site.status === 'Ativo' && "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    )}
                                                >
                                                    {site.status}
                                                </Badge>
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
