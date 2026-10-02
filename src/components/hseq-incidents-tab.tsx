'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, Timestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, AlertTriangle, ImagePlus, Trash2, Camera, Send, Save, Mic, X } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Incident, type IncidentSeverity, type IncidentType, type IncidentStatus, type Comment } from '@/types/hseq';
import { type ActionItem } from '@/types/collaboration';
import { type TeamMember } from '@/app/projects/[id]/page';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { UserRole } from '@/app/projects/[id]/page';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';


const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

interface HseqIncidentsTabProps {
    projectId: string;
    userRole: UserRole | null;
    teamMembers: TeamMember[];
}

export default function HseqIncidentsTab({ projectId, userRole, teamMembers }: HseqIncidentsTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [comments, setComments] = useState<Record<string, Comment[]>>({});
    const [loading, setLoading] = useState(true);

    // Form state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [incidentDate, setIncidentDate] = useState<Date | undefined>();
    const [incidentType, setIncidentType] = useState<IncidentType>('Condição Insegura');
    const [severity, setSeverity] = useState<IncidentSeverity>('Baixa');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    
    const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
    const [isSavingComment, setIsSavingComment] = useState<string | null>(null);

    const [actionItemText, setActionItemText] = useState<Record<string, string>>({});
    const [isSavingAction, setIsSavingAction] = useState<string | null>(null);

    // Speech recognition state
    const [listeningField, setListeningField] = useState<'description' | null>(null);
    const recognitionRef = useRef<any>(null);
    const [isListening, setIsListening] = useState(false);
    const [speechSupport, setSpeechSupport] = useState(false);

    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    useEffect(() => {
        setIncidentDate(new Date());
    }, []);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'incidents'), orderBy('date', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedIncidents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as Timestamp).toDate(),
            } as unknown as Incident));

            setIncidents(fetchedIncidents);
            setLoading(false);

            fetchedIncidents.forEach(incident => {
                const commentsQuery = query(collection(db, 'projects', projectId, 'incidents', incident.id, 'comments'), orderBy('createdAt', 'asc'));
                onSnapshot(commentsQuery, (commentsSnapshot) => {
                    const fetchedComments = commentsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        createdAt: (doc.data().createdAt as Timestamp),
                    } as Comment));
                    setComments(prev => ({ ...prev, [incident.id]: fetchedComments }));
                });
            });

        }, (error) => {
            console.error("Error fetching incidents: ", error);
            toast({ title: 'Erro ao carregar incidentes', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, toast]);
    
      // Speech Recognition effect
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
                if (listeningField === 'description') {
                    setDescription(prev => prev ? `${prev.trim()} ${transcript}` : transcript);
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
    
    const handleListen = (field: 'description') => {
        if (!recognitionRef.current || isListening) return;
        setListeningField(field);
        try {
            recognitionRef.current.start();
        } catch(e) {
            toast({ title: "Não foi possível iniciar o microfone", description: 'Verifique se outro programa não o está a usar.', variant: 'destructive'});
        }
    };


    const resetForm = () => {
        setIncidentDate(new Date());
        setIncidentType('Condição Insegura');
        setSeverity('Baixa');
        setLocation('');
        setDescription('');
        setPhotos([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsDialogOpen(false);
    };
    
    const handleStatusChange = async (incidentId: string, newStatus: IncidentStatus) => {
        if (!idToken || !canEdit) return;

        try {
            const response = await fetch(`/api/projects/${projectId}/incidents/${incidentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}`},
                body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) throw new Error('Falha ao atualizar status');
            toast({ title: `Status do incidente atualizado para "${newStatus}"` });
        } catch (error) {
            console.error('Error updating status:', error);
            toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
        }
    };
    
    const handleAddComment = async (incidentId: string) => {
        const text = newCommentText[incidentId];
        if (!text || !text.trim() || !user || !idToken) return;

        setIsSavingComment(incidentId);
        try {
            const response = await fetch(`/api/projects/${projectId}/incidents/${incidentId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}`},
                body: JSON.stringify({ text, authorName: user.displayName || user.email }),
            });
            if (!response.ok) throw new Error('Falha ao adicionar comentário');
            
            setNewCommentText(prev => ({ ...prev, [incidentId]: '' }));
        } catch (error) {
            console.error('Error adding comment:', error);
            toast({ title: 'Erro ao adicionar comentário', variant: 'destructive' });
        } finally {
            setIsSavingComment(null);
        }
    };
    
     const handleAddActionItem = async (incidentId: string) => {
        if (!idToken || !canEdit) return;

        const text = actionItemText[incidentId];
        if (!text || !text.trim()) {
            toast({ title: 'Descrição da ação é obrigatória', variant: 'destructive' });
            return;
        }

        const newAction: Omit<ActionItem, 'id'> & { id: string } = {
            id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            text,
            isCompleted: false,
        };

        const incidentRef = doc(db, 'projects', projectId, 'incidents', incidentId);
        try {
            await updateDoc(incidentRef, { actionItems: arrayUnion(newAction) });
            toast({ title: 'Ação corretiva adicionada.' });
            setActionItemText(prev => ({ ...prev, [incidentId]: '' }));
        } catch (error) {
            toast({ title: 'Erro ao adicionar ação', variant: 'destructive' });
        }
    };

    const handleToggleActionItem = async (incidentId: string, actionId: string, isCompleted: boolean) => {
        if (!canEdit || !idToken) return;
        const incident = incidents.find(i => i.id === incidentId);
        if (!incident) return;
        
        const updatedItems = (incident.actionItems || []).map(item => 
            item.id === actionId ? { ...item, isCompleted: !isCompleted } : item
        );

        try {
             const response = await fetch(`/api/projects/${projectId}/incidents/${incidentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}`},
                body: JSON.stringify({ actionItems: updatedItems }),
            });
             if (!response.ok) throw new Error('Falha ao atualizar ação.');
             toast({ title: 'Ação atualizada.' });
        } catch(error) {
            toast({ title: 'Erro ao atualizar ação', variant: 'destructive'});
        }
    };


    const handleSubmitIncident = async () => {
        if (!user || !idToken) return;
        if (!incidentDate || !location || !description) {
            toast({ title: 'Campos obrigatórios em falta', description: 'Data, local e descrição são obrigatórios.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const photoUrls: { url: string; name: string }[] = [];
            if (photos.length > 0) {
                 for (const photo of photos) {
                    const photoId = uuidv4();
                    const storagePath = `projects/${projectId}/incidents/${format(incidentDate, 'yyyy-MM-dd')}/${photoId}-${photo.name}`;
                    const storageRef = ref(storage, storagePath);
                    const uploadTask = await uploadBytesResumable(storageRef, photo);
                    const downloadURL = await getDownloadURL(uploadTask.ref);
                    photoUrls.push({ url: downloadURL, name: photo.name });
                }
            }

            const newIncidentData = {
                date: incidentDate.toISOString(),
                type: incidentType,
                severity: severity,
                location: location,
                description: description,
                photoUrls: photoUrls,
            };

            const response = await fetch(`/api/projects/${projectId}/incidents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify(newIncidentData),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao registar o incidente.');
            }
            
            toast({ title: 'Incidente registado com sucesso!' });
            resetForm();

        } catch (error: any) {
            console.error("Error submitting incident:", error);
            toast({ title: 'Erro ao registar incidente', description: error.message, variant: 'destructive' });
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

    const getSeverityVariant = (severity: IncidentSeverity) => {
        switch (severity) {
            case 'Crítica': case 'Alta': return 'destructive';
            case 'Média': return 'secondary';
            case 'Baixa': default: return 'outline';
        }
    };
    
    const getStatusVariant = (status: IncidentStatus) => {
        switch (status) {
            case 'Aberto': return 'destructive';
            case 'Em Investigação': return 'secondary';
            case 'Concluído': return 'default';
            default: return 'outline';
        }
    }


    return (
        <div className="p-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <Card>
                    <CardHeader className="flex-row justify-between items-start">
                        <div>
                            <CardTitle>Registo de Incidentes</CardTitle>
                            <CardDescription>Registe e acompanhe todos os incidentes de segurança e quase-acidentes.</CardDescription>
                        </div>
                        {userRole && (
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2"/> Registar Incidente
                                </Button>
                            </DialogTrigger>
                        )}
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin"/> Carregando...</div>
                        ) : incidents.length === 0 ? (
                            <div className="text-center text-muted-foreground p-8 border rounded-lg">
                                <p>Nenhum incidente registado neste projeto.</p>
                            </div>
                        ) : (
                            <Accordion type="single" collapsible className="w-full">
                                {incidents.map(item => (
                                    <AccordionItem value={item.id} key={item.id}>
                                        <AccordionTrigger>
                                            <div className="flex justify-between items-center w-full pr-4">
                                                <div className="flex flex-col items-start text-left">
                                                    <span className="font-semibold text-base">{item.description.substring(0, 80)}...</span>
                                                    <span className="text-sm text-muted-foreground">{item.date ? format((item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date as any), 'dd/MM/yyyy') : 'N/A'} - {item.location}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={getSeverityVariant(item.severity)}>{item.severity}</Badge>
                                                    <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 space-y-4">
                                            <div className="text-sm space-y-1">
                                                <p><strong>Tipo:</strong> {item.type}</p>
                                                <p><strong>Autor:</strong> {item.author.displayName}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">Descrição Completa</h4>
                                                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{item.description}</p>
                                            </div>
                                            {item.photoUrls && item.photoUrls.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold">Fotos do Incidente</h4>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {item.photoUrls.map((photo, index) => (
                                                            <a href={photo.url} key={index} target="_blank" rel="noopener noreferrer">
                                                                <Image src={photo.url} alt={photo.name} width={128} height={128} className="object-cover rounded-md aspect-square hover:opacity-80 transition-opacity"/>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="border-t pt-4">
                                                <h4 className="font-semibold">Plano de Ação Corretiva</h4>
                                                <div className="mt-2 space-y-2">
                                                    {(item.actionItems || []).map((action) => (
                                                        <div key={action.id} className={cn("flex items-start gap-3 p-2 rounded-md", action.isCompleted && "bg-secondary/50")}>
                                                            <Checkbox 
                                                                id={`action-${action.id}`}
                                                                className="mt-1"
                                                                checked={action.isCompleted}
                                                                onCheckedChange={() => handleToggleActionItem(item.id, action.id, action.isCompleted)}
                                                                disabled={!canEdit}
                                                            />
                                                            <Label htmlFor={`action-${action.id}`} className={cn("flex-1 text-sm", action.isCompleted && "line-through text-muted-foreground")}>
                                                                {action.text}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                    {canEdit && (
                                                        <div className="flex items-center gap-2 pt-2">
                                                            <Input 
                                                                placeholder="Adicionar nova ação..."
                                                                value={actionItemText[item.id] || ''}
                                                                onChange={(e) => setActionItemText(prev => ({...prev, [item.id]: e.target.value}))}
                                                            />
                                                            <Button size="sm" onClick={() => handleAddActionItem(item.id)}>Adicionar</Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="border-t pt-4">
                                                <h4 className="font-semibold mb-2">Comentários e Acompanhamento</h4>
                                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                                    {(comments[item.id] || []).map(comment => (
                                                        <div key={comment.id} className="flex items-start gap-3">
                                                            <Avatar className="h-8 w-8 text-xs">
                                                                <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 bg-secondary p-3 rounded-md">
                                                                <p className="font-semibold text-sm">{comment.authorName}</p>
                                                                <p className="text-sm mt-1 whitespace-pre-wrap">{comment.text}</p>
                                                                <p className="text-xs text-muted-foreground mt-1">{comment.createdAt?.toDate ? format(comment.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : ''}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(!comments[item.id] || comments[item.id].length === 0) && (
                                                        <p className="text-xs text-muted-foreground text-center">Sem comentários.</p>
                                                    )}
                                                </div>
                                                {userRole && (
                                                <div className="mt-4 flex items-center gap-2">
                                                    <Textarea 
                                                        placeholder="Adicionar um comentário..."
                                                        value={newCommentText[item.id] || ''}
                                                        onChange={(e) => setNewCommentText(prev => ({...prev, [item.id]: e.target.value}))}
                                                        disabled={isSavingComment === item.id}
                                                        rows={1}
                                                    />
                                                    <Button size="icon" onClick={() => handleAddComment(item.id)} disabled={isSavingComment === item.id || !(newCommentText[item.id] || '').trim()}>
                                                        {isSavingComment === item.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                                                    </Button>
                                                </div>
                                                )}
                                            </div>

                                            <div className="border-t pt-4 flex justify-end items-center gap-2">
                                                <Label>Alterar Status:</Label>
                                                <Select value={item.status} onValueChange={(value) => handleStatusChange(item.id, value as IncidentStatus)}>
                                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Aberto">Aberto</SelectItem>
                                                        <SelectItem value="Em Investigação">Em Investigação</SelectItem>
                                                        <SelectItem value="Concluído">Concluído</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>

                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Registar Novo Incidente</DialogTitle>
                        <DialogDescription>Preencha os detalhes da ocorrência.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid gap-4 max-h-[70vh] overflow-y-auto px-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Data do Incidente</Label>
                                <DatePicker date={incidentDate} setDate={setIncidentDate} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">Local da Ocorrência</Label>
                                <Input id="location" placeholder="Ex: Bloco A, Piso 2, Zona da Grua" value={location} onChange={e => setLocation(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select value={incidentType} onValueChange={(v) => setIncidentType(v as IncidentType)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Acidente de Trabalho">Acidente de Trabalho</SelectItem>
                                        <SelectItem value="Incidente Ambiental">Incidente Ambiental</SelectItem>
                                        <SelectItem value="Quase Acidente">Quase Acidente</SelectItem>
                                        <SelectItem value="Condição Insegura">Condição Insegura</SelectItem>
                                        <SelectItem value="Ato Inseguro">Ato Inseguro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Gravidade</Label>
                                <Select value={severity} onValueChange={(v) => setSeverity(v as IncidentSeverity)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Baixa">Baixa</SelectItem>
                                        <SelectItem value="Média">Média</SelectItem>
                                        <SelectItem value="Alta">Alta</SelectItem>
                                        <SelectItem value="Crítica">Crítica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição do Incidente</Label>
                            <div className="relative">
                                <Textarea id="description" placeholder="Descreva o que aconteceu, as pessoas envolvidas e as condições." value={description} onChange={e => setDescription(e.target.value)} rows={4} disabled={isSubmitting}/>
                                {speechSupport && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleListen('description')}
                                        disabled={isSubmitting || isListening}
                                        className={cn(
                                            "absolute bottom-2 right-2",
                                            isListening && listeningField === 'description' && "text-red-500 animate-pulse"
                                        )}
                                        aria-label="Ditar descrição"
                                    >
                                        <Mic className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Fotografias</Label>
                            <p className="text-xs text-muted-foreground">Opcional. Anexe fotos para documentar o incidente.</p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                    <Camera className="mr-2 h-4 w-4"/> Adicionar Fotos
                                </Button>
                                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handlePhotoSelect} />
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {photos.map((photo, index) => (
                                    <div key={index} className="relative w-24 h-24">
                                        <Image src={URL.createObjectURL(photo)} alt={photo.name} fill className="object-cover rounded-md" />
                                        <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removePhoto(index)}>
                                            <Trash2 className="h-3 w-3"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                        <Button onClick={handleSubmitIncident} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <AlertTriangle className="mr-2" />}
                            Registar Incidente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}