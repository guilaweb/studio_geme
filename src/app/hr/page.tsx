'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { collection, onSnapshot, query, where, Timestamp, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/hooks/use-auth';
import { Header } from '@/components/Header';
import { 
    Loader2, 
    Users2, 
    User, 
    UserX, 
    FileWarning, 
    HelpCircle, 
    BookOpen, 
    Clock, 
    DollarSign,
    TrendingUp,
    Users,
    FileText,
    Building2,
    Calendar as CalendarIcon,
    Star,
    Shield
} from 'lucide-react';
import CompanyWorkforceTab from '@/components/company-workforce-tab';
import LeaveManagementTab from '@/components/hr/leave-management-tab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type WorkforceMember, type WorkforceDocument, type TimesheetEntry } from '@/types/workforce';
import { type HrRequest, type HrDepartment, type HrTeam } from '@/types/hr';
import { addDays, format, differenceInDays, startOfMonth, endOfMonth, isWithinInterval, subMonths, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Bar, BarChart as RechartsBarChart, PieChart, Pie, Cell, Legend, XAxis, YAxis, ResponsiveContainer, Tooltip, ComposedChart, Line, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { TooltipProvider, Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import PerformanceAnalysisTab from '@/components/hr/performance-analysis-tab';
import PayrollSummaryTab from '@/components/payroll-summary-tab';
import TrainingMatrixTab from '@/components/hr/training-matrix-tab';
import dynamic from 'next/dynamic';
import { useToast } from '@/hooks/use-toast';

import MyHrTab from '@/components/hr/my-hr-tab';
import MyTeamTab from '@/components/hr/my-team-tab';
import DirectorHrTab from '@/components/hr/director-hr-tab';
import HrRequestsWorkflow from '@/components/hr/hr-requests-workflow';
import HrDepartmentsTab from '@/components/hr/hr-departments-tab';
import HrPerformanceTab from '@/components/hr/hr-performance-tab';
import HrPermissionsTab from '@/components/hr/hr-permissions-tab';
import { resolveHrUserAccess, sanitizeWorkforceList } from '@/lib/hr-permissions';

const PlannerView = dynamic(() => import('@/components/resource-timeline-view'), {
    ssr: false,
    loading: () => <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>
});

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

function HrContent() {
    // Acesso não restrito apenas a super-admin: qualquer utilizador autenticado da organização pode aceder
    const { user, loading: authLoading, idToken } = useRequireAuth();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [globalWorkforce, setGlobalWorkforce] = useState<WorkforceMember[]>([]);
    const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
    const [requests, setRequests] = useState<HrRequest[]>([]);
    const [departments, setDepartments] = useState<HrDepartment[]>([]);
    const [teams, setTeams] = useState<HrTeam[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Resolve o nível de autorização granular e responsabilidades no RH
    const access = useMemo(() => resolveHrUserAccess(user, teams), [user, teams]);

    // (Tab resolution moved below pendingCount for dynamic role-based menus)

    // Busca dados operacionais de RH via API autenticada
    const fetchHrData = async () => {
        if (!idToken) return;
        try {
            const [reqsRes, deptsRes, teamsRes] = await Promise.all([
                fetch('/api/hr/requests', { headers: { Authorization: `Bearer ${idToken}` } }),
                fetch('/api/hr/departments', { headers: { Authorization: `Bearer ${idToken}` } }),
                fetch('/api/hr/teams', { headers: { Authorization: `Bearer ${idToken}` } })
            ]);

            if (reqsRes.ok) {
                const reqs = await reqsRes.json();
                setRequests(Array.isArray(reqs) ? reqs : (reqs.requests || []));
            }
            if (deptsRes.ok) {
                const depts = await deptsRes.json();
                setDepartments(Array.isArray(depts) ? depts : (depts.departments || []));
            }
            if (teamsRes.ok) {
                const tms = await teamsRes.json();
                setTeams(Array.isArray(tms) ? tms : (tms.teams || []));
            }
        } catch (err) {
            console.error('Error fetching HR operational data:', err);
        }
    };

    useEffect(() => {
        if (idToken) {
            fetchHrData();
        }
    }, [idToken]);

    // Subscrição em tempo real ao quadro de pessoal e timesheets
    useEffect(() => {
        if (!user) return;
        setLoadingData(true);
        
        let workforceLoaded = false;
        let timesheetsLoaded = false;

        const checkDone = () => {
            if (workforceLoaded && timesheetsLoaded) {
                setLoadingData(false);
            }
        };

        const q = query(collection(db, 'workforce'));
        const unsubscribeWorkforce = onSnapshot(q, (snapshot) => {
            const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkforceMember));
            setGlobalWorkforce(members);
            workforceLoaded = true;
            checkDone();
        }, (error) => {
            console.error("Error fetching workforce:", error);
            workforceLoaded = true;
            checkDone();
        });
        
        const timesheetQuery = query(collectionGroup(db, 'timesheets'));
        const unsubscribeTimesheets = onSnapshot(timesheetQuery, (snapshot) => {
            setTimesheets(snapshot.docs.map(doc => ({
                ...doc.data(),
                date: (doc.data().date as Timestamp).toDate(),
            } as TimesheetEntry)));
            timesheetsLoaded = true;
            checkDone();
        }, (error) => {
            console.error("Error fetching timesheets:", error);
            timesheetsLoaded = true;
            checkDone();
        });

        return () => {
            unsubscribeWorkforce();
            unsubscribeTimesheets();
        };
    }, [user]);

    // Sanitiza o quadro de pessoal para garantir sigilo financeiro aos perfis não autorizados
    const sanitizedWorkforce = useMemo(() => {
        return sanitizeWorkforceList(globalWorkforce, user, access);
    }, [globalWorkforce, user, access]);

    // Contagem de solicitações pendentes de ação para o utilizador atual
    const pendingCount = useMemo(() => {
        if (!requests.length) return 0;
        if (access.isAdmin) {
            return requests.filter(r => r.status === 'Pendente Gestor' || r.status === 'Pendente RH').length;
        }
        if (access.isHrManager) {
            return requests.filter(r => r.status === 'Pendente RH').length;
        }
        if (access.isManager) {
            return requests.filter(r => r.status === 'Pendente Gestor' && (r.managerUid === user?.uid || !r.managerUid)).length;
        }
        return 0;
    }, [requests, access, user]);

    const isColaborador = !access.isManager && !access.isDirector && !access.isHrManager && !access.isAdmin;

    // Configuração dos menus dinâmicos por perfil conforme a Secção 8 do Caderno de Encargos
    const roleTabs = useMemo(() => {
        if (access.isAdmin) {
            return [
                { id: 'dashboard', label: 'Dashboard', icon: Users2 },
                { id: 'workforce', label: 'Colaboradores', icon: Users },
                { id: 'departments', label: 'Departamentos', icon: Building2 },
                { id: 'leave', label: 'Férias & Ausências', icon: CalendarIcon },
                { id: 'requests', label: 'Solicitações', icon: FileText, badge: pendingCount > 0 ? pendingCount : undefined },
                { id: 'performance', label: 'Avaliações', icon: Star },
                { id: 'training', label: 'Formação', icon: BookOpen },
                { id: 'planner', label: 'Planeador', icon: Clock },
                { id: 'payroll', label: 'Salários & Custos', icon: DollarSign },
                { id: 'permissions', label: 'Permissões de RH', icon: Shield },
                { id: 'my-hr', label: 'Meu RH', icon: User },
            ];
        }

        if (access.isHrManager) {
            return [
                { id: 'dashboard', label: 'Dashboard', icon: Users2 },
                { id: 'workforce', label: 'Colaboradores', icon: Users },
                { id: 'departments', label: 'Departamentos', icon: Building2 },
                { id: 'leave', label: 'Férias & Ausências', icon: CalendarIcon },
                { id: 'requests', label: 'Solicitações', icon: FileText, badge: pendingCount > 0 ? pendingCount : undefined },
                { id: 'performance', label: 'Avaliações', icon: Star },
                { id: 'training', label: 'Formação', icon: BookOpen },
                { id: 'planner', label: 'Planeador', icon: Clock },
                { id: 'payroll', label: 'Salários & Custos', icon: DollarSign },
                { id: 'my-hr', label: 'Meu RH', icon: User },
            ];
        }

        if (access.isDirector) {
            return [
                { id: 'director', label: 'Cockpit Executivo', icon: TrendingUp },
                { id: 'workforce', label: 'Colaboradores', icon: Users },
                { id: 'departments', label: 'Departamentos & Equipas', icon: Building2 },
                { id: 'requests', label: 'Solicitações Globais', icon: FileText, badge: pendingCount > 0 ? pendingCount : undefined },
                { id: 'my-hr', label: 'Meu RH', icon: User },
            ];
        }

        if (access.isManager) {
            return [
                { id: 'my-team', label: 'Minha Equipa', icon: Users },
                { id: 'team-vacations', label: 'Férias da Equipa', icon: CalendarIcon },
                { id: 'team-absences', label: 'Ausências', icon: Clock },
                { id: 'workforce', label: 'Colaboradores', icon: Users2 },
                { id: 'requests', label: 'Solicitações', icon: FileText, badge: pendingCount > 0 ? pendingCount : undefined },
                { id: 'planner', label: 'Planeador', icon: Clock },
                { id: 'my-hr', label: 'Meu RH', icon: User },
            ];
        }

        // Colaborador: Menu dedicado de auto-serviço (Secção 8)
        return [
            { id: 'profile', label: 'Meu Perfil', icon: User },
            { id: 'vacation', label: 'Minhas Férias', icon: CalendarIcon },
            { id: 'absences', label: 'Minhas Ausências', icon: Clock },
            { id: 'documents', label: 'Meus Documentos', icon: FileText },
            { id: 'requests', label: 'Minhas Solicitações', icon: CalendarIcon },
        ];
    }, [access, pendingCount]);

    const defaultTab = useMemo(() => {
        return roleTabs.length > 0 ? roleTabs[0].id : 'my-hr';
    }, [roleTabs]);

    const validTabIds = useMemo(() => new Set(roleTabs.map(t => t.id)), [roleTabs]);
    const requestedTab = searchParams.get('tab');
    const currentTab = requestedTab && validTabIds.has(requestedTab) ? requestedTab : defaultTab;

    const handleTabChange = (val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', val);
        router.push(`/hr?${params.toString()}`);
    };

    // KPIs para a aba de Dashboard Geral
    const kpiData = useMemo(() => {
        const activeMembers = globalWorkforce.filter(m => m.status === 'Ativo');
        const onLeaveMembers = globalWorkforce.filter(m => m.status === 'De Férias');
        
        const today = new Date();
        const thirtyDaysFromNow = addDays(today, 30);
        const expiringDocs: { member: WorkforceMember, doc: WorkforceDocument }[] = [];

        globalWorkforce.forEach(member => {
            (member.documents || []).forEach(doc => {
                if (doc.expiryDate) {
                    const expiry = (doc.expiryDate as any).toDate();
                    if (expiry >= today && expiry <= thirtyDaysFromNow) {
                        expiringDocs.push({ member, doc });
                    }
                }
            });
        });
        
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        const thisMonthTimesheets = timesheets.filter(t => t.date && isWithinInterval(t.date, { start, end }));
        const totalHoursThisMonth = thisMonthTimesheets.reduce((sum, entry) => sum + entry.hours, 0);
        const totalCostThisMonth = thisMonthTimesheets.reduce((sum, entry) => sum + (entry.cost || 0), 0);
        const avgCostPerHour = totalHoursThisMonth > 0 ? totalCostThisMonth / totalHoursThisMonth : 0;

        return {
            total: globalWorkforce.length,
            active: activeMembers.length,
            onLeave: onLeaveMembers.length,
            expiringDocsCount: expiringDocs.length,
            expiringDocsList: expiringDocs.sort((a,b) => (a.doc.expiryDate as any).toDate() - (b.doc.expiryDate as any).toDate()),
            totalHoursThisMonth,
            avgCostPerHour,
        };
    }, [globalWorkforce, timesheets]);
    
    const chartData = useMemo(() => {
        if (globalWorkforce.length === 0) {
            return { byType: [], byRole: [], byProject: [] };
        }

        const byType = globalWorkforce.reduce((acc, member) => {
            const type = member.employmentType;
            const existing = acc.find(item => item.name === type);
            if (existing) {
                existing.value++;
            } else {
                acc.push({ name: type, value: 1 });
            }
            return acc;
        }, [] as { name: string, value: number }[]);

        const byRole = globalWorkforce.reduce((acc, member) => {
            const role = member.role;
            const existing = acc.find(item => item.name === role);
            if (existing) {
                existing.value++;
            } else {
                acc.push({ name: role, value: 1 });
            }
            return acc;
        }, [] as { name: string, value: number }[]).sort((a,b) => b.value - a.value).slice(0, 5);

        const byProject = globalWorkforce.reduce((acc, member) => {
            const projectName = member.currentProjectName || 'Disponível';
            const existing = acc.find(item => item.name === projectName);
            if (existing) {
                existing.value++;
            } else {
                acc.push({ name: projectName, value: 1 });
            }
            return acc;
        }, [] as { name: string, value: number }[]).sort((a, b) => b.value - a.value);

        return { byType, byRole, byProject };
    }, [globalWorkforce]);
    
    const trendsData = useMemo(() => {
        if (globalWorkforce.length === 0 && timesheets.length === 0) {
            return [];
        }

        const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
        const today = endOfMonth(new Date());
        if (!isFinite(sixMonthsAgo.getTime()) || !isFinite(today.getTime())) return [];
        
        const months = eachMonthOfInterval({ start: sixMonthsAgo, end: today });
        
        const monthlyData = months.map(monthStart => {
            const monthEnd = endOfMonth(monthStart);
            const monthKey = format(monthStart, 'MMM/yy', { locale: ptBR });

            const headcount = globalWorkforce.filter(m => 
                m.admissionDate && (m.admissionDate as any).toDate() <= monthEnd
            ).length;

            const cost = timesheets
                .filter(t => t.date && isWithinInterval(t.date, { start: monthStart, end: monthEnd }))
                .reduce((sum, entry) => sum + (entry.cost || 0), 0);
            
            return {
                month: monthKey,
                'Nº Funcionários': headcount,
                'Custo Salarial': cost
            };
        });

        return monthlyData;
    }, [globalWorkforce, timesheets]);

    const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];
    const trendChartConfig = {
        'Nº Funcionários': { label: 'Nº Funcionários', color: 'hsl(var(--chart-2))' },
        'Custo Salarial': { label: 'Custo Salarial', color: 'hsl(var(--chart-1))' },
    };

    if (authLoading || !user) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </main>
            </div>
        );
    }

    if (user.role === 'cliente') {
        return (
            <div className="flex min-h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex flex-1 items-center justify-center p-6 text-center">
                    <Card className="max-w-md">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                                <FileWarning className="h-6 w-6" /> Acesso Reservado
                            </CardTitle>
                            <CardDescription>
                                O módulo de Recursos Humanos é exclusivo para os colaboradores e equipas internas da organização.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild>
                                <Link href="/portal/dashboard">Ir para o Portal do Cliente</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-secondary/50">
            <Header />
            <main className="flex-1 p-4 md:p-8 pb-28 md:pb-12">
                <TooltipProvider>
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* Cabeçalho dinâmico e contextual com papel da pessoa */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                                        <Users2 className="h-8 w-8 text-primary" />
                                        Recursos Humanos
                                    </h1>
                                    <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-primary/40 text-primary bg-primary/5">
                                        {access.roleTitle}
                                    </Badge>
                                </div>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {access.isHrManager || access.isAdmin
                                        ? 'Gestão integral de colaboradores, solicitações, departamentos e desenvolvimento organizacional.'
                                        : access.isDirector
                                        ? 'Cockpit executivo e acompanhamento estratégico do quadro de pessoal e conformidade.'
                                        : access.isManager
                                        ? 'Gestão da sua equipa direta, escalas de ausência e aprovação prévia de solicitações.'
                                        : 'Espaço individual de RH: consulte os seus dados, saldo de férias e submeta solicitações.'}
                                </p>
                            </div>
                            {pendingCount > 0 && (access.isManager || access.isHrManager || access.isAdmin) && (
                                <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={() => handleTabChange('requests')}
                                    className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-sm"
                                >
                                    <Clock className="h-4 w-4" />
                                    {pendingCount} {pendingCount === 1 ? 'Solicitação Pendente' : 'Solicitações Pendentes'}
                                </Button>
                            )}
                        </div>

                        {/* Sistema de Abas Baseado em Papéis e Permissões */}
                        <Tabs value={currentTab} onValueChange={handleTabChange}>
                            <ScrollArea className="w-full whitespace-nowrap">
                                <TabsList className="bg-muted/70 p-1">
                                    {roleTabs.map((tab) => {
                                        const Icon = tab.icon;
                                        return (
                                            <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                                                <Icon className="h-4 w-4" />
                                                <span>{tab.label}</span>
                                                {tab.badge !== undefined && (
                                                    <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px] h-4">
                                                        {tab.badge}
                                                    </Badge>
                                                )}
                                            </TabsTrigger>
                                        );
                                    })}
                                </TabsList>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>

                            {/* Conteúdos das Abas de Colaborador (Menu de Auto-serviço) */}
                            {isColaborador && (
                                <>
                                    <TabsContent value="profile" className="pt-4">
                                        <MyHrTab activeSection="profile" onRequestCreated={fetchHrData} />
                                    </TabsContent>
                                    <TabsContent value="vacation" className="pt-4">
                                        <MyHrTab activeSection="vacation" onRequestCreated={fetchHrData} />
                                    </TabsContent>
                                    <TabsContent value="absences" className="pt-4">
                                        <MyHrTab activeSection="absences" onRequestCreated={fetchHrData} />
                                    </TabsContent>
                                    <TabsContent value="documents" className="pt-4">
                                        <MyHrTab activeSection="documents" onRequestCreated={fetchHrData} />
                                    </TabsContent>
                                    <TabsContent value="requests" className="pt-4">
                                        <MyHrTab activeSection="requests" onRequestCreated={fetchHrData} />
                                    </TabsContent>
                                </>
                            )}

                            {/* Conteúdos das Abas de Gestão Operacional */}
                            {/* MEU RH (Acesso individual para Gestores, Diretores, RH e Admin) */}
                            {!isColaborador && (
                                <TabsContent value="my-hr" className="pt-4">
                                    <MyHrTab activeSection="all" onRequestCreated={fetchHrData} />
                                </TabsContent>
                            )}

                            {/* MINHA EQUIPA (Gestores) */}
                            {access.canViewTeamTab && (
                                <TabsContent value="my-team" className="pt-4">
                                    <MyTeamTab workforce={sanitizedWorkforce} activeSection="team" onRequestUpdated={fetchHrData} />
                                </TabsContent>
                            )}

                            {/* FÉRIAS DA EQUIPA (Gestores) */}
                            {access.isManager && (
                                <TabsContent value="team-vacations" className="pt-4">
                                    <MyTeamTab workforce={sanitizedWorkforce} activeSection="vacations" onRequestUpdated={fetchHrData} />
                                </TabsContent>
                            )}

                            {/* AUSÊNCIAS DA EQUIPA (Gestores) */}
                            {access.isManager && (
                                <TabsContent value="team-absences" className="pt-4">
                                    <MyTeamTab workforce={sanitizedWorkforce} activeSection="absences" onRequestUpdated={fetchHrData} />
                                </TabsContent>
                            )}

                            {/* 3. COCKPIT EXECUTIVO */}
                            {access.canViewExecutiveDashboard && (
                                <TabsContent value="director" className="pt-4">
                                    <DirectorHrTab 
                                        workforce={sanitizedWorkforce} 
                                        requests={requests} 
                                        departments={departments} 
                                    />
                                </TabsContent>
                            )}

                            {/* 4. DASHBOARD GERAL DE RH */}
                            {(access.isHrManager || access.isAdmin) && (
                                <TabsContent value="dashboard" className="space-y-6 pt-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
                                                <Users2 className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{loadingData ? <Loader2 className="h-6 w-6 animate-spin"/> : kpiData.total}</div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                                                <User className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{loadingData ? <Loader2 className="h-6 w-6 animate-spin"/> : kpiData.active}</div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Em Férias / Licença</CardTitle>
                                                <UserX className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{loadingData ? <Loader2 className="h-6 w-6 animate-spin"/> : kpiData.onLeave}</div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Documentos a Expirar</CardTitle>
                                                <UiTooltip><TooltipTrigger asChild><HelpCircle className="h-4 w-4 text-muted-foreground"/></TooltipTrigger><TooltipContent><p>Número de documentos que expiram nos próximos 30 dias.</p></TooltipContent></UiTooltip>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold text-destructive">{loadingData ? <Loader2 className="h-6 w-6 animate-spin"/> : kpiData.expiringDocsCount}</div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Horas Registadas (Este Mês)</CardTitle>
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{loadingData ? <Loader2 className="h-6 w-6 animate-spin"/> : `${kpiData.totalHoursThisMonth.toFixed(1)}h`}</div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Custo Médio / Hora</CardTitle>
                                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{loadingData ? <Loader2 className="h-6 w-6 animate-spin"/> : formatCurrency(kpiData.avgCostPerHour)}</div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Distribuição por Vínculo Laboral</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ChartContainer config={{}} className="min-h-[250px] w-full">
                                                    <ResponsiveContainer>
                                                        <PieChart>
                                                            <ChartTooltipContent />
                                                            <Pie data={chartData.byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                                                {chartData.byType.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Legend />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </ChartContainer>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Top 5 Funções</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ChartContainer config={{}} className="h-64 w-full">
                                                    <ResponsiveContainer>
                                                        <RechartsBarChart data={chartData.byRole} layout="vertical" margin={{ left: 20, right: 20}}>
                                                            <XAxis type="number" hide />
                                                            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                                                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                                                            <Bar dataKey="value" name="Nº de Funcionários" fill="hsl(var(--chart-2))" radius={4} />
                                                        </RechartsBarChart>
                                                    </ResponsiveContainer>
                                                </ChartContainer>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Alocação por Projeto</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ChartContainer config={{}} className="h-64 w-full">
                                                    <ResponsiveContainer>
                                                        <RechartsBarChart data={chartData.byProject} layout="vertical" margin={{ left: 20, right: 20}}>
                                                            <XAxis type="number" hide />
                                                            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} interval={0} />
                                                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => `${value} funcionário(s)`} />} />
                                                            <Bar dataKey="value" name="Nº de Funcionários" fill="hsl(var(--chart-3))" radius={4} />
                                                        </RechartsBarChart>
                                                    </ResponsiveContainer>
                                                </ChartContainer>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <Card className="lg:col-span-3">
                                        <CardHeader>
                                            <CardTitle>Tendências Mensais de RH (Últimos 6 Meses)</CardTitle>
                                            <CardDescription>Evolução do número de funcionários e do custo salarial ao longo do tempo.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ChartContainer config={trendChartConfig} className="h-72 w-full">
                                                <ComposedChart data={trendsData}>
                                                    <CartesianGrid vertical={false} />
                                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12}/>
                                                    <YAxis yAxisId="left" orientation="left" stroke="var(--color-Custo Salarial)" tickFormatter={(value) => `${Number(value) / 1000}k`} />
                                                    <YAxis yAxisId="right" orientation="right" stroke="var(--color-Nº Funcionários)" />
                                                    <Tooltip content={<ChartTooltipContent formatter={(value, name) => name === 'Custo Salarial' ? formatCurrency(value as number) : String(value)} />} />
                                                    <Legend />
                                                    <Bar dataKey="Custo Salarial" fill="var(--color-Custo Salarial)" radius={4} yAxisId="left" />
                                                    <Line type="monotone" dataKey="Nº Funcionários" stroke="var(--color-Nº Funcionários)" strokeWidth={2} yAxisId="right" dot={false} />
                                                </ComposedChart>
                                            </ChartContainer>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Alertas de Documentação</CardTitle>
                                            <CardDescription>Documentos que expiram nos próximos 30 dias.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Funcionário</TableHead>
                                                        <TableHead>Documento</TableHead>
                                                        <TableHead>Data de Validade</TableHead>
                                                        <TableHead>Dias Restantes</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {loadingData ? <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="animate-spin"/></TableCell></TableRow> :
                                                    kpiData.expiringDocsList.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="h-24 text-center">Nenhum documento a expirar em breve.</TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        kpiData.expiringDocsList.map(({member, doc}, index) => {
                                                            const daysLeft = differenceInDays((doc.expiryDate as any).toDate(), new Date());
                                                            return (
                                                                <TableRow key={`${member.id}-${index}`}>
                                                                    <TableCell>{member.name}</TableCell>
                                                                    <TableCell>{doc.name}</TableCell>
                                                                    <TableCell>{format((doc.expiryDate as any).toDate(), 'dd/MM/yyyy')}</TableCell>
                                                                    <TableCell><Badge variant={daysLeft < 15 ? 'destructive' : 'secondary'}>{daysLeft} dias</Badge></TableCell>
                                                                </TableRow>
                                                            );
                                                        })
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            )}

                            {/* 5. QUADRO DE PESSOAL */}
                            {access.canViewCompanyWorkforce && (
                                <TabsContent value="workforce" className="pt-4">
                                    <CompanyWorkforceTab 
                                        initialWorkforce={sanitizedWorkforce}
                                        isLoading={loadingData}
                                        userRole={user.role as any} 
                                        projectId={null} 
                                    />
                                </TabsContent>
                            )}

                            {/* 6. GESTÃO DE SOLICITAÇÕES (WORKFLOW) */}
                            {(access.isManager || access.isDirector || access.isHrManager || access.isAdmin) && (
                                <TabsContent value="requests" className="pt-4">
                                    <HrRequestsWorkflow 
                                        requests={requests} 
                                        onRefresh={fetchHrData} 
                                        canApproveDirectly={access.isAdmin || access.isHrManager} 
                                    />
                                </TabsContent>
                            )}

                            {/* 7. DEPARTAMENTOS & EQUIPAS */}
                            {(access.isDirector || access.isHrManager || access.isAdmin) && (
                                <TabsContent value="departments" className="pt-4">
                                    <HrDepartmentsTab canManage={access.canManageDepartments} />
                                </TabsContent>
                            )}

                            {/* 8. FÉRIAS & AUSÊNCIAS (CALENDÁRIO & MAPA GERAL) */}
                            {(access.isHrManager || access.isAdmin) && (
                                <TabsContent value="leave" className="pt-4">
                                    <LeaveManagementTab />
                                </TabsContent>
                            )}

                            {/* 9. AVALIAÇÕES DE DESEMPENHO */}
                            {access.canManageEvaluations && (
                                <TabsContent value="performance" className="pt-4">
                                    <HrPerformanceTab workforce={sanitizedWorkforce} canManage={access.canManageEvaluations} />
                                </TabsContent>
                            )}

                            {/* 10. PROCESSAMENTO DE SALÁRIOS */}
                            {access.canViewPrivateFinancials && (
                                <TabsContent value="payroll" className="pt-4">
                                    <PayrollSummaryTab projectId="global" userRole={user.role as any} />
                                </TabsContent>
                            )}

                            {/* 11. FORMAÇÃO / MATRIZ DE TREINAMENTOS */}
                            {(access.isHrManager || access.isAdmin) && (
                                <TabsContent value="training" className="pt-4">
                                    <TrainingMatrixTab workforce={sanitizedWorkforce} loading={loadingData} />
                                </TabsContent>
                            )}

                            {/* 12. PLANEADOR DE RECURSOS */}
                            {(access.isHrManager || access.isAdmin || access.isManager) && (
                                <TabsContent value="planner" className="pt-4">
                                    <PlannerView />
                                </TabsContent>
                            )}

                            {/* 13. MATRIZ DE ACESSOS E GOVERNANÇA DE RH */}
                            {access.isAdmin && (
                                <TabsContent value="permissions" className="pt-4">
                                    <HrPermissionsTab />
                                </TabsContent>
                            )}
                        </Tabs>
                    </div>
                </TooltipProvider>
            </main>
        </div>
    );
}

export default function HrPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </main>
            </div>
        }>
            <HrContent />
        </Suspense>
    );
}
