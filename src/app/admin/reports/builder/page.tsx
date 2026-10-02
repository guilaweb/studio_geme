

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRequireAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { collectionGroup, getDocs, query, collection, onSnapshot, addDoc, serverTimestamp, orderBy, where, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Header } from '@/components/Header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Database, Columns, Filter, Loader2, TableIcon, Check, AreaChart, Download, Save, FolderDown, PieChart as PieChartIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { DataSource, ReportData, ReportConfiguration, VisualizationType } from '@/types/reports';
import type { Project } from '@/types/project';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Bar, BarChart as RechartsBarChart, Line, LineChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Papa from 'papaparse';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { WbsItemCategories } from '@/types/wbs';
import { IncidentType, IncidentSeverity, IncidentStatus } from '@/types/hseq';
import { STAGES } from '@/types/crm';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


const getItemDate = (item: ReportData): Date | null => {
    // This function tries to find a relevant date property on a data item.
    // It prioritizes specific date fields before falling back to createdAt.
    const dateFields = ['date', 'startDate', 'admissionDate', 'createdAt'];
    for (const field of dateFields) {
        if (field in item && item[field as keyof typeof item]) {
            const dateValue = item[field as keyof typeof item] as any;
            if (dateValue.toDate) return dateValue.toDate(); // Firestore Timestamp
            if (dateValue instanceof Date) return dateValue;
            if (typeof dateValue === 'string' || typeof dateValue === 'number') {
                const d = new Date(dateValue);
                if (!isNaN(d.getTime())) return d;
            }
        }
    }
    return null;
};


