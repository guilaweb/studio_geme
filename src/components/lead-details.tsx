
'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Lead, Activity, ActivityType, LeadStatus, STAGES } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Loader2, Send, Check, Phone, Mail, Users, MessageSquare, ArrowRight, XCircle, Info, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from './ui/date-picker';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from './ui/badge';

interface LeadDetailsProps {
    lead: Lead;
    activities: Activity[];
    users: any[];
}

const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const toDateObj = (d: any): Date | null => {
    if (!d) return null;
    if (typeof d.toDate === 'function') return d.toDate();
    if (d instanceof Date) return d;
    try {
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
};

const ActivityIcon = ({ type }: { type: ActivityType }) => {
    switch (type) {
        case 'Chamada': return <Phone className="h-4 w-4 text-muted-foreground" />;
        case 'Reunião': return <Users className="h-4 w-4 text-muted-foreground" />;
        case 'Email': return <Mail className="h-4 w-4 text-muted-foreground" />;
        default: return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
};

export function LeadDetails({ lead, activities, users }: LeadDetailsProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const [newActivityText, setNewActivityText] = useState('');
    const [newActivityType, setNewActivityType] = useState<ActivityType>('Outro');
    const [newActivityAssigneeId, setNewActivityAssigneeId] = useState<string>('');
    const [newActivityDueDate, setNewActivityDueDate] = useState<Date | undefined>();
    const [isSaving, setIsSaving] = useState(false);

    const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
    const [opportunityValue, setOpportunityValue] = useState('');
    const [isConverting, setIsConverting] = useState(false);

    const handleAddActivity = async () => {
        if (!newActivityText.trim() || !user) return;
        setIsSaving(true);
        try {
            const assignee = users.find(u => u.uid === newActivityAssigneeId);

            await addDoc(collection(db, 'leads', lead.id, 'activities'), {
                text: newActivityText,
                type: newActivityType,
                status: 'Pendente',
                dueDate: newActivityDueDate,
                assignee: assignee ? { uid: assignee.uid, displayName: assignee.displayName } : null,
                createdAt: serverTimestamp(),
                author: {
                    uid: user.uid,
                    displayName: user.displayName || user.email,
                },
            });

            // Atualizar última interação no lead
            await updateDoc(doc(db, 'leads', lead.id), {
                lastInteraction: serverTimestamp(),
                nextActivity: newActivityDueDate ? `${newActivityType}: ${newActivityText.substring(0, 30)}` : undefined,
            });

            setNewActivityText('');
            setNewActivityType('Outro');
            setNewActivityAssigneeId('');
            setNewActivityDueDate(undefined);
            toast({ title: "Atividade registada!" });
        } catch (error) {
            toast({ title: "Erro ao adicionar tarefa", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleMarkAsDone = async (activityId: string) => {
        try {
            const activityRef = doc(db, 'leads', lead.id, 'activities', activityId);
            await updateDoc(activityRef, {
                status: 'Concluída',
                completedAt: serverTimestamp(),
            });
            await updateDoc(doc(db, 'leads', lead.id), {
                lastInteraction: serverTimestamp(),
            });
            toast({ title: "Tarefa concluída!" });
        } catch (error) {
            console.error("Error completing activity: ", error);
            toast({ title: "Erro ao concluir tarefa", variant: "destructive" });
        }
    };

    const handleStatusChange = async (status: LeadStatus) => {
        try {
            const leadRef = doc(db, 'leads', lead.id);
            await updateDoc(leadRef, {
                status,
                lastInteraction: serverTimestamp(),
            });
            toast({ title: `Estado do Lead atualizado para "${status}"` });
        } catch (error: any) {
            console.error("Error updating lead status:", error);
            toast({ title: 'Erro ao atualizar estado', variant: 'destructive' });
        }
    };
    
    const handleConvertLead = async () => {
        if (!opportunityValue) {
            toast({ title: "Valor da oportunidade é obrigatório", variant: "destructive" });
            return;
        }
        if (!user) return;

        setIsConverting(true);
        const batch = writeBatch(db);
        try {
            const clientCompanyName = lead.company?.trim() || lead.name.trim();

            // 1. Check for an existing account or create a new one
            const accountsRef = collection(db, 'accounts');
            const q = query(accountsRef, where("name", "==", clientCompanyName));
            const querySnapshot = await getDocs(q);
            
            let accountId: string;
            if (querySnapshot.empty) {
                // No account exists, create a new one
                const newAccountRef = doc(collection(db, 'accounts'));
                accountId = newAccountRef.id;
                batch.set(newAccountRef, {
                    name: clientCompanyName,
                    industry: lead.industry || 'Construção Civil',
                    phone: lead.phone || '',
                    email: lead.email || '',
                    address: lead.location || '',
                    website: '',
                    status: 'Ativo',
                    rating: 'Frequente',
                    contacts: [{
                        id: crypto.randomUUID(),
                        name: lead.name,
                        email: lead.email,
                        phone: lead.phone,
                        role: lead.role || 'Contacto Principal',
                        isPrimary: true,
                    }],
                    createdAt: serverTimestamp(),
                    author: {
                        uid: user.uid,
                        displayName: user.displayName || user.email,
                    }
                });
            } else {
                accountId = querySnapshot.docs[0].id;
            }

            // 2. Create a new opportunity and link it to the account
            const newOppRef = doc(collection(db, 'opportunities'));
            const oppTitle = lead.interest 
                ? `${lead.interest} - ${clientCompanyName}`
                : `Oportunidade - ${clientCompanyName}`;

            batch.set(newOppRef, {
                name: oppTitle,
                accountId: accountId,
                accountName: clientCompanyName,
                value: parseFloat(opportunityValue),
                stage: STAGES[0],
                probability: 20,
                createdAt: serverTimestamp(),
                author: { uid: user.uid, displayName: user.displayName || user.email },
                sourceLeadId: lead.id,
                origin: lead.source || 'Lead Comercial',
                contactName: lead.name,
                contactEmail: lead.email,
                contactPhone: lead.phone,
                assignedTo: lead.assignedTo || { uid: user.uid, displayName: user.displayName || user.email },
                description: lead.notes || lead.message || '',
            });

            // 3. Mark the lead as Convertido preserving complete history
            const leadRef = doc(db, 'leads', lead.id);
            batch.update(leadRef, {
                status: 'Convertido',
                convertedAccountId: accountId,
                convertedOpportunityId: newOppRef.id,
                convertedAt: serverTimestamp(),
                lastInteraction: serverTimestamp(),
            });
            
            await batch.commit();

            toast({ 
                title: "Lead Convertido!", 
                description: `${lead.name} agora possui uma Conta/Empresa e uma Oportunidade no Funil.` 
            });
            setIsConvertDialogOpen(false);
        } catch (error) {
            console.error("Error converting lead: ", error);
            toast({ title: "Erro ao converter lead", variant: "destructive" });
        } finally {
            setIsConverting(false);
        }
    };

    const { pendingActivities, completedActivities } = useMemo(() => {
        const pending = activities.filter(a => a.status === 'Pendente').sort((a,b) => (a.createdAt as any) - (b.createdAt as any));
        const completed = activities.filter(a => a.status === 'Concluída').sort((a,b) => (b.completedAt as any) - (a.completedAt as any));
        return { pendingActivities: pending, completedActivities: completed };
    }, [activities]);

    return (
        <div className="py-4 space-y-6">
            <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
                <DialogContent>
                     <DialogHeader>
                        <DialogTitle>Converter Lead em Oportunidade</DialogTitle>
                        <DialogDescription>
                            Está a criar uma nova oportunidade de negócio para <span className="font-semibold">{lead.name}</span>. Por favor, insira o valor estimado do negócio.
                        </DialogDescription>
                    </DialogHeader>
                     <div className="py-4 space-y-2">
                        <Label htmlFor="opp-value">Valor Estimado da Oportunidade (Kz)</Label>
                        <Input 
                            id="opp-value" 
                            type="number" 
                            value={opportunityValue} 
                            onChange={(e) => setOpportunityValue(e.target.value)} 
                            placeholder="5000000" 
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleConvertLead} disabled={isConverting}>
                            {isConverting ? <Loader2 className="animate-spin mr-2"/> : <ArrowRight className="mr-2" />}
                            Criar Oportunidade
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">{lead.name}</CardTitle>
                            <CardDescription>{lead.email} - {lead.phone}</CardDescription>
                        </div>
                        <Select value={lead.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Novo">Novo</SelectItem>
                                <SelectItem value="Contactado">Contactado</SelectItem>
                                <SelectItem value="Qualificado">Qualificado</SelectItem>
                                <SelectItem value="Não Qualificado">Não Qualificado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                 <CardContent>
                    <div className="flex gap-2">
                        <Button onClick={() => setIsConvertDialogOpen(true)}>
                            <ArrowRight className="mr-2 h-4 w-4"/> Converter em Oportunidade
                        </Button>
                        <Button variant="destructive" onClick={() => handleStatusChange('Não Qualificado')}>
                            <XCircle className="mr-2 h-4 w-4"/> Marcar como Não Qualificado
                        </Button>
                    </div>
                 </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="text-base">Detalhes Adicionais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    {lead.source && (
                        <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">Origem:</span>
                            <Badge variant="outline">{lead.source}</Badge>
                        </div>
                    )}
                    {lead.message && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold">Mensagem Original:</span>
                            </div>
                            <p className="p-3 bg-secondary rounded-md whitespace-pre-wrap border">{lead.message}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Próximas Ações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 p-3 border rounded-md">
                        <Textarea
                            placeholder="Adicionar uma tarefa..."
                            value={newActivityText}
                            onChange={(e) => setNewActivityText(e.target.value)}
                            disabled={isSaving}
                            rows={3}
                        />
                        <div className="flex flex-wrap gap-2 justify-between items-center">
                            <div className="flex gap-2 flex-wrap">
                                 <Select value={newActivityType} onValueChange={(v) => setNewActivityType(v as ActivityType)}>
                                    <SelectTrigger className="w-[150px] h-9">
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Outro">Outro</SelectItem>
                                        <SelectItem value="Chamada">Chamada</SelectItem>
                                        <SelectItem value="Reunião">Reunião</SelectItem>
                                        <SelectItem value="Email">Email</SelectItem>
                                    </SelectContent>
                                </Select>
                                 <Select value={newActivityAssigneeId} onValueChange={setNewActivityAssigneeId}>
                                    <SelectTrigger className="w-[180px] h-9">
                                        <SelectValue placeholder="Atribuir a..."/>
                                    </SelectTrigger>
                                    <SelectContent>
                                         <SelectItem value="unassigned">Ninguém</SelectItem>
                                        {users.map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <DatePicker date={newActivityDueDate} setDate={setNewActivityDueDate} placeholder="Prazo..."/>
                            </div>
                            <Button size="sm" onClick={handleAddActivity} disabled={isSaving || !newActivityText.trim()}>
                                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                Adicionar
                            </Button>
                        </div>
                    </div>
                     {pendingActivities.length > 0 && (
                        <div className="space-y-2">
                            {pendingActivities.map(activity => (
                                <div key={activity.id} className="flex items-center gap-3 p-2 bg-secondary rounded-md">
                                    <ActivityIcon type={activity.type} />
                                    <div className="flex-1">
                                        <p className="text-sm">{activity.text}</p>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                            {activity.assignee && (
                                                <div className="flex items-center gap-1">
                                                    <Avatar className="h-4 w-4">
                                                        <AvatarFallback className="text-[10px]">{getInitials(activity.assignee.displayName)}</AvatarFallback>
                                                    </Avatar>
                                                    <span>{activity.assignee.displayName}</span>
                                                </div>
                                            )}
                                            {activity.dueDate && (() => {
                                                const d = toDateObj(activity.dueDate);
                                                if (!d) return null;
                                                return (
                                                    <div className={cn("flex items-center gap-1", d < new Date() && "text-destructive font-medium")}>
                                                        <Calendar className="h-3 w-3"/>
                                                        <span>{format(d, 'dd/MM/yyyy')}</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => handleMarkAsDone(activity.id)}>
                                        <Check className="h-4 w-4 mr-2"/>
                                        Concluir
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                    {pendingActivities.length === 0 && (
                        <p className="text-sm text-center text-muted-foreground py-4">Nenhuma tarefa pendente.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle className="text-base">Histórico de Atividades</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-4">
                            {completedActivities.length === 0 ? (
                                <p className="text-sm text-center text-muted-foreground py-4">Nenhuma atividade concluída ainda.</p>
                            ) : (
                                completedActivities.map(activity => (
                                    <div key={activity.id} className="flex items-start gap-3">
                                        <Avatar className="h-8 w-8 text-xs">
                                            <AvatarFallback>{getInitials(activity.author.displayName)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 bg-secondary/50 p-3 rounded-md">
                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <ActivityIcon type={activity.type} />
                                                    <span>{activity.author.displayName}</span>
                                                </div>
                                                <p>
                                                    {toDateObj(activity.completedAt)?.toLocaleString() || ''}
                                                </p>
                                            </div>
                                            <p className="text-sm mt-1 whitespace-pre-wrap">{activity.text}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
