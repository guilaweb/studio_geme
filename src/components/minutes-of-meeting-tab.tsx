'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, Timestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, FileSignature, Save, Calendar, Users, List, CheckSquare, Trash2, HelpCircle, ClipboardList } from 'lucide-react';
import { type MeetingMinute, type ActionItem } from '@/types/collaboration';
import { type TeamMember } from '@/app/projects/[id]/page';
import type { UserRole } from '@/app/projects/[id]/page';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { DatePicker } from './ui/date-picker';
import { format } from 'date-fns';
import { Checkbox } from './ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MinutesOfMeetingTabProps {
    projectId: string;
    teamMembers: TeamMember[];
    userRole: UserRole | null;
}

export default function MinutesOfMeetingTab({ projectId, teamMembers, userRole }: MinutesOfMeetingTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
    const [loading, setLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [subject, setSubject] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [participants, setParticipants] = useState<string[]>([]);
    const [agenda, setAgenda] = useState('');
    const [decisions, setDecisions] = useState('');
    const [actionItems, setActionItems] = useState<Omit<ActionItem, 'id' | 'isCompleted'>[]>([]);

    // Action Item sub-form state
    const [actionText, setActionText] = useState('');
    const [actionAssignee, setActionAssignee] = useState<string | undefined>();
    const [actionDueDate, setActionDueDate] = useState<Date | undefined>();

    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'meetingMinutes'), orderBy('date', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMinutes = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate()
            } as MeetingMinute));
            setMinutes(fetchedMinutes);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching minutes:", error);
            toast({ title: 'Erro ao carregar atas', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, toast]);
    
    const resetForm = () => {
        setSubject('');
        setDate(new Date());
        setParticipants([]);
        setAgenda('');
        setDecisions('');
        setActionItems([]);
        setIsDialogOpen(false);
    }
    
    const resetActionItemForm = () => {
        setActionText('');
        setActionAssignee(undefined);
        setActionDueDate(undefined);
    }
    
    const handleAddActionItem = () => {
        if(!actionText.trim()) return;
        
        const assignee = teamMembers.find(m => m.uid === actionAssignee);

        setActionItems(prev => [...prev, {
            text: actionText,
            assignee: assignee ? { uid: assignee.uid, displayName: assignee.displayName } : undefined,
            dueDate: actionDueDate ? Timestamp.fromDate(actionDueDate) : undefined
        }]);
        
        resetActionItemForm();
    }

    const handleRemoveActionItem = (index: number) => {
        setActionItems(prev => prev.filter((_, i) => i !== index));
    }
    
    const handleToggleActionItem = async (minuteId: string, actionId: string, currentStatus: boolean) => {
        if (!canEdit) return;

        const minute = minutes.find(m => m.id === minuteId);
        if (!minute) return;

        const updatedActionItems = minute.actionItems.map(item => 
            item.id === actionId ? { ...item, isCompleted: !currentStatus } : item
        );
        
        const minuteRef = doc(db, 'projects', projectId, 'meetingMinutes', minuteId);
        try {
            await updateDoc(minuteRef, { actionItems: updatedActionItems });
            toast({ title: 'Ação atualizada!' });
        } catch (error) {
            toast({ title: 'Erro ao atualizar ação', variant: 'destructive' });
        }
    };
    
    const handleSubmit = async () => {
        if (!canEdit || !user || !idToken) return;
        if (!subject.trim() || !date) {
            toast({ title: 'Assunto e data são obrigatórios', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const participantsData = participants.map(uid => {
                const member = teamMembers.find(m => m.uid === uid);
                return { uid, displayName: member?.displayName || 'Desconhecido' };
            }).filter(Boolean);

            const minuteData = {
                subject,
                date: date.toISOString(),
                participants: participantsData,
                agenda,
                decisions,
                actionItems: actionItems,
            };

            const response = await fetch(`/api/projects/${projectId}/meeting-minutes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}`},
                body: JSON.stringify(minuteData)
            });

            if (!response.ok) throw new Error((await response.json()).error || "Falha ao criar ata.");
            
            toast({ title: 'Ata de Reunião registada!' });
            resetForm();
        } catch (error: any) {
            console.error("Error saving meeting minute: ", error);
            toast({ title: 'Erro ao registar ata', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    }


    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2"><FileSignature className="h-5 w-5 text-primary"/> Atas de Reunião</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">Crie atas formais para todas as reuniões do projeto, registando participantes, decisões tomadas e ações a serem seguidas para garantir a responsabilização.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardTitle>
                        <CardDescription>Crie e distribua atas de reunião, associando decisões e tarefas.</CardDescription>
                    </div>
                    {canEdit && (
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2"/> Registar Nova Ata</Button>
                        </DialogTrigger>
                    )}
                </CardHeader>
                <CardContent>
                     {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                    ) : (
                         <Accordion type="single" collapsible className="w-full">
                            {minutes.length === 0 ? <p className="text-sm text-muted-foreground text-center p-4">Nenhuma ata registada.</p> : (
                                minutes.map(minute => (
                                    <AccordionItem value={minute.id} key={minute.id}>
                                        <AccordionTrigger>
                                            <div className="flex justify-between items-center w-full pr-4">
                                                <span className="font-semibold text-base text-left">{minute.subject}</span>
                                                <span className="text-sm text-muted-foreground">{minute.date ? format(minute.date, 'dd/MM/yyyy') : 'N/A'}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 space-y-4 text-sm">
                                            <p><strong>Participantes:</strong> {minute.participants.map(p => p.displayName).join(', ')}</p>
                                            <div>
                                                <h4 className="font-semibold">Agenda:</h4>
                                                <p className="whitespace-pre-wrap text-muted-foreground bg-secondary p-2 rounded-md mt-1">{minute.agenda || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">Decisões:</h4>
                                                <p className="whitespace-pre-wrap text-muted-foreground bg-secondary p-2 rounded-md mt-1">{minute.decisions || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">Ações a Tomar:</h4>
                                                {minute.actionItems.length === 0 ? <p className="text-muted-foreground">Nenhuma.</p> : (
                                                    <div className="mt-2 space-y-2">
                                                        {minute.actionItems.map(item => (
                                                             <div key={item.id} className="flex items-start gap-3">
                                                                <Checkbox 
                                                                    id={`action-${minute.id}-${item.id}`} 
                                                                    className="mt-1"
                                                                    checked={item.isCompleted} 
                                                                    onCheckedChange={() => handleToggleActionItem(minute.id, item.id, item.isCompleted)}
                                                                    disabled={!canEdit}
                                                                />
                                                                <div className="grid gap-1.5 leading-none">
                                                                    <label
                                                                        htmlFor={`action-${minute.id}-${item.id}`}
                                                                        className={cn("text-sm font-medium leading-none cursor-pointer", item.isCompleted && "line-through text-muted-foreground")}
                                                                    >
                                                                        {item.text}
                                                                    </label>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {item.assignee?.displayName || 'N/D'}
                                                                        {item.dueDate && ` - Prazo: ${format((item.dueDate as any).toDate(), 'dd/MM/yyyy')}`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
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
                    <DialogTitle>Registar Nova Ata de Reunião</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto px-2">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Assunto da Reunião</Label>
                            <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Data</Label>
                            <DatePicker date={date} setDate={setDate} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label><Users className="inline h-4 w-4 mr-1"/> Participantes</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    {participants.length > 0 ? `${participants.length} selecionado(s)` : 'Selecione os participantes'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                    <CommandList>
                                        <CommandGroup className='max-h-48 overflow-y-auto'>
                                            {teamMembers.map(member => (
                                                <CommandItem key={member.uid} onSelect={() => {
                                                    setParticipants(prev => prev.includes(member.uid) ? prev.filter(uid => uid !== member.uid) : [...prev, member.uid])
                                                }}>
                                                     <Check className={cn("mr-2 h-4 w-4", participants.includes(member.uid) ? "opacity-100" : "opacity-0")} />
                                                     {member.displayName}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    {/* Text Areas */}
                    <div className="space-y-2">
                        <Label><ClipboardList className="inline h-4 w-4 mr-1"/> Pauta / Agenda</Label>
                        <Textarea value={agenda} onChange={e => setAgenda(e.target.value)} rows={4}/>
                    </div>
                     <div className="space-y-2">
                        <Label><CheckSquare className="inline h-4 w-4 mr-1"/> Decisões Tomadas</Label>
                        <Textarea value={decisions} onChange={e => setDecisions(e.target.value)} rows={4}/>
                    </div>

                    {/* Action Items */}
                    <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-semibold text-lg">Ações a Tomar</h4>
                        {actionItems.map((item, index) => (
                             <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                                <div className="flex-1 text-sm">
                                    <p>{item.text}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Responsável: {item.assignee?.displayName || 'N/D'} | Prazo: {item.dueDate ? format(item.dueDate.toDate(), 'dd/MM/yyyy') : 'Sem prazo'}
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveActionItem(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                         <div className="p-4 bg-secondary rounded-lg space-y-3">
                             <Input placeholder="Descreva a nova ação..." value={actionText} onChange={e => setActionText(e.target.value)} />
                             <div className="flex items-center gap-2">
                                <Select value={actionAssignee} onValueChange={setActionAssignee}>
                                    <SelectTrigger className="flex-1"><SelectValue placeholder="Responsável..."/></SelectTrigger>
                                    <SelectContent>
                                        {teamMembers.map(m => <SelectItem key={m.uid} value={m.uid}>{m.displayName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                 <DatePicker date={actionDueDate} setDate={setActionDueDate} placeholder="Definir prazo..." />
                             </div>
                             <Button size="sm" onClick={handleAddActionItem} disabled={!actionText.trim()}>Adicionar Ação</Button>
                         </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        Registar Ata
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
