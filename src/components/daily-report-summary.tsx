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
import { Progress } from './ui/progress';
import { format, subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { summarizeDailyReports } from '@/ai/flows/daily-report-summary-flow';
import { safeToIsoString, safeParseDate } from '@/lib/date-utils';
import { MarkdownViewer } from './markdown-viewer';
import { Button } from './ui/button';


interface ProjectDashboardTabProps {
    projectId: string;
    projectName: string;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '0,00 Kz';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

export default function ProjectDashboardTab({ projectId, projectName }: ProjectDashboardTabProps) {
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [projectProgress, setProjectProgress] = useState(0);
    const [loading, setLoading] = useState(true);

    const { toast } = useToast();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [summaryAI, setSummaryAI] = useState<string | null>(null);


    useEffect(() => {
        if (!projectId) return;
        setLoading(true);

        const unsubscribes = [
            onSnapshot(query(collection(db, 'projects', projectId, 'wbs')), snapshot => {
                setWbsItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WbsItem)));
            }),
            onSnapshot(query(collection(db, 'projects', projectId, 'transactions')), snapshot => {
                setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
            }),
            onSnapshot(query(collection(db, 'projects', projectId, 'annotations')), snapshot => {
                setAnnotations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Annotation)));
            }),
            onSnapshot(doc(db, 'projects', projectId), (doc) => {
                 setProjectProgress(doc.data()?.progress || 0);
            })
        ];

        Promise.all([
            new Promise(res => onSnapshot(query(collection(db, 'projects', projectId, 'wbs')), res)),
            new Promise(res => onSnapshot(query(collection(db, 'projects', projectId, 'transactions')), res)),
            new Promise(res => onSnapshot(query(collection(db, 'projects', projectId, 'annotations')), res)),
        ]).finally(() => setLoading(false));

        return () => unsubscribes.forEach(unsub => unsub());

    }, [projectId]);

    const summary = useMemo(() => {
        const totalBudget = wbsItems.reduce((acc, item) => acc + (item.budget || 0), 0);
        const totalCost = transactions.filter(t => t.type === 'Despesa').reduce((acc, item) => acc + item.amount, 0);
        const openAnnotations = annotations.filter(a => a.status === 'Aberta').length;
        const criticalAnnotations = annotations.filter(a => a.status === 'Aberta' && a.priority === 'Alta').length;

        const nextMilestones = wbsItems
            .filter(item => item.isMilestone && item.endDate && item.endDate > new Date())
            .sort((a, b) => a.endDate!.getTime() - b.endDate!.getTime())
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
        toast({ title: 'A gerar resumo...', description: 'O assistente de IA está a analisar os diários de obra da última semana.' });

        try {
            const oneWeekAgo = subDays(new Date(), 7);
            const reports: DailyReport[] = [];
            
            const q = query(
                collection(db, 'projects', projectId, 'daily-reports'),
                where('date', '>=', oneWeekAgo),
                orderBy('date', 'desc')
            );

            const unsubscribe = onSnapshot(q, async (snapshot) => {
                 snapshot.forEach(doc => {
                    const data = doc.data();
                    reports.push({
                        id: doc.id,
                        ...data,
                        date: (data.date as Timestamp).toDate(),
                    } as DailyReport);
                });
                unsubscribe(); // Unsubscribe after the first fetch

                if (reports.length === 0) {
                    toast({ title: 'Sem dados', description: 'Não foram encontrados diários de obra nos últimos 7 dias.', variant: 'destructive' });
                    setIsAnalyzing(false);
                    return;
                }
                
                // Serialize data for the AI flow
                const serializableReports = reports.map(r => ({
                    ...r,
                    date: safeToIsoString(r.date, new Date().toISOString()),
                }));
                
                const result = await summarizeDailyReports({ reports: serializableReports });
                if (result) {
                    const formattedMarkdown = [
                        '### Principais Destaques',
                        ...result.highlights.map(h => `- ${h}`),
                        '',
                        '### Efetivo Médio',
                        `- Média diária: **${result.workforce.average}** | Pico semanal: **${result.workforce.peak}**`,
                        result.workforce.notes ? `- ${result.workforce.notes}` : '',
                        '',
                        '### Bloqueios / Ocorrências',
                        ...(result.blockers.length > 0 ? result.blockers.map(b => `- [${b.date}] ${b.description}`) : ['- Nenhum bloqueio crítico registado.']),
                        '',
                        '### Perspetiva para a Próxima Semana',
                        result.nextWeekOutlook
                    ].filter(Boolean).join('\n');
                    setSummaryAI(formattedMarkdown);
                } else {
                    setSummaryAI('Não foi possível gerar o resumo para os relatórios selecionados.');
                }
                toast({ title: 'Resumo gerado com sucesso!' });
                setIsAnalyzing(false);

            }, (error) => {
                console.error("Error fetching reports for summary:", error);
                throw new Error("Falha ao buscar relatórios.");
            });

        } catch (error) {
            console.error("Error generating summary:", error);
            toast({ title: 'Erro ao gerar resumo', variant: 'destructive' });
            setIsAnalyzing(false);
        }
    };



    if (loading) {
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
                        <div className="text-2xl font-bold">{summary.openAnnotations}</div>
                        <p className="text-xs text-destructive">{summary.criticalAnnotations} críticas</p>
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
                        <div className="p-4 bg-secondary rounded-lg">
                           <MarkdownViewer markdownContent={summaryAI} />
                        </div>
                    )}
                     <Button onClick={handleGenerateSummary} disabled={isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="animate-spin mr-2"/> : <Wand2 className="mr-2"/>}
                        {isAnalyzing ? 'A analisar relatórios...' : 'Gerar Resumo da Semana com IA'}
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
                                        <Milestone className="h-5 w-5 text-primary"/>
                                        <p className="font-semibold">{milestone.name}</p>
                                    </div>
                                    <p className="font-mono text-sm">{milestone.endDate ? format(milestone.endDate, 'dd/MM/yyyy') : 'N/A'}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}