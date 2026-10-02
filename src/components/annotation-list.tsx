
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MessageCircle, Send, Loader2, MapPin, X, Paperclip, ListChecks, User, UserCheck, ImagePlus, Trash2, Plus } from 'lucide-react';
import { type Annotation, type AnnotationType, type AnnotationPriority, type Comment, type TeamMember } from '@/app/projects/[id]/page';
import { addDoc, collection, serverTimestamp, updateDoc, doc, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from './ui/input';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { format } from 'date-fns';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    fill="currentColor"
    viewBox="0 0 448 512"
    {...props}
  >
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 .9c34.9 0 67.7 13.5 92.8 38.6 25.1 25.1 38.6 57.9 38.6 92.8 0 97.8-79.2 177-177 177-31.9 0-62.7-8.4-89.4-24.3l-6.5-3.9-66.6 17.5 17.9-65.1-4.2-6.8c-18.9-30.6-28.9-66.5-28.9-103.3 0-97.8 79.2-177 177-177zm117.1 210.1l-20.1-9.9C259.4 293.7 243 282.8 240.2 279s-5.4-3.6-12.8 3.6c-7.4 7.3-27.1 26.6-33.6 31.9-6.5 5.3-12.8 5.9-23.7 2-10.9-3.9-46.3-17.1-88.3-53.1-33.1-28.4-55.5-63.5-59.8-71.3-4.3-7.8-1.5-12.1.8-16.4 2.3-4.3 5.1-7.3 7.8-9.8 2.7-2.5 5.3-4.3 7.8-6.1 2.5-1.8 1.3-4.2-.8-7.3-2.1-3-12.8-30.7-17.6-41.2-4.9-10.6-9.8-9.2-13.5-9.4-3.7-.2-7.9-.2-12.1.2-4.2.4-10.9 1.5-16.4 7.3s-17.6 16.4-17.6 40.2c0 23.8 17.9 46.3 20.4 49.3 2.5 3 35.1 55.8 86.1 76.6 49.8 20.2 55.5 16.4 65.2 15.1 9.7-1.3 30.7-12.5 35.1-24.3 4.3-11.8 4.3-21.9 3-24.3s-2.1-3.9-4.5-5.3z"/>
  </svg>
);

type FilterStatus = 'all' | 'open' | 'resolved' | 'mine';

interface AnnotationListProps {
    projectId: string;
    team: TeamMember[];
    selectedAnnotationId: string | null;
    onAnnotationSelect: (id: string) => void;
    initialCoords?: { x: number; y: number; z: number } | null;
    onCoordsClear: () => void;
}

