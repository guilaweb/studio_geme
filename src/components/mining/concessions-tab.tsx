'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { type Concession, type ConcessionStatus, type MiningMethod } from '@/types/mining';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, FileText, CalendarIcon, Download, Search, MapPin, ShieldCheck, AlertTriangle, Building2, Compass, Trash2, Globe, ExternalLink } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '../ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { format, differenceInDays, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';

interface ConcessionsTabProps {
    projectId: string;
    userRole: UserRole | null;
}

const ANGOLAN_PROVINCES = [
    'Bengo',
    'Benguela',
    'Bié',
    'Cabinda',
    'Cuando Cubango',
    'Cuanza Norte',
    'Cuanza Sul',
    'Cunene',
    'Huambo',
    'Huíla',
    'Luanda',
    'Lunda Norte',
    'Lunda Sul',
    'Malanje',
    'Moxico',
    'Namibe',
    'Uíge',
    'Zaire'
];

export default function ConcessionsTab({ projectId, userRole }: ConcessionsTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    const [concessions, setConcessions] = useState<Concession[]>([]);
    const [loading, setLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [provinceFilter, setProvinceFilter] = useState('Todas');
    const [statusFilter, setStatusFilter] = useState('Todos');

    // Form state
    const [name, setName] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [issuingAuthority, setIssuingAuthority] = useState('MIREMPET / ANRM');
    const [mineralType, setMineralType] = useState('Diamantes');
    const [province, setProvince] = useState('Lunda Norte');
    const [area, setArea] = useState('');
    const [holder, setHolder] = useState('');
    const [miningMethod, setMiningMethod] = useState<MiningMethod>('Aluvionar');
    const [coordinates, setCoordinates] = useState('');
    const [legalStatus, setLegalStatus] = useState<ConcessionStatus>('Ativa');
    const [validityStart, setValidityStart] = useState<Date | undefined>();
    const [validityEnd, setValidityEnd] = useState<Date | undefined>();
    const [concessionFile, setConcessionFile] = useState<File | null>(null);
    const [selectedConcessionForCoords, setSelectedConcessionForCoords] = useState<Concession | null>(null);
    const [isCoordsDialogOpen, setIsCoordsDialogOpen] = useState(false);
    const [deletingConcessionId, setDeletingConcessionId] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'concessions'), orderBy('validityEnd', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                validityStart: (doc.data().validityStart as any)?.toDate ? (doc.data().validityStart as any).toDate() : new Date(doc.data().validityStart),
                validityEnd: (doc.data().validityEnd as any)?.toDate ? (doc.data().validityEnd as any).toDate() : new Date(doc.data().validityEnd),
            } as Concession));
            setConcessions(fetchedData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching concessions: ", error);
            toast({ title: 'Erro ao carregar concessões', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, toast]);

    const resetForm = () => {
        setName('');
        setLicenseNumber('');
        setIssuingAuthority('MIREMPET / ANRM');
        setMineralType('Diamantes');
        setProvince('Lunda Norte');
        setArea('');
        setHolder('');
        setMiningMethod('Aluvionar');
        setCoordinates('');
        setLegalStatus('Ativa');
        setValidityStart(undefined);
        setValidityEnd(undefined);
        setConcessionFile(null);
        setIsDialogOpen(false);
    };

    const handleSubmit = async () => {
        if (!canEdit || !user || !idToken) return;
        if (!name.trim() || !mineralType.trim() || !province || !area || !holder.trim() || !validityStart || !validityEnd || !concessionFile) {
            toast({ 
                title: 'Campos obrigatórios em falta', 
                description: 'Preencha nome, tipo de mineral, província, área, titular, datas e anexe o documento.', 
                variant: 'destructive' 
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            if (licenseNumber.trim()) formData.append('licenseNumber', licenseNumber.trim());
            if (issuingAuthority.trim()) formData.append('issuingAuthority', issuingAuthority.trim());
            formData.append('mineralType', mineralType);
            formData.append('province', province);
            formData.append('area', area);
            formData.append('holder', holder);
            if (miningMethod) formData.append('miningMethod', miningMethod);
            if (coordinates.trim()) formData.append('coordinates', coordinates.trim());
            formData.append('legalStatus', legalStatus);
            formData.append('validityStart', validityStart.toISOString());
            formData.append('validityEnd', validityEnd.toISOString());
            formData.append('file', concessionFile);

            const response = await fetch(`/api/projects/${projectId}/concessions`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${idToken}` },
                body: formData,
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Falha ao registar a concessão.');
            }

            toast({ title: 'Concessão mineira registada com sucesso!' });
            resetForm();
        } catch (error: any) {
            toast({ title: 'Erro ao registar concessão', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConcession = async (concessionId: string) => {
        if (!canEdit || !idToken) return;
        if (!confirm('Tem a certeza de que deseja eliminar esta concessão mineira? Esta ação não pode ser desfeita.')) {
            return;
        }

        setDeletingConcessionId(concessionId);
        try {
            const response = await fetch(`/api/projects/${projectId}/concessions/${concessionId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${idToken}` },
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Falha ao eliminar concessão.');
            }

            toast({ title: 'Concessão eliminada com sucesso!' });
        } catch (error: any) {
            console.error("Error deleting concession:", error);
            toast({ title: 'Erro ao eliminar concessão', description: error.message, variant: 'destructive' });
        } finally {
            setDeletingConcessionId(null);
        }
    };

    const handleOpenCoords = (c: Concession) => {
        setSelectedConcessionForCoords(c);
        setIsCoordsDialogOpen(true);
    };

    // KPIs
    const kpiSummary = useMemo(() => {
        const total = concessions.length;
        const totalArea = concessions.reduce((sum, c) => sum + (c.area || 0), 0);
        const active = concessions.filter(c => c.legalStatus === 'Ativa').length;
        const today = new Date();
        const expiringSoon = concessions.filter(c => {
            if (c.legalStatus !== 'Ativa') return false;
            const days = differenceInDays(c.validityEnd, today);
            return days >= 0 && days <= 90;
        }).length;

        return { total, totalArea, active, expiringSoon };
    }, [concessions]);

    // Filtering
    const filteredConcessions = useMemo(() => {
        return concessions.filter(c => {
            const matchesSearch = searchTerm === '' ||
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.holder.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.mineralType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.licenseNumber && c.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesProvince = provinceFilter === 'Todas' || c.province === provinceFilter;
            const matchesStatus = statusFilter === 'Todos' || c.legalStatus === statusFilter;

            return matchesSearch && matchesProvince && matchesStatus;
        });
    }, [concessions, searchTerm, provinceFilter, statusFilter]);
    
    const getStatusVariant = (status: ConcessionStatus) => {
        switch (status) {
            case 'Ativa': return 'default';
            case 'Em Renovação':
            case 'Pendente':
                return 'secondary';
            case 'Expirada': return 'destructive';
            default: return 'outline';
        }
    };
    
    const getExpiryStatus = (expiryDate: Date): { status: string; className: string } => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isBefore(expiryDate, today)) {
            return { status: 'Expirada', className: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300' };
        }
        const daysLeft = differenceInDays(expiryDate, today);
        if (daysLeft <= 90) {
            return { status: `${daysLeft} dias (Atenção)`, className: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300' };
        }
        return { status: `${daysLeft} dias (Regular)`, className: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300' };
    };

    return (
        <div className="space-y-6">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Títulos Mineiros</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiSummary.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">Concessões no portfólio</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Área Total Titulada</CardTitle>
                        <MapPin className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {kpiSummary.totalArea.toLocaleString('pt-AO')} <span className="text-sm font-normal text-muted-foreground">km²</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Superfície sob direito mineiro</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Concessões Ativas</CardTitle>
                        <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{kpiSummary.active}</div>
                        <p className="text-xs text-muted-foreground mt-1">Em exploração contínua</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Alertas de Renovação</CardTitle>
                        <AlertTriangle className={cn("h-4 w-4", kpiSummary.expiringSoon > 0 ? "text-amber-500 animate-pulse" : "text-muted-foreground")} />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", kpiSummary.expiringSoon > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                            {kpiSummary.expiringSoon}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Expiram em menos de 90 dias</p>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <FileText className="h-5 w-5 text-primary"/> Gestão de Concessões & Títulos Mineiros
                            </CardTitle>
                            <CardDescription>
                                Gestão jurídica de direitos mineiros emitidos pelo MIREMPET / ANRM, acompanhamento de validades e documentação legal.
                            </CardDescription>
                        </div>
                        {canEdit && (
                            <DialogTrigger asChild>
                                <Button className="shadow-sm">
                                    <Plus className="mr-2 h-4 w-4"/>Registar Nova Concessão
                                </Button>
                            </DialogTrigger>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {kpiSummary.expiringSoon > 0 && (
                            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs">
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold text-amber-700 dark:text-amber-400 block mb-0.5">
                                        Aviso de Conformidade Legal (Lei nº 31/11 - Código Mineiro de Angola)
                                    </span>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Existem <strong>{kpiSummary.expiringSoon}</strong> título(s) mineiro(s) com validade a expirar nos próximos 90 dias.
                                        Para assegurar a continuidade das operações de lavra sem suspensão de direitos, submeta o processo de prorrogação junto da ANRM / MIREMPET.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Pesquisar por concessão, titular, alvará ou minério..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9 bg-background"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                                    <SelectTrigger className="w-[140px] h-9 bg-background">
                                        <SelectValue placeholder="Província" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todas">Todas Províncias</SelectItem>
                                        {ANGOLAN_PROVINCES.map(p => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px] h-9 bg-background">
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todos Estados</SelectItem>
                                        <SelectItem value="Ativa">Ativa</SelectItem>
                                        <SelectItem value="Em Renovação">Em Renovação</SelectItem>
                                        <SelectItem value="Pendente">Pendente</SelectItem>
                                        <SelectItem value="Expirada">Expirada</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center p-12 text-muted-foreground gap-2">
                                <Loader2 className="animate-spin h-5 w-5 text-primary" /> Carregando concessões...
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="font-semibold text-xs">Concessão / Alvará</TableHead>
                                            <TableHead className="font-semibold text-xs">Minério</TableHead>
                                            <TableHead className="font-semibold text-xs">Província & Localização</TableHead>
                                            <TableHead className="font-semibold text-xs">Titular / Operador</TableHead>
                                            <TableHead className="font-semibold text-xs text-right">Área (km²)</TableHead>
                                            <TableHead className="font-semibold text-xs">Validade</TableHead>
                                            <TableHead className="font-semibold text-xs">Estado</TableHead>
                                            <TableHead className="font-semibold text-xs">Prazo</TableHead>
                                            <TableHead className="font-semibold text-xs text-right">Documento</TableHead>
                                            <TableHead className="font-semibold text-xs text-center">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredConcessions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={10} className="h-28 text-center text-muted-foreground">
                                                    Nenhuma concessão encontrada para os filtros selecionados.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredConcessions.map(item => {
                                                const expiry = getExpiryStatus(item.validityEnd);
                                                return (
                                                    <TableRow key={item.id} className="hover:bg-muted/10">
                                                        <TableCell className="font-medium">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold">{item.name}</span>
                                                                {item.licenseNumber ? (
                                                                    <span className="text-xs font-mono text-muted-foreground">{item.licenseNumber}</span>
                                                                ) : (
                                                                    <span className="text-[11px] text-muted-foreground">S/ alvará explícito</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium">{item.mineralType}</span>
                                                                {item.miningMethod && (
                                                                    <span className="text-[11px] text-muted-foreground">{item.miningMethod}</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5 text-sm">
                                                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                                <span>{item.province}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                                            {item.holder}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-medium text-sm">
                                                            {item.area.toLocaleString('pt-AO')}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-mono text-muted-foreground">
                                                            {format(item.validityEnd, 'dd/MM/yyyy')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={getStatusVariant(item.legalStatus)} className="text-xs">
                                                                {item.legalStatus}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={cn("text-[11px] font-medium", expiry.className)}>
                                                                {expiry.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {item.fileUrl ? (
                                                                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                                                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                                                                        <Download className="mr-1.5 h-3.5 w-3.5 text-primary"/>Ver
                                                                    </a>
                                                                </Button>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic">Sem anexo</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0"
                                                                    title="Ver Coordenadas / Poligonal"
                                                                    onClick={() => handleOpenCoords(item)}
                                                                >
                                                                    <Compass className="h-4 w-4 text-primary" />
                                                                </Button>
                                                                {canEdit && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                        title="Eliminar Concessão"
                                                                        disabled={deletingConcessionId === item.id}
                                                                        onClick={() => handleDeleteConcession(item.id)}
                                                                    >
                                                                        {deletingConcessionId === item.id ? (
                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                        ) : (
                                                                            <Trash2 className="h-4 w-4" />
                                                                        )}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Dialog: Nova Concessão */}
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" /> Registar Concessão Mineira
                        </DialogTitle>
                        <DialogDescription>
                            Introduza os dados legais da concessão, título do MIREMPET e anexe o alvará em PDF.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 space-y-4 max-h-[72vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="concession-name" className="text-xs font-semibold">Nome da Concessão *</Label>
                                <Input 
                                    id="concession-name" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    placeholder="Ex: Concessão Mineira de Catoca"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="license-num" className="text-xs font-semibold">Nº do Alvará / Título MIREMPET</Label>
                                <Input 
                                    id="license-num" 
                                    value={licenseNumber} 
                                    onChange={e => setLicenseNumber(e.target.value)} 
                                    placeholder="Ex: ALV-MIREMPET-2025/112"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="mineral-type" className="text-xs font-semibold">Tipo de Minério *</Label>
                                <Input 
                                    id="mineral-type" 
                                    value={mineralType} 
                                    onChange={e => setMineralType(e.target.value)} 
                                    placeholder="Ex: Diamantes, Ouro, Ferro"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Província de Angola *</Label>
                                <Select value={province} onValueChange={setProvince}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-56">
                                        {ANGOLAN_PROVINCES.map(prov => (
                                            <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="area" className="text-xs font-semibold">Área Titulada (km²) *</Label>
                                <Input 
                                    id="area" 
                                    type="number" 
                                    step="0.01" 
                                    value={area} 
                                    onChange={e => setArea(e.target.value)} 
                                    placeholder="Ex: 64.5"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="holder" className="text-xs font-semibold">Empresa Titular / Sociedade Mineira *</Label>
                                <Input 
                                    id="holder" 
                                    value={holder} 
                                    onChange={e => setHolder(e.target.value)} 
                                    placeholder="Ex: Sociedade Mineira do Cuango, Lda"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Método de Exploração</Label>
                                <Select value={miningMethod} onValueChange={(v) => setMiningMethod(v as MiningMethod)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Aluvionar">Aluvionar</SelectItem>
                                        <SelectItem value="Quimberlito">Quimberlito</SelectItem>
                                        <SelectItem value="Céu Aberto">Céu Aberto</SelectItem>
                                        <SelectItem value="Subterrânea">Subterrânea</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Data de Início da Concessão *</Label>
                                <DatePicker date={validityStart} setDate={setValidityStart} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Data de Término / Caducidade *</Label>
                                <DatePicker date={validityEnd} setDate={setValidityEnd} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Estado Legal</Label>
                                <Select value={legalStatus} onValueChange={(v) => setLegalStatus(v as ConcessionStatus)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Ativa">Ativa</SelectItem>
                                        <SelectItem value="Em Renovação">Em Renovação</SelectItem>
                                        <SelectItem value="Pendente">Pendente</SelectItem>
                                        <SelectItem value="Expirada">Expirada</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="coordinates" className="text-xs font-semibold">Coordenadas / Vértices do Polígono</Label>
                                <Input 
                                    id="coordinates" 
                                    value={coordinates} 
                                    onChange={e => setCoordinates(e.target.value)} 
                                    placeholder="Ex: 08°24'S 20°35'E"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t">
                            <Label htmlFor="concession-file" className="text-xs font-semibold">
                                Documento do Alvará / Título (PDF obrigatório) *
                            </Label>
                            <Input 
                                id="concession-file" 
                                type="file" 
                                accept=".pdf,.doc,.docx" 
                                onChange={e => setConcessionFile(e.target.files ? e.target.files[0] : null)}
                                className="cursor-pointer file:cursor-pointer"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Anexe a cópia autenticada do Diário da República ou Título emitido pela ANRM.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t">
                        <Button variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="shadow-sm">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Plus className="mr-2 h-4 w-4"/>}
                            Gravar Concessão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Coordenadas e Delimitação Geodésica do Polígono */}
            <Dialog open={isCoordsDialogOpen} onOpenChange={setIsCoordsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader className="border-b pb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Compass className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold">Delimitação Geodésica da Concessão</DialogTitle>
                                <DialogDescription className="text-xs">
                                    Vértices do polígono do título mineiro em WGS84 / UTM
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedConcessionForCoords && (
                        <div className="space-y-4 py-2 text-xs">
                            <div className="bg-muted/40 p-3 rounded-lg border space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-sm text-foreground">{selectedConcessionForCoords.name}</span>
                                    <Badge variant="outline">{selectedConcessionForCoords.legalStatus}</Badge>
                                </div>
                                <p className="text-muted-foreground">
                                    Alvará: <strong className="text-foreground">{selectedConcessionForCoords.licenseNumber || 'N/A'}</strong> | Província: <strong className="text-foreground">{selectedConcessionForCoords.province}</strong>
                                </p>
                                <p className="text-muted-foreground">
                                    Superfície Titulada: <strong className="text-foreground">{selectedConcessionForCoords.area.toLocaleString('pt-AO')} km²</strong> | Minério: <strong className="text-foreground">{selectedConcessionForCoords.mineralType}</strong>
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Coordenadas dos Vértices da Poligonal</Label>
                                {selectedConcessionForCoords.coordinates ? (
                                    <div className="p-3 bg-muted/20 rounded-md border font-mono text-xs whitespace-pre-wrap leading-relaxed">
                                        {selectedConcessionForCoords.coordinates}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-muted/10 rounded-md border text-center text-muted-foreground italic">
                                        Nenhuma coordenada geográfica explícita registada para este título.
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-[11px] text-blue-700 dark:text-blue-300">
                                <div className="flex items-center gap-1.5">
                                    <Globe className="h-4 w-4 shrink-0 text-blue-500" />
                                    <span>Assegure que os vértices estão no Sistema Geodésico Nacional de Angola (Camacupa / WGS84).</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="border-t pt-3">
                        <Button variant="ghost" size="sm" onClick={() => setIsCoordsDialogOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