export default function ReportBuilderPage() {
    const { user: adminUser, loading: authLoading } = useRequireAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [dataSource, setDataSource] = useState<DataSource | ''>('');
    const [data, setData] = useState<ReportData[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    
    // --- Filter State ---
    const [allColumns, setAllColumns] = useState<string[]>([]);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
    const [contentFilters, setContentFilters] = useState<Record<string, string>>({});


    
    // --- Visualization State ---
    const [visualizationType, setVisualizationType] = useState<VisualizationType>('table');
    const [xAxis, setXAxis] = useState<string>('');
    const [yAxis, setYAxis] = useState<string[]>([]);
    const [dateGrouping, setDateGrouping] = useState<'day' | 'week' | 'month' | ''>('');
    
    // --- Save/Load State ---
    const [savedReports, setSavedReports] = useState<ReportConfiguration[]>([]);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [reportName, setReportName] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);


    useEffect(() => {
        if (authLoading || !adminUser) return;
        if (adminUser.role !== 'super-admin') {
            router.push('/dashboard');
        }
    }, [adminUser, authLoading, router]);

    // Fetch projects for the filter dropdown
    useEffect(() => {
        if (!adminUser) return;
        const projectsQuery = query(collection(db, 'projects'));
        const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
            const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            setProjects(fetchedProjects);
        });
        return () => unsubscribe();
    }, [adminUser]);

     // Fetch saved reports
    useEffect(() => {
        if (!adminUser) return;
        const reportsQuery = query(collection(db, 'reports'), where('author.uid', '==', adminUser.uid), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
            const fetchedReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReportConfiguration));
            setSavedReports(fetchedReports);
        });
        return () => unsubscribe();
    }, [adminUser]);


    const fetchData = async (source: DataSource) => {
        setLoadingData(true);
        setData([]);
        setAllColumns([]);
        setSelectedColumns([]);
        setSelectedProjectIds([]);
        setDateRange({ from: undefined, to: undefined });
        setContentFilters({});
        setXAxis('');
        setYAxis([]);
        setDateGrouping('');
        try {
            let q;
            switch (source) {
                case 'wbs_finance':
                    q = query(collectionGroup(db, 'wbs'));
                    break;
                case 'hseq':
                    q = query(collectionGroup(db, 'incidents'));
                    break;
                case 'crm':
                    q = query(collection(db, 'opportunities'));
                    break;
                case 'rh':
                    q = query(collection(db, 'workforce'));
                    break;
                default:
                    setLoadingData(false);
                    return;
            }
            const snapshot = await getDocs(q);
            const fetchedData = snapshot.docs.map(doc => ({
                 projectId: doc.ref.parent.parent?.id, 
                 ...doc.data() 
            }));
            setData(fetchedData as ReportData[]);
            
            if (fetchedData.length > 0) {
                const columns = Object.keys(fetchedData[0]);
                setAllColumns(columns);
                setSelectedColumns(columns); // Select all by default
            }

            toast({title: `${fetchedData.length} registos carregados de "${source}".`});
        } catch (error) {
            console.error("Error fetching report data:", error);
            toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
        } finally {
            setLoadingData(false);
        }
    };
    
    const handleDataSourceChange = (value: DataSource) => {
        setDataSource(value);
        fetchData(value);
    }
    
    const handleColumnToggle = (column: string, checked: boolean) => {
        setSelectedColumns(prev => 
            checked ? [...prev, column] : prev.filter(c => c !== column)
        );
    }
    
    const handleToggleAllColumns = (checked: boolean) => {
        if (checked) {
            setSelectedColumns(allColumns);
        } else {
            setSelectedColumns([]);
        }
    }

    const filterableFields = useMemo(() => {
        if (!dataSource) return {};
        switch(dataSource) {
            case 'wbs_finance':
                return { category: WbsItemCategories };
            case 'hseq':
                return {
                    type: ["Acidente de Trabalho", "Incidente Ambiental", "Quase Acidente", "Condição Insegura", "Ato Inseguro"],
                    severity: ["Baixa", "Média", "Alta", "Crítica"],
                    status: ['Aberto', 'Em Investigação', 'Concluído'],
                };
            case 'crm':
                return { stage: STAGES };
            case 'rh':
                return {
                    status: ['Ativo', 'Inativo', 'De Férias'],
                    employmentType: ['Efetivo', 'Temporário', 'Subcontratado'],
                };
            default:
                return {};
        }
    }, [dataSource]);


    const filteredData = useMemo(() => {
        if (!data) return [];
        let result = data;

        // Project filter
        if (selectedProjectIds.length > 0) {
            result = result.filter(item => item.projectId && selectedProjectIds.includes(item.projectId));
        }
        
        // Date range filter
        if (dateRange.from || dateRange.to) {
            result = result.filter(item => {
                const d = getItemDate(item);
                if (!d) return false; // Don't include items without a relevant date if filtering

                const from = dateRange.from ? new Date(dateRange.from.setHours(0, 0, 0, 0)) : null;
                const to = dateRange.to ? new Date(dateRange.to.setHours(23, 59, 59, 999)) : null;
                
                if (from && d < from) return false;
                if (to && d > to) return false;
                
                return true;
            });
        }
        
        // Content filters
        if (Object.keys(contentFilters).length > 0) {
            result = result.filter(item => {
                return Object.entries(contentFilters).every(([key, value]) => {
                    if (!value || value === 'all') return true;
                    // @ts-ignore
                    return item[key] === value;
                });
            });
        }

        return result;
    }, [data, selectedProjectIds, dateRange, contentFilters]);


    const tableHeaders = useMemo(() => {
        if (filteredData.length === 0 || selectedColumns.length === 0) return [];
        return allColumns.filter(h => selectedColumns.includes(h) && !['createdAt', 'author', 'parentId', 'dependencies'].includes(h));
    }, [filteredData, selectedColumns, allColumns]);

     const { categoricalColumns, numericalColumns, dateColumns } = useMemo(() => {
        if (filteredData.length === 0) return { categoricalColumns: [], numericalColumns: [], dateColumns: [] };
        
        const catCols: string[] = [];
        const numCols: string[] = [];
        const dateCols: string[] = [];
        
        const sample = filteredData[0];
        const dateFieldNames = ['date', 'createdAt', 'startDate', 'endDate', 'issueDate', 'dueDate', 'effectiveDate', 'admissionDate'];
        
        allColumns.forEach(col => {
            const value = sample[col as keyof typeof sample];
            const valAny = value as any;
            const isDateLike = valAny?.toDate || valAny instanceof Date || (typeof value === 'string' && !isNaN(new Date(value).getTime()));
            if (dateFieldNames.includes(col) && isDateLike) {
                 dateCols.push(col);
            } else if (typeof value === 'string') {
                catCols.push(col);
            } else if (typeof value === 'number' && !col.toLowerCase().includes('id')) {
                numCols.push(col);
            }
        });
        
        return { categoricalColumns: catCols, numericalColumns: numCols, dateColumns: Array.from(new Set(dateCols)) };
    }, [filteredData, allColumns]);


    const chartData = useMemo(() => {
        if ((visualizationType !== 'bar_chart' && visualizationType !== 'line_chart' && visualizationType !== 'pie_chart') || yAxis.length === 0 || !xAxis || filteredData.length === 0) return [];

        const aggregatedData: { [key: string]: any } = {};

        const initializeAggregatedObject = (key: string) => {
            if (!aggregatedData[key]) {
                aggregatedData[key] = { name: key };
                yAxis.forEach(metric => {
                    aggregatedData[key][metric] = 0;
                });
            }
        };

        const processItem = (item: any, key: string) => {
            initializeAggregatedObject(key);
            yAxis.forEach(metric => {
                aggregatedData[key][metric] += item[metric] || 0;
            });
        };

        // Date grouping logic
        if (dateGrouping && dateColumns.includes(xAxis)) {
            filteredData.forEach((item: any) => {
                const dateValue = item[xAxis];
                if (!dateValue) return;
                const date = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
                if (isNaN(date.getTime())) return;

                let key = '';
                if (dateGrouping === 'day') key = format(date, 'yyyy-MM-dd');
                if (dateGrouping === 'week') key = `Semana ${format(date, 'ww, yyyy')}`;
                if (dateGrouping === 'month') key = format(date, 'MMM/yy', { locale: ptBR });

                processItem(item, key);
            });
        } else {
            // Categorical grouping logic
            filteredData.forEach((item: any) => {
                const key = item[xAxis];
                if (key === null || key === undefined || typeof key === 'object') return;
                const keyString = String(key);
                processItem(item, keyString);
            });
        }

        const sortedData = Object.values(aggregatedData);
        // Add more complex date-aware sorting if needed
        if (!dateGrouping) {
            sortedData.sort((a, b) => a.name.localeCompare(b.name));
        }
        
        return sortedData;
    }, [filteredData, visualizationType, xAxis, yAxis, dateGrouping, dateColumns]);


    const chartConfig = useMemo(() => {
        const config: ChartConfig = {};
        yAxis.forEach((metric, index) => {
            config[metric] = {
                label: metric,
                color: `hsl(var(--chart-${index + 1}))`
            };
        });
        return config;
    }, [yAxis]);

    const handleExportCsv = () => {
        if (filteredData.length === 0 || tableHeaders.length === 0) {
            toast({ title: 'Nenhum dado para exportar' });
            return;
        }

        const dataToExport = filteredData.map(row => {
            const exportedRow: Record<string, any> = {};
            tableHeaders.forEach(header => {
                let value = row[header as keyof typeof row];
                if ((value as any) instanceof Date) {
                    value = format(value as any, 'yyyy-MM-dd HH:mm:ss');
                } else if (typeof value === 'object' && value !== null) {
                    value = JSON.stringify(value);
                }
                exportedRow[header] = value;
            });
            return exportedRow;
        });

        const csv = Papa.unparse(dataToExport, {
            columns: tableHeaders,
        });

        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_${dataSource}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSaveReport = async () => {
        if (!reportName.trim() || !dataSource) {
            toast({ title: 'Dados insuficientes', description: 'O nome do relatório e a fonte de dados são obrigatórios.', variant: 'destructive' });
            return;
        }
        if (!adminUser) return;
        setIsSubmittingReport(true);
        try {
            const reportConfig: Omit<ReportConfiguration, 'id'| 'createdAt'> & { createdAt: any } = {
                name: reportName,
                dataSource,
                filters: { 
                    projectIds: selectedProjectIds,
                    dateRange: {
                        from: dateRange.from?.toISOString(),
                        to: dateRange.to?.toISOString()
                    },
                    contentFilters: contentFilters,
                },
                columns: selectedColumns,
                visualization: { type: visualizationType, xAxis, yAxis, dateGrouping: dateGrouping || undefined },
                author: { uid: adminUser.uid, displayName: adminUser.displayName || 'Admin' },
                createdAt: serverTimestamp(),
            };
            await addDoc(collection(db, 'reports'), reportConfig);
            toast({ title: 'Relatório guardado com sucesso!' });
            setIsSaveDialogOpen(false);
            setReportName('');
        } catch (error) {
            toast({ title: 'Erro ao guardar relatório', variant: 'destructive' });
        } finally {
            setIsSubmittingReport(false);
        }
    };
    
    const handleLoadReport = (report: ReportConfiguration) => {
        if (report.dataSource) {
            handleDataSourceChange(report.dataSource);
        }
        setSelectedProjectIds(report.filters.projectIds || []);
         if (report.filters.dateRange) {
            setDateRange({
                from: report.filters.dateRange.from ? new Date(report.filters.dateRange.from) : undefined,
                to: report.filters.dateRange.to ? new Date(report.filters.dateRange.to) : undefined,
            });
        } else {
            setDateRange({ from: undefined, to: undefined });
        }
        setContentFilters(report.filters.contentFilters || {});
        setSelectedColumns(report.columns);
        setVisualizationType(report.visualization.type);
        setXAxis(report.visualization.xAxis || '');
        setYAxis(report.visualization.yAxis || []);
        setDateGrouping(report.visualization.dateGrouping || '');
        toast({ title: `Relatório "${report.name}" carregado.` });
    };

    const handleDeleteReport = async (reportId: string) => {
        if (!confirm('Tem a certeza que deseja eliminar este relatório guardado?')) {
            return;
        }
    
        try {
            await deleteDoc(doc(db, 'reports', reportId));
            toast({ title: 'Relatório eliminado com sucesso!' });
        } catch (error) {
            console.error("Error deleting report: ", error);
            toast({ title: 'Erro ao eliminar relatório', variant: 'destructive' });
        }
    };


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
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-secondary/50">
            <Header />
            <main className="flex-1 flex-col p-4 md:p-8">
                <div className="flex flex-wrap items-center gap-4 mb-8">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/admin">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold font-headline">Construtor de Relatórios (BI)</h1>
                        <p className="text-muted-foreground">Crie relatórios personalizados a partir dos dados da sua plataforma.</p>
                    </div>
                     <div className="flex items-center gap-2">
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline"><FolderDown className="mr-2 h-4 w-4"/>Carregar Relatório</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-0">
                                <Command>
                                    <CommandInput placeholder="Pesquisar relatório..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhum relatório guardado.</CommandEmpty>
                                        <CommandGroup>
                                            {savedReports.map(report => (
                                                <CommandItem key={report.id} onSelect={() => handleLoadReport(report)} className="flex justify-between items-center">
                                                    <span>{report.name}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }}>
                                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                                    </Button>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                         <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                            <DialogTrigger asChild>
                                <Button disabled={!dataSource}><Save className="mr-2 h-4 w-4"/>Guardar Relatório</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Guardar Relatório</DialogTitle>
                                    <DialogDescription>Dê um nome ao seu relatório para o poder carregar mais tarde.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <Label htmlFor="report-name">Nome do Relatório</Label>
                                    <Input id="report-name" value={reportName} onChange={(e) => setReportName(e.target.value)} />
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsSaveDialogOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleSaveReport} disabled={isSubmittingReport}>
                                        {isSubmittingReport && <Loader2 className="animate-spin mr-2"/>}
                                        Guardar
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="grid flex-1 items-start gap-4 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
                    <aside className="sticky top-24">
                        <Accordion type="multiple" defaultValue={['data-source', 'filters']} className="w-full space-y-2">
                             <AccordionItem value="data-source" className="border rounded-md bg-card">
                                <AccordionTrigger className="p-4 font-semibold text-base">
                                    <span className="flex items-center gap-2"><Database className="h-5 w-5 text-primary"/>Fonte de Dados</span>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                    <Select onValueChange={(value) => handleDataSourceChange(value as DataSource)} value={dataSource}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione os dados..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="wbs_finance">EAP e Finanças</SelectItem>
                                            <SelectItem value="hseq">Incidentes HSEQ</SelectItem>
                                            <SelectItem value="crm">CRM e Vendas</SelectItem>
                                            <SelectItem value="rh">Recursos Humanos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="filters" className="border rounded-md bg-card">
                                <AccordionTrigger className="p-4 font-semibold text-base">
                                     <span className="flex items-center gap-2"><Filter className="h-5 w-5 text-primary"/>Filtros</span>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0 space-y-4">
                                    {/* General Filters */}
                                    <div className="space-y-2 pt-2">
                                        <Label>Projetos</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                    {selectedProjectIds.length > 0 ? `${selectedProjectIds.length} selecionado(s)` : 'Todos os Projetos'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Pesquisar projeto..." />
                                                    <CommandList><CommandGroup>
                                                        {projects.map(project => (
                                                            <CommandItem key={project.id} onSelect={() => setSelectedProjectIds(prev => prev.includes(project.id) ? prev.filter(id => id !== project.id) : [...prev, project.id])}>
                                                                <Check className={cn("mr-2 h-4 w-4", selectedProjectIds.includes(project.id) ? "opacity-100" : "opacity-0")} />
                                                                {project.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup></CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Período</Label>
                                        <div className="flex flex-col gap-2">
                                            <DatePicker date={dateRange.from} setDate={(d) => setDateRange(prev => ({...prev, from: d}))} placeholder="Data de Início" />
                                            <DatePicker date={dateRange.to} setDate={(d) => setDateRange(prev => ({...prev, to: d}))} placeholder="Data de Fim" />
                                        </div>
                                    </div>
                                    {/* Content Filters */}
                                    {Object.keys(filterableFields).length > 0 && <h4 className="font-semibold text-sm pt-4 border-t">Filtros de Conteúdo</h4>}
                                    {Object.entries(filterableFields).map(([key, options]) => (
                                        <div key={key} className="space-y-2">
                                            <Label className="capitalize">{key}</Label>
                                            <Select value={contentFilters[key] || 'all'} onValueChange={(value) => setContentFilters(prev => ({ ...prev, [key]: value }))}>
                                                <SelectTrigger><SelectValue/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    {Array.isArray(options) && options.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="visualization" className="border rounded-md bg-card">
                                 <AccordionTrigger className="p-4 font-semibold text-base">
                                    <span className="flex items-center gap-2"><AreaChart className="h-5 w-5 text-primary"/>Visualização</span>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0 space-y-4">
                                     <Select value={visualizationType} onValueChange={(v) => setVisualizationType(v as VisualizationType)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="table">Tabela de Dados</SelectItem>
                                            <SelectItem value="bar_chart">Gráfico de Barras</SelectItem>
                                            <SelectItem value="line_chart">Gráfico de Linhas</SelectItem>
                                            <SelectItem value="pie_chart">Gráfico Circular</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {(visualizationType === 'bar_chart' || visualizationType === 'line_chart' || visualizationType === 'pie_chart') && (
                                        <div className="space-y-4 pt-4 border-t">
                                            <div className="space-y-2">
                                                <Label>Dimensão (Eixo X / Fatias)</Label>
                                                <Select value={xAxis} onValueChange={(v) => { setXAxis(v); setDateGrouping(''); }} disabled={categoricalColumns.length === 0 && dateColumns.length === 0}>
                                                    <SelectTrigger><SelectValue placeholder="Agrupar por..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {dateColumns.length > 0 && <SelectGroup><SelectLabel>Datas</SelectLabel>{dateColumns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectGroup>}
                                                        {categoricalColumns.length > 0 && <SelectGroup><SelectLabel>Categorias</SelectLabel>{categoricalColumns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectGroup>}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {dateColumns.includes(xAxis) && (visualizationType === 'bar_chart' || visualizationType === 'line_chart') && (
                                                <div className="space-y-2">
                                                    <Label>Agrupar por Data</Label>
                                                    <Select value={dateGrouping} onValueChange={(v) => setDateGrouping(v as any)}>
                                                        <SelectTrigger><SelectValue placeholder="Selecione o período..." /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="">Nenhum (Usar como Categoria)</SelectItem>
                                                            <SelectItem value="day">Dia</SelectItem>
                                                            <SelectItem value="week">Semana</SelectItem>
                                                            <SelectItem value="month">Mês</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <Label>Métricas (Eixo Y / Valores)</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={numericalColumns.length === 0}>
                                                            {yAxis.length > 0 ? `${yAxis.length} selecionada(s)` : 'Medir...'}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                        <Command><CommandList><CommandGroup>
                                                            {numericalColumns.map(col => (
                                                                <CommandItem key={col} onSelect={() => setYAxis(prev => prev.includes(col) ? prev.filter(id => id !== col) : [...prev, col])}>
                                                                    <Check className={cn("mr-2 h-4 w-4", yAxis.includes(col) ? "opacity-100" : "opacity-0")} />Soma de {col}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup></CommandList></Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="columns" className="border rounded-md bg-card">
                                <AccordionTrigger className="p-4 font-semibold text-base">
                                     <span className="flex items-center gap-2"><Columns className="h-5 w-5 text-primary"/>Colunas</span>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                    {allColumns.length > 0 ? (
                                        <ScrollArea className="h-48 pr-3">
                                            <div className="flex items-center space-x-2 pb-2 border-b mb-2">
                                                <Checkbox id="toggle-all-columns" checked={selectedColumns.length === allColumns.length} onCheckedChange={(checked) => handleToggleAllColumns(!!checked)}/>
                                                <Label htmlFor="toggle-all-columns" className="font-semibold">Selecionar Todas</Label>
                                            </div>
                                            {allColumns.map(col => (
                                                <div key={col} className="flex items-center space-x-2"><Checkbox id={`col-${col}`} checked={selectedColumns.includes(col)} onCheckedChange={(checked) => handleColumnToggle(col, !!checked)}/><Label htmlFor={`col-${col}`} className="font-normal">{col}</Label></div>
                                            ))}
                                        </ScrollArea>
                                    ) : (<p className="text-xs text-muted-foreground pt-2">Selecione uma fonte de dados.</p>)}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </aside>

                    <div className="space-y-6">
                        <Card>
                             <CardHeader className="flex flex-row items-start justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        {visualizationType === 'table' && <TableIcon className="h-5 w-5 text-primary"/>}
                                        {(visualizationType === 'bar_chart' || visualizationType === 'line_chart') && <AreaChart className="h-5 w-5 text-primary"/>}
                                        {visualizationType === 'pie_chart' && <PieChartIcon className="h-5 w-5 text-primary"/>}
                                        {visualizationType === 'table' ? 'Pré-visualização dos Dados' : 'Visualização do Gráfico'}
                                    </CardTitle>
                                    <CardDescription>{filteredData.length} registos correspondentes aos filtros aplicados.</CardDescription>
                                </div>
                                <Button onClick={handleExportCsv} disabled={loadingData || filteredData.length === 0} size="sm">
                                    <Download className="mr-2 h-4 w-4" />
                                    Exportar CSV
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {loadingData ? (
                                    <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>
                                ) : filteredData.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg min-h-[400px] flex flex-col justify-center items-center">
                                        <Database className="h-16 w-16 text-muted-foreground/50 mb-4"/>
                                        <h3 className="text-lg font-semibold">{dataSource ? 'Nenhum dado encontrado para os filtros atuais.' : 'Selecione uma fonte de dados para começar.'}</h3>
                                        <p className="text-sm mt-1">{dataSource ? 'Tente ajustar os seus filtros.' : 'Os dados brutos aparecerão aqui.'}</p>
                                    </div>
                                ) : visualizationType === 'table' ? (
                                    <ScrollArea className="h-[500px] border rounded-md">
                                        <Table>
                                            <TableHeader className="sticky top-0 bg-secondary">
                                                <TableRow>
                                                    {tableHeaders.map(header => <TableHead key={header}>{header}</TableHead>)}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredData.slice(0, 100).map((row, index) => ( // Preview first 100 rows
                                                    <TableRow key={index}>
                                                        {tableHeaders.map(header => (
                                                            <TableCell key={header} className="text-xs max-w-[150px] truncate">
                                                                {String(row[header as keyof typeof row] ?? '')}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                ) : (!xAxis || yAxis.length === 0) ? (
                                    <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg min-h-[400px] flex flex-col justify-center items-center">
                                        <AreaChart className="h-16 w-16 text-muted-foreground/50 mb-4"/>
                                        <h3 className="text-lg font-semibold">Configure o seu gráfico.</h3>
                                        <p className="text-sm mt-1">Selecione uma Dimensão (Eixo X) e pelo menos uma Métrica (Eixo Y) para começar.</p>
                                    </div>
                                ) : visualizationType === 'bar_chart' ? (
                                    <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
                                        <RechartsBarChart data={chartData} accessibilityLayer>
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                            <YAxis tickFormatter={(value) => typeof value === 'number' ? `${Number(value) / 1000}k` : value} />
                                            <Tooltip
                                              cursor={false}
                                              content={<ChartTooltipContent indicator="dot" formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}/>}
                                            />
                                            <Legend />
                                            {yAxis.map(metric => (
                                                <Bar key={metric} dataKey={metric} fill={`var(--color-${metric})`} radius={4} name={metric}/>
                                            ))}
                                        </RechartsBarChart>
                                    </ChartContainer>
                                ) : visualizationType === 'line_chart' ? (
                                     <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
                                        <LineChart data={chartData} accessibilityLayer>
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                            <YAxis tickFormatter={(value) => typeof value === 'number' ? `${Number(value) / 1000}k` : value} />
                                            <Tooltip
                                              cursor={false}
                                              content={<ChartTooltipContent formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}/>}
                                            />
                                            <Legend />
                                            {yAxis.map(metric => (
                                                <Line key={metric} type="monotone" dataKey={metric} stroke={`var(--color-${metric})`} strokeWidth={2} dot={false} name={metric} />
                                            ))}
                                        </LineChart>
                                    </ChartContainer>
                                ) : visualizationType === 'pie_chart' ? (
                                     yAxis.length === 1 ? (
                                        <ChartContainer config={chartConfig} className="min-h-[400px] w-full flex-col items-center">
                                            <PieChart>
                                                <Tooltip content={<ChartTooltipContent formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}/>} />
                                                <Pie data={chartData} dataKey={yAxis[0]} nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                                                    ))}
                                                </Pie>
                                                <Legend />
                                            </PieChart>
                                        </ChartContainer>
                                    ) : (
                                        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg min-h-[400px] flex flex-col justify-center items-center">
                                            <PieChartIcon className="h-16 w-16 text-muted-foreground/50 mb-4"/>
                                            <h3 className="text-lg font-semibold">Gráfico Circular</h3>
                                            <p className="text-sm mt-1">Selecione apenas uma métrica no Eixo Y para visualizar o gráfico circular.</p>
                                        </div>
                                    )
                                ) : null}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
