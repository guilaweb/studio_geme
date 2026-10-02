

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  where,
  doc,
  updateDoc,
  deleteDoc,
  collectionGroup,
  getDocs,
  writeBatch,
  getDoc,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Plus,
  Truck,
  MinusCircle,
  UserCheck,
  Trash2,
  SlidersHorizontal,
  UserPlus,
  Wrench,
  ArrowRightLeft,
  History,
  Clock,
} from 'lucide-react';
import {
  type Equipment,
  type ProjectEquipment,
  type EquipmentCategory,
  type EquipmentStatus,
  EquipmentCategories,
  type EquipmentUsageLog,
  type MaintenanceRecord,
  MaintenanceType,
} from '@/types/equipment';
import { type Project } from '@/types/project';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DatePicker } from '@/components/ui/date-picker';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { WbsItem } from '@/types/wbs';
import type { ProjectWorkforceMember } from '@/types/workforce';

interface ProjectEquipmentTabProps {
    projectId: string;
    userRole: UserRole | null;
}

type CombinedLog = (EquipmentUsageLog | MaintenanceRecord) & { logType: 'usage' | 'maintenance' };

export default function ProjectEquipmentTab({ projectId, userRole }: ProjectEquipmentTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [projectEquipment, setProjectEquipment] = useState<ProjectEquipment[]>([]);
    const [globalEquipmentList, setGlobalEquipmentList] = useState<Equipment[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [projectWorkforce, setProjectWorkforce] = useState<ProjectWorkforceMember[]>([]);
    const [projectName, setProjectName] = useState<string>('Obra');
    const [loading, setLoading] = useState(true);
    
    // State for dialogs
    const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
    const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
    const [isAllocateDialogOpen, setIsAllocateDialogOpen] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState<ProjectEquipment | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state for allocation
    const [allocationMode, setAllocationMode] = useState<'existing' | 'new'>('existing');
    const [selectedGlobalEqId, setSelectedGlobalEqId] = useState<string>('');
    const [newEqName, setNewEqName] = useState('');
    const [newEqCategory, setNewEqCategory] = useState<EquipmentCategory>('Veículo Pesado');
    const [newEqModel, setNewEqModel] = useState('');
    const [newEqSerial, setNewEqSerial] = useState('');
    const [newEqHours, setNewEqHours] = useState('0');
    const [newEqCostPerHour, setNewEqCostPerHour] = useState('');
    const [newEqMaintenanceInterval, setNewEqMaintenanceInterval] = useState('250');

    // Form state for usage log
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [hoursUsed, setHoursUsed] = useState('');
    const [hourMeterReading, setHourMeterReading] = useState('');
    const [fuelConsumed, setFuelConsumed] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedWbsItemId, setSelectedWbsItemId] = useState<string>('none');
    const [selectedOperatorId, setSelectedOperatorId] = useState<string>('none');
    
    // Form state for maintenance record
    const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('Preventiva');
    const [maintenanceCost, setMaintenanceCost] = useState('');
    const [downtimeHours, setDowntimeHours] = useState('');

    // State for history logs
    const [logs, setLogs] = useState<Record<string, CombinedLog[]>>({});
    const [loadingLogs, setLoadingLogs] = useState<string | null>(null);

    const canEdit = userRole === 'Editor' || userRole === 'Gestor' || userRole === 'Mestre de Obra';

    useEffect(() => {
        if (!projectId || !user) return;
        setLoading(true);

        const projectRef = doc(db, 'projects', projectId);
        getDoc(projectRef).then(docSnap => {
            if (docSnap.exists()) {
                setProjectName(docSnap.data()?.name || 'Obra');
            }
        });

        const projectEqQuery = query(collection(db, 'projects', projectId, 'equipment'), orderBy('allocatedAt', 'desc'));
        const unsubProjectEq = onSnapshot(projectEqQuery, snapshot => {
            setProjectEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectEquipment)));
        });

        const globalEqQuery = query(collection(db, 'equipment'), where('author.uid', '==', user.uid));
        const unsubGlobalEq = onSnapshot(globalEqQuery, snapshot => {
            setGlobalEquipmentList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
        }, error => {
            console.error("Error fetching global equipment:", error);
            setLoading(false);
        });

        const wbsQuery = query(collection(db, 'projects', projectId, 'wbs'));
        const unsubWbs = onSnapshot(wbsQuery, snapshot => {
            setWbsItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WbsItem)));
        });
        
        const workforceQuery = query(collection(db, 'projects', projectId, 'workforce'));
        const unsubWorkforce = onSnapshot(workforceQuery, snapshot => {
            setProjectWorkforce(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectWorkforceMember)));
            setLoading(false);
        });

        return () => {
            unsubProjectEq();
            unsubGlobalEq();
            unsubWbs();
            unsubWorkforce();
        };
    }, [projectId, user]);

    const handleAllocateEquipment = async () => {
        if (!canEdit || !user) return;

        setIsSubmitting(true);
        const batch = writeBatch(db);

        try {
            if (allocationMode === 'existing') {
                if (!selectedGlobalEqId) {
                    toast({ title: 'Selecione um equipamento', variant: 'destructive' });
                    setIsSubmitting(false);
                    return;
                }
                const globalEq = globalEquipmentList.find(e => e.id === selectedGlobalEqId);
                if (!globalEq) throw new Error('Equipamento não encontrado');

                // If already allocated somewhere else, warn or handle transfer
                if (globalEq.currentProjectId && globalEq.currentProjectId !== projectId) {
                    // Remove from previous project subcollection
                    const prevQuery = query(
                        collection(db, 'projects', globalEq.currentProjectId, 'equipment'),
                        where('equipmentId', '==', globalEq.id)
                    );
                    const prevSnap = await getDocs(prevQuery);
                    prevSnap.forEach(d => batch.delete(d.ref));
                }

                // Add to current project
                const projEqRef = doc(collection(db, 'projects', projectId, 'equipment'));
                batch.set(projEqRef, {
                    equipmentId: globalEq.id,
                    name: globalEq.name,
                    category: globalEq.category,
                    allocatedAt: serverTimestamp(),
                });

                // Update global equipment
                const globalEqRef = doc(db, 'equipment', globalEq.id);
                batch.update(globalEqRef, {
                    status: 'Em Uso',
                    currentProjectId: projectId,
                    currentProjectName: projectName,
                });

                await batch.commit();
                toast({
                    title: 'Equipamento Alocado à Obra!',
                    description: `${globalEq.name} está agora operacional neste estaleiro.`
                });
            } else {
                // New equipment registration + allocation
                if (!newEqName.trim()) {
                    toast({ title: 'Nome do equipamento obrigatório', variant: 'destructive' });
                    setIsSubmitting(false);
                    return;
                }

                const newEqRef = doc(collection(db, 'equipment'));
                const newEqId = newEqRef.id;
                const hours = parseFloat(newEqHours) || 0;
                const costPerHour = parseFloat(newEqCostPerHour) || 0;
                const interval = parseFloat(newEqMaintenanceInterval) || 250;

                // 1. Create global record
                batch.set(newEqRef, {
                    name: newEqName.trim(),
                    category: newEqCategory,
                    model: newEqModel.trim() || null,
                    serialNumber: newEqSerial.trim() || null,
                    status: 'Em Uso',
                    currentHours: hours,
                    operationalCostPerHour: costPerHour,
                    maintenanceIntervalHours: interval,
                    lastMaintenanceHours: 0,
                    currentProjectId: projectId,
                    currentProjectName: projectName,
                    author: { uid: user.uid, displayName: user.displayName || user.email },
                    createdAt: serverTimestamp(),
                });

                // 2. Allocate to project
                const projEqRef = doc(collection(db, 'projects', projectId, 'equipment'));
                batch.set(projEqRef, {
                    equipmentId: newEqId,
                    name: newEqName.trim(),
                    category: newEqCategory,
                    allocatedAt: serverTimestamp(),
                });

                await batch.commit();
                toast({
                    title: 'Equipamento Registado e Alocado!',
                    description: `${newEqName} adicionado à frota geral e alocado à obra com sucesso.`
                });

                // Reset new form
                setNewEqName('');
                setNewEqModel('');
                setNewEqSerial('');
                setNewEqHours('0');
                setNewEqCostPerHour('');
            }

            setIsAllocateDialogOpen(false);
            setSelectedGlobalEqId('');
        } catch (error) {
            console.error('Error allocating equipment:', error);
            toast({ title: 'Erro ao alocar equipamento', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const fetchLogs = async (projectEqId: string) => {
        const projEq = projectEquipment.find(pe => pe.id === projectEqId);
        if (logs[projectEqId] || !projEq) return;
        setLoadingLogs(projectEqId);
        try {
            const usageQuery = query(collection(db, `projects/${projectId}/equipment/${projectEqId}/usageLogs`), orderBy('date', 'desc'));
            const maintenanceQuery = query(collection(db, `equipment/${projEq.equipmentId}/maintenanceRecords`), orderBy('date', 'desc'));

            const [usageSnapshot, maintenanceSnapshot] = await Promise.all([
                getDocs(usageQuery),
                getDocs(maintenanceQuery)
            ]);

            const usageLogs = usageSnapshot.docs.map(doc => ({ ...(doc.data() as EquipmentUsageLog), logType: 'usage', id: doc.id }));
            const maintenanceRecords = maintenanceSnapshot.docs.map(doc => ({ ...(doc.data() as MaintenanceRecord), logType: 'maintenance', id: doc.id }));
            
            const combined = [...usageLogs, ...maintenanceRecords]
                .sort((a, b) => ((b.date as Timestamp)?.toMillis() || 0) - ((a.date as Timestamp)?.toMillis() || 0));

            setLogs(prev => ({ ...prev, [projectEqId]: combined as CombinedLog[] }));
        } catch (e) {
            toast({ title: 'Erro ao carregar histórico', variant: 'destructive' });
        } finally {
            setLoadingLogs(null);
        }
    };


    const handleDeallocate = async (projectEquipment: ProjectEquipment) => {
        if (!canEdit || !projectEquipment.equipmentId) return;

        const batch = writeBatch(db);
        
        const projectEqRef = doc(db, 'projects', projectId, 'equipment', projectEquipment.id);
        batch.delete(projectEqRef);

        const globalEqRef = doc(db, 'equipment', projectEquipment.equipmentId);
        batch.update(globalEqRef, {
            status: 'Disponível',
            currentProjectId: null,
            currentProjectName: null,
        });

        try {
            await batch.commit();
            toast({ title: 'Equipamento Desalocado', description: `${projectEquipment.name} foi devolvido ao parque geral.` });
        } catch (error) {
            console.error("Error deallocating equipment: ", error);
            toast({ title: 'Erro ao desalocar', variant: 'destructive' });
        }
    };

    const openUsageDialog = (eq: ProjectEquipment) => {
        const globalEq = globalEquipmentList.find(g => g.id === eq.equipmentId);
        setSelectedEquipment(eq);
        setDate(new Date());
        setHoursUsed('');
        setHourMeterReading(globalEq?.currentHours ? String(globalEq.currentHours) : '');
        setFuelConsumed('');
        setNotes('');
        setSelectedWbsItemId('none');
        setSelectedOperatorId('none');
        setIsUsageDialogOpen(true);
    };

    const openMaintenanceDialog = (eq: ProjectEquipment) => {
        const globalEq = globalEquipmentList.find(g => g.id === eq.equipmentId);
        setSelectedEquipment(eq);
        setDate(new Date());
        setNotes('');
        setMaintenanceType('Preventiva');
        setMaintenanceCost('');
        setDowntimeHours('');
        setIsMaintenanceDialogOpen(true);
    };

    const handleAddUsageLog = async () => {
        if (!user || !selectedEquipment || !date || !hoursUsed) {
            toast({ title: 'Campos obrigatórios em falta.', description: 'Data e horas trabalhadas são obrigatórias.', variant: 'destructive' });
            return;
        }
        
        const hours = parseFloat(hoursUsed);
        const globalEq = globalEquipmentList.find(eq => eq.id === selectedEquipment.equipmentId);
        const currentHours = globalEq?.currentHours || 0;
        const meter = hourMeterReading ? parseFloat(hourMeterReading) : (currentHours + hours);
        const fuel = parseFloat(fuelConsumed);

        if (isNaN(hours) || hours <= 0 || isNaN(meter) || meter <= 0) {
             toast({ title: 'Valores inválidos', description: 'As horas trabalhadas devem ser um valor numérico positivo.', variant: 'destructive'});
            return;
        }

        setIsSubmitting(true);
        const batch = writeBatch(db);
        try {
            const operator = projectWorkforce.find(m => m.id === selectedOperatorId);
            const wbsItem = wbsItems.find(item => item.id === selectedWbsItemId);
            
            const usageLogRef = doc(collection(db, 'projects', projectId, 'equipment', selectedEquipment.id, 'usageLogs'));
            batch.set(usageLogRef, {
                date,
                hoursUsed: hours,
                hourMeterReading: meter,
                fuelConsumed: isNaN(fuel) ? 0 : fuel,
                notes,
                projectId: projectId,
                equipmentId: selectedEquipment.equipmentId,
                wbsItemId: selectedWbsItemId === 'none' ? null : selectedWbsItemId,
                operatorId: operator?.workforceId || null,
                operatorName: operator?.name || null,
                author: { uid: user.uid, displayName: user.displayName }
            });

            const globalEq = globalEquipmentList.find(eq => eq.id === selectedEquipment.equipmentId);
            const operationalCost = globalEq?.operationalCostPerHour || 0;
            const totalEquipmentCost = hours * operationalCost;

            if (totalEquipmentCost > 0) {
                const transactionRef = doc(collection(db, 'projects', projectId, 'transactions'));
                batch.set(transactionRef, {
                    description: `Custo operacional: ${selectedEquipment.name}`,
                    amount: totalEquipmentCost,
                    date: date,
                    type: 'Despesa',
                    status: 'Pago',
                    accountId: 'equipment-costs',
                    accountName: 'Custos de Equipamentos',
                    wbsItemId: selectedWbsItemId === 'none' ? null : selectedWbsItemId,
                    wbsItemName: wbsItem?.name || '',
                });
            }

            if (globalEq) {
                const globalEqRef = doc(db, 'equipment', globalEq.id);
                batch.update(globalEqRef, { currentHours: meter });
            }

            await batch.commit();
            toast({ title: 'Registo de utilização adicionado.' });
            setIsUsageDialogOpen(false);
        } catch(error) {
            console.error("Error adding usage log: ", error);
            toast({ title: 'Erro ao registar utilização.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleAddMaintenanceRecord = async () => {
        if (!user || !selectedEquipment || !date || !notes || !maintenanceCost) {
            toast({ title: 'Campos obrigatórios em falta.', variant: 'destructive' });
            return;
        }

        const cost = parseFloat(maintenanceCost);
        if (isNaN(cost) || cost < 0) {
            toast({ title: 'Custo inválido.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        const batch = writeBatch(db);
        try {
            const globalEq = globalEquipmentList.find(eq => eq.id === selectedEquipment.equipmentId);
            if (!globalEq) throw new Error("Equipamento global não encontrado.");

            const maintenanceRef = doc(collection(db, `equipment/${globalEq.id}/maintenanceRecords`));
            batch.set(maintenanceRef, {
                date,
                type: maintenanceType,
                description: notes,
                cost: cost,
                downtimeHours: parseFloat(downtimeHours) || 0,
                author: { uid: user.uid, displayName: user.displayName }
            });

            if (cost > 0) {
                const transactionRef = doc(collection(db, 'projects', projectId, 'transactions'));
                batch.set(transactionRef, {
                    description: `Manutenção: ${selectedEquipment.name} - ${notes}`,
                    amount: cost,
                    date: date,
                    type: 'Despesa',
                    status: 'Pago',
                    accountId: 'equipment-maintenance',
                    accountName: 'Manutenção de Equipamentos',
                });
            }
            
            const globalEqRef = doc(db, 'equipment', globalEq.id);
            const updates: any = { 
                lastMaintenanceDate: date,
                lastMaintenanceHours: globalEq.currentHours || 0
            };
            if (maintenanceType === 'Avaria' || maintenanceType === 'Corretiva') {
                updates.status = 'Em Manutenção';
            }
            batch.update(globalEqRef, updates);
            
            await batch.commit();
            toast({ title: 'Registo de manutenção adicionado.' });
            setIsMaintenanceDialogOpen(false);
        } catch(error) {
            console.error("Error adding maintenance record: ", error);
            toast({ title: 'Erro ao registar manutenção.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getMaintenanceStatus = (eq: Equipment) => {
        if (!eq.maintenanceIntervalHours || eq.maintenanceIntervalHours === 0) {
            return { progress: 0, needsMaintenance: false, isUrgent: false, message: 'Intervalo não definido.' };
        }
        const hoursSinceLast = (eq.currentHours || 0) - (eq.lastMaintenanceHours || 0);
        const progress = Math.min((hoursSinceLast / eq.maintenanceIntervalHours) * 100, 100);
        const needsMaintenance = hoursSinceLast >= eq.maintenanceIntervalHours;
        const isUrgent = needsMaintenance && hoursSinceLast >= eq.maintenanceIntervalHours * 1.1; // 10% overdue
        const hoursRemaining = eq.maintenanceIntervalHours - hoursSinceLast;
        
        let message = '';
        if (needsMaintenance) {
            message = `Manutenção ${isUrgent ? 'urgente' : 'necessária'}. Horas desde a última: ${hoursSinceLast.toFixed(0)}`;
        } else {
            message = `Próxima manutenção em ${hoursRemaining.toFixed(0)} horas.`;
        }
        return { progress, needsMaintenance, isUrgent, message };
    };

    return (
        <div className="pt-4 space-y-4">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary" /> Equipamentos Alocados à Obra
                        </CardTitle>
                        <CardDescription>Gira a utilização, abastecimento e manutenção da frota e maquinaria alocada a esta obra.</CardDescription>
                    </div>
                    {canEdit && (
                        <Button onClick={() => setIsAllocateDialogOpen(true)} className="gap-2 shrink-0">
                            <Plus className="h-4 w-4" /> Alocar Equipamento
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin mr-2"/> Carregando frota da obra...</div>
                    ) : projectEquipment.length === 0 ? (
                        <div className="text-center py-10 space-y-3">
                            <div className="p-3 bg-muted/60 rounded-full w-fit mx-auto">
                                <Truck className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-base font-semibold text-foreground">Nenhum equipamento alocado a este projeto.</p>
                            <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                Aloque máquinas do parque da empresa ou registe novas viaturas e equipamentos pesados diretamente nesta obra.
                            </p>
                            {canEdit && (
                                <Button onClick={() => setIsAllocateDialogOpen(true)} variant="outline" className="gap-2 mt-2">
                                    <Plus className="h-4 w-4" /> Alocar Primeiro Equipamento
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* MOBILE FIRST VIEW: Cards empilhados para ecrãs de smartphone */}
                            <div className="block md:hidden space-y-4">
                                {projectEquipment.map(item => {
                                    const globalEq = globalEquipmentList.find(g => g.id === item.equipmentId);
                                    if (!globalEq) return null;
                                    const maintenanceStatus = getMaintenanceStatus(globalEq);
                                    const isExpanded = !!logs[item.id];

                                    return (
                                        <Card key={item.id} className="border shadow-sm overflow-hidden">
                                            <div className="p-4 space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h4 className="font-bold text-base text-foreground">{item.name}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline" className="text-xs">
                                                                {item.category}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                {(globalEq as any).model || globalEq.notes || 'Equipamento'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-base font-bold font-mono text-primary">
                                                            {globalEq.currentHours || 0} h
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground">Horímetro</span>
                                                    </div>
                                                </div>

                                                {/* Estado de Manutenção */}
                                                <div className="space-y-1.5 bg-muted/40 p-2.5 rounded-lg border">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="font-medium text-muted-foreground">Plano de Manutenção:</span>
                                                        <span className={cn(
                                                            "font-bold",
                                                            maintenanceStatus.isUrgent ? "text-destructive" :
                                                            maintenanceStatus.needsMaintenance ? "text-amber-600" : "text-emerald-600"
                                                        )}>
                                                            {maintenanceStatus.progress.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <Progress
                                                        value={maintenanceStatus.progress}
                                                        indicatorClassName={cn(
                                                            maintenanceStatus.isUrgent && "bg-destructive",
                                                            maintenanceStatus.needsMaintenance && "bg-amber-500",
                                                            !maintenanceStatus.needsMaintenance && "bg-emerald-500"
                                                        )}
                                                    />
                                                    <p className="text-[11px] text-muted-foreground">{maintenanceStatus.message}</p>
                                                </div>

                                                {/* Botões de Ação Mobile (44px touch targets) */}
                                                {canEdit && (
                                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                                        <Button
                                                            size="default"
                                                            variant="outline"
                                                            className="h-11 text-xs gap-1.5 bg-background font-medium hover:bg-primary/10 hover:text-primary"
                                                            onClick={() => openUsageDialog(item)}
                                                        >
                                                            <Clock className="h-4 w-4 text-primary shrink-0" /> Registar Horas
                                                        </Button>
                                                        <Button
                                                            size="default"
                                                            variant="outline"
                                                            className="h-11 text-xs gap-1.5 bg-background font-medium hover:bg-amber-500/10 hover:text-amber-600"
                                                            onClick={() => openMaintenanceDialog(item)}
                                                        >
                                                            <Wrench className="h-4 w-4 text-amber-500 shrink-0" /> Manutenção
                                                        </Button>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between pt-1 border-t text-xs">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-xs text-muted-foreground px-2"
                                                        onClick={() => fetchLogs(item.id)}
                                                    >
                                                        <History className="h-3.5 w-3.5 mr-1.5" />
                                                        {loadingLogs === item.id ? 'A carregar...' : isExpanded ? 'Ver Histórico' : 'Histórico'}
                                                    </Button>

                                                    {canEdit && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 text-xs text-destructive hover:bg-destructive/10 px-2"
                                                            onClick={() => handleDeallocate(item)}
                                                        >
                                                            <MinusCircle className="h-3.5 w-3.5 mr-1" /> Desalocar
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* Histórico expandido no mobile */}
                                                {logs[item.id] && (
                                                    <div className="mt-2 space-y-2 pt-2 border-t">
                                                        <div className="text-xs font-semibold text-muted-foreground">Histórico Recente:</div>
                                                        {logs[item.id].length === 0 ? (
                                                            <p className="text-xs text-muted-foreground italic">Sem apontamentos registados nesta obra.</p>
                                                        ) : (
                                                            logs[item.id].slice(0, 5).map(log => (
                                                                <div key={log.id} className="text-xs p-2 rounded bg-muted/30 border space-y-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <Badge variant={log.logType === 'usage' ? 'secondary' : 'outline'} className="text-[10px]">
                                                                            {log.logType === 'usage' ? 'Utilização' : 'Manutenção'}
                                                                        </Badge>
                                                                        <span className="font-mono text-muted-foreground">
                                                                            {log.date ? format((log.date as Timestamp).toDate(), 'dd/MM/yyyy') : '-'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-foreground">
                                                                        {log.logType === 'usage' ? (log as EquipmentUsageLog).notes || 'Turno normal' : (log as MaintenanceRecord).description}
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-muted-foreground text-[11px] pt-0.5">
                                                                        <span>{log.logType === 'usage' ? ((log as EquipmentUsageLog).operatorName || 'Sem operador') : 'Oficina'}</span>
                                                                        <span className="font-mono font-bold text-foreground">
                                                                            {log.logType === 'usage' ? `${(log as EquipmentUsageLog).hoursUsed}h` : `${(log as MaintenanceRecord).cost.toLocaleString('pt-AO')} Kz`}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* DESKTOP VIEW: Accordion estruturado com tabela completa */}
                            <div className="hidden md:block">
                                <Accordion type="single" collapsible className="w-full" onValueChange={fetchLogs}>
                                    {projectEquipment.map(item => {
                                        const globalEq = globalEquipmentList.find(g => g.id === item.equipmentId);
                                        if (!globalEq) return null;
                                        const maintenanceStatus = getMaintenanceStatus(globalEq);
                                        return (
                                        <AccordionItem value={item.id} key={item.id}>
                                            <AccordionTrigger className="hover:no-underline">
                                                <div className="grid grid-cols-4 gap-4 w-full pr-4 text-left items-center">
                                                    <span className="font-semibold">{item.name}</span>
                                                    <span className="text-muted-foreground">{item.category}</span>
                                                    <div className="flex items-center gap-2">
                                                        <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger className="w-full">
                                                            <Progress value={maintenanceStatus.progress} indicatorClassName={cn(maintenanceStatus.isUrgent && "bg-destructive", maintenanceStatus.needsMaintenance && "bg-yellow-500")}/>
                                                        </TooltipTrigger><TooltipContent><p>{maintenanceStatus.message}</p></TooltipContent></Tooltip></TooltipProvider>
                                                    </div>
                                                    <div className="text-right font-mono text-sm font-semibold">{globalEq.currentHours || 0} h</div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-4 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-sm text-muted-foreground">Alocado em: {item.allocatedAt ? format((item.allocatedAt as any).toDate(), 'dd/MM/yyyy') : 'N/A'}</p>
                                                    {canEdit && (
                                                        <div className="flex gap-2">
                                                            <Button size="sm" variant="outline" onClick={() => openMaintenanceDialog(item)}>
                                                                <Wrench className="mr-2 h-4 w-4"/> Registar Manutenção
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => openUsageDialog(item)}>
                                                                <Clock className="mr-2 h-4 w-4"/> Registar Utilização
                                                            </Button>
                                                            <Button size="sm" variant="destructive" onClick={() => handleDeallocate(item)}>
                                                                <MinusCircle className="mr-2 h-4 w-4" /> Desalocar
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><History className="h-4 w-4"/>Histórico no Projeto</h4>
                                                    {loadingLogs === item.id && <div className="flex justify-center py-4"><Loader2 className="animate-spin"/></div>}
                                                    {logs[item.id] && (
                                                        <div className="max-h-60 overflow-y-auto border rounded-md">
                                                        <Table>
                                                            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Detalhes</TableHead><TableHead>Operador</TableHead><TableHead className="text-right">Horas/Custo</TableHead></TableRow></TableHeader>
                                                            <TableBody>
                                                                {logs[item.id].length === 0 && <TableRow><TableCell colSpan={5} className="text-center">Nenhum registo.</TableCell></TableRow>}
                                                                {logs[item.id].map(log => (
                                                                    <TableRow key={log.id}>
                                                                        <TableCell>{format((log.date as Timestamp).toDate(), 'dd/MM/yyyy')}</TableCell>
                                                                        <TableCell><Badge variant={log.logType === 'usage' ? 'secondary' : 'outline'}>{log.logType === 'usage' ? 'Utilização' : 'Manutenção'}</Badge></TableCell>
                                                                        <TableCell className="text-xs">{log.logType === 'usage' ? (log as EquipmentUsageLog).notes : (log as MaintenanceRecord).description}</TableCell>
                                                                        <TableCell className="text-xs">{log.logType === 'usage' ? (log as EquipmentUsageLog).operatorName || '-' : '-'}</TableCell>
                                                                        <TableCell className="text-right font-mono text-xs">
                                                                            {log.logType === 'usage' ? `${(log as EquipmentUsageLog).hoursUsed}h` : `${(log as MaintenanceRecord).cost.toLocaleString('pt-AO')} Kz`}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                        </div>
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )})}
                                </Accordion>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* DIALOG DE ALOCAÇÃO DE EQUIPAMENTO À OBRA */}
            <Dialog open={isAllocateDialogOpen} onOpenChange={setIsAllocateDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary" /> Alocar Equipamento à Obra
                        </DialogTitle>
                        <DialogDescription>
                            Selecione máquinas da frota geral da empresa ou adicione um novo equipamento diretamente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2 p-1 bg-muted rounded-lg">
                        <Button
                            type="button"
                            size="sm"
                            variant={allocationMode === 'existing' ? 'default' : 'ghost'}
                            className="flex-1 text-xs"
                            onClick={() => setAllocationMode('existing')}
                        >
                            Equipamento da Frota
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={allocationMode === 'new' ? 'default' : 'ghost'}
                            className="flex-1 text-xs"
                            onClick={() => setAllocationMode('new')}
                        >
                            + Novo Registo
                        </Button>
                    </div>

                    {allocationMode === 'existing' ? (
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="eq-select">Selecione o Equipamento</Label>
                                <Select value={selectedGlobalEqId} onValueChange={setSelectedGlobalEqId}>
                                    <SelectTrigger id="eq-select">
                                        <SelectValue placeholder="Escolha um equipamento da frota..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {globalEquipmentList
                                            .filter(eq => !projectEquipment.some(pe => pe.equipmentId === eq.id))
                                            .map(eq => (
                                                <SelectItem key={eq.id} value={eq.id}>
                                                    {eq.name} ({eq.category}) {eq.currentProjectId ? `[Em: ${eq.currentProjectName || 'Outra Obra'}]` : '[Disponível]'}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedGlobalEqId && (() => {
                                const sel = globalEquipmentList.find(e => e.id === selectedGlobalEqId);
                                if (!sel) return null;
                                return (
                                    <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1.5 border">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Categoria:</span>
                                            <span className="font-semibold">{sel.category}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Horímetro Atual:</span>
                                            <span className="font-mono font-bold">{sel.currentHours || 0} h</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Custo/Hora Operacional:</span>
                                            <span className="font-mono">{(sel.operationalCostPerHour || 0).toLocaleString('pt-AO')} Kz/h</span>
                                        </div>
                                        {sel.currentProjectId && (
                                            <div className="text-amber-600 font-medium pt-1 border-t text-[11px]">
                                                ⚠️ Este equipamento está alocado em "{sel.currentProjectName || 'Outro Projeto'}". Ao confirmar, será transferido para esta obra.
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto px-1">
                            {/* Presets Angolanos */}
                            <div className="space-y-1 p-2 rounded-lg bg-muted/40 border">
                                <Label className="text-[11px] font-semibold text-muted-foreground block">Modelos Frequentes em Obra:</Label>
                                <div className="flex flex-wrap gap-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="text-[11px] h-6 rounded-full px-2"
                                        onClick={() => {
                                            setNewEqName('Retroescavadora CAT 428F');
                                            setNewEqCategory('Veículo Pesado');
                                            setNewEqModel('Caterpillar 428F');
                                            setNewEqCostPerHour('28000');
                                            setNewEqMaintenanceInterval('250');
                                        }}
                                    >
                                        + Retroescavadora CAT
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="text-[11px] h-6 rounded-full px-2"
                                        onClick={() => {
                                            setNewEqName('Camião Basculante 25T');
                                            setNewEqCategory('Veículo Pesado');
                                            setNewEqModel('Sinotruk Howo 371');
                                            setNewEqCostPerHour('35000');
                                            setNewEqMaintenanceInterval('500');
                                        }}
                                    >
                                        + Basculante 25T
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="text-[11px] h-6 rounded-full px-2"
                                        onClick={() => {
                                            setNewEqName('Gerador Perkins 150 kVA');
                                            setNewEqCategory('Energia');
                                            setNewEqModel('Perkins 1106A');
                                            setNewEqCostPerHour('15000');
                                            setNewEqMaintenanceInterval('250');
                                        }}
                                    >
                                        + Gerador 150kVA
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="new-eq-name" className="text-xs">Designação do Equipamento *</Label>
                                <Input
                                    id="new-eq-name"
                                    placeholder="Ex: Cilindro Compactador Dynapac"
                                    value={newEqName}
                                    onChange={e => setNewEqName(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Categoria</Label>
                                    <Select value={newEqCategory} onValueChange={v => setNewEqCategory(v as EquipmentCategory)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {EquipmentCategories.map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="new-eq-model" className="text-xs">Marca / Modelo</Label>
                                    <Input
                                        id="new-eq-model"
                                        placeholder="Ex: CA250D"
                                        value={newEqModel}
                                        onChange={e => setNewEqModel(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="new-eq-hours" className="text-xs">Horímetro Inicial</Label>
                                    <Input
                                        id="new-eq-hours"
                                        type="number"
                                        value={newEqHours}
                                        onChange={e => setNewEqHours(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="new-eq-cost" className="text-xs">Custo/Hora (Kz)</Label>
                                    <Input
                                        id="new-eq-cost"
                                        type="number"
                                        placeholder="Kz"
                                        value={newEqCostPerHour}
                                        onChange={e => setNewEqCostPerHour(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="new-eq-interval" className="text-xs">Rev. a cada (h)</Label>
                                    <Input
                                        id="new-eq-interval"
                                        type="number"
                                        value={newEqMaintenanceInterval}
                                        onChange={e => setNewEqMaintenanceInterval(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsAllocateDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAllocateEquipment} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
                            Confirmar Alocação
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isUsageDialogOpen} onOpenChange={setIsUsageDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registar Utilização de {selectedEquipment?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Data do Registo</Label>
                                <DatePicker date={date} setDate={setDate} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="operator-id">Operador</Label>
                                <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
                                    <SelectTrigger id="operator-id">
                                        <SelectValue placeholder="Selecione um operador..."/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Nenhum / Sem operador</SelectItem>
                                        {projectWorkforce.map(member => (
                                            <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground block">Duração Rápida:</Label>
                            <div className="flex flex-wrap gap-1.5 pb-1">
                                {[4, 8, 10, 12].map(hrs => (
                                    <Button
                                        key={hrs}
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-7 rounded-full bg-muted/40 hover:bg-primary/10 hover:text-primary"
                                        onClick={() => {
                                            setHoursUsed(String(hrs));
                                            const globalEq = globalEquipmentList.find(eq => eq.id === selectedEquipment?.equipmentId);
                                            const baseHours = globalEq?.currentHours || 0;
                                            setHourMeterReading(String(baseHours + hrs));
                                        }}
                                    >
                                        +{hrs}h {hrs === 8 ? '(Dia Completo)' : hrs === 4 ? '(Meio Dia)' : ''}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="hours-used">Horas Utilizadas</Label>
                                <Input id="hours-used" type="number" value={hoursUsed} onChange={(e) => {
                                    const val = e.target.value;
                                    setHoursUsed(val);
                                    if (val && !isNaN(parseFloat(val))) {
                                        const globalEq = globalEquipmentList.find(eq => eq.id === selectedEquipment?.equipmentId);
                                        const baseHours = globalEq?.currentHours || 0;
                                        setHourMeterReading(String(baseHours + parseFloat(val)));
                                    }
                                }} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="hour-meter">Horímetro (Final)</Label>
                                <Input id="hour-meter" type="number" placeholder="Calculado auto" value={hourMeterReading} onChange={(e) => setHourMeterReading(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="fuel-consumed">Combustível (L)</Label>
                                <Input id="fuel-consumed" type="number" placeholder="Opcional" value={fuelConsumed} onChange={(e) => setFuelConsumed(e.target.value)} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="usage-wbs">Atividade da EAP (Opcional)</Label>
                            <Select value={selectedWbsItemId} onValueChange={setSelectedWbsItemId}>
                                <SelectTrigger id="usage-wbs">
                                    <SelectValue placeholder="Associar a uma atividade..."/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhuma / Custo Geral</SelectItem>
                                    {wbsItems.map(item => (
                                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="usage-notes">Notas (Opcional)</Label>
                            <Textarea id="usage-notes" value={notes} onChange={e => setNotes(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsUsageDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddUsageLog} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
                            Adicionar Registo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
             <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registar Manutenção/Avaria de {selectedEquipment?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                         <div className="space-y-2">
                            <Label>Data da Manutenção</Label>
                            <DatePicker date={date} setDate={setDate} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>Tipo de Manutenção</Label>
                                <Select value={maintenanceType} onValueChange={v => setMaintenanceType(v as MaintenanceType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Preventiva">Preventiva</SelectItem>
                                        <SelectItem value="Corretiva">Corretiva</SelectItem>
                                        <SelectItem value="Avaria">Avaria</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maintenance-cost">Custo Total (Kz)</Label>
                                <Input id="maintenance-cost" type="number" value={maintenanceCost} onChange={(e) => setMaintenanceCost(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maintenance-desc">Descrição do Serviço</Label>
                            <Textarea id="maintenance-desc" value={notes} onChange={e => setNotes(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                                <Label htmlFor="downtime">Tempo de Paragem (Horas)</Label>
                                <Input id="downtime" type="number" value={downtimeHours} onChange={(e) => setDowntimeHours(e.target.value)} />
                            </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsMaintenanceDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddMaintenanceRecord} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
                            Adicionar Registo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
