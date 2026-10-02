'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    TowerControl, 
    Plus, 
    Search, 
    Filter, 
    MapPin, 
    Edit, 
    ExternalLink, 
    Loader2, 
    CheckCircle2, 
    Zap, 
    Radio, 
    SlidersHorizontal,
    Compass
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { TelecomSite, SiteType, SiteStatus, SitePowerType } from '@/types/telecom';
import type { WbsItem } from '@/types/wbs';
import { cn } from '@/lib/utils';

interface SitesManagementTabProps {
    projectId: string;
    sites: TelecomSite[];
    wbsItems: WbsItem[];
    canEdit: boolean;
    loading: boolean;
    onSiteUpdated?: () => void;
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

const SITE_TYPES: SiteType[] = [
    'Torre Greenfield',
    'Rooftop',
    'Poste / Monopolo',
    'Indoor / Small Cell'
];

const SITE_STATUSES: SiteStatus[] = [
    'Planeado',
    'Site Acquisition',
    'Obra Civil',
    'Instalação Telecom',
    'Comissionamento',
    'Ativo',
    'Em Manutenção',
    'Desativado'
];

const POWER_TYPES: SitePowerType[] = [
    'Rede Pública (ENDE)',
    'Gerador Diesel',
    'Híbrido Solar-Diesel',
    'Solar Fotovoltaico',
    'Baterias / BESS'
];

const OPERATORS = [
    'Unitel',
    'Africell',
    'Movicel',
    'Angola Telecom',
    'Partilhado (TowerCo)'
];

export default function SitesManagementTab({
    projectId,
    sites,
    wbsItems,
    canEdit,
    loading,
    onSiteUpdated
}: SitesManagementTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('Todos');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [provinceFilter, setProvinceFilter] = useState('Todas');

    // Form state
    const [siteIdCode, setSiteIdCode] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState<SiteType>('Torre Greenfield');
    const [status, setStatus] = useState<SiteStatus>('Planeado');
    const [progressPercent, setProgressPercent] = useState('10');
    const [towerHeightMeters, setTowerHeightMeters] = useState('45');
    const [operator, setOperator] = useState('Unitel');
    const [province, setProvince] = useState('Luanda');
    const [municipality, setMunicipality] = useState('');
    const [address, setAddress] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [altitudeMeters, setAltitudeMeters] = useState('');
    const [powerType, setPowerType] = useState<SitePowerType>('Rede Pública (ENDE)');
    const [targetOnAirDate, setTargetOnAirDate] = useState<Date | undefined>(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));
    const [selectedWbsItemId, setSelectedWbsItemId] = useState<string>('none');
    const [notes, setNotes] = useState('');

