'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, serverTimestamp, addDoc, doc, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, KeyRound, Loader2, FileText, Download, Archive, X, CheckCircle, XCircle, MinusCircle, AlertTriangle, PenLine, RefreshCcw, Save, HelpCircle } from 'lucide-react';
import type { Inspection, InspectionStatus, Warranty, ChecklistItem, ChecklistItemStatus, DigitalSignature } from '@/types/post-construction';
import type { Project } from '@/types/project';
import { type Supplier } from '@/types/suppliers';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DatePicker } from './ui/date-picker';
import { format, differenceInDays, addYears } from 'date-fns';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { generateHandoverReport } from '@/lib/handover-report-generator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { type ProjectFile } from '@/types/documents';
import { Checkbox } from './ui/checkbox';
import { generateHandoverPackage } from '@/lib/handover-package-generator';
import { Timestamp } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { cn } from '@/lib/utils';
import type { UserRole, TeamMember } from '@/app/projects/[id]/page';
import { Textarea } from './ui/textarea';
import SignatureCanvas from 'react-signature-canvas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type AnnotationType = string;
type AnnotationPriority = 'Baixa' | 'Média' | 'Alta';

interface PostConstructionTabProps {
    projectId: string;
    project: Project;
    userRole: UserRole | null;
    teamMembers: TeamMember[];
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

const getChecklistStatusIcon = (status: ChecklistItemStatus) => {
    switch (status) {
        case 'Conforme': return <CheckCircle className="h-4 w-4 text-green-600" />;
        case 'Não Conforme': return <XCircle className="h-4 w-4 text-red-600" />;
        case 'Não Aplicável': return <MinusCircle className="h-4 w-4 text-gray-400" />;
        default: return null;
    }
};

const SignaturePad = ({ title, onSave, signatureUrl }: { title: string; onSave: (dataUrl: string) => void; signatureUrl?: string }) => {
    const sigPadRef = useRef<SignatureCanvas | null>(null);

    const clear = () => {
        sigPadRef.current?.clear();
    };

    const save = () => {
        if (sigPadRef.current) {
            onSave(sigPadRef.current.toDataURL());
        }
    };

    return (
        <div className="space-y-2">
            <h5 className="font-medium text-sm">{title}</h5>
            {signatureUrl ? (
                <div className="border rounded-md p-2 bg-secondary flex justify-center">
                    <img src={signatureUrl} alt={`Assinatura de ${title}`} className="h-24 w-auto" />
                </div>
            ) : (
                <>
                    <div className="border rounded-md bg-white">
                        <SignatureCanvas
                            ref={sigPadRef}
                            penColor='black'
                            canvasProps={{ className: 'w-full h-28' }}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={clear}><RefreshCcw className="mr-2 h-3 w-3"/>Limpar</Button>
                        <Button size="sm" onClick={save}><Save className="mr-2 h-3 w-3"/>Guardar Assinatura</Button>
                    </div>
                </>
            )}
        </div>
    );
};


export default function PostConstructionTab({ projectId, project, userRole, teamMembers }: PostConstructionTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Gestor' || userRole === 'Editor';
    
    // Inspections State
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [loadingInspections, setLoadingInspections] = useState(true);
    const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false);
    const [isSubmittingInspection, setIsSubmittingInspection] = useState(false);
    const [unitIdentifier, setUnitIdentifier] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [inspectionDate, setInspectionDate] = useState<Date | undefined>(new Date());
    
    // Warranties State
    const [warranties, setWarranties] = useState<Warranty[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loadingWarranties, setLoadingWarranties] = useState(true);
    const [isWarrantyDialogOpen, setIsWarrantyDialogOpen] = useState(false);
    const [isSubmittingWarranty, setIsSubmittingWarranty] = useState(false);
    const warrantyFileInputRef = useRef<HTMLInputElement>(null);

    // Warranty Form State
    const [itemDescription, setItemDescription] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [startDate, setStartDate] = useState<Date|undefined>(new Date());
    const [durationYears, setDurationYears] = useState('1');
    const [warrantyFile, setWarrantyFile] = useState<File | null>(null);

