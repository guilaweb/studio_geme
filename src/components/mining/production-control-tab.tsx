'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole, TeamMember } from '@/app/projects/[id]/page';
import { type ProductionLog, type MiningMaterialType } from '@/types/mining';
import { type ProjectEquipment } from '@/types/equipment';
import { type WbsItem } from '@/types/wbs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Truck, Users, Search, Filter, Layers, Mountain, Gauge, Sun, Moon, Calendar, FileText, Trash2, Printer, Scale, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ProductionControlTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function ProductionControlTab({ projectId, userRole }: ProductionControlTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Editor' || userRole === 'Gestor' || userRole === 'Mestre de Obra';

    const [logs, setLogs] = useState<ProductionLog[]>([]);
    const [projectWorkforce, setProjectWorkforce] = useState<TeamMember[]>([]);
    const [projectEquipment, setProjectEquipment] = useState<ProjectEquipment[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedBulletinLog, setSelectedBulletinLog] = useState<ProductionLog | null>(null);
    const [isBulletinOpen, setIsBulletinOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [shiftFilter, setShiftFilter] = useState<'Todos' | 'Dia' | 'Noite'>('Todos');
    const [typeFilter, setTypeFilter] = useState<'Todos' | 'Minério' | 'Estéril' | 'Sub-económico'>('Todos');

    // Form state
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [shift, setShift] = useState<'Dia' | 'Noite'>('Dia');
    const [materialType, setMaterialType] = useState<MiningMaterialType>('Minério');
    const [material, setMaterial] = useState('Minério de Ferro');
    const [tonnage, setTonnage] = useState('');
    const [grade, setGrade] = useState('');
    const [density, setDensity] = useState('2.7'); // t/m³
    const [pitBench, setPitBench] = useState('');
    const [operationHours, setOperationHours] = useState('');
    const [sourceLocation, setSourceLocation] = useState('');
    const [destination, setDestination] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
    const [selectedWbsItemId, setSelectedWbsItemId] = useState<string>('none');

    // Volume calculation
    const calculatedVolume = useMemo(() => {
        const t = parseFloat(tonnage);
        const d = parseFloat(density);
        if (!isNaN(t) && !isNaN(d) && d > 0) {
            return (t / d).toFixed(1);
        }
        return '';
    }, [tonnage, density]);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);

        const unsubLogs = onSnapshot(query(collection(db, 'projects', projectId, 'production-logs'), orderBy('date', 'desc')), (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as any)?.toDate ? (doc.data().date as any).toDate() : new Date(doc.data().date),
            } as ProductionLog));
            setLogs(fetchedLogs);
        });

        const unsubWorkforce = onSnapshot(query(collection(db, 'projects', projectId, 'team')), (snapshot) => {
            setProjectWorkforce(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as TeamMember)));
        });

        const unsubEquipment = onSnapshot(query(collection(db, 'projects', projectId, 'equipment')), (snapshot) => {
            setProjectEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectEquipment)));
        });
        
        const unsubWbs = onSnapshot(query(collection(db, 'projects', projectId, 'wbs')), (snapshot) => {
            setWbsItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WbsItem)));
        });
        
        Promise.all([
             new Promise(res => onSnapshot(query(collection(db, 'projects', projectId, 'production-logs')), res)),
             new Promise(res => onSnapshot(query(collection(db, 'projects', projectId, 'team')), res)),
             new Promise(res => onSnapshot(query(collection(db, 'projects', projectId, 'equipment')), res)),
             new Promise(res => onSnapshot(query(collection(db, 'projects', projectId, 'wbs')), res)),
        ]).finally(() => setLoading(false));

        return () => {
            unsubLogs();
            unsubWorkforce();
            unsubEquipment();
            unsubWbs();
        };
    }, [projectId]);

    // KPIs & Mass Balance Calculations
    const massBalance = useMemo(() => {
        let oreTotal = 0;
        let wasteTotal = 0;
        let subEconomicTotal = 0;
        let gradeWeightedSum = 0;
        let gradeWeightCount = 0;
        let dayShiftTonnage = 0;
        let nightShiftTonnage = 0;

        logs.forEach(log => {
            const isWaste = log.materialType === 'Estéril' || log.material.toLowerCase().includes('estéril');
            const isSub = log.materialType === 'Sub-económico';
            
            if (isWaste) {
                wasteTotal += log.tonnage;
            } else if (isSub) {
                subEconomicTotal += log.tonnage;
            } else {
                oreTotal += log.tonnage;
                if (log.grade !== undefined && log.grade !== null && log.grade > 0) {
                    gradeWeightedSum += log.grade * log.tonnage;
                    gradeWeightCount += log.tonnage;
                }
            }

            if (log.shift === 'Dia') dayShiftTonnage += log.tonnage;
            if (log.shift === 'Noite') nightShiftTonnage += log.tonnage;
        });

        const totalMoved = oreTotal + wasteTotal + subEconomicTotal;
        const remRatio = oreTotal > 0 ? wasteTotal / oreTotal : 0;
        const averageGrade = gradeWeightCount > 0 ? gradeWeightedSum / gradeWeightCount : 0;

        return {
            oreTotal,
            wasteTotal,
            subEconomicTotal,
            totalMoved,
            remRatio,
            averageGrade,
            dayShiftTonnage,
            nightShiftTonnage,
        };
    }, [logs]);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = searchTerm === '' || 
                log.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.sourceLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (log.pitBench && log.pitBench.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (log.wbsItemName && log.wbsItemName.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesShift = shiftFilter === 'Todos' || log.shift === shiftFilter;
            
            const logType: MiningMaterialType = log.materialType || (log.material.toLowerCase().includes('estéril') ? 'Estéril' : 'Minério');
            const matchesType = typeFilter === 'Todos' || logType === typeFilter;

            return matchesSearch && matchesShift && matchesType;
        });
    }, [logs, searchTerm, shiftFilter, typeFilter]);

    const resetForm = () => {
        setDate(new Date());
        setShift('Dia');
        setMaterialType('Minério');
        setMaterial('Minério de Ferro');
        setTonnage('');
        setGrade('');
        setDensity('2.7');
        setPitBench('');
        setOperationHours('');
        setSourceLocation('');
        setDestination('');
        setNotes('');
        setSelectedTeamIds([]);
        setSelectedEquipmentIds([]);
        setSelectedWbsItemId('none');
        setIsDialogOpen(false);
    };

    const handleMaterialTypeChange = (type: MiningMaterialType) => {
        setMaterialType(type);
        if (type === 'Estéril') {
            setMaterial('Estéril / Rocha Encaixante');
            setDensity('2.4');
            setGrade('');
            setDestination('Bota-Fora Sul');
        } else if (type === 'Minério') {
            setMaterial('Minério de Alto Teor (ROM)');
            setDensity('2.7');
            setDestination('Stockpile Primário');
        } else {
            setMaterial('Sub-económico / Marginais');
            setDensity('2.5');
            setDestination('Pilha de Baixo Teor');
        }
    };

    const handleSubmit = async () => {
        if (!canEdit || !user || !idToken) return;
        if (!date || !material.trim() || !tonnage || !sourceLocation.trim() || !destination.trim()) {
            toast({ title: 'Campos obrigatórios em falta', description: 'Por favor preencha data, material, tonelagem, origem e destino.', variant: 'destructive' });
            return;
        }

        const parsedTonnage = parseFloat(tonnage);
        if (isNaN(parsedTonnage) || parsedTonnage <= 0) {
            toast({ title: 'Tonelagem inválida', description: 'Insira um valor numérico positivo.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const team = projectWorkforce.filter(m => selectedTeamIds.includes(m.uid)).map(m => ({ id: m.uid, name: m.displayName }));
            const equipment = projectEquipment
                .filter(e => selectedEquipmentIds.includes(e.id))
                .map(e => ({ id: e.id, name: e.name, equipmentId: e.equipmentId }));
            
            const wbsItem = wbsItems.find(item => item.id === selectedWbsItemId);

            const parsedDensity = parseFloat(density);
            const parsedVolume = !isNaN(parsedDensity) && parsedDensity > 0 ? parsedTonnage / parsedDensity : undefined;

            const response = await fetch(`/api/projects/${projectId}/production-logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    date: date.toISOString(),
                    shift,
                    material,
                    materialType,
                    tonnage: parsedTonnage,
                    wasteTonnage: materialType === 'Estéril' ? parsedTonnage : 0,
                    oreTonnage: materialType === 'Minério' ? parsedTonnage : 0,
                    grade: grade ? parseFloat(grade) : null,
                    density: !isNaN(parsedDensity) ? parsedDensity : undefined,
                    volume: parsedVolume,
                    pitBench: pitBench.trim() || undefined,
                    operationHours: operationHours ? parseFloat(operationHours) : undefined,
                    sourceLocation,
                    destination,
                    notes: notes.trim() || undefined,
                    team,
                    equipment,
                    wbsItemId: selectedWbsItemId === 'none' ? null : selectedWbsItemId,
                    wbsItemName: wbsItem?.name || null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao criar o registo de produção.');
            }

            toast({ title: 'Registo de produção adicionado com sucesso!' });
            resetForm();
        } catch (error: any) {
            console.error("Error adding production log:", error);
            toast({ title: 'Erro ao adicionar registo', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteLog = async (logId: string) => {
        if (!canEdit || !idToken) return;
        if (!confirm('Tem a certeza de que deseja eliminar este registo de produção? Esta ação não pode ser desfeita.')) {
            return;
        }

        setDeletingId(logId);
        try {
            const response = await fetch(`/api/projects/${projectId}/production-logs/${logId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${idToken}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao eliminar registo.');
            }

            toast({ title: 'Registo de produção eliminado com sucesso!' });
        } catch (error: any) {
            console.error("Error deleting production log:", error);
            toast({ title: 'Erro ao eliminar registo', description: error.message, variant: 'destructive' });
        } finally {
            setDeletingId(null);
        }
    };

    const handleOpenBulletin = (log: ProductionLog) => {
        setSelectedBulletinLog(log);
        setIsBulletinOpen(true);
    };

    const handlePrintBulletin = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* Top KPIs: REM Ratio, Total Moved, Ore, Waste */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Minério Extraído</CardTitle>
                        <Mountain className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {massBalance.oreTotal.toLocaleString('pt-AO')} <span className="text-sm font-normal text-muted-foreground">t</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {massBalance.totalMoved > 0 ? `${((massBalance.oreTotal / massBalance.totalMoved) * 100).toFixed(1)}% do total movimentado` : 'Sem registos'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Estéril Movimentado</CardTitle>
                        <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {massBalance.wasteTotal.toLocaleString('pt-AO')} <span className="text-sm font-normal text-muted-foreground">t</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Sub-económico: {massBalance.subEconomicTotal.toLocaleString('pt-AO')} t
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Rácio REM (Estéril/Minério)</CardTitle>
                        <Gauge className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {massBalance.oreTotal > 0 ? `${massBalance.remRatio.toFixed(2)} : 1` : 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {massBalance.remRatio <= 3 ? 'Rácio dentro da meta de lavra' : 'Rácio elevado de decapagem'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Teor Médio Global</CardTitle>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">LEI</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {massBalance.averageGrade > 0 ? `${massBalance.averageGrade.toFixed(2)}%` : 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Dia: {massBalance.dayShiftTonnage.toLocaleString('pt-AO')} t | Noite: {massBalance.nightShiftTonnage.toLocaleString('pt-AO')} t
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <Truck className="h-5 w-5 text-primary"/> Controlo de Produção por Turno
                            </CardTitle>
                            <CardDescription>
                                Apontamento contínuo de avanço de lavra, balanço de massas (minério vs. estéril), teores e frotas.
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
                                    placeholder="Pesquisar por frente de lavra, bancada, destino ou material..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9 bg-background"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Turno:</span>
                                </div>
                                <Select value={shiftFilter} onValueChange={(v) => setShiftFilter(v as any)}>
                                    <SelectTrigger className="w-[110px] h-9 bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todos</SelectItem>
                                        <SelectItem value="Dia">☀️ Dia</SelectItem>
                                        <SelectItem value="Noite">🌙 Noite</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="flex items-center gap-1.5 ml-2">
                                    <span className="text-xs font-medium text-muted-foreground">Tipo:</span>
                                </div>
                                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                                    <SelectTrigger className="w-[140px] h-9 bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todos</SelectItem>
                                        <SelectItem value="Minério">Minério</SelectItem>
                                        <SelectItem value="Estéril">Estéril</SelectItem>
                                        <SelectItem value="Sub-económico">Sub-económico</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
                                <Loader2 className="animate-spin h-5 w-5 text-primary" /> Carregando registos de produção...
                            </div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="text-center py-12 px-4 rounded-lg border border-dashed text-muted-foreground">
                                <p className="font-medium">Nenhum registo de produção encontrado.</p>
                                <p className="text-xs mt-1">Altere os filtros ou adicione um novo apontamento de lavra.</p>
                            </div>
                        ) : (
                            <Accordion type="single" collapsible className="w-full space-y-2">
                                {filteredLogs.map(log => {
                                    const isWaste = log.materialType === 'Estéril' || log.material.toLowerCase().includes('estéril');
                                    const isSub = log.materialType === 'Sub-económico';
                                    const effectiveType = log.materialType || (isWaste ? 'Estéril' : isSub ? 'Sub-económico' : 'Minério');

                                    return (
                                        <AccordionItem 
                                            value={log.id} 
                                            key={log.id} 
                                            className="border rounded-md px-3 bg-card hover:bg-muted/10 transition-colors"
                                        >
                                            <AccordionTrigger className="py-3 hover:no-underline">
                                                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-center w-full pr-4 text-left">
                                                    <div className="flex items-center gap-2">
                                                        {log.shift === 'Dia' ? (
                                                            <Sun className="h-4 w-4 text-amber-500 shrink-0" />
                                                        ) : (
                                                            <Moon className="h-4 w-4 text-indigo-500 shrink-0" />
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-sm leading-none">{format(log.date, 'dd/MM/yyyy')}</p>
                                                            <span className="text-[11px] text-muted-foreground">{log.shift}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm truncate">{log.material}</span>
                                                        {log.pitBench && (
                                                            <span className="text-[11px] text-muted-foreground">{log.pitBench}</span>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <Badge 
                                                            variant="outline"
                                                            className={cn(
                                                                "text-[11px] font-medium",
                                                                effectiveType === 'Minério' && "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
                                                                effectiveType === 'Estéril' && "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
                                                                effectiveType === 'Sub-económico' && "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300"
                                                            )}
                                                        >
                                                            {effectiveType}
                                                        </Badge>
                                                    </div>

                                                    <div>
                                                        <span className="font-mono font-bold text-sm">
                                                            {log.tonnage.toLocaleString('pt-AO')} t
                                                        </span>
                                                        {log.grade !== undefined && log.grade !== null && (
                                                            <span className="text-xs text-muted-foreground block">
                                                                {log.grade.toFixed(2)}% teor
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="hidden md:block">
                                                        <span className="text-xs text-muted-foreground block truncate">De: {log.sourceLocation}</span>
                                                        <span className="text-xs font-medium truncate block">Para: {log.destination}</span>
                                                    </div>

                                                    <div className="hidden md:flex justify-end text-xs text-muted-foreground">
                                                        {log.operationHours ? `${log.operationHours}h operadas` : 'Sem horas'}
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-4 pt-2 border-t mt-2 space-y-4 bg-muted/20 rounded-b-md">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                    <div>
                                                        <span className="text-muted-foreground block">Origem detalhada:</span>
                                                        <span className="font-semibold">{log.sourceLocation}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block">Destino de deposição:</span>
                                                        <span className="font-semibold">{log.destination}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block">Volume Estimado:</span>
                                                        <span className="font-semibold">
                                                            {log.volume ? `${log.volume.toFixed(1)} m³` : log.density ? `${(log.tonnage / log.density).toFixed(1)} m³` : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block">Apontador:</span>
                                                        <span className="font-semibold">{log.author?.displayName || 'Sistema'}</span>
                                                    </div>
                                                </div>

                                                {log.wbsItemName && (
                                                    <div className="bg-background/80 p-2.5 rounded border text-xs">
                                                        <span className="text-muted-foreground">Atividade da EAP vinculada: </span>
                                                        <span className="font-semibold text-primary">{log.wbsItemName}</span>
                                                    </div>
                                                )}

                                                {log.notes && (
                                                    <div className="text-xs bg-muted/40 p-2.5 rounded border">
                                                        <span className="font-semibold block mb-1">Ocorrências & Observações de Turno:</span>
                                                        <p className="text-muted-foreground leading-relaxed">{log.notes}</p>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t text-xs">
                                                    <div>
                                                        <span className="font-semibold flex items-center gap-1.5 mb-1.5 text-muted-foreground">
                                                            <Users className="h-3.5 w-3.5 text-primary" /> Equipa Alocada ({log.team?.length || 0})
                                                        </span>
                                                        {log.team && log.team.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {log.team.map(t => (
                                                                    <Badge key={t.id} variant="secondary" className="text-[11px]">
                                                                        {t.name}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground italic">Nenhuma equipa registada.</span>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <span className="font-semibold flex items-center gap-1.5 mb-1.5 text-muted-foreground">
                                                            <Truck className="h-3.5 w-3.5 text-primary" /> Equipamentos Pesados ({log.equipment?.length || 0})
                                                        </span>
                                                        {log.equipment && log.equipment.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {log.equipment.map(e => (
                                                                    <Badge key={e.id} variant="outline" className="text-[11px] bg-background">
                                                                        {e.name}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground italic">Nenhum equipamento alocado.</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Ações do Registo: Boletim de Turno e Exclusão */}
                                                <div className="flex items-center justify-between pt-3 border-t text-xs">
                                                    <div className="text-muted-foreground flex items-center gap-1.5">
                                                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                                        <span>Boletim técnico emitido de acordo com as normas de mineração</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 gap-1.5 text-xs font-medium"
                                                            onClick={() => handleOpenBulletin(log)}
                                                        >
                                                            <Printer className="h-3.5 w-3.5 text-primary" />
                                                            Boletim de Turno
                                                        </Button>
                                                        {canEdit && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                disabled={deletingId === log.id}
                                                                onClick={() => handleDeleteLog(log.id)}
                                                            >
                                                                {deletingId === log.id ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                )}
                                                                Eliminar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>

                {/* Dialog: Novo Registo de Produção */}
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary" /> Novo Apontamento de Lavra & Turno
                        </DialogTitle>
                        <DialogDescription>
                            Registe as massas movimentadas, a relação estéril/minério e a frota de extração da mina.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 space-y-4 max-h-[72vh] overflow-y-auto pr-2">
                        {/* Data e Turno */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Data da Operação *</Label>
                                <DatePicker date={date} setDate={setDate} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="shift" className="text-xs font-semibold">Turno de Lavra *</Label>
                                <Select value={shift} onValueChange={(v) => setShift(v as 'Dia' | 'Noite')}>
                                    <SelectTrigger id="shift"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Dia">☀️ Turno do Dia (06:00 - 18:00)</SelectItem>
                                        <SelectItem value="Noite">🌙 Turno da Noite (18:00 - 06:00)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Classificação do Material (Minério vs Estéril) */}
                        <div className="grid grid-cols-3 gap-2 p-1.5 bg-muted/40 rounded-lg border">
                            <Button
                                type="button"
                                variant={materialType === 'Minério' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => handleMaterialTypeChange('Minério')}
                                className={cn("text-xs", materialType === 'Minério' && "bg-emerald-600 hover:bg-emerald-700")}
                            >
                                <Mountain className="h-3.5 w-3.5 mr-1.5" /> Minério Útil
                            </Button>
                            <Button
                                type="button"
                                variant={materialType === 'Estéril' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => handleMaterialTypeChange('Estéril')}
                                className={cn("text-xs", materialType === 'Estéril' && "bg-amber-600 hover:bg-amber-700")}
                            >
                                <Layers className="h-3.5 w-3.5 mr-1.5" /> Estéril
                            </Button>
                            <Button
                                type="button"
                                variant={materialType === 'Sub-económico' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => handleMaterialTypeChange('Sub-económico')}
                                className={cn("text-xs", materialType === 'Sub-económico' && "bg-blue-600 hover:bg-blue-700")}
                            >
                                Marginais
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="material" className="text-xs font-semibold">Designação do Material *</Label>
                                <Input 
                                    id="material" 
                                    value={material} 
                                    onChange={e => setMaterial(e.target.value)} 
                                    placeholder="Ex: Minério de Ferro Hematítico, Kimberlito, Gnaisse"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="pit-bench" className="text-xs font-semibold">Bancada / Frente de Lavra</Label>
                                <Input 
                                    id="pit-bench" 
                                    value={pitBench} 
                                    onChange={e => setPitBench(e.target.value)} 
                                    placeholder="Ex: Bancada +480m, Cava Principal N-02"
                                />
                            </div>
                        </div>

                        {/* Tonelagem, Densidade, Volume e Teor */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="tonnage" className="text-xs font-semibold">Massa Extraída (t) *</Label>
                                <Input 
                                    id="tonnage" 
                                    type="number" 
                                    value={tonnage} 
                                    onChange={e => setTonnage(e.target.value)} 
                                    placeholder="Ex: 2450"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="density" className="text-xs font-semibold">Densidade (t/m³)</Label>
                                <Input 
                                    id="density" 
                                    type="number" 
                                    step="0.1" 
                                    value={density} 
                                    onChange={e => setDensity(e.target.value)} 
                                    placeholder="Ex: 2.7"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Volume Estimado</Label>
                                <Input 
                                    disabled 
                                    value={calculatedVolume ? `${calculatedVolume} m³` : '---'} 
                                    className="bg-muted text-muted-foreground font-mono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="grade" className="text-xs font-semibold">
                                    {materialType === 'Minério' ? 'Teor Médio (%) (ex: Lei de Fe ou Au)' : 'Teor de Corte (%) (Opcional)'}
                                </Label>
                                <Input 
                                    id="grade" 
                                    type="number" 
                                    step="0.01" 
                                    value={grade} 
                                    onChange={e => setGrade(e.target.value)} 
                                    placeholder="Ex: 63.4"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="operation-hours" className="text-xs font-semibold">Horas Operacionais Efetivas</Label>
                                <Input 
                                    id="operation-hours" 
                                    type="number" 
                                    step="0.5" 
                                    value={operationHours} 
                                    onChange={e => setOperationHours(e.target.value)} 
                                    placeholder="Ex: 10.5"
                                />
                            </div>
                        </div>

                        {/* Origem e Destino */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="source" className="text-xs font-semibold">Local de Extração (Origem) *</Label>
                                <Input 
                                    id="source" 
                                    value={sourceLocation} 
                                    onChange={e => setSourceLocation(e.target.value)} 
                                    placeholder="Ex: Frente de Lavra 04B"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="destination" className="text-xs font-semibold">Destino de Deposição *</Label>
                                <Input 
                                    id="destination" 
                                    value={destination} 
                                    onChange={e => setDestination(e.target.value)} 
                                    placeholder="Ex: Britador Primário, Stockpile 1"
                                />
                            </div>
                        </div>

                        {/* EAP (WBS) Link */}
                        <div className="space-y-1.5">
                            <Label htmlFor="wbs-item" className="text-xs font-semibold">Atividade da Estrutura Analítica do Projeto (EAP)</Label>
                            <Select value={selectedWbsItemId} onValueChange={setSelectedWbsItemId}>
                                <SelectTrigger id="wbs-item"><SelectValue placeholder="Vincular à EAP..."/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem vínculo à EAP</SelectItem>
                                    {wbsItems.map(item => (
                                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Equipa e Equipamentos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5 text-primary"/> Equipa Envolvida
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-xs">
                                            {selectedTeamIds.length > 0 ? `${selectedTeamIds.length} operador(es) selecionado(s)` : 'Selecionar operadores...'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Procurar operador..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhum operador encontrado.</CommandEmpty>
                                                <CommandGroup className='max-h-48 overflow-y-auto'>
                                                    {projectWorkforce.map(member => (
                                                        <CommandItem 
                                                            key={member.uid} 
                                                            onSelect={() => setSelectedTeamIds(prev => 
                                                                prev.includes(member.uid) ? prev.filter(id => id !== member.uid) : [...prev, member.uid]
                                                            )}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", selectedTeamIds.includes(member.uid) ? "opacity-100" : "opacity-0")} />
                                                            {member.displayName}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold flex items-center gap-1.5">
                                    <Truck className="h-3.5 w-3.5 text-primary"/> Equipamentos da Frota
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-xs">
                                            {selectedEquipmentIds.length > 0 ? `${selectedEquipmentIds.length} máquina(s) selecionada(s)` : 'Selecionar equipamentos...'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Procurar equipamento..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhum equipamento encontrado.</CommandEmpty>
                                                <CommandGroup className='max-h-48 overflow-y-auto'>
                                                    {projectEquipment.map(eq => (
                                                        <CommandItem 
                                                            key={eq.id} 
                                                            onSelect={() => setSelectedEquipmentIds(prev => 
                                                                prev.includes(eq.id) ? prev.filter(id => id !== eq.id) : [...prev, eq.id]
                                                            )}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", selectedEquipmentIds.includes(eq.id) ? "opacity-100" : "opacity-0")} />
                                                            {eq.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Observações de turno */}
                        <div className="space-y-1.5">
                            <Label htmlFor="notes" className="text-xs font-semibold">Ocorrências & Observações de Turno</Label>
                            <Textarea 
                                id="notes" 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)} 
                                placeholder="Registo de condições meteorológicas, atrasos por detonação, estado das pistas de transporte..."
                                rows={2}
                                className="text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t">
                        <Button variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="shadow-sm">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Plus className="mr-2 h-4 w-4"/>}
                            Registar Apontamento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Boletim Técnico de Turno de Lavra */}
            <Dialog open={isBulletinOpen} onOpenChange={setIsBulletinOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader className="border-b pb-3">
                        <div className="flex items-center justify-between pr-6">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Truck className="h-5 w-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base font-bold">Boletim Diário de Turno de Lavra</DialogTitle>
                                    <DialogDescription className="text-xs">
                                        Documento técnico oficial de apontamento de mina e movimentação de massas
                                    </DialogDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="font-mono text-xs">
                                {selectedBulletinLog ? format(selectedBulletinLog.date, 'dd/MM/yyyy') : ''}
                            </Badge>
                        </div>
                    </DialogHeader>

                    {selectedBulletinLog && (
                        <div className="space-y-4 py-2 text-xs">
                            {/* Header info */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-lg border">
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">Turno Operacional</span>
                                    <span className="font-bold text-sm flex items-center gap-1">
                                        {selectedBulletinLog.shift === 'Dia' ? '☀️ Dia (06h-18h)' : '🌙 Noite (18h-06h)'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">Tipologia</span>
                                    <Badge variant="secondary" className="font-semibold text-xs mt-0.5">
                                        {selectedBulletinLog.materialType || 'Minério'}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">Horas de Operação</span>
                                    <span className="font-bold text-sm">{selectedBulletinLog.operationHours ? `${selectedBulletinLog.operationHours} horas` : 'N/D'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">Responsável Técnico</span>
                                    <span className="font-medium text-xs truncate block">{selectedBulletinLog.author?.displayName || 'Engenheiro de Mina'}</span>
                                </div>
                            </div>

                            {/* Balanço de Massas */}
                            <div className="border rounded-lg p-3 space-y-2">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Scale className="h-3.5 w-3.5 text-primary" /> Balanço de Massa & Teores
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-background p-2.5 rounded border">
                                        <span className="text-muted-foreground block text-[11px]">Tonelagem Movimentada</span>
                                        <span className="font-mono font-bold text-base text-foreground">
                                            {selectedBulletinLog.tonnage.toLocaleString('pt-AO')} t
                                        </span>
                                    </div>
                                    <div className="bg-background p-2.5 rounded border">
                                        <span className="text-muted-foreground block text-[11px]">Teor Médio (Lei)</span>
                                        <span className="font-mono font-bold text-base text-primary">
                                            {selectedBulletinLog.grade !== undefined && selectedBulletinLog.grade !== null ? `${selectedBulletinLog.grade.toFixed(2)}%` : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="bg-background p-2.5 rounded border">
                                        <span className="text-muted-foreground block text-[11px]">Densidade Aparente</span>
                                        <span className="font-mono font-bold text-base">
                                            {selectedBulletinLog.density ? `${selectedBulletinLog.density.toFixed(2)} t/m³` : '2.70 t/m³'}
                                        </span>
                                    </div>
                                    <div className="bg-background p-2.5 rounded border">
                                        <span className="text-muted-foreground block text-[11px]">Volume Geométrico</span>
                                        <span className="font-mono font-bold text-base">
                                            {selectedBulletinLog.volume ? `${selectedBulletinLog.volume.toFixed(1)} m³` : selectedBulletinLog.density ? `${(selectedBulletinLog.tonnage / selectedBulletinLog.density).toFixed(1)} m³` : '---'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Geotecnia e Localização */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="border rounded-lg p-3 space-y-1.5">
                                    <span className="text-muted-foreground block text-[11px] font-semibold">Origem / Frente de Lavra / Bancada</span>
                                    <p className="font-medium">{selectedBulletinLog.sourceLocation}</p>
                                    {selectedBulletinLog.pitBench && (
                                        <p className="text-xs text-muted-foreground">Bancada: <strong className="text-foreground">{selectedBulletinLog.pitBench}</strong></p>
                                    )}
                                </div>
                                <div className="border rounded-lg p-3 space-y-1.5">
                                    <span className="text-muted-foreground block text-[11px] font-semibold">Destino de Deposição</span>
                                    <p className="font-medium">{selectedBulletinLog.destination}</p>
                                    {selectedBulletinLog.wbsItemName && (
                                        <p className="text-xs text-muted-foreground">Atividade EAP: <strong className="text-foreground">{selectedBulletinLog.wbsItemName}</strong></p>
                                    )}
                                </div>
                            </div>

                            {/* Frota e Operadores */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="border rounded-lg p-3 space-y-1.5">
                                    <span className="text-muted-foreground block text-[11px] font-semibold flex items-center gap-1">
                                        <Users className="h-3 w-3 text-primary" /> Equipa e Operadores ({selectedBulletinLog.team?.length || 0})
                                    </span>
                                    {selectedBulletinLog.team && selectedBulletinLog.team.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {selectedBulletinLog.team.map(m => (
                                                <Badge key={m.id} variant="secondary" className="text-[10px]">{m.name}</Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground italic text-xs">Sem operadores associados</span>
                                    )}
                                </div>
                                <div className="border rounded-lg p-3 space-y-1.5">
                                    <span className="text-muted-foreground block text-[11px] font-semibold flex items-center gap-1">
                                        <Truck className="h-3 w-3 text-primary" /> Frota Pesada Utilizada ({selectedBulletinLog.equipment?.length || 0})
                                    </span>
                                    {selectedBulletinLog.equipment && selectedBulletinLog.equipment.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {selectedBulletinLog.equipment.map(e => (
                                                <Badge key={e.id} variant="outline" className="text-[10px]">{e.name}</Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground italic text-xs">Sem equipamentos associados</span>
                                    )}
                                </div>
                            </div>

                            {/* Observações de turno */}
                            {selectedBulletinLog.notes && (
                                <div className="bg-muted/40 p-3 rounded-lg border text-xs">
                                    <span className="font-semibold block mb-1 text-muted-foreground">Observações Técnicas de Campo:</span>
                                    <p className="leading-relaxed">{selectedBulletinLog.notes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="border-t pt-3 flex items-center justify-between">
                        <Button variant="ghost" size="sm" onClick={() => setIsBulletinOpen(false)}>
                            Fechar
                        </Button>
                        <Button size="sm" onClick={handlePrintBulletin} className="gap-1.5 shadow-sm">
                            <Printer className="h-4 w-4" /> Imprimir Boletim
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
