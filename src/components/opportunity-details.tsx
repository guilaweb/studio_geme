'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    doc, 
    updateDoc, 
    Timestamp 
} from 'firebase/firestore';
import { 
    Opportunity, 
    Activity, 
    CustomerQuote, 
    ActivityType, 
    ActivityStatus, 
    STAGES, 
    Stage 
} from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, 
    Send, 
    Check, 
    Phone, 
    Mail, 
    Users, 
    MessageSquare, 
    ArrowRight, 
    Calendar, 
    Briefcase,
    Building2,
    DollarSign,
    Percent,
    Target,
    Clock,
    FileSpreadsheet,
    FileText,
    Download,
    CheckCircle2,
    TrendingUp,
    Sparkles,
    UserCheck
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomerQuotesTab from './customer-quotes-tab';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from './ui/date-picker';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { compileCommercialProposalPDF } from '@/lib/pdf/proposal-pdf-engine';

interface OpportunityDetailsProps {
    opportunity: Opportunity;
    activities: Activity[];
    onApproveQuote?: (quote: CustomerQuote, opportunity: Opportunity) => void;
    onConvertOpportunity: (opportunity: Opportunity) => void;
    users: any[];
}

const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '0,00 Kz';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

const ActivityIcon = ({ type }: { type: ActivityType }) => {
    switch (type) {
        case 'Chamada': return <Phone className="h-4 w-4 text-sky-600" />;
        case 'Reunião': return <Users className="h-4 w-4 text-purple-600" />;
        case 'Email': return <Mail className="h-4 w-4 text-blue-600" />;
        case 'Visita': return <Building2 className="h-4 w-4 text-emerald-600" />;
        case 'Proposta': return <FileSpreadsheet className="h-4 w-4 text-amber-600" />;
        case 'Acompanhamento': return <Clock className="h-4 w-4 text-indigo-600" />;
        default: return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
};

export function OpportunityDetails({ 
    opportunity, 
    activities, 
    onApproveQuote, 
    onConvertOpportunity, 
    users 
}: OpportunityDetailsProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    // New Activity Form State
    const [newActivityText, setNewActivityText] = useState('');
    const [newActivityType, setNewActivityType] = useState<ActivityType>('Chamada');
    const [newActivityAssigneeId, setNewActivityAssigneeId] = useState<string>('');
    const [newActivityDueDate, setNewActivityDueDate] = useState<Date | undefined>();
    const [isSavingActivity, setIsSavingActivity] = useState(false);

    // Opportunity Edit State
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [currentStage, setCurrentStage] = useState<Stage>(opportunity.stage);
    const [currentValue, setCurrentValue] = useState<string>(String(opportunity.value || ''));
    const [currentProbability, setCurrentProbability] = useState<number>(opportunity.probability ?? 50);
    const [currentDesc, setCurrentDesc] = useState<string>(opportunity.description || '');
    const [currentProducts, setCurrentProducts] = useState<string>(opportunity.productsServices || '');
    const [isSavingOpp, setIsSavingOpp] = useState(false);

    const canEdit = opportunity.stage !== 'Perdida';

    const handleUpdateStage = async (newStage: Stage) => {
        try {
            const oppRef = doc(db, 'opportunities', opportunity.id);
            const updates: Record<string, any> = {
                stage: newStage,
                lastInteraction: serverTimestamp(),
            };

            if (newStage === 'Ganha' || newStage === 'Perdida') {
                updates.closedAt = serverTimestamp();
            }

            await updateDoc(oppRef, updates);
            setCurrentStage(newStage);
            toast({ title: `Etapa atualizada para "${newStage}"` });
        } catch (error) {
            console.error("Error updating stage:", error);
            toast({ title: "Erro ao atualizar etapa", variant: "destructive" });
        }
    };

    const handleSaveOpportunityDetails = async () => {
        setIsSavingOpp(true);
        try {
            const oppRef = doc(db, 'opportunities', opportunity.id);
            await updateDoc(oppRef, {
                value: parseFloat(currentValue) || 0,
                probability: currentProbability,
                description: currentDesc,
                productsServices: currentProducts,
                lastInteraction: serverTimestamp(),
            });
            setIsEditingInfo(false);
            toast({ title: "Detalhes da oportunidade atualizados!" });
        } catch (error) {
            toast({ title: "Erro ao atualizar oportunidade", variant: "destructive" });
        } finally {
            setIsSavingOpp(false);
        }
    };

    const handleAddActivity = async () => {
        if (!newActivityText.trim() || !user) return;

        setIsSavingActivity(true);
        try {
            const assignee = users.find(u => u.uid === newActivityAssigneeId);

            await addDoc(collection(db, 'opportunities', opportunity.id, 'activities'), {
                text: newActivityText.trim(),
                type: newActivityType,
                status: 'Pendente',
                dueDate: newActivityDueDate || null,
                assignee: assignee ? { uid: assignee.uid, displayName: assignee.displayName } : null,
                createdAt: serverTimestamp(),
                author: {
                    uid: user.uid,
                    displayName: user.displayName || user.email,
                },
            });

            // Update opportunity last interaction
            await updateDoc(doc(db, 'opportunities', opportunity.id), {
                lastInteraction: serverTimestamp(),
                nextActivityTitle: `${newActivityType}: ${newActivityText.substring(0, 30)}`,
                nextActivityDate: newActivityDueDate || null,
            });

            setNewActivityText('');
            setNewActivityType('Chamada');
            setNewActivityAssigneeId('');
            setNewActivityDueDate(undefined);
            toast({ title: "Atividade agendada com sucesso!" });
        } catch (error) {
            console.error("Error adding activity: ", error);
            toast({ title: "Erro ao agendar atividade", variant: "destructive" });
        } finally {
            setIsSavingActivity(false);
        }
    };
    
    const handleMarkAsDone = async (activityId: string) => {
        try {
            const activityRef = doc(db, 'opportunities', opportunity.id, 'activities', activityId);
            await updateDoc(activityRef, {
                status: 'Concluída',
                completedAt: serverTimestamp(),
            });
            await updateDoc(doc(db, 'opportunities', opportunity.id), {
                lastInteraction: serverTimestamp(),
            });
            toast({ title: "Atividade concluída!" });
        } catch (error) {
            console.error("Error completing activity: ", error);
            toast({ title: "Erro ao concluir atividade", variant: "destructive" });
        }
    };

    const { pendingActivities, completedActivities } = useMemo(() => {
        const pending = activities.filter(a => a.status === 'Pendente').sort((a,b) => {
            const da = (a.createdAt as any)?.toDate?.() || new Date(a.createdAt as any);
            const db = (b.createdAt as any)?.toDate?.() || new Date(b.createdAt as any);
            return da.getTime() - db.getTime();
        });
        const completed = activities.filter(a => a.status === 'Concluída').sort((a,b) => {
            const da = (a.completedAt as any)?.toDate?.() || new Date(a.completedAt as any);
            const db = (b.completedAt as any)?.toDate?.() || new Date(b.completedAt as any);
            return db.getTime() - da.getTime();
        });
        return { pendingActivities: pending, completedActivities: completed };
    }, [activities]);

    const formattedExpectedClose = opportunity.expectedCloseDate
        ? typeof opportunity.expectedCloseDate === 'string'
            ? opportunity.expectedCloseDate
            : format((opportunity.expectedCloseDate as any).toDate ? (opportunity.expectedCloseDate as any).toDate() : new Date(opportunity.expectedCloseDate as any), 'dd/MM/yyyy')
        : 'Em aberto';

    return (
        <div className="py-2 space-y-6">
            {/* 1. TOP EXECUTIVE HEADER CARD */}
            <div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {opportunity.accountName}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">ID: {opportunity.id.substring(0, 8)}</span>
                        </div>
                        <h2 className="text-xl font-bold text-foreground mt-0.5">{opportunity.name}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                        {opportunity.projectId ? (
                            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                                <Link href={`/projects/${opportunity.projectId}`}>
                                    <Briefcase className="h-4 w-4" />
                                    Abrir Projeto Ativo
                                </Link>
                            </Button>
                        ) : (
                            <Button 
                                onClick={() => onConvertOpportunity(opportunity)} 
                                className="bg-primary text-primary-foreground gap-2"
                            >
                                <Sparkles className="h-4 w-4" />
                                Ganhar & Gerar Projeto
                            </Button>
                        )}
                    </div>
                </div>

                {/* 4 KPI METRICS BAR AT TOP */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                    <div className="p-2.5 rounded-lg bg-muted/30 border">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-primary" /> Valor Estimado
                        </div>
                        <div className="text-lg font-bold text-foreground mt-0.5">
                            {formatCurrency(opportunity.value)}
                        </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/30 border">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Target className="h-3 w-3 text-indigo-500" /> Etapa do Pipeline
                        </div>
                        <div className="mt-1">
                            <Select value={currentStage} onValueChange={(v) => handleUpdateStage(v as Stage)}>
                                <SelectTrigger className="h-7 text-xs font-semibold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STAGES.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/30 border">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Percent className="h-3 w-3 text-amber-500" /> Probabilidade
                        </div>
                        <div className="text-lg font-bold text-foreground mt-0.5">
                            {opportunity.probability ?? 50}%
                        </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/30 border">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-emerald-500" /> Previsão de Fecho
                        </div>
                        <div className="text-sm font-semibold text-foreground mt-1">
                            {formattedExpectedClose}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. TABS: VISÃO GERAL, PROPOSTAS, ATIVIDADES & HISTÓRICO */}
            <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Visão Geral & Dados</TabsTrigger>
                    <TabsTrigger value="quotes">Propostas Comerciais</TabsTrigger>
                    <TabsTrigger value="activities">
                        Atividades & Tarefas ({pendingActivities.length})
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: VISÃO GERAL */}
                <TabsContent value="overview" className="space-y-4 pt-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div>
                                <CardTitle className="text-base">Informações Comerciais da Oportunidade</CardTitle>
                                <CardDescription>Origem, responsável, contacto e especificações do projeto.</CardDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsEditingInfo(!isEditingInfo)}
                            >
                                {isEditingInfo ? 'Cancelar' : 'Editar Dados'}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isEditingInfo ? (
                                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label>Valor Estimado do Contrato (Kz)</Label>
                                            <Input 
                                                type="number" 
                                                value={currentValue} 
                                                onChange={e => setCurrentValue(e.target.value)} 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Probabilidade de Fecho (%)</Label>
                                            <Input 
                                                type="number" 
                                                min={0} 
                                                max={100}
                                                value={currentProbability} 
                                                onChange={e => setCurrentProbability(parseInt(e.target.value) || 0)} 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Descrição / Âmbito dos Trabalhos</Label>
                                        <Textarea 
                                            value={currentDesc} 
                                            onChange={e => setCurrentDesc(e.target.value)} 
                                            placeholder="Detalhes técnicos, localização do estaleiro, especificidades da obra..."
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Produtos / Serviços Envolvidos</Label>
                                        <Input 
                                            value={currentProducts} 
                                            onChange={e => setCurrentProducts(e.target.value)} 
                                            placeholder="Ex: Betão Armado, Alvenarias, Rede Hidráulica, Caixilharia"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="outline" size="sm" onClick={() => setIsEditingInfo(false)}>Cancelar</Button>
                                        <Button size="sm" onClick={handleSaveOpportunityDetails} disabled={isSavingOpp}>
                                            {isSavingOpp ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                            Guardar Alterações
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                    <div>
                                        <span className="text-muted-foreground block">Cliente / Empresa:</span>
                                        <span className="font-semibold text-foreground text-sm">{opportunity.accountName}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Contacto Principal:</span>
                                        <span className="font-semibold text-foreground text-sm">
                                            {opportunity.contactName || 'Contacto Geral'}
                                        </span>
                                        {opportunity.contactPhone && (
                                            <span className="text-muted-foreground block">{opportunity.contactPhone}</span>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Responsável Comercial:</span>
                                        <span className="font-semibold text-foreground text-sm">
                                            {opportunity.assignedTo?.displayName || opportunity.author?.displayName || 'Equipa Comercial'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Origem do Negócio:</span>
                                        <span className="font-medium text-foreground">{opportunity.origin || 'Contacto Direto'}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Data de Criação:</span>
                                        <span className="font-medium text-foreground">
                                            {opportunity.createdAt ? format((opportunity.createdAt as any).toDate ? (opportunity.createdAt as any).toDate() : new Date(opportunity.createdAt as any), 'dd/MM/yyyy') : 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Última Interação:</span>
                                        <span className="font-medium text-foreground">
                                            {opportunity.lastInteraction ? format((opportunity.lastInteraction as any).toDate ? (opportunity.lastInteraction as any).toDate() : new Date(opportunity.lastInteraction as any), 'dd/MM/yyyy HH:mm') : 'Hoje'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {opportunity.description && (
                                <div className="pt-3 border-t text-xs">
                                    <span className="text-muted-foreground block mb-1 font-medium">Descrição dos Trabalhos:</span>
                                    <p className="text-foreground bg-muted/20 p-3 rounded-lg border">{opportunity.description}</p>
                                </div>
                            )}

                            {opportunity.productsServices && (
                                <div className="pt-2 text-xs">
                                    <span className="text-muted-foreground block mb-1 font-medium">Produtos / Serviços:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {opportunity.productsServices.split(',').map((prod, i) => (
                                            <Badge key={i} variant="secondary" className="text-[11px]">
                                                {prod.trim()}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: PROPOSTAS */}
                <TabsContent value="quotes" className="pt-3">
                    <CustomerQuotesTab 
                        context="opportunity" 
                        contextId={opportunity.id} 
                        userRole="Gestor"
                        opportunity={opportunity}
                        onApprove={(quote) => {
                            if (onApproveQuote) onApproveQuote(quote, opportunity);
                        }}
                    />
                </TabsContent>

                {/* TAB 3: ATIVIDADES & PRÓXIMAS AÇÕES */}
                <TabsContent value="activities" className="space-y-5 pt-3">
                    {/* Add Activity Box */}
                    {canEdit && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    Agendar Próxima Ação ou Registar Contacto
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Textarea
                                    placeholder="Ex: Reunião com Diretor de Obras para apresentação de proposta técnica..."
                                    value={newActivityText}
                                    onChange={(e) => setNewActivityText(e.target.value)}
                                    disabled={isSavingActivity}
                                    rows={2}
                                />
                                <div className="flex flex-wrap gap-2 justify-between items-center">
                                    <div className="flex gap-2 flex-wrap items-center">
                                        <Select 
                                            value={newActivityType} 
                                            onValueChange={(v) => setNewActivityType(v as ActivityType)}
                                        >
                                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Chamada">Chamada</SelectItem>
                                                <SelectItem value="Reunião">Reunião</SelectItem>
                                                <SelectItem value="Email">Email</SelectItem>
                                                <SelectItem value="Visita">Visita a Obra</SelectItem>
                                                <SelectItem value="Proposta">Envio Proposta</SelectItem>
                                                <SelectItem value="Acompanhamento">Follow-up</SelectItem>
                                                <SelectItem value="Tarefa">Tarefa Geral</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Select 
                                            value={newActivityAssigneeId} 
                                            onValueChange={setNewActivityAssigneeId}
                                        >
                                            <SelectTrigger className="w-[160px] h-8 text-xs">
                                                <SelectValue placeholder="Responsável..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="me">Atribuir a mim</SelectItem>
                                                {users.map(u => (
                                                    <SelectItem key={u.uid} value={u.uid}>
                                                        {u.displayName || u.email}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <DatePicker 
                                            date={newActivityDueDate} 
                                            setDate={setNewActivityDueDate} 
                                            placeholder="Data / Prazo..."
                                        />
                                    </div>

                                    <Button 
                                        size="sm" 
                                        onClick={handleAddActivity} 
                                        disabled={isSavingActivity || !newActivityText.trim()}
                                        className="h-8 gap-1.5"
                                    >
                                        {isSavingActivity ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                                        Agendar Ação
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Pending Actions */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center justify-between">
                                <span>Próximas Ações Pendentes</span>
                                <Badge variant="secondary" className="text-xs">{pendingActivities.length}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                            {pendingActivities.length === 0 ? (
                                <p className="text-xs text-center text-muted-foreground py-6">
                                    Nenhuma ação ou reunião pendente para esta oportunidade.
                                </p>
                            ) : (
                                pendingActivities.map(activity => (
                                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-muted/30 border rounded-lg text-xs">
                                        <div className="mt-0.5"><ActivityIcon type={activity.type} /></div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-foreground text-sm leading-snug">{activity.text}</div>
                                            <div className="flex items-center gap-3 text-muted-foreground mt-1.5">
                                                <Badge variant="outline" className="text-[10px]">{activity.type}</Badge>
                                                {activity.assignee && (
                                                    <span className="flex items-center gap-1">
                                                        <UserCheck className="h-3 w-3" /> {activity.assignee.displayName}
                                                    </span>
                                                )}
                                                {activity.dueDate && (
                                                    <span className={cn("flex items-center gap-1 font-medium", new Date((activity.dueDate as any).toDate ? (activity.dueDate as any).toDate() : activity.dueDate) < new Date() ? "text-destructive" : "text-foreground")}>
                                                        <Calendar className="h-3 w-3" /> {format((activity.dueDate as any).toDate ? (activity.dueDate as any).toDate() : new Date(activity.dueDate as any), 'dd/MM/yyyy')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {canEdit && (
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => handleMarkAsDone(activity.id)}
                                                className="h-7 text-xs gap-1 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                                            >
                                                <Check className="h-3 w-3" /> Concluir
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Completed Activities History */}
                    {completedActivities.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold">Histórico de Interações Concluídas</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {completedActivities.map(activity => (
                                    <div key={activity.id} className="flex items-start gap-3 p-2.5 bg-muted/15 border border-dashed rounded-md text-xs opacity-80">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            <p className="line-through text-muted-foreground">{activity.text}</p>
                                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                                Concluído por {activity.author?.displayName || 'Equipa'} • {activity.completedAt ? format((activity.completedAt as any).toDate ? (activity.completedAt as any).toDate() : new Date(activity.completedAt as any), 'dd/MM/yyyy HH:mm') : 'Hoje'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