    // Archive State
    const [documents, setDocuments] = useState<ProjectFile[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [selectedDocIds, setSelectedDocIds] = useState<Record<string, boolean>>({});
    
    // Checklist State
    const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
    const [selectedInspectionForChecklist, setSelectedInspectionForChecklist] = useState<Inspection | null>(null);
    const [availableFvs, setAvailableFvs] = useState<ProjectFile[]>([]);
    const [selectedFvs, setSelectedFvs] = useState<ProjectFile | null>(null);
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
    const [isSubmittingChecklist, setIsSubmittingChecklist] = useState(false);
    const [checklistCreationMode, setChecklistCreationMode] = useState<'template' | 'manual'>('template');
    const [newChecklistName, setNewChecklistName] = useState('');
    const [newItemText, setNewItemText] = useState('');

     // State for creating a pendencia from a checklist item
    const [isPendenciaDialogOpen, setIsPendenciaDialogOpen] = useState(false);
    const [isSubmittingPendencia, setIsSubmittingPendencia] = useState(false);
    const [pendenciaText, setPendenciaText] = useState('');
    const [pendenciaType, setPendenciaType] = useState<AnnotationType>('Acabamento');
    const [pendenciaPriority, setPendenciaPriority] = useState<AnnotationPriority>('Média');
    const [pendenciaAssignee, setPendenciaAssignee] = useState<string>('unassigned');

    // Fetch Inspections
    useEffect(() => {
        if (!projectId) return;

        setLoadingInspections(true);
        const q = query(collection(db, 'projects', projectId, 'inspections'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedInspections = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as any).toDate(),
            } as Inspection));
            setInspections(fetchedInspections);
            setLoadingInspections(false);
        }, (error) => {
            console.error("Error fetching inspections:", error);
            setLoadingInspections(false);
        });

        return () => unsubscribe();
    }, [projectId]);

    // Fetch Warranties & Suppliers
     useEffect(() => {
        if (!projectId) return;
        setLoadingWarranties(true);

        const unsubWarranties = onSnapshot(query(collection(db, 'projects', projectId, 'warranties'), orderBy('endDate', 'asc')), (snapshot) => {
            const fetchedData = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data(),
                startDate: (doc.data().startDate as any).toDate(),
                endDate: (doc.data().endDate as any).toDate(),
            } as Warranty));
            setWarranties(fetchedData);
        }, (error) => { console.error("Error fetching warranties:", error); });
        
        const unsubSuppliers = onSnapshot(query(collection(db, 'projects', projectId, 'suppliers'), orderBy('name', 'asc')), (snapshot) => {
            setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
        }, (error) => { console.error("Error fetching suppliers:", error); });
        
        Promise.all([
            new Promise(res => onSnapshot(query(collection(db, 'projects', projectId, 'warranties')), res)),
            new Promise(res => onSnapshot(query(collection(db, 'projects', projectId, 'suppliers')), res))
        ]).finally(() => setLoadingWarranties(false));

        return () => {
            unsubWarranties();
            unsubSuppliers();
        };
    }, [projectId]);

     // Fetch approved documents for archive
    useEffect(() => {
        if (!projectId) return;
        setLoadingDocs(true);
        const docsQuery = query(collection(db, 'projects', projectId, 'documents'), where('type', '==', 'file'), where('status', '==', 'Aprovado'));
        const unsubscribe = onSnapshot(docsQuery, (snapshot) => {
            setDocuments(snapshot.docs.map(d => ({id: d.id, ...d.data()} as ProjectFile)));
            setLoadingDocs(false);
        }, (error) => {
            console.error("Error fetching approved documents:", error);
            setLoadingDocs(false);
        });
        return () => unsubscribe();
    }, [projectId]);
    
    // New useEffect to fetch FVS templates
    useEffect(() => {
        if (!projectId) return;
        const fvsQuery = query(collection(db, 'projects', projectId, 'documents'), where('type', '==', 'file'));
        const unsubscribe = onSnapshot(fvsQuery, (snapshot) => {
            const templates = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as ProjectFile))
                .filter(file => file.name.endsWith('.md'));
            setAvailableFvs(templates);
        });
        return () => unsubscribe();
    }, [projectId]);


    const resetInspectionForm = () => {
        setUnitIdentifier('');
        setClientName('');
        setClientEmail('');
        setInspectionDate(new Date());
        setIsInspectionDialogOpen(false);
    };

    const resetWarrantyForm = () => {
        setItemDescription('');
        setSupplierId('');
        setStartDate(new Date());
        setDurationYears('1');
        setWarrantyFile(null);
        if (warrantyFileInputRef.current) warrantyFileInputRef.current.value = '';
        setIsWarrantyDialogOpen(false);
    };
    
    const handleOpenChecklistDialog = (inspection: Inspection) => {
        setSelectedInspectionForChecklist(inspection);
        setSelectedFvs(null);
        setChecklistItems([]);
        setChecklistCreationMode('template');
        setNewChecklistName('');
        setNewItemText('');
        setIsChecklistDialogOpen(true);
    };
    
     const handleAddManualItem = () => {
        if (!newItemText.trim()) return;
        const newItem: ChecklistItem = {
            id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            text: newItemText,
            status: 'Não Aplicável',
            observations: ''
        };
        setChecklistItems(prev => [...prev, newItem]);
        setNewItemText('');
    };

    const handleRemoveManualItem = (id: string) => {
        setChecklistItems(prev => prev.filter(item => item.id !== id));
    };

    const handleSelectFvsTemplate = async (file: ProjectFile) => {
        setSelectedFvs(file);
        try {
            const latestVersion = file.versions.find(v => v.version === file.latestVersion);
            if (!latestVersion) throw new Error('Versão mais recente do ficheiro não encontrada.');
            
            const response = await fetch(latestVersion.url);
            if (!response.ok) throw new Error('Falha ao carregar conteúdo do ficheiro.');
            const text = await response.text();
            const lines = text.split('\n');
            const items: ChecklistItem[] = lines
                .map(line => line.trim())
                .filter(line => line.startsWith('- [ ]') || line.startsWith('- [x]'))
                .map((line, index) => ({
                    id: `template-item-${index}-${Date.now()}`,
                    text: line.replace(/- \[( |x)\] /i, '').trim(),
                    status: 'Não Aplicável',
                    observations: ''
                }));
            setChecklistItems(items);
        } catch (error: any) {
            toast({ title: 'Erro ao carregar template', description: error.message, variant: 'destructive' });
        }
    };
    
    const handleChecklistItemStatusChange = (id: string, status: ChecklistItemStatus) => {
        setChecklistItems(prev =>
            prev.map(item => (item.id === id ? { ...item, status } : item))
        );
    };

    const handleChecklistItemObservationChange = (id: string, observations: string) => {
        setChecklistItems(prev =>
            prev.map(item => (item.id === id ? { ...item, observations } : item))
        );
    };
    
     const handleOpenPendenciaDialog = (item: ChecklistItem) => {
        setPendenciaText(`Item não conforme: "${item.text}".\n\nObservações: ${item.observations || 'Nenhuma.'}`);
        setPendenciaType('Acabamento'); // Default for post-construction
        setPendenciaPriority('Média');
        setPendenciaAssignee('unassigned');
        setIsPendenciaDialogOpen(true);
    };

    const handleCreatePendencia = async () => {
        if (!canEdit || !user) return;
        if (!pendenciaText.trim()) {
            toast({ title: 'Descrição da pendência é obrigatória.', variant: 'destructive' });
            return;
        }

        setIsSubmittingPendencia(true);
        try {
            const assignee = teamMembers.find(member => member.uid === pendenciaAssignee);
            const annotationData = {
                text: pendenciaText,
                type: pendenciaType,
                priority: pendenciaPriority,
                status: 'Aberta',
                author: user.displayName || user.email,
                createdAt: serverTimestamp(),
                assignee: assignee ? { uid: assignee.uid, displayName: assignee.displayName } : null,
            };
            await addDoc(collection(db, 'projects', projectId, 'annotations'), annotationData);
            
            toast({ title: 'Pendência criada com sucesso!' });
            setIsPendenciaDialogOpen(false);
            setPendenciaText('');
        } catch (error) {
            console.error("Error creating pendencia:", error);
            toast({ title: 'Erro ao criar pendência', variant: 'destructive' });
        } finally {
            setIsSubmittingPendencia(false);
        }
    };

    const handleSaveChecklist = async () => {
        if (!canEdit || !user || !idToken || !selectedInspectionForChecklist) return;

        if (checklistCreationMode === 'manual' && (!newChecklistName.trim() || checklistItems.length === 0)) {
            toast({ title: 'Dados insuficientes', description: 'O nome do checklist e pelo menos um item são obrigatórios.', variant: 'destructive' });
            return;
        }

        if (checklistCreationMode === 'template' && !selectedFvs) {
            toast({ title: 'Nenhum template selecionado', variant: 'destructive' });
            return;
        }

        setIsSubmittingChecklist(true);
        try {
            const latestVersion = checklistCreationMode === 'template' && selectedFvs ? selectedFvs.versions.find(v => v.version === selectedFvs.latestVersion) : null;
            
            const checklistData = {
                id: `cl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                templateName: checklistCreationMode === 'template' ? selectedFvs!.name : newChecklistName,
                templateUrl: latestVersion?.url || '',
                items: checklistItems,
                filledBy: {
                    uid: user.uid,
                    displayName: user.displayName || user.email,
                },
            };

            const response = await fetch(`/api/projects/${projectId}/inspections/${selectedInspectionForChecklist.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify(checklistData),
            });
            
            if (!response.ok) throw new Error((await response.json()).error || 'Falha ao guardar o checklist.');

            toast({ title: 'Checklist guardado com sucesso!' });
            setIsChecklistDialogOpen(false);
            setSelectedFvs(null);
            setChecklistItems([]);
            setNewChecklistName('');
        } catch (error: any) {
            toast({ title: 'Erro ao guardar', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmittingChecklist(false);
        }
    };


    const handleScheduleInspection = async () => {
        if (!canEdit || !user || !idToken) return;
        if (!unitIdentifier || !clientName || !clientEmail || !inspectionDate) {
            toast({ title: 'Campos obrigatórios em falta', variant: 'destructive' });
            return;
        }

        setIsSubmittingInspection(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/inspections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}`},
                body: JSON.stringify({
                    date: inspectionDate.toISOString(),
                    unitIdentifier,
                    clientName,
                    clientEmail
                })
            });

            if (!response.ok) throw new Error('Falha ao agendar vistoria');

            toast({ title: 'Vistoria agendada com sucesso!' });
            resetInspectionForm();

        } catch (error) {
            console.error("Error scheduling inspection:", error);
            toast({ title: 'Erro ao agendar vistoria', variant: 'destructive' });
        } finally {
            setIsSubmittingInspection(false);
        }
    };
    
    const handleAddWarranty = async () => {
        if (!canEdit || !user || !idToken) return;
        if (!itemDescription || !supplierId || !startDate || !durationYears || !warrantyFile) {
            toast({ title: 'Campos em falta', description: 'Todos os campos, incluindo o ficheiro, são obrigatórios.', variant: 'destructive'});
            return;
        }
        
        setIsSubmittingWarranty(true);
        try {
             const formData = new FormData();
             formData.append('file', warrantyFile);
             formData.append('itemDescription', itemDescription);
             formData.append('supplierId', supplierId);
             formData.append('startDate', startDate.toISOString());
             formData.append('durationYears', durationYears);
             
             const response = await fetch(`/api/projects/${projectId}/warranties`, {
                 method: 'POST',
                 headers: { 'Authorization': `Bearer ${idToken}`},
                 body: formData
             });

             if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao adicionar a garantia.');
            }

            toast({ title: 'Garantia adicionada com sucesso!' });
            resetWarrantyForm();

        } catch(error: any) {
             console.error("Error adding warranty: ", error);
            toast({ title: 'Erro ao adicionar apólice', description: error.message, variant: 'destructive' });
        } finally {
             setIsSubmittingWarranty(false);
        }
    };
    
    const handleStatusChange = async (inspectionId: string, newStatus: InspectionStatus) => {
        if (!canEdit || !idToken) return;

        try {
            const response = await fetch(`/api/projects/${projectId}/inspections/${inspectionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao atualizar o estado da vistoria.');
            }
            
            toast({ title: 'Estado da Vistoria Atualizado!' });
        } catch (error: any) {
            toast({ title: 'Erro ao atualizar estado', description: error.message, variant: 'destructive' });
        }
    };

    const handleSaveSignature = async (inspectionId: string, signatory: string, dataUrl: string) => {
        if (!canEdit) return;

        const newSignature: DigitalSignature = {
            signedBy: signatory,
            signatureDataUrl: dataUrl,
            signedAt: Timestamp.now(),
        };

        const inspectionRef = doc(db, 'projects', projectId, 'inspections', inspectionId);
        try {
            await updateDoc(inspectionRef, {
                signatures: arrayUnion(newSignature),
            });
            toast({ title: `Assinatura de ${signatory} guardada!` });
        } catch (error) {
            toast({ title: 'Erro ao guardar assinatura', variant: 'destructive' });
        }
    };

    const handleGenerateReport = async (inspection: Inspection) => {
        toast({ title: 'A gerar relatório...', description: 'O seu PDF será descarregado em breve.' });
        try {
            await generateHandoverReport(project, inspection);
        } catch (error) {
            console.error("Error generating report: ", error);
            toast({ title: 'Erro ao gerar relatório', variant: 'destructive' });
        }
    };

    const handleGeneratePackage = async () => {
        const docsToInclude = documents.filter(d => selectedDocIds[d.id]);
        if (docsToInclude.length === 0 && warranties.length === 0) {
            toast({ title: 'Nenhum item para incluir', description: 'Selecione pelo menos um documento ou registe uma garantia.', variant: 'destructive' });
            return;
        }

        toast({ title: 'A gerar pacote de entrega...', description: 'O seu PDF será descarregado em breve.' });
        try {
            await generateHandoverPackage(project, docsToInclude, warranties);
        } catch (error) {
            console.error("Error generating handover package:", error);
            toast({ title: 'Erro ao gerar pacote', variant: 'destructive' });
        }
    };

    const getStatusVariant = (status: Inspection['status']) => {
        switch (status) {
            case 'Concluída': return 'default';
            case 'Agendada': return 'secondary';
            case 'Em Andamento': return 'outline';
            default: return 'outline';
        }
    };
    
    const getWarrantyStatus = (endDate: Date): { status: string; variant: 'default' | 'secondary' | 'destructive' } => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
        
        if (endDate < today) {
            return { status: 'Expirado', variant: 'destructive' };
        }
        const daysUntilExpiry = differenceInDays(endDate, today);
        if (daysUntilExpiry <= 30) {
            return { status: 'Perto de Expirar', variant: 'secondary' };
        }
        return { status: 'Válido', variant: 'default' };
    };


    return (
        <div className="p-4">
            <Tabs defaultValue="inspections" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="inspections">Vistorias e Entregas</TabsTrigger>
                    <TabsTrigger value="warranties">Garantias</TabsTrigger>
                    <TabsTrigger value="archive">Arquivo de Entrega</TabsTrigger>
                </TabsList>
                
                <TabsContent value="inspections" className="pt-4">
                    <Dialog open={isInspectionDialogOpen} onOpenChange={setIsInspectionDialogOpen}>
                        <Card>
                            <CardHeader className="flex flex-row items-start justify-between">
                                <div>
                                    <CardTitle className="flex items-center justify-between">
                                        <span className="flex items-center gap-2">Vistorias e Entregas</span>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><HelpCircle className="h-4 w-4 text-muted-foreground" /></Button></TooltipTrigger>
                                                <TooltipContent><p className="max-w-xs">Gira as vistorias de entrega das unidades, registe não-conformidades e recolha as assinaturas digitais dos clientes.</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </CardTitle>
                                    <CardDescription>
                                        Gira as vistorias de entrega das unidades, registe não-conformidades e recolha as assinaturas digitais dos clientes.
                                    </CardDescription>
                                </div>
                                {canEdit && (
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Agendar Nova Vistoria
                                        </Button>
                                    </DialogTrigger>
                                )}
                            </CardHeader>
                            <CardContent>
                                {loadingInspections ? (
                                    <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin" /> Carregando...</div>
                                ) : (
                                    <Accordion type="single" collapsible className="w-full">
                                        {inspections.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center p-4">Nenhuma vistoria agendada.</p>
                                        ) : (
                                            inspections.map(item => (
                                                <AccordionItem value={item.id} key={item.id}>
                                                    <AccordionTrigger className="hover:no-underline">
                                                        <div className="flex justify-between items-center w-full pr-4">
                                                            <div className="text-left">
                                                                <p className="font-semibold">{item.unitIdentifier}</p>
                                                                <p className="text-sm text-muted-foreground">{item.clientName}</p>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span>{format(item.date, 'dd/MM/yyyy')}</span>
                                                                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="p-4 space-y-4">
                                                        <h4 className="font-semibold">Checklists Preenchidos</h4>
                                                        {(item.checklists || []).length > 0 ? (
                                                            <Accordion type="single" collapsible className="w-full">
                                                                {(item.checklists || []).map(cl => (
                                                                    <AccordionItem value={cl.id} key={cl.id} className="border-b-0">
                                                                        <AccordionTrigger className="bg-secondary/50 px-4 rounded-md hover:no-underline text-sm">
                                                                            <div className="flex justify-between w-full items-center">
                                                                                <span className="font-medium">{cl.templateName}</span>
                                                                                <span className="text-xs text-muted-foreground">Preenchido em {cl.filledAt ? format((cl.filledAt as any).toDate(), 'dd/MM/yyyy HH:mm') : ''}</span>
                                                                            </div>
                                                                        </AccordionTrigger>
                                                                        <AccordionContent className="pt-2">
                                                                            <Table>
                                                                                <TableHeader>
                                                                                    <TableRow>
                                                                                        <TableHead>Item</TableHead>
                                                                                        <TableHead className="w-[150px]">Estado</TableHead>
                                                                                        <TableHead>Observações</TableHead>
                                                                                        {canEdit && <TableHead className="w-[180px]">Ações</TableHead>}
                                                                                    </TableRow>
                                                                                </TableHeader>
                                                                                <TableBody>
                                                                                    {cl.items.map(checklistItem => (
                                                                                        <TableRow key={checklistItem.id}>
                                                                                            <TableCell>{checklistItem.text}</TableCell>
                                                                                            <TableCell>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    {getChecklistStatusIcon(checklistItem.status)}
                                                                                                    {checklistItem.status}
                                                                                                </div>
                                                                                            </TableCell>
                                                                                            <TableCell>{checklistItem.observations || '-'}</TableCell>
                                                                                            {canEdit && (
                                                                                                <TableCell>
                                                                                                    {checklistItem.status === 'Não Conforme' && (
                                                                                                        <Button size="sm" variant="destructive" onClick={() => handleOpenPendenciaDialog(checklistItem)}>
                                                                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                                                                            Criar Pendência
                                                                                                        </Button>
                                                                                                    )}
                                                                                                </TableCell>
                                                                                            )}
                                                                                        </TableRow>
                                                                                    ))}
                                                                                </TableBody>
                                                                            </Table>
                                                                        </AccordionContent>
                                                                    </AccordionItem>
                                                                ))}
                                                            </Accordion>
                                                        ) : <p className="text-sm text-muted-foreground">Nenhum checklist associado.</p>}

                                                        <div className="border-t pt-4 space-y-4">
                                                            <h4 className="font-semibold">Assinaturas</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                <SignaturePad 
                                                                    title="Cliente" 
                                                                    onSave={(dataUrl) => handleSaveSignature(item.id, 'Cliente', dataUrl)}
                                                                    signatureUrl={item.signatures?.find(s => s.signedBy === 'Cliente')?.signatureDataUrl}
                                                                />
                                                                <SignaturePad 
                                                                    title="Construtora" 
                                                                    onSave={(dataUrl) => handleSaveSignature(item.id, 'Construtora', dataUrl)}
                                                                    signatureUrl={item.signatures?.find(s => s.signedBy === 'Construtora')?.signatureDataUrl}
                                                                />
                                                            </div>
                                                        </div>

                                                        {canEdit && (
                                                            <div className="flex items-center justify-between gap-2 pt-4 border-t">
                                                                <div>
                                                                    <Button variant="outline" size="sm" onClick={() => handleOpenChecklistDialog(item)}>
                                                                        <Plus className="mr-2 h-4 w-4"/> Adicionar Checklist
                                                                    </Button>
                                                                    <Button variant="outline" size="sm" onClick={() => handleGenerateReport(item)} className="ml-2">
                                                                        <FileText className="mr-2 h-4 w-4" />
                                                                        Gerar Auto de Entrega
                                                                    </Button>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Label>Atualizar Estado:</Label>
                                                                    <Select value={item.status} onValueChange={(v) => handleStatusChange(item.id, v as InspectionStatus)}>
                                                                        <SelectTrigger className="w-[180px]">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="Agendada">Agendada</SelectItem>
                                                                            <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                                                                            <SelectItem value="Concluída">Concluída</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))
                                        )}
                                    </Accordion>
                                )}
                            </CardContent>
                        </Card>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Agendar Nova Vistoria de Entrega</DialogTitle>
                                <DialogDescription>Preencha os detalhes para agendar uma nova vistoria com um cliente.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="unit-id">Identificador da Unidade</Label>
                                    <Input id="unit-id" placeholder="Ex: Apartamento 101, Bloco A" value={unitIdentifier} onChange={e => setUnitIdentifier(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="client-name">Nome do Cliente</Label>
                                    <Input id="client-name" placeholder="Ex: João da Silva" value={clientName} onChange={e => setClientName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="client-email">Email do Cliente</Label>
                                    <Input id="client-email" type="email" placeholder="joao.silva@email.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Data da Vistoria</Label>
                                    <DatePicker date={inspectionDate} setDate={setInspectionDate} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={resetInspectionForm}>Cancelar</Button>
                                <Button onClick={handleScheduleInspection} disabled={isSubmittingInspection}>
                                    {isSubmittingInspection ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2"/>}
                                    Agendar
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>
                <TabsContent value="warranties" className="pt-4">
                    <Dialog open={isWarrantyDialogOpen} onOpenChange={setIsWarrantyDialogOpen}>
                        <Card>
                            <CardHeader className="flex flex-row items-start justify-between">
                                <div>
                                    <CardTitle className="flex items-center justify-between">
                                        <span className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary"/> Gestão de Garantias</span>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><HelpCircle className="h-4 w-4 text-muted-foreground" /></Button></TooltipTrigger>
                                                <TooltipContent><p className="max-w-xs">Registe e controle os prazos de garantia de equipamentos e serviços, e anexe os certificados para fácil consulta.</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </CardTitle>
                                    <CardDescription>Registe e controle os prazos de garantia de equipamentos e serviços.</CardDescription>
                                </div>
                                {canEdit && (
                                    <DialogTrigger asChild>
                                        <Button><Plus className="mr-2"/> Adicionar Garantia</Button>
                                    </DialogTrigger>
                                )}
                            </CardHeader>
                            <CardContent>
                                {loadingWarranties ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> :
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item / Sistema</TableHead>
                                                <TableHead>Fornecedor</TableHead>
                                                <TableHead>Data de Fim</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {warranties.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center">Nenhuma garantia registada.</TableCell>
                                                </TableRow>
                                            ) : (
                                                warranties.map(item => {
                                                    const { status, variant } = getWarrantyStatus(item.endDate);
                                                    return (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="font-medium">{item.itemDescription}</TableCell>
                                                            <TableCell>{item.supplierName}</TableCell>
                                                            <TableCell>{format(item.endDate, 'dd/MM/yyyy')}</TableCell>
                                                            <TableCell><Badge variant={variant}>{status}</Badge></TableCell>
                                                            <TableCell className="text-right">
                                                                <Button asChild variant="outline" size="sm">
                                                                    <a href={item.certificateUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4"/> Ver</a>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                }
                            </CardContent>
                        </Card>
                        <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Adicionar Nova Garantia</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto px-2">
                                <div className="space-y-2">
                                    <Label htmlFor="item-desc">Item ou Sistema em Garantia</Label>
                                    <Input id="item-desc" placeholder="Ex: Impermeabilização da cobertura" value={itemDescription} onChange={e => setItemDescription(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supplier">Fornecedor Responsável</Label>
                                    <Select value={supplierId} onValueChange={setSupplierId}>
                                        <SelectTrigger id="supplier"><SelectValue placeholder="Selecione um fornecedor..."/></SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Data de Início da Garantia</Label>
                                        <DatePicker date={startDate} setDate={setStartDate} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Duração (anos)</Label>
                                        <Input id="duration" type="number" value={durationYears} onChange={e => setDurationYears(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cert-file">Anexar Certificado (PDF)</Label>
                                    <Input id="cert-file" type="file" accept=".pdf" ref={warrantyFileInputRef} onChange={e => setWarrantyFile(e.target.files?.[0] || null)} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={resetWarrantyForm}>Cancelar</Button>
                                <Button onClick={handleAddWarranty} disabled={isSubmittingWarranty}>
                                    {isSubmittingWarranty && <Loader2 className="animate-spin mr-2" />}
                                    Guardar Garantia
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>
                <TabsContent value="archive" className="pt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="flex items-center gap-2"><Archive className="h-5 w-5 text-primary"/> Arquivo de Entrega (As-Built)</span>
                                     <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><HelpCircle className="h-4 w-4 text-muted-foreground" /></Button></TooltipTrigger>
                                            <TooltipContent><p className="max-w-xs">Compile todos os documentos finais, manuais e garantias num único pacote para entregar ao cliente.</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </CardTitle>
                                <CardDescription>Compile todos os documentos finais, manuais e garantias num único pacote para entregar ao cliente.</CardDescription>
                            </div>
                            <Button onClick={handleGeneratePackage} disabled={(Object.keys(selectedDocIds).length === 0 || !Object.values(selectedDocIds).some(v => v)) && warranties.length === 0}>
                                Gerar Pacote de Entrega (PDF)
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h4 className="font-semibold mb-2">Documentos Aprovados</h4>
                                {loadingDocs ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> :
                                documents.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum documento com o estado "Aprovado".</p> : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12"><Checkbox onCheckedChange={(checked) => {
                                                    const newSelection: Record<string, boolean> = {};
                                                    if (checked) { documents.forEach(d => newSelection[d.id] = true); }
                                                    setSelectedDocIds(newSelection);
                                                }}/></TableHead>
                                                <TableHead>Nome do Ficheiro</TableHead>
                                                <TableHead>Versão</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {documents.map(doc => (
                                                <TableRow key={doc.id}>
                                                    <TableCell><Checkbox checked={selectedDocIds[doc.id] || false} onCheckedChange={(checked) => setSelectedDocIds(prev => ({ ...prev, [doc.id]: !!checked }))} /></TableCell>
                                                    <TableCell>{doc.name}</TableCell>
                                                    <TableCell>v{doc.latestVersion}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Garantias (incluídas automaticamente)</h4>
                                {loadingWarranties ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> :
                                warranties.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma garantia registada.</p> : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12"><Checkbox checked disabled /></TableHead>
                                                <TableHead>Item</TableHead>
                                                <TableHead>Fim da Garantia</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {warranties.map(w => (
                                                <TableRow key={w.id} className="bg-secondary/50">
                                                    <TableCell><Checkbox checked disabled /></TableCell>
                                                    <TableCell>{w.itemDescription}</TableCell>
                                                    <TableCell>{format(w.endDate, 'dd/MM/yyyy')}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isPendenciaDialogOpen} onOpenChange={setIsPendenciaDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Criar Nova Pendência</DialogTitle>
                        <DialogDescription>Crie uma tarefa para resolver um item não conforme da vistoria.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="pendencia-text">Descrição da Pendência</Label>
                            <Textarea id="pendencia-text" value={pendenciaText} onChange={e => setPendenciaText(e.target.value)} rows={4} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Prioridade</Label>
                                <Select value={pendenciaPriority} onValueChange={v => setPendenciaPriority(v as AnnotationPriority)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Baixa">Baixa</SelectItem>
                                        <SelectItem value="Média">Média</SelectItem>
                                        <SelectItem value="Alta">Alta</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label>Responsável</Label>
                                <Select value={pendenciaAssignee} onValueChange={setPendenciaAssignee}>
                                    <SelectTrigger><SelectValue placeholder="Atribuir a..."/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Não atribuído</SelectItem>
                                        {teamMembers.map(m => <SelectItem key={m.uid} value={m.uid}>{m.displayName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPendenciaDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreatePendencia} disabled={isSubmittingPendencia}>
                            {isSubmittingPendencia && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Criar Pendência
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Adicionar Checklist à Vistoria</DialogTitle>
                        <DialogDescription>
                            {checklistCreationMode === 'template' && !selectedFvs ? 'Selecione um template de FVS ou crie um em branco.' : 'Preencha o checklist para a vistoria.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 max-h-[70vh] overflow-y-auto px-2">
                        {checklistCreationMode === 'template' && !selectedFvs ? (
                            <div className="space-y-4">
                                <Button className="w-full" onClick={() => setChecklistCreationMode('manual')}><Plus className="mr-2"/>Criar Checklist em Branco</Button>
                                 <div className="relative my-4">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou use um template</span></div>
                                </div>
                                <div className="space-y-2">
                                    {availableFvs.map(file => (
                                        <Button key={file.id} variant="outline" className="w-full justify-start" onClick={() => handleSelectFvsTemplate(file)}>
                                            {file.name}
                                        </Button>
                                    ))}
                                    {availableFvs.length === 0 && <p className="text-sm text-center text-muted-foreground">Nenhum template de FVS (.md) encontrado nos documentos do projeto.</p>}
                                </div>
                            </div>
                        ) : checklistCreationMode === 'manual' ? (
                             <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="checklist-name">Nome do Checklist</Label>
                                    <Input id="checklist-name" value={newChecklistName} onChange={(e) => setNewChecklistName(e.target.value)} placeholder="Ex: Checklist de Acabamentos - Cozinha"/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Itens a Verificar</Label>
                                    <div className="p-2 border rounded-md space-y-2">
                                        {checklistItems.map((item) => (
                                            <div key={item.id} className="flex items-center gap-2 p-1 bg-secondary rounded">
                                                <p className="flex-1 text-sm">{item.text}</p>
                                                <Button size="icon" variant="ghost" onClick={() => handleRemoveManualItem(item.id)}>
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        ))}
                                         <div className="flex gap-2 pt-2 border-t">
                                            <Input placeholder="Adicionar novo item..." value={newItemText} onChange={(e) => setNewItemText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddManualItem()} />
                                            <Button onClick={handleAddManualItem} disabled={!newItemText.trim()}>Adicionar</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                             <div className="space-y-6">
                                {checklistItems.map((item) => (
                                <div key={item.id} className="p-4 border rounded-lg space-y-4">
                                    <p className="font-medium">{item.text}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <RadioGroup 
                                            value={item.status}
                                            onValueChange={(value) => handleChecklistItemStatusChange(item.id, value as ChecklistItemStatus)}
                                            className="flex items-center space-x-4"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Conforme" id={`${item.id}-conforme`} />
                                                <Label htmlFor={`${item.id}-conforme`} className="text-green-600 flex items-center gap-1"><CheckCircle className="h-4 w-4" />Conforme</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Não Conforme" id={`${item.id}-nao-conforme`} />
                                                <Label htmlFor={`${item.id}-nao-conforme`} className="text-red-600 flex items-center gap-1"><XCircle className="h-4 w-4" />Não Conforme</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Não Aplicável" id={`${item.id}-na`} />
                                                <Label htmlFor={`${item.id}-na`}>N/A</Label>
                                            </div>
                                        </RadioGroup>
                                        <Input 
                                            placeholder="Observações..." 
                                            value={item.observations}
                                            onChange={(e) => handleChecklistItemObservationChange(item.id, e.target.value)}
                                            disabled={item.status === 'Conforme' || item.status === 'Não Aplicável'}
                                        />
                                    </div>
                                </div>
                            ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsChecklistDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveChecklist} disabled={isSubmittingChecklist}>
                            {isSubmittingChecklist && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Guardar Checklist
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
