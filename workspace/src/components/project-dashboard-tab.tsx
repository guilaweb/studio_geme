'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc, type Timestamp, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wallet, ShoppingCart, Landmark, AlertTriangle, Milestone, Wand2 } from 'lucide-react';
import type { WbsItem } from '@/types/wbs';
import type { Transaction } from '@/types/finance';
import type { Annotation } from '@/app/projects/[id]/page';
import type { DailyReport } from '@/types/daily-reports';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { format, subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { summarizeDailyReports, type DailyReportSummaryOutput } from '@/ai/flows/daily-report-summary-flow';
import { MarkdownViewer } from '@/components/markdown-viewer';


interface ProjectDashboardTabProps {
    projectId: string;
    projectName: string;
    projectProgress: number;
    wbsItems: WbsItem[];
    transactions: Transaction[];
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '0,00 Kz';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

export default function ProjectDashboardTab({ projectId, projectName, projectProgress, wbsItems, transactions }: ProjectDashboardTabProps) {
    const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [summaryAI, setSummaryAI] = useState<DailyReportSummaryOutput | null>(null);


    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        let reportsLoaded = false;
        let annotationsLoaded = false;

        const checkLoadingDone = () => {
            if (reportsLoaded && annotationsLoaded) {
                setLoading(false);
            }
        };

        const reportsQuery = query(
            collection(db, 'projects', projectId, 'daily-reports'),
            where('date', '>=', subDays(new Date(), 7)),
            orderBy('date', 'desc')
        );
        const unsubReports = onSnapshot(reportsQuery, (snapshot) => {
            setDailyReports(snapshot.docs.map(d => ({...d.data(), id: d.id, date: (d.data().date as Timestamp).toDate()} as DailyReport)));
            reportsLoaded = true;
            checkLoadingDone();
        }, (error) => { 
            console.error("Error fetching reports:", error);
            reportsLoaded = true;
            checkLoadingDone();
        });

        const annotationsQuery = query(collection(db, 'projects', projectId, 'annotations'));
        const unsubAnnotations = onSnapshot(annotationsQuery, (snapshot) => {
            setAnnotations(snapshot.docs.map(d => ({id: d.id, ...d.data()}) as Annotation));
            annotationsLoaded = true;
            checkLoadingDone();
        }, (error) => {
            console.error("Error fetching annotations:", error);
            annotationsLoaded = true;
            checkLoadingDone();
        });

        return () => {
            unsubReports();
            unsubAnnotations();
        };
    }, [projectId]);
    
    const summary = useMemo(() => {
        if (!wbsItems || !transactions || !annotations) {
            return { totalBudget: 0, totalCost: 0, balance: 0, openAnnotations: 0, criticalAnnotations: 0, nextMilestones: [] };
        }
        const totalBudget = wbsItems.reduce((acc, item) => acc + (item.budget || 0), 0);
        const totalCost = transactions.filter(t => t.type === 'Despesa').reduce((acc, item) => acc + item.amount, 0);
        const openAnnotations = annotations.filter(a => a.status === 'Aberta').length;
        const criticalAnnotations = annotations.filter(a => a.status === 'Aberta' && a.priority === 'Alta').length;

        const nextMilestones = wbsItems
            .filter(item => item.isMilestone && item.endDate && new Date(item.endDate) > new Date())
            .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())
            .slice(0, 5);

        return {
            totalBudget,
            totalCost,
            balance: totalBudget - totalCost,
            openAnnotations,
            criticalAnnotations,
            nextMilestones,
        };
    }, [wbsItems, transactions, annotations]);
    
     const handleGenerateSummary = async () => {
        setIsAnalyzing(true);
        setSummaryAI(null);

        if (dailyReports.length === 0) {
            toast({ title: 'Sem dados', description: 'Não foram encontrados diários de obra nos últimos 7 dias para gerar o resumo.', variant: 'destructive' });
            setIsAnalyzing(false);
            return;
        }

        toast({ title: 'A gerar resumo...', description: 'O assistente de IA está a analisar os diários de obra da última semana.' });

        try {
            const serializableReports = dailyReports.map(r => ({
                ...r,
                date: r.date.toISOString(),
            }));
            
            const result = await summarizeDailyReports({ reports: serializableReports });
            setSummaryAI(result);
            toast({ title: 'Resumo gerado com sucesso!' });
        } catch (error: any) {
            console.error("Error generating summary:", error);
            toast({ title: 'Erro ao gerar resumo', description: error.message, variant: 'destructive' });
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    if (!wbsItems || !transactions) {
        return (
            <div className="p-4 space-y-6 flex justify-center items-center h-full">
                <Loader2 className="animate-spin h-8 w-8" />
            </div>
        );
    }
    
    return (
        <div className="p-4 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Orçamento Total</CardTitle>
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.totalBudget)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custo Real Total</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.totalCost)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${summary.balance < 0 ? 'text-destructive' : ''}`}>{formatCurrency(summary.balance)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pendências Abertas</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin"/> : summary.openAnnotations}</div>
                        <p className="text-xs text-destructive">{loading ? '...' : summary.criticalAnnotations} críticas</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Progresso Geral do Projeto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Progress value={projectProgress} />
                    <p className="text-right text-lg font-bold">{Math.round(projectProgress)}%</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Resumo Executivo da Semana</CardTitle>
                    <CardDescription>Obtenha um resumo rápido dos principais acontecimentos da última semana com base nos diários de obra.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {summaryAI && (
                        <div className="p-4 bg-secondary rounded-lg space-y-4 animate-in fade-in-50">
                            <div>
                                <h4 className="font-semibold mb-2">Destaques da Semana</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    {summaryAI.highlights.map((item, index) => (
                                        <li key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                <div>
                                    <h4 className="font-semibold mb-2">Mão de Obra</h4>
                                    <div className="text-sm">
                                        <p><strong>Média de trabalhadores:</strong> {summaryAI.workforce.average}</p>
                                        <p><strong>Pico de trabalhadores:</strong> {summaryAI.workforce.peak}</p>
                                        {summaryAI.workforce.notes && <p className="text-xs mt-1 italic text-muted-foreground">{summaryAI.workforce.notes}</p>}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Perspetiva para Próxima Semana</h4>
                                    <p className="text-sm italic text-muted-foreground">{summaryAI.nextWeekOutlook}</p>
                                </div>
                            </div>

                            {summaryAI.blockers && summaryAI.blockers.length > 0 && (
                                <div className="pt-4 border-t">
                                    <h4 className="font-semibold text-destructive mb-2">Atenção: Bloqueios e Ocorrências</h4>
                                    <div className="space-y-2">
                                        {summaryAI.blockers.map((item, index) => (
                                            <div key={index} className="flex items-start gap-2 p-2 bg-destructive/10 border-l-4 border-destructive rounded-r-md">
                                                <AlertTriangle className="h-4 w-4 text-destructive mt-1 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium">{item.description}</p>
                                                    <p className="text-xs text-muted-foreground">{format(new Date(item.date), 'dd/MM/yyyy')}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                     <Button onClick={handleGenerateSummary} disabled={isAnalyzing || loading}>
                        {isAnalyzing || loading ? <Loader2 className="animate-spin mr-2"/> : <Wand2 className="mr-2"/>}
                        {isAnalyzing ? 'A analisar relatórios...' : loading ? 'A carregar dados...' : 'Gerar Resumo da Semana com IA'}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Próximos Marcos</CardTitle>
                    <CardDescription>As próximas datas importantes do cronograma do projeto.</CardDescription>
                </CardHeader>
                <CardContent>
                    {summary.nextMilestones.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center p-4">Nenhum marco futuro definido na EAP.</p>
                    ) : (
                        <ul className="space-y-3">
                            {summary.nextMilestones.map(milestone => (
                                <li key={milestone.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                                    <div className="flex items-center gap-3">
                                        <div className="h-5 w-5 text-primary"><Milestone /></div>
                                        <p className="font-semibold">{milestone.name}</p>
                                    </div>
                                    <p className="font-mono text-sm">{milestone.endDate ? format(new Date(milestone.endDate), 'dd/MM/yyyy') : 'N/A'}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
