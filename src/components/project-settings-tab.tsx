'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Save, UploadCloud, Trash2, AlertTriangle, HelpCircle, Send } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { Progress } from './ui/progress';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { deleteProject } from '@/actions/projects';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface ProjectSettingsTabProps {
    projectId: string;
    userRole: string | null;
}

export default function ProjectSettingsTab({ projectId, userRole }: ProjectSettingsTabProps) {
    const { idToken } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    
    const [projectName, setProjectName] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    // State for client invitation
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [inviteName, setInviteName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);


    const canEdit = userRole === 'Gestor';

    useEffect(() => {
        const fetchSettings = async () => {
            if (!projectId) return;
            setIsLoading(true);
            try {
                const projectRef = doc(db, 'projects', projectId);
                const projectSnap = await getDoc(projectRef);
                if (projectSnap.exists()) {
                    const data = projectSnap.data();
                    setProjectName(data.name || '');
                    setWebhookUrl(data.webhookUrl || '');
                    setClientName(data.clientName || '');
                    setClientEmail(data.clientEmail || '');
                    setImageUrl(data.imageUrl || '');
                    setImagePreview(data.imageUrl || null);
                }
            } catch (error) {
                console.error("Error fetching project settings: ", error);
                toast({ title: 'Erro ao carregar definições', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [projectId, toast]);
    
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setImageUrl(''); 
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    const uploadImage = async (): Promise<string> => {
        if (!imageFile || !idToken) return imageUrl;
        
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('path', `projects/${projectId}/cover`);

        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha no upload da imagem.');
        }

        const { url } = await response.json();
        return url;
    };

    const handleSaveGeneralSettings = async () => {
        if (!canEdit || !idToken) return;

        setIsSaving(true);
        setUploadProgress(null);
        try {
            let finalImageUrl = imageUrl;
            if (imageFile) {
                finalImageUrl = await uploadImage();
            } else if (!imagePreview) {
                finalImageUrl = '';
            }

            const response = await fetch(`/api/projects/${projectId}/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ 
                    projectName,
                    webhookUrl, 
                    imageUrl: finalImageUrl,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao guardar definições.');
            }
            
            toast({ title: 'Definições guardadas com sucesso!' });
            setImageUrl(finalImageUrl);
            setImageFile(null);

        } catch (error: any) {
            toast({ title: 'Erro ao guardar', description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
            setUploadProgress(null);
        }
    };
    
    const handleDeleteProject = async () => {
        if (!canEdit) return;
        setIsDeleting(true);
        try {
            const result = await deleteProject(projectId);
            if (!result.success) {
                 throw new Error(result.message || 'Falha ao eliminar o projeto.');
            }
            
            toast({ title: 'Projeto eliminado com sucesso!', description: 'Você será redirecionado para o dashboard.' });
            router.push('/dashboard');

        } catch (error: any) {
            toast({ title: 'Erro ao eliminar projeto', description: error.message, variant: 'destructive' });
            setIsDeleting(false);
        }
    };
    
    const handleInviteClient = async () => {
        if (!canEdit || !idToken) return;
        if (!inviteName.trim() || !inviteEmail.trim()) {
            toast({ title: "Nome e Email são obrigatórios.", variant: 'destructive' });
            return;
        }

        setIsInviting(true);
        try {
             const response = await fetch(`/api/projects/${projectId}/invite-client`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ name: inviteName, email: inviteEmail }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Falha ao convidar cliente.');
            }
            toast({ title: 'Sucesso!', description: result.message, duration: 9000 });
            setClientName(inviteName);
            setClientEmail(inviteEmail);
            setIsInviteDialogOpen(false);
            setInviteName('');
            setInviteEmail('');
        } catch (error: any) {
             toast({ title: 'Erro ao convidar', description: error.message, variant: 'destructive' });
        } finally {
            setIsInviting(false);
        }
    };

    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Definições do Projeto</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs">Gira as informações centrais do seu projeto, como nome, dados do cliente e integrações. Apenas o Gestor do projeto pode alterar estas definições.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardTitle>
                <CardDescription>
                    Configure o nome, cliente, integrações e outras definições específicas deste projeto.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <fieldset className="border p-4 rounded-lg space-y-4">
                            <legend className="font-semibold px-1 text-lg">Informações Gerais</legend>
                             <div className="space-y-2">
                                <Label htmlFor="project-name">Nome do Projeto</Label>
                                <Input
                                    id="project-name"
                                    placeholder="Nome do seu projeto"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    disabled={!canEdit || isSaving}
                                />
                            </div>
                             <div className="space-y-2">
                                <Label>Imagem de Capa</Label>
                                {imagePreview ? (
                                    <div className="relative w-full max-w-md aspect-video">
                                        <Image src={imagePreview} alt="Pré-visualização da imagem" fill className="object-cover rounded-md border" />
                                        {canEdit && (
                                            <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={removeImage} disabled={isSaving}>
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div 
                                        className="border-2 border-dashed border-muted-foreground/50 rounded-md p-6 text-center cursor-pointer hover:bg-muted"
                                        onClick={() => canEdit && !isSaving && fileInputRef.current?.click()}
                                    >
                                        <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <p className="mt-2 text-sm text-muted-foreground">Clique para carregar uma imagem (JPG, PNG)</p>
                                    </div>
                                )}
                                <Input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleImageSelect} disabled={!canEdit || isSaving}/>
                                {uploadProgress !== null && (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">A carregar...</p>
                                        <Progress value={uploadProgress} />
                                    </div>
                                )}
                            </div>
                        </fieldset>

                        <fieldset className="border p-4 rounded-lg space-y-4">
                            <legend className="font-semibold px-1 text-lg">Portal do Cliente</legend>
                             {clientName ? (
                                <div className="space-y-2">
                                    <p className="text-sm"><span className="font-semibold">Cliente Atribuído:</span> {clientName} ({clientEmail})</p>
                                    {canEdit && <Button variant="outline" size="sm" onClick={() => setIsInviteDialogOpen(true)}>Alterar Cliente</Button>}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Nenhum cliente atribuído a este projeto.</p>
                                    {canEdit && <Button onClick={() => setIsInviteDialogOpen(true)}>Convidar Cliente</Button>}
                                </div>
                            )}
                        </fieldset>

                        <fieldset className="border p-4 rounded-lg">
                            <legend className="font-semibold px-1 text-lg">Integrações</legend>
                             <div className="space-y-2">
                                <Label htmlFor="webhook-url">URL do Webhook para Notificações</Label>
                                <Input
                                    id="webhook-url"
                                    placeholder="Cole aqui o URL do canal do Slack ou Teams"
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    disabled={!canEdit || isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Isto enviará notificações (ex: novos RDOs) para o canal configurado.
                                </p>
                            </div>
                        </fieldset>
                        
                        {canEdit && (
                             <div className="flex justify-end pt-6">
                                <Button onClick={handleSaveGeneralSettings} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                    Guardar Definições Gerais
                                </Button>
                            </div>
                        )}
                        
                         {canEdit && (
                            <fieldset className="border border-destructive/50 p-4 rounded-lg mt-8">
                                <legend className="font-semibold px-1 text-lg text-destructive flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5"/>
                                    Zona de Perigo
                                </legend>
                                <div className="flex flex-col sm:flex-row justify-between items-center pt-2 gap-4">
                                    <div>
                                        <h4 className="font-semibold">Eliminar este projeto</h4>
                                        <p className="text-sm text-muted-foreground">Esta ação é irreversível e irá remover todos os dados associados.</p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="destructive" disabled={isDeleting}>
                                                {isDeleting ? <Loader2 className="animate-spin mr-2"/> : <Trash2 className="mr-2"/>}
                                                Eliminar Projeto
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                   Esta ação irá eliminar permanentemente o projeto "{projectName}" e todos os seus dados (EAP, finanças, documentos, etc.). Esta ação não pode ser desfeita.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive hover:bg-destructive/90">
                                                    Sim, eliminar este projeto
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </fieldset>
                        )}
                    </div>
                )}
            </CardContent>
             <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Convidar Cliente para o Portal</DialogTitle>
                         <DialogDescription>
                            Insira os dados do cliente. Se já tiver uma conta, a sua função será atualizada. Se não, uma nova conta será criada.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="invite-name">Nome do Cliente</Label>
                            <Input id="invite-name" value={inviteName} onChange={e => setInviteName(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="invite-email">Email do Cliente</Label>
                            <Input id="invite-email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsInviteDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleInviteClient} disabled={isInviting}>
                            {isInviting ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2 h-4 w-4"/>}
                            {isInviting ? 'A convidar...' : 'Convidar Cliente'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
             </Dialog>
        </Card>
    );
}