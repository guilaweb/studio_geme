
'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, where, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Send, FileText, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole, TeamMember } from '@/app/projects/[id]/page';
import type { Transmittal, TransmittalStatus, TransmittalHistoryItem } from '@/types/collaboration';
import type { DocumentListItem, ProjectFile } from '@/types/documents';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface TransmittalsTabProps {
    projectId: string;
    teamMembers: TeamMember[];
    userRole: UserRole | null;
}

export default function TransmittalsTab({ projectId, teamMembers, userRole }: TransmittalsTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    const [transmittals, setTransmittals] = useState<Transmittal[]>([]);
    const [documents, setDocuments] = useState<ProjectFile[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state for new transmittal
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [subject, setSubject] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({});
    const [selectedRecipients, setSelectedRecipients] = useState<Record<string, boolean>>({});

    // Form state for responding to a transmittal
    const [responseNotes, setResponseNotes] = useState('');
    const [newStatus, setNewStatus] = useState<TransmittalStatus>('Aprovado');
    const [isResponding, setIsResponding] = useState(false);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);

        const transmittalsQuery = query(collection(db, 'projects', projectId, 'transmittals'), orderBy('createdAt', 'desc'));
        const docsQuery = query(collection(db, 'projects', projectId, 'documents'), where('type', '==', 'file'));

        const unsubTransmittals = onSnapshot(transmittalsQuery, (snapshot) => {
            const fetchedTransmittals = snapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    ...data,
                    // Ensure dates are converted
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    history: (data.history || []).map((h: any) => ({
                        ...h,
                        updatedAt: (h.updatedAt as any)?.toDate ? (h.updatedAt as any).toDate() : new Date(),
                    }))
                } as Transmittal;
            });
            setTransmittals(fetchedTransmittals);
        }, (error) => {
            console.error("Error fetching transmittals:", error);
            toast({ title: 'Erro ao carregar submissões', variant: 'destructive' });
        });

        const unsubDocs = onSnapshot(docsQuery, (snapshot) => {
            setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectFile)));
        }, (error) => {
            console.error("Error fetching documents:", error);
            toast({ title: 'Erro ao carregar documentos', variant: 'destructive' });
        });

        const timer = setTimeout(() => setLoading(false), 1500); 

        return () => {
            unsubTransmittals();
            unsubDocs();
            clearTimeout(timer);
        };
    }, [projectId, toast]);
    
    const resetForm = () => {
        setSubject('');
        setNotes('');
        setSelectedDocs({});
        setSelectedRecipients({});
        setIsDialogOpen(false);
    };

    const handleSubmit = async () => {
        if (!canEdit || !user || !idToken) return;
        const docIds = Object.keys(selectedDocs).filter(id => selectedDocs[id]);
        const recipientIds = Object.keys(selectedRecipients).filter(id => selectedRecipients[id]);

        if (!subject.trim() || docIds.length === 0 || recipientIds.length === 0) {
            toast({ title: 'Campos em falta', description: 'Assunto, pelo menos um documento e um destinatário são obrigatórios.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const transmittalData = {
                subject,
                notes,
                status: 'Enviado',
                from: {
                    uid: user.uid,
                    displayName: user.displayName,
                },
                to: recipientIds.map(id => teamMembers.find(m => m.uid === id)).filter(Boolean),
                items: docIds.map(id => {
                    const doc = documents.find(d => d.id === id);
                    return { fileId: id, fileName: doc?.name || '', version: 1 }; // Versioning is simplified for now
                }),
            };
            
            const response = await fetch(`/api/projects/${projectId}/transmittals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify(transmittalData),
            });

            if (!response.ok) throw new Error('Falha ao enviar submissão.');

            toast({ title: 'Submissão enviada com sucesso!' });
            resetForm();
        } catch (error) {
            console.error('Error creating transmittal:', error);
            toast({ title: 'Erro ao enviar submissão', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRespond = async (transmittalId: string) => {
        if (!user || !idToken) return;
        if (!responseNotes.trim()) {
            toast({ title: 'Notas obrigatórias', description: 'Por favor, adicione uma nota à sua resposta.', variant: 'destructive' });
            return;
        }

        setIsResponding(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/transmittals/${transmittalId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ status: newStatus, notes: responseNotes }),
            });

            if (!response.ok) throw new Error('Falha ao responder à submissão.');

            toast({ title: 'Resposta enviada com sucesso!' });
            setResponseNotes('');
        } catch (error: any) {
            toast({ title: 'Erro ao responder', description: error.message, variant: 'destructive' });
        } finally {
            setIsResponding(false);
        }
    };
    
    const getStatusVariant = (status: TransmittalStatus) => {
        switch(status) {
            case 'Aprovado': return 'default';
            case 'Enviado': return 'secondary';
            case 'Em Revisão': return 'outline';
            case 'Rejeitado':
            case 'Aprovado com Comentários':
                return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary"/> Submissões (Transmittals)</CardTitle>
                        <CardDescription>Gira o fluxo formal de envio e aprovação de documentos.</CardDescription>
                    </div>
                    {canEdit && (
                         <DialogTrigger asChild>
                            <Button><Plus className="mr-2"/> Nova Submissão</Button>
                        </DialogTrigger>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> : (
                         <Accordion type="single" collapsible className="w-full">
                            {transmittals.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center p-4">Nenhuma submissão criada ainda.</p>
                            ) : (
                                transmittals.map(item => (
                                    <AccordionItem value={item.id} key={item.id}>
                                        <AccordionTrigger>
                                            <div className="flex justify-between items-center w-full pr-4">
                                                <div>
                                                    <p className="font-semibold text-base text-left">{item.subject}</p>
                                                    <p className="text-xs text-muted-foreground text-left">De: {item.from.displayName}</p>
                                                </div>
                                                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 space-y-4">
                                            <div>
                                                <h4 className="font-semibold text-sm">Documentos Enviados</h4>
                                                <ul className="list-disc pl-5 mt-1 text-sm text-muted-foreground">
                                                    {item.items.map(doc => {
                                                        const docFile = documents.find(d => d.id === doc.fileId);
                                                        const docUrl = docFile?.versions?.find(v => v.version === doc.version)?.url || docFile?.versions?.[docFile.versions.length - 1]?.url;
                                                        return (
                                                            <li key={doc.fileId}>
                                                                <a href={docUrl || '#'} target="_blank" rel="noopener noreferrer" className="hover:underline">{doc.fileName}</a> (v{doc.version})
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm">Destinatários</h4>
                                                <p className="text-sm text-muted-foreground">{item.to.map(t => t.displayName).join(', ')}</p>
                                            </div>
                                            {item.notes && (
                                                 <div>
                                                    <h4 className="font-semibold text-sm">Notas Originais</h4>
                                                    <p className="text-sm whitespace-pre-wrap text-muted-foreground bg-secondary p-2 rounded-md">{item.notes}</p>
                                                </div>
                                            )}
                                            <div className="border-t pt-4">
                                                <h4 className="font-semibold text-sm mb-2">Histórico de Revisões</h4>
                                                <div className="space-y-3">
                                                    {item.history.map((h, idx) => (
                                                        <div key={idx} className="flex items-start gap-3">
                                                            <div className="flex flex-col items-center">
                                                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{idx + 1}</div>
                                                                {idx < item.history.length - 1 && <div className="w-px h-8 bg-border" />}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">{h.status}</p>
                                                                <p className="text-xs text-muted-foreground">{h.updatedBy.displayName} - {h.updatedAt ? format(h.updatedAt, 'dd/MM/yyyy HH:mm') : 'N/A'}</p>
                                                                {h.notes && <p className="text-sm mt-1 bg-secondary p-2 rounded-md">{h.notes}</p>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            {item.to.some(t => t.uid === user?.uid) && item.status !== 'Aprovado' && item.status !== 'Rejeitado' && (
                                                <div className="border-t pt-4 space-y-3">
                                                    <h4 className="font-semibold text-sm">Adicionar Resposta</h4>
                                                    <Textarea placeholder="Comentários sobre a revisão..." value={responseNotes} onChange={e => setResponseNotes(e.target.value)} />
                                                    <div className="flex justify-between items-center">
                                                        <Select value={newStatus} onValueChange={v => setNewStatus(v as TransmittalStatus)}>
                                                            <SelectTrigger className="w-[250px]"><SelectValue/></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Aprovado">Aprovado</SelectItem>
                                                                <SelectItem value="Aprovado com Comentários">Aprovado com Comentários</SelectItem>
                                                                <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                                                                <SelectItem value="Em Revisão">Marcar como "Em Revisão"</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Button onClick={() => handleRespond(item.id)} disabled={isResponding}>
                                                            {isResponding ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2"/>} Enviar Resposta
                                                        </Button>
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

             <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Criar Nova Submissão</DialogTitle>
                    <DialogDescription>Selecione os documentos e destinatários para enviar para revisão.</DialogDescription>
                </DialogHeader>
                <div className="py-4 grid gap-6 max-h-[70vh] overflow-y-auto px-2">
                    <div className="space-y-2">
                        <Label htmlFor="subject">Assunto</Label>
                        <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Plantas de Arquitetura para Aprovação" />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Documentos a Enviar</Label>
                             <div className="p-2 border rounded-md max-h-60 overflow-y-auto">
                                {documents.length === 0 ? <p className="text-sm text-muted-foreground p-2">Nenhum documento no projeto.</p> :
                                documents.map(doc => (
                                    <div key={doc.id} className="flex items-center space-x-2 p-1">
                                        <Checkbox id={`doc-${doc.id}`} checked={selectedDocs[doc.id] || false} onCheckedChange={(checked) => setSelectedDocs(prev => ({ ...prev, [doc.id]: !!checked }))} />
                                        <Label htmlFor={`doc-${doc.id}`} className="font-normal cursor-pointer">{doc.name}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label>Enviar Para</Label>
                            <div className="p-2 border rounded-md max-h-60 overflow-y-auto">
                               {teamMembers.filter(m => m.uid !== user?.uid).map(member => (
                                     <div key={member.uid} className="flex items-center space-x-2 p-1">
                                        <Checkbox id={`member-${member.uid}`} checked={selectedRecipients[member.uid] || false} onCheckedChange={(checked) => setSelectedRecipients(prev => ({ ...prev, [member.uid]: !!checked }))} />
                                        <Label htmlFor={`member-${member.uid}`} className="font-normal cursor-pointer">{member.displayName} ({member.role})</Label>
                                    </div>
                               ))}
                            </div>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="notes">Notas / Comentários (Opcional)</Label>
                        <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instruções adicionais para os revisores..." />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                        Enviar Submissão
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
