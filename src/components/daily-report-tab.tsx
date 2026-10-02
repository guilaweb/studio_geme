'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, Timestamp, getDoc, doc, where, getDocs, writeBatch, increment } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
    Loader2, Plus, FileUp, Camera, Trash2, Mic, Clock, Save, HelpCircle, Box, X, Printer,
    Sun, Cloud, CloudRain, CloudLightning, Sparkles, SlidersHorizontal, ChevronDown, Search, CheckCircle2, Users, BadgeCheck
} from 'lucide-react';
import { type DailyReport } from '@/types/daily-reports';
import { format, subDays } from 'date-fns';
import { compileExecutiveDailyReportPDF } from '@/lib/pdf/daily-report-rdo-pdf';
import { ExecutivePdfViewerModal } from '@/components/pdf/executive-pdf-viewer-modal';
import type { jsPDFWithAutoTable } from '@/lib/pdf/executive-pdf-engine';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { DatePicker } from '@/components/ui/date-picker';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { TimesheetEntry, ProductionEntry, WorkforceMember, ProjectWorkforceMember } from '@/types/workforce';
import type { WbsItem } from '@/types/wbs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type ProjectEquipment, type Equipment } from '@/types/equipment';
import { type InventoryItem } from '@/types/inventory';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DailyLogEntry {
    hours?: string;
    production?: string;
    wbsItemId?: string;
    unit?: string;
    equipmentId?: string;
    equipmentHours?: string;
    hourMeter?: string;
}

interface MaterialConsumptionEntry {
    inventoryItemId: string;
    quantity: string;
    wbsItemId: string | null;
}

interface DailyReportTabProps {
    projectId: string;
    userRole: UserRole | null;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};


