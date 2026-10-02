'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Zap, 
    Plus, 
    Clock, 
    Search, 
    Filter, 
    Layers, 
    Fuel, 
    AlertCircle, 
    CheckCircle2, 
    Loader2, 
    Calendar,
    Activity,
    FileText
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { EnergyProductionLog, EnergyAssetType, DowntimeReason } from '@/types/energy';
import type { Equipment } from '@/types/equipment';
import type { WbsItem } from '@/types/wbs';
import { cn } from '@/lib/utils';

interface EnergyProductionTabProps {
    projectId: string;
    logs: EnergyProductionLog[];
    equipment: Equipment[];
    wbsItems: WbsItem[];
    canEdit: boolean;
    loading: boolean;
    onLogCreated?: () => void;
}

const formatNumber = (value: number | undefined, decimals = 0) => {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return new Intl.NumberFormat('pt-AO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
};

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number' || isNaN(value)) return 'Kz 0';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
        maximumFractionDigits: 0,
    }).format(value);
};

const ASSET_TYPES: EnergyAssetType[] = [
    'Solar Fotovoltaico',
    'Gerador Diesel',
    'Híbrido Solar-Diesel',
    'Hídrico / PCH',
    'Eólico',
    'Bateria / BESS',
    'Rede / Subestação'
];

const DOWNTIME_REASONS: DowntimeReason[] = [
    'Manutenção Preventiva',
    'Avaria Elétrica / Mecânica',
    'Falta de Combustível',
    'Falha da Rede Pública',
    'Condições Climáticas',
    'Operacional / Standby',
    'Outro'
];

export default function EnergyProductionTab({
    projectId,
    logs,
    equipment,
    wbsItems,
    canEdit,
    loading,
}: EnergyProductionTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [assetFilter, setAssetFilter] = useState('Todos');
    const [typeFilter, setTypeFilter] = useState('Todos');

    // Form state
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [assetId, setAssetId] = useState('');
    const [assetType, setAssetType] = useState<EnergyAssetType>('Solar Fotovoltaico');
    const [initialMeterReading, setInitialMeterReading] = useState('');
    const [finalMeterReading, setFinalMeterReading] = useState('');
    const [productionKWh, setProductionKWh] = useState('');
    const [operationalHours, setOperationalHours] = useState('');
    const [downtimeHours, setDowntimeHours] = useState('');
    const [downtimeReason, setDowntimeReason] = useState<DowntimeReason>('Manutenção Preventiva');
    const [fuelConsumedLiters, setFuelConsumedLiters] = useState('');
    const [selectedWbsItemId, setSelectedWbsItemId] = useState<string>('none');
    const [notes, setNotes] = useState('');

    // Meter automatic calculation
    const handleMeterCalculation = (initVal: string, finalVal: string) => {
        const init = parseFloat(initVal);
        const fin = parseFloat(finalVal);
        if (!isNaN(init) && !isNaN(fin) && fin >= init) {
            setProductionKWh((fin - init).toFixed(1));
        }
    };

    const resetForm = () => {
        setDate(new Date());
        setAssetId('');
        setAssetType('Solar Fotovoltaico');
        setInitialMeterReading('');
        setFinalMeterReading('');
        setProductionKWh('');
        setOperationalHours('');
        setDowntimeHours('');
        setDowntimeReason('Manutenção Preventiva');
        setFuelConsumedLiters('');
        setSelectedWbsItemId('none');
        setNotes('');
        setIsDialogOpen(false);
    };

    const handleAssetSelect = (selectedId: string) => {
        setAssetId(selectedId);
        const selected = equipment.find(e => e.id === selectedId || (e as any).equipmentId === selectedId);
        if (selected) {
            const nameLower = selected.name.toLowerCase();
            if (nameLower.includes('solar') || nameLower.includes('fotovoltaic')) {
                setAssetType('Solar Fotovoltaico');
            } else if (nameLower.includes('gerador') || nameLower.includes('diesel') || nameLower.includes('genset')) {
                setAssetType('Gerador Diesel');
            } else if (nameLower.includes('híbrido') || nameLower.includes('hybrid')) {
                setAssetType('Híbrido Solar-Diesel');
            } else if (nameLower.includes('bateria') || nameLower.includes('bess') || nameLower.includes('ups')) {
                setAssetType('Bateria / BESS');
            } else if (nameLower.includes('hídric') || nameLower.includes('pch') || nameLower.includes('turbina')) {
                setAssetType('Hídrico / PCH');
            }
        }
    };

    const handleSubmit = async () => {
        if (!canEdit || !user || !idToken) return;
        if (!date || !assetId || !productionKWh || !operationalHours) {
            toast({ 
                title: 'Campos obrigatórios em falta', 
                description: 'Preencha a data, o ativo, a produção (kWh) e as horas de operação.', 
                variant: 'destructive' 
            });
            return;
        }

        const prod = parseFloat(productionKWh);
        const hours = parseFloat(operationalHours);
        if (isNaN(prod) || prod <= 0 || isNaN(hours) || hours <= 0) {
            toast({ title: 'Valores numéricos inválidos', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const asset = equipment.find(e => e.id === assetId || (e as any).equipmentId === assetId);
            const assetName = asset ? asset.name : 'Ativo Energético';
            const wbsItem = wbsItems.find(w => w.id === selectedWbsItemId);

            const response = await fetch(`/api/projects/${projectId}/energy-logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    date: date.toISOString(),
                    assetId,
                    assetName,
                    assetType,
                    productionKWh: prod,
                    initialMeterReading: initialMeterReading ? parseFloat(initialMeterReading) : undefined,
                    finalMeterReading: finalMeterReading ? parseFloat(finalMeterReading) : undefined,
                    operationalHours: hours,
                    downtimeHours: downtimeHours ? parseFloat(downtimeHours) : undefined,
                    downtimeReason: downtimeHours && parseFloat(downtimeHours) > 0 ? downtimeReason : undefined,
                    fuelConsumedLiters: fuelConsumedLiters ? parseFloat(fuelConsumedLiters) : undefined,
                    wbsItemId: selectedWbsItemId !== 'none' ? selectedWbsItemId : null,
                    wbsItemName: wbsItem?.name || null,
                    notes: notes.trim() || undefined,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Falha ao criar o registo de produção.');
            }

            toast({ title: 'Registo de energia adicionado com sucesso!' });
            resetForm();
        } catch (error: any) {
            console.error("Error submitting energy log:", error);
            toast({ title: 'Erro ao registar produção', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = searchTerm === '' ||
                log.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (log.assetType && log.assetType.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (log.wbsItemName && log.wbsItemName.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesAsset = assetFilter === 'Todos' || log.assetId === assetFilter;
            const matchesType = typeFilter === 'Todos' || log.assetType === typeFilter;

            return matchesSearch && matchesAsset && matchesType;
        });
    }, [logs, searchTerm, assetFilter, typeFilter]);

    return (
        <div className="space-y-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <Zap className="h-5 w-5 text-amber-500"/> Registo de Produção de Energia & Operações
                            </CardTitle>
                            <CardDescription>
                                Monitorização horária da geração (kWh), contadores, paragens e imputação automática de custos operacionais.
                            </CardDescription>
                        </div>
                        {canEdit && (
                            <DialogTrigger asChild>
                                <Button className="shadow-sm">
                                    <Plus className="mr-2 h-4 w-4"/>Novo Apontamento
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
                                    placeholder="Pesquisar por ativo, tecnologia, notas ou atividade EAP..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9 bg-background"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Select value={assetFilter} onValueChange={setAssetFilter}>
                                    <SelectTrigger className="w-[160px] h-9 bg-background">
                                        <SelectValue placeholder="Ativo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todos Ativos</SelectItem>
                                        {equipment.map(eq => (
                                            <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-[170px] h-9 bg-background">
                                        <SelectValue placeholder="Tecnologia" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todas Tecnologias</SelectItem>
                                        {ASSET_TYPES.map(type => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center p-12 text-muted-foreground gap-2">
                                <Loader2 className="animate-spin h-5 w-5 text-primary" /> Carregando registos de energia...
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="text-xs font-semibold">Data</TableHead>
                                            <TableHead className="text-xs font-semibold">Ativo / Tecnologia</TableHead>
                                            <TableHead className="text-xs font-semibold text-right">Geração (kWh)</TableHead>
                                            <TableHead className="text-xs font-semibold text-right">Horas Operadas</TableHead>
                                            <TableHead className="text-xs font-semibold text-right">Eficiência (kWh/h)</TableHead>
                                            <TableHead className="text-xs font-semibold text-right">Paragem</TableHead>
                                            <TableHead className="text-xs font-semibold text-right">Custo Operacional</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredLogs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground text-xs">
                                                    Nenhum registo de produção encontrado para os filtros selecionados.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredLogs.map(log => {
                                                const eff = log.efficiencyKWhPerHour || (log.operationalHours > 0 ? log.productionKWh / log.operationalHours : 0);
                                                return (
                                                    <TableRow key={log.id} className="hover:bg-muted/10">
                                                        <TableCell className="font-mono text-xs">
                                                            {format(log.date, 'dd/MM/yyyy')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-semibold">{log.assetName}</span>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <Badge variant="outline" className="text-[10px] py-0">
                                                                        {log.assetType || 'Energia'}
                                                                    </Badge>
                                                                    {log.wbsItemName && (
                                                                        <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                                                                            {log.wbsItemName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-bold text-xs">
                                                            {formatNumber(log.productionKWh)} <span className="text-[10px] text-muted-foreground font-normal">kWh</span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs">
                                                            {formatNumber(log.operationalHours, 1)}h
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-semibold text-xs text-primary">
                                                            {formatNumber(eff, 1)} <span className="text-[10px] text-muted-foreground font-normal">kWh/h</span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {log.downtimeHours && log.downtimeHours > 0 ? (
                                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[10px]">
                                                                    {log.downtimeHours}h ({log.downtimeReason || 'Paragem'})
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-[11px] text-emerald-600 font-medium">0h</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs">
                                                            {log.costAOA ? formatCurrency(log.costAOA) : '---'}
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

                {/* Dialog: Novo Apontamento de Energia */}
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-amber-500" /> Registar Produção & Operação de Ativo
                        </DialogTitle>
                        <DialogDescription>
                            Introduza as leituras de contadores, horas de operação e paragens para cálculo automático de eficiência e custos.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 space-y-4 max-h-[72vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Data da Operação *</Label>
                                <DatePicker date={date} setDate={setDate} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Ativo de Geração *</Label>
                                <Select value={assetId} onValueChange={handleAssetSelect}>
                                    <SelectTrigger><SelectValue placeholder="Selecione um ativo..." /></SelectTrigger>
                                    <SelectContent>
                                        {equipment.map(eq => (
                                            <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Tecnologia Energética</Label>
                                <Select value={assetType} onValueChange={(v) => setAssetType(v as EnergyAssetType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {ASSET_TYPES.map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                        </div>

                        {/* Leituras do Medidor / Contador (Opcional) */}
                        <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                            <span className="text-xs font-bold text-foreground block">
                                Leituras do Contador de Energia (kWh) - Opcional
                            </span>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="init-meter" className="text-[11px]">Leitura Inicial</Label>
                                    <Input 
                                        id="init-meter" 
                                        type="number" 
                                        value={initialMeterReading} 
                                        onChange={(e) => {
                                            setInitialMeterReading(e.target.value);
                                            handleMeterCalculation(e.target.value, finalMeterReading);
                                        }}
                                        placeholder="Ex: 10450"
                                        className="text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="final-meter" className="text-[11px]">Leitura Final</Label>
                                    <Input 
                                        id="final-meter" 
                                        type="number" 
                                        value={finalMeterReading} 
                                        onChange={(e) => {
                                            setFinalMeterReading(e.target.value);
                                            handleMeterCalculation(initialMeterReading, e.target.value);
                                        }}
                                        placeholder="Ex: 11200"
                                        className="text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="prod-kwh" className="text-[11px] font-bold">Produção Total (kWh) *</Label>
                                    <Input 
                                        id="prod-kwh" 
                                        type="number" 
                                        value={productionKWh} 
                                        onChange={(e) => setProductionKWh(e.target.value)} 
                                        placeholder="Ex: 750"
                                        className="text-xs font-mono font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Horas de Operação e Paragens */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="op-hours" className="text-xs font-semibold">Horas de Operação Efetivas *</Label>
                                <Input 
                                    id="op-hours" 
                                    type="number" 
                                    step="0.5" 
                                    value={operationalHours} 
                                    onChange={(e) => setOperationalHours(e.target.value)} 
                                    placeholder="Ex: 8.5"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="downtime-hours" className="text-xs font-semibold">Horas de Paragem (Downtime)</Label>
                                <Input 
                                    id="downtime-hours" 
                                    type="number" 
                                    step="0.5" 
                                    value={downtimeHours} 
                                    onChange={(e) => setDowntimeHours(e.target.value)} 
                                    placeholder="Ex: 1.5"
                                />
                            </div>
                        </div>

                        {/* Motivo da Paragem se downtime > 0 */}
                        {downtimeHours && parseFloat(downtimeHours) > 0 && (
                            <div className="space-y-1.5 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-md">
                                <Label className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                    Causa / Motivo da Paragem
                                </Label>
                                <Select value={downtimeReason} onValueChange={(v) => setDowntimeReason(v as DowntimeReason)}>
                                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {DOWNTIME_REASONS.map(r => (
                                            <SelectItem key={r} value={r}>{r}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Consumo de combustível se for ativo térmico/gerador */}
                        {(assetType === 'Gerador Diesel' || assetType === 'Híbrido Solar-Diesel') && (
                            <div className="space-y-1.5">
                                <Label htmlFor="fuel-liters" className="text-xs font-semibold flex items-center gap-1.5">
                                    <Fuel className="h-3.5 w-3.5 text-amber-500" /> Consumo de Combustível (Litros de Gasóleo)
                                </Label>
                                <Input 
                                    id="fuel-liters" 
                                    type="number" 
                                    step="0.5" 
                                    value={fuelConsumedLiters} 
                                    onChange={(e) => setFuelConsumedLiters(e.target.value)} 
                                    placeholder="Ex: 85 (Custo será lançado automaticamente: 300 Kz/L)"
                                    className="text-xs"
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="notes" className="text-xs font-semibold">Notas & Ocorrências</Label>
                            <Textarea 
                                id="notes" 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)} 
                                placeholder="Registo de condições meteorológicas, irradiação, variações de carga ou substituição de fusíveis..."
                                rows={2}
                                className="text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t">
                        <Button variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="shadow-sm">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Plus className="mr-2 h-4 w-4"/>}
                            Adicionar Registo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
