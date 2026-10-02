'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Diamond, Scale, BarChart, Download, Calendar, Mountain, Layers, Gauge, ShieldCheck, FileText } from 'lucide-react';
import { ProductionLog, Concession, Lot } from '@/types/mining';
import { Project } from '@/types/project';
import { format, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from 'date-fns';
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { generateMonthlyProductionReport } from '@/lib/mining-report-generator';
import { cn } from '@/lib/utils';

interface MiningDashboardTabProps {
    projectId: string;
    project: Project | null;
}

const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-AO').format(value);
};

export default function MiningDashboardTab({ projectId, project }: MiningDashboardTabProps) {
    const { toast } = useToast();
    const [logs, setLogs] = useState<ProductionLog[]>([]);
    const [concessions, setConcessions] = useState<Concession[]>([]);
    const [lots, setLots] = useState<Lot[]>([]);
    const [loading, setLoading] = useState(true);
    const [reportMonth, setReportMonth] = useState<Date>(new Date());
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        let logsLoaded = false;
        let concessionsLoaded = false;
        let lotsLoaded = false;

        const checkLoadingDone = () => {
            if (logsLoaded && concessionsLoaded && lotsLoaded) setLoading(false);
        };

        const logsQuery = query(collection(db, 'projects', projectId, 'production-logs'), orderBy('date', 'desc'));
        const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
            setLogs(snapshot.docs.map(doc => ({ 
                ...doc.data(), 
                id: doc.id,
                date: (doc.data().date as Timestamp)?.toDate ? (doc.data().date as Timestamp).toDate() : new Date(doc.data().date) 
            } as ProductionLog)));
            logsLoaded = true;
            checkLoadingDone();
        }, (error) => {
            console.error("Error fetching production logs:", error);
            logsLoaded = true;
            checkLoadingDone();
        });

        const concessionsQuery = query(collection(db, 'projects', projectId, 'concessions'));
        const unsubConcessions = onSnapshot(concessionsQuery, (snapshot) => {
            setConcessions(snapshot.docs.map(doc => ({ 
                ...doc.data(), 
                id: doc.id,
                validityEnd: (doc.data().validityEnd as Timestamp)?.toDate ? (doc.data().validityEnd as Timestamp).toDate() : new Date(doc.data().validityEnd) 
            } as Concession)));
            concessionsLoaded = true;
            checkLoadingDone();
        }, (error) => {
            console.error("Error fetching concessions:", error);
            concessionsLoaded = true;
            checkLoadingDone();
        });

        const lotsQuery = query(collection(db, 'projects', projectId, 'lots'));
        const unsubLots = onSnapshot(lotsQuery, (snapshot) => {
            setLots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lot)));
            lotsLoaded = true;
            checkLoadingDone();
        }, (error) => {
            console.error("Error fetching lots:", error);
            lotsLoaded = true;
            checkLoadingDone();
        });

        return () => {
            unsubLogs();
            unsubConcessions();
            unsubLots();
        };
    }, [projectId]);

    const kpiData = useMemo(() => {
        const today = new Date();
        const start = startOfMonth(today);
        const end = endOfMonth(today);

        const thisMonthLogs = logs.filter(log => isWithinInterval(log.date, { start, end }));
        const thisMonthTonnage = thisMonthLogs.reduce((sum, log) => sum + log.tonnage, 0);

        let totalOre = 0;
        let totalWaste = 0;
        logs.forEach(log => {
            const isWaste = log.materialType === 'Estéril' || log.material.toLowerCase().includes('estéril');
            if (isWaste) totalWaste += log.tonnage;
            else totalOre += log.tonnage;
        });

        const remRatio = totalOre > 0 ? totalWaste / totalOre : 0;
        const activeConcessions = concessions.filter(c => c.legalStatus === 'Ativa').length;
        const totalAreaKm2 = concessions.reduce((sum, c) => sum + (c.area || 0), 0);

        const upcomingExpiries = concessions
            .filter(c => c.validityEnd > today)
            .sort((a, b) => a.validityEnd.getTime() - b.validityEnd.getTime());

        const nextToExpire = upcomingExpiries.length > 0 ? upcomingExpiries[0] : null;
        const daysUntilNextExpiry = nextToExpire ? differenceInDays(nextToExpire.validityEnd, today) : null;

        const kpLotsCount = lots.filter(l => Boolean(l.kimberleyProcessId)).length;

        return {
            thisMonthTonnage,
            totalOre,
            totalWaste,
            remRatio,
            activeConcessions,
            totalAreaKm2,
            recentLogCount: logs.length,
            nextToExpire,
            daysUntilNextExpiry,
            kpLotsCount,
        };
    }, [logs, concessions, lots]);

    const dailyProductionData = useMemo(() => {
        const dataMap = new Map<string, number>();
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return format(d, 'dd/MM');
        }).reverse();

        last30Days.forEach(day => dataMap.set(day, 0));

        logs.forEach(log => {
            const dayKey = format(log.date, 'dd/MM');
            if (dataMap.has(dayKey)) {
                dataMap.set(dayKey, dataMap.get(dayKey)! + log.tonnage);
            }
        });

        return Array.from(dataMap.entries()).map(([date, tonnage]) => ({ date, tonnage }));
    }, [logs]);
    
    const getStatusVariant = (status: Concession['legalStatus']) => {
        switch (status) {
            case 'Ativa': return 'default';
            case 'Em Renovação':
            case 'Pendente':
                return 'secondary';
            case 'Expirada': return 'destructive';
            default: return 'outline';
        }
    };
    
    const handleGenerateReport = async () => {
        if (!project) {
            toast({ title: 'Erro', description: 'Dados do projeto não estão disponíveis.', variant: 'destructive'});
            return;
        }

        setIsGeneratingReport(true);
        toast({ title: 'A gerar relatório de lavra...', description: 'Consolidando balanço de massas e turnos.'});

        const period = {
            start: startOfMonth(reportMonth),
            end: endOfMonth(reportMonth),
        };
        
        const logsForPeriod = logs.filter(log => isWithinInterval(log.date, period));

        if (logsForPeriod.length === 0) {
            toast({ title: 'Sem Dados', description: 'Não há registos de produção para o mês selecionado.', variant: 'destructive'});
            setIsGeneratingReport(false);
            return;
        }

        try {
            await generateMonthlyProductionReport(project, logsForPeriod, period);
        } catch (error) {
            console.error("Error generating report:", error);
            toast({ title: 'Erro ao gerar relatório', variant: 'destructive'});
        } finally {
            setIsGeneratingReport(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
                <Loader2 className="animate-spin h-6 w-6 text-primary" /> Carregando visão geral da mina...
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-4">
            {/* Top Cards with Mining Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Produção (Mês Atual)</CardTitle>
                        <Scale className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatNumber(kpiData.thisMonthTonnage)} <span className="text-sm font-normal text-muted-foreground">t</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Total movimentado na mina</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Rácio REM Global</CardTitle>
                        <Gauge className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{kpiData.remRatio.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">: 1</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Estéril decapado vs. Minério útil</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Concessões Ativas</CardTitle>
                        <Diamond className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{kpiData.activeConcessions}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatNumber(kpiData.totalAreaKm2)} km² titulados</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Processo de Kimberley</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{kpiData.kpLotsCount}</p>
                        <p className="text-xs text-muted-foreground mt-1">Lotes com certificado KPCS</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Próxima Validade</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {kpiData.nextToExpire ? (
                            <>
                                <p className={cn("text-xl font-bold", (kpiData.daysUntilNextExpiry ?? 0) <= 90 ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                                    {kpiData.daysUntilNextExpiry} dias
                                </p>
                                <p className="text-xs text-muted-foreground truncate" title={kpiData.nextToExpire.name}>
                                    {kpiData.nextToExpire.name}
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhuma concessão em alerta.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            {/* Daily Production Chart */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <BarChart className="h-4 w-4 text-primary" /> Histórico de Produção Diária (Últimos 30 Dias)
                    </CardTitle>
                    <CardDescription>
                        Monitorização de extração contínua da mina dia a dia em toneladas (t).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{ tonnage: { label: "Tonelagem", color: "hsl(var(--chart-1))" } }} className="h-72 w-full">
                        <RechartsBarChart data={dailyProductionData}>
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                            <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => `${formatNumber(value as number)} t`}/>} />
                            <Bar dataKey="tonnage" fill="var(--color-tonnage)" radius={4} />
                        </RechartsBarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Logs Table */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Mountain className="h-4 w-4 text-primary" /> Apontamentos de Lavra Recentes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">Data</TableHead>
                                    <TableHead className="text-xs">Material / Frente</TableHead>
                                    <TableHead className="text-xs">Tipo</TableHead>
                                    <TableHead className="text-right text-xs">Massa (t)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.slice(0, 5).map(log => {
                                    const isWaste = log.materialType === 'Estéril' || log.material.toLowerCase().includes('estéril');
                                    return (
                                        <TableRow key={log.id} className="hover:bg-muted/10">
                                            <TableCell className="text-xs font-mono">{format(log.date, 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>
                                                <span className="text-xs font-medium block">{log.material}</span>
                                                <span className="text-[11px] text-muted-foreground">{log.sourceLocation}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("text-[10px]", isWaste ? "text-amber-600 border-amber-300" : "text-emerald-600 border-emerald-300")}>
                                                    {isWaste ? 'Estéril' : 'Minério'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-xs">{formatNumber(log.tonnage)} t</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Concessions Status Table */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Diamond className="h-4 w-4 text-primary" /> Concessões & Títulos Mineiros
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">Concessão</TableHead>
                                    <TableHead className="text-xs">Província</TableHead>
                                    <TableHead className="text-xs">Validade</TableHead>
                                    <TableHead className="text-right text-xs">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {concessions.slice(0, 5).map(c => (
                                    <TableRow key={c.id} className="hover:bg-muted/10">
                                        <TableCell>
                                            <span className="text-xs font-medium block">{c.name}</span>
                                            <span className="text-[11px] text-muted-foreground font-mono">{c.licenseNumber || c.holder}</span>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{c.province}</TableCell>
                                        <TableCell className="text-xs font-mono text-muted-foreground">{format(c.validityEnd, 'dd/MM/yyyy')}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={getStatusVariant(c.legalStatus)} className="text-[10px]">{c.legalStatus}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            
            {/* Monthly Report Generation */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" /> Relatório Executivo Mensal de Produção
                    </CardTitle>
                    <CardDescription>
                        Gere e exporte relatórios consolidados com balanço de massas (minério/estéril), horas de equipamento e custos operacionais em PDF.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-end gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Mês de Referência do Relatório</Label>
                        <DatePicker date={reportMonth} setDate={(date) => date && setReportMonth(date)} />
                    </div>
                    <Button onClick={handleGenerateReport} disabled={isGeneratingReport} className="shadow-sm">
                        {isGeneratingReport ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Download className="mr-2 h-4 w-4"/>}
                        Exportar Relatório Mensal
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
