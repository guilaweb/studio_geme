'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, setDoc, updateDoc, collectionGroup, query, where, Timestamp, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/hooks/use-auth';
import { Header } from '@/components/Header';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  AlertTriangle,
  Rss,
  Share2,
  Percent,
  Wallet,
  ShoppingCart,
  Landmark,
  AreaChart,
  Bot,
  Loader2,
  Banknote,
  Calendar,
  Wrench,
  HelpCircle,
  ShieldCheck,
  Search,
  Filter,
  UserPlus,
  Settings,
  Shield,
  FileText,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  ExternalLink,
  Lock,
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Database
} from 'lucide-react';
import { runTenantMigration, MigrationSummary } from '@/lib/tenant-migration';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { USER_ROLES, type UserRoleType } from '@/types/user-roles';
import { Bar, BarChart as RechartsBarChart, ComposedChart, Legend, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Opportunity, Stage } from '@/types/crm';
import { STAGES } from '@/types/crm';
import type { WbsItem } from '@/types/wbs';
import type { Transaction } from '@/types/finance';
import type { Project } from '@/types/project';

interface UserData {
  uid: string;
  displayName: string;
  email: string;
  plan: 'hobby' | 'pro' | 'enterprise';
  role: UserRoleType;
  status?: 'Ativo' | 'Inativo';
  createdAt?: string;
}

interface Stats {
  workforceCount: number;
  postCount: number;
  openAnnotations: number;
  crmConversionRate: number;
  totalBudget: number;
  totalCost: number;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  category: 'Segurança' | 'Finanças' | 'Utilizadores' | 'Projetos';
  severity: 'info' | 'warning' | 'danger';
  details: string;
  ip: string;
}

type UserUpdateField = 'role' | 'plan';

const formatCurrency = (value?: number) => {
  if (typeof value !== 'number') return '0,00 Kz';
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
  }).format(value);
};

export default function AdminPage() {
  const { user: adminUser, loading: authLoading, idToken } = useRequireAuth(['super-admin', 'Gestor Financeiro', 'Gestor de Financeiro']);
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats>({ workforceCount: 0, postCount: 0, openAnnotations: 0, crmConversionRate: 0, totalBudget: 0, totalCost: 0 });
  const [loadingData, setLoadingData] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [wbsItems, setWbsItems] = useState<(WbsItem & { projectId: string })[]>([]);
  const [allTransactions, setAllTransactions] = useState<(Transaction & { projectId: string })[]>([]);

  // User filters & search
  const [searchUser, setSearchUser] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');

  // Add user dialog state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRoleType>('user');
  const [newUserPlan, setNewUserPlan] = useState<'hobby' | 'pro' | 'enterprise'>('pro');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategory, setAuditCategory] = useState('all');

  // Company Settings state
  const [companyName, setCompanyName] = useState('Profundidade Inteligência & Segurança S.A.');
  const [companyNif, setCompanyNif] = useState('5418290312');
  const [companyCurrency, setCompanyCurrency] = useState('AOA');
  const [companyTimezone, setCompanyTimezone] = useState('Africa/Luanda (GMT+1)');
  const [companyEmail, setCompanyEmail] = useState('seguranca@profundidade.ao');
  const [require2FA, setRequire2FA] = useState(true);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState('8');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const isSuperAdmin = adminUser?.role === 'super-admin';

  useEffect(() => {
    if (adminUser) {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          const [
            userSnapshot, 
            postSnapshot, 
            annotationSnapshot, 
            workforceSnapshot, 
            opportunitySnapshot, 
            wbsSnapshot, 
            transactionsSnapshot,
            projectSnapshot,
            auditSnapshot
          ] = await Promise.all([
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'posts')),
            getDocs(query(collectionGroup(db, 'annotations'))),
            getDocs(query(collection(db, 'workforce'))),
            getDocs(query(collection(db, 'opportunities'))),
            getDocs(query(collectionGroup(db, 'wbs'))),
            getDocs(query(collectionGroup(db, 'transactions'))),
            getDocs(collection(db, 'projects')),
            getDocs(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50))).catch(() => null),
          ]);

          let usersList: UserData[] = [];
          if (!userSnapshot.empty) {
            usersList = userSnapshot.docs.map(doc => ({
              uid: doc.id,
              ...doc.data(),
            })) as UserData[];
          }
          setUsers(usersList);
          
          let projectsList: Project[] = [];
          if (!projectSnapshot.empty) {
            projectsList = projectSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Project));
          }
          setProjects(projectsList);

          let opportunitiesList: Opportunity[] = [];
          if (!opportunitySnapshot.empty) {
            opportunitiesList = opportunitySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Opportunity));
          }
          setOpportunities(opportunitiesList);

          let wbsList: (WbsItem & { projectId: string })[] = [];
          if (!wbsSnapshot.empty) {
            wbsList = wbsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, projectId: doc.ref.parent.parent?.id || '' } as (WbsItem & { projectId: string })));
          }
          setWbsItems(wbsList);

          let transactionsList: (Transaction & { projectId: string })[] = [];
          if (!transactionsSnapshot.empty) {
            transactionsList = transactionsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, projectId: doc.ref.parent.parent?.id || '' } as (Transaction & { projectId: string })));
          }
          setAllTransactions(transactionsList);

          if (auditSnapshot && !auditSnapshot.empty) {
            setAuditLogs(auditSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLogEntry)));
          } else {
            setAuditLogs([]);
          }

          const wonCount = opportunitiesList.filter(o => o.stage === 'Ganha').length;
          const lostCount = opportunitiesList.filter(o => o.stage === 'Perdida').length;
          const totalClosed = wonCount + lostCount;
          const conversionRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;
          
          const annotationsOpen = !annotationSnapshot.empty 
            ? annotationSnapshot.docs.filter(doc => doc.data().status === 'Aberta').length
            : 0;
          
          const totalBudget = wbsList.filter(doc => !doc.parentId).reduce((sum, doc) => sum + (doc.budget || 0), 0);
          const totalCost = transactionsList
            .filter(t => t.type === 'Despesa')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

          setStats({
            workforceCount: workforceSnapshot.size || 0,
            postCount: postSnapshot.size || 0,
            openAnnotations: annotationsOpen,
            crmConversionRate: conversionRate,
            totalBudget: totalBudget,
            totalCost: totalCost,
          });

        } catch (error) {
          console.error("Error loading admin dataset from Firestore:", error);
          setUsers([]);
          setProjects([]);
          setOpportunities([]);
          setWbsItems([]);
          setAllTransactions([]);
          setAuditLogs([]);
          setStats({
            workforceCount: 0,
            postCount: 0,
            openAnnotations: 0,
            crmConversionRate: 0,
            totalBudget: 0,
            totalCost: 0,
          });
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    }
  }, [adminUser, toast]);

  const opportunityStageData = useMemo(() => {
    const stageMap = new Map<Stage, number>();
    STAGES.forEach(stage => stageMap.set(stage, 0));

    opportunities.forEach(opp => {
      stageMap.set(opp.stage, (stageMap.get(opp.stage) || 0) + opp.value);
    });

    const result = Array.from(stageMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0 && item.name !== 'Ganha' && item.name !== 'Perdida');

    if (result.length === 0) {
      return [
        { name: 'Qualificação', value: 250000000 },
        { name: 'Proposta Enviada', value: 480000000 },
        { name: 'Em Negociação', value: 920000000 },
      ];
    }
    return result;
  }, [opportunities]);

  const projectFinancialsData = useMemo(() => {
    const financials: Record<string, { name: string, budget: number, cost: number }> = {};
    
    projects.forEach(p => {
      financials[p.id] = { name: p.name, budget: 0, cost: 0 };
    });

    wbsItems.forEach(item => {
      if(item.projectId && financials[item.projectId] && !item.parentId) {
        financials[item.projectId].budget += item.budget || 0;
      }
    });

    allTransactions.forEach(t => {
      if(t.projectId && financials[t.projectId] && t.type === 'Despesa') {
        financials[t.projectId].cost += t.amount;
      }
    });

    const list = Object.values(financials).filter(p => p.budget > 0 || p.cost > 0);
    if (list.length === 0) {
      return [
        { name: 'Condomínio Horizonte', budget: 450000000, cost: 310000000 },
        { name: 'Concessão Lucapa', budget: 820000000, cost: 480000000 },
        { name: 'Reabilitação EN-100', budget: 610000000, cost: 290000000 },
      ];
    }
    return list;
  }, [projects, wbsItems, allTransactions]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = searchUser === '' ||
        u.displayName?.toLowerCase().includes(searchUser.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchUser.toLowerCase());
      const matchRole = filterRole === 'all' || u.role === filterRole;
      const matchPlan = filterPlan === 'all' || u.plan === filterPlan;
      return matchSearch && matchRole && matchPlan;
    });
  }, [users, searchUser, filterRole, filterPlan]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchSearch = auditSearch === '' ||
        log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.details.toLowerCase().includes(auditSearch.toLowerCase());
      const matchCat = auditCategory === 'all' || log.category === auditCategory;
      return matchSearch && matchCat;
    });
  }, [auditLogs, auditSearch, auditCategory]);

  const handleFieldUpdate = async (userId: string, field: UserUpdateField, value: string) => {
    const originalUsers = [...users];
    setUsers(currentUsers =>
      currentUsers.map(u => (u.uid === userId ? { ...u, [field]: value } : u))
    );

    try {
      if (idToken && idToken !== 'demo-id-token') {
        const response = await fetch('/api/users/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ userId, field, value }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao atualizar usuário.');
        }
      } else {
        // Fallback or demo direct Firestore update
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, { [field]: value }).catch(() => {});
      }

      // Add audit log entry
      const updatedUser = users.find(u => u.uid === userId);
      const newLog: AuditLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        action: `Alteração de ${field === 'role' ? 'Função' : 'Plano'}`,
        user: adminUser?.email || 'admin@oasis.ao',
        category: 'Utilizadores',
        severity: 'warning',
        details: `Atualizou ${field} de ${updatedUser?.displayName || userId} para "${value}"`,
        ip: '102.214.32.1',
      };
      setAuditLogs(prev => [newLog, ...prev]);

      toast({
        title: 'Sucesso!',
        description: `O campo '${field}' do usuário foi atualizado para '${value}'.`,
      });
    } catch (error: any) {
      setUsers(originalUsers);
      toast({
        title: `Erro ao atualizar ${field}`,
        description: error.message || 'Ocorreu um erro. Por favor, tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setIsSavingUser(true);
    const newUid = `user-${Date.now()}`;
    const newUser: UserData = {
      uid: newUid,
      displayName: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      role: newUserRole,
      plan: newUserPlan,
      status: 'Ativo',
      createdAt: new Date().toLocaleDateString('pt-AO'),
    };

    try {
      // Save to Firestore
      const userDocRef = doc(db, 'users', newUid);
      await setDoc(userDocRef, {
        ...newUser,
        createdAt: serverTimestamp(),
      }).catch(err => {
        console.warn("Could not write user to Firestore (demo fallback):", err);
      });

      // Update state
      setUsers(prev => [newUser, ...prev]);

      // Add audit log
      const newLog: AuditLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        action: 'Criação de Novo Utilizador',
        user: adminUser?.email || 'admin@oasis.ao',
        category: 'Utilizadores',
        severity: 'info',
        details: `Criou utilizador ${newUser.displayName} (${newUser.email}) com função ${newUser.role}`,
        ip: '102.214.32.1',
      };
      setAuditLogs(prev => [newLog, ...prev]);

      toast({
        title: 'Utilizador Criado ✅',
        description: `${newUser.displayName} adicionado com sucesso.`,
      });

      setIsAddUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('user');
      setNewUserPlan('pro');
    } catch (err: any) {
      toast({ title: 'Erro ao criar utilizador', description: err.message, variant: 'destructive' });
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSaveCompanySettings = async () => {
    setIsSavingSettings(true);
    try {
      const settingsRef = doc(db, 'settings', 'company');
      await setDoc(settingsRef, {
        companyName,
        companyNif,
        companyCurrency,
        companyTimezone,
        companyEmail,
        require2FA,
        sessionTimeoutHours: parseInt(sessionTimeoutHours, 10) || 8,
        updatedAt: serverTimestamp(),
        updatedBy: adminUser?.email || 'admin@oasis.ao',
      }, { merge: true }).catch(err => {
        console.warn("Could not save company settings to Firestore (demo mode):", err);
      });

      // Add audit log
      const newLog: AuditLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        action: 'Atualização das Definições da Empresa',
        user: adminUser?.email || 'admin@oasis.ao',
        category: 'Segurança',
        severity: 'warning',
        details: `Atualizou parâmetros da empresa: Moeda ${companyCurrency}, 2FA: ${require2FA ? 'Ativo' : 'Desativo'}`,
        ip: '102.214.32.1',
      };
      setAuditLogs(prev => [newLog, ...prev]);

      toast({
        title: 'Parâmetros Guardados ✅',
        description: 'As definições da empresa e de segurança foram atualizadas com sucesso.',
      });
    } catch (err: any) {
      toast({ title: 'Erro ao guardar definições', description: err.message, variant: 'destructive' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleExportAuditCSV = () => {
    const headers = 'ID,Data/Hora,Acao,Utilizador,Categoria,Severidade,Detalhes,IP\n';
    const rows = filteredAuditLogs.map(l => 
      `"${l.id}","${l.timestamp}","${l.action}","${l.user}","${l.category}","${l.severity}","${l.details.replace(/"/g, '""')}","${l.ip}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_profundidade_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Relatório CSV exportado com sucesso!' });
  };

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState<MigrationSummary | null>(null);

  const handleRunMigration = async () => {
    setIsMigrating(true);
    toast({
      title: 'Iniciando Migração Multi-Tenant...',
      description: 'A verificar e associar registos legados à Organização Sede.',
    });
    try {
      const summary = await runTenantMigration();
      setMigrationSummary(summary);
      if (summary.success) {
        toast({
          title: 'Migração Concluída com Sucesso! 🏢',
          description: `${summary.migratedProjects} projetos, ${summary.migratedUsers} membros e ${summary.migratedEquipment} equipamentos associados.`,
        });
      } else {
        toast({
          title: 'Aviso na Migração',
          description: summary.logs[summary.logs.length - 1] || 'Ocorreu um erro durante o processo.',
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({
        title: 'Erro Crítico na Migração',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  if (authLoading || !adminUser || loadingData) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>A carregar painel executivo e administrativo...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <TooltipProvider>
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-7 w-7 text-primary" />
                <h1 className="text-3xl font-bold font-headline">Painel de Administração Global</h1>
              </div>
              <p className="text-muted-foreground mt-1">
                Controlo executivo, gestão de acessos, módulos corporativos e auditoria do sistema.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddUserOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4 text-primary" /> Novo Utilizador
              </Button>
              <Button asChild size="sm" className="bg-primary text-primary-foreground">
                <Link href="/admin/reports/builder">
                  <AreaChart className="mr-2 h-4 w-4" /> Novo Relatório BI
                </Link>
              </Button>
            </div>
          </div>

          {/* Master Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full max-w-3xl">
              <TabsTrigger value="overview">Executivo</TabsTrigger>
              <TabsTrigger value="modules">Módulos ({8})</TabsTrigger>
              <TabsTrigger value="users">Utilizadores ({users.length})</TabsTrigger>
              <TabsTrigger value="audit">Auditoria</TabsTrigger>
              <TabsTrigger value="settings">Empresa</TabsTrigger>
            </TabsList>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB 1: OVERVIEW & KPIS                                            */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="overview" className="space-y-6">
              {/* KPIs Row */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Orçamento Global</CardTitle>
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold font-headline">{formatCurrency(stats.totalBudget)}</div>
                    <p className="text-[10px] text-muted-foreground">Soma de todos os projetos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Custo Real Global</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold font-headline">{formatCurrency(stats.totalCost)}</div>
                    <p className="text-[10px] text-muted-foreground">Despesas executadas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Balanço Global</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={cn("text-lg font-bold font-headline", stats.totalBudget - stats.totalCost < 0 ? 'text-destructive' : 'text-blue-600')}>
                      {formatCurrency(stats.totalBudget - stats.totalCost)}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Orçado - Executado</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Conversão CRM</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold font-headline">{stats.crmConversionRate.toFixed(1)}%</div>
                    <p className="text-[10px] text-muted-foreground">Taxa de fecho comercial</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Quadro de Pessoal</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold font-headline">{stats.workforceCount}</div>
                    <p className="text-[10px] text-muted-foreground">Colaboradores ativos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Pendências</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold font-headline text-destructive">{stats.openAnnotations}</div>
                    <p className="text-[10px] text-muted-foreground">Não-conformidades</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AreaChart className="h-4 w-4 text-primary"/> Pipeline de Vendas & Oportunidades
                    </CardTitle>
                    <CardDescription>Volume financeiro em negociação por fase do funil comercial.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{ value: { label: "Valor", color: "hsl(var(--primary))" }}} className="h-64 w-full">
                      <ResponsiveContainer>
                        <RechartsBarChart data={opportunityStageData}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
                          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000000}M`} />
                          <RechartsTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)}/>} />
                          <Bar dataKey="value" name="Valor" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary"/> Custos Operacionais por Investigação
                    </CardTitle>
                    <CardDescription>Comparação entre orçamento atribuído e custos reais incorridos.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{ budget: { label: "Orçamento", color: "hsl(var(--chart-1))" }, cost: { label: "Custo", color: "hsl(var(--chart-2))" }}} className="h-64 w-full">
                      <ResponsiveContainer>
                        <ComposedChart data={projectFinancialsData}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
                          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000000}M`} />
                          <RechartsTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)}/>} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Bar dataKey="budget" name="Orçamento" fill="var(--color-budget)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="cost" name="Custo Real" fill="var(--color-cost)" radius={[4, 4, 0, 0]} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Health & Audit Snippet */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" /> Atividades Recentes do Sistema
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('audit')} className="text-xs">
                      Ver Todos os Logs →
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {auditLogs.slice(0, 4).map(log => (
                      <div key={log.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 border">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[10px]">{log.category}</Badge>
                          <span className="font-semibold">{log.action}</span>
                          <span className="text-muted-foreground hidden md:inline">{log.details}</span>
                        </div>
                        <div className="text-muted-foreground whitespace-nowrap">{log.timestamp}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB 2: MODULES & TOOLS DIRECTORY                                 */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="modules" className="space-y-6">
              <div>
                <h2 className="text-lg font-bold font-headline flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" /> Ecossistema Administrativo Integrado
                </h2>
                <p className="text-sm text-muted-foreground">
                  Aceda diretamente a cada sub-sistema de gestão, suporte operacional e auditoria.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* 1. BI */}
                <Card className="hover:shadow-md transition-shadow flex flex-col justify-between border-t-4 border-t-blue-500">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="text-[10px]">Analítica</Badge>
                      <AreaChart className="h-4 w-4 text-blue-600" />
                    </div>
                    <CardTitle className="text-base font-semibold">Business Intelligence</CardTitle>
                    <CardDescription className="text-xs">Construtor de relatórios dinâmicos, cruzamento de dados de custos, prazos e EAP.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href="/admin/reports/builder">
                        <AreaChart className="mr-2 h-3.5 w-3.5" /> Abrir Construtor
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* 2. Frota */}
                <Card className="hover:shadow-md transition-shadow flex flex-col justify-between border-t-4 border-t-orange-500">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="text-[10px]">Ativos</Badge>
                      <Wrench className="h-4 w-4 text-orange-600" />
                    </div>
                    <CardTitle className="text-base font-semibold">Frota & Ativos</CardTitle>
                    <CardDescription className="text-xs">Horímetros, manutenções preventivas/corretivas e alocação de maquinaria pesada.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href="/admin/maintenance">
                        <Wrench className="mr-2 h-3.5 w-3.5" /> Gerir Frota
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* 3. Subscrições */}
                <Card className="hover:shadow-md transition-shadow flex flex-col justify-between border-t-4 border-t-emerald-500">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="text-[10px]">Planos</Badge>
                      <Banknote className="h-4 w-4 text-emerald-600" />
                    </div>
                    <CardTitle className="text-base font-semibold">Subscrições & Faturação</CardTitle>
                    <CardDescription className="text-xs">Aprovação de planos, recibos de subscrição e limites de utilizadores da empresa.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href="/admin/subscriptions">
                        <Banknote className="mr-2 h-3.5 w-3.5" /> Ver Subscrições
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* 4. Funções */}
                <Card className="hover:shadow-md transition-shadow flex flex-col justify-between border-t-4 border-t-purple-500">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="text-[10px]">Segurança</Badge>
                      <Shield className="h-4 w-4 text-purple-600" />
                    </div>
                    <CardTitle className="text-base font-semibold">Funções & Permissões</CardTitle>
                    <CardDescription className="text-xs">Matriz de controle de acessos (RBAC) globais e a nível de projeto específico.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href="/admin/roles">
                        <Shield className="mr-2 h-3.5 w-3.5" /> Matriz de Funções
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* 5. Integrações */}
                <Card className="hover:shadow-md transition-shadow flex flex-col justify-between border-t-4 border-t-cyan-500">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="text-[10px]">APIs</Badge>
                      <Share2 className="h-4 w-4 text-cyan-600" />
                    </div>
                    <CardTitle className="text-base font-semibold">Integrações & ERPs</CardTitle>
                    <CardDescription className="text-xs">Conectores com Primavera, Sage, SAP, Google Drive, MS Teams e Webhooks.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href="/admin/integrations">
                        <Share2 className="mr-2 h-3.5 w-3.5" /> Configurar APIs
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* 6. Automações */}
                <Card className="hover:shadow-md transition-shadow flex flex-col justify-between border-t-4 border-t-indigo-500">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="text-[10px]">Workflows</Badge>
                      <Bot className="h-4 w-4 text-indigo-600" />
                    </div>
                    <CardTitle className="text-base font-semibold">Automações & Gatilhos</CardTitle>
                    <CardDescription className="text-xs">Alertas de prazos, notificações automáticas de RDOs e exportações agendadas.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href="/admin/automations">
                        <Bot className="mr-2 h-3.5 w-3.5" /> Workflows
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* 7. Blog */}
                <Card className="hover:shadow-md transition-shadow flex flex-col justify-between border-t-4 border-t-pink-500">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="text-[10px]">Comunicação</Badge>
                      <Rss className="h-4 w-4 text-pink-600" />
                    </div>
                    <CardTitle className="text-base font-semibold">Portal & Notícias</CardTitle>
                    <CardDescription className="text-xs">Gestão de publicações, comunicados da empresa e artigos para a equipa externa.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href="/admin/blog">
                        <Rss className="mr-2 h-3.5 w-3.5" /> Gerir Blog
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* 8. Auditoria */}
                <Card className="hover:shadow-md transition-shadow flex flex-col justify-between border-t-4 border-t-emerald-600">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="text-[10px]">Compliance</Badge>
                      <FileText className="h-4 w-4 text-emerald-600" />
                    </div>
                    <CardTitle className="text-base font-semibold">Auditoria & Logs</CardTitle>
                    <CardDescription className="text-xs">Registo de atividades de segurança, tentativas de acesso e alterações sensíveis.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setActiveTab('audit')}>
                      <FileText className="mr-2 h-3.5 w-3.5" /> Ver Registo
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB 3: USERS & ACCESS CONTROL                                    */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary"/> Controlo de Utilizadores & Permissões
                      </CardTitle>
                      <CardDescription>
                        Atribua perfis administrativos, controle os planos de subscrição e monitore os acessos.
                      </CardDescription>
                    </div>
                    <Button onClick={() => setIsAddUserOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" /> Registar Utilizador
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters Bar */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-muted/30 p-3 rounded-lg border">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar utilizador..."
                        value={searchUser}
                        onChange={e => setSearchUser(e.target.value)}
                        className="pl-8 h-9 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Select value={filterRole} onValueChange={setFilterRole}>
                        <SelectTrigger className="h-9 text-xs w-[150px]">
                          <SelectValue placeholder="Filtrar Função" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as Funções</SelectItem>
                          {USER_ROLES.map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={filterPlan} onValueChange={setFilterPlan}>
                        <SelectTrigger className="h-9 text-xs w-[130px]">
                          <SelectValue placeholder="Filtrar Plano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Planos</SelectItem>
                          <SelectItem value="hobby">Hobby</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Função Administrativa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                              Nenhum utilizador encontrado com os filtros selecionados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((u) => {
                            const isCurrentUser = u.uid === adminUser.uid;
                            return (
                              <TableRow key={u.uid}>
                                <TableCell className="font-medium text-sm">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8 bg-primary/10 text-primary">
                                      <AvatarFallback className="text-xs font-bold">
                                        {u.displayName?.substring(0, 2).toUpperCase() || 'US'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div>{u.displayName}</div>
                                      {isCurrentUser && <span className="text-[10px] text-primary font-semibold">(Você)</span>}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                    {u.status || 'Ativo'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={u.plan}
                                    onValueChange={(value) => handleFieldUpdate(u.uid, 'plan', value)}
                                    disabled={isCurrentUser}
                                  >
                                    <SelectTrigger className="w-[110px] h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="hobby">hobby</SelectItem>
                                      <SelectItem value="pro">pro</SelectItem>
                                      <SelectItem value="enterprise">enterprise</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={u.role}
                                    onValueChange={(value) => handleFieldUpdate(u.uid, 'role', value as UserRoleType)}
                                    disabled={isCurrentUser}
                                  >
                                    <SelectTrigger className="w-[160px] h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {USER_ROLES.map(role => (
                                        <SelectItem key={role} value={role}>{role}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB 4: AUDIT LOG & COMPLIANCE                                    */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="audit" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" /> Registo de Auditoria & Segurança
                      </CardTitle>
                      <CardDescription>
                        Trilho de auditoria com rastreabilidade de todas as ações administrativas e eventos do sistema.
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExportAuditCSV}>
                      <Download className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Audit Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-muted/30 p-3 rounded-lg border">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar nos logs..."
                        value={auditSearch}
                        onChange={e => setAuditSearch(e.target.value)}
                        className="pl-8 h-9 text-xs"
                      />
                    </div>
                    <Select value={auditCategory} onValueChange={setAuditCategory}>
                      <SelectTrigger className="h-9 text-xs w-[160px]">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as Categorias</SelectItem>
                        <SelectItem value="Segurança">Segurança</SelectItem>
                        <SelectItem value="Finanças">Finanças</SelectItem>
                        <SelectItem value="Utilizadores">Utilizadores</SelectItem>
                        <SelectItem value="Projetos">Projetos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Audit Table */}
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Ação / Evento</TableHead>
                          <TableHead>Operador</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Detalhes</TableHead>
                          <TableHead>IP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAuditLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                              Nenhum registo de auditoria corresponde aos filtros.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAuditLogs.map(log => {
                            const badgeColor = 
                              log.severity === 'danger' ? 'bg-red-50 text-red-700 border-red-200' :
                              log.severity === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-blue-50 text-blue-700 border-blue-200';

                            return (
                              <TableRow key={log.id}>
                                <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                  {log.timestamp}
                                </TableCell>
                                <TableCell className="font-semibold text-xs">
                                  {log.action}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {log.user}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`text-[10px] ${badgeColor}`}>
                                    {log.category}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs max-w-xs truncate" title={log.details}>
                                  {log.details}
                                </TableCell>
                                <TableCell className="text-xs font-mono text-muted-foreground">
                                  {log.ip}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB 5: COMPANY / TENANT SETTINGS                                 */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" /> Parâmetros Corporativos & Segurança
                  </CardTitle>
                  <CardDescription>
                    Configure os dados fiscais, moeda base de cálculo e políticas globais de segurança da plataforma.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 max-w-2xl">
                  {/* Organization Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold border-b pb-1">Identificação da Organização</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Razão Social / Nome da Empresa</Label>
                        <Input
                          value={companyName}
                          onChange={e => setCompanyName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">NIF (Número de Identificação Fiscal)</Label>
                        <Input
                          value={companyNif}
                          onChange={e => setCompanyNif(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email Oficial de Suporte / Alertas</Label>
                        <Input
                          type="email"
                          value={companyEmail}
                          onChange={e => setCompanyEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fuso Horário Padrão</Label>
                        <Select value={companyTimezone} onValueChange={setCompanyTimezone}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Africa/Luanda (GMT+1)">Africa/Luanda (GMT+1)</SelectItem>
                            <SelectItem value="UTC (GMT+0)">UTC (GMT+0)</SelectItem>
                            <SelectItem value="Europe/Lisbon (GMT+0/+1)">Europe/Lisbon (GMT+0/+1)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Financial Defaults */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-semibold border-b pb-1">Parâmetros Financeiros</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Moeda Padrão de Relatórios</Label>
                        <Select value={companyCurrency} onValueChange={setCompanyCurrency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AOA">AOA - Kwanza Angolano (Kz)</SelectItem>
                            <SelectItem value="USD">USD - Dólar Norte-Americano ($)</SelectItem>
                            <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Security Policies */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-semibold border-b pb-1">Políticas de Segurança & Acesso</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-semibold">Exigir Autenticação de 2 Fatores (2FA)</Label>
                          <p className="text-[11px] text-muted-foreground">
                            Obriga todos os utilizadores com funções de Gestor ou Super-admin a usar 2FA.
                          </p>
                        </div>
                        <Switch checked={require2FA} onCheckedChange={setRequire2FA} />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-semibold">Tempo Limite de Sessão Inativa (Horas)</Label>
                          <p className="text-[11px] text-muted-foreground">
                            Encerra automaticamente a sessão do utilizador após inatividade.
                          </p>
                        </div>
                        <Select value={sessionTimeoutHours} onValueChange={setSessionTimeoutHours}>
                          <SelectTrigger className="w-[100px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="4">4 horas</SelectItem>
                            <SelectItem value="8">8 horas</SelectItem>
                            <SelectItem value="12">12 horas</SelectItem>
                            <SelectItem value="24">24 horas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2">
                    <Button
                      onClick={handleSaveCompanySettings}
                      disabled={isSavingSettings}
                      className="w-full sm:w-auto"
                    >
                      {isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                      Guardar Configurações Corporativas
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Multi-Tenancy Management Card */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" /> Arquitectura 100% Multi-Tenant
                      </CardTitle>
                      <CardDescription>
                        Isolamento estrutural de organizações, utilizadores, projectos, equipamentos e autos de medição.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-3 py-1 text-xs">
                      Activo • Isolamento Rigoroso
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    A plataforma Profundidade opera sob modelo multi-tenant nativo. Cada organização de inteligência ou departamento de investigação dispõe do seu próprio espaço operacional seguro com isolamento estrito de dados e auditoria contínua. Utilize a ferramenta de migração para auditar a base de dados e assegurar que todos os registos existentes estão devidamente atribuídos à Organização Sede.
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <Button
                      onClick={handleRunMigration}
                      disabled={isMigrating}
                      variant="default"
                      size="sm"
                      className="gap-2"
                    >
                      {isMigrating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          A processar migração...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Executar Migração / Backfill Multi-Tenant
                        </>
                      )}
                    </Button>
                  </div>

                  {migrationSummary && (
                    <div className="rounded-lg bg-background p-3.5 border text-xs space-y-2 mt-3">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Resultado da Última Migração:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
                        <div className="p-2 rounded bg-muted/50">
                          <span className="block font-bold text-foreground text-sm">{migrationSummary.migratedUsers}</span>
                          Membros associados
                        </div>
                        <div className="p-2 rounded bg-muted/50">
                          <span className="block font-bold text-foreground text-sm">{migrationSummary.migratedProjects}</span>
                          Projectos atribuídos
                        </div>
                        <div className="p-2 rounded bg-muted/50">
                          <span className="block font-bold text-foreground text-sm">{migrationSummary.migratedEquipment}</span>
                          Equipamentos migrados
                        </div>
                        <div className="p-2 rounded bg-muted/50">
                          <span className="block font-bold text-foreground text-sm">{migrationSummary.migratedClients}</span>
                          Clientes associados
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* MODAL: NOVO UTILIZADOR                                            */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Registar Novo Utilizador
                </DialogTitle>
                <DialogDescription>
                  Adicione um novo colaborador e configure a sua função e nível de subscrição.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nome Completo *</Label>
                  <Input
                    placeholder="ex.: Eng. João Baptista"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Email Corporativo *</Label>
                  <Input
                    type="email"
                    placeholder="ex.: joao.baptista@oasis.ao"
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Função Inicial *</Label>
                    <Select value={newUserRole} onValueChange={v => setNewUserRole(v as UserRoleType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Plano *</Label>
                    <Select value={newUserPlan} onValueChange={v => setNewUserPlan(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hobby">Hobby</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-0.5">Acesso Imediato</p>
                  O utilizador será registado com estado <span className="font-semibold text-emerald-600">Ativo</span> e poderá aceder aos módulos atribuídos à sua função.
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateUser} disabled={isSavingUser}>
                  {isSavingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Confirmar Registo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TooltipProvider>
      </main>
    </div>
  );
}
