
'use client';

import { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { format, startOfMonth } from 'date-fns';
import Papa from 'papaparse';

import { Header } from '@/components/Header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { ArrowLeft, Building, HelpCircle, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/types/finance';
import { type Project } from '@/types/project';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AccountingIntegrationPage() {
    const { user: adminUser, loading: authLoading } = useRequireAuth(['super-admin']);
    const router = useRouter();
    const { toast } = useToast();
    
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: new Date(),
    });
    const [isExporting, setIsExporting] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

    useEffect(() => {
        const projectsQuery = query(collection(db, 'projects'));
        const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
            const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            setProjects(fetchedProjects);
        });
        return () => unsubscribe();
    }, []);

    if (authLoading || !adminUser) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex flex-1 items-center justify-center">
                    <p>Carregando...</p>
                </main>
            </div>
        );
    }
    
    const handleExport = async () => {
        setIsExporting(true);
        toast({ title: 'A preparar a exportação...', description: 'A recolher transações.' });
        
        try {
            let transactionsQuery;
            if (selectedProjectId === 'all') {
                transactionsQuery = query(
                    collectionGroup(db, 'transactions'),
                    where('date', '>=', dateRange.from),
                    where('date', '<=', dateRange.to)
                );
            } else {
                 transactionsQuery = query(
                    collection(db, 'projects', selectedProjectId, 'transactions'),
                    where('date', '>=', dateRange.from),
                    where('date', '<=', dateRange.to)
                );
            }
            
            const querySnapshot = await getDocs(transactionsQuery);
            if (querySnapshot.empty) {
                toast({ title: 'Nenhum dado encontrado', description: 'Não existem transações no período e projeto selecionados.', variant: 'destructive' });
                setIsExporting(false);
                return;
            }
            
            const projectMap = new Map(projects.map(p => [p.id, p.name]));

            const transactions = querySnapshot.docs.map(doc => {
                const data = doc.data() as Transaction;
                const projectId = selectedProjectId === 'all' ? doc.ref.parent.parent?.id : selectedProjectId;
                const projectName = projectId ? projectMap.get(projectId) || projectId : 'N/A';

                return {
                    Data: data.date ? format((data.date as any).toDate(), 'yyyy-MM-dd') : 'N/A',
                    Projeto: projectName,
                    Descricao: data.description,
                    Tipo: data.type,
                    Valor: data.amount,
                    Estado: data.status,
                    Conta: data.accountName,
                    RubricaEAP: data.wbsItemName,
                };
            });
            
            const csv = Papa.unparse(transactions);
            const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `export_contabilidade_${format(new Date(), 'yyyyMMdd')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast({ title: 'Exportação concluída!', description: 'O seu ficheiro CSV foi descarregado.' });

        } catch (error) {
            console.error("Error exporting transactions: ", error);
            toast({ title: 'Erro na Exportação', description: 'Não foi possível exportar os dados.', variant: 'destructive' });
        } finally {
            setIsExporting(false);
        }
    };


    return (
        <div className="flex min-h-screen w-full flex-col bg-secondary/50">
            <Header />
            <main className="flex-1 p-4 md:p-8">
                 <TooltipProvider>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div>
                            <Button variant="outline" asChild className="mb-4">
                                <Link href="/admin/integrations">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar às Integrações
                                </Link>
                            </Button>
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold font-headline">Integração com Contabilidade & ERPs</h1>
                                 <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><HelpCircle className="h-4 w-4 text-muted-foreground"/></Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p className="max-w-xs">Exporte dados financeiros e de faturação da Profundidade para o seu sistema de contabilidade para facilitar a reconciliação e o fecho de contas.</p></TooltipContent>
                                </Tooltip>
                            </div>
                            <p className="text-muted-foreground">Sincronize dados financeiros automaticamente entre a Profundidade e o seu sistema de contabilidade.</p>
                        </div>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Exportação Manual de Dados</CardTitle>
                                <CardDescription>Selecione o projeto e o período desejado e exporte um ficheiro CSV com todas as transações financeiras registadas na plataforma, pronto para ser importado no seu software de contabilidade.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-3 space-y-2">
                                        <Label>Projeto</Label>
                                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos os Projetos</SelectItem>
                                                {projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-full space-y-2">
                                        <Label>Data de Início</Label>
                                        <DatePicker date={dateRange.from} setDate={(d) => setDateRange(prev => ({...prev, from: d || prev.from}))}/>
                                    </div>
                                    <div className="w-full space-y-2">
                                        <Label>Data de Fim</Label>
                                        <DatePicker date={dateRange.to} setDate={(d) => setDateRange(prev => ({...prev, to: d || prev.to}))}/>
                                    </div>
                                </div>
                            </CardContent>
                             <CardFooter>
                                <Button onClick={handleExport} disabled={isExporting}>
                                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                                    {isExporting ? 'A exportar...' : 'Exportar Transações (CSV)'}
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Conectores Diretos (Em Breve)</CardTitle>
                                <CardDescription>Ative os conectores para os sistemas que a sua empresa utiliza.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="p-8 text-center text-muted-foreground border rounded-lg">
                                    <Building className="h-10 w-10 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold">Em Desenvolvimento</h3>
                                    <p className="text-sm mt-1">Em breve, poderá conectar-se diretamente a ERPs populares como Primavera, Sage e SAP para automatizar o fluxo de faturas, contas a pagar e centros de custo.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                 </TooltipProvider>
            </main>
        </div>
    );
}
