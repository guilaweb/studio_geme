
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ShieldAlert, TrendingUp, TrendingDown, GripVertical, Trash2, Sparkles, Wand2 } from 'lucide-react';
import { type Risk, type RiskCategory, type RiskLevel, type RiskStatus, type MitigationAction } from '@/types/risk';
import { type TeamMember } from '@/app/projects/[id]/page';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { DatePicker } from './ui/date-picker';
import { Checkbox } from './ui/checkbox';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { riskAnalysisFlow, type IdentifiedRisk } from '@/ai/flows/risk-analyzer-flow';
import type { WbsItem } from '@/types/wbs';
import type { Transaction } from '@/types/finance';
import { Badge } from './ui/badge';


interface RiskManagementTabProps {
    projectId: string;
    userRole: UserRole | null;
    teamMembers: TeamMember[];
}

const RISK_LEVELS: RiskLevel[] = [1, 2, 3, 4, 5];
const PROBABILITY_LABELS = ['Rara', 'Improvável', 'Possível', 'Provável', 'Quase Certo'];
const IMPACT_LABELS = ['Insignificante', 'Menor', 'Moderado', 'Grave', 'Catastrófico'];

const getRiskScore = (probability: RiskLevel, impact: RiskLevel) => probability * impact;

const getRiskColor = (score: number) => {
    if (score >= 15) return 'bg-red-500';
    if (score >= 8) return 'bg-yellow-500';
    if (score >= 4) return 'bg-blue-500';
    return 'bg-green-500';
};


