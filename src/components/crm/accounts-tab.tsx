'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    Plus,
    Building2,
    Search,
    MapPin,
    Phone,
    Mail,
    Globe,
    UserCheck,
    Filter,
    Briefcase,
    Users
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account, type AccountIndustry, type AccountRating, type AccountStatus, type Contact } from '@/types/crm';

interface AccountsTabProps {
    initialAccounts: Account[];
    onAccountClick: (account: Account) => void;
    users?: any[];
}

export function AccountsTab({ initialAccounts, onAccountClick, users = [] }: AccountsTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Filters and Search
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
    const [selectedRating, setSelectedRating] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    // Dialog state
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    
    // Form fields
    const [name, setName] = useState('');
    const [nif, setNif] = useState('');
    const [industry, setIndustry] = useState<AccountIndustry>('Construção Civil');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState('');
    const [city, setCity] = useState('Luanda');
    const [address, setAddress] = useState('');
    const [rating, setRating] = useState<AccountRating>('Estratégico');
    const [status, setStatus] = useState<AccountStatus>('Ativo');
    const [assignedToUid, setAssignedToUid] = useState<string>('');
    const [initialContactName, setInitialContactName] = useState('');
    const [initialContactRole, setInitialContactRole] = useState('');
    const [initialContactPhone, setInitialContactPhone] = useState('');

    const resetForm = () => {
        setName('');
        setNif('');
        setIndustry('Construção Civil');
        setPhone('');
        setEmail('');
        setWebsite('');
        setCity('Luanda');
        setAddress('');
        setRating('Estratégico');
        setStatus('Ativo');
        setAssignedToUid('');
        setInitialContactName('');
        setInitialContactRole('');
        setInitialContactPhone('');
        setIsAddAccountOpen(false);
    };

    const handleAddAccount = async () => {
        if (!name.trim()) {
            toast({ title: "Nome da empresa é obrigatório", variant: "destructive" });
            return;
        }
        if (!user) return;

        setIsSubmitting(true);
        try {
            const assignedUser = users.find(u => u.uid === assignedToUid);

            const initialContacts: Contact[] = [];
            if (initialContactName.trim()) {
                initialContacts.push({
                    id: `contact-${Date.now()}`,
                    name: initialContactName.trim(),
                    role: initialContactRole.trim() || 'Ponto de Contacto',
                    phone: initialContactPhone.trim() || undefined,
                    isPrimary: true,
                    createdAt: new Date(),
                });
            }

            await addDoc(collection(db, 'accounts'), {
                name: name.trim(),
                nif: nif.trim() || undefined,
                industry,
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
                website: website.trim() || undefined,
                city: city.trim() || undefined,
                address: address.trim() || undefined,
                rating,
                status,
                assignedTo: assignedUser ? {
                    uid: assignedUser.uid,
                    displayName: assignedUser.displayName || assignedUser.email,
                } : undefined,
                contacts: initialContacts,
                createdAt: serverTimestamp(),
                author: {
                    uid: user.uid,
                    displayName: user.displayName || user.email,
                }
            });

            toast({ title: "Conta adicionada com sucesso!" });
            resetForm();
        } catch (error) {
            console.error("Error adding account: ", error);
            toast({ title: "Erro ao adicionar conta", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredAccounts = useMemo(() => {
        return initialAccounts.filter(acc => {
            const matchesSearch =
                acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (acc.nif && acc.nif.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (acc.city && acc.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (acc.industry && acc.industry.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesIndustry = selectedIndustry === 'all' || acc.industry === selectedIndustry;
            const matchesRating = selectedRating === 'all' || acc.rating === selectedRating;
            const matchesStatus = selectedStatus === 'all' || acc.status === selectedStatus;

            return matchesSearch && matchesIndustry && matchesRating && matchesStatus;
        });
    }, [initialAccounts, searchTerm, selectedIndustry, selectedRating, selectedStatus]);

    const getRatingBadge = (r?: AccountRating) => {
        switch (r) {
            case 'Estratégico':
                return <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-medium">Estratégico</Badge>;
            case 'Frequente':
                return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Frequente</Badge>;
            case 'Pontual':
            default:
                return <Badge variant="secondary">Pontual</Badge>;
        }
    };

    const getStatusBadge = (s?: AccountStatus) => {
        switch (s) {
            case 'Ativo':
                return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">Ativo</Badge>;
            case 'Potencial':
                return <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-medium">Potencial</Badge>;
            case 'Inativo':
                return <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>;
            default:
                return <Badge variant="outline">Ativo</Badge>;
        }
    };

    return (
        <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
            <div className="space-y-4">
                {/* Header Actions & Quick Search */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por empresa, NIF, cidade ou setor..."
                            className="pl-9 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                            <SelectTrigger className="w-[170px] bg-background">
                                <SelectValue placeholder="Setor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Setores</SelectItem>
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

                        <Select value={selectedRating} onValueChange={setSelectedRating}>
                            <SelectTrigger className="w-[150px] bg-background">
                                <SelectValue placeholder="Classificação" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Qualquer Rating</SelectItem>
                                <SelectItem value="Estratégico">Estratégico</SelectItem>
                                <SelectItem value="Frequente">Frequente</SelectItem>
                                <SelectItem value="Pontual">Pontual</SelectItem>
                            </SelectContent>
                        </Select>

                        <DialogTrigger asChild>
                            <Button className="gap-1.5 shadow-sm">
                                <Plus className="h-4 w-4" /> Nova Conta
                            </Button>
                        </DialogTrigger>
                    </div>
                </div>

                {/* Accounts Table Card */}
                <Card className="border shadow-sm">
                    <CardHeader className="py-4 border-b bg-muted/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    Empresas & Contas ({filteredAccounts.length})
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Carteira de clientes institucionais, empresas contratantes e parceiros de negócio.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[280px]">Empresa / Cliente</TableHead>
                                        <TableHead>Setor de Atividade</TableHead>
                                        <TableHead>Localização</TableHead>
                                        <TableHead>Classificação</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-center">Contactos</TableHead>
                                        <TableHead>Gestor de Conta</TableHead>
                                        <TableHead className="text-right">Ação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAccounts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                                Nenhuma empresa ou conta encontrada com os critérios selecionados.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredAccounts.map(account => (
                                            <TableRow
                                                key={account.id}
                                                onClick={() => onAccountClick(account)}
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                            >
                                                <TableCell>
                                                    <div className="font-semibold text-foreground flex items-center gap-2">
                                                        {account.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                                        {account.nif ? (
                                                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">NIF: {account.nif}</span>
                                                        ) : (
                                                            <span>Sem NIF</span>
                                                        )}
                                                        {account.website && (
                                                            <span className="text-primary hover:underline flex items-center gap-0.5">
                                                                <Globe className="h-3 w-3" /> Site
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-normal text-xs">
                                                        {account.industry || 'Geral'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm flex items-center gap-1 text-muted-foreground">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        {account.city || 'Luanda'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getRatingBadge(account.rating)}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(account.status)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="secondary" className="font-mono text-xs">
                                                        <Users className="h-3 w-3 mr-1 inline" />
                                                        {account.contacts?.length || 0}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs flex items-center gap-1.5 text-muted-foreground">
                                                        <UserCheck className="h-3.5 w-3.5 text-primary" />
                                                        <span>{account.assignedTo?.displayName || account.author?.displayName || 'Não atribuído'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" className="h-8 text-primary">
                                                        Visão 360° →
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* MODAL: ADICIONAR NOVA CONTA */}
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Registar Nova Empresa / Conta
                    </DialogTitle>
                    <DialogDescription>
                        Insira os dados empresariais e fiscais da organização cliente para a carteira comercial.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-name" className="text-xs font-semibold">Nome da Empresa / Razão Social *</Label>
                            <Input
                                id="acc-name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: Mota-Engil Angola, S.A."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-nif" className="text-xs font-semibold">NIF / Identificação Fiscal</Label>
                            <Input
                                id="acc-nif"
                                value={nif}
                                onChange={e => setNif(e.target.value)}
                                placeholder="Ex: 5418000123"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-industry" className="text-xs font-semibold">Setor de Atividade</Label>
                            <Select value={industry} onValueChange={(v) => setIndustry(v as AccountIndustry)}>
                                <SelectTrigger id="acc-industry">
                                    <SelectValue />
                                </SelectTrigger>
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
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-rating" className="text-xs font-semibold">Classificação / Rating</Label>
                            <Select value={rating} onValueChange={(v) => setRating(v as AccountRating)}>
                                <SelectTrigger id="acc-rating">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Estratégico">Estratégico (Prioridade Máxima)</SelectItem>
                                    <SelectItem value="Frequente">Frequente (Recorrente)</SelectItem>
                                    <SelectItem value="Pontual">Pontual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-status" className="text-xs font-semibold">Estado da Conta</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as AccountStatus)}>
                                <SelectTrigger id="acc-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Ativo">Ativo</SelectItem>
                                    <SelectItem value="Potencial">Potencial (Em prospecção)</SelectItem>
                                    <SelectItem value="Inativo">Inativo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-phone" className="text-xs font-semibold">Telefone Geral</Label>
                            <Input
                                id="acc-phone"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="+244 923 000 000"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-email" className="text-xs font-semibold">Email Geral</Label>
                            <Input
                                id="acc-email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="geral@empresa.co.ao"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-website" className="text-xs font-semibold">Website Corporativo</Label>
                            <Input
                                id="acc-website"
                                value={website}
                                onChange={e => setWebsite(e.target.value)}
                                placeholder="https://www.empresa.co.ao"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-city" className="text-xs font-semibold">Cidade / Província</Label>
                            <Input
                                id="acc-city"
                                value={city}
                                onChange={e => setCity(e.target.value)}
                                placeholder="Luanda"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-address" className="text-xs font-semibold">Endereço / Sede</Label>
                            <Input
                                id="acc-address"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                placeholder="Ex: Rua Rainha Ginga, Edifício Sky Business, Piso 8"
                            />
                        </div>
                    </div>

                    {users.length > 0 && (
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-assignee" className="text-xs font-semibold">Gestor Comercial Responsável</Label>
                            <Select value={assignedToUid} onValueChange={setAssignedToUid}>
                                <SelectTrigger id="acc-assignee">
                                    <SelectValue placeholder="Selecione um gestor da equipa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map(u => (
                                        <SelectItem key={u.uid} value={u.uid}>
                                            {u.displayName || u.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Contacto Primário Opcional */}
                    <div className="p-3 bg-muted/40 rounded-lg border space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Ponto de Contacto Principal (Opcional)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Input
                                placeholder="Nome do Responsável"
                                value={initialContactName}
                                onChange={e => setInitialContactName(e.target.value)}
                                className="h-9 text-xs"
                            />
                            <Input
                                placeholder="Cargo (Ex: Dir. de Obras)"
                                value={initialContactRole}
                                onChange={e => setInitialContactRole(e.target.value)}
                                className="h-9 text-xs"
                            />
                            <Input
                                placeholder="Telefone Directo"
                                value={initialContactPhone}
                                onChange={e => setInitialContactPhone(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button onClick={handleAddAccount} disabled={isSubmitting} className="gap-1.5">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Registar Empresa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