export default function DailyReportTab({ projectId, userRole }: DailyReportTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [reports, setReports] = useState<DailyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [projectData, setProjectData] = useState<any>(null);

    // Estados do Modal de PDF Executivo
    const [viewerOpen, setViewerOpen] = useState(false);
    const [activePdfDoc, setActivePdfDoc] = useState<jsPDFWithAutoTable | null>(null);
    const [viewerTitle, setViewerTitle] = useState('');
    const [viewerFileName, setViewerFileName] = useState('');

    const handleExportRdoPDF = (report: DailyReport) => {
        const proj = projectData || { name: 'Obra Principal', id: projectId };
        const doc = compileExecutiveDailyReportPDF({
            project: proj,
            dailyReport: report,
            workforceSummary: [
                { category: 'Encarregados & Chefias', ownCount: 2, subcontractorCount: 1, totalHours: 24 },
                { category: 'Oficiais (Pedreiros, Carpinteiros, Armadores)', ownCount: report.ownManpower || 0, subcontractorCount: report.subcontractorManpower || 0, totalHours: ((report.ownManpower || 0) + (report.subcontractorManpower || 0)) * 8 }
            ],
            equipmentLogs: projectEquipment.map((e, idx) => ({
                name: e.name,
                code: `EQ-0${idx + 1}`,
                initialMeter: 120 + (idx * 15),
                finalMeter: 120 + (idx * 15) + 8,
                hoursWorked: 8,
                fuelLiters: 45,
                status: 'Em Operação'
            }))
        });

        setActivePdfDoc(doc);
        const dateStr = format(report.date, 'dd/MM/yyyy');
        setViewerTitle(`Diário de Obra Oficial (RDO) • ${dateStr}`);
        setViewerFileName(`RDO_${(proj.name || 'Obra').replace(/\s+/g, '_')}_${format(report.date, 'yyyyMMdd')}`);
        setViewerOpen(true);
    };

    // Form state for new report
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reportDate, setReportDate] = useState<Date | undefined>();
    const [weather, setWeather] = useState('');
    const [activities, setActivities] = useState('');
    const [occurrences, setOccurrences] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    
    // Efetivos rápidos de estaleiro (15 segundos)
    const [directOwnManpower, setDirectOwnManpower] = useState('6');
    const [directSubManpower, setDirectSubManpower] = useState('8');
    const [showAdvancedTables, setShowAdvancedTables] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State for workforce logs within the form
    const [projectWorkforce, setProjectWorkforce] = useState<ProjectWorkforceMember[]>([]);
    const [globalWorkforce, setGlobalWorkforce] = useState<WorkforceMember[]>([]);
    const [projectEquipment, setProjectEquipment] = useState<ProjectEquipment[]>([]);
    const [globalEquipment, setGlobalEquipment] = useState<Equipment[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [dailyLog, setDailyLog] = useState<Record<string, DailyLogEntry>>({});
    
    const [materialConsumption, setMaterialConsumption] = useState<MaterialConsumptionEntry[]>([]);
    const [newMaterialId, setNewMaterialId] = useState<string>('');
    const [newMaterialQty, setNewMaterialQty] = useState('');
    const [newMaterialWbsId, setNewMaterialWbsId] = useState<string>('none');


    // Speech recognition state
    const [listeningField, setListeningField] = useState<'activities' | 'occurrences' | null>(null);
    const recognitionRef = useRef<any>(null);
    const [isListening, setIsListening] = useState(false);
    const [speechSupport, setSpeechSupport] = useState(false);
    
    const canEdit = userRole === 'Editor' || userRole === 'Gestor' || userRole === 'Mestre de Obra';

    useEffect(() => {
        setReportDate(new Date());
    }, []);

    useEffect(() => {
        if (!projectId || !user) return;
        setLoading(true);
        const reportQuery = query(collection(db, 'projects', projectId, 'daily-reports'), orderBy('date', 'desc'));
        const workforceQuery = query(collection(db, 'projects', projectId, 'workforce'), orderBy('name', 'asc'));
        const wbsQuery = query(collection(db, 'projects', projectId, 'wbs'), orderBy('name', 'asc'));
        const globalWorkforceQuery = query(collection(db, 'workforce'), where('author.uid', '==', user.uid));
        const projectEqQuery = query(collection(db, 'projects', projectId, 'equipment'));
        const globalEqQuery = query(collection(db, 'equipment'), where('author.uid', '==', user.uid));
        const inventoryQuery = query(collection(db, 'projects', projectId, 'inventory'));

        const unsubscribes = [
            onSnapshot(reportQuery, (snapshot) => {
                const fetchedReports = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: (doc.data().date as Timestamp).toDate(),
                } as DailyReport));
                setReports(fetchedReports);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching daily reports: ", error);
                toast({ title: 'Erro ao carregar diários de obra', variant: 'destructive' });
                setLoading(false);
            }),
            onSnapshot(workforceQuery, (snapshot) => {
                setProjectWorkforce(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectWorkforceMember)));
            }),
            onSnapshot(wbsQuery, (snapshot) => {
                setWbsItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WbsItem)));
            }),
            onSnapshot(globalWorkforceQuery, (snapshot) => {
                setGlobalWorkforce(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkforceMember)));
            }),
            onSnapshot(projectEqQuery, snapshot => {
                setProjectEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectEquipment)));
            }),
            onSnapshot(globalEqQuery, snapshot => {
                setGlobalEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
            }),
            onSnapshot(inventoryQuery, (snapshot) => {
                setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
            }),
            onSnapshot(doc(db, 'projects', projectId), (snap) => {
                if (snap.exists()) {
                    setProjectData({ id: snap.id, ...snap.data() });
                }
            })
        ];

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [projectId, toast, user]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            setSpeechSupport(true);
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'pt-PT';
            recognition.interimResults = false;

            recognition.onstart = () => {
                setIsListening(true);
                toast({ title: 'A ouvir...', description: 'Pode começar a falar.'});
            };

            recognition.onend = () => {
                setIsListening(false);
                setListeningField(null);
            };
            
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (listeningField === 'activities') {
                    setActivities(prev => prev ? `${prev.trim()} ${transcript}` : transcript);
                } else if (listeningField === 'occurrences') {
                    setOccurrences(prev => prev ? `${prev.trim()} ${transcript}` : transcript);
                }
            };
            
            recognition.onerror = (event: any) => {
                let errorMessage = event.error;
                if (event.error === 'no-speech') {
                    errorMessage = 'Nenhuma fala foi detetada. Tente novamente.';
                } else if (event.error === 'not-allowed') {
                    errorMessage = 'Permissão para o microfone negada. Por favor, autorize o acesso nas definições do seu navegador.';
                }
                toast({ title: "Erro de reconhecimento de voz", description: errorMessage, variant: 'destructive'});
                setIsListening(false);
                setListeningField(null);
            };
            
            recognitionRef.current = recognition;
        }
    }, [listeningField, toast]);

    const handleListen = (field: 'activities' | 'occurrences') => {
        if (!recognitionRef.current || isListening) return;
        setListeningField(field);
        try {
            recognitionRef.current.start();
        } catch(e) {
            toast({ title: "Não foi possível iniciar o microfone", description: 'Verifique se outro programa não o está a usar.', variant: 'destructive'});
        }
    };
    
     const handleLogChange = (workforceId: string, field: keyof DailyLogEntry, value: string) => {
        setDailyLog(prev => ({
            ...prev,
            [workforceId]: {
                ...prev[workforceId],
                [field]: value
            }
        }));
    };

    const dailySummary = useMemo(() => {
        let totalHours = 0;
        let totalCost = 0;
        const totalProduction: Record<string, number> = {};

        for (const projectWorkforceId of Object.keys(dailyLog)) {
            const log = dailyLog[projectWorkforceId];
            const hours = parseFloat(log.hours || '0');
            const quantity = parseFloat(log.production || '0');
            
            if (hours > 0 || quantity > 0) {
                const projectMember = projectWorkforce.find(m => m.id === projectWorkforceId);
                if (!projectMember) continue;
                const globalMember = globalWorkforce.find(m => m.id === projectMember.workforceId);
                if (!globalMember) continue;

                totalHours += hours;
                totalCost += (globalMember.costPerHour || 0) * hours;
                totalCost += (globalMember.costPerUnit || 0) * quantity;
                
                if (quantity > 0 && log.unit) {
                    totalProduction[log.unit] = (totalProduction[log.unit] || 0) + quantity;
                }
            }
            
            const eqHours = parseFloat(log.equipmentHours || '0');
            if (eqHours > 0 && log.equipmentId) {
                const projEq = projectEquipment.find(pe => pe.id === log.equipmentId);
                if (projEq) {
                    const globEq = globalEquipment.find(ge => ge.id === projEq.equipmentId);
                    if (globEq) {
                        totalCost += (globEq.operationalCostPerHour || 0) * eqHours;
                    }
                }
            }
        }
        
        for (const consumption of materialConsumption) {
            const item = inventory.find(i => i.id === consumption.inventoryItemId);
            if (item) {
                totalCost += (item.unitCost || 0) * parseFloat(consumption.quantity || '0');
            }
        }

        return { totalHours, totalCost, totalProduction };
    }, [dailyLog, materialConsumption, projectWorkforce, globalWorkforce, projectEquipment, globalEquipment, inventory]);

    const filteredReports = useMemo(() => {
        if (!searchTerm.trim()) return reports;
        const term = searchTerm.toLowerCase();
        return reports.filter(r => 
            (r.activities && r.activities.toLowerCase().includes(term)) ||
            (r.weather && r.weather.toLowerCase().includes(term)) ||
            (r.occurrences && r.occurrences.toLowerCase().includes(term)) ||
            format(r.date, 'dd/MM/yyyy').includes(term)
        );
    }, [reports, searchTerm]);

    const avgManpower = useMemo(() => {
        if (reports.length === 0) return 0;
        const total = reports.reduce((sum, r) => sum + (r.ownManpower || 0) + (r.subcontractorManpower || 0), 0);
        return Math.round(total / reports.length);
    }, [reports]);


    const resetForm = () => {
        setReportDate(new Date());
        setWeather('');
        setActivities('');
        setOccurrences('');
        setPhotos([]);
        setDailyLog({});
        setMaterialConsumption([]);
        setDirectOwnManpower('6');
        setDirectSubManpower('8');
        setShowAdvancedTables(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsDialogOpen(false);
    };
    
    const sendWebhookNotification = async (newReport: Omit<DailyReport, 'id' | 'createdAt'>, projectName: string, webhookUrl: string) => {
        try {
            const payload = {
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "themeColor": "0076D7",
                "summary": `Novo Diário de Obra submetido para ${projectName}`,
                "sections": [{
                    "activityTitle": `Novo Diário de Obra em **${projectName}**`,
                    "activitySubtitle": `Submetido por ${newReport.author.displayName} em ${format(newReport.date, 'dd/MM/yyyy')}`,
                    "facts": [{
                        "name": "Clima",
                        "value": newReport.weather
                    }, {
                        "name": "Atividades Principais",
                        "value": newReport.activities.substring(0, 150) + '...'
                    }],
                    "markdown": true
                }]
            };

            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        } catch (error) {
            console.error("Failed to send webhook notification:", error);
        }
    };


    const handleSubmitReport = async () => {
        if (!canEdit || !user) return;
        if (!reportDate || !weather || !activities) {
            toast({ title: 'Campos obrigatórios em falta', description: 'Data, clima e atividades são obrigatórios.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            
            const photoUrls: { url: string; name: string }[] = [];
            for (const photo of photos) {
                const photoId = uuidv4();
                const storagePath = `projects/${projectId}/daily-reports/${format(reportDate, 'yyyy-MM-dd')}/${photoId}-${photo.name}`;
                const storageRef = ref(storage, storagePath);
                const uploadTask = await uploadBytesResumable(storageRef, photo);
                const downloadURL = await getDownloadURL(uploadTask.ref);
                photoUrls.push({ url: downloadURL, name: photo.name });
            }

            const reportDocRef = doc(collection(db, 'projects', projectId, 'daily-reports'));
            let ownManpowerCount = 0;
            let subcontractorManpowerCount = 0;
            
            const presentWorkforceIds = Object.keys(dailyLog).filter(id => parseFloat(dailyLog[id].hours || '0') > 0 || parseFloat(dailyLog[id].production || '0') > 0 || parseFloat(dailyLog[id].equipmentHours || '0') > 0);
            
            for (const projectWorkforceId of presentWorkforceIds) {
                 const logEntry = dailyLog[projectWorkforceId];
                const workforceMember = projectWorkforce.find(m => m.id === projectWorkforceId);
                const globalWorkforceMember = globalWorkforce.find(m => m.id === workforceMember?.workforceId);
                const wbsItemId = (logEntry.wbsItemId && logEntry.wbsItemId !== 'none') ? logEntry.wbsItemId : null;
                const wbsItem = wbsItems.find(item => item.id === wbsItemId);

                if (!workforceMember || !globalWorkforceMember) continue;

                if (globalWorkforceMember.employmentType === 'Efetivo') ownManpowerCount++;
                else subcontractorManpowerCount++;

                const hours = parseFloat(logEntry.hours || '0');
                if (hours > 0) {
                    const laborCost = (globalWorkforceMember.costPerHour || 0) * hours;
                    const timesheetRef = doc(collection(db, 'projects', projectId, 'timesheets'));
                    batch.set(timesheetRef, {
                        date: reportDate,
                        workforceId: workforceMember.workforceId,
                        workforceName: workforceMember.name,
                        wbsItemId: wbsItemId,
                        wbsItemName: wbsItem?.name || '',
                        hours: hours,
                        cost: laborCost,
                        author: { uid: user.uid, displayName: user.displayName || user.email },
                        dailyReportId: reportDocRef.id,
                    });

                    if (laborCost > 0) {
                        const transactionRef = doc(collection(db, 'projects', projectId, 'transactions'));
                        batch.set(transactionRef, {
                            description: `Mão de obra: ${workforceMember.name} em ${wbsItem?.name || 'Não especificado'}`,
                            amount: laborCost, date: reportDate, type: 'Despesa', status: 'Pago',
                            accountId: 'manpower', accountName: 'Mão de Obra', wbsItemId: wbsItemId,
                            wbsItemName: wbsItem?.name || '',
                        });
                    }
                }
                
                const quantity = parseFloat(logEntry.production || '0');
                if (quantity > 0 && wbsItemId && logEntry.unit) {
                    const productionCost = (globalWorkforceMember.costPerUnit || 0) * quantity;
                    const productionRef = doc(collection(db, 'projects', projectId, 'productionEntries'));
                    batch.set(productionRef, {
                        date: reportDate, workforceId: workforceMember.workforceId, workforceName: workforceMember.name,
                        wbsItemId: wbsItemId, wbsItemName: wbsItem?.name || '',
                        quantity: quantity, unit: logEntry.unit, author: { uid: user.uid, displayName: user.displayName || user.email },
                        dailyReportId: reportDocRef.id,
                    });
                    
                    if (productionCost > 0) {
                        const transactionRef = doc(collection(db, 'projects', projectId, 'transactions'));
                        batch.set(transactionRef, {
                            description: `Produção: ${workforceMember.name} em ${wbsItem?.name || 'Não especificado'}`, amount: productionCost, 
                            date: reportDate, type: 'Despesa', status: 'Pendente', accountId: 'production-manpower',
                            accountName: 'Mão de Obra (Produção)', wbsItemId: wbsItemId, wbsItemName: wbsItem?.name || '',
                        });
                    }
                }
                
                const equipmentId = logEntry.equipmentId;
                const equipmentHours = parseFloat(logEntry.equipmentHours || '0');
                const hourMeter = parseFloat(logEntry.hourMeter || '0');

                if (equipmentId && equipmentId !== 'none' && equipmentHours > 0) {
                    const projEq = projectEquipment.find(pe => pe.id === equipmentId);
                    if (projEq) {
                        const globEq = globalEquipment.find(ge => ge.id === projEq.equipmentId);
                        if (globEq) {
                            const usageLogRef = doc(collection(db, `projects/${projectId}/equipment/${projEq.id}/usageLogs`));
                            batch.set(usageLogRef, {
                                date: reportDate,
                                hoursUsed: equipmentHours,
                                hourMeterReading: hourMeter > 0 ? hourMeter : null,
                                notes: `Registo via Diário de Obra. Tarefa: ${wbsItem?.name || 'N/A'}.`,
                                wbsItemId: wbsItemId,
                                operatorId: workforceMember.workforceId,
                                operatorName: workforceMember.name,
                                author: { uid: user.uid, displayName: user.displayName },
                                dailyReportId: reportDocRef.id,
                            });
                            
                            const operationalCost = globEq.operationalCostPerHour || 0;
                            const totalEquipmentCost = equipmentHours * operationalCost;
                            if (totalEquipmentCost > 0) {
                                const eqTransactionRef = doc(collection(db, 'projects', projectId, 'transactions'));
                                batch.set(eqTransactionRef, {
                                    description: `Custo operacional: ${projEq.name} (Op: ${workforceMember.name})`,
                                    amount: totalEquipmentCost,
                                    date: reportDate,
                                    type: 'Despesa',
                                    status: 'Pago',
                                    accountId: 'equipment-costs',
                                    accountName: 'Custos de Equipamentos',
                                    wbsItemId: wbsItemId,
                                    wbsItemName: wbsItem?.name || '',
                                });
                            }
                            
                            if (hourMeter > 0) {
                                const globalEqRef = doc(db, 'equipment', globEq.id);
                                batch.update(globalEqRef, { currentHours: hourMeter });
                            }
                        }
                    }
                }
            }

            // Se não preencheu a tabela nominal, utilizar os efetivos informados diretamente no cabeçalho
            if (presentWorkforceIds.length === 0) {
                ownManpowerCount = parseInt(directOwnManpower) || 0;
                subcontractorManpowerCount = parseInt(directSubManpower) || 0;
            }

            for (const consumption of materialConsumption) {
                const qty = parseFloat(consumption.quantity);
                const item = inventory.find(i => i.id === consumption.inventoryItemId);
                if (!item || isNaN(qty) || qty <= 0) continue;

                if (qty > item.quantity) {
                    toast({
                        title: 'Stock Insuficiente',
                        description: `Stock insuficiente para ${item.name}. Pedido: ${qty}, Disponível: ${item.quantity}.`,
                        variant: 'destructive',
                    });
                    setIsSubmitting(false);
                    return;
                }

                const itemRef = doc(db, 'projects', projectId, 'inventory', item.id);
                batch.update(itemRef, { quantity: increment(-qty) });

                const movementRef = doc(collection(itemRef, 'movements'));
                batch.set(movementRef, {
                    type: 'Saída', quantity: qty, reason: 'Consumo via Diário de Obra',
                    wbsItemId: consumption.wbsItemId, date: reportDate,
                    author: { uid: user.uid, displayName: user.displayName }
                });

                const cost = qty * item.unitCost;
                if (cost > 0) {
                    const transactionRef = doc(collection(db, 'projects', projectId, 'transactions'));
                    const wbsItem = wbsItems.find(w => w.id === consumption.wbsItemId);
                    batch.set(transactionRef, {
                        description: `Consumo: ${qty} ${item.unit} de ${item.name}`, amount: cost, date: reportDate,
                        type: 'Despesa', status: 'Pago', accountId: 'material-consumption', accountName: 'Consumo de Materiais',
                        wbsItemId: consumption.wbsItemId, wbsItemName: wbsItem?.name || ''
                    });
                }

                const newQuantity = item.quantity - qty;
                if ((item.minStockLevel || 0) > 0 && newQuantity < (item.minStockLevel || 0)) {
                    const purchaseRequestRef = doc(collection(db, 'projects', projectId, 'purchaseRequests'));
                     batch.set(purchaseRequestRef, {
                        description: `Pedido Automático: Stock Baixo de ${item.name}`,
                        items: [{ id: item.id, name: item.name, quantity: item.reorderQuantity || 5, unit: item.unit }],
                        status: 'Pendente', supplierIds: [], wbsItemId: null,
                        author: { uid: 'system', displayName: 'Sistema Automático' },
                        createdAt: serverTimestamp(),
                    });
                }
            }


            const newReportData = {
                date: reportDate, weather: weather, ownManpower: ownManpowerCount, subcontractorManpower: subcontractorManpowerCount,
                activities: activities, occurrences: occurrences, photoUrls: photoUrls,
                author: { uid: user.uid, displayName: user.displayName || user.email },
                createdAt: serverTimestamp(),
            };
            
            batch.set(reportDocRef, newReportData);
            
            await batch.commit();
            
            toast({ title: 'Diário de Obra salvo com sucesso!' });
            
            const projectRef = doc(db, 'projects', projectId);
            const projectSnap = await getDoc(projectRef);
            if (projectSnap.exists() && projectSnap.data().webhookUrl) {
                const webhookUrl = projectSnap.data().webhookUrl;
                const projectName = projectSnap.data().name;
                await sendWebhookNotification(newReportData as any, projectName, webhookUrl);
            }

            resetForm();

        } catch (error: any) {
            console.error("Error submitting daily report:", error);
            toast({ title: 'Erro ao salvar relatório', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddMaterialConsumption = () => {
        if (!newMaterialId || !newMaterialQty) {
            toast({ title: "Selecione um material e insira a quantidade.", variant: "destructive" });
            return;
        }
        setMaterialConsumption(prev => [
            ...prev,
            { inventoryItemId: newMaterialId, quantity: newMaterialQty, wbsItemId: newMaterialWbsId === 'none' ? null : newMaterialWbsId }
        ]);
        setNewMaterialId('');
        setNewMaterialQty('');
        setNewMaterialWbsId('none');
    };

    const handleRemoveMaterialConsumption = (index: number) => {
        setMaterialConsumption(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="p-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <span>Diário de Obra (RDO)</span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">Registe o progresso diário, mão de obra e ocorrências probatórias com emissão de RDO oficial em PDF com hash SHA-256.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </CardTitle>
                            <CardDescription>Registo probatório diário de atividades, efetivos e ocorrências no estaleiro.</CardDescription>
                        </div>
                        {canEdit && (
                            <DialogTrigger asChild>
                                <Button className="bg-primary text-primary-foreground font-semibold text-xs shadow-sm gap-1.5">
                                    <Plus className="h-4 w-4"/> Criar Novo RDO (15s)
                                </Button>
                            </DialogTrigger>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Indicadores Executivos do Diário */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50">
                                <span className="text-[11px] text-muted-foreground font-medium">Total de Registos</span>
                                <div className="text-2xl font-bold text-foreground mt-0.5">{reports.length}</div>
                                <span className="text-[10px] text-muted-foreground">RDOs arquivados</span>
                            </div>
                            <div className="p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50">
                                <span className="text-[11px] text-muted-foreground font-medium">Último Registo</span>
                                <div className="text-sm font-bold text-foreground mt-1">
                                    {reports[0] ? format(reports[0].date, 'dd/MM/yyyy') : 'Sem registos'}
                                </div>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                    {reports[0] ? `${(reports[0].ownManpower || 0) + (reports[0].subcontractorManpower || 0)} trabalhadores` : 'Aguardando registo'}
                                </span>
                            </div>
                            <div className="p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50">
                                <span className="text-[11px] text-muted-foreground font-medium">Efetivo Médio</span>
                                <div className="text-2xl font-bold text-foreground mt-0.5">{avgManpower}</div>
                                <span className="text-[10px] text-muted-foreground">Trabalhadores / dia</span>
                            </div>
                            <div className="p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50">
                                <span className="text-[11px] text-muted-foreground font-medium">Certificação Oficial</span>
                                <div className="text-sm font-bold text-blue-700 dark:text-blue-400 mt-1 flex items-center gap-1">
                                    <BadgeCheck className="h-4 w-4" /> SHA-256 Probatório
                                </div>
                                <span className="text-[10px] text-muted-foreground">Pronto para Fiscalização</span>
                            </div>
                        </div>

                        {/* Barra de Pesquisa Rápida */}
                        {reports.length > 0 && (
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Pesquisar por atividade, clima ou data..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-8 h-8 text-xs max-w-sm"
                                />
                            </div>
                        )}

                        {loading ? (
                            <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin mr-2"/> Carregando relatórios...</div>
                        ) : filteredReports.length === 0 ? (
                            <div className="text-center text-muted-foreground p-8 border rounded-xl bg-muted/20">
                                <p className="text-sm font-medium">
                                    {searchTerm ? 'Nenhum diário encontrado para a pesquisa.' : 'Nenhum diário de obra foi criado ainda.'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {searchTerm ? 'Tente outros termos de busca.' : 'Clique em "Criar Novo RDO" para registar o dia de trabalho.'}
                                </p>
                            </div>
                        ) : (
                            <Accordion type="single" collapsible className="w-full">
                                {filteredReports.map(report => (
                                    <AccordionItem value={report.id} key={report.id} className="border rounded-xl mb-2 px-3">
                                        <AccordionTrigger className="hover:no-underline py-3">
                                            <div className="flex justify-between items-center w-full pr-4 text-left">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-sm text-foreground">{format(report.date, 'dd/MM/yyyy')}</span>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium hidden sm:inline">
                                                        {report.weather}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground font-medium">
                                                    <span className="text-foreground font-semibold">{(report.ownManpower || 0) + (report.subcontractorManpower || 0)}</span> trabalhadores
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 space-y-4 pt-1 border-t">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-muted/30 p-2.5 rounded-lg">
                                                <div>
                                                    <span className="text-muted-foreground">Mão de Obra Própria:</span>
                                                    <div className="font-bold text-foreground mt-0.5">{report.ownManpower || 0} operários</div>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Subempreiteiros:</span>
                                                    <div className="font-bold text-foreground mt-0.5">{report.subcontractorManpower || 0} operários</div>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Responsável pelo Registo:</span>
                                                    <div className="font-semibold text-foreground mt-0.5">{report.author.displayName || 'Engenheiro'}</div>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-xs font-bold text-foreground">Atividades Executadas</h4>
                                                <p className="text-xs whitespace-pre-wrap text-muted-foreground mt-1 leading-relaxed">{report.activities}</p>
                                            </div>

                                            {report.occurrences && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400">Ocorrências / Observações</h4>
                                                    <p className="text-xs whitespace-pre-wrap text-muted-foreground mt-1 leading-relaxed">{report.occurrences}</p>
                                                </div>
                                            )}

                                            {report.photoUrls && report.photoUrls.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-foreground">Evidências Fotográficas ({report.photoUrls.length})</h4>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {report.photoUrls.map((photo, index) => (
                                                            <a href={photo.url} key={index} target="_blank" rel="noopener noreferrer">
                                                                <Image src={photo.url} alt={photo.name} width={128} height={128} className="object-cover rounded-lg aspect-square hover:opacity-80 transition-opacity border" priority={false}/>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="pt-3 border-t flex justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleExportRdoPDF(report)}
                                                    className="text-xs font-semibold gap-2 border-slate-300 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                                                >
                                                    <Printer className="w-3.5 h-3.5" />
                                                    Emitir RDO Oficial em PDF (SHA-256)
                                                </Button>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>

                 <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
                    <DialogHeader className="pb-2 border-b">
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Registo Rápido de Diário de Obra (RDO)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            “Complexidade nos bastidores. Simplicidade na operação.”
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 space-y-4">
                        {/* 1. DATA E CONDIÇÕES METEOROLÓGICAS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Data do Relatório *</Label>
                                <DatePicker date={reportDate} setDate={setReportDate} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Condições Meteorológicas *</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { label: '☀️ Bom Tempo', val: 'Bom tempo, ensolarado' },
                                        { label: '⛅ Nublado', val: 'Nublado, sem chuva' },
                                        { label: '🌧️ Chuva Fraca', val: 'Chuva fraca, trabalhos mantidos' },
                                        { label: '⛈️ Chuva Forte (Paragem)', val: 'Chuva forte, paragem parcial/total' }
                                    ].map(w => (
                                        <button
                                            key={w.label}
                                            type="button"
                                            onClick={() => setWeather(w.val)}
                                            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                                                weather === w.val
                                                    ? 'border-primary bg-primary/10 text-primary font-bold'
                                                    : 'border-slate-200 dark:border-slate-800 hover:bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {w.label}
                                        </button>
                                    ))}
                                </div>
                                <Input 
                                    id="weather" 
                                    placeholder="Ou digite: ex: Ensolarado, ventos moderados..." 
                                    value={weather} 
                                    onChange={e => setWeather(e.target.value)} 
                                    className="h-8 text-xs mt-1" 
                                />
                            </div>
                        </div>

                        {/* 2. EFETIVOS PRESENTES NO ESTALEIRO */}
                        <div className="p-3.5 bg-muted/40 rounded-xl border space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Users className="h-4 w-4 text-primary" />
                                    Efetivos Presentes no Estaleiro
                                </span>
                                <span className="text-[11px] text-muted-foreground">Apontamento Imediato</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-[11px] font-semibold">Pessoal Próprio (Efetivos)</Label>
                                    <Input
                                        type="number"
                                        value={directOwnManpower}
                                        onChange={e => setDirectOwnManpower(e.target.value)}
                                        className="h-8 text-xs font-mono font-bold mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[11px] font-semibold">Subempreiteiros (Subc.)</Label>
                                    <Input
                                        type="number"
                                        value={directSubManpower}
                                        onChange={e => setDirectSubManpower(e.target.value)}
                                        className="h-8 text-xs font-mono font-bold mt-1"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. ATIVIDADES EXECUTADAS COM INSERÇÃO RÁPIDA */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="activities" className="text-xs font-bold">Atividades Executadas no Dia *</Label>
                                <span className="text-[11px] text-muted-foreground">Clique para adicionar</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-1">
                                {[
                                    '+ Betonagem & Cofragem',
                                    '+ Alvenarias & Reboco',
                                    '+ Pintura & Acabamentos',
                                    '+ Movimento de Terras',
                                    '+ Instalações Técnicas',
                                    '+ Limpeza & Estaleiro'
                                ].map(tag => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => setActivities(prev => prev ? `${prev}\n• ${tag.replace('+ ', '')}` : `• ${tag.replace('+ ', '')}`)}
                                        className="text-[11px] px-2.5 py-0.5 rounded-full border bg-background hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground font-medium"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <Textarea
                                    id="activities"
                                    placeholder="Descreva as principais atividades desenvolvidas pelas frentes de trabalho..."
                                    value={activities}
                                    onChange={e => setActivities(e.target.value)}
                                    rows={4}
                                    disabled={isSubmitting}
                                    className="text-xs leading-relaxed"
                                />
                                {speechSupport && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleListen('activities')}
                                        disabled={isSubmitting || isListening}
                                        className={cn("absolute bottom-2 right-2 h-7 w-7", isListening && listeningField === 'activities' && "text-red-500 animate-pulse")}
                                        aria-label="Ditar atividades"
                                    >
                                        <Mic className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* 4. OCORRÊNCIAS E OBSERVAÇÕES */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="occurrences" className="text-xs font-bold">Ocorrências, Visitas & Imprevistos (Opcional)</Label>
                                <button
                                    type="button"
                                    onClick={() => setOccurrences('Trabalhos decorreram dentro da normalidade, sem acidentes nem paragens.')}
                                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                                >
                                    ✓ Sem Anomalias
                                </button>
                            </div>
                            <div className="relative">
                                <Textarea
                                    id="occurrences"
                                    placeholder="Algum problema, visita da fiscalização, corte de energia ou paragem?"
                                    value={occurrences}
                                    onChange={e => setOccurrences(e.target.value)}
                                    rows={2}
                                    disabled={isSubmitting}
                                    className="text-xs"
                                />
                                {speechSupport && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleListen('occurrences')}
                                        disabled={isSubmitting || isListening}
                                        className={cn("absolute bottom-2 right-2 h-7 w-7", isListening && listeningField === 'occurrences' && "text-red-500 animate-pulse")}
                                        aria-label="Ditar ocorrências"
                                    >
                                        <Mic className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* 5. FOTOGRAFIAS DO DIA */}
                        <div className="space-y-2 p-3 rounded-xl border bg-muted/20">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold">Evidências Fotográficas</Label>
                                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 text-xs gap-1.5">
                                    <Camera className="h-3.5 w-3.5"/> Carregar Fotos
                                </Button>
                                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handlePhotoSelect} />
                            </div>
                            {photos.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {photos.map((photo, index) => (
                                        <div key={index} className="relative w-20 h-20">
                                            <Image src={URL.createObjectURL(photo)} alt={photo.name} fill className="object-cover rounded-lg border" />
                                            <Button size="icon" variant="destructive" className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full" onClick={() => removePhoto(index)}>
                                                <Trash2 className="h-3 w-3"/>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 6. APONTAMENTOS AVANÇADOS NOMINAIS (RECOLHIDOS) */}
                        <Collapsible open={showAdvancedTables} onOpenChange={setShowAdvancedTables} className="border rounded-xl p-3 bg-card">
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <SlidersHorizontal className="h-3.5 w-3.5" />
                                        ⚙ Apontamento Detalhado por Trabalhador, Horímetro & Materiais (Opcional)
                                    </span>
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvancedTables ? 'rotate-180' : ''}`} />
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-3 space-y-4">
                                <div className="space-y-2">
                                    <h3 className="font-semibold">Apontamentos de Mão de Obra e Equipamentos</h3>
                                    {projectWorkforce.length === 0 ? (
                                        <div className="h-24 text-center content-center text-muted-foreground">Nenhum funcionário alocado a este projeto.</div>
                                    ) : (
                                        <>
                                            <ScrollArea className="w-full border rounded-md hidden md:block">
                                                <div className="whitespace-nowrap">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="min-w-[200px] sticky left-0 bg-background z-10">Funcionário</TableHead>
                                                                <TableHead className="min-w-[250px]">Atividade (EAP)</TableHead>
                                                                <TableHead className="min-w-[120px]">Horas M.O.</TableHead>
                                                                <TableHead className="min-w-[120px]">Produção</TableHead>
                                                                <TableHead className="min-w-[100px]">Unidade</TableHead>
                                                                <TableHead className="min-w-[250px]">Equipamento</TableHead>
                                                                <TableHead className="min-w-[120px]">Horas Equip.</TableHead>
                                                                <TableHead className="min-w-[120px]">Horímetro</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {projectWorkforce.map(member => (
                                                                <TableRow key={`desktop-${member.id}`}>
                                                                    <TableCell className="font-medium sticky left-0 bg-background z-10">{member.name}</TableCell>
                                                                    <TableCell>
                                                                        <Select value={dailyLog[member.id]?.wbsItemId || 'none'} onValueChange={(value) => handleLogChange(member.id, 'wbsItemId', value)} disabled={!canEdit}>
                                                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="none">Nenhuma</SelectItem>
                                                                                {wbsItems.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </TableCell>
                                                                    <TableCell><Input type="number" placeholder="8" value={dailyLog[member.id]?.hours || ''} onChange={(e) => handleLogChange(member.id, 'hours', e.target.value)} disabled={!canEdit} /></TableCell>
                                                                    <TableCell><Input type="number" placeholder="10.5" value={dailyLog[member.id]?.production || ''} onChange={(e) => handleLogChange(member.id, 'production', e.target.value)} disabled={!canEdit} /></TableCell>
                                                                    <TableCell><Input placeholder="m²" value={dailyLog[member.id]?.unit || ''} onChange={(e) => handleLogChange(member.id, 'unit', e.target.value)} disabled={!canEdit} /></TableCell>
                                                                    <TableCell>
                                                                        <Select value={dailyLog[member.id]?.equipmentId || 'none'} onValueChange={(value) => handleLogChange(member.id, 'equipmentId', value)} disabled={!canEdit}>
                                                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="none">Nenhum</SelectItem>
                                                                                {projectEquipment.map(eq => <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>)}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </TableCell>
                                                                    <TableCell><Input type="number" value={dailyLog[member.id]?.equipmentHours || ''} onChange={(e) => handleLogChange(member.id, 'equipmentHours', e.target.value)} disabled={!canEdit} /></TableCell>
                                                                    <TableCell><Input type="number" value={dailyLog[member.id]?.hourMeter || ''} onChange={(e) => handleLogChange(member.id, 'hourMeter', e.target.value)} disabled={!canEdit} /></TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                                <ScrollBar orientation="horizontal" />
                                            </ScrollArea>
                                        </>
                                    )}
                                </div>
                                <div className="space-y-4 pt-4 border-t">
                                    <h3 className="font-semibold">Apontamentos de Materiais</h3>
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Quantidade</TableHead><TableHead>Atividade (EAP)</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {materialConsumption.map((entry, index) => {
                                                    const item = inventory.find(i => i.id === entry.inventoryItemId);
                                                    const wbsItem = wbsItems.find(w => w.id === entry.wbsItemId);
                                                    return (
                                                        <TableRow key={index}>
                                                            <TableCell>{item?.name}</TableCell>
                                                            <TableCell>{entry.quantity} {item?.unit}</TableCell>
                                                            <TableCell>{wbsItem?.name || 'Geral'}</TableCell>
                                                            <TableCell>
                                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveMaterialConsumption(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                                {materialConsumption.length === 0 && <TableRow><TableCell colSpan={4} className="h-20 text-center text-muted-foreground">Nenhum material consumido.</TableCell></TableRow>}
                                            </TableBody>
                                        </Table>
                                        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_1fr_auto] gap-2 items-end p-2 border-t bg-secondary/50">
                                             <div className="space-y-1">
                                                <Label className="text-xs">Material</Label>
                                                <Select value={newMaterialId} onValueChange={setNewMaterialId}><SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent>{inventory.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</SelectItem>)}</SelectContent></Select>
                                            </div>
                                             <div className="space-y-1">
                                                <Label className="text-xs">Quantidade</Label>
                                                <Input type="number" placeholder="0" value={newMaterialQty} onChange={e => setNewMaterialQty(e.target.value)}/>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Atividade (EAP)</Label>
                                                <Select value={newMaterialWbsId} onValueChange={setNewMaterialWbsId}><SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent><SelectItem value="none">Custo Geral</SelectItem>{wbsItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select>
                                            </div>
                                            <Button onClick={handleAddMaterialConsumption}>Adicionar</Button>
                                        </div>
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                    <DialogFooter className="bg-muted/50 p-4 rounded-b-lg flex flex-col md:flex-row justify-between items-center gap-4">
                         <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Horas M.O.</p>
                                <p className="text-lg font-bold">{dailySummary.totalHours.toFixed(2)}h</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Custo Total do Dia</p>
                                <p className="text-lg font-bold">{formatCurrency(dailySummary.totalCost)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Produção do Dia</p>
                                <p className="text-sm font-semibold">
                                    {Object.entries(dailySummary.totalProduction).length > 0 
                                     ? Object.entries(dailySummary.totalProduction).map(([unit, qty]) => `${qty.toFixed(2)} ${unit}`).join('; ')
                                     : 'Nenhuma'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                            <Button onClick={handleSubmitReport} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                                Salvar Relatório
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Dedicado de Visualização e Impressão de Alta Fidelidade do RDO */}
            <ExecutivePdfViewerModal
                open={viewerOpen}
                onOpenChange={setViewerOpen}
                pdfDoc={activePdfDoc}
                title={viewerTitle}
                fileName={viewerFileName}
                documentType="DIÁRIO OFICIAL PROBATÓRIO DE OCORRÊNCIAS"
            />
        </div>
    );
}