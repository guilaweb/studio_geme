
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, updateDoc, collectionGroup, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/Header';
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
import { useToast } from '@/hooks/use-toast';
import { Users, AlertCircle, CheckCircle, Rss, Edit, Share2, Target, Percent, Wallet, ShoppingCart, Landmark, AreaChart, Bot, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';


interface UserData {
  uid: string;
  displayName: string;
  email: string;
  plan: 'hobby' | 'pro' | 'enterprise';
  role: 'user' | 'super-admin' | 'cliente';
}

interface Stats {
  workforceCount: number;
  postCount: number;
  openAnnotations: number;
  crmConversionRate: number;
  totalBudget: number;
  totalCost: number;
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
  const { user: adminUser, loading: authLoading, idToken } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats>({ workforceCount: 0, postCount: 0, openAnnotations: 0, crmConversionRate: 0, totalBudget: 0, totalCost: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser || adminUser.role !== 'super-admin') {
        router.push('/');
      }
    }
  }, [adminUser, authLoading, router]);

  useEffect(() => {
    if (adminUser && adminUser.role === 'super-admin') {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          const usersCollection = collection(db, 'users');
          const postsCollection = collection(db, 'posts');
          const annotationsQuery = query(collectionGroup(db, 'annotations'));
          const workforceQuery = query(collection(db, 'workforce'));
          const opportunitiesQuery = query(collection(db, 'opportunities'));
          const wbsQuery = query(collectionGroup(db, 'wbs'));
          const transactionsQuery = query(collectionGroup(db, 'transactions'));


          const [userSnapshot, postSnapshot, annotationSnapshot, workforceSnapshot, opportunitySnapshot, wbsSnapshot, transactionsSnapshot] = await Promise.all([
            getDocs(usersCollection),
            getDocs(postsCollection),
            getDocs(annotationsQuery),
            getDocs(workforceQuery),
            getDocs(opportunitiesQuery),
            getDocs(wbsQuery),
            getDocs(transactionsQuery),
          ]);

          const usersList = userSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
          })) as UserData[];
          setUsers(usersList);

          const wonCount = opportunitySnapshot.docs.filter(doc => doc.data().stage === 'Ganha').length;
          const lostCount = opportunitySnapshot.docs.filter(doc => doc.data().stage === 'Perdida').length;
          const totalClosed = wonCount + lostCount;
          const conversionRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;
          
          let annotationsOpen = 0;
          annotationSnapshot.forEach(doc => {
            if (doc.data().status === 'Aberta') {
              annotationsOpen++;
            }
          });
          
          const totalBudget = wbsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().budget || 0), 0);
          const totalCost = transactionsSnapshot.docs
            .filter(doc => doc.data().type === 'Despesa')
            .reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

          setStats({
            workforceCount: workforceSnapshot.size,
            postCount: postSnapshot.size,
            openAnnotations: annotationsOpen,
            crmConversionRate: conversionRate,
            totalBudget: totalBudget,
            totalCost: totalCost,
          });

        } catch (error) {
          console.error("Error fetching admin data:", error);
          toast({
            title: 'Erro ao buscar dados',
            description: 'Não foi possível carregar os dados para o painel de administração.',
            variant: 'destructive',
          });
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    }
  }, [adminUser, toast]);

  const handleFieldUpdate = async (userId: string, field: UserUpdateField, value: string) => {
    const originalUsers = [...users];
    setUsers(currentUsers =>
      currentUsers.map(u => (u.uid === userId ? { ...u, [field]: value } : u))
    );

    try {
      if (!idToken) {
        throw new Error('Token de autenticação não encontrado.');
      }
      const response = await fetch('/api/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ userId, field, value }),
      });

      if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            // If response is not JSON, use the status text
            throw new Error(response.statusText || 'Falha ao atualizar usuário.');
        }
        throw new Error(errorData.error || 'Falha ao atualizar usuário.');
      }

      toast({
        title: 'Sucesso!',
        description: `O campo '${field}' do usuário foi atualizado.`,
      });
    } catch (error: any) {
      setUsers(originalUsers);
      console.error(`Error updating user ${field}:`, error);
      toast({
        title: `Erro ao atualizar ${field}`,
        description: error.message || 'Ocorreu um erro. Por favor, tente novamente.',
        variant: 'destructive',
      });
    }
  };
  
  if (authLoading || !adminUser || adminUser.role !== 'super-admin' || loadingData) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p>Carregando...</p>
        </main>
      </div>
    );
  }

  const getPlanVariant = (plan: UserData['plan']) => {
    switch (plan) {
      case 'pro': return 'default';
      case 'enterprise': return 'secondary';
      case 'hobby': default: return 'outline';
    }
  };

  const getRoleVariant = (role: UserData['role']) => {
    switch (role) {
      case 'super-admin': return 'destructive';
      case 'cliente': return 'default';
      case 'user': default: return 'secondary';
    }
  };


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Dashboard Executivo</h1>
          <p className="text-muted-foreground">Visão geral e KPIs de toda a plataforma.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orçamento Global</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{loadingData ? '...' : formatCurrency(stats.totalBudget)}</div>
               <p className="text-xs text-muted-foreground">Soma de todos os projetos.</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Real Global</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-xl font-bold">{loadingData ? '...' : formatCurrency(stats.totalCost)}</div>
                 <p className="text-xs text-muted-foreground">Soma de todas as despesas.</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balanço Global</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${stats.totalBudget - stats.totalCost < 0 ? 'text-destructive' : ''}`}>{loadingData ? '...' : formatCurrency(stats.totalBudget - stats.totalCost)}</div>
              <p className="text-xs text-muted-foreground">Orçamento - Custo Real.</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso (CRM)</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-xl font-bold">{loadingData ? '...' : `${stats.crmConversionRate.toFixed(1)}%`}</div>
                 <p className="text-xs text-muted-foreground">Percentagem de negócios ganhos.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Colaboradores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{loadingData ? '...' : stats.workforceCount}</div>
               <p className="text-xs text-muted-foreground">Membros no quadro geral.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendências Abertas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{loadingData ? '...' : stats.openAnnotations}</div>
              <p className="text-xs text-muted-foreground">Em todos os seus projetos.</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-8">
            <section>
                 <h2 className="text-2xl font-semibold font-headline mb-4">Análise e Gestão</h2>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Construtor de Relatórios (BI)</CardTitle>
                            <CardDescription>Crie relatórios personalizados cruzando dados de múltiplos projetos e módulos.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild>
                                <Link href="/admin/reports/builder">
                                    <AreaChart className="mr-2 h-4 w-4"/>
                                    Criar Relatório
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Automações</CardTitle>
                            <CardDescription>Crie e gira fluxos de trabalho para automatizar tarefas repetitivas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild>
                                <Link href="/admin/automations">
                                    <Bot className="mr-2 h-4 w-4"/>
                                    Gerir Automações
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Gestão de Conteúdo</CardTitle>
                            <CardDescription>Crie e edite os artigos para o blog público.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild>
                                <Link href="/admin/blog">Gerir Blog</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-semibold font-headline mb-4">Configurações e Utilizadores</h2>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Integrações &amp; API</CardTitle>
                                <CardDescription>Conecte o Geme a outras ferramentas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild>
                                <Link href="/admin/integrations">
                                    <Share2 className="mr-2 h-4 w-4"/>
                                    Gerir Integrações
                                </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="lg:row-span-2">
                        <CardHeader>
                            <CardTitle>Gestão de Utilizadores</CardTitle>
                            <CardDescription>Visualize e edite os planos e funções dos utilizadores.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingData ? (
                            <p>Carregando utilizadores...</p>
                            ) : (
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Plano</TableHead>
                                    <TableHead>Função</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {users.map((u) => (
                                    <TableRow key={u.uid}>
                                    <TableCell className="font-medium">{u.displayName}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>
                                        <Select
                                        value={u.plan}
                                        onValueChange={(value) => handleFieldUpdate(u.uid, 'plan', value)}
                                        disabled={u.uid === adminUser.uid} // Disable changing own plan
                                        >
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue>
                                            <Badge variant={getPlanVariant(u.plan)}>{u.plan}</Badge>
                                            </SelectValue>
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
                                        onValueChange={(value) => handleFieldUpdate(u.uid, 'role', value)}
                                        disabled={u.uid === adminUser.uid} // Disable changing own role
                                        >
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue>
                                            <Badge variant={getRoleVariant(u.role)}>
                                                {u.role}
                                            </Badge>
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">user</SelectItem>
                                            <SelectItem value="cliente">cliente</SelectItem>
                                            <SelectItem value="super-admin">super-admin</SelectItem>
                                        </SelectContent>
                                        </Select>
                                    </TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
      </main>
    </div>
  );
}

