

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, User, Phone, Briefcase, FileScan, Sparkles, Calendar, BookOpen, Trash2, Plus, Upload, X, Save, Pencil, Download, FileWarning, CalendarPlus, Home, GraduationCap, CheckSquare, AlertTriangle, FileText } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { type WorkforceMember, type WorkforceDocument, type LeaveRequest, type EmploymentType, type WorkforceStatus, type LeaveType, type LeaveRequestStatus, type TrainingRecord, type AssignedChecklist, type OnboardingChecklistItem, type Payslip } from '@/types/workforce';
import { Timestamp } from 'firebase/firestore';
import { format, differenceInDays, isBefore, addDays, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import type { UserRole, TeamMember, AnnotationType, AnnotationPriority } from '@/app/projects/[id]/page';
import PayslipsTab from '@/components/hr/payslips-tab';


const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const getDocumentStatus = (doc?: WorkforceDocument) => {
    if (!doc?.expiryDate) return { color: 'text-gray-400', label: 'Sem Validade' };
    const expiry = (doc.expiryDate as any).toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    if (expiry < today) return { color: 'text-red-500', label: 'Expirado' };
    const daysLeft = differenceInDays(expiry, today);
    if (daysLeft <= 30) return { color: 'text-yellow-500', label: 'Expira em breve' };
    return { color: 'text-green-500', label: 'Válido' };
};

const getTrainingStatus = (expiryDate?: Date | Timestamp): { color: string; label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (!expiryDate) return { color: 'text-gray-400', label: 'Sem Validade', variant: 'outline' };
    
    const expiry = expiryDate instanceof Timestamp ? expiryDate.toDate() : expiryDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    if (expiry < today) return { color: 'text-red-500', label: 'Expirado', variant: 'destructive' };
    const daysLeft = differenceInDays(expiry, today);
    if (daysLeft <= 30) return { color: 'text-yellow-500', label: 'Expira em breve', variant: 'secondary' };
    return { color: 'text-green-500', label: 'Válido', variant: 'default' };
};


const getStatusVariant = (status: LeaveRequestStatus) => {
    switch (status) {
        case 'Aprovado': return 'default';
        case 'Pendente': return 'secondary';
        case 'Rejeitado': return 'destructive';
        default: return 'outline';
    }
};

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

const ONBOARDING_TEMPLATE = [
    'Contrato de Trabalho Assinado',
    'Documento de Identificação Recebido',
    'NIB para Salário Recebido',
    'Ficha de Aptidão Médica Entregue',
    'Equipamentos de Proteção Individual (EPIs) Entregues',
    'Formação de Integração e Segurança Concluída',
    'Acessos a Sistemas Criados (Email, etc.)',
];
const OFFBOARDING_TEMPLATE = [
    'Carta de Rescisão Assinada',
    'Entrevista de Saída Realizada',
    'Devolução de Equipamentos da Empresa (PC, Telemóvel, etc.)',
    'Devolução de Equipamentos de Proteção Individual (EPIs)',
    'Acessos a Sistemas Revogados',
    'Cálculo de Contas Finais Preparado',
    'Pagamento Final Efetuado',
];

export default function WorkforceDetailPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const memberId = params.id as string;
    const [member, setMember] = useState<WorkforceMember | null>(null);
    const canEdit = user?.role === 'super-admin' || user?.role === 'Gestor de RH' || user?.accessProfile === 'admin' || user?.accessProfile === 'hr_manager';
    const isOwnProfile = user?.uid === memberId || Boolean(user?.email && member?.contact && user.email.toLowerCase() === member.contact.toLowerCase());
    const canViewFinancials = canEdit || isOwnProfile;
    const canViewRestrictedData = canEdit || isOwnProfile;
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [checklists, setChecklists] = useState<AssignedChecklist[]>([]);
    const [loading, setLoading] = useState(true);

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<WorkforceMember>>({});
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Document state
    const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [docName, setDocName] = useState('');
    const [docExpiryDate, setDocExpiryDate] = useState<Date | undefined>();
    const [docFile, setDocFile] = useState<File | null>(null);
    const docFileInputRef = useRef<HTMLInputElement>(null);
    
    // Training State
    const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
    const [isSubmittingTraining, setIsSubmittingTraining] = useState(false);
    const [courseName, setCourseName] = useState('');
    const [institution, setInstitution] = useState('');
    const [completionDate, setCompletionDate] = useState<Date | undefined>();
    const [trainingExpiryDate, setTrainingExpiryDate] = useState<Date | undefined>();
    const [linkedDocumentId, setLinkedDocumentId] = useState('');

    // Skills state
    const [newSkill, setNewSkill] = useState('');

    // Leave Request state
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
    const [leaveType, setLeaveType] = useState<LeaveType>('Férias');
    const [leaveStartDate, setLeaveStartDate] = useState<Date | undefined>();
    const [leaveEndDate, setLeaveEndDate] = useState<Date | undefined>();
    const [leaveNotes, setLeaveNotes] = useState('');

    // Checklist state
    const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
    const [isAssigningChecklist, setIsAssigningChecklist] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<'Onboarding' | 'Offboarding'>('Onboarding');
    
     // State for creating a pendencia from a checklist item
    const [isPendenciaDialogOpen, setIsPendenciaDialogOpen] = useState(false);
    const [isSubmittingPendencia, setIsSubmittingPendencia] = useState(false);
    const [pendenciaText, setPendenciaText] = useState('');
    const [pendenciaType, setPendenciaType] = useState<AnnotationType>('Acabamento');
    const [pendenciaPriority, setPendenciaPriority] = useState<AnnotationPriority>('Média');
    const [pendenciaAssignee, setPendenciaAssignee] = useState<string>('unassigned');
    const [projectTeam, setProjectTeam] = useState<TeamMember[]>([]);

    useEffect(() => {
        if (!memberId) return;
        setLoading(true);

        const memberRef = doc(db, 'workforce', memberId);
        const leaveQuery = query(collection(db, 'workforce', memberId, 'leaveRequests'), orderBy('startDate', 'desc'));
        const payslipsQuery = query(collection(db, 'workforce', memberId, 'payslips'), orderBy('periodStart', 'desc'));
        
        const unsubMember = onSnapshot(memberRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as WorkforceMember;
                setMember({ ...data, id: docSnap.id });
                setChecklists(data.checklists || []);
                setEditData({ ...data, id: docSnap.id });
                setPhotoPreview(data.photoURL || null);
            } else {
                toast({ title: 'Funcionário não encontrado', variant: 'destructive' });
                router.push('/hr');
            }
            setLoading(false);
        });
        
        const unsubLeave = onSnapshot(leaveQuery, (snapshot) => {
            setLeaveRequests(snapshot.docs.map(d => ({...d.data(), id: d.id, startDate: (d.data().startDate as Timestamp).toDate(), endDate: (d.data().endDate as Timestamp).toDate() } as LeaveRequest)));
        });

        const unsubPayslips = onSnapshot(payslipsQuery, (snapshot) => {
            setPayslips(snapshot.docs.map(d => ({...d.data(), id: d.id} as Payslip)));
        });

        return () => {
            unsubMember();
            unsubLeave();
            unsubPayslips();
        };
    }, [memberId, router, toast]);
    
    // Fetch project team if member is assigned to a project
    useEffect(() => {
        if (member?.currentProjectId) {
            const teamQuery = query(collection(db, 'projects', member.currentProjectId, 'team'));
            const unsubscribe = onSnapshot(teamQuery, (snapshot) => {
                setProjectTeam(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as TeamMember)));
            });
            return () => unsubscribe();
        } else {
            setProjectTeam([]);
        }
    }, [member?.currentProjectId]);


    const handleEditChange = (field: keyof WorkforceMember, value: any) => {
        setEditData(prev => ({...prev, [field]: value}));
    };
    
    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!canEdit || !member) return;
        setIsSubmitting(true); // Re-using this as a "submitting" flag
        try {
            let photoURL = editData.photoURL || '';
            if (photoFile) {
                const token = await user?.getIdToken(true);
                const formData = new FormData();
                formData.append('file', photoFile);
                formData.append('path', `workforce/${memberId}/profile`);
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });
                if (!response.ok) throw new Error('Falha no upload da foto');
                const { url } = await response.json();
                photoURL = url;
            } else if (!photoPreview) {
                 photoURL = '';
            }
            
            const dataToUpdate = { ...editData, photoURL };
            delete (dataToUpdate as any).id; // Don't try to update the id field

            const memberRef = doc(db, 'workforce', memberId);
            await updateDoc(memberRef, dataToUpdate);

            toast({ title: 'Perfil atualizado com sucesso!' });
            setIsEditing(false);
        } catch (error) {
            toast({ title: 'Erro ao guardar', variant: 'destructive' });
        } finally {
            setIsSubmitting(false); // Make sure it's set back to false
            setIsEditing(false);
        }
    }
    
    const resetDocForm = () => {
        setDocName('');
        setDocExpiryDate(undefined);
        setDocFile(null);
        if(docFileInputRef.current) docFileInputRef.current.value = "";
        setIsDocDialogOpen(false);
    }
    
    const resetTrainingForm = () => {
        setCourseName('');
        setInstitution('');
        setCompletionDate(undefined);
        setTrainingExpiryDate(undefined);
        setLinkedDocumentId('');
        setIsTrainingDialogOpen(false);
    }

    const handleUploadDocument = async () => {
        if (!canEdit || !member || !docFile || !docName.trim()) {
            toast({ title: 'Campos em falta', description: 'O nome do documento e o ficheiro são obrigatórios.', variant: 'destructive' });
            return;
        }
        setIsUploadingDoc(true);
        try {
            const storagePath = `workforce/${member.id}/documents/${docFile.name}`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = await uploadBytes(storageRef, docFile);
            const downloadURL = await getDownloadURL(uploadTask.ref);

            const newDocument: WorkforceDocument = {
                id: crypto.randomUUID(),
                name: docName,
                fileName: docFile.name,
                fileUrl: downloadURL,
                expiryDate: docExpiryDate ? Timestamp.fromDate(docExpiryDate) : undefined,
                uploadedAt: Timestamp.now(),
            };
            
            const memberRef = doc(db, 'workforce', memberId);
            await updateDoc(memberRef, {
                documents: arrayUnion(newDocument)
            });

            toast({ title: 'Documento adicionado!' });
            resetDocForm();

        } catch (error) {
            console.error("Error uploading document:", error);
            toast({ title: 'Erro ao carregar documento', variant: 'destructive' });
        } finally {
            setIsUploadingDoc(false);
        }
    };
    
    const handleDeleteDocument = async (docToDelete: WorkforceDocument) => {
        if (!canEdit || !member) return;

        try {
            const memberRef = doc(db, 'workforce', memberId);
            await updateDoc(memberRef, {
                documents: arrayRemove(docToDelete)
            });
            toast({ title: 'Documento eliminado.'});
        } catch (error) {
            console.error("Error deleting document:", error);
            toast({ title: 'Erro ao eliminar documento', variant: 'destructive' });
        }
    }
    
     const handleAddTraining = async () => {
        if (!canEdit || !courseName.trim() || !institution.trim() || !completionDate) {
            toast({ title: "Campos obrigatórios", description: "Curso, Instituição e Data de Conclusão são necessários.", variant: "destructive" });
            return;
        }

        setIsSubmittingTraining(true);
        try {
            const linkedDoc = member?.documents?.find(d => d.id === linkedDocumentId);
            const newTrainingRecord: TrainingRecord = {
                id: crypto.randomUUID(),
                courseName,
                institution,
                completionDate: Timestamp.fromDate(completionDate),
                expiryDate: trainingExpiryDate ? Timestamp.fromDate(trainingExpiryDate) : undefined,
                documentId: linkedDoc?.id,
                documentName: linkedDoc?.name,
                documentUrl: linkedDoc?.fileUrl,
            };

            const memberRef = doc(db, 'workforce', memberId);
            await updateDoc(memberRef, {
                training: arrayUnion(newTrainingRecord)
            });

            toast({ title: 'Formação adicionada com sucesso!' });
            resetTrainingForm();

        } catch (error) {
            console.error("Error adding training record:", error);
            toast({ title: 'Erro ao adicionar formação', variant: 'destructive' });
        } finally {
            setIsSubmittingTraining(false);
        }
    };

    const handleAddSkill = async () => {
        if (!canEdit || !newSkill.trim()) return;

        const memberRef = doc(db, 'workforce', memberId);
        try {
            await updateDoc(memberRef, {
                skills: arrayUnion(newSkill.trim())
            });
            toast({ title: 'Competência adicionada!' });
            setNewSkill('');
        } catch (error) {
            toast({ title: 'Erro ao adicionar competência', variant: 'destructive' });
        }
    };

    const handleRemoveSkill = async (skillToRemove: string) => {
        if (!canEdit) return;

        const memberRef = doc(db, 'workforce', memberId);
        try {
            await updateDoc(memberRef, {
                skills: arrayRemove(skillToRemove)
            });
            toast({ title: 'Competência removida.' });
        } catch (error) {
            toast({ title: 'Erro ao remover competência', variant: 'destructive' });
        }
    };

    const handleRequestLeave = async () => {
        if (!user || !leaveStartDate || !leaveEndDate) {
            toast({ title: "Datas em falta", description: "As datas de início e fim são obrigatórias.", variant: "destructive" });
            return;
        }
        if (leaveEndDate < leaveStartDate) {
            toast({ title: "Datas inválidas", description: "A data de fim não pode ser anterior à data de início.", variant: "destructive" });
            return;
        }

        setIsSubmittingLeave(true);
        try {
            await addDoc(collection(db, 'workforce', memberId, 'leaveRequests'), {
                type: leaveType,
                status: 'Pendente',
                startDate: leaveStartDate,
                endDate: leaveEndDate,
                notes: leaveNotes,
                requester: {
                    uid: user.uid,
                    displayName: user.displayName,
                },
                createdAt: serverTimestamp(),
            });

            toast({ title: "Pedido de ausência enviado!" });
            setLeaveType('Férias');
            setLeaveStartDate(undefined);
            setLeaveEndDate(undefined);
            setLeaveNotes('');
            setIsLeaveDialogOpen(false);
        } catch (error) {
            toast({ title: "Erro ao enviar pedido", variant: "destructive" });
        } finally {
            setIsSubmittingLeave(false);
        }
    };

     const handleAssignChecklist = async () => {
        if (!canEdit || !user) return;
        setIsAssigningChecklist(true);
        try {
            const template = selectedTemplate === 'Onboarding' ? ONBOARDING_TEMPLATE : OFFBOARDING_TEMPLATE;
            const checklist: AssignedChecklist = {
                id: crypto.randomUUID(),
                templateName: selectedTemplate,
                assignedAt: Timestamp.now(),
                isCompleted: false,
                items: template.map(text => ({
                    id: crypto.randomUUID(),
                    text,
                    isCompleted: false,
                }))
            };
            const memberRef = doc(db, 'workforce', memberId);
            await updateDoc(memberRef, {
                checklists: arrayUnion(checklist)
            });

            toast({ title: `Checklist de ${selectedTemplate} atribuído!`});
            setIsChecklistDialogOpen(false);
        } catch(error) {
            toast({title: 'Erro ao atribuir checklist', variant: 'destructive'});
        } finally {
            setIsAssigningChecklist(false);
        }
    };

    const handleToggleChecklistItem = async (checklistId: string, itemId: string, currentStatus: boolean) => {
        if (!canEdit || !user || !member) return;

        const checklist = checklists.find(c => c.id === checklistId);
        if (!checklist) return;

        const updatedItems = checklist.items.map(item =>
            item.id === itemId ? {
                ...item,
                isCompleted: !currentStatus,
                completedAt: !currentStatus ? Timestamp.now() : undefined,
                completedBy: !currentStatus ? { uid: user.uid, displayName: user.displayName } : undefined,
            } : item
        );
        
        const isChecklistCompleted = updatedItems.every(item => item.isCompleted);
        const memberRef = doc(db, 'workforce', memberId);
        const currentChecklists = member.checklists || [];
        const updatedChecklists = currentChecklists.map(c => 
            c.id === checklistId ? { ...c, items: updatedItems, isCompleted: isChecklistCompleted } : c
        );

        try {
            await updateDoc(memberRef, { checklists: updatedChecklists });
            toast({title: 'Item do checklist atualizado.'});
        } catch(error) {
             toast({title: 'Erro ao atualizar item', variant: 'destructive'});
        }
    };
    
    const handleOpenPendenciaDialog = (item: OnboardingChecklistItem) => {
        setPendenciaText(`Item por concluir do checklist: "${item.text}".`);
        setPendenciaType('Outro');
        setPendenciaPriority('Média');
        setPendenciaAssignee('unassigned');
        setIsPendenciaDialogOpen(true);
    };

    const handleCreatePendencia = async () => {
        if (!canEdit || !user || !member?.currentProjectId) {
            toast({ title: 'Erro', description: 'O funcionário precisa de estar alocado a um projeto para criar uma pendência associada.', variant: 'destructive' });
            return;
        }
        if (!pendenciaText.trim()) {
            toast({ title: 'Descrição da pendência é obrigatória.', variant: 'destructive' });
            return;
        }

        setIsSubmittingPendencia(true);
        try {
            const assignee = projectTeam.find(m => m.uid === pendenciaAssignee);
            const annotationData = {
                text: pendenciaText,
                type: pendenciaType,
                priority: pendenciaPriority,
                status: 'Aberta',
                author: user.displayName || user.email,
                createdAt: serverTimestamp(),
                assignee: assignee ? { uid: assignee.uid, displayName: assignee.displayName } : null,
            };
            await addDoc(collection(db, 'projects', member.currentProjectId, 'annotations'), annotationData);
            
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



    if (loading || !member) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </main>
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-secondary/50">
            <Header />
            <main className="flex-1 p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div>
                        <Button variant="outline" asChild className="mb-4">
                            <Link href="/hr">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Quadro de Pessoal
                            </Link>
                        </Button>
                        <div className="flex justify-between items-start">
                             <div className="flex items-center gap-4">
                                {isEditing && photoPreview ? (
                                    <div className="relative w-24 h-24">
                                        <Image src={photoPreview} alt="Pré-visualização" fill className="object-cover rounded-full border-4 border-background" />
                                        <Button variant="ghost" size="icon" className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-secondary" onClick={() => fileInputRef.current?.click()}>
                                            <Pencil className="h-4 w-4"/>
                                        </Button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handlePhotoSelect} />
                                    </div>
                                ) : (
                                    <Avatar className="h-24 w-24 border-4 border-background">
                                        <AvatarImage src={member.photoURL} alt={member.name} />
                                        <AvatarFallback className="text-3xl">{getInitials(member.name)}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div>
                                    {isEditing ? (
                                        <Input value={editData.name || ''} onChange={(e) => handleEditChange('name', e.target.value)} className="text-3xl font-bold font-headline h-12" />
                                    ) : (
                                        <h1 className="text-3xl font-bold font-headline">{member.name}</h1>
                                    )}
                                     {isEditing ? (
                                        <Input value={editData.role || ''} onChange={(e) => handleEditChange('role', e.target.value)} className="text-muted-foreground mt-1" />
                                     ) : (
                                        <p className="text-muted-foreground">{member.role}</p>
                                     )}
                                </div>
                            </div>
                             <div className="flex items-center gap-2">
                                 {isOwnProfile && (
                                     <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline"><CalendarPlus className="mr-2 h-4 w-4"/>Pedir Ausência</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Pedir Ausência</DialogTitle>
                                                <DialogDescription>Preencha os detalhes do seu pedido de ausência.</DialogDescription>
                                            </DialogHeader>
                                             <div className="py-4 space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Tipo de Ausência</Label>
                                                     <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
                                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Férias">Férias</SelectItem>
                                                            <SelectItem value="Licença Médica">Licença Médica</SelectItem>
                                                            <SelectItem value="Falta Justificada">Falta Justificada</SelectItem>
                                                            <SelectItem value="Outro">Outro</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Data de Início</Label>
                                                        <DatePicker date={leaveStartDate} setDate={setLeaveStartDate} />
                                                    </div>
                                                     <div className="space-y-2">
                                                        <Label>Data de Fim</Label>
                                                        <DatePicker date={leaveEndDate} setDate={setLeaveEndDate} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Notas (Opcional)</Label>
                                                    <Textarea value={leaveNotes} onChange={(e) => setLeaveNotes(e.target.value)} placeholder="Adicione uma justificação ou informação relevante..."/>
                                                </div>
                                             </div>
                                            <DialogFooter>
                                                <Button variant="ghost" onClick={() => setIsLeaveDialogOpen(false)}>Cancelar</Button>
                                                <Button onClick={handleRequestLeave} disabled={isSubmittingLeave}>
                                                    {isSubmittingLeave && <Loader2 className="animate-spin mr-2" />}
                                                    Enviar Pedido
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
                                {canEdit && (
                                    <>
                                        {isEditing ? (
                                            <>
                                                <Button variant="ghost" onClick={() => { setIsEditing(false); setEditData(member); setPhotoPreview(member.photoURL || null); }}>Cancelar</Button>
                                                <Button onClick={handleSave} disabled={isSubmitting}>
                                                    {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4" />}
                                                    Guardar
                                                </Button>
                                            </>
                                        ) : (
                                            <Button variant="outline" onClick={() => setIsEditing(true)}>
                                                <Pencil className="mr-2 h-4 w-4"/> Editar Perfil
                                            </Button>
                                        )}
                                    </>
                                )}
                             </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Informação de Contacto</CardTitle></CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-muted-foreground"/>
                                        {isEditing ? <Input value={editData.contact || ''} onChange={e => handleEditChange('contact', e.target.value)} /> : <span>{member.contact || 'Não definido'}</span>}
                                    </div>
                                    {canViewRestrictedData && (
                                        <div className="flex items-start gap-3">
                                            <Home className="h-4 w-4 text-muted-foreground mt-1"/>
                                            {isEditing ? <Textarea value={editData.address || ''} onChange={e => handleEditChange('address', e.target.value)} placeholder="Morada do funcionário" rows={2}/> : <span className="flex-1">{member.address || 'Não definido'}</span>}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            {canViewRestrictedData && (
                                <Card>
                                    <CardHeader><CardTitle>Informação de Emergência</CardTitle></CardHeader>
                                    <CardContent className="space-y-4 text-sm">
                                        <div className="space-y-2">
                                            <Label>Nome</Label>
                                            {isEditing ? <Input value={editData.emergencyContactName || ''} onChange={e => handleEditChange('emergencyContactName', e.target.value)} /> : <p className="p-2 bg-secondary rounded-md">{member.emergencyContactName || 'N/A'}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Relação</Label>
                                            {isEditing ? <Input value={editData.emergencyContactRelationship || ''} onChange={e => handleEditChange('emergencyContactRelationship', e.target.value)} /> : <p className="p-2 bg-secondary rounded-md">{member.emergencyContactRelationship || 'N/A'}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Telefone</Label>
                                             {isEditing ? <Input value={editData.emergencyContactPhone || ''} onChange={e => handleEditChange('emergencyContactPhone', e.target.value)} /> : <p className="p-2 bg-secondary rounded-md">{member.emergencyContactPhone || 'N/A'}</p>}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                        <div className="lg:col-span-2">
                             <Card>
                                <CardHeader><CardTitle>Informação Profissional</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableBody>
                                             <TableRow><TableCell className="font-medium">Estado</TableCell><TableCell><Badge variant={member.status === 'Ativo' ? 'default' : 'secondary'}>{member.status}</Badge></TableCell></TableRow>
                                             <TableRow><TableCell className="font-medium">Vínculo</TableCell><TableCell>{isEditing ? 
                                                <Select value={editData.employmentType} onValueChange={v => handleEditChange('employmentType', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Efetivo">Efetivo</SelectItem><SelectItem value="Temporário">Temporário</SelectItem><SelectItem value="Subcontratado">Subcontratado</SelectItem></SelectContent></Select> 
                                                : member.employmentType}</TableCell></TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">Data de Admissão</TableCell>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <DatePicker date={editData.admissionDate ? (editData.admissionDate as any).toDate() : undefined} setDate={(d) => handleEditChange('admissionDate', d ? Timestamp.fromDate(d) : undefined)} />
                                                    ) : (
                                                        member.admissionDate ? format((member.admissionDate as any).toDate(), 'dd/MM/yyyy') : 'N/A'
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow><TableCell className="font-medium">Projeto Atual</TableCell><TableCell>{member.currentProjectName || 'Disponível'}</TableCell></TableRow>
                                            {canViewFinancials && (
                                                <>
                                                    <TableRow><TableCell className="font-medium">Custo por Hora</TableCell><TableCell>{isEditing ? <Input type="number" value={editData.costPerHour || ''} onChange={e => handleEditChange('costPerHour', parseFloat(e.target.value) || 0)} /> : formatCurrency(member.costPerHour)}</TableCell></TableRow>
                                                    <TableRow><TableCell className="font-medium">Custo por Unidade</TableCell><TableCell>{isEditing ? <Input type="number" value={editData.costPerUnit || ''} onChange={e => handleEditChange('costPerUnit', parseFloat(e.target.value) || 0)} /> : formatCurrency(member.costPerUnit)}</TableCell></TableRow>
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <Tabs defaultValue={canViewRestrictedData ? "documents" : "skills"}>
                        <TabsList>
                            {canViewRestrictedData && <TabsTrigger value="documents">Documentos</TabsTrigger>}
                            <TabsTrigger value="skills">Competências</TabsTrigger>
                            <TabsTrigger value="training">Formação</TabsTrigger>
                            {canViewRestrictedData && <TabsTrigger value="checklists">Checklists</TabsTrigger>}
                            {canViewRestrictedData && <TabsTrigger value="leave">Histórico de Ausências</TabsTrigger>}
                            {canViewFinancials && <TabsTrigger value="payslips">Recibos</TabsTrigger>}
                        </TabsList>
                        {canViewRestrictedData && (
                            <TabsContent value="documents">
                                <Dialog open={isDocDialogOpen} onOpenChange={setIsDocDialogOpen}>
                                <Card>
                                    <CardHeader className="flex-row items-start justify-between">
                                        <CardTitle>Documentos</CardTitle>
                                        {canEdit && <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4"/>Adicionar</Button></DialogTrigger>}
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Validade</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {!member.documents || member.documents.length === 0 ? <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum documento.</TableCell></TableRow> :
                                                    member.documents.map((doc, index) => {
                                                        const status = getDocumentStatus(doc);
                                                        return (
                                                            <TableRow key={doc.id || index}>
                                                                <TableCell className="font-medium">{doc.name}</TableCell>
                                                                <TableCell>{doc.expiryDate ? format((doc.expiryDate as any).toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                                                <TableCell><span className={status.color}>{status.label}</span></TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="ghost" size="icon" asChild><a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4"/></a></Button>
                                                                    {canEdit && <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(doc)}><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })
                                                }
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                                 <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Adicionar Documento</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="doc-name">Nome do Documento</Label>
                                            <Input id="doc-name" value={docName} onChange={e => setDocName(e.target.value)} placeholder="Ex: Bilhete de Identidade, Certificado..." />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Data de Validade (Opcional)</Label>
                                            <DatePicker date={docExpiryDate} setDate={setDocExpiryDate} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="doc-file">Ficheiro</Label>
                                            <Input id="doc-file" type="file" ref={docFileInputRef} onChange={e => setDocFile(e.target.files?.[0] || null)} />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="ghost" onClick={resetDocForm}>Cancelar</Button>
                                        <Button onClick={handleUploadDocument} disabled={isUploadingDoc}>{isUploadingDoc && <Loader2 className="animate-spin mr-2"/>}Guardar</Button>
                                    </DialogFooter>
                                 </DialogContent>
                                </Dialog>
                            </TabsContent>
                        )}
                         <TabsContent value="skills">
                            <Card>
                                <CardHeader><CardTitle>Competências e Certificações</CardTitle><CardDescription>Registe as competências, qualificações e certificações do funcionário.</CardDescription></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        {(member.skills || []).map((skill, index) => (
                                            <Badge key={index} variant="secondary" className="gap-1">
                                            {skill}
                                            {canEdit && (
                                                <button onClick={() => handleRemoveSkill(skill)} className="rounded-full hover:bg-destructive/20 p-0.5">
                                                <X className="h-3 w-3" />
                                                </button>
                                            )}
                                            </Badge>
                                        ))}
                                        {(member.skills || []).length === 0 && (
                                            <p className="text-sm text-muted-foreground">Nenhuma competência registada.</p>
                                        )}
                                    </div>
                                    {canEdit && (
                                    <div className="flex gap-2 items-center pt-4 border-t">
                                        <Input 
                                            placeholder="Adicionar nova competência..." 
                                            value={newSkill} 
                                            onChange={(e) => setNewSkill(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                                        />
                                        <Button onClick={handleAddSkill} disabled={!newSkill.trim()}>Adicionar</Button>
                                    </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                          <TabsContent value="training">
                            <Dialog open={isTrainingDialogOpen} onOpenChange={setIsTrainingDialogOpen}>
                                <Card>
                                    <CardHeader className="flex-row items-center justify-between">
                                        <CardTitle>Formação & Certificações</CardTitle>
                                        {canEdit && <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4"/>Adicionar Registo</Button></DialogTrigger>}
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Curso / Certificação</TableHead><TableHead>Instituição</TableHead><TableHead>Validade</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {!member.training || member.training.length === 0 ? <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum registo de formação.</TableCell></TableRow> :
                                                    member.training.map(t => {
                                                        const status = getTrainingStatus(t.expiryDate);
                                                        return(
                                                        <TableRow key={t.id}>
                                                            <TableCell className="font-medium">{t.courseName}</TableCell>
                                                            <TableCell>{t.institution}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={status.variant}>{status.label}</Badge>
                                                                {t.expiryDate && <span className="ml-2 text-xs">({format(t.expiryDate.toDate(), 'dd/MM/yyyy')})</span>}
                                                            </TableCell>
                                                            <TableCell>
                                                                {t.documentUrl && <Button variant="ghost" size="icon" asChild><a href={t.documentUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4"/></a></Button>}
                                                            </TableCell>
                                                        </TableRow>
                                                    )})
                                                }
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Adicionar Registo de Formação</DialogTitle></DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Nome do Curso / Certificação</Label>
                                            <Input value={courseName} onChange={e => setCourseName(e.target.value)} />
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Instituição</Label>
                                            <Input value={institution} onChange={e => setInstitution(e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Data de Conclusão</Label>
                                                <DatePicker date={completionDate} setDate={setCompletionDate} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Data de Validade (Opcional)</Label>
                                                <DatePicker date={trainingExpiryDate} setDate={setTrainingExpiryDate} />
                                            </div>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Anexar Certificado (Opcional)</Label>
                                            <Select value={linkedDocumentId} onValueChange={setLinkedDocumentId}>
                                                <SelectTrigger><SelectValue placeholder="Selecione um documento..."/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Nenhum</SelectItem>
                                                    {member.documents?.filter(doc => doc.id).map(doc => <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="ghost" onClick={resetTrainingForm}>Cancelar</Button>
                                        <Button onClick={handleAddTraining} disabled={isSubmittingTraining}>{isSubmittingTraining && <Loader2 className="animate-spin mr-2"/>}Guardar</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </TabsContent>
                        {canViewRestrictedData && (
                            <TabsContent value="checklists">
                            <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
                                <Card>
                                    <CardHeader className="flex-row items-center justify-between">
                                        <CardTitle>Checklists de On/Offboarding</CardTitle>
                                        {canEdit && <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4"/>Atribuir Checklist</Button></DialogTrigger>}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {checklists.length === 0 ? <p className="text-sm text-muted-foreground text-center p-4">Nenhum checklist atribuído.</p> :
                                                checklists.map(cl => {
                                                    const completedCount = cl.items.filter(i => i.isCompleted).length;
                                                    const progress = cl.items.length > 0 ? (completedCount / cl.items.length) * 100 : 0;
                                                    return (
                                                        <Accordion key={cl.id} type="single" collapsible>
                                                            <AccordionItem value={cl.id} className="border rounded-md px-4">
                                                                <AccordionTrigger>
                                                                    <div className="flex justify-between w-full items-center">
                                                                        <span>{cl.templateName}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <Progress value={progress} className="w-24 h-2"/>
                                                                            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                                                                        </div>
                                                                    </div>
                                                                </AccordionTrigger>
                                                                <AccordionContent className="pt-2">
                                                                     <div className="space-y-2">
                                                                        {cl.items.map(item => (
                                                                            <div key={item.id} className="flex items-center space-x-2 p-1 rounded-md hover:bg-muted/50">
                                                                                <Checkbox id={`${cl.id}-${item.id}`} checked={item.isCompleted} onCheckedChange={() => handleToggleChecklistItem(cl.id, item.id, item.isCompleted)} disabled={!canEdit}/>
                                                                                <Label htmlFor={`${cl.id}-${item.id}`} className={cn("text-sm font-normal cursor-pointer flex-1", item.isCompleted && "line-through text-muted-foreground")}>
                                                                                    {item.text}
                                                                                </Label>
                                                                                 {canEdit && !item.isCompleted && member.currentProjectId && (
                                                                                    <Button size="sm" variant="destructive" onClick={() => handleOpenPendenciaDialog(item)}>
                                                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                                                        Criar Pendência
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        </Accordion>
                                                    )
                                                })
                                            }
                                        </div>
                                    </CardContent>
                                </Card>
                                 <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Atribuir Checklist</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <Label>Selecione o Template</Label>
                                        <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as any)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Onboarding">Onboarding (Integração)</SelectItem>
                                                <SelectItem value="Offboarding">Offboarding (Saída)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="ghost" onClick={() => setIsChecklistDialogOpen(false)}>Cancelar</Button>
                                        <Button onClick={handleAssignChecklist} disabled={isAssigningChecklist}>
                                            {isAssigningChecklist && <Loader2 className="animate-spin mr-2"/>}
                                            Atribuir
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                             <Dialog open={isPendenciaDialogOpen} onOpenChange={setIsPendenciaDialogOpen}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Criar Nova Pendência</DialogTitle>
                                        <DialogDescription>Crie uma tarefa para resolver um item não conforme do checklist.</DialogDescription>
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
                                                        {projectTeam.map(m => <SelectItem key={m.uid} value={m.uid}>{m.displayName}</SelectItem>)}
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
                        </TabsContent>
                        )}
                        {canViewRestrictedData && (
                          <TabsContent value="leave">
                             <Card>
                                <CardHeader><CardTitle>Histórico de Ausências</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Período</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {loading ? <TableRow><TableCell colSpan={3} className="text-center"><Loader2 className="animate-spin"/></TableCell></TableRow> :
                                             leaveRequests.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center h-24">Nenhum pedido de ausência.</TableCell></TableRow> :
                                             leaveRequests.map(req => (
                                                 <TableRow key={req.id}>
                                                     <TableCell>{req.type}</TableCell>
                                                     <TableCell>{format(req.startDate, 'dd/MM/yy')} - {format(req.endDate, 'dd/MM/yy')}</TableCell>
                                                     <TableCell><Badge variant={getStatusVariant(req.status)}>{req.status}</Badge></TableCell>
                                                 </TableRow>
                                             ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        )}
                        {canViewFinancials && (
                            <TabsContent value="payslips">
                                <PayslipsTab payslips={payslips} loading={loading} memberName={member.name} memberRole={member.role} />
                            </TabsContent>
                        )}
                    </Tabs>
                </div>
            </main>
        </div>
    )
}

    