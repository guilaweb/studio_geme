'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { Opportunity, STAGES, Stage, StageColumn, Activity } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
    Plus, 
    Loader2, 
    AlertCircle, 
    Building2, 
    Clock, 
    Calendar, 
    CheckCircle2, 
    Sparkles, 
    DollarSign,
    User,
    TrendingUp,
    Briefcase
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '0,00 Kz';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const STAGE_DEFAULT_PROBABILITIES: Record<Stage, number> = {
    'Qualificação': 15,
    'Contato Realizado': 30,
    'Visita Agendada': 45,
    'Proposta Enviada': 60,
    'Negociação': 80,
    'Ganha': 100,
    'Perdida': 0,
};

const STAGE_BORDER_COLORS: Record<Stage, string> = {
    'Qualificação': 'border-l-sky-500',
    'Contato Realizado': 'border-l-blue-500',
    'Visita Agendada': 'border-l-indigo-500',
    'Proposta Enviada': 'border-l-amber-500',
    'Negociação': 'border-l-purple-500',
    'Ganha': 'border-l-emerald-500',
    'Perdida': 'border-l-rose-500',
};

interface CrmFunnelProps {
    initialOpportunities: Opportunity[];
    onOpportunityClick: (opportunity: Opportunity) => void;
    users?: any[];
}

export function CrmFunnel({ initialOpportunities, onOpportunityClick, users = [] }: CrmFunnelProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [columns, setColumns] = useState<Map<Stage, StageColumn>>(new Map());
    
    // Quick modal state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newName, setNewName] = useState('');
    const [newClient, setNewClient] = useState('');
    const [newValue, setNewValue] = useState('');
    const [newOrigin, setNewOrigin] = useState('Contacto Direto');

    useEffect(() => {
        const newColumns = new Map<Stage, StageColumn>();
        STAGES.forEach(stage => {
            newColumns.set(stage, {
                id: stage,
                title: stage,
                opportunities: [],
            });
        });

        initialOpportunities.forEach(opp => {
            if (newColumns.has(opp.stage)) {
                newColumns.get(opp.stage)!.opportunities.push(opp);
            }
        });
        
        // Sort opportunities within each stage (most recent first)
        newColumns.forEach((column) => {
            column.opportunities.sort((a, b) => {
                const dateA = (a.createdAt as any)?.toDate?.() || new Date(a.createdAt as any);
                const dateB = (b.createdAt as any)?.toDate?.() || new Date(b.createdAt as any);
                return dateB.getTime() - dateA.getTime();
            });
        });

        setColumns(newColumns);
    }, [initialOpportunities]);

    const handleDragEnd: OnDragEndResponder = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;
        
        const startColumn = columns.get(source.droppableId as Stage)!;
        const endColumn = columns.get(destination.droppableId as Stage)!;
        const opportunity = startColumn.opportunities.find(opp => opp.id === draggableId)!;

        // Optimistic UI Update
        const newStartOpportunities = Array.from(startColumn.opportunities);
        newStartOpportunities.splice(source.index, 1);
        
        const newEndOpportunities = Array.from(endColumn.opportunities);
        const updatedOpp = {
            ...opportunity,
            stage: destination.droppableId as Stage,
            probability: STAGE_DEFAULT_PROBABILITIES[destination.droppableId as Stage] ?? opportunity.probability
        };
        newEndOpportunities.splice(destination.index, 0, updatedOpp);
        
        const newColumns = new Map(columns);
        newColumns.set(startColumn.id, { ...startColumn, opportunities: newStartOpportunities });
        newColumns.set(endColumn.id, { ...endColumn, opportunities: newEndOpportunities });
        setColumns(newColumns);
        
        try {
            const oppRef = doc(db, 'opportunities', draggableId);
            const dataToUpdate: Record<string, any> = { 
                stage: destination.droppableId,
                probability: STAGE_DEFAULT_PROBABILITIES[destination.droppableId as Stage] ?? 50,
                lastInteraction: serverTimestamp()
            };

            if (destination.droppableId === 'Ganha' || destination.droppableId === 'Perdida') {
                if (source.droppableId !== 'Ganha' && source.droppableId !== 'Perdida') {
                    dataToUpdate.closedAt = serverTimestamp();
                }
            }

            await updateDoc(oppRef, dataToUpdate);
            
            toast({ 
                title: 'Etapa Atualizada!', 
                description: `"${opportunity.name}" avançou para ${destination.droppableId}.` 
            });

        } catch (error) {
            console.error("Error updating opportunity stage: ", error);
            toast({ title: 'Erro ao mover oportunidade', variant: 'destructive' });
            setColumns(columns); // Reverter em falha
        }
    };

    const handleAddOpportunity = async () => {
        if (!newName.trim() || !newClient.trim() || !newValue) {
            toast({ title: 'Campos em falta', description: 'Preencha o nome, cliente e valor estimado.', variant: 'destructive'});
            return;
        }
        if (!user) {
            toast({ title: 'Utilizador não autenticado.', variant: 'destructive'});
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'opportunities'), {
                name: newName.trim(),
                accountName: newClient.trim(),
                accountId: '',
                value: parseFloat(newValue) || 0,
                stage: STAGES[0],
                probability: STAGE_DEFAULT_PROBABILITIES['Qualificação'],
                origin: newOrigin,
                assignedTo: {
                    uid: user.uid,
                    displayName: user.displayName || user.email,
                },
                createdAt: serverTimestamp(),
                lastInteraction: serverTimestamp(),
                author: {
                    uid: user.uid,
                    displayName: user.displayName || user.email,
                }
            });

            toast({ title: 'Oportunidade Criada com Sucesso!' });
            setIsDialogOpen(false);
            setNewName('');
            setNewClient('');
            setNewValue('');
        } catch(error) {
            console.error("Error adding opportunity: ", error);
            toast({ title: 'Erro ao criar oportunidade', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasPendingTasks = (opportunity: Opportunity): boolean => {
        return opportunity.activities ? opportunity.activities.some(act => act.status === 'Pendente') : false;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Pipeline Comercial (Kanban)</h2>
                    <p className="text-xs text-muted-foreground">
                        Arraste e solte para avançar oportunidades pelas etapas de venda e previsão contratual.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4"/>
                            Nova Oportunidade
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Criar Nova Oportunidade Comercial</DialogTitle>
                            <DialogDescription>
                                Registe um novo projeto, concurso ou negociação no funil de vendas.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3.5 py-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="opp-title">Nome do Projeto / Negócio *</Label>
                                <Input 
                                    id="opp-title" 
                                    value={newName} 
                                    onChange={(e) => setNewName(e.target.value)} 
                                    placeholder="Ex: Construção Pavilhão Industrial Viana" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="opp-client">Empresa / Cliente *</Label>
                                <Input 
                                    id="opp-client" 
                                    value={newClient} 
                                    onChange={(e) => setNewClient(e.target.value)} 
                                    placeholder="Ex: Grupo Carrinho, Sonangol, Ensa" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="opp-val">Valor Estimado do Contrato (Kz) *</Label>
                                <Input 
                                    id="opp-val" 
                                    type="number" 
                                    value={newValue} 
                                    onChange={(e) => setNewValue(e.target.value)} 
                                    placeholder="ex.: 50000000" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="opp-orig">Origem do Negócio</Label>
                                <Input 
                                    id="opp-orig" 
                                    value={newOrigin} 
                                    onChange={(e) => setNewOrigin(e.target.value)} 
                                    placeholder="Ex: Concurso Público, Indicação, Prospecção" 
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAddOpportunity} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Criar Oportunidade
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="overflow-x-auto pb-4 -mx-2 px-2">
                    <div className="grid grid-flow-col auto-cols-[290px] gap-4 min-w-max">
                        {Array.from(columns.values()).map((column) => {
                            const columnTotalValue = column.opportunities.reduce((sum, o) => sum + (o.value || 0), 0);
                            return (
                                <Droppable key={column.id} droppableId={column.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`flex flex-col p-3 bg-muted/40 border rounded-xl transition-all ${
                                                snapshot.isDraggingOver ? 'bg-primary/5 border-primary/40' : ''
                                            }`}
                                        >
                                            {/* Column Header */}
                                            <div className="pb-3 mb-3 border-b flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <h3 className="font-semibold text-sm text-foreground">{column.title}</h3>
                                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                                                            {column.opportunities.length}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                                                        {formatCurrency(columnTotalValue)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Droppable cards container */}
                                            <div className="flex-grow space-y-3 min-h-[300px]">
                                                {column.opportunities.map((opportunity, index) => {
                                                    const prob = opportunity.probability ?? STAGE_DEFAULT_PROBABILITIES[opportunity.stage] ?? 50;
                                                    const borderColor = STAGE_BORDER_COLORS[opportunity.stage] || 'border-l-primary';
                                                    const assignedName = opportunity.assignedTo?.displayName || opportunity.author?.displayName || 'Comercial';
                                                    const formattedDate = opportunity.expectedCloseDate
                                                        ? typeof opportunity.expectedCloseDate === 'string'
                                                            ? opportunity.expectedCloseDate
                                                            : format((opportunity.expectedCloseDate as any).toDate ? (opportunity.expectedCloseDate as any).toDate() : new Date(opportunity.expectedCloseDate as any), 'dd/MM/yyyy')
                                                        : null;

                                                    return (
                                                        <Draggable key={opportunity.id} draggableId={opportunity.id} index={index}>
                                                            {(dragProvided, dragSnapshot) => (
                                                                <div
                                                                    ref={dragProvided.innerRef}
                                                                    {...dragProvided.draggableProps}
                                                                    {...dragProvided.dragHandleProps}
                                                                    onClick={() => onOpportunityClick(opportunity)}
                                                                    className={`p-3.5 rounded-lg border bg-card shadow-xs transition-all cursor-pointer hover:shadow-md border-l-4 ${borderColor} ${
                                                                        dragSnapshot.isDragging ? 'shadow-xl ring-2 ring-primary scale-[1.02] rotate-1' : ''
                                                                    }`}
                                                                >
                                                                    {/* Client header */}
                                                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                                                        <span className="font-medium text-primary flex items-center gap-1 truncate max-w-[170px]" title={opportunity.accountName}>
                                                                            <Building2 className="h-3 w-3 shrink-0" />
                                                                            {opportunity.accountName}
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[10px] h-4.5 px-1 font-mono">
                                                                            {prob}%
                                                                        </Badge>
                                                                    </div>

                                                                    {/* Opportunity Title */}
                                                                    <h4 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug mb-2">
                                                                        {opportunity.name}
                                                                    </h4>

                                                                    {/* Value */}
                                                                    <div className="text-sm font-bold text-foreground mb-3 flex items-center justify-between">
                                                                        <span>{formatCurrency(opportunity.value)}</span>
                                                                        {opportunity.projectId && (
                                                                            <Badge variant="secondary" className="text-[10px] text-emerald-700 bg-emerald-50">
                                                                                Projeto Ativo
                                                                            </Badge>
                                                                        )}
                                                                    </div>

                                                                    {/* Card Footer: Assignee & Next Activity / Date */}
                                                                    <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                                                                        <div className="flex items-center gap-1.5" title={`Responsável: ${assignedName}`}>
                                                                            <Avatar className="h-5 w-5 bg-muted border border-border">
                                                                                <AvatarFallback className="text-[9px] font-bold text-foreground">
                                                                                    {getInitials(assignedName)}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <span className="text-[11px] truncate max-w-[90px]">{assignedName}</span>
                                                                        </div>

                                                                        <div className="flex items-center gap-1 text-[11px]">
                                                                            {hasPendingTasks(opportunity) ? (
                                                                                <span className="text-amber-600 flex items-center gap-0.5" title="Tarefas pendentes">
                                                                                    <AlertCircle className="h-3 w-3" /> Pendência
                                                                                </span>
                                                                            ) : formattedDate ? (
                                                                                <span className="flex items-center gap-0.5" title={`Previsão: ${formattedDate}`}>
                                                                                    <Calendar className="h-3 w-3" /> {formattedDate}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-muted-foreground/60">Sem prazo</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    );
                                                })}
                                                {provided.placeholder}
                                            </div>
                                        </div>
                                    )}
                                </Droppable>
                            );
                        })}
                    </div>
                </div>
            </DragDropContext>
        </div>
    );
}