    // Status quick change dialog
    const [statusChangeSite, setStatusChangeSite] = useState<TelecomSite | null>(null);
    const [newStatus, setNewStatus] = useState<SiteStatus>('Ativo');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const resetForm = () => {
        setSiteIdCode('');
        setName('');
        setType('Torre Greenfield');
        setStatus('Planeado');
        setProgressPercent('10');
        setTowerHeightMeters('45');
        setOperator('Unitel');
        setProvince('Luanda');
        setMunicipality('');
        setAddress('');
        setLatitude('');
        setLongitude('');
        setAltitudeMeters('');
        setPowerType('Rede Pública (ENDE)');
        setTargetOnAirDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));
        setSelectedWbsItemId('none');
        setNotes('');
        setIsCreateOpen(false);
    };

    const handleCreateSite = async () => {
        if (!canEdit || !user || !idToken) return;
        if (!siteIdCode.trim() || !name.trim() || !latitude || !longitude || !province) {
            toast({ 
                title: 'Campos obrigatórios em falta', 
                description: 'Preencha o código do site, nome, província e coordenadas.', 
                variant: 'destructive' 
            });
            return;
        }

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lon)) {
            toast({ title: 'Coordenadas inválidas', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const wbsItem = wbsItems.find(w => w.id === selectedWbsItemId);

            const response = await fetch(`/api/projects/${projectId}/telecom-sites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    siteId: siteIdCode.trim().toUpperCase(),
                    name: name.trim(),
                    type,
                    status,
                    progressPercent: parseFloat(progressPercent) || 0,
                    towerHeightMeters: towerHeightMeters ? parseFloat(towerHeightMeters) : undefined,
                    operator,
                    province,
                    municipality: municipality.trim() || undefined,
                    address: address.trim() || undefined,
                    latitude: lat,
                    longitude: lon,
                    altitudeMeters: altitudeMeters ? parseFloat(altitudeMeters) : undefined,
                    powerType,
                    targetOnAirDate: targetOnAirDate ? targetOnAirDate.toISOString() : undefined,
                    wbsItemId: selectedWbsItemId !== 'none' ? selectedWbsItemId : null,
                    wbsItemName: wbsItem?.name || null,
                    notes: notes.trim() || undefined,
                    equipments: [],
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Falha ao cadastrar o site.');
            }

            toast({ title: 'Site de telecomunicações cadastrado com sucesso!' });
            resetForm();
            if (onSiteUpdated) onSiteUpdated();
        } catch (error: any) {
            console.error("Error creating site:", error);
            toast({ title: 'Erro ao cadastrar site', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQuickStatusUpdate = async () => {
        if (!canEdit || !idToken || !statusChangeSite) return;

        setIsUpdatingStatus(true);
        try {
            const isNowActive = newStatus === 'Ativo';
            const progressVal = isNowActive ? 100 : newStatus === 'Planeado' ? 10 : 60;

            const response = await fetch(`/api/projects/${projectId}/telecom-sites/${statusChangeSite.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    status: newStatus,
                    progressPercent: progressVal,
                    actualOnAirDate: isNowActive ? new Date().toISOString() : undefined,
                }),
            });

            if (!response.ok) throw new Error('Falha ao atualizar estado.');

            toast({ title: `Estado do site atualizado para: ${newStatus}` });
            setStatusChangeSite(null);
            if (onSiteUpdated) onSiteUpdated();
        } catch (error: any) {
            toast({ title: 'Erro ao atualizar estado', description: error.message, variant: 'destructive' });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // Filtered sites
    const filteredSites = useMemo(() => {
        return sites.filter(site => {
            const matchesSearch = searchTerm === '' ||
                site.siteId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (site.operator && site.operator.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (site.address && site.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (site.municipality && site.municipality.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesType = typeFilter === 'Todos' || site.type === typeFilter;
            const matchesStatus = statusFilter === 'Todos' || site.status === statusFilter;
            const matchesProvince = provinceFilter === 'Todas' || site.province === provinceFilter;

            return matchesSearch && matchesType && matchesStatus && matchesProvince;
        });
    }, [sites, searchTerm, typeFilter, statusFilter, provinceFilter]);

    const getStatusBadge = (siteStatus: SiteStatus) => {
        switch (siteStatus) {
            case 'Ativo':
                return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]">Ativo (On-Air)</Badge>;
            case 'Comissionamento':
                return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 text-[10px]">Comissionamento</Badge>;
            case 'Instalação Telecom':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 text-[10px]">Instalação Telecom</Badge>;
            case 'Obra Civil':
                return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[10px]">Obra Civil</Badge>;
            case 'Site Acquisition':
                return <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 text-[10px]">Licenciamento (SAC)</Badge>;
            case 'Planeado':
                return <Badge variant="secondary" className="text-[10px]">Planeado</Badge>;
            case 'Em Manutenção':
                return <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px]">Manutenção</Badge>;
            case 'Desativado':
                return <Badge variant="destructive" className="text-[10px]">Desativado</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">{siteStatus}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <TowerControl className="h-5 w-5 text-primary"/> Cadastro & Gestão de Sites de Telecomunicações
                            </CardTitle>
                            <CardDescription>
                                Controle o ciclo de vida completo de implantação (Greenfield, Rooftop, Poste), operadores e avanço de rollout.
                            </CardDescription>
                        </div>
                        {canEdit && (
                            <DialogTrigger asChild>
                                <Button className="shadow-sm">
                                    <Plus className="mr-2 h-4 w-4"/>Novo Site
                                </Button>
                            </DialogTrigger>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Pesquisar por código (ex: LUA-001), nome, operadora ou município..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9 bg-background"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-[150px] h-9 bg-background">
                                        <SelectValue placeholder="Tipologia" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todos Tipos</SelectItem>
                                        {SITE_TYPES.map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[150px] h-9 bg-background">
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todos Estados</SelectItem>
                                        {SITE_STATUSES.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                                    <SelectTrigger className="w-[140px] h-9 bg-background">
                                        <SelectValue placeholder="Província" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-56">
                                        <SelectItem value="Todas">Todas Províncias</SelectItem>
                                        {ANGOLAN_PROVINCES.map(p => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center p-12 text-muted-foreground gap-2">
                                <Loader2 className="animate-spin h-5 w-5 text-primary" /> Carregando sites...
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="text-xs font-semibold">Código / Nome</TableHead>
                                            <TableHead className="text-xs font-semibold">Tipologia</TableHead>
                                            <TableHead className="text-xs font-semibold">Localização & Coordenadas</TableHead>
                                            <TableHead className="text-xs font-semibold">Operadora / Torre</TableHead>
                                            <TableHead className="text-xs font-semibold">Energia</TableHead>
                                            <TableHead className="text-xs font-semibold">Rollout (%)</TableHead>
                                            <TableHead className="text-xs font-semibold">Estado</TableHead>
                                            <TableHead className="text-xs font-semibold text-right">Ação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSites.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-28 text-center text-xs text-muted-foreground">
                                                    Nenhum site encontrado para os critérios selecionados.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredSites.map(site => (
                                                <TableRow key={site.id} className="hover:bg-muted/10">
                                                    <TableCell className="font-medium text-xs">
                                                        <div>
                                                            <span className="font-bold font-mono text-primary text-xs">{site.siteId}</span>
                                                            <span className="font-semibold block text-foreground">{site.name}</span>
                                                            {site.wbsItemName && (
                                                                <span className="text-[10px] text-muted-foreground truncate block max-w-[150px]">
                                                                    {site.wbsItemName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {site.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div>
                                                            <span className="text-foreground font-medium block">
                                                                {site.province} {site.municipality && `• ${site.municipality}`}
                                                            </span>
                                                            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                                                                <Compass className="h-3 w-3" />
                                                                {site.latitude.toFixed(5)}, {site.longitude.toFixed(5)}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div>
                                                            <span className="font-semibold text-foreground block">{site.operator || 'Partilhado'}</span>
                                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                                {site.towerHeightMeters ? `Torre: ${site.towerHeightMeters}m` : 'Sem torre'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                                                            <span className="text-[11px]">{site.powerType || 'Rede (ENDE)'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <Progress value={site.progressPercent || 0} className="w-14 h-1.5" />
                                                            <span className="font-mono text-[11px]">{site.progressPercent || 0}%</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(site.status)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {canEdit && (
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="h-7 text-xs"
                                                                onClick={() => {
                                                                    setStatusChangeSite(site);
                                                                    setNewStatus(site.status);
                                                                }}
                                                            >
                                                                Alterar Estado
                                                            </Button>
                                                        )}
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

                {/* Dialog: Novo Site */}
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TowerControl className="h-5 w-5 text-primary" /> Cadastrar Novo Site de Telecomunicações
                        </DialogTitle>
                        <DialogDescription>
                            Configure a tipologia da infraestrutura, coordenadas geográficas, operadora e data estimada de On-Air.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 space-y-4 max-h-[72vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="site-code" className="text-xs font-semibold">Código do Site (Site ID) *</Label>
                                <Input 
                                    id="site-code" 
                                    value={siteIdCode} 
                                    onChange={(e) => setSiteIdCode(e.target.value)} 
                                    placeholder="Ex: LUA-014"
                                    className="font-mono text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-1.5 col-span-2">
                                <Label htmlFor="site-name" className="text-xs font-semibold">Nome do Site *</Label>
                                <Input 
                                    id="site-name" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    placeholder="Ex: Site Talatona Shopping / Mastro 1"
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Tipologia do Site</Label>
                                <Select value={type} onValueChange={(v) => setType(v as SiteType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {SITE_TYPES.map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Operadora / Tenant</Label>
                                <Select value={operator} onValueChange={setOperator}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {OPERATORS.map(op => (
                                            <SelectItem key={op} value={op}>{op}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="tower-height" className="text-xs font-semibold">Altura da Torre (m)</Label>
                                <Input 
                                    id="tower-height" 
                                    type="number" 
                                    value={towerHeightMeters} 
                                    onChange={(e) => setTowerHeightMeters(e.target.value)} 
                                    placeholder="Ex: 45"
                                    className="text-xs font-mono"
                                />
                            </div>
                        </div>

                        {/* Localização & Coordenadas */}
                        <div className="p-3 bg-muted/40 rounded-lg border space-y-3">
                            <span className="text-xs font-bold text-foreground block flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-primary" /> Georreferenciação & Coordenadas
                            </span>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold">Província *</Label>
                                    <Select value={province} onValueChange={setProvince}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent className="max-h-56">
                                            {ANGOLAN_PROVINCES.map(p => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="municipality" className="text-[11px] font-semibold">Município</Label>
                                    <Input 
                                        id="municipality" 
                                        value={municipality} 
                                        onChange={(e) => setMunicipality(e.target.value)} 
                                        placeholder="Ex: Belas, Viana, Cazenga"
                                        className="text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="altitude" className="text-[11px] font-semibold">Altitude (msnm)</Label>
                                    <Input 
                                        id="altitude" 
                                        type="number" 
                                        value={altitudeMeters} 
                                        onChange={(e) => setAltitudeMeters(e.target.value)} 
                                        placeholder="Ex: 120"
                                        className="text-xs font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="lat" className="text-[11px] font-semibold">Latitude Decimal *</Label>
                                    <Input 
                                        id="lat" 
                                        type="number" 
                                        step="0.000001" 
                                        value={latitude} 
                                        onChange={(e) => setLatitude(e.target.value)} 
                                        placeholder="Ex: -8.838333"
                                        className="text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="lon" className="text-[11px] font-semibold">Longitude Decimal *</Label>
                                    <Input 
                                        id="lon" 
                                        type="number" 
                                        step="0.000001" 
                                        value={longitude} 
                                        onChange={(e) => setLongitude(e.target.value)} 
                                        placeholder="Ex: 13.234444"
                                        className="text-xs font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="address" className="text-[11px] font-semibold">Endereço / Ponto de Referência</Label>
                                <Input 
                                    id="address" 
                                    value={address} 
                                    onChange={(e) => setAddress(e.target.value)} 
                                    placeholder="Ex: Rua Direita de Talatona, junto à rotunda"
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        {/* Energia & Rollout */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Fonte de Energia Principal</Label>
                                <Select value={powerType} onValueChange={(v) => setPowerType(v as SitePowerType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {POWER_TYPES.map(pt => (
                                            <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Estado Inicial</Label>
                                <Select value={status} onValueChange={(v) => setStatus(v as SiteStatus)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {SITE_STATUSES.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Data Prevista On-Air</Label>
                                <DatePicker date={targetOnAirDate} setDate={setTargetOnAirDate} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Atividade da EAP (WBS)</Label>
                            <Select value={selectedWbsItemId} onValueChange={setSelectedWbsItemId}>
                                <SelectTrigger><SelectValue placeholder="Vincular à EAP..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem vínculo à EAP</SelectItem>
                                    {wbsItems.map(item => (
                                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="notes" className="text-xs font-semibold">Notas de Implantação / Observações</Label>
                            <Textarea 
                                id="notes" 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)} 
                                placeholder="Condições do solo para fundações, autorização camarária, acesso para camião betoneira..."
                                rows={2}
                                className="text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t">
                        <Button variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
                        <Button onClick={handleCreateSite} disabled={isSubmitting} className="shadow-sm">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Plus className="mr-2 h-4 w-4"/>}
                            Cadastrar Site
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: Alteração Rápida de Estado */}
            <Dialog open={Boolean(statusChangeSite)} onOpenChange={(open) => { if (!open) setStatusChangeSite(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <SlidersHorizontal className="h-5 w-5 text-primary" /> Atualizar Fase do Site {statusChangeSite?.siteId}
                        </DialogTitle>
                        <DialogDescription>
                            Modifique o estado de avanço do rollout do site {statusChangeSite?.name}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Novo Estado do Site</Label>
                            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as SiteStatus)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {SITE_STATUSES.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {newStatus === 'Ativo' && (
                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-800 dark:text-emerald-300">
                                <strong>Site On-Air:</strong> Ao definir como &quot;Ativo&quot;, o progresso do rollout será automaticamente completado (100%) e a data de ativação registada.
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setStatusChangeSite(null)}>Cancelar</Button>
                        <Button onClick={handleQuickStatusUpdate} disabled={isUpdatingStatus}>
                            {isUpdatingStatus ? <Loader2 className="animate-spin mr-1.5 h-4 w-4" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                            Confirmar Transição
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