export default function RiskManagementTab({ projectId, userRole, teamMembers }: RiskManagementTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    const [risks, setRisks] = useState<Risk[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form state for new risk
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<RiskCategory>('Operacional');
    const [probability, setProbability] = useState<RiskLevel>(3);
    const [impact, setImpact] = useState<RiskLevel>(3);
    
    // Form state for mitigation plan - states are now objects keyed by riskId
    const [actionItemText, setActionItemText] = useState<Record<string, string>>({});
    const [actionAssignees, setActionAssignees] = useState<Record<string, string>>({});
    const [actionDueDates, setActionDueDates] = useState<Record<string, Date | undefined>>({});

    // AI State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiIdentifiedRisks, setAiIdentifiedRisks] = useState<IdentifiedRisk[]>([]);


    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'risks'), orderBy('createdAt', 'desc'));

        const unsubRisks = onSnapshot(q, (snapshot) => {
            const fetchedRisks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Risk));
            setRisks(fetchedRisks);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching risks:", error);
            toast({ title: 'Erro ao carregar riscos', variant: 'destructive' });
            setLoading(false);
        });

        const unsubWbs = onSnapshot(query(collection(db, 'projects', projectId, 'wbs')), (snapshot) => {
             setWbsItems(snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id, ...data,
                    startDate: data.startDate ? data.startDate.toDate() : undefined,
                    endDate: data.endDate ? data.endDate.toDate() : undefined,
                    baselineStartDate: data.baselineStartDate ? data.baselineStartDate.toDate() : undefined,
                    baselineEndDate: data.baselineEndDate ? data.baselineEndDate.toDate() : undefined,
                } as WbsItem;
             }));
        });

        const unsubTransactions = onSnapshot(query(collection(db, 'projects', projectId, 'transactions')), (snapshot) => {
            setTransactions(snapshot.docs.map(doc => {
                 const data = doc.data();
                 return {
                    id: doc.id, ...data,
                    date: data.date ? data.date.toDate() : undefined,
                 } as Transaction
            }));
        });

        return () => {
            unsubRisks();
            unsubWbs();
            unsubTransactions();
        };
    }, [projectId, toast]);

    const resetForm = () => {
        setDescription('');
        setCategory('Operacional');
        setProbability(3);
        setImpact(3);
        setIsDialogOpen(false);
    };
    
    const handleRunAnalysis = async () => {
        setIsAnalyzing(true);
        setAiIdentifiedRisks([]);
        toast({title: 'Análise de Risco Iniciada', description: 'O assistente de IA está a analisar os dados do projeto...'});
        try {
            // Serialize date objects to strings and ensure clean JSON-serializable payload
            const serializableWbsItems = JSON.parse(JSON.stringify(wbsItems.map(item => ({
                id: item.id || '',
                name: item.name || '',
                description: item.description || null,
                category: item.category || null,
                parentId: item.parentId || null,
                budget: typeof item.budget === 'number' ? item.budget : 0,
                actualCost: typeof item.actualCost === 'number' ? item.actualCost : 0,
                progress: typeof item.progress === 'number' ? item.progress : 0,
                startDate: item.startDate instanceof Date ? item.startDate.toISOString() : undefined,
                endDate: item.endDate instanceof Date ? item.endDate.toISOString() : undefined,
                dependencies: item.dependencies || [],
                isMilestone: item.isMilestone || false,
            }))));

            const serializableTransactions = JSON.parse(JSON.stringify(transactions.map(item => ({
                id: item.id || '',
                description: item.description || '',
                amount: typeof item.amount === 'number' ? item.amount : 0,
                type: item.type || 'Despesa',
                status: item.status || 'Pendente',
                accountId: item.accountId || '',
                date: item.date instanceof Date ? item.date.toISOString() : undefined,
            }))));

            const result = await riskAnalysisFlow({
                wbsItems: serializableWbsItems,
                transactions: serializableTransactions
            });
            if (!result || !result.risks || result.risks.length === 0) {
                 toast({title: 'Análise Concluída', description: 'Nenhum risco significativo foi identificado automaticamente.'});
            } else {
                 setAiIdentifiedRisks(result.risks);
                 toast({title: 'Análise Concluída', description: `${result.risks.length} riscos potenciais foram identificados.`});
            }
        } catch (error: any) {
            console.error("Error running risk analysis:", error);
            toast({
              title: 'Erro na Análise de IA',
              description: error?.message ? String(error.message) : 'Não foi possível processar a análise no momento.',
              variant: 'destructive'
            });
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handlePromoteRisk = (risk: IdentifiedRisk) => {
        setDescription(risk.description);
        setCategory(risk.category);
        setProbability(3); // Default values
        setImpact(3);
        setIsDialogOpen(true);
        setAiIdentifiedRisks(prev => prev.filter(r => r.description !== risk.description)); // Remove from suggested list
    };


    const handleAddRisk = async () => {
        if (!canEdit || !user) return;
        if (!description.trim()) {
            toast({ title: 'Descrição obrigatória', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'projects', projectId, 'risks'), {
                description,
                category,
                probability,
                impact,
                status: 'Aberto',
                actionItems: [],
                author: { uid: user.uid, displayName: user.displayName || user.email },
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Risco adicionado com sucesso!' });
            resetForm();
        } catch (error) {
            console.error("Error adding risk:", error);
            toast({ title: 'Erro ao adicionar risco', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleUpdateRiskField = async (riskId: string, field: keyof Risk, value: any) => {
        if (!canEdit) return;
        const riskRef = doc(db, 'projects', projectId, 'risks', riskId);
        try {
            await updateDoc(riskRef, { [field]: value });
            toast({ title: 'Risco atualizado.' });
        } catch (error) {
            toast({ title: 'Erro ao atualizar risco.', variant: 'destructive' });
        }
    };

    const handleAddActionItem = async (riskId: string) => {
        if (!canEdit) return;
        const text = actionItemText[riskId];
        if (!text || !text.trim()) {
            toast({ title: 'Descrição da ação é obrigatória', variant: 'destructive' });
            return;
        }

        const assigneeId = actionAssignees[riskId];
        const assignee = teamMembers.find(m => m.uid === assigneeId);
        const dueDate = actionDueDates[riskId];

        const newAction: Omit<MitigationAction, 'id'> & { id: string } = {
            id: crypto.randomUUID(),
            description: text,
            assignee: assignee ? { uid: assignee.uid, displayName: assignee.displayName } : undefined,
            dueDate: dueDate ? Timestamp.fromDate(dueDate) : undefined,
            isCompleted: false,
        };

        const riskRef = doc(db, 'projects', projectId, 'risks', riskId);
        try {
            await updateDoc(riskRef, { actionItems: arrayUnion(newAction) });
            toast({ title: 'Ação de mitigação adicionada.' });
            setActionItemText(prev => ({...prev, [riskId]: ''}));
            setActionAssignees(prev => ({...prev, [riskId]: ''}));
            setActionDueDates(prev => ({...prev, [riskId]: undefined}));
        } catch (error) {
            toast({ title: 'Erro ao adicionar ação.', variant: 'destructive' });
        }
    };

    const handleToggleActionItem = async (riskId: string, actionId: string, isCompleted: boolean) => {
        if (!canEdit) return;
        
        const risk = risks.find(r => r.id === riskId);
        if (!risk) return;

        const updatedActionItems = (risk.actionItems || []).map(item => 
            item.id === actionId ? { ...item, isCompleted: !isCompleted } : item
        );

        handleUpdateRiskField(riskId, 'actionItems', updatedActionItems);
    };


    return (
        <div className="p-4 space-y-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                 <Card>
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary"/> Gestão de Riscos</CardTitle>
                            <CardDescription>Identifique, analise e crie planos para mitigar os riscos do seu projeto.</CardDescription>
                        </div>
                        {canEdit && <DialogTrigger asChild><Button><Plus className="mr-2"/>Adicionar Risco</Button></DialogTrigger>}
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* AI Section */}
                         <Card className="bg-secondary">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="text-blue-500"/> Análise de Risco com IA</CardTitle>
                                <CardDescription>Deixe o assistente inteligente analisar os dados do projeto e sugerir potenciais riscos.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {aiIdentifiedRisks.length > 0 && (
                                     <div className="space-y-3">
                                        <h4 className="font-semibold text-sm">Riscos Sugeridos pela IA:</h4>
                                        {aiIdentifiedRisks.map((risk, index) => (
                                            <div key={index} className="p-3 border bg-background rounded-lg">
                                                <p className="font-semibold">{risk.description}</p>
                                                <p className="text-xs text-muted-foreground italic mt-1">{risk.justification}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <Badge variant="outline">{risk.category}</Badge>
                                                     <Button size="sm" variant="secondary" onClick={() => handlePromoteRisk(risk)}>
                                                        <Plus className="mr-2 h-4 w-4"/> Adicionar ao Registo
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <Button onClick={handleRunAnalysis} disabled={isAnalyzing}>
                                    {isAnalyzing ? <Loader2 className="animate-spin mr-2"/> : <Wand2 className="mr-2"/>}
                                    {isAnalyzing ? 'A analisar...' : 'Analisar Riscos do Projeto'}
                                </Button>
                            </CardContent>
                        </Card>
                        {loading ? <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin"/> Carregando matriz de riscos...</div>
                        : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-semibold mb-4 text-center">Matriz de Probabilidade vs. Impacto</h3>
                                    <div className="grid grid-cols-6 gap-1">
                                        {/* Y-axis labels */}
                                        <div className="col-span-1 flex flex-col-reverse justify-around text-xs font-semibold text-right pr-2">
                                            {PROBABILITY_LABELS.map(label => <div key={label} className="h-16 flex items-center justify-end">{label}</div>)}
                                            <div className="h-8"></div>
                                        </div>
                                        {/* Matrix */}
                                        <div className="col-span-5 grid grid-cols-5 grid-rows-5 gap-1">
                                            {RISK_LEVELS.slice().reverse().flatMap(p => 
                                                RISK_LEVELS.map(i => {
                                                    const score = getRiskScore(p, i);
                                                    const color = getRiskColor(score);
                                                    const relevantRisks = risks.filter(r => r.probability === p && r.impact === i);
                                                    return (
                                                         <TooltipProvider key={`${p}-${i}`} delayDuration={0}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className={cn("h-16 border rounded-md flex items-center justify-center p-1 text-white text-lg font-bold", color)}>
                                                                        {relevantRisks.length > 0 ? relevantRisks.length : ''}
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="font-bold">Prob: {PROBABILITY_LABELS[p-1]}, Impacto: {IMPACT_LABELS[i-1]}</p>
                                                                    {relevantRisks.length > 0 ? (
                                                                        <ul className="list-disc pl-4 mt-1">
                                                                            {relevantRisks.map(r => <li key={r.id} className="text-xs">{r.description}</li>)}
                                                                        </ul>
                                                                    ) : <p className="text-xs">Nenhum risco nesta célula.</p>}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    );
                                                })
                                            )}
                                        </div>
                                         {/* X-axis labels */}
                                        <div className="col-span-1"></div>
                                        <div className="col-span-5 grid grid-cols-5 gap-1 text-xs font-semibold text-center mt-1">
                                            {IMPACT_LABELS.map(label => <div key={label}>{label}</div>)}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                     <h3 className="font-semibold mb-4">Registo de Riscos (Risk Register)</h3>
                                     <Accordion type="single" collapsible className="w-full">
                                        {risks.length === 0 ? <p className="text-sm text-muted-foreground text-center p-4">Nenhum risco registado.</p> :
                                        risks.map(risk => {
                                            const score = getRiskScore(risk.probability, risk.impact);
                                            const color = getRiskColor(score);
                                            return (
                                            <AccordionItem value={risk.id} key={risk.id}>
                                                <div className="flex justify-between items-center w-full pr-4">
                                                    <AccordionTrigger className="flex-1 hover:no-underline">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("w-3 h-3 rounded-full", color)}></div>
                                                            <span className="font-semibold text-sm text-left">{risk.description}</span>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <Select value={risk.status} onValueChange={(v) => handleUpdateRiskField(risk.id, 'status', v)}>
                                                            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Aberto">Aberto</SelectItem>
                                                                <SelectItem value="Em Progresso">Em Progresso</SelectItem>
                                                                <SelectItem value="Mitigado">Mitigado</SelectItem>
                                                                <SelectItem value="Fechado">Fechado</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <AccordionContent className="p-4 space-y-4">
                                                     <div>
                                                        <h4 className="font-semibold text-sm">Plano de Mitigação</h4>
                                                        <Textarea 
                                                            defaultValue={risk.mitigationPlan}
                                                            onBlur={(e) => handleUpdateRiskField(risk.id, 'mitigationPlan', e.target.value)}
                                                            placeholder="Descreva as estratégias para reduzir a probabilidade ou impacto deste risco."
                                                            rows={3}
                                                        />
                                                     </div>
                                                     <div>
                                                        <h4 className="font-semibold text-sm mb-2">Ações</h4>
                                                        <div className="space-y-2 mb-4">
                                                            {(risk.actionItems || []).map(item => (
                                                                 <div key={item.id} className={cn("flex items-start gap-3 p-2 rounded-md", item.isCompleted && "bg-secondary/50")}>
                                                                    <Checkbox 
                                                                        id={`action-${item.id}`} 
                                                                        className="mt-1"
                                                                        checked={item.isCompleted}
                                                                        onCheckedChange={() => handleToggleActionItem(risk.id, item.id, item.isCompleted)}
                                                                        disabled={!canEdit}
                                                                    />
                                                                    <div className="grid gap-1.5 leading-none">
                                                                        <label
                                                                            htmlFor={`action-${item.id}`}
                                                                            className={cn("text-sm font-medium leading-none cursor-pointer", item.isCompleted && "line-through text-muted-foreground")}
                                                                        >
                                                                            {item.description}
                                                                        </label>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {item.assignee?.displayName || 'N/D'}
                                                                            {item.dueDate && ` - Prazo: ${format((item.dueDate as any).toDate(), 'dd/MM/yyyy')}`}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {canEdit && (
                                                             <div className="p-2 border-t space-y-2">
                                                                 <Input placeholder="Nova ação de mitigação..." value={actionItemText[risk.id] || ''} onChange={(e) => setActionItemText(prev => ({...prev, [risk.id]: e.target.value}))} />
                                                                 <div className="flex gap-2">
                                                                    <Select value={actionAssignees[risk.id] || ''} onValueChange={(v) => setActionAssignees(prev => ({...prev, [risk.id]: v}))}>
                                                                        <SelectTrigger className="flex-1"><SelectValue placeholder="Responsável..."/></SelectTrigger>
                                                                        <SelectContent>
                                                                            {teamMembers.map(m => <SelectItem key={m.uid} value={m.uid}>{m.displayName}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                     <DatePicker date={actionDueDates[risk.id]} setDate={(date) => setActionDueDates(prev => ({...prev, [risk.id]: date}))} placeholder="Prazo..." />
                                                                     <Button size="sm" onClick={() => handleAddActionItem(risk.id)} disabled={!(actionItemText[risk.id] || '').trim()}>Adicionar</Button>
                                                                 </div>
                                                             </div>
                                                        )}
                                                     </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        )})}
                                     </Accordion>
                                </div>
                            </div>
                        )
                    }
                    </CardContent>
                </Card>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Novo Risco</DialogTitle>
                        <DialogDescription>Registe um potencial risco para o projeto e avalie-o.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="risk-desc">Descrição do Risco</Label>
                            <Textarea id="risk-desc" placeholder="Ex: Atraso na entrega de materiais críticos." value={description} onChange={e => setDescription(e.target.value)}/>
                        </div>
                         <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select value={category} onValueChange={v => setCategory(v as RiskCategory)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Operacional">Operacional</SelectItem>
                                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                                    <SelectItem value="Segurança">Segurança</SelectItem>
                                    <SelectItem value="Técnico">Técnico</SelectItem>
                                    <SelectItem value="Legal">Legal</SelectItem>
                                    <SelectItem value="Ambiental">Ambiental</SelectItem>
                                    <SelectItem value="Outro">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Probabilidade</Label>
                                <Select value={String(probability)} onValueChange={v => setProbability(Number(v) as RiskLevel)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {RISK_LEVELS.map((level, i) => <SelectItem key={level} value={String(level)}>{level} - {PROBABILITY_LABELS[i]}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Impacto</Label>
                                <Select value={String(impact)} onValueChange={v => setImpact(Number(v) as RiskLevel)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {RISK_LEVELS.map((level, i) => <SelectItem key={level} value={String(level)}>{level} - {IMPACT_LABELS[i]}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                        <Button onClick={handleAddRisk} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Plus className="mr-2"/>}
                            Adicionar Risco
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
