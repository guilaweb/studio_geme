'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    doc, 
    updateDoc, 
    writeBatch, 
    query, 
    where, 
    getDocs 
} from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Loader2, 
    Plus, 
    ArrowRight, 
    Search, 
    Building2, 
    Phone, 
    Mail, 
    MapPin, 
    UserCheck, 
    Sparkles, 
    Filter,
    CheckCircle2,
    Calendar,
    Briefcase,
    Tag
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lead, STAGES, type LeadStatus, type LeadPriority, type AccountIndustry } from '@/types/crm';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface LeadsTabProps {
    initialLeads: Lead[];
    onLeadClick: (lead: Lead) => void;
    users?: any[];
}

export function LeadsTab({ initialLeads, onLeadClick, users = [] }: LeadsTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    
    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Progressive Form Wizard State (5 Steps)
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('');
    
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('Luanda, Angola');

    const [industry, setIndustry] = useState<AccountIndustry>('Construção Civil');
    const [interest, setInterest] = useState('');
    const [priority, setPriority] = useState<LeadPriority>('Média');

    const [source, setSource] = useState('Indicação Comercial');
    const [assignedToUid, setAssignedToUid] = useState<string>('');
    const [notes, setNotes] = useState('');

    // Conversion Modal State
    const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
    const [convertOppValue, setConvertOppValue] = useState('15000000');
    const [isConverting, setIsConverting] = useState(false);

    const resetWizard = () => {
        setName('');
        setCompany('');
        setRole('');
        setEmail('');
        setPhone('');
        setLocation('Luanda, Angola');
        setIndustry('Construção Civil');
        setInterest('');
        setPriority('Média');
        setSource('Indicação Comercial');
        setAssignedToUid('');
        setNotes('');
        setCurrentStep(1);
        setIsWizardOpen(false);
    };

    const handleCreateLead = async () => {
        if (!name.trim() || !email.trim()) {
            toast({ title: "Nome e e-mail são obrigatórios", variant: "destructive" });
            return;
        }
        if (!user) return;

        setIsSubmitting(true);
        try {
            const assignedUser = users.find(u => u.uid === assignedToUid);

            await addDoc(collection(db, 'leads'), {
                name: name.trim(),
                company: company.trim() || undefined,
                role: role.trim() || undefined,
                email: email.trim(),
                phone: phone.trim() || undefined,
                location: location.trim() || undefined,
                industry,
                interest: interest.trim() || undefined,
                status: 'Novo' as LeadStatus,
                priority,
                source: source || 'Contacto Direto',
                assignedTo: assignedUser ? {
                    uid: assignedUser.uid,
                    displayName: assignedUser.displayName || assignedUser.email,
                } : {
                    uid: user.uid,
                    displayName: user.displayName || user.email,
                },
                notes: notes.trim() || undefined,
                message: notes.trim() || undefined,
                createdAt: serverTimestamp(),
                lastInteraction: serverTimestamp(),
                author: {
                    uid: user.uid,
                    displayName: user.displayName || user.email,
                }
            });

            toast({ 
                title: "Lead Registado com Sucesso!", 
                description: `${name}${company ? ` (${company})` : ''} foi adicionado à carteira comercial.` 
            });
            resetWizard();
        } catch (error) {
            console.error("Error adding lead: ", error);
            toast({ title: "Erro ao registar lead", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Convert Lead into Account + Contact + Opportunity seamlessly
    const handleConvertLead = async () => {
        if (!convertingLead || !user) return;
        setIsConverting(true);
        const batch = writeBatch(db);

        try {
            const clientCompanyName = convertingLead.company?.trim() || convertingLead.name.trim();

            // 1. Procurar conta existente ou criar nova
            const accountsRef = collection(db, 'accounts');
            const q = query(accountsRef, where("name", "==", clientCompanyName));
            const querySnapshot = await getDocs(q);

            let accountId: string;
            if (querySnapshot.empty) {
                const newAccountRef = doc(collection(db, 'accounts'));
                accountId = newAccountRef.id;
                batch.set(newAccountRef, {
                    name: clientCompanyName,
                    industry: (convertingLead.industry as AccountIndustry) || 'Construção Civil',
                    phone: convertingLead.phone || '',
                    email: convertingLead.email || '',
                    address: convertingLead.location || 'Angola',
                    website: '',
                    rating: 'Frequente',
                    status: 'Ativo',
                    contacts: [{
                        id: crypto.randomUUID(),
                        name: convertingLead.name,
                        email: convertingLead.email,
                        phone: convertingLead.phone,
                        role: (convertingLead as any).role || 'Contacto Principal',
                        isPrimary: true,
                    }],
                    createdAt: serverTimestamp(),
                    author: {
                        uid: user.uid,
                        displayName: user.displayName || user.email,
                    }
                });
            } else {
                accountId = querySnapshot.docs[0].id;
            }

            // 2. Criar Oportunidade no Funil
            const newOppRef = doc(collection(db, 'opportunities'));
            const oppTitle = convertingLead.interest 
                ? `${convertingLead.interest} - ${clientCompanyName}`
                : `Empreitada Comercial - ${clientCompanyName}`;

            batch.set(newOppRef, {
                name: oppTitle,
                accountId: accountId,
                accountName: clientCompanyName,
                value: parseFloat(convertOppValue) || 0,
                stage: STAGES[0], // 'Qualificação'
                probability: 20,
                createdAt: serverTimestamp(),
                author: { uid: user.uid, displayName: user.displayName || user.email },
                sourceLeadId: convertingLead.id,
                origin: convertingLead.source || 'Lead Comercial',
                contactName: convertingLead.name,
                contactEmail: convertingLead.email,
                contactPhone: convertingLead.phone,
                assignedTo: convertingLead.assignedTo || { uid: user.uid, displayName: user.displayName || user.email },
                description: convertingLead.notes || convertingLead.message || '',
            });

            // 3. Atualizar Lead para Convertido mantendo histórico
            const leadRef = doc(db, 'leads', convertingLead.id);
            batch.update(leadRef, {
                status: 'Convertido',
                convertedAccountId: accountId,
                convertedOpportunityId: newOppRef.id,
                convertedAt: serverTimestamp(),
                lastInteraction: serverTimestamp(),
            });

            await batch.commit();

            toast({
                title: "Lead Convertido com Sucesso!",
                description: `Criada a Empresa "${clientCompanyName}" e a Oportunidade no Funil de Vendas.`
            });

            setConvertingLead(null);
        } catch (err: any) {
            console.error("Error converting lead:", err);
            toast({ title: "Erro na conversão do lead", description: err.message, variant: "destructive" });
        } finally {
            setIsConverting(false);
        }
    };

    // Filter leads
    const filteredLeads = useMemo(() => {
        return initialLeads.filter(lead => {
            const matchesSearch = 
                lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (lead.interest && lead.interest.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (lead.location && lead.location.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [initialLeads, searchTerm, statusFilter]);

    const getStatusBadge = (status: LeadStatus) => {
        switch (status) {
            case 'Novo':
                return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Novo</Badge>;
            case 'Contactado':
                return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Contactado</Badge>;
            case 'Qualificado':
                return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Qualificado</Badge>;
            case 'Convertido':
                return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Convertido</Badge>;
            case 'Não Qualificado':
                return <Badge variant="secondary" className="text-muted-foreground">Não Qualificado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPriorityBadge = (p?: LeadPriority) => {
        switch (p) {
            case 'Urgente':
                return <Badge variant="destructive" className="text-[10px]">Urgente</Badge>;
            case 'Alta':
                return <Badge className="bg-orange-500 text-white text-[10px]">Alta</Badge>;
            case 'Média':
                return <Badge variant="secondary" className="text-[10px]">Média</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px] text-muted-foreground">Baixa</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Clientes Potenciais & Leads</h2>
                    <p className="text-sm text-muted-foreground">
                        Captação, qualificação e conversão direta em contas e oportunidades comerciais.
                    </p>
                </div>
                <Button onClick={() => setIsWizardOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Novo Lead (Guia Passo a Passo)
                </Button>
            </div>

            {/* Filter Chips & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Pesquisar por nome, empresa, e-mail ou interesse..."
                        className="pl-9 bg-card"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground mr-1 flex items-center gap-1">
                        <Filter className="h-3.5 w-3.5" /> Estado:
                    </span>
                    {['all', 'Novo', 'Contactado', 'Qualificado', 'Convertido', 'Não Qualificado'].map((st) => (
                        <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`px-2.5 py-1 rounded-full border transition-all ${
                                statusFilter === st
                                    ? 'bg-primary text-primary-foreground border-primary font-medium'
                                    : 'bg-card hover:bg-muted text-muted-foreground border-border hover:text-foreground'
                            }`}
                        >
                            {st === 'all' ? `Todos (${initialLeads.length})` : st}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leads Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Contacto & Empresa</TableHead>
                                    <TableHead>Localização & Setor</TableHead>
                                    <TableHead>Interesse / Escopo</TableHead>
                                    <TableHead>Prioridade</TableHead>
                                    <TableHead>Responsável</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead className="text-right">Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLeads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <UserCheck className="h-8 w-8 text-muted-foreground/40" />
                                                <p className="font-medium text-foreground">Nenhum cliente potencial encontrado.</p>
                                                <p className="text-xs">Registe leads comerciais para iniciar a prospecção e qualificação.</p>
                                                <Button onClick={() => setIsWizardOpen(true)} size="sm" variant="outline" className="mt-2">
                                                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Criar Primeiro Lead
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLeads.map(lead => (
                                        <TableRow 
                                            key={lead.id} 
                                            onClick={() => onLeadClick(lead)} 
                                            className="cursor-pointer hover:bg-muted/50"
                                        >
                                            <TableCell>
                                                <div className="font-semibold text-foreground">{lead.name}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                    {lead.company && (
                                                        <span className="font-medium text-primary flex items-center gap-1">
                                                            <Building2 className="h-3 w-3" /> {lead.company}
                                                        </span>
                                                    )}
                                                    {lead.phone && <span>• {lead.phone}</span>}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground/80">{lead.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs font-medium text-foreground">{lead.location || 'Angola'}</div>
                                                <div className="text-[11px] text-muted-foreground">{lead.industry || 'Construção Civil'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs font-medium max-w-[200px] truncate" title={lead.interest || lead.message}>
                                                    {lead.interest || lead.message || 'Consultoria / Empreitada'}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">Origem: {lead.source || 'Direto'}</div>
                                            </TableCell>
                                            <TableCell>
                                                {getPriorityBadge(lead.priority)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs font-medium">
                                                    {lead.assignedTo?.displayName || 'Equipa Comercial'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(lead.status)}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {lead.createdAt 
                                                    ? format((lead.createdAt as any).toDate ? (lead.createdAt as any).toDate() : new Date(lead.createdAt as any), 'dd/MM/yyyy') 
                                                    : 'N/A'
                                                }
                                            </TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                {lead.status !== 'Convertido' ? (
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        className="h-8 text-xs gap-1 text-primary hover:bg-primary hover:text-white"
                                                        onClick={() => setConvertingLead(lead)}
                                                    >
                                                        <Sparkles className="h-3.5 w-3.5" /> Converter
                                                    </Button>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50">
                                                        ✓ No Funil
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* STEP-BY-STEP PROGRESSIVE LEAD WIZARD DIALOG (5 STEPS) */}
            <Dialog open={isWizardOpen} onOpenChange={(open) => !open && resetWizard()}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <div className="flex items-center justify-between pr-4">
                            <DialogTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                Novo Lead Comercial
                            </DialogTitle>
                            <Badge variant="secondary" className="text-xs font-mono">
                                Etapa {currentStep} de 5
                            </Badge>
                        </div>
                        <DialogDescription>
                            {currentStep === 1 && "Etapa 1: Quem é a pessoa e a organização?"}
                            {currentStep === 2 && "Etapa 2: Como podemos contactar?"}
                            {currentStep === 3 && "Etapa 3: O que procuram ou necessitam?"}
                            {currentStep === 4 && "Etapa 4: Quem cuidará deste relacionamento?"}
                            {currentStep === 5 && "Etapa 5: Confirmação e registo"}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Step progress bar */}
                    <div className="grid grid-cols-5 gap-1.5 my-2">
                        {[1, 2, 3, 4, 5].map((step) => (
                            <div 
                                key={step} 
                                className={`h-1.5 rounded-full transition-all ${
                                    step <= currentStep ? 'bg-primary' : 'bg-muted'
                                }`}
                            />
                        ))}
                    </div>

                    <div className="py-3">
                        {/* STEP 1: Quem é? */}
                        {currentStep === 1 && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="w-name">Nome do Contacto / Decisor *</Label>
                                    <Input 
                                        id="w-name" 
                                        value={name} 
                                        onChange={e => setName(e.target.value)} 
                                        placeholder="Ex: Eng. Manuel dos Santos" 
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="w-company">Empresa / Entidade Adjudicante</Label>
                                    <Input 
                                        id="w-company" 
                                        value={company} 
                                        onChange={e => setCompany(e.target.value)} 
                                        placeholder="Ex: Sonangol Distribuidora / Governo Provincial" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="w-role">Cargo ou Função</Label>
                                    <Input 
                                        id="w-role" 
                                        value={role} 
                                        onChange={e => setRole(e.target.value)} 
                                        placeholder="Ex: Diretor de Infraestruturas / Chefe de Compras" 
                                    />
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Como contactar? */}
                        {currentStep === 2 && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="w-email">Email Corporativo *</Label>
                                    <Input 
                                        id="w-email" 
                                        type="email" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        placeholder="manuel.santos@empresa.co.ao" 
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="w-phone">Telefone / WhatsApp</Label>
                                    <Input 
                                        id="w-phone" 
                                        value={phone} 
                                        onChange={e => setPhone(e.target.value)} 
                                        placeholder="+244 923 000 000" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="w-loc">Localização (Província / Cidade)</Label>
                                    <Input 
                                        id="w-loc" 
                                        value={location} 
                                        onChange={e => setLocation(e.target.value)} 
                                        placeholder="Ex: Luanda (Talatona), Benguela, Huambo" 
                                    />
                                </div>
                            </div>
                        )}

                        {/* STEP 3: O que procura? */}
                        {currentStep === 3 && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label>Setor de Atividade</Label>
                                    <Select value={industry} onValueChange={(v) => setIndustry(v as AccountIndustry)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Construção Civil">Construção Civil</SelectItem>
                                            <SelectItem value="Infraestruturas">Infraestruturas Rodoviárias & Urbanas</SelectItem>
                                            <SelectItem value="Mineração & Energia">Mineração & Energia</SelectItem>
                                            <SelectItem value="Imobiliário">Imobiliário & Habitação</SelectItem>
                                            <SelectItem value="Governo">Governo & Entidades Públicas</SelectItem>
                                            <SelectItem value="Serviços de Engenharia">Serviços de Fiscalização & Engenharia</SelectItem>
                                            <SelectItem value="Particular">Particular</SelectItem>
                                            <SelectItem value="Outro">Outro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="w-interest">Interesse Principal / Tipo de Obra</Label>
                                        <span className="text-[11px] text-muted-foreground">Sugestões rápidas</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                                        {['Construção de Edifício', 'Pavimentação / Terraplanagem', 'Armazém Logístico', 'Fiscalização Técnica', 'Estruturas de Betão'].map(chip => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => setInterest(chip)}
                                                className="text-xs px-2.5 py-0.5 rounded-full border bg-muted/40 hover:bg-muted text-muted-foreground border-border hover:text-foreground"
                                            >
                                                + {chip}
                                            </button>
                                        ))}
                                    </div>
                                    <Input 
                                        id="w-interest" 
                                        value={interest} 
                                        onChange={e => setInterest(e.target.value)} 
                                        placeholder="Ex: Empreitada de Pavimentação Asfáltica e Drenagem" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Nível de Prioridade</Label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {(['Baixa', 'Média', 'Alta', 'Urgente'] as LeadPriority[]).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setPriority(p)}
                                                className={`py-1.5 text-xs font-medium rounded-md border text-center transition-all ${
                                                    priority === p
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-card hover:bg-muted text-muted-foreground border-border'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: Quem será responsável? */}
                        {currentStep === 4 && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label>Responsável Comercial</Label>
                                    <Select 
                                        value={assignedToUid} 
                                        onValueChange={setAssignedToUid}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Selecione um comercial ou deixe consigo..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={user?.uid || 'me'}>
                                                Atribuir a mim ({user?.displayName || user?.email})
                                            </SelectItem>
                                            {users.filter(u => u.uid !== user?.uid).map(u => (
                                                <SelectItem key={u.uid} value={u.uid}>
                                                    {u.displayName || u.email}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Origem do Contacto</Label>
                                    <Select value={source} onValueChange={setSource}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Indicação Comercial">Indicação Comercial</SelectItem>
                                            <SelectItem value="Website / Landing Page">Website / Landing Page</SelectItem>
                                            <SelectItem value="Concurso Público / Anúncio">Concurso Público / Anúncio</SelectItem>
                                            <SelectItem value="Redes Sociais / LinkedIn">Redes Sociais / LinkedIn</SelectItem>
                                            <SelectItem value="Feira / Evento Técnico">Feira / Evento Técnico</SelectItem>
                                            <SelectItem value="Prospeção Ativa / Outbound">Prospeção Ativa / Outbound</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="w-notes">Observações & Contexto Inicial</Label>
                                    <Textarea 
                                        id="w-notes" 
                                        value={notes} 
                                        onChange={e => setNotes(e.target.value)} 
                                        placeholder="Informações adicionais sobre prazos, requisitos do cliente ou contactos prévios..." 
                                        rows={3} 
                                    />
                                </div>
                            </div>
                        )}

                        {/* STEP 5: Confirmar */}
                        {currentStep === 5 && (
                            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                                <div className="flex items-center justify-between pb-2 border-b">
                                    <span className="text-xs text-muted-foreground">Resumo do Lead Comercial</span>
                                    <Badge className="bg-primary text-primary-foreground">{priority}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-muted-foreground block">Contacto Principal:</span>
                                        <span className="font-semibold text-foreground text-sm">{name}</span>
                                        {role && <span className="block text-muted-foreground">{role}</span>}
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Empresa / Entidade:</span>
                                        <span className="font-semibold text-foreground text-sm">{company || 'Particular / Não especificado'}</span>
                                        <span className="block text-muted-foreground">{industry}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Email & Telefone:</span>
                                        <span className="font-medium">{email}</span>
                                        <span className="block text-muted-foreground">{phone || 'Sem telefone'}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Localização & Origem:</span>
                                        <span className="font-medium">{location}</span>
                                        <span className="block text-muted-foreground">{source}</span>
                                    </div>
                                </div>
                                {interest && (
                                    <div className="pt-2 border-t text-xs">
                                        <span className="text-muted-foreground block">Interesse / Objeto:</span>
                                        <span className="font-medium text-foreground">{interest}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex items-center justify-between sm:justify-between">
                        {currentStep > 1 ? (
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setCurrentStep(prev => prev - 1)}
                            >
                                Voltar
                            </Button>
                        ) : (
                            <Button type="button" variant="ghost" onClick={resetWizard}>
                                Cancelar
                            </Button>
                        )}

                        {currentStep < 5 ? (
                            <Button 
                                type="button" 
                                onClick={() => {
                                    if (currentStep === 1 && !name.trim()) {
                                        toast({ title: "Indique o nome do contacto", variant: "destructive" });
                                        return;
                                    }
                                    if (currentStep === 2 && !email.trim()) {
                                        toast({ title: "Indique o e-mail de contacto", variant: "destructive" });
                                        return;
                                    }
                                    setCurrentStep(prev => prev + 1);
                                }}
                            >
                                Próximo Passo <ArrowRight className="h-4 w-4 ml-1.5" />
                            </Button>
                        ) : (
                            <Button 
                                type="button" 
                                onClick={handleCreateLead} 
                                disabled={isSubmitting}
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                Confirmar & Registar Lead
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CONVERT LEAD MODAL (1-CLICK CONVERSION) */}
            <Dialog open={!!convertingLead} onOpenChange={(open) => !open && setConvertingLead(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Converter Lead em Cliente & Oportunidade
                        </DialogTitle>
                        <DialogDescription>
                            O sistema criará automaticamente a <strong>Conta da Empresa</strong>, o <strong>Contacto</strong> e a <strong>Oportunidade no Funil</strong> sem necessidade de reintroduzir dados.
                        </DialogDescription>
                    </DialogHeader>

                    {convertingLead && (
                        <div className="space-y-4 py-3">
                            <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-1.5">
                                <div className="font-semibold text-foreground text-sm">
                                    {convertingLead.company || convertingLead.name}
                                </div>
                                <div className="text-muted-foreground">
                                    Contacto: {convertingLead.name} ({convertingLead.email})
                                </div>
                                {convertingLead.interest && (
                                    <div className="text-primary font-medium">
                                        Escopo: {convertingLead.interest}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="conv-opp-val">Valor Estimado do Negócio (Kz)</Label>
                                <Input
                                    id="conv-opp-val"
                                    type="number"
                                    value={convertOppValue}
                                    onChange={(e) => setConvertOppValue(e.target.value)}
                                    placeholder="ex.: 25000000"
                                />
                                <span className="text-[11px] text-muted-foreground">
                                    Valor preliminar para previsão de receitas no pipeline.
                                </span>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConvertingLead(null)}>Cancelar</Button>
                        <Button onClick={handleConvertLead} disabled={isConverting} className="gap-2">
                            {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            Confirmar Conversão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
