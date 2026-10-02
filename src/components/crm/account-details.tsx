'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    query,
    onSnapshot,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { Account, Opportunity, Activity, Contact, ActivityType, CustomerQuote, AccountIndustry, AccountRating, AccountStatus } from '@/types/crm';
import { Project } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Loader2,
    Send,
    Check,
    Phone,
    Mail,
    Users,
    MessageSquare,
    Briefcase,
    Plus,
    Pencil,
    Trash2,
    Calendar,
    Globe,
    MapPin,
    Building2,
    HardHat,
    DollarSign,
    FileSpreadsheet,
    Download,
    TrendingUp,
    CheckCircle2,
    Clock,
    FileText,
    ArrowUpRight
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { compileCommercialProposalPDF } from '@/lib/pdf/proposal-pdf-engine';

interface AccountDetailsProps {
    account: Account;
    activities: Activity[];
    opportunities: Opportunity[];
    quotes?: CustomerQuote[];
    users: any[];
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '0,00 Kz';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const ActivityIcon = ({ type }: { type: ActivityType }) => {
    switch (type) {
        case 'Chamada': return <Phone className="h-4 w-4 text-blue-500" />;
        case 'Reunião': return <Users className="h-4 w-4 text-purple-500" />;
        case 'Email': return <Mail className="h-4 w-4 text-emerald-500" />;
        case 'Visita': return <HardHat className="h-4 w-4 text-amber-500" />;
        case 'Proposta': return <FileSpreadsheet className="h-4 w-4 text-indigo-500" />;
        default: return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
};

export function AccountDetails({ account, activities, opportunities, quotes = [], users }: AccountDetailsProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    
    // Activity State
    const [newActivityText, setNewActivityText] = useState('');
    const [newActivityType, setNewActivityType] = useState<ActivityType>('Chamada');
    const [newActivityAssigneeId, setNewActivityAssigneeId] = useState<string>('');
    const [newActivityDueDate, setNewActivityDueDate] = useState<Date | undefined>();
    const [isSavingActivity, setIsSavingActivity] = useState(false);

    // Edit Account State
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
    const [editData, setEditData] = useState<Partial<Account>>({});

    // Contact State
    const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactRole, setContactRole] = useState('');
    const [contactDepartment, setContactDepartment] = useState('');

    // Associated Projects from Firestore
    const [clientProjects, setClientProjects] = useState<Project[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);

    useEffect(() => {
        if (isEditDialogOpen) {
            setEditData(account);
        }
    }, [isEditDialogOpen, account]);

    // Query projects related to this account
    useEffect(() => {
        if (!account?.name && !account?.id) return;

        setLoadingProjects(true);
        const q = query(collection(db, 'projects'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            
            const matched = allProjects.filter(p => {
                const nameMatch = p.clientName && account.name && p.clientName.trim().toLowerCase() === account.name.trim().toLowerCase();
                const idMatch = (p as any).clientId && (p as any).clientId === account.id;
                const associatedMatch = account.associatedProjectIds && account.associatedProjectIds.includes(p.id);
                return nameMatch || idMatch || associatedMatch;
            });

            setClientProjects(matched);
            setLoadingProjects(false);
        }, (error) => {
            console.error("Error fetching client projects:", error);
            setLoadingProjects(false);
        });

        return () => unsubscribe();
    }, [account]);

    // Financial KPIs for this account
    const financialStats = useMemo(() => {
        const totalPipeline = opportunities.reduce((acc, opp) => acc + (opp.value || 0), 0);
        const wonOpps = opportunities.filter(opp => opp.stage === 'Ganha');
        const totalWon = wonOpps.reduce((acc, opp) => acc + (opp.value || 0), 0);
        const activeProjects = clientProjects.filter(p => p.status === 'Em Execução' || p.status === 'Planeamento');
        const totalProjectBudget = clientProjects.reduce((acc, p) => acc + (p.budget || p.contractValue || 0), 0);

        return {
            totalPipeline,
            totalWon,
            wonCount: wonOpps.length,
            activeProjectsCount: activeProjects.length,
            totalProjectBudget,
        };
    }, [opportunities, clientProjects]);

    const handleAddActivity = async () => {
        if (!newActivityText.trim() || !user) return;
        setIsSavingActivity(true);
        try {
            const assignee = users.find(u => u.uid === newActivityAssigneeId);

            await addDoc(collection(db, 'accounts', account.id, 'activities'), {
                text: newActivityText.trim(),
                type: newActivityType,
                status: 'Pendente',
                dueDate: newActivityDueDate || null,
                assignee: assignee ? { uid: assignee.uid, displayName: assignee.displayName } : null,
                createdAt: serverTimestamp(),
                author: {
                    uid: user.uid,
                    displayName: user.displayName || user.email,
                },
            });
            setNewActivityText('');
            toast({ title: "Atividade agendada com sucesso!" });
        } catch (error) {
            toast({ title: "Erro ao adicionar atividade", variant: "destructive" });
        } finally {
            setIsSavingActivity(false);
        }
    };
    
    const handleMarkAsDone = async (activityId: string) => {
        try {
            const activityRef = doc(db, 'accounts', account.id, 'activities', activityId);
            await updateDoc(activityRef, {
                status: 'Concluída',
                completedAt: serverTimestamp(),
            });
            toast({ title: "Atividade concluída!" });
        } catch (error) {
            toast({ title: "Erro ao concluir atividade", variant: "destructive" });
        }
    };

    const handleUpdateAccount = async () => {
        setIsSubmittingEdit(true);
        try {
            const accountRef = doc(db, 'accounts', account.id);
            await updateDoc(accountRef, editData);
            toast({ title: 'Conta atualizada com sucesso!' });
            setIsEditDialogOpen(false);
        } catch (error) {
            toast({ title: 'Erro ao atualizar conta', variant: 'destructive' });
        } finally {
            setIsSubmittingEdit(false);
        }
    };
    
    const handleAddContact = async () => {
        if (!contactName.trim()) {
            toast({ title: 'O nome do contacto é obrigatório', variant: 'destructive' });
            return;
        }

        const newContact: Contact = {
            id: `contact-${Date.now()}`,
            name: contactName.trim(),
            email: contactEmail.trim() || undefined,
            phone: contactPhone.trim() || undefined,
            role: contactRole.trim() || undefined,
            department: contactDepartment.trim() || undefined,
            createdAt: new Date().toISOString(),
        };

        try {
            const accountRef = doc(db, 'accounts', account.id);
            await updateDoc(accountRef, {
                contacts: arrayUnion(newContact)
            });
            toast({ title: 'Contacto adicionado!' });
            setContactName('');
            setContactEmail('');
            setContactPhone('');
            setContactRole('');
            setContactDepartment('');
            setIsContactDialogOpen(false);
        } catch (error) {
            toast({ title: 'Erro ao adicionar contacto', variant: 'destructive' });
        }
    };

    const handleRemoveContact = async (contactId: string) => {
        const contactToRemove = (account.contacts || []).find(c => c.id === contactId);
        if (!contactToRemove) return;

        try {
            const accountRef = doc(db, 'accounts', account.id);
            await updateDoc(accountRef, {
                contacts: arrayRemove(contactToRemove)
            });
            toast({ title: 'Contacto removido.' });
        } catch (error) {
            toast({ title: 'Erro ao remover contacto', variant: 'destructive' });
        }
    };

    const handleDownloadProposalPdf = async (quote: CustomerQuote) => {
        try {
            toast({ title: "A compilar Proposta Comercial em PDF...", description: "Aguarde um instante." });
            const opp = opportunities.find(o => o.id === quote.opportunityId);
            const doc = await compileCommercialProposalPDF({
                quote,
                account,
                opportunity: opp,
            });
            doc.save(`Proposta_${quote.quoteNumber || quote.title.replace(/\s+/g, '_')}.pdf`);
            toast({ title: "PDF gerado com sucesso!" });
        } catch (err) {
            console.error("Erro ao gerar PDF:", err);
            toast({ title: "Erro ao gerar PDF da proposta", variant: "destructive" });
        }
    };

    const { pendingActivities, completedActivities } = useMemo(() => {
        const pending = activities.filter(a => a.status === 'Pendente').sort((a,b) => {
            const timeA = (a.createdAt as any)?.toDate?.()?.getTime() || 0;
            const timeB = (b.createdAt as any)?.toDate?.()?.getTime() || 0;
            return timeA - timeB;
        });
        const completed = activities.filter(a => a.status === 'Concluída').sort((a,b) => {
            const timeA = (a.completedAt as any)?.toDate?.()?.getTime() || 0;
            const timeB = (b.completedAt as any)?.toDate?.()?.getTime() || 0;
            return timeB - timeA;
        });
        return { pendingActivities: pending, completedActivities: completed };
    }, [activities]);

    return (
        <div className="py-4 space-y-6">
            {/* Header: Cliente 360° */}
            <Card className="border shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <Building2 className="h-6 w-6 text-primary" />
                                <CardTitle className="text-xl font-bold">{account.name}</CardTitle>
                                {account.rating && (
                                    <Badge className={
                                        account.rating === 'Estratégico' ? 'bg-purple-600 text-white' :
                                        account.rating === 'Frequente' ? 'bg-blue-600 text-white' : 'bg-secondary'
                                    }>
                                        {account.rating}
                                    </Badge>
                                )}
                                {account.status && (
                                    <Badge variant={account.status === 'Ativo' ? 'default' : 'secondary'} className={account.status === 'Ativo' ? 'bg-emerald-600' : ''}>
                                        {account.status}
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="flex items-center gap-4 text-xs flex-wrap mt-1">
                                <span><strong>Setor:</strong> {account.industry}</span>
                                {account.nif && <span className="font-mono bg-muted px-1.5 py-0.5 rounded">NIF: {account.nif}</span>}
                                {account.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{account.city}</span>}
                            </CardDescription>
                        </div>

                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 self-start md:self-auto">
                                    <Pencil className="h-3.5 w-3.5" /> Editar Conta
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Editar Conta de Cliente</DialogTitle>
                                    <DialogDescription>Atualize as informações cadastrais e comerciais da empresa.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label htmlFor="edit-name" className="text-xs">Nome da Empresa</Label>
                                            <Input id="edit-name" value={editData.name || ''} onChange={e => setEditData(p => ({...p, name: e.target.value}))} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="edit-nif" className="text-xs">NIF</Label>
                                            <Input id="edit-nif" value={editData.nif || ''} onChange={e => setEditData(p => ({...p, nif: e.target.value}))} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <Label htmlFor="edit-industry" className="text-xs">Setor</Label>
                                            <Select value={editData.industry || 'Construção Civil'} onValueChange={v => setEditData(p => ({...p, industry: v as AccountIndustry}))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Construção Civil">Construção Civil</SelectItem>
                                                    <SelectItem value="Imobiliário">Imobiliário</SelectItem>
                                                    <SelectItem value="Serviços de Engenharia">Serviços de Engenharia</SelectItem>
                                                    <SelectItem value="Governo">Governo</SelectItem>
                                                    <SelectItem value="Mineração & Energia">Mineração & Energia</SelectItem>
                                                    <SelectItem value="Infraestruturas">Infraestruturas</SelectItem>
                                                    <SelectItem value="Particular">Particular</SelectItem>
                                                    <SelectItem value="Outro">Outro</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="edit-rating" className="text-xs">Rating</Label>
                                            <Select value={editData.rating || 'Estratégico'} onValueChange={v => setEditData(p => ({...p, rating: v as AccountRating}))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Estratégico">Estratégico</SelectItem>
                                                    <SelectItem value="Frequente">Frequente</SelectItem>
                                                    <SelectItem value="Pontual">Pontual</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="edit-status" className="text-xs">Estado</Label>
                                            <Select value={editData.status || 'Ativo'} onValueChange={v => setEditData(p => ({...p, status: v as AccountStatus}))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Ativo">Ativo</SelectItem>
                                                    <SelectItem value="Potencial">Potencial</SelectItem>
                                                    <SelectItem value="Inativo">Inativo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label htmlFor="edit-phone" className="text-xs">Telefone</Label>
                                            <Input id="edit-phone" value={editData.phone || ''} onChange={e => setEditData(p => ({...p, phone: e.target.value}))} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="edit-email" className="text-xs">Email</Label>
                                            <Input id="edit-email" value={editData.email || ''} onChange={e => setEditData(p => ({...p, email: e.target.value}))} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label htmlFor="edit-city" className="text-xs">Cidade / Província</Label>
                                            <Input id="edit-city" value={editData.city || ''} onChange={e => setEditData(p => ({...p, city: e.target.value}))} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="edit-website" className="text-xs">Website</Label>
                                            <Input id="edit-website" value={editData.website || ''} onChange={e => setEditData(p => ({...p, website: e.target.value}))} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="edit-address" className="text-xs">Endereço</Label>
                                        <Input id="edit-address" value={editData.address || ''} onChange={e => setEditData(p => ({...p, address: e.target.value}))} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleUpdateAccount} disabled={isSubmittingEdit}>
                                        {isSubmittingEdit && <Loader2 className="animate-spin mr-2 h-4 w-4"/>} Guardar Alterações
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t mt-4">
                        <div className="p-2.5 rounded-lg bg-muted/40 border">
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-primary" /> Volume em Pipeline
                            </div>
                            <div className="text-sm font-bold font-mono mt-0.5">{formatCurrency(financialStats.totalPipeline)}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Contratado / Ganho
                            </div>
                            <div className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                                {formatCurrency(financialStats.totalWon)}
                            </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/40 border">
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <HardHat className="h-3 w-3 text-amber-500" /> Projetos Reais
                            </div>
                            <div className="text-sm font-bold font-mono mt-0.5">
                                {financialStats.activeProjectsCount} ativo(s)
                            </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/40 border">
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3 text-blue-500" /> Contactos Chave
                            </div>
                            <div className="text-sm font-bold font-mono mt-0.5">
                                {(account.contacts || []).length} registado(s)
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* 360° Tabs Navigation */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="overview" className="text-xs">Visão Geral</TabsTrigger>
                    <TabsTrigger value="commercial" className="text-xs">Comercial ({opportunities.length})</TabsTrigger>
                    <TabsTrigger value="projects" className="text-xs">Projetos ({clientProjects.length})</TabsTrigger>
                    <TabsTrigger value="timeline" className="text-xs">Timeline & Ações</TabsTrigger>
                </TabsList>

                {/* TAB 1: VISÃO GERAL & CONTACTOS */}
                <TabsContent value="overview" className="space-y-4 pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Detalhes Cadastrais */}
                        <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                                    <Building2 className="h-4 w-4 text-primary" /> Informações Corporativas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2.5 text-xs">
                                <div className="flex justify-between py-1 border-b">
                                    <span className="text-muted-foreground">Telefone Geral</span>
                                    <span className="font-medium">{account.phone || 'Não informado'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b">
                                    <span className="text-muted-foreground">Email Institucional</span>
                                    <span className="font-medium">{account.email || 'Não informado'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b">
                                    <span className="text-muted-foreground">Website</span>
                                    {account.website ? (
                                        <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                            {account.website.replace(/^https?:\/\//, '')} <ArrowUpRight className="h-3 w-3" />
                                        </a>
                                    ) : (
                                        <span>Não informado</span>
                                    )}
                                </div>
                                <div className="flex justify-between py-1 border-b">
                                    <span className="text-muted-foreground">Endereço Sede</span>
                                    <span className="font-medium text-right max-w-[200px]">{account.address || account.city || 'Luanda'}</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="text-muted-foreground">Gestor de Conta</span>
                                    <span className="font-medium">{account.assignedTo?.displayName || account.author?.displayName || 'Não atribuído'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Contactos da Empresa */}
                        <Card>
                            <CardHeader className="py-3 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                                    <Users className="h-4 w-4 text-primary" /> Pessoas de Contacto ({(account.contacts || []).length})
                                </CardTitle>
                                <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                                            <Plus className="h-3 w-3" /> Adicionar
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Novo Contacto na Empresa</DialogTitle>
                                            <DialogDescription>Adicione um interlocutor, decisor ou responsável técnico.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-3 py-2 text-xs">
                                            <div className="space-y-1">
                                                <Label htmlFor="c-name">Nome Completo *</Label>
                                                <Input id="c-name" placeholder="Ex: Eng. Mário Tavares" value={contactName} onChange={e => setContactName(e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <Label htmlFor="c-role">Cargo / Função</Label>
                                                    <Input id="c-role" placeholder="Ex: Diretor de Obras" value={contactRole} onChange={e => setContactRole(e.target.value)} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="c-dept">Departamento</Label>
                                                    <Input id="c-dept" placeholder="Ex: Operações / Compras" value={contactDepartment} onChange={e => setContactDepartment(e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <Label htmlFor="c-phone">Telefone</Label>
                                                    <Input id="c-phone" placeholder="+244 923 000 000" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="c-email">Email</Label>
                                                    <Input id="c-email" type="email" placeholder="mario@empresa.ao" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setIsContactDialogOpen(false)}>Cancelar</Button>
                                            <Button onClick={handleAddContact}>Adicionar</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {(account.contacts || []).length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-4 text-center">Nenhum contacto cadastrado ainda.</p>
                                ) : (
                                    (account.contacts || []).map(contact => (
                                        <div key={contact.id} className="flex justify-between items-center p-2 rounded-lg border bg-muted/20 text-xs">
                                            <div className="space-y-0.5">
                                                <div className="font-semibold flex items-center gap-1.5">
                                                    {contact.name}
                                                    {contact.role && <span className="text-[11px] font-normal text-muted-foreground">({contact.role})</span>}
                                                </div>
                                                <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                                                    {contact.phone && (
                                                        <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-primary">
                                                            <Phone className="h-3 w-3" /> {contact.phone}
                                                        </a>
                                                    )}
                                                    {contact.email && (
                                                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-primary">
                                                            <Mail className="h-3 w-3" /> {contact.email}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveContact(contact.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TAB 2: COMERCIAL (OPORTUNIDADES & PROPOSTAS) */}
                <TabsContent value="commercial" className="space-y-4 pt-3">
                    {/* Oportunidades */}
                    <Card>
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                                <Briefcase className="h-4 w-4 text-primary" /> Funil de Oportunidades ({opportunities.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {opportunities.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma oportunidade de negócio registada para esta conta.</p>
                            ) : (
                                opportunities.map(opp => (
                                    <div key={opp.id} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                                        <div>
                                            <p className="font-semibold text-xs">{opp.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[11px]">{opp.stage}</Badge>
                                                {opp.probability !== undefined && (
                                                    <span className="text-[11px] text-muted-foreground">{opp.probability}% prob.</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono font-bold text-xs text-primary">{formatCurrency(opp.value)}</p>
                                            <Link href={`/crm?tab=funnel&opportunity=${opp.id}`} className="text-[11px] text-primary hover:underline flex items-center gap-0.5 justify-end mt-0.5">
                                                Ver no funil <ArrowUpRight className="h-3 w-3" />
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Propostas Comerciais */}
                    {quotes.length > 0 && (
                        <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                                    <FileSpreadsheet className="h-4 w-4 text-primary" /> Propostas Comerciais Emitidas ({quotes.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {quotes.map(q => (
                                    <div key={q.id} className="flex items-center justify-between p-2.5 rounded-lg border text-xs">
                                        <div>
                                            <p className="font-semibold">{q.title}</p>
                                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                                <Badge variant="secondary">{q.status}</Badge>
                                                <span>Markup: {q.markup}%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-primary">{formatCurrency(q.salePrice)}</span>
                                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleDownloadProposalPdf(q)}>
                                                <Download className="h-3 w-3" /> PDF
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* TAB 3: PROJETOS DE ENGENHARIA */}
                <TabsContent value="projects" className="space-y-4 pt-3">
                    <Card>
                        <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                                    <HardHat className="h-4 w-4 text-amber-500" />
                                    Projetos Técnicos & Obras Associadas ({clientProjects.length})
                                </CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Projetos de engenharia reais no Profundidade contratados por esta entidade.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {loadingProjects ? (
                                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                                    <Loader2 className="animate-spin h-4 w-4 mr-2" /> A sincronizar projetos associados...
                                </div>
                            ) : clientProjects.length === 0 ? (
                                <div className="text-center py-6 space-y-2">
                                    <HardHat className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                                    <p className="text-xs text-muted-foreground">Nenhum projeto de engenharia associado diretamente a este cliente ainda.</p>
                                    <p className="text-[11px] text-muted-foreground">Quando uma oportunidade for marcada como "Ganha", o projeto criado ficará conectado aqui automaticamente.</p>
                                </div>
                            ) : (
                                clientProjects.map(project => (
                                    <div key={project.id} className="p-3 rounded-lg border bg-card hover:border-primary/50 transition-all space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    {project.code && (
                                                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded font-semibold text-muted-foreground">
                                                            {project.code}
                                                        </span>
                                                    )}
                                                    <span className="font-bold text-sm text-foreground">{project.name}</span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    {project.type || 'Engenharia & Construção'} • {project.location?.province || 'Angola'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={
                                                    project.status === 'Em Execução' ? 'bg-blue-600' :
                                                    project.status === 'Concluída' ? 'bg-emerald-600' : 'bg-muted'
                                                }>
                                                    {project.status}
                                                </Badge>
                                                <Link href={`/projects/${project.id}`}>
                                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                                                        Abrir Projeto <ArrowUpRight className="h-3 w-3" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Progress Bar & Financials */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[11px] text-muted-foreground">
                                                    <span>Progresso Físico</span>
                                                    <span className="font-semibold text-foreground">{project.progress || 0}%</span>
                                                </div>
                                                <Progress value={project.progress || 0} className="h-1.5" />
                                            </div>
                                            <div className="flex items-center justify-end text-[11px] text-muted-foreground">
                                                <span>Orçamento / Contrato: </span>
                                                <span className="font-mono font-bold text-foreground ml-1">
                                                    {formatCurrency(project.budget || project.contractValue)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 4: TIMELINE & ATIVIDADES */}
                <TabsContent value="timeline" className="space-y-4 pt-3">
                    {/* Registo de Nova Atividade */}
                    <Card>
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm font-semibold">Registar Nova Interação / Tarefa</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Textarea
                                placeholder="Descreva o que foi falado ou a próxima ação acordada..."
                                value={newActivityText}
                                onChange={(e) => setNewActivityText(e.target.value)}
                                disabled={isSavingActivity}
                                rows={2}
                                className="text-xs"
                            />
                            <div className="flex flex-wrap gap-2 justify-between items-center">
                                <div className="flex gap-2 flex-wrap items-center">
                                    <Select value={newActivityType} onValueChange={(v) => setNewActivityType(v as ActivityType)}>
                                        <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Chamada">Chamada</SelectItem>
                                            <SelectItem value="Reunião">Reunião</SelectItem>
                                            <SelectItem value="Email">Email</SelectItem>
                                            <SelectItem value="Visita">Visita Técnica</SelectItem>
                                            <SelectItem value="Proposta">Proposta</SelectItem>
                                            <SelectItem value="Tarefa">Tarefa</SelectItem>
                                            <SelectItem value="Outro">Outro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={newActivityAssigneeId} onValueChange={setNewActivityAssigneeId}>
                                        <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Responsável..."/></SelectTrigger>
                                        <SelectContent>
                                            {users.map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName || u.email}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <DatePicker date={newActivityDueDate} setDate={setNewActivityDueDate} placeholder="Data limite..."/>
                                </div>
                                <Button size="sm" onClick={handleAddActivity} disabled={isSavingActivity || !newActivityText.trim()} className="h-8 text-xs gap-1">
                                    {isSavingActivity ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                                    Registar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Lista de Atividades Pendentes */}
                    {pendingActivities.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações Pendentes ({pendingActivities.length})</h4>
                            {pendingActivities.map(activity => (
                                <div key={activity.id} className="flex items-center justify-between gap-3 p-2.5 bg-secondary/80 border rounded-lg text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <ActivityIcon type={activity.type} />
                                        <div>
                                            <p className="font-medium text-foreground">{activity.text}</p>
                                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                                                {activity.assignee && <span>Atribuído: {activity.assignee.displayName}</span>}
                                                {activity.dueDate && (
                                                    <span className={cn("flex items-center gap-1", new Date((activity.dueDate as any)?.toDate?.() || activity.dueDate) < new Date() && "text-destructive font-medium")}>
                                                        <Calendar className="h-3 w-3"/>
                                                        {format(new Date((activity.dueDate as any)?.toDate?.() || activity.dueDate), 'dd/MM/yyyy')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleMarkAsDone(activity.id)}>
                                        <Check className="h-3 w-3 text-emerald-600"/> Concluir
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Histórico Concluído */}
                    {completedActivities.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Histórico de Atividades Realizadas ({completedActivities.length})</h4>
                            {completedActivities.map(activity => (
                                <div key={activity.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs opacity-80">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                        <div>
                                            <p className="line-through text-muted-foreground">{activity.text}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                Concluído {activity.completedAt ? format(new Date((activity.completedAt as any)?.toDate?.() || activity.completedAt), "dd 'de' MMM, HH:mm", { locale: ptBR }) : ''}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
