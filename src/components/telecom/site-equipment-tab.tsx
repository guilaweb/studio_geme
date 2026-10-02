'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Radio, 
    Plus, 
    Search, 
    Filter, 
    TowerControl, 
    Activity, 
    Sliders, 
    CheckCircle2, 
    Trash2, 
    Loader2,
    Cpu,
    Compass
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { TelecomSite, SiteEquipment, EquipmentCategory } from '@/types/telecom';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface SiteEquipmentTabProps {
    projectId: string;
    sites: TelecomSite[];
    canEdit: boolean;
    onSiteUpdated?: () => void;
}

const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
    'Antena RF',
    'RRU',
    'BBU',
    'Micro-ondas (MW)',
    'Roteador / Switch',
    'Gerador',
    'Retificador',
    'Bateria',
    'Climatização',
    'Outro'
];

export default function SiteEquipmentTab({
    projectId,
    sites,
    canEdit,
    onSiteUpdated
}: SiteEquipmentTabProps) {
    const { idToken } = useAuth();
    const { toast } = useToast();

    const [selectedSiteId, setSelectedSiteId] = useState<string>(sites.length > 0 ? sites[0].id : '');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todas');

    // Dialog state
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [category, setCategory] = useState<EquipmentCategory>('Antena RF');
    const [model, setModel] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [frequencyBand, setFrequencyBand] = useState('1800 MHz (4G LTE)');
    const [heightMeters, setHeightMeters] = useState('42');
    const [azimuth, setAzimuth] = useState('0');
    const [tilt, setTilt] = useState('2');
    const [status, setStatus] = useState<'Operacional' | 'Em Teste' | 'Defeituoso' | 'Desmontado'>('Operacional');

    const activeSite = useMemo(() => {
        return sites.find(s => s.id === selectedSiteId) || (sites.length > 0 ? sites[0] : null);
    }, [sites, selectedSiteId]);

    const siteEquipments = useMemo(() => {
        if (!activeSite || !activeSite.equipments) return [];
        return activeSite.equipments.filter(eq => {
            const matchesSearch = searchTerm === '' ||
                eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (eq.model && eq.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (eq.serialNumber && eq.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (eq.frequencyBand && eq.frequencyBand.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = categoryFilter === 'Todas' || eq.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [activeSite, searchTerm, categoryFilter]);

    const resetForm = () => {
        setName('');
        setCategory('Antena RF');
        setModel('');
        setSerialNumber('');
        setFrequencyBand('1800 MHz (4G LTE)');
        setHeightMeters('42');
        setAzimuth('0');
        setTilt('2');
        setStatus('Operacional');
        setIsAddOpen(false);
    };

    const handleAddEquipment = async () => {
        if (!canEdit || !idToken || !activeSite) return;
        if (!name.trim()) {
            toast({ title: 'Nome do equipamento é obrigatório', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const newEq: SiteEquipment = {
                id: uuidv4(),
                name: name.trim(),
                category,
                model: model.trim() || undefined,
                serialNumber: serialNumber.trim() || undefined,
                frequencyBand: frequencyBand.trim() || undefined,
                heightMeters: heightMeters ? parseFloat(heightMeters) : undefined,
                azimuth: azimuth ? parseFloat(azimuth) : undefined,
                tilt: tilt ? parseFloat(tilt) : undefined,
                status,
                installedAt: new Date(),
            };

            const updatedList = [...(activeSite.equipments || []), newEq];

            const response = await fetch(`/api/projects/${projectId}/telecom-sites/${activeSite.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    equipments: updatedList,
                }),
            });

            if (!response.ok) throw new Error('Falha ao associar equipamento.');

            toast({ title: 'Equipamento adicionado ao site com sucesso!' });
            resetForm();
            if (onSiteUpdated) onSiteUpdated();
        } catch (error: any) {
            console.error("Error adding equipment to site:", error);
            toast({ title: 'Erro ao associar equipamento', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveEquipment = async (equipmentId: string) => {
        if (!canEdit || !idToken || !activeSite) return;

        try {
            const updatedList = (activeSite.equipments || []).filter(e => e.id !== equipmentId);

            const response = await fetch(`/api/projects/${projectId}/telecom-sites/${activeSite.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    equipments: updatedList,
                }),
            });

            if (!response.ok) throw new Error('Falha ao remover equipamento.');

            toast({ title: 'Equipamento removido do site.' });
            if (onSiteUpdated) onSiteUpdated();
        } catch (error: any) {
            toast({ title: 'Erro ao remover equipamento', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-bold">
                            <Radio className="h-5 w-5 text-primary"/> Associação de Equipamentos ao Site
                        </CardTitle>
                        <CardDescription>
                            Inventário técnico detalhado de antenas RF, RRUs, links de micro-ondas e climatização em cada torre.
                        </CardDescription>
                    </div>

                    {canEdit && activeSite && (
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button className="shadow-sm">
                                    <Plus className="mr-2 h-4 w-4"/>Associar Equipamento
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xl">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Radio className="h-5 w-5 text-primary" /> Novo Ativo Técnico: {activeSite.siteId}
                                    </DialogTitle>
                                    <DialogDescription>
                                        Cadastre o elemento de rede e configure azimute, tilt e altura no mastro.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="py-3 space-y-4 max-h-[72vh] overflow-y-auto pr-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="eq-name" className="text-xs font-semibold">Designação do Equipamento *</Label>
                                            <Input 
                                                id="eq-name" 
                                                value={name} 
                                                onChange={(e) => setName(e.target.value)} 
                                                placeholder="Ex: Antena Painel Setorial Alfa (Setor 1)"
                                                className="text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold">Categoria Técnica *</Label>
                                            <Select value={category} onValueChange={(v) => setCategory(v as EquipmentCategory)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {EQUIPMENT_CATEGORIES.map(c => (
                                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="eq-model" className="text-xs font-semibold">Modelo / Fabricante</Label>
                                            <Input 
                                                id="eq-model" 
                                                value={model} 
                                                onChange={(e) => setModel(e.target.value)} 
                                                placeholder="Ex: Huawei AAU5613 / Ericsson AIR 32"
                                                className="text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="eq-serial" className="text-xs font-semibold">Número de Série</Label>
                                            <Input 
                                                id="eq-serial" 
                                                value={serialNumber} 
                                                onChange={(e) => setSerialNumber(e.target.value)} 
                                                placeholder="Ex: SN-99824-HW"
                                                className="text-xs font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="freq-band" className="text-xs font-semibold">Banda de Frequência / Tecnologia</Label>
                                            <Input 
                                                id="freq-band" 
                                                value={frequencyBand} 
                                                onChange={(e) => setFrequencyBand(e.target.value)} 
                                                placeholder="Ex: 1800 MHz (4G), 3.5 GHz (5G), 15 GHz (MW)"
                                                className="text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="height-m" className="text-xs font-semibold">Altura no Mastro (m)</Label>
                                            <Input 
                                                id="height-m" 
                                                type="number" 
                                                value={heightMeters} 
                                                onChange={(e) => setHeightMeters(e.target.value)} 
                                                placeholder="Ex: 42"
                                                className="text-xs font-mono"
                                            />
                                        </div>
                                    </div>

                                    {/* Parameters RF: Azimute e Tilt */}
                                    <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg border">
                                        <div className="space-y-1">
                                            <Label htmlFor="azimuth" className="text-[11px] font-semibold">Azimute (° 0-360)</Label>
                                            <Input 
                                                id="azimuth" 
                                                type="number" 
                                                value={azimuth} 
                                                onChange={(e) => setAzimuth(e.target.value)} 
                                                placeholder="Ex: 60"
                                                className="text-xs font-mono"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="tilt" className="text-[11px] font-semibold">Tilt (°)</Label>
                                            <Input 
                                                id="tilt" 
                                                type="number" 
                                                step="0.5" 
                                                value={tilt} 
                                                onChange={(e) => setTilt(e.target.value)} 
                                                placeholder="Ex: 2"
                                                className="text-xs font-mono"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[11px] font-semibold">Estado Operacional</Label>
                                            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                                                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Operacional">Operacional</SelectItem>
                                                    <SelectItem value="Em Teste">Em Teste</SelectItem>
                                                    <SelectItem value="Defeituoso">Defeituoso</SelectItem>
                                                    <SelectItem value="Desmontado">Desmontado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="pt-2 border-t">
                                    <Button variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
                                    <Button onClick={handleAddEquipment} disabled={isSubmitting} className="shadow-sm">
                                        {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Plus className="mr-2 h-4 w-4"/>}
                                        Adicionar ao Site
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Site Selector Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Site Selecionado:</span>
                            <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                                <SelectTrigger className="w-[240px] h-9 bg-background font-medium text-xs">
                                    <SelectValue placeholder="Selecione um site..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {sites.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            <span className="font-mono font-bold mr-1.5">{s.siteId}</span> {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Filtrar equipamentos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 h-9 text-xs bg-background"
                                />
                            </div>

                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-[140px] h-9 text-xs bg-background">
                                    <SelectValue placeholder="Categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Todas">Todas</SelectItem>
                                    {EQUIPMENT_CATEGORIES.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Equipments Table */}
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="text-xs font-semibold">Equipamento</TableHead>
                                    <TableHead className="text-xs font-semibold">Categoria</TableHead>
                                    <TableHead className="text-xs font-semibold">Modelo / Série</TableHead>
                                    <TableHead className="text-xs font-semibold">Banda / Tecnologia</TableHead>
                                    <TableHead className="text-xs font-semibold text-right">Altura (m)</TableHead>
                                    <TableHead className="text-xs font-semibold text-right">Azimute / Tilt</TableHead>
                                    <TableHead className="text-xs font-semibold">Estado</TableHead>
                                    {canEdit && <TableHead className="text-xs font-semibold text-right">Ação</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {siteEquipments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={canEdit ? 8 : 7} className="h-28 text-center text-xs text-muted-foreground">
                                            {activeSite ? 'Nenhum equipamento associado a este site.' : 'Nenhum site selecionado.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    siteEquipments.map(eq => (
                                        <TableRow key={eq.id} className="hover:bg-muted/10">
                                            <TableCell className="font-semibold text-xs text-foreground">
                                                {eq.name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px]">
                                                    {eq.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-muted-foreground">
                                                {eq.model || 'N/A'} {eq.serialNumber && `(SN: ${eq.serialNumber})`}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {eq.frequencyBand || '---'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                {eq.heightMeters ? `${eq.heightMeters}m` : '---'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                {eq.azimuth !== undefined ? `${eq.azimuth}°` : '---'} / {eq.tilt !== undefined ? `${eq.tilt}°` : '---'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={eq.status === 'Operacional' ? 'default' : 'secondary'}
                                                    className={cn("text-[10px]", eq.status === 'Operacional' && "bg-emerald-600 text-white")}
                                                >
                                                    {eq.status}
                                                </Badge>
                                            </TableCell>
                                            {canEdit && (
                                                <TableCell className="text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleRemoveEquipment(eq.id)}
                                                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