const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export function AnnotationList({ 
    projectId,
    team,
    selectedAnnotationId, 
    onAnnotationSelect,
    initialCoords,
    onCoordsClear
}: AnnotationListProps ) {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [loadingAnnotations, setLoadingAnnotations] = useState(true);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('open');
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    
    // New Annotation State
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCreatingAnnotation, setIsCreatingAnnotation] = useState(false);
    const [newAnnotationText, setNewAnnotationText] = useState('');
    const [newAnnotationType, setNewAnnotationType] = useState<AnnotationType>('Geral');
    const [newAnnotationPriority, setNewAnnotationPriority] = useState<AnnotationPriority>('Média');
    const [newAnnotationAssignee, setNewAnnotationAssignee] = useState<string>('unassigned');
    const [newAnnotationPhotos, setNewAnnotationPhotos] = useState<File[]>([]);
    const annotationPhotoInputRef = useRef<HTMLInputElement>(null);

    // Comments State
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [isSavingComment, setIsSavingComment] = useState(false);
    const [commentImageFile, setCommentImageFile] = useState<File | null>(null);
    const commentPhotoInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if (!projectId) return;
        setLoadingAnnotations(true);
        const annotationsQuery = query(collection(db, 'projects', projectId, 'annotations'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(annotationsQuery, (snapshot) => {
            const annotationsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Annotation));
            setAnnotations(annotationsList);
            setLoadingAnnotations(false);
        }, (error) => {
            console.error('Error fetching annotations:', error);
            setLoadingAnnotations(false);
        });
        return () => unsubscribe();
    }, [projectId]);


    useEffect(() => {
        if (initialCoords) {
            setIsCreateDialogOpen(true);
            setNewAnnotationText(''); // Reset text when new coords are received
        }
    }, [initialCoords]);

    // Fetch comments for selected annotation
    useEffect(() => {
        if (!selectedAnnotationId || !projectId) {
            setComments([]);
            return;
        }
        setLoadingComments(true);
        const commentsQuery = query(
            collection(db, 'projects', projectId, 'annotations', selectedAnnotationId, 'comments'),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
            const commentsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }) as Comment);
            setComments(commentsList);
            setLoadingComments(false);
        }, (error) => {
            console.error("Error fetching comments:", error);
            toast({ title: "Erro", description: "Não foi possível carregar os comentários.", variant: "destructive"});
            setLoadingComments(false);
        });

        return () => unsubscribe();
    }, [selectedAnnotationId, projectId, toast]);


    const filteredAnnotations = React.useMemo(() => {
        if (!user) return [];
        return annotations.filter(a => {
            if (filterStatus === 'open') return a.status === 'Aberta';
            if (filterStatus === 'resolved') return a.status === 'Resolvida';
            if (filterStatus === 'mine') return a.assignee?.uid === user.uid;
            return true; // 'all'
        });
    }, [annotations, filterStatus, user]);

    const annotationCounts = React.useMemo(() => {
        if (!user) return { all: 0, open: 0, resolved: 0, mine: 0 };
        return {
            all: annotations.length,
            open: annotations.filter(a => a.status === 'Aberta').length,
            resolved: annotations.filter(a => a.status === 'Resolvida').length,
            mine: annotations.filter(a => a.assignee?.uid === user.uid).length,
        };
    }, [annotations, user]);

    const getPriorityVariant = (priority: AnnotationPriority) => {
        switch (priority) {
            case 'Alta': return 'destructive';
            case 'Média': return 'secondary';
            case 'Baixa': default: return 'outline';
        }
    };
    
    const resetAnnotationForm = () => {
        setNewAnnotationText('');
        setNewAnnotationPriority('Média');
        setNewAnnotationType('Geral');
        setNewAnnotationAssignee('unassigned');
        setNewAnnotationPhotos([]);
        onCoordsClear();
        if (annotationPhotoInputRef.current) annotationPhotoInputRef.current.value = "";
        setIsCreateDialogOpen(false);
    }
    
    const handleSaveAnnotation = async () => {
        if (!newAnnotationText.trim()) {
            toast({ title: "Pendência vazia", description: "Por favor, escreva uma descrição.", variant: "destructive"});
            return;
        }
        if (!user || !projectId) return;

        setIsCreatingAnnotation(true);
        try {
            // 1. Upload photos
            const photoUrls: { url: string; name: string }[] = [];
            for (const photo of newAnnotationPhotos) {
                const photoId = uuidv4();
                const storagePath = `projects/${projectId}/annotations/photos/${photoId}-${photo.name}`;
                const storageRef = ref(storage, storagePath);
                const uploadTask = await uploadBytesResumable(storageRef, photo);
                const downloadURL = await getDownloadURL(uploadTask.ref);
                photoUrls.push({ url: downloadURL, name: photo.name });
            }

            // 2. Prepare annotation data
            const assignee = newAnnotationAssignee !== 'unassigned' 
                ? team.find(member => member.uid === newAnnotationAssignee) 
                : null;

            const annotationData: any = {
                text: newAnnotationText,
                author: user.displayName || user.email,
                createdAt: serverTimestamp(),
                status: 'Aberta',
                type: newAnnotationType,
                priority: newAnnotationPriority,
                assignee: assignee ? { uid: assignee.uid, displayName: assignee.displayName } : null,
                photoUrls: photoUrls,
            };
            if (initialCoords) {
                annotationData.coords = initialCoords;
            }

            // 3. Save annotation document
            const newDocRef = await addDoc(collection(db, 'projects', projectId, 'annotations'), annotationData);
            
            // 4. Reset form
            resetAnnotationForm();
            
            toast({ title: "Pendência salva!" });
            onAnnotationSelect(newDocRef.id);
        } catch (error) {
            console.error("Error saving annotation:", error);
            toast({ title: "Erro ao salvar", description: "Não foi possível salvar a pendência.", variant: "destructive"});
        } finally {
            setIsCreatingAnnotation(false);
        }
    };
    
    const handleToggleStatus = async (annotationId: string, currentStatus: Annotation['status']) => {
        if (!projectId) return;
        const newStatus = currentStatus === 'Aberta' ? 'Resolvida' : 'Aberta';
        const annotationDocRef = doc(db, 'projects', projectId, 'annotations', annotationId);
        try {
          await updateDoc(annotationDocRef, { status: newStatus });
          toast({
            title: "Status Atualizado!",
            description: `Pendência marcada como ${newStatus.toLowerCase()}.`
          });
        } catch (error) {
          console.error("Error updating status:", error);
          toast({ title: "Erro", description: "Não foi possível atualizar o status.", variant: "destructive"});
        }
    };

    const handleAssigneeChange = async (annotationId: string, assigneeUid: string) => {
        if (!projectId) return;

        let assigneeData: { uid: string, displayName: string } | null = null;

        if (assigneeUid !== 'unassigned') {
            const assignee = team.find(member => member.uid === assigneeUid);
            if (!assignee) {
                toast({ title: "Erro", description: "Membro da equipa não encontrado.", variant: "destructive"});
                return;
            }
            assigneeData = { uid: assignee.uid, displayName: assignee.displayName };
        }
        
        const annotationDocRef = doc(db, 'projects', projectId, 'annotations', annotationId);
        try {
          await updateDoc(annotationDocRef, { 
              assignee: assigneeData
          });
          toast({
            title: "Responsável Atribuído!",
            description: assigneeData ? `A pendência foi atribuída a ${assigneeData.displayName}.` : "A pendência foi marcada como não atribuída."
          });
        } catch (error) {
          console.error("Error updating assignee:", error);
          toast({ title: "Erro", description: "Não foi possível atribuir o responsável.", variant: "destructive"});
        }
    };
    
     const handleSaveComment = async () => {
        if (!newCommentText.trim() && !commentImageFile) {
            toast({ title: "Comentário vazio", description: "Escreva um comentário ou anexe uma imagem.", variant: "destructive"});
            return;
        }
        if (!user || !projectId || !selectedAnnotationId) return;
        const token = await user?.getIdToken(true);
        if (!token) return;

        setIsSavingComment(true);
        try {
            const commentData: {
                text: string;
                author: string;
                authorInitials: string;
                createdAt: any;
                imageUrl?: string;
            } = {
                text: newCommentText,
                author: user.displayName || user.email!,
                authorInitials: getInitials(user.displayName || user.email!),
                createdAt: serverTimestamp(),
            };

            if (commentImageFile) {
                const imageId = uuidv4();
                const imageRef = ref(storage, `projects/${projectId}/annotations/${selectedAnnotationId}/${imageId}`);
                const uploadTask = await uploadBytesResumable(imageRef, commentImageFile);
                const downloadURL = await getDownloadURL(uploadTask.ref);
                if (downloadURL) {
                    commentData.imageUrl = downloadURL;
                }
            }

            await addDoc(collection(db, 'projects', projectId, 'annotations', selectedAnnotationId, 'comments'), commentData);

            setNewCommentText('');
            setCommentImageFile(null);
            if (commentPhotoInputRef.current) {
                commentPhotoInputRef.current.value = "";
            }
        } catch (error) {
            console.error("Error saving comment:", error);
            toast({ title: "Erro ao salvar", description: "Não foi possível salvar o comentário.", variant: "destructive"});
        } finally {
            setIsSavingComment(false);
        }
      };
      
      const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.type.startsWith('image/')) {
            setCommentImageFile(file);
          } else {
            toast({ title: 'Tipo de arquivo inválido', description: 'Por favor, selecione um arquivo de imagem.', variant: 'destructive' });
          }
        }
      };
      
      const handleAnnotationPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setNewAnnotationPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
        }
      };

      const removeNewAnnotationPhoto = (index: number) => {
        setNewAnnotationPhotos(prev => prev.filter((_, i) => i !== index));
      };
      
    const handleShareViaWhatsapp = () => {
        if (!newAnnotationText.trim()) {
            toast({ title: 'Pendência vazia', description: 'Preencha a descrição antes de partilhar.', variant: 'destructive' });
            return;
        }

        const assignee = team.find(member => member.uid === newAnnotationAssignee);
        
        let message = `*NOVA PENDÊNCIA (PROJETO: ${projectId})*\n\n`;
        message += `*Descrição:* ${newAnnotationText}\n`;
        message += `*Prioridade:* ${newAnnotationPriority}\n`;
        message += `*Tipo:* ${newAnnotationType}\n`;
        if (assignee) {
            message += `*Responsável:* ${assignee.displayName}\n`;
        }
        if (initialCoords) {
            message += `*Localização:* Ponto 3D anexado.\n`;
        }
        if (newAnnotationPhotos.length > 0) {
             message += `*Anexos:* ${newAnnotationPhotos.length} foto(s).\n`;
        }
        message += `\n_Mensagem gerada via Profundidade._`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const renderAnnotationDetails = () => {
        if (!selectedAnnotationId) return null;

        const annotation = annotations.find(a => a.id === selectedAnnotationId);
        if (!annotation) return null;

        return (
             <Card>
                <CardHeader>
                    <div className='flex justify-between items-start'>
                        <CardTitle className="text-lg">Detalhes da Pendência</CardTitle>
                        <Badge variant={annotation.status === 'Aberta' ? 'destructive' : 'default'}>
                            {annotation.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-3 pb-4 border-b">
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                        <Badge variant={getPriorityVariant(annotation.priority)}>{annotation.priority}</Badge>
                                        <Badge variant="outline">{annotation.type}</Badge>
                                        {annotation.coords && <Badge variant="secondary"><MapPin className='mr-1 h-3 w-3'/>Modelo 3D</Badge>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                                        <Select value={annotation.assignee?.uid || 'unassigned'} onValueChange={(value) => handleAssigneeChange(annotation.id, value)}>
                                            <SelectTrigger className="h-8 text-xs w-auto">
                                                <SelectValue placeholder="Atribuir..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">Não atribuído</SelectItem>
                                                {team.map(member => (
                                                    <SelectItem key={member.uid} value={member.uid}>{member.displayName}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">{annotation.author} - {annotation.createdAt?.toDate().toLocaleString()}</p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleStatus(selectedAnnotationId, annotation.status);
                                    }}
                                >
                                    {annotation.status === 'Aberta' ? 'Resolver' : 'Reabrir'}
                                </Button>
                            </div>
                            <p className="text-md whitespace-pre-wrap pt-2">{annotation.text}</p>
                            {annotation.photoUrls && annotation.photoUrls.length > 0 && (
                                <div className="pt-2">
                                    <h4 className="font-semibold text-sm mb-2">Anexos:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {annotation.photoUrls.map((photo: { url: string; name: string }, index: number) => (
                                            <a href={photo.url} key={index} target="_blank" rel="noopener noreferrer">
                                                <Image src={photo.url} alt={photo.name} width={100} height={100} className="object-cover rounded-md aspect-square hover:opacity-80 transition-opacity"/>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <h4 className="font-semibold text-sm pt-4 border-t mt-4">Comentários</h4>
                        {loadingComments ? (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <ScrollArea className="h-[200px] pr-4">
                                <div className="space-y-4">
                                    {comments.map(comment => (
                                    <div key={comment.id} className="flex items-start gap-3">
                                        <Avatar className="h-8 w-8 text-xs">
                                        <AvatarFallback>{getInitials((comment as any).authorInitials || comment.author)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 bg-secondary p-3 rounded-md">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold text-sm">{comment.author}</p>
                                            <p className="text-xs text-muted-foreground">{comment.createdAt?.toDate ? format(comment.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : ''}</p>
                                        </div>
                                        {comment.imageUrl && (
                                            <div className="mt-2">
                                                <a href={comment.imageUrl} target="_blank" rel="noopener noreferrer">
                                                    <Image src={comment.imageUrl} alt="Anexo do comentário" width={200} height={150} className="rounded-md object-cover cursor-pointer hover:opacity-90" />
                                                </a>
                                            </div>
                                        )}
                                        <p className="text-sm mt-1 whitespace-pre-wrap">{comment.text}</p>
                                        </div>
                                    </div>
                                    ))}
                                    {comments.length === 0 && (
                                    <p className="text-sm text-center text-muted-foreground py-2">Nenhum comentário ainda. Seja o primeiro a responder.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        )}

                        <div className="mt-4 space-y-2">
                            {commentImageFile && (
                                <div className="relative w-24 h-24">
                                <Image src={URL.createObjectURL(commentImageFile)} alt="Pré-visualização" fill={true} className="rounded-md object-cover" />
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                    onClick={() => setCommentImageFile(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                                </div>
                            )}
                            <div className="flex items-start gap-2">
                                <Textarea
                                    placeholder="Adicionar um comentário..."
                                    className="flex-1"
                                    value={newCommentText}
                                    onChange={(e) => setNewCommentText(e.target.value)}
                                    disabled={isSavingComment}
                                    rows={2}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSaveComment();
                                        }
                                    }}
                                />
                                <div className="flex flex-col gap-2">
                                    <Button size="icon" variant="outline" onClick={() => commentPhotoInputRef.current?.click()} disabled={isSavingComment} aria-label="Anexar imagem">
                                        <Paperclip className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" onClick={handleSaveComment} disabled={isSavingComment || (!newCommentText.trim() && !commentImageFile)} aria-label="Enviar comentário">
                                        {isSavingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <Input type="file" accept="image/*" ref={commentPhotoInputRef} onChange={handleCommentImageSelect} className="hidden" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="p-4 space-y-4">
             {renderAnnotationDetails()}
            
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    resetAnnotationForm();
                }
                setIsCreateDialogOpen(open);
            }}>
                 <Card>
                     <Tabs defaultValue="open" className="w-full" onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
                        <CardHeader className="pt-4">
                            <div className="flex justify-between items-start">
                                 <CardTitle className="text-lg flex items-center">
                                    <ListChecks className="mr-2 h-5 w-5" />
                                    Lista de Pendências
                                </CardTitle>
                                <DialogTrigger asChild>
                                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4"/>
                                        Nova Pendência
                                    </Button>
                                </DialogTrigger>
                            </div>
                            <TabsList className="grid w-full grid-cols-4 mt-4">
                                 <TabsTrigger value="mine">
                                    <User className="mr-2 h-4 w-4" />
                                    Minhas <Badge variant="secondary" className="ml-2">{annotationCounts.mine}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="open">
                                    Abertas <Badge variant="destructive" className="ml-2">{annotationCounts.open}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="resolved">
                                    Resolvidas <Badge variant="default" className="ml-2">{annotationCounts.resolved}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="all">
                                    Todas <Badge className="ml-2">{annotationCounts.all}</Badge>
                                </TabsTrigger>
                            </TabsList>
                        </CardHeader>

                        <CardContent>
                        <ScrollArea className="h-[400px] pr-2">
                            <div className="space-y-3">
                            {loadingAnnotations ? (
                                <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin"/></div>
                            ) : filteredAnnotations.length === 0 ? (
                                <div className="text-center text-muted-foreground text-sm py-8">
                                    <MessageCircle className="mx-auto h-6 w-6 mb-2" />
                                    Nenhuma pendência nesta categoria.
                                </div>
                            ) : (
                                filteredAnnotations.map(note => (
                                    <div
                                        key={note.id}
                                        onClick={() => onAnnotationSelect(note.id)}
                                        className={cn(
                                            "text-sm p-3 bg-background rounded-md cursor-pointer transition-all space-y-2 border-l-4",
                                            note.status === 'Aberta' ? 'border-destructive' : 'border-green-500',
                                            selectedAnnotationId === note.id && "bg-primary/10 ring-1 ring-primary"
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">{note.text}</p>
                                                <p className="text-xs text-muted-foreground">{note.author} - {note.createdAt?.toDate().toLocaleDateString()}</p>
                                            </div>
                                            <Badge variant={getPriorityVariant(note.priority)}>{note.priority}</Badge>
                                        </div>
                                         {note.assignee && (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarFallback className="text-xs">{getInitials(note.assignee.displayName)}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-medium text-muted-foreground">{note.assignee.displayName}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            </div>
                        </ScrollArea>
                        </CardContent>
                    </Tabs>
                </Card>

                 <DialogContent className="sm:max-w-xl">
                     <DialogHeader>
                        <DialogTitle>Criar Nova Pendência</DialogTitle>
                         {initialCoords && (
                            <DialogDescription className='flex items-center gap-1 text-green-600'>
                                <MapPin className='h-4 w-4'/> Ponto 3D selecionado.
                            </DialogDescription>
                        )}
                    </DialogHeader>
                     <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                        <div className="space-y-2">
                            <Label htmlFor="new-annotation">Descrição</Label>
                            <Textarea
                                id="new-annotation"
                                placeholder="Ex: Fissura encontrada na parede da sala de reuniões do 2º andar."
                                value={newAnnotationText}
                                onChange={(e) => setNewAnnotationText(e.target.value)}
                                disabled={isCreatingAnnotation}
                                rows={3}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Anexar Fotos</Label>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => annotationPhotoInputRef.current?.click()} disabled={isCreatingAnnotation}>
                                    <ImagePlus className="mr-2 h-4 w-4"/> Adicionar
                                </Button>
                                <input type="file" ref={annotationPhotoInputRef} className="hidden" multiple accept="image/*" onChange={handleAnnotationPhotoSelect} />
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {newAnnotationPhotos.map((photo, index) => (
                                    <div key={index} className="relative w-16 h-16">
                                        <Image src={URL.createObjectURL(photo)} alt={photo.name} fill className="object-cover rounded-md" />
                                        <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 rounded-full" onClick={() => removeNewAnnotationPhoto(index)}>
                                            <Trash2 className="h-3 w-3"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="annotation-type">Tipo</Label>
                                <Select value={newAnnotationType} onValueChange={(value: AnnotationType) => setNewAnnotationType(value)}>
                                    <SelectTrigger id="annotation-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Geral">Geral</SelectItem>
                                        <SelectItem value="Segurança">Segurança</SelectItem>
                                        <SelectItem value="Elétrica">Elétrica</SelectItem>
                                        <SelectItem value="Hidráulica">Hidráulica</SelectItem>
                                        <SelectItem value="Estrutural">Estrutural</SelectItem>
                                        <SelectItem value="Acabamento">Acabamento</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="annotation-priority">Prioridade</Label>
                                <Select value={newAnnotationPriority} onValueChange={(value: AnnotationPriority) => setNewAnnotationPriority(value)}>
                                    <SelectTrigger id="annotation-priority">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Baixa">Baixa</SelectItem>
                                        <SelectItem value="Média">Média</SelectItem>
                                        <SelectItem value="Alta">Alta</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="annotation-assignee">Responsável</Label>
                            <Select value={newAnnotationAssignee} onValueChange={setNewAnnotationAssignee}>
                                <SelectTrigger id="annotation-assignee">
                                    <SelectValue placeholder="Atribuir a..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                                    {team.map(member => (
                                        <SelectItem key={member.uid} value={member.uid}>{member.displayName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {initialCoords && (
                            <Button variant="ghost" size="sm" onClick={onCoordsClear}>
                                <X className='mr-2 h-4 w-4' /> Remover ponto 3D
                            </Button>
                        )}
                    </div>
                    <DialogFooter className="gap-2 sm:justify-between">
                        <Button variant="outline" onClick={handleShareViaWhatsapp}>
                            <WhatsAppIcon className="h-4 w-4 mr-2" />
                            Partilhar via WhatsApp
                        </Button>
                        <div className="flex gap-2">
                             <Button variant="ghost" onClick={resetAnnotationForm}>Cancelar</Button>
                             <Button onClick={handleSaveAnnotation} disabled={isCreatingAnnotation}>
                                {isCreatingAnnotation ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                                {isCreatingAnnotation ? 'Salvando...' : 'Salvar Pendência'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

    
    
    