'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Wrench, 
    Plus, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    Search, 
    Filter, 
    DollarSign, 
    CheckSquare, 
    Loader2, 
    ChevronRight,
    UserCheck,
    Cpu
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { format, differenceInDays, isBefore } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { EnergyMaintenancePlan, MaintenancePlanStatus } from '@/types/energy';
import type { Equipment } from '@/types/equipment';
import type { WbsItem } from '@/types/wbs';
import { cn } from '@/lib/utils';

interface EnergyMaintenanceTabProps {
    projectId: string;
    maintenancePlans: EnergyMaintenancePlan[];
    equipment: Equipment[];
    wbsItems: WbsItem[];
    canEdit: boolean;
    loading: boolean;
    onPlanUpdated?: () => void;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number' || isNaN(value)) return 'Kz 0';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
        maximumFractionDigits: 0,
    }).format(value);
};

export default function EnergyMaintenanceTab({
    projectId,
    maintenancePlans,
    equipment,
    wbsItems,
    canEdit,
    loading,
    onPlanUpdated
}: EnergyMaintenanceTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [typeFilter, setTypeFilter] = useState('Todos');

    // Form state for new plan
    const [assetId, setAssetId] = useState('');
    const [planName, setPlanName] = useState('');
    const [type, setType] = useState<'Preventiva' | 'Corretiva' | 'Preditiva' | 'Inspeção'>('Preventiva');
    const [intervalHours, setIntervalHours] = useState('250');
    const [nextDueDate, setNextDueDate] = useState<Date | undefined>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    const [estimatedCostAOA, setEstimatedCostAOA] = useState('');
    const [assignedTechnician, setAssignedTechnician] = useState('');
    const [selectedWbsItemId, setSelectedWbsItemId] = useState<string>('none');
    const [notes, setNotes] = useState('');
    const [checklistItems, setChecklistItems] = useState<string[]>([
        'Verificação e limpeza de filtros de ar e óleo',
        'Medição de resistência de isolamento e aterramento',
        'Reaperto de conexões elétricas e bornes de potência',
        'Inspeção visual de vazamentos e integridade estrutural'
    ]);
    const [newChecklistText, setNewChecklistText] = useState('');

    // State for viewing/updating plan
    const [selectedPlan, setSelectedPlan] = useState<EnergyMaintenancePlan | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [completeCost, setCompleteCost] = useState('');
    const [isCompleting, setIsCompleting] = useState(false);

    const resetForm = () => {
        setAssetId('');
        setPlanName('');
        setType('Preventiva');
        setIntervalHours('250');
        setNextDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
        setEstimatedCostAOA('');
        setAssignedTechnician('');
        setSelectedWbsItemId('none');
        setNotes('');
        setIsCreateOpen(false);
    };

    const handleAddChecklistItem = () => {
        if (!newChecklistText.trim()) return;
        setChecklistItems(prev => [...prev, newChecklistText.trim()]);
        setNewChecklistText('');
    };

    const handleRemoveChecklistItem = (index: number) => {
        setChecklistItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreatePlan = async () => {
        if (!canEdit || !user || !idToken) return;
        if (!assetId || !planName.trim()) {
            toast({ title: 'Campos obrigatórios em falta', description: 'Selecione o ativo e dê um nome ao plano.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const asset = equipment.find(e => e.id === assetId || (e as any).equipmentId === assetId);
            const assetName = asset ? asset.name : 'Ativo';
            const wbsItem = wbsItems.find(w => w.id === selectedWbsItemId);

            const checklist = checklistItems.map(item => ({ item, completed: false }));

            const response = await fetch(`/api/projects/${projectId}/energy-maintenance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    assetId,
                    assetName,
                    planName: planName.trim(),
                    type,
                    intervalHours: intervalHours ? parseFloat(intervalHours) : undefined,
                    nextDueDate: nextDueDate ? nextDueDate.toISOString() : undefined,
                    status: 'Programada',
                    estimatedCostAOA: estimatedCostAOA ? parseFloat(estimatedCostAOA) : undefined,
                    checklist,
                    assignedTechnician: assignedTechnician.trim() || undefined,
                    notes: notes.trim() || undefined,
                    wbsItemId: selectedWbsItemId !== 'none' ? selectedWbsItemId : null,
                    wbsItemName: wbsItem?.name || null,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Falha ao criar o plano de manutenção.');
            }

            toast({ title: 'Plano de manutenção agendado com sucesso!' });
            resetForm();
            if (onPlanUpdated) onPlanUpdated();
        } catch (error: any) {
            console.error("Error creating maintenance plan:", error);
            toast({ title: 'Erro ao agendar manutenção', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCompleteMaintenance = async () => {
        if (!canEdit || !user || !idToken || !selectedPlan) return;

        setIsCompleting(true);
        try {
            const cost = completeCost ? parseFloat(completeCost) : selectedPlan.estimatedCostAOA || 0;

            const response = await fetch(`/api/projects/${projectId}/energy-maintenance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    assetId: selectedPlan.assetId,
                    assetName: selectedPlan.assetName,
                    planName: `${selectedPlan.planName} (Executada)`,
                    type: selectedPlan.type,
                    status: 'Concluída',
                    realCostAOA: cost,
                    checklist: selectedPlan.checklist || [],
                    assignedTechnician: selectedPlan.assignedTechnician || user.displayName || 'Técnico',
                    notes: `Manutenção concluída com sucesso. Custo real apurado: ${formatCurrency(cost)}.`,
                    wbsItemId: selectedPlan.wbsItemId || null,
                    wbsItemName: selectedPlan.wbsItemName || null,
                }),
            });

            if (!response.ok) throw new Error('Falha ao concluir a manutenção.');

            toast({ title: 'Manutenção concluída e despesa lançada no projeto!' });
            setIsDetailOpen(false);
            setSelectedPlan(null);
            setCompleteCost('');
            if (onPlanUpdated) onPlanUpdated();
        } catch (error: any) {
            toast({ title: 'Erro ao concluir intervenção', description: error.message, variant: 'destructive' });
        } finally {
            setIsCompleting(false);
        }
    };

    // Filtered plans
    const filteredPlans = useMemo(() => {
        return maintenancePlans.filter(p => {
            const matchesSearch = searchTerm === '' ||
                p.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.assignedTechnician && p.assignedTechnician.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'Todos' || p.status === statusFilter;
            const matchesType = typeFilter === 'Todos' || p.type === typeFilter;

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [maintenancePlans, searchTerm, statusFilter, typeFilter]);

    const getStatusBadge = (status: MaintenancePlanStatus, nextDue?: Date) => {
        const today = new Date();
        const isOverdue = nextDue && isBefore(nextDue, today) && status !== 'Concluída';

        if (status === 'Concluída') {
            return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px]">Concluída</Badge>;
        }
        if (isOverdue || status === 'Atrasada') {
            return <Badge variant="destructive" className="text-[10px]">Atrasada</Badge>;
        }
        if (status === 'Pendente') {
            return <Badge variant="secondary" className="text-[10px]">Pendente</Badge>;
        }
        return <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Programada</Badge>;
    };

    return (
        <div className="space-y-6">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <Wrench className="h-5 w-5 text-primary"/> Planeamento de Manutenção de Ativos Energéticos
                            </CardTitle>
                            <CardDescription>
                                Gestão de intervenções preventivas, corretivas e preditivas para garantia de disponibilidade dos geradores e centrais.
                            </CardDescription>
                        </div>
                        {canEdit && (
                            <DialogTrigger asChild>
                                <Button className="shadow-sm">
                                    <Plus className="mr-2 h-4 w-4"/>Agendar Manutenção
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
                                    placeholder="Pesquisar por plano, ativo ou técnico..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9 bg-background"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px] h-9 bg-background">
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todos Estados</SelectItem>
                                        <SelectItem value="Programada">Programada</SelectItem>
                                        <SelectItem value="Pendente">Pendente</SelectItem>
                                        <SelectItem value="Concluída">Concluída</SelectItem>
                                        <SelectItem value="Atrasada">Atrasada</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-[140px] h-9 bg-background">
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todos Tipos</SelectItem>
                                        <SelectItem value="Preventiva">Preventiva</SelectItem>
                                        <SelectItem value="Corretiva">Corretiva</SelectItem>
                                        <SelectItem value="Preditiva">Preditiva</SelectItem>
                                        <SelectItem value="Inspeção">Inspeção</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center p-12 text-muted-foreground gap-2">
                                <Loader2 className="animate-spin h-5 w-5 text-primary" /> Carregando planos de manutenção...
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="text-xs font-semibold">Ativo / Intervenção</TableHead>
                                            <TableHead className="text-xs font-semibold">Tipo</TableHead>
                                            <TableHead className="text-xs font-semibold">Periodicidade</TableHead>
                                            <TableHead className="text-xs font-semibold">Data Prevista</TableHead>
                                            <TableHead className="text-xs font-semibold">Técnico</TableHead>
                                            <TableHead className="text-xs font-semibold text-right">Custo Estimado</TableHead>
                                            <TableHead className="text-xs font-semibold">Estado</TableHead>
                                            <TableHead className="text-xs font-semibold text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPlans.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-28 text-center text-muted-foreground text-xs">
                                                    Nenhum plano de manutenção agendado.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredPlans.map(plan => {
                                                const dueDate = plan.nextDueDate ? new Date(plan.nextDueDate) : null;
                                                return (
                                                    <TableRow key={plan.id} className="hover:bg-muted/10">
                                                        <TableCell className="font-medium text-xs">
                                                            <div>
                                                                <span className="font-semibold block">{plan.planName}</span>
                                                                <span className="text-[10px] text-muted-foreground">{plan.assetName}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-[10px]">
                                                                {plan.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground font-mono">
                                                            {plan.intervalHours ? `${plan.intervalHours}h de operação` : plan.intervalDays ? `${plan.intervalDays} dias` : 'Pontual'}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-mono">
                                                            {dueDate ? format(dueDate, 'dd/MM/yyyy') : '---'}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {plan.assignedTechnician || 'Não atribuído'}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs">
                                                            {plan.estimatedCostAOA ? formatCurrency(plan.estimatedCostAOA) : '---'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {getStatusBadge(plan.status, dueDate || undefined)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="h-7 text-xs"
                                                                onClick={() => {
                                                                    setSelectedPlan(plan);
                                                                    setCompleteCost(plan.estimatedCostAOA ? String(plan.estimatedCostAOA) : '');
                                                                    setIsDetailOpen(true);
                                                                }}
                                                            >
                                                                Detalhes <ChevronRight className="h-3 w-3 ml-1" />
                                                            </Button>
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

                {/* Dialog: Criar Novo Plano */}
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wrench className="h-5 w-5 text-primary" /> Agendar Plano de Manutenção
                        </DialogTitle>
                        <DialogDescription>
                            Configure a intervenção técnica, periodicidade por horímetro e checklist de inspeção de campo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 space-y-4 max-h-[72vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Ativo Energético *</Label>
                                <Select value={assetId} onValueChange={setAssetId}>
                                    <SelectTrigger><SelectValue placeholder="Selecione o ativo..." /></SelectTrigger>
                                    <SelectContent>
                                        {equipment.map(eq => (
                                            <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="plan-name" className="text-xs font-semibold">Designação do Plano *</Label>
                                <Input 
                                    id="plan-name" 
                                    value={planName} 
                                    onChange={(e) => setPlanName(e.target.value)} 
                                    placeholder="Ex: Revisão Preventiva de 250h (Óleo e Filtros)"
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Tipo de Manutenção</Label>
                                <Select value={type} onValueChange={(v) => setType(v as any)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Preventiva">Preventiva</SelectItem>
                                        <SelectItem value="Corretiva">Corretiva</SelectItem>
                                        <SelectItem value="Preditiva">Preditiva</SelectItem>
                                        <SelectItem value="Inspeção">Inspeção</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="interval" className="text-xs font-semibold">Intervalo (Horas)</Label>
                                <Input 
                                    id="interval" 
                                    type="number" 
                                    value={intervalHours} 
                                    onChange={(e) => setIntervalHours(e.target.value)} 
                                    placeholder="Ex: 250"
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Data Prevista</Label>
                                <DatePicker date={nextDueDate} setDate={setNextDueDate} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="estimated-cost" className="text-xs font-semibold">Custo Estimado (AOA)</Label>
                                <Input 
                                    id="estimated-cost" 
                                    type="number" 
                                    value={estimatedCostAOA} 
                                    onChange={(e) => setEstimatedCostAOA(e.target.value)} 
                                    placeholder="Ex: 180000"
                                    className="text-xs font-mono"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="tech" className="text-xs font-semibold">Técnico / Equipa Responsável</Label>
                                <Input 
                                    id="tech" 
                                    value={assignedTechnician} 
                                    onChange={(e) => setAssignedTechnician(e.target.value)} 
                                    placeholder="Ex: Eletromecânico João Manuel"
                                    className="text-xs"
                                />
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

                        {/* Checklist */}
                        <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                            <span className="text-xs font-bold text-foreground block">
                                Checklist de Verificação Técnica ({checklistItems.length} itens)
                            </span>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {checklistItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs bg-background p-1.5 rounded border">
                                        <span className="truncate">{item}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveChecklistItem(idx)}
                                            className="text-destructive text-[11px] hover:underline ml-2"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 pt-1">
                                <Input 
                                    placeholder="Novo item de verificação..."
                                    value={newChecklistText}
                                    onChange={(e) => setNewChecklistText(e.target.value)}
                                    className="text-xs h-8"
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddChecklistItem(); } }}
                                />
                                <Button type="button" size="sm" variant="outline" onClick={handleAddChecklistItem} className="h-8 text-xs shrink-0">
                                    Adicionar
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="plan-notes" className="text-xs font-semibold">Notas / Instruções Específicas</Label>
                            <Textarea 
                                id="plan-notes" 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)} 
                                placeholder="Indique especificações de óleos recomendados, torques de aperto ou normas de segurança..."
                                rows={2}
                                className="text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t">
                        <Button variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
                        <Button onClick={handleCreatePlan} disabled={isSubmitting} className="shadow-sm">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Plus className="mr-2 h-4 w-4"/>}
                            Criar Plano de Manutenção
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: Detalhes e Conclusão de Plano */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-primary" /> Detalhes da Intervenção Técnica
                        </DialogTitle>
                        <DialogDescription>
                            {selectedPlan?.planName} - {selectedPlan?.assetName}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPlan && (
                        <div className="space-y-4 py-2 text-xs">
                            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded border">
                                <div>
                                    <span className="text-muted-foreground block">Tipo:</span>
                                    <span className="font-semibold">{selectedPlan.type}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Estado Atual:</span>
                                    <span className="font-semibold">{selectedPlan.status}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Técnico:</span>
                                    <span className="font-semibold">{selectedPlan.assignedTechnician || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Custo Estimado:</span>
                                    <span className="font-semibold font-mono">{formatCurrency(selectedPlan.estimatedCostAOA || 0)}</span>
                                </div>
                            </div>

                            {selectedPlan.checklist && selectedPlan.checklist.length > 0 && (
                                <div className="space-y-1.5 border rounded p-2.5">
                                    <span className="font-semibold block mb-1">Checklist Técnico:</span>
                                    <div className="space-y-1">
                                        {selectedPlan.checklist.map((c, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                                <span>{c.item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedPlan.status !== 'Concluída' && canEdit && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-2">
                                    <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                                        Concluir Intervenção & Lançar Despesa
                                    </span>
                                    <div className="space-y-1">
                                        <Label htmlFor="real-cost" className="text-[11px] font-semibold">Custo Real Apurado (AOA)</Label>
                                        <Input 
                                            id="real-cost" 
                                            type="number"
                                            value={completeCost} 
                                            onChange={(e) => setCompleteCost(e.target.value)} 
                                            placeholder="Ex: 175000"
                                            className="text-xs bg-background font-mono"
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            O valor será registado automaticamente nas despesas operacionais do projeto.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="pt-2 border-t">
                        <Button variant="ghost" onClick={() => setIsDetailOpen(false)}>Fechar</Button>
                        {selectedPlan?.status !== 'Concluída' && canEdit && (
                            <Button 
                                onClick={handleCompleteMaintenance} 
                                disabled={isCompleting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            >
                                {isCompleting ? <Loader2 className="animate-spin mr-1.5 h-4 w-4" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                                Dar Baixa e Concluir
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
