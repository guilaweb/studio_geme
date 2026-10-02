
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Rfi, RfiStatus } from '@/types/collaboration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, HelpCircle, Send, Paperclip, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from './ui/avatar';
import Image from 'next/image';

interface RfiTabProps {
    projectId: string;
}

const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export default function RfiTab({ projectId }: { projectId: string }) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();

    const [rfis, setRfis] = useState<Rfi[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [subject, setSubject] = useState('');
    const [question, setQuestion] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Response state
    const [responseText, setResponseText] = useState('');
    const [isResponding, setIsResponding] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'rfis'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRfis = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: (doc.data().createdAt as Timestamp),
            } as Rfi));
            setRfis(fetchedRfis);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId]);

    const resetForm = () => {
        setSubject('');
        setQuestion('');
        setAttachments([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsDialogOpen(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };
    
    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmitRfi = async () => {
        if (!user || !idToken) return;
        if (!subject.trim() || !question.trim()) {
            toast({ title: 'Campos obrigatórios em falta', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('subject', subject);
            formData.append('question', question);
            attachments.forEach(file => formData.append('files', file));

            const response = await fetch(`/api/projects/${projectId}/rfis`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` },
                body: formData,
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Falha ao criar RFI.');

            toast({ title: 'RFI submetido com sucesso!' });
            resetForm();
        } catch (error: any) {
            toast({ title: 'Erro ao submeter RFI', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
     const handleAddResponse = async (rfiId: string) => {
        if (!user || !idToken || !responseText.trim()) return;

        setIsResponding(rfiId);
        try {
            const response = await fetch(`/api/projects/${projectId}/rfis/${rfiId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ text: responseText, attachments: [] }), // Attachment in responses can be added later
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Falha ao adicionar resposta.');
            
            toast({ title: 'Resposta enviada!' });
            setResponseText('');
        } catch(error: any) {
            toast({ title: 'Erro ao responder', description: error.message, variant: 'destructive' });
        } finally {
            setIsResponding(null);
        }
    };
    
    const handleStatusChange = async (rfiId: string, status: RfiStatus) => {
        if (!user || !idToken) return;
        try {
            const response = await fetch(`/api/projects/${projectId}/rfis/${rfiId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) throw new Error('Falha ao atualizar o estado.');
            toast({ title: 'Estado do RFI atualizado.' });
        } catch (error) {
            toast({ title: 'Erro ao atualizar estado.', variant: 'destructive' });
        }
    };

    const getStatusVariant = (status: RfiStatus) => {
        switch (status) {
            case 'Aberta': return 'destructive';
            case 'Respondida': return 'secondary';
            case 'Fechada': return 'default';
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Card>
                <CardHeader className="flex-row justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            Respostas Técnicas à Obra (RFI)
                        </CardTitle>
                        <CardDescription>
                            Canal formal para a equipa de obra submeter dúvidas técnicas e obter respostas oficiais.
                        </CardDescription>
                    </div>
                     <DialogTrigger asChild>
                        <Button><Plus className="mr-2"/>Nova Pergunta</Button>
                    </DialogTrigger>
                </CardHeader>
                <CardContent>
                     {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin"/> Carregando...</div> :
                        <Accordion type="single" collapsible className="w-full">
                           {rfis.length === 0 ? <p className="text-sm text-muted-foreground text-center p-4">Nenhuma RFI registada.</p> :
                            rfis.map(rfi => (
                                <AccordionItem value={rfi.id} key={rfi.id}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between items-center w-full pr-4">
                                            <span className="font-semibold text-base text-left">{rfi.subject}</span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={getStatusVariant(rfi.status)}>{rfi.status}</Badge>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 space-y-4">
                                        <div className="p-3 bg-secondary rounded-md space-y-3">
                                            <div className="flex items-start gap-3">
                                                <Avatar className="h-8 w-8 text-xs"><AvatarFallback>{getInitials(rfi.author.displayName)}</AvatarFallback></Avatar>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-sm">{rfi.author.displayName}</p>
                                                    <p className="text-xs text-muted-foreground">{rfi.createdAt?.toDate ? format(rfi.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : ''}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm whitespace-pre-wrap">{rfi.question}</p>
                                            {rfi.attachments && rfi.attachments.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {rfi.attachments.map((file, i) => (
                                                         <Button key={i} size="sm" variant="outline" asChild><a href={file.url} target="_blank" rel="noopener noreferrer"><Paperclip className="h-3 w-3 mr-2"/>{file.name}</a></Button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {rfi.responses.map((res, i) => (
                                            <div key={i} className="ml-8 p-3 bg-background rounded-md space-y-3 border">
                                                <div className="flex items-start gap-3">
                                                     <Avatar className="h-8 w-8 text-xs"><AvatarFallback>{getInitials(res.author.displayName)}</AvatarFallback></Avatar>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-sm">{res.author.displayName}</p>
                                                        <p className="text-xs text-muted-foreground">{res.createdAt?.toDate ? format(res.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : ''}</p>
                                                    </div>
                                                </div>
                                                <p className="text-sm whitespace-pre-wrap">{res.text}</p>
                                            </div>
                                        ))}

                                        {rfi.status !== 'Fechada' && (
                                            <div className="pt-4 border-t">
                                                 <Textarea placeholder="Escreva a sua resposta..." value={responseText} onChange={e => setResponseText(e.target.value)} />
                                                 <div className="flex justify-between mt-2">
                                                    <Button variant="ghost" onClick={() => handleStatusChange(rfi.id, 'Fechada')}>Marcar como Fechada</Button>
                                                    <Button onClick={() => handleAddResponse(rfi.id)} disabled={isResponding === rfi.id || !responseText.trim()}>
                                                        {isResponding === rfi.id && <Loader2 className="animate-spin mr-2"/>}
                                                        Enviar Resposta
                                                    </Button>
                                                 </div>
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            ))
                           }
                        </Accordion>
                    }
                </CardContent>
            </Card>

            <DialogContent className="sm:max-w-xl">
                 <DialogHeader>
                    <DialogTitle>Nova Pergunta / Pedido de Informação</DialogTitle>
                </DialogHeader>
                 <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="subject">Assunto</Label>
                        <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Diâmetro da tubagem de esgoto" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="question">Pergunta / Pedido</Label>
                        <Textarea id="question" value={question} onChange={e => setQuestion(e.target.value)} rows={5} placeholder="Descreva a sua dúvida ou o que precisa de ser esclarecido detalhadamente."/>
                    </div>
                     <div className="space-y-2">
                        <Label>Anexos</Label>
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Paperclip className="mr-2 h-4 w-4"/> Anexar Ficheiros</Button>
                        <input type="file" ref={fileInputRef} multiple onChange={handleFileChange} className="hidden" />
                         <div className="space-y-1">
                            {attachments.map((file, index) => (
                                <div key={index} className="flex items-center justify-between text-sm bg-secondary p-1 rounded-md">
                                    <span>{file.name}</span>
                                    <Button variant="ghost" size="icon" onClick={() => removeAttachment(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                    <Button onClick={handleSubmitRfi} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                        Submeter
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
