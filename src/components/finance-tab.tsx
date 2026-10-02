'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, PieChart, Wallet, ShoppingCart, Landmark, ListTree } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WbsItem } from '@/types/wbs';
import { DatePicker } from './ui/date-picker';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Transaction, Account } from '@/types/finance';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import ContractManagementTab from './contract-management-tab';
import MeasurementTab from './measurement-tab';
import InvoicingTab from './invoicing-tab';
import type { UserRole } from '@/app/projects/[id]/page';

interface FinanceTabProps {
    projectId: string;
    userRole?: UserRole | null;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '0,00 Kz';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

export default function FinanceTab({ projectId, userRole }: FinanceTabProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [loadingStates, setLoadingStates] = useState({
        wbs: true,
        transactions: true,
        accounts: true,
    });
    const { toast } = useToast();

    const isLoading = Object.values(loadingStates).some(state => state);

    // Dialog states
    const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
    
    // Form state for transactions
    const [newDescription, setNewDescription] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newDate, setNewDate] = useState<Date | undefined>(new Date());
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [selectedWbsItemId, setSelectedWbsItemId] = useState('');
    const [newType, setNewType] = useState<Transaction['type']>('Despesa');
    const [newStatus, setNewStatus] = useState<Transaction['status']>('Pendente');
    const [isAddingTransaction, setIsAddingTransaction] = useState(false);

    // Form state for accounts
    const [newAccountCode, setNewAccountCode] = useState('');
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountType, setNewAccountType] = useState<Account['type']>('Despesa');
    const [isAddingAccount, setIsAddingAccount] = useState(false);
    
    useEffect(() => {
        if (!projectId) return;

        const createSubscription = (path: string, setter: React.Dispatch<any>, key: keyof typeof loadingStates, orderByField?: string, orderDirection: 'asc' | 'desc' = 'asc') => {
            const collRef = collection(db, path);
            const q = orderByField ? query(collRef, orderBy(orderByField, orderDirection)) : query(collRef);
            return onSnapshot(q, (snapshot) => {
                const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setter(items);
                 setLoadingStates(prev => ({ ...prev, [key]: false }));
            }, (error) => {
                console.error(`Error fetching ${path}:`, error);
                toast({ title: `Erro ao carregar dados de ${path}`, variant: 'destructive' });
                 setLoadingStates(prev => ({ ...prev, [key]: false }));
            });
        };

        const unsubscribes = [
            createSubscription(`projects/${projectId}/wbs`, setWbsItems, 'wbs', 'name'),
            createSubscription(`projects/${projectId}/transactions`, setTransactions, 'transactions', 'date', 'desc'),
            createSubscription(`projects/${projectId}/accounts`, setAccounts, 'accounts', 'code'),
        ];
        
        return () => unsubscribes.forEach(unsub => unsub());

    }, [projectId, toast]);


const STANDARD_ACCOUNTS = [
    { id: 'mat', code: '61.1', name: 'Materiais de Construção (Cimento, Aço, Brita)' },
    { id: 'mo', code: '62.1', name: 'Mão de Obra e Encargos de Estaleiro' },
    { id: 'eq', code: '62.2', name: 'Equipamentos, Alugueres e Máquinas' },
    { id: 'sub', code: '62.3', name: 'Subempreiteiros e Especialidades' },
    { id: 'fuel', code: '61.2', name: 'Combustíveis e Lubrificantes' },
    { id: 'geral', code: '62.9', name: 'Custos Gerais de Estaleiro e Operações' },
    { id: 'rec', code: '71.1', name: 'Receita de Auto de Medição / Faturação' },
];

    const availableAccounts = useMemo(() => {
        return accounts.length > 0 ? accounts : STANDARD_ACCOUNTS;
    }, [accounts]);

    const financialSummary = useMemo(() => {
        const totalBudget = wbsItems.reduce((acc, item) => acc + (item.budget || 0), 0);
        const totalCost = transactions
            .filter(t => t.type === 'Despesa')
            .reduce((acc, item) => acc + item.amount, 0);
        const balance = totalBudget - totalCost;

        return { totalBudget, totalCost, balance };
    }, [wbsItems, transactions]);


    const handleAddTransaction = async () => {
        if (!newDescription.trim() || !newAmount || isNaN(parseFloat(newAmount))) {
            toast({ title: 'Campos em falta', description: 'Por favor, indique a descrição e o valor.', variant: 'destructive' });
            return;
        }

        setIsAddingTransaction(true);
        try {
            const effectiveAccountId = selectedAccountId || (newType === 'Receita' ? 'rec' : 'mat');
            const account = accounts.find(a => a.id === effectiveAccountId)
                || STANDARD_ACCOUNTS.find(a => a.id === effectiveAccountId);

            const effectiveWbsId = selectedWbsItemId && selectedWbsItemId !== 'none' ? selectedWbsItemId : null;
            const wbsItem = effectiveWbsId ? wbsItems.find(w => w.id === effectiveWbsId) : null;

            await addDoc(collection(db, 'projects', projectId, 'transactions'), {
                description: newDescription.trim(),
                amount: parseFloat(newAmount),
                date: newDate || new Date(),
                type: newType,
                status: newStatus,
                accountId: effectiveAccountId,
                accountName: account?.name || 'Despesas Gerais de Estaleiro',
                wbsItemId: effectiveWbsId || '',
                wbsItemName: wbsItem?.name || 'Geral da Obra / Custos Indiretos',
            });

            // Reset form
            setNewDescription('');
            setNewAmount('');
            setNewDate(new Date());
            setSelectedAccountId('');
            setSelectedWbsItemId('');
            setNewType('Despesa');
            setNewStatus('Pendente');
            setIsTransactionDialogOpen(false);

            toast({ title: 'Transação registada com sucesso!' });

        } catch (error) {
            console.error("Error adding transaction: ", error);
            toast({ title: 'Erro ao adicionar transação', variant: 'destructive' });
        } finally {
            setIsAddingTransaction(false);
        }
    };
    
    const handleAddAccount = async () => {
        if (!newAccountCode.trim() || !newAccountName.trim()) {
            toast({ title: 'Campos em falta', description: 'Código e Nome da conta são obrigatórios.', variant: 'destructive' });
            return;
        }
        setIsAddingAccount(true);
        try {
             await addDoc(collection(db, 'projects', projectId, 'accounts'), {
                code: newAccountCode,
                name: newAccountName,
                type: newAccountType,
                createdAt: serverTimestamp(),
            });
            setNewAccountCode('');
            setNewAccountName('');
            setIsAccountDialogOpen(false);
            toast({ title: 'Conta adicionada com sucesso!' });
        } catch (error) {
            console.error("Error adding account: ", error);
            toast({ title: 'Erro ao adicionar conta', variant: 'destructive' });
        } finally {
            setIsAddingAccount(false);
        }
    };

    const getStatusVariant = (status: Transaction['status']) => {
        switch (status) {
            case 'Pago': return 'default';
            case 'Pendente': return 'secondary';
            case 'Atrasado': return 'destructive';
            default: return 'outline';
        }
    };


    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Orçamento Total</CardTitle>
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(financialSummary.totalBudget)}</div>
                        <p className="text-xs text-muted-foreground">Soma do orçamento de todas as atividades da EAP.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custo Real Total</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(financialSummary.totalCost)}</div>
                         <p className="text-xs text-muted-foreground">Soma de todas as despesas lançadas.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${financialSummary.balance < 0 ? 'text-destructive' : ''}`}>{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(financialSummary.balance)}</div>
                         <p className="text-xs text-muted-foreground">Orçamento Total - Custo Real Total</p>
                    </CardContent>
                </Card>
            </div>
            
            <Tabs defaultValue="transactions">
                <ScrollArea className="w-full whitespace-nowrap">
                    <TabsList>
                        <TabsTrigger value="transactions">Lançamentos</TabsTrigger>
                        <TabsTrigger value="accounts">Plano de Contas</TabsTrigger>
                        <TabsTrigger value="contracts">Contratos</TabsTrigger>
                        <TabsTrigger value="measurements">Medições</TabsTrigger>
                        <TabsTrigger value="invoicing">Faturação</TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>

                <TabsContent value="transactions">
                    <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
                        <Card className="mt-4">
                            <CardHeader className="flex flex-row justify-between items-start">
                                <div>
                                    <CardTitle>Histórico Financeiro</CardTitle>
                                    <CardDescription>Acompanhe todas as receitas e despesas do projeto.</CardDescription>
                                </div>
                                <DialogTrigger asChild>
                                    <Button variant="outline"><Plus className="mr-2" />Lançar Transação</Button>
                                </DialogTrigger>
                            </CardHeader>
                            <CardContent>
                                {loadingStates.transactions ? (
                                     <div className="flex items-center justify-center p-8">
                                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                        Carregando histórico...
                                    </div>
                                ) : (
                                    <div className="max-h-[400px] overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Data</TableHead>
                                                    <TableHead>Descrição</TableHead>
                                                    <TableHead>Atividade EAP</TableHead>
                                                    <TableHead>Conta</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Valor</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {transactions.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="text-center">Nenhuma transação lançada ainda.</TableCell>
                                                    </TableRow>
                                                ) : (
                                                    transactions.map(t => (
                                                        <TableRow key={t.id}>
                                                            <TableCell>{t.date ? format((t.date as unknown as Timestamp).toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                                            <TableCell className="font-medium">{t.description}</TableCell>
                                                            <TableCell>{t.wbsItemName}</TableCell>
                                                            <TableCell>{t.accountName}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={getStatusVariant(t.status)}>{t.status}</Badge>
                                                            </TableCell>
                                                            <TableCell className={cn(
                                                                "text-right font-mono",
                                                                t.type === 'Receita' ? 'text-green-600' : 'text-red-600'
                                                            )}>
                                                                {t.type === 'Receita' ? '+' : '-'} {formatCurrency(t.amount)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Lançar Nova Transação</DialogTitle>
                                <DialogDescription>Registe uma receita ou despesa e associe-a a uma conta e atividade.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto px-2">
                                <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/40 border border-muted-foreground/10">
                                    <Label className="text-xs font-semibold text-muted-foreground block">Preenchimento Rápido (1 Clique):</Label>
                                    <div className="flex flex-wrap gap-1.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-7 rounded-full bg-background hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                                            onClick={() => {
                                                setNewType('Despesa');
                                                setNewDescription('Aquisição de Materiais de Construção');
                                                setSelectedAccountId(availableAccounts[0]?.id || 'mat');
                                            }}
                                        >
                                            + Materiais
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-7 rounded-full bg-background hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                                            onClick={() => {
                                                setNewType('Despesa');
                                                setNewDescription('Folha de Pagamento / Mão de Obra');
                                                setSelectedAccountId(availableAccounts.find(a => a.id === 'mo')?.id || availableAccounts[1]?.id || 'mo');
                                            }}
                                        >
                                            + Mão de Obra
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-7 rounded-full bg-background hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                                            onClick={() => {
                                                setNewType('Despesa');
                                                setNewDescription('Abastecimento de Combustível / Gasóleo');
                                                setSelectedAccountId(availableAccounts.find(a => a.id === 'fuel')?.id || 'fuel');
                                            }}
                                        >
                                            + Combustível
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-7 rounded-full bg-background hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
                                            onClick={() => {
                                                setNewType('Receita');
                                                setNewDescription('Recebimento de Auto de Medição');
                                                setSelectedAccountId(availableAccounts.find(a => a.id === 'rec')?.id || 'rec');
                                            }}
                                        >
                                            + Receita / Auto
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="desc">Descrição</Label>
                                    <Input id="desc" placeholder="Ex: Compra de cimento" value={newDescription} onChange={e => setNewDescription(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Valor (Kz)</Label>
                                        <Input id="amount" type="number" placeholder="15000.00" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Data</Label>
                                        <DatePicker date={newDate} setDate={setNewDate} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="transaction-type">Tipo</Label>
                                        <Select value={newType} onValueChange={(v) => setNewType(v as Transaction['type'])}>
                                            <SelectTrigger id="transaction-type">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Despesa">Despesa</SelectItem>
                                                <SelectItem value="Receita">Receita</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="transaction-status">Status</Label>
                                        <Select value={newStatus} onValueChange={(v) => setNewStatus(v as Transaction['status'])}>
                                            <SelectTrigger id="transaction-status">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Pendente">Pendente</SelectItem>
                                                <SelectItem value="Pago">Pago</SelectItem>
                                                <SelectItem value="Atrasado">Atrasado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="account-id">Conta</Label>
                                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                            <SelectTrigger id="account-id">
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableAccounts.map(item => (
                                                    <SelectItem key={item.id} value={item.id}>{item.code ? `${item.code} - ` : ''}{item.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="wbs-id">Atividade (EAP)</Label>
                                        <Select value={selectedWbsItemId} onValueChange={setSelectedWbsItemId}>
                                            <SelectTrigger id="wbs-id">
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Geral da Obra / Custos Indiretos</SelectItem>
                                                {wbsItems.map(item => (
                                                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsTransactionDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={handleAddTransaction} disabled={isAddingTransaction}>
                                    {isAddingTransaction ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                                    Lançar Transação
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                <TabsContent value="accounts">
                    <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
                        <Card className="mt-4">
                            <CardHeader className="flex-row justify-between items-start">
                                <div>
                                    <CardTitle>Plano de Contas</CardTitle>
                                    <CardDescription>Crie e organize as categorias de custos e receitas do seu projeto.</CardDescription>
                                </div>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Adicionar Conta
                                    </Button>
                                </DialogTrigger>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[150px]">Código</TableHead>
                                                <TableHead>Nome da Conta</TableHead>
                                                <TableHead>Tipo</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loadingStates.accounts ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center">
                                                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                                    </TableCell>
                                                </TableRow>
                                            ) : accounts.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center">
                                                        Nenhum plano de contas configurado.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                accounts.map(account => (
                                                    <TableRow key={account.id}>
                                                        <TableCell className="font-mono">{account.code}</TableCell>
                                                        <TableCell className="font-medium">{account.name}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={account.type === 'Receita' ? 'default' : 'secondary'}>{account.type}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adicionar Nova Conta</DialogTitle>
                                <DialogDescription>
                                    Crie uma nova categoria para os seus lançamentos financeiros.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                <Label htmlFor="account-code">Código</Label>
                                <Input id="account-code" placeholder="Ex: 1.01.01" value={newAccountCode} onChange={e => setNewAccountCode(e.target.value)} disabled={isAddingAccount} />
                                </div>
                                <div className="space-y-2">
                                <Label htmlFor="account-name">Nome da Conta</Label>
                                <Input id="account-name" placeholder="Ex: Mão de Obra" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} disabled={isAddingAccount} />
                                </div>
                                <div className="space-y-2">
                                <Label htmlFor="account-type">Tipo</Label>
                                <Select value={newAccountType} onValueChange={(v) => setNewAccountType(v as Account['type'])}>
                                        <SelectTrigger id="account-type" className='w-[150px]'>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Despesa">Despesa</SelectItem>
                                            <SelectItem value="Receita">Receita</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsAccountDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={handleAddAccount} disabled={isAddingAccount}>
                                    {isAddingAccount ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
                                    Adicionar Conta
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>
                <TabsContent value="contracts">
                    <div className="pt-4">
                        <ContractManagementTab projectId={projectId} userRole={userRole || null} />
                    </div>
                </TabsContent>
                <TabsContent value="measurements">
                     <div className="pt-4">
                        <MeasurementTab projectId={projectId} />
                    </div>
                </TabsContent>
                <TabsContent value="invoicing">
                    <div className="pt-4">
                        <InvoicingTab projectId={projectId} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export { FinanceTab };