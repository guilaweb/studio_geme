

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, Timestamp, doc, updateDoc, writeBatch, deleteDoc, arrayUnion, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, GripVertical, CircleDollarSign, Pencil, Save, X, Check, Diamond, Library, Users, Truck, Trash2, Clock, Sparkles, Wand2, Search, ShoppingCart, Send, FileDown, Mail, HelpCircle, AlertTriangle, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type WbsItem, type WbsItemWithChildren, WbsItemCategories, type WbsItemCategory } from '@/types/wbs';
import { DatePicker } from '@/components/ui/date-picker';
import { format, differenceInDays } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types/finance';
import type { ProjectWorkforceMember, WorkforceMember } from '@/types/workforce';
import type { Equipment, ProjectEquipment } from '@/types/equipment';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateWbsFlow } from '@/ai/flows/generate-wbs-flow';
import { suggestResources, type ResourceSuggesterOutput } from '@/ai/flows/resource-suggester-flow';
import { suggestEquipment, type EquipmentSuggesterOutput } from '@/ai/flows/equipment-suggester-flow';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PurchaseRequestItem } from '@/types/purchasing';
import type { Supplier } from '@/types/suppliers';
import type { InventoryItem } from '@/types/inventory';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { generateWbsReport } from '@/lib/wbs-report-generator';
import type { Project } from '@/types/project';
import type { UserRole } from '@/app/projects/[id]/page';
import { useAuth } from '@/hooks/use-auth';
import { BarChart as RechartsBarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

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


// Component for adding a new item, can be used for root or child items
const AddWbsItemForm = ({ parentId, projectId, allItems, projectWorkforce, projectEquipment, onFormSubmit, canEdit }: { parentId: string | null; projectId: string; allItems: WbsItem[], projectWorkforce: ProjectWorkforceMember[], projectEquipment: ProjectEquipment[], onFormSubmit?: () => void, canEdit: boolean }) => {
    const [newItemName, setNewItemName] = useState('');
    const [newItemDescription, setNewItemDescription] = useState('');
    const [newItemCategory, setNewItemCategory] = useState<WbsItemCategory>('Outros');
    const [newItemStartDate, setNewItemStartDate] = useState<Date | undefined>();
    const [newItemEndDate, setNewItemEndDate] = useState<Date | undefined>();
    const [newItemBudget, setNewItemBudget] = useState('');
    const [newItemEffortHours, setNewItemEffortHours] = useState('');
    const [newItemDependencies, setNewItemDependencies] = useState<string[]>([]);
    const [isNewItemMilestone, setIsNewItemMilestone] = useState(false);
    const [newAssignedWorkforce, setNewAssignedWorkforce] = useState<string[]>([]);
    const [newAssignedEquipment, setNewAssignedEquipment] = useState<string[]>([]);

    const [isAdding, setIsAdding] = useState(false);
    const { toast } = useToast();

    // Filter out descendants and the item itself from possible dependencies
    const possibleDependencies = useMemo(() => {
        // Since we are creating a new item, it has no descendants yet.
        // We just need to filter out the parent's branch if needed, but for simplicity, show all.
        return allItems;
    }, [allItems]);

    const handleAddItem = async () => {
        if (!newItemName.trim()) {
            toast({ title: 'Nome inválido', description: 'O nome da atividade não pode ser vazio.', variant: 'destructive' });
            return;
        }

        setIsAdding(true);
        try {
             const docData: Omit<WbsItem, 'id' | 'actualCost' | 'children' | 'progress' > = {
                name: newItemName,
                parentId: parentId,
                description: newItemDescription,
                category: newItemCategory,
                startDate: newItemStartDate || undefined,
                endDate: isNewItemMilestone ? (newItemStartDate || undefined) : (newItemEndDate || undefined),
                budget: parseFloat(newItemBudget) || 0,
                effortHours: parseFloat(newItemEffortHours) || 0,
                dependencies: newItemDependencies,
                isMilestone: isNewItemMilestone,
                assignedWorkforce: newAssignedWorkforce,
                assignedEquipment: newAssignedEquipment,
            };

            await addDoc(collection(db, 'projects', projectId, 'wbs'), docData);
            
            // Reset form
            setNewItemName('');
            setNewItemDescription('');
            setNewItemCategory('Outros');
            setNewItemStartDate(undefined);
            setNewItemEndDate(undefined);
            setNewItemBudget('');
            setNewItemEffortHours('');
            setNewItemDependencies([]);
            setIsNewItemMilestone(false);
            setNewAssignedWorkforce([]);
            setNewAssignedEquipment([]);

            toast({ title: 'Item adicionado!', description: `"${newItemName}" foi adicionado ao planejamento.` });
            if (onFormSubmit) {
                onFormSubmit();
            }
        } catch (error) {
            console.error("Error adding WBS item: ", error);
            toast({ title: 'Erro ao adicionar item', variant: 'destructive' });
        } finally {
            setIsAdding(false);
        }
    };
    
    return (
        <div className={cn("space-y-4", parentId ? "mt-4 border-t pt-4" : "")}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor={`new-item-name-${parentId || 'root'}`}>Nome da Atividade</Label>
                    <Input
                        id={`new-item-name-${parentId || 'root'}`}
                        placeholder={parentId ? "Ex: Escavação" : "Ex: Fundações"}
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        disabled={isAdding || !canEdit}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={newItemCategory} onValueChange={(v) => setNewItemCategory(v as WbsItemCategory)} disabled={isAdding || !canEdit}>
                        <SelectTrigger id="category">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {WbsItemCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
             </div>
             <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                    placeholder="Descrição detalhada da atividade (opcional)"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    disabled={isAdding || !canEdit}
                    rows={2}
                />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                 <div className="space-y-2">
                    <Label>Orçamento (Kz)</Label>
                    <Input
                        type="number"
                        placeholder="Ex: 50000.00"
                        value={newItemBudget}
                        onChange={(e) => setNewItemBudget(e.target.value)}
                        disabled={isAdding || !canEdit}
                    />
                </div>
                 <div className="space-y-2">
                     <Label>Data de Início</Label>
                    <DatePicker date={newItemStartDate} setDate={setNewItemStartDate} disabled={isAdding || !canEdit}/>
                 </div>
                 <div className="space-y-2">
                     <Label>Data de Fim</Label>
                     <DatePicker date={newItemEndDate} setDate={setNewItemEndDate} disabled={isNewItemMilestone || isAdding || !canEdit}/>
                 </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                    <Label>Esforço (Horas)</Label>
                    <Input
                        type="number"
                        placeholder="Ex: 80"
                        value={newItemEffortHours}
                        onChange={(e) => setNewItemEffortHours(e.target.value)}
                        disabled={isAdding || isNewItemMilestone || !canEdit}
                    />
                </div>
                <div className="space-y-2 md:col-span-2 flex items-center pt-6">
                    <Checkbox id={`is-milestone-new-${parentId || 'root'}`} checked={isNewItemMilestone} onCheckedChange={(checked) => setIsNewItemMilestone(!!checked)} disabled={isAdding || !canEdit} />
                    <Label htmlFor={`is-milestone-new-${parentId || 'root'}`} className="ml-2 cursor-pointer">Marcar como Marco (Milestone)</Label>
                </div>
            </div>
             <div className="space-y-2 pt-4 border-t">
                <Label>Depende de (Predecessoras)</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isAdding || !canEdit}>
                            {newItemDependencies.length > 0 ? `${newItemDependencies.length} selecionada(s)` : 'Nenhuma dependência'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                       <Command>
                            <CommandInput placeholder="Pesquisar tarefa..." />
                            <CommandList>
                                <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
                                <CommandGroup className='max-h-48 overflow-y-auto'>
                                    {possibleDependencies.map(dep => (
                                        <CommandItem key={dep.id} onSelect={() => {
                                            const newDeps = newItemDependencies.includes(dep.id)
                                                ? newItemDependencies.filter(id => id !== dep.id)
                                                : [...newItemDependencies, dep.id];
                                            setNewItemDependencies(newDeps);
                                        }}>
                                            <Check className={cn("mr-2 h-4 w-4", newItemDependencies.includes(dep.id) ? "opacity-100" : "opacity-0")} />
                                            {dep.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                       </Command>
                    </PopoverContent>
                </Popover>
            </div>
            {/* Resource Allocation */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                     <Label><Users className="inline h-4 w-4 mr-1"/> Mão de Obra Alocada</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isAdding || !canEdit}>
                                {newAssignedWorkforce.length > 0 ? `${newAssignedWorkforce.length} alocado(s)` : 'Nenhum'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                           <Command>
                                <CommandInput placeholder="Procurar membro..." />
                                <CommandList>
                                    <CommandEmpty>Nenhum membro da equipa no projeto.</CommandEmpty>
                                    <CommandGroup className='max-h-48 overflow-y-auto'>
                                    {projectWorkforce.map(member => (
                                        <CommandItem key={member.id} onSelect={() => {
                                            const current = newAssignedWorkforce || [];
                                            const newSelection = current.includes(member.id) ? current.filter(id => id !== member.id) : [...current, member.id];
                                            setNewAssignedWorkforce(newSelection);
                                        }}>
                                        <Check className={cn("mr-2 h-4 w-4", (newAssignedWorkforce || []).includes(member.id) ? "opacity-100" : "opacity-0")}/>
                                        {member.name} ({member.role})
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </CommandList>
                           </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                     <Label><Truck className="inline h-4 w-4 mr-1"/> Equipamentos Alocados</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isAdding || !canEdit}>
                                {newAssignedEquipment.length > 0 ? `${newAssignedEquipment.length} alocado(s)` : 'Nenhum'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                           <Command>
                                <CommandInput placeholder="Procurar equipamento..." />
                                <CommandList>
                                    <CommandEmpty>Nenhum equipamento disponível.</CommandEmpty>
                                    <CommandGroup className='max-h-48 overflow-y-auto'>
                                    {projectEquipment.map(eq => (
                                        <CommandItem
                                        key={eq.id}
                                        onSelect={() => {
                                            const current = newAssignedEquipment || [];
                                            const newSelection = current.includes(eq.id)
                                            ? current.filter(id => id !== eq.id)
                                            : [...current, eq.id];
                                            setNewAssignedEquipment(newSelection);
                                        }}
                                        >
                                        <Check className={cn("mr-2 h-4 w-4", (newAssignedEquipment || []).includes(eq.id) ? "opacity-100" : "opacity-0")}/>
                                        {eq.name}
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </CommandList>
                           </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {canEdit && (
                <Button onClick={handleAddItem} disabled={isAdding} className="mt-4">
                    {isAdding ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                    {parentId ? "Adicionar Atividade" : "Adicionar Fase"}
                </Button>
            )}
        </div>
    );
};

// ...

interface WbsItemRowProps {
    item: WbsItemWithChildren;
    allItems: WbsItem[];
    projectWorkforce: ProjectWorkforceMember[],
    globalWorkforce: WorkforceMember[],
    projectEquipment: ProjectEquipment[],
    projectId: string;
    transactions: Transaction[];
    children?: React.ReactNode,
    openRequestDialog: (item: WbsItemWithChildren) => void,
    canEdit: boolean;
    project: Project | null;
    isCritical: boolean;
}

const WbsItemRow = ({ item, allItems, projectWorkforce, globalWorkforce, projectEquipment, projectId, project, transactions, children, openRequestDialog, canEdit, isCritical }: WbsItemRowProps) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
    const [editData, setEditData] = useState<Partial<WbsItem>>(item);
    const [currentProgress, setCurrentProgress] = useState(item.progress || 0);
    const { toast } = useToast();

    // AI Suggestions state
    type AiSuggestionWithStatus = ResourceSuggesterOutput['suggestions'][0] & { isOnProject: boolean, projectMemberId: string | null, globalMember: WorkforceMember };
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<AiSuggestionWithStatus[]>([]);
    const [isSuggestingEquipment, setIsSuggestingEquipment] = useState(false);
    const [aiEquipmentSuggestions, setAiEquipmentSuggestions] = useState<EquipmentSuggesterOutput['suggestions']>([]);

    // Global workforce search state
    const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');

    const filteredGlobalWorkforce = useMemo(() => {
        const projectMemberIds = new Set(projectWorkforce.map(m => m.workforceId));
        return globalWorkforce
            .filter(gw => !projectMemberIds.has(gw.id)) 
            .filter(gw => gw.name.toLowerCase().includes(globalSearchTerm.toLowerCase()));
    }, [globalWorkforce, projectWorkforce, globalSearchTerm]);

    const handleAllocateAndAssign = async (member: WorkforceMember) => {
        const batch = writeBatch(db);
        try {
            // 1. Add to project's workforce subcollection
            const projectWorkforceRef = doc(collection(db, 'projects', projectId, 'workforce'));
            batch.set(projectWorkforceRef, {
                workforceId: member.id,
                name: member.name,
                role: member.role,
                employmentType: member.employmentType,
                allocatedAt: serverTimestamp(),
            });

            // 2. Update WBS item
            const wbsItemRef = doc(db, 'projects', projectId, 'wbs', item.id);
            batch.update(wbsItemRef, {
                assignedWorkforce: arrayUnion(projectWorkforceRef.id)
            });
            
            await batch.commit();

            // Optimistically update local state for immediate feedback
            const newAssigned = [...(editData.assignedWorkforce || []), projectWorkforceRef.id];
            setEditData(prev => ({...prev, assignedWorkforce: newAssigned }));
            
            setIsGlobalSearchOpen(false);
            toast({ title: 'Sucesso', description: `${member.name} foi alocado ao projeto e atribuído a esta tarefa.`});
        } catch (error) {
            console.error("Error allocating and assigning:", error);
            toast({title: "Erro", description: "Não foi possível alocar e atribuir o funcionário.", variant: "destructive"});
        }
    };


     // Reset editData whenever the dialog is opened for a new item or the same item again
    useEffect(() => {
        if (isEditing) {
            setEditData(item);
        }
    }, [isEditing, item]);

    // Memoize possible dependencies to avoid recalculating on every render
    const possibleDependencies = useMemo(() => {
        const descendantIds = new Set<string>();
        const getDescendants = (currentItem: WbsItemWithChildren) => {
            descendantIds.add(currentItem.id);
            currentItem.children.forEach(getDescendants);
        };
        getDescendants(item);
        
        return allItems.filter(potentialDep => !descendantIds.has(potentialDep.id));
    }, [allItems, item]);

    const costBreakdown = useMemo(() => {
        const breakdown: Record<string, number> = {};
        const descendantIds = new Set<string>();
        const getDescendants = (currentItem: WbsItemWithChildren) => {
            descendantIds.add(currentItem.id);
            currentItem.children.forEach(getDescendants);
        };
        getDescendants(item);

        transactions.forEach(t => {
            if (t.type === 'Despesa' && t.wbsItemId && descendantIds.has(t.wbsItemId)) {
                const category = t.accountName || 'Outros';
                if (!breakdown[category]) {
                    breakdown[category] = 0;
                }
                breakdown[category] += t.amount;
            }
        });
        return Object.entries(breakdown).sort(([, a], [, b]) => b - a);
    }, [item, transactions]);

    const costChartData = useMemo(() => {
        return costBreakdown
            .map(([name, value]) => ({ name, value }))
            .slice(0, 5); // Top 5 categories
    }, [costBreakdown]);
    
    const handleGetAiSuggestions = async () => {
        if (!editData.description) {
            toast({ title: 'Descrição necessária', description: 'Adicione uma descrição à tarefa para que a IA possa fazer sugestões.', variant: 'destructive'});
            return;
        };
        setIsSuggesting(true);
        setAiSuggestions([]);
        try {
            const availableForSuggestion = globalWorkforce.map(m => ({
                id: m.id,
                name: m.name,
                role: m.role,
                skills: m.skills || [],
            }));

            // Serialize WBS items with dates
            const serializableWbs = allItems.map(task => ({
                ...task,
                startDate: task.startDate instanceof Date ? task.startDate.toISOString() : undefined,
                endDate: task.endDate instanceof Date ? task.endDate.toISOString() : undefined,
                baselineStartDate: task.baselineStartDate instanceof Date ? task.baselineStartDate.toISOString() : undefined,
                baselineEndDate: task.baselineEndDate instanceof Date ? task.baselineEndDate.toISOString() : undefined,
            }));

            const result = await suggestResources({
                taskDescription: editData.description,
                availableWorkforce: availableForSuggestion,
                projectSchedule: serializableWbs,
                taskDateRange: {
                    startDate: editData.startDate instanceof Date ? editData.startDate.toISOString() : undefined,
                    endDate: editData.endDate instanceof Date ? editData.endDate.toISOString() : undefined
                }
            });
            
             const suggestionsWithStatus = result.suggestions.map(suggestion => {
                const globalMember = globalWorkforce.find(m => m.id === suggestion.workforceId);
                if (!globalMember) return null;
                const projectMember = projectWorkforce.find(pm => pm.workforceId === globalMember.id);
                return {
                    ...suggestion,
                    globalMember,
                    projectMemberId: projectMember?.id || null,
                    isOnProject: !!projectMember,
                };
            }).filter((s): s is AiSuggestionWithStatus => s !== null);

            setAiSuggestions(suggestionsWithStatus);

            if (suggestionsWithStatus.length === 0) {
                toast({ description: "A IA não encontrou sugestões relevantes para esta tarefa." });
            }

        } catch (error) {
            toast({ title: 'Erro na sugestão da IA', variant: 'destructive' });
        } finally {
            setIsSuggesting(false);
        }
    };
    
    const handleGetAiEquipmentSuggestions = async () => {
        if (!editData.description) {
            toast({ title: 'Descrição necessária', description: 'Adicione uma descrição à tarefa para que a IA possa fazer sugestões de equipamento.', variant: 'destructive'});
            return;
        };
        setIsSuggestingEquipment(true);
        setAiEquipmentSuggestions([]);
        try {
            const result = await suggestEquipment({
                taskDescription: editData.description,
                availableEquipment: projectEquipment.map(eq => ({
                    id: eq.id,
                    name: eq.name,
                    category: eq.category,
                    notes: '' // Placeholder, as global notes are not in ProjectEquipment
                }))
            });
            setAiEquipmentSuggestions(result.suggestions);

            if (result.suggestions.length === 0) {
                toast({ description: "A IA não encontrou sugestões de equipamento para esta tarefa." });
            }
        } catch (error) {
            toast({ title: 'Erro na sugestão de equipamento da IA', variant: 'destructive' });
        } finally {
            setIsSuggestingEquipment(false);
        }
    };


    const handleUpdate = async (fieldUpdate?: { [key: string]: any }) => {
        const itemDocRef = doc(db, 'projects', projectId, 'wbs', item.id);
        
        let dataToUpdate: { [key: string]: any; } = {};

        if (fieldUpdate) {
            dataToUpdate = fieldUpdate;
        } else {
            // Exclude fields that are not part of the WbsItem data model
            const { children, actualCost, ...cleanedData } = editData as WbsItemWithChildren;
             dataToUpdate = {
                ...cleanedData,
                budget: Number(cleanedData.budget) || 0,
                effortHours: Number(cleanedData.effortHours) || 0,
            };
        }
        
        // If it's a milestone, ensure end date equals start date
        if (dataToUpdate.isMilestone && dataToUpdate.startDate) {
            dataToUpdate.endDate = dataToUpdate.startDate;
        }

        try {
            await updateDoc(itemDocRef, dataToUpdate);
            if (!fieldUpdate) {
                toast({ title: 'Item atualizado!' });
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Error updating item: ", error);
            toast({ title: 'Erro ao atualizar', variant: 'destructive' });
        }
    };

    const handleDelete = async () => {
        const batch = writeBatch(db);
        const descendantIds: string[] = [];
    
        const collectDescendants = (currentItem: WbsItemWithChildren) => {
            descendantIds.add(currentItem.id);
            currentItem.children.forEach(collectDescendants);
        };
    
        collectDescendants(item);
    
        // Find all tasks that depend on any of the tasks being deleted
        const allOtherTasks = allItems.filter(task => !descendantIds.includes(task.id));
        allOtherTasks.forEach(task => {
            if (task.dependencies) {
                const newDependencies = task.dependencies.filter(depId => !descendantIds.includes(depId));
                // If dependencies have changed, update the task
                if (newDependencies.length < task.dependencies.length) {
                    const taskRef = doc(db, 'projects', projectId, 'wbs', task.id);
                    batch.update(taskRef, { dependencies: newDependencies });
                }
            }
        });
    
        // Delete the item and all its descendants
        descendantIds.forEach(id => {
            const docRef = doc(db, 'projects', projectId, 'wbs', id);
            batch.delete(docRef);
        });
    
        try {
            await batch.commit();
            toast({ title: 'Item e suas sub-tarefas foram eliminados.' });
        } catch (error) {
            console.error('Error deleting item and descendants:', error);
            toast({ title: 'Erro ao eliminar o item.', variant: 'destructive' });
        }
    };
    
    const handleProgressChange = (value: number[]) => {
        setCurrentProgress(value[0]);
    };

    const handleProgressCommit = (value: number[]) => {
        handleUpdate({ progress: value[0] });
    };

    const handleShareViaWhatsapp = () => {
        let message = `*TAREFA DE PROJETO: ${project?.name || 'N/D'}*\n\n`;
        message += `*Tarefa:* ${item.name}\n`;
        if (item.description) message += `*Descrição:* ${item.description}\n`;
        if (item.startDate) message += `*Início:* ${format(item.startDate, 'dd/MM/yyyy')}\n`;
        if (item.endDate) message += `*Fim:* ${format(item.endDate, 'dd/MM/yyyy')}\n`;
        
        const assignedWorkforceNames = (item.assignedWorkforce || [])
            .map(id => projectWorkforce.find(m => m.id === id)?.name)
            .filter(Boolean)
            .join(', ');
        if (assignedWorkforceNames) message += `*Responsáveis:* ${assignedWorkforceNames}\n`;

        const assignedEquipmentNames = (item.assignedEquipment || [])
            .map(id => projectEquipment.find(eq => eq.id === id)?.name)
            .filter(Boolean)
            .join(', ');
        if (assignedEquipmentNames) message += `*Equipamentos:* ${assignedEquipmentNames}\n`;
        
        message += `\n_Mensagem gerada via Profundidade._`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleShareByEmail = () => {
        const subject = `Tarefa do Projeto ${project?.name || ''}: ${item.name}`;

        let body = `Olá,\n\nVimos por este meio solicitar a vossa melhor cotação para os seguintes materiais/serviços:\n\n`;
        body += `-----------------------------------\n`;
        body += `Projeto: ${project?.name || 'N/D'}\n`;
        body += `Tarefa: ${item.name}\n`;
        if (item.description) body += `Descrição: ${item.description}\n`;
        if (item.startDate) body += `Data de Início: ${format(item.startDate, 'dd/MM/yyyy')}\n`;
        if (item.endDate) body += `Data de Fim: ${format(item.endDate, 'dd/MM/yyyy')}\n`;

        const assignedWorkforceNames = (item.assignedWorkforce || [])
            .map(id => projectWorkforce.find(m => m.id === id)?.name)
            .filter(Boolean)
            .join(', ');
        if (assignedWorkforceNames) body += `Responsáveis: ${assignedWorkforceNames}\n`;

        const assignedEquipmentNames = (item.assignedEquipment || [])
            .map(id => projectEquipment.find(eq => eq.id === id)?.name)
            .filter(Boolean)
            .join(', ');
        if (assignedEquipmentNames) body += `Equipamentos: ${assignedEquipmentNames}\n`;

        body += `-----------------------------------\n\n`;
        body += `Com os melhores cumprimentos,\n`;
        body += `${user?.displayName || 'Gestor de Projeto'}`;


        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl, '_blank');
    };


    const costProgress = item.budget && item.budget > 0 ? (item.actualCost / item.budget) * 100 : 0;
    const balance = (item.budget || 0) - item.actualCost;

    const getCostIndicatorColor = () => {
        if (costProgress > 100) return 'bg-destructive';
        if (costProgress > 85) return 'bg-yellow-500';
        return 'bg-primary';
    };

    const scheduleStatus = useMemo(() => {
        if (!item.endDate || item.isMilestone) return { color: 'bg-gray-300', label: 'N/A' };
        if ((item.progress || 0) >= 100) return { color: 'bg-green-500', label: 'Concluído' };

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(item.endDate);

        if (endDate < today) {
            return { color: 'bg-red-500', label: `Atrasado` };
        }

        const daysRemaining = differenceInDays(endDate, today);
        if (daysRemaining <= 7 && (item.progress || 0) < 80) {
            return { color: 'bg-yellow-500', label: `Em Risco (${daysRemaining} dias restantes)` };
        }

        return { color: 'bg-green-500', label: 'No Prazo' };
    }, [item.endDate, item.progress, item.isMilestone]);

    const costStatus = useMemo(() => {
        if (!item.budget || item.budget === 0 || (item.progress || 0) === 0) {
            return { color: 'bg-gray-300', label: 'N/A' };
        }
        const earnedValue = item.budget * ((item.progress || 0) / 100);
        const actualCost = item.actualCost || 0;
        if (actualCost === 0) return { color: 'bg-green-500', label: 'Sem custos lançados' };

        const cpi = earnedValue / actualCost;

        if (cpi < 0.9) return { color: 'bg-red-500', label: `Acima do Orçamento (IDC: ${cpi.toFixed(2)})` };
        if (cpi < 1) return { color: 'bg-yellow-500', label: `No Limite do Orçamento (IDC: ${cpi.toFixed(2)})` };
        return { color: 'bg-green-500', label: `Dentro do Orçamento (IDC: ${cpi.toFixed(2)})` };
    }, [item.budget, item.progress, item.actualCost]);
    
    const EditDialog = (
         <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Editar Item da EAP</DialogTitle>
                    <DialogDescription>Faça alterações nos detalhes, datas, orçamento e dependências da atividade.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input
                                value={editData.name || ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select value={editData.category || ''} onValueChange={(v) => setEditData(prev => ({...prev, category: v as WbsItemCategory}))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma categoria..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {WbsItemCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea
                            value={editData.description || ''}
                            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Orçamento (Kz)</Label>
                            <Input
                                type="number"
                                value={editData.budget || ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                                disabled={item.children.length > 0}
                            />
                             {item.children.length > 0 && <p className="text-xs text-muted-foreground mt-1">O orçamento é a soma das sub-atividades.</p>}
                        </div>
                         <div className="space-y-2">
                            <Label>Data de Início</Label>
                            <DatePicker
                                date={editData.startDate}
                                setDate={(date) => setEditData(prev => ({ ...prev, startDate: date }))}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label>Data de Fim</Label>
                             <DatePicker
                                date={editData.endDate}
                                setDate={(date) => setEditData(prev => ({ ...prev, endDate: date }))}
                                disabled={editData.isMilestone}
                            />
                        </div>
                     </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Esforço (Horas)</Label>
                            <Input
                                type="number"
                                placeholder="Ex: 80"
                                value={editData.effortHours || ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, effortHours: parseFloat(e.target.value) || 0 }))}
                                disabled={editData.isMilestone}
                            />
                        </div>
                         <div className="flex items-center space-x-2 pt-6 md:col-span-2">
                            <Checkbox
                                id={`is-milestone-edit-${item.id}`}
                                checked={editData.isMilestone}
                                onCheckedChange={(checked) => setEditData(prev => ({ ...prev, isMilestone: !!checked, endDate: checked ? prev.startDate : prev.endDate }))}
                            />
                            <Label htmlFor={`is-milestone-edit-${item.id}`} className="cursor-pointer">Marcar como Marco (Milestone)</Label>
                        </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                        <Label>Depende de (Predecessoras)</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    {editData.dependencies?.length > 0
                                        ? `${editData.dependencies.length} selecionada(s)`
                                        : 'Nenhuma dependência'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Pesquisar tarefa..." />
                                <CommandList>
                                    <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
                                    <CommandGroup className='max-h-48 overflow-y-auto'>
                                    {possibleDependencies.map(dep => (
                                        <CommandItem
                                        key={dep.id}
                                        onSelect={() => {
                                            const currentDeps = editData.dependencies || [];
                                            const newDeps = currentDeps.includes(dep.id)
                                            ? currentDeps.filter(id => id !== dep.id)
                                            : [...currentDeps, dep.id];
                                            setEditData(prev => ({ ...prev, dependencies: newDeps }));
                                        }}
                                        >
                                        <Check
                                            className={cn(
                                            "mr-2 h-4 w-4",
                                            (editData.dependencies || []).includes(dep.id) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {dep.name}
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                <Label><Users className="inline h-4 w-4 mr-1"/> Mão de Obra Alocada</Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleGetAiSuggestions}
                                            disabled={isSuggesting || !editData.description?.trim()}
                                        >
                                            {isSuggesting ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4 text-blue-500"/>}
                                            <span className="ml-2 hidden md:inline">Sugerir</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Sugerir com base na descrição da tarefa</p></TooltipContent>
                                </Tooltip>
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        {editData.assignedWorkforce?.length > 0 ? `${editData.assignedWorkforce.length} alocado(s)` : 'Nenhum'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Procurar membro..." />
                                        <CommandList>
                                            <CommandEmpty>Nenhum membro da equipa no projeto.</CommandEmpty>
                                            {aiSuggestions.length > 0 && (
                                                <CommandGroup heading="Sugestões da IA" className='max-h-48 overflow-y-auto'>
                                                     {aiSuggestions.map(suggestion => (
                                                         <TooltipProvider key={suggestion.workforceId} delayDuration={100}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                     <CommandItem
                                                                        onSelect={() => {
                                                                            if (suggestion.isOnProject) {
                                                                                const current = editData.assignedWorkforce || [];
                                                                                const newSelection = current.includes(suggestion.projectMemberId!) ? current.filter(id => id !== suggestion.projectMemberId) : [...current, suggestion.projectMemberId!];
                                                                                setEditData(prev => ({ ...prev, assignedWorkforce: newSelection }));
                                                                            } else {
                                                                                handleAllocateAndAssign(suggestion.globalMember);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Check className={cn("mr-2 h-4 w-4", (editData.assignedWorkforce || []).includes(suggestion.projectMemberId!) ? "opacity-100" : "opacity-0")}/>
                                                                        <Sparkles className="mr-2 h-4 w-4 text-blue-400"/>
                                                                        {suggestion.globalMember.name}
                                                                        {!suggestion.isOnProject && <Badge variant="outline" className="ml-auto">Alocar</Badge>}
                                                                    </CommandItem>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="right">
                                                                    <p className="text-xs">{suggestion.justification}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                         </TooltipProvider>
                                                     ))}
                                                </CommandGroup>
                                            )}
                                            <CommandGroup heading={aiSuggestions.length > 0 ? "Toda a Equipa no Projeto" : "Equipa do Projeto"} className='max-h-48 overflow-y-auto'>
                                                {projectWorkforce.map(member => (
                                                    <CommandItem key={member.id} onSelect={() => {
                                                        const current = editData.assignedWorkforce || [];
                                                        const newSelection = current.includes(member.id) ? current.filter(id => id !== member.id) : [...current, member.id];
                                                        setEditData(prev => ({ ...prev, assignedWorkforce: newSelection }));
                                                    }}>
                                                        <Check className={cn("mr-2 h-4 w-4", (editData.assignedWorkforce || []).includes(member.id) ? "opacity-100" : "opacity-0")}/>
                                                        {member.name} ({member.role})
                                                    </CommandItem>
                                                ))}
                                                <CommandItem onSelect={() => setIsGlobalSearchOpen(true)} className="text-blue-600 hover:text-blue-700">
                                                    <Search className="mr-2 h-4 w-4" />
                                                    <span>Procurar no Quadro Geral...</span>
                                                </CommandItem>
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                <Label><Truck className="inline h-4 w-4 mr-1"/> Equipamentos Alocados</Label>
                                 <Tooltip>
                                     <TooltipTrigger asChild>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleGetAiEquipmentSuggestions}
                                            disabled={isSuggestingEquipment || !editData.description?.trim()}
                                        >
                                            {isSuggestingEquipment ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4 text-blue-500"/>}
                                            <span className="ml-2 hidden md:inline">Sugerir</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Sugerir com base na descrição da tarefa</p></TooltipContent>
                                </Tooltip>
                            </div>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        {editData.assignedEquipment?.length > 0
                                            ? `${editData.assignedEquipment.length} alocado(s)`
                                            : 'Nenhum'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Procurar equipamento..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhum equipamento disponível.</CommandEmpty>
                                        {aiEquipmentSuggestions.length > 0 && (
                                            <CommandGroup heading="Sugestões da IA" className='max-h-48 overflow-y-auto'>
                                                {aiEquipmentSuggestions.map(suggestion => {
                                                    const equipment = projectEquipment.find(eq => eq.id === suggestion.equipmentId);
                                                    if (!equipment) return null;
                                                    return (
                                                         <TooltipProvider key={suggestion.equipmentId} delayDuration={100}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <CommandItem
                                                                        onSelect={() => {
                                                                            const current = editData.assignedEquipment || [];
                                                                            const newSelection = current.includes(equipment.id) ? current.filter(id => id !== equipment.id) : [...current, equipment.id];
                                                                            setEditData(prev => ({ ...prev, assignedEquipment: newSelection }));
                                                                        }}
                                                                    >
                                                                        <Check className={cn("mr-2 h-4 w-4", (editData.assignedEquipment || []).includes(equipment.id) ? "opacity-100" : "opacity-0")}/>
                                                                        <Sparkles className="mr-2 h-4 w-4 text-blue-400"/>
                                                                        {equipment.name}
                                                                    </CommandItem>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="right">
                                                                    <p className="text-xs">{suggestion.justification}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                         </TooltipProvider>
                                                    );
                                                })}
                                            </CommandGroup>
                                        )}
                                        <CommandGroup heading={aiEquipmentSuggestions.length > 0 ? "Todos os Equipamentos" : "Equipamentos Disponíveis"} className='max-h-48 overflow-y-auto'>
                                        {projectEquipment.map(eq => (
                                            <CommandItem
                                            key={eq.id}
                                            onSelect={() => {
                                                const current = editData.assignedEquipment || [];
                                                const newSelection = current.includes(eq.id)
                                                ? current.filter(id => id !== eq.id)
                                                : [...current, eq.id];
                                                setEditData(prev => ({ ...prev, assignedEquipment: newSelection }));
                                            }}
                                            >
                                            <Check className={cn("mr-2 h-4 w-4", (editData.assignedEquipment || []).includes(eq.id) ? "opacity-100" : "opacity-0")}/>
                                            {eq.name}
                                            </CommandItem>
                                        ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <Dialog open={isGlobalSearchOpen} onOpenChange={setIsGlobalSearchOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adicionar do Quadro Geral</DialogTitle>
                                <DialogDescription>Pesquise e adicione um funcionário do quadro geral da empresa a este projeto e tarefa.</DialogDescription>
                            </DialogHeader>
                            <div className="py-2">
                                <Input placeholder="Pesquisar funcionário..." value={globalSearchTerm} onChange={(e) => setGlobalSearchTerm(e.target.value)} />
                                <ScrollArea className="h-60 mt-4">
                                    <div className="space-y-2">
                                        {filteredGlobalWorkforce.map(member => (
                                            <Button key={member.id} variant="secondary" className="w-full justify-start" onClick={() => handleAllocateAndAssign(member)}>
                                                {member.name} ({member.role})
                                            </Button>
                                        ))}
                                        {filteredGlobalWorkforce.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum funcionário encontrado ou todos já estão no projeto.</p>}
                                    </div>
                                </ScrollArea>
                            </div>
                        </DialogContent>
                    </Dialog>

                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                    <Button onClick={() => handleUpdate()}>Salvar Alterações</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    return (
        <AccordionItem value={item.id}>
             {canEdit && EditDialog}
            <div className="flex flex-wrap items-center justify-between">
                <AccordionTrigger className="font-semibold hover:no-underline flex-grow py-2">
                    <div className='flex items-center justify-between w-full'>
                        <div className='flex items-center gap-2'>
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className={cn('h-2.5 w-2.5 rounded-full', scheduleStatus.color)}></div>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Prazo: {scheduleStatus.label}</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className={cn('h-2.5 w-2.5 rounded-full', costStatus.color)}></div>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Custo: {costStatus.label}</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            {isCritical && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div onClick={(e) => e.stopPropagation()}><AlertTriangle className="h-4 w-4 text-destructive" /></div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Esta tarefa está no caminho crítico.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {item.isMilestone && <Diamond className="h-4 w-4 text-primary" />}
                            <span className="text-left">{item.name}</span>
                        </div>
                    </div>
                </AccordionTrigger>
                <div className="flex items-center flex-wrap gap-2 px-4 py-2 sm:py-0 justify-end">
                    {item.category && <Badge variant="outline">{item.category}</Badge>}
                     {item.budget && item.budget > 0 && !item.isMilestone && (
                        <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <CircleDollarSign className="h-4 w-4" />
                            {formatCurrency(item.budget)}
                        </div>
                    )}
                    {item.startDate && (
                        <div className="text-xs text-muted-foreground font-normal">
                            {format(item.startDate, 'dd/MM/yy')}
                            {!item.isMilestone && item.endDate && ` - ${format(item.endDate, 'dd/MM/yy')}`}
                        </div>
                    )}
                     {canEdit && (
                        <div className='flex items-center'>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><Share2 className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleShareViaWhatsapp()}>
                                        <WhatsAppIcon className="h-4 w-4 mr-2" />
                                        Partilhar via WhatsApp
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => handleShareByEmail()}>
                                        <Mail className="h-4 w-4 mr-2" />
                                        Enviar por Email
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="ghost" size="icon" className="mr-2" onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditData(item); }}>
                                        <div><Pencil className="h-4 w-4" /></div>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Editar Tarefa</p></TooltipContent>
                            </Tooltip>
                            <AlertDialog>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Eliminar Tarefa</p></TooltipContent>
                                </Tooltip>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta ação não pode ser desfeita. Isto irá eliminar permanentemente o item "{item.name}" e todas as suas sub-tarefas.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete}>
                                            Eliminar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                     )}
                </div>
            </div>
            <AccordionContent className="pl-8 space-y-4">
                <div className='space-y-4'>
                    <p className='text-sm text-muted-foreground italic'>{item.description || "Sem descrição."}</p>
                    
                    {!item.isMilestone && (
                        <>
                            <div className='space-y-2'>
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs">Progresso Físico</Label>
                                    <span className="text-xs font-semibold">{Math.round(currentProgress)}%</span>
                                </div>
                                <Slider
                                    defaultValue={[item.progress || 0]}
                                    value={[currentProgress]}
                                    max={100}
                                    step={1}
                                    onValueChange={handleProgressChange}
                                    onValueCommit={handleProgressCommit}
                                    disabled={item.children.length > 0 || !canEdit}
                                />
                                {item.children.length > 0 && <p className="text-xs text-muted-foreground">O progresso é calculado com base nas sub-atividades.</p>}
                            </div>

                            {item.budget && item.budget > 0 && (
                                <div className='space-y-2'>
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">Consumo do Orçamento</Label>
                                        <span className="text-xs font-semibold">{costProgress.toFixed(1)}%</span>
                                    </div>
                                    <Progress value={costProgress} indicatorClassName={getCostIndicatorColor()} />
                                    <div className='flex justify-between text-xs text-muted-foreground'>
                                        <span>Custo Real: {formatCurrency(item.actualCost)}</span>
                                        <span className={cn(balance < 0 && 'text-destructive font-semibold')}>
                                            Saldo: {formatCurrency(balance)}
                                        </span>
                                    </div>
                                </div>
                            )}

                             {item.budget && item.budget > 0 && costBreakdown.length > 0 && (
                                <div className="mt-4 pt-4 border-t">
                                    <h4 className="font-semibold text-sm mb-2">Distribuição de Custos</h4>
                                    <ChartContainer config={{ value: { label: "Custo", color: "hsl(var(--chart-1))" } }} className="h-40 w-full">
                                        <RechartsBarChart data={costChartData} layout="vertical" margin={{ left: 20, right: 20}}>
                                            <XAxis type="number" hide />
                                            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={10} width={120} interval={0}/>
                                            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                                            <Bar dataKey="value" name="Custo" fill="var(--color-value)" radius={4} />
                                        </RechartsBarChart>
                                    </ChartContainer>
                                </div>
                            )}

                        </>
                    )}

                    {(item.assignedWorkforce?.length > 0 || item.assignedEquipment?.length > 0 || item.effortHours) && (
                         <div className='flex flex-wrap gap-4 pt-2 text-xs'>
                            {item.effortHours && (
                                <div>
                                    <p className='font-semibold flex items-center gap-1 mb-1'><Clock className='h-3 w-3'/> Esforço:</p>
                                    <span className='bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full'>{item.effortHours} horas</span>
                                </div>
                            )}
                            {item.assignedWorkforce?.length > 0 && (
                                <div>
                                    <p className='font-semibold flex items-center gap-1 mb-1'><Users className='h-3 w-3'/> Pessoal:</p>
                                    <div className='flex flex-wrap gap-1'>
                                        {item.assignedWorkforce.map(id => {
                                            const member = projectWorkforce.find(m => m.id === id);
                                            return member ? <span key={id} className='bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full'>{member.name}</span> : null;
                                        })}
                                    </div>
                                </div>
                            )}
                             {item.assignedEquipment?.length > 0 && (
                                <div>
                                    <p className='font-semibold flex items-center gap-1 mb-1'><Truck className='h-3 w-3'/> Equipamentos:</p>
                                     <div className='flex flex-wrap gap-1'>
                                        {item.assignedEquipment.map(id => {
                                            const eq = projectEquipment.find(e => e.id === id);
                                            return eq ? <span key={id} className='bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full'>{eq.name}</span> : null;
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                 {canEdit && (
                     <div className="border-t pt-4 mt-4">
                        <h4 className="font-semibold text-sm mb-2">Ações Rápidas</h4>
                        <div className="flex gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={() => openRequestDialog(item)}>
                                        <ShoppingCart className="mr-2 h-4 w-4"/>
                                        Criar Pedido de Compra
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Criar um pedido de cotação associado a esta tarefa.</p></TooltipContent>
                            </Tooltip>
                            <Dialog open={isAddChildDialogOpen} onOpenChange={setIsAddChildDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" />Adicionar Sub-atividade</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-3xl">
                                     <DialogHeader>
                                        <DialogTitle>Adicionar Nova Sub-atividade</DialogTitle>
                                        <DialogDescription>A criar uma nova atividade dentro de "{item.name}".</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 max-h-[70vh] overflow-y-auto px-2">
                                    <AddWbsItemForm 
                                        parentId={item.id} 
                                        projectId={projectId} 
                                        allItems={allItems} 
                                        projectWorkforce={projectWorkforce} 
                                        projectEquipment={projectEquipment}
                                        onFormSubmit={() => setIsAddChildDialogOpen(false)}
                                        canEdit={canEdit}
                                    />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                 )}
                {children}
            </AccordionContent>
        </AccordionItem>
    );
};

interface WbsComponentProps {
    projectId: string;
    project: Project | null;
    userRole: UserRole | null;
}

export function WbsComponent({ projectId, project, userRole }: WbsComponentProps) {
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [projectWorkforce, setProjectWorkforce] = useState<ProjectWorkforceMember[]>([]);
    const [globalWorkforce, setGlobalWorkforce] = useState<WorkforceMember[]>([]);
    const [projectEquipment, setProjectEquipment] = useState<ProjectEquipment[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [isAddPhaseDialogOpen, setIsAddPhaseDialogOpen] = useState(false);
    
    const { user } = useAuth();
    const canEdit = userRole === 'Editor' || userRole === 'Gestor';
    
    // AI Dialog State
    const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiDescription, setAiDescription] = useState('');

    // Purchase Request Dialog State
    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [requestSourceItem, setRequestSourceItem] = useState<WbsItemWithChildren | null>(null);
    const [reqDescription, setReqDescription] = useState('');
    const [reqItems, setReqItems] = useState<Omit<PurchaseRequestItem, 'id'>[]>([]);
    const [reqSelectedSupplierIds, setReqSelectedSupplierIds] = useState<string[]>([]);


    // Debounced function to update project-level progress
    const updateProjectProgress = useMemo(() => {
        let timeoutId: NodeJS.Timeout | null = null;
        
        return (totalProgress: number) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            timeoutId = setTimeout(async () => {
                if (isNaN(totalProgress)) return;

                // Check if progress has actually changed before updating
                if (project && Math.round(totalProgress) === Math.round(project.progress || 0)) {
                    return;
                }

                try {
                    const projectRef = doc(db, 'projects', projectId);
                    await updateDoc(projectRef, { progress: Math.round(totalProgress) });
                } catch (error) {
                    console.error("Failed to update project progress:", error);
                }
            }, 1500); // Debounce for 1.5 seconds
        };
    }, [projectId, project]); // Add project to dependency array

    // Fetch all necessary data
    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        let timeoutId: NodeJS.Timeout;

        const collectionsToFetch = [
            { path: `projects/${projectId}/wbs`, setter: setWbsItems, orderByField: 'name' },
            { path: `projects/${projectId}/transactions`, setter: setTransactions },
            { path: `projects/${projectId}/workforce`, setter: setProjectWorkforce },
            { path: 'workforce', setter: setGlobalWorkforce, orderByField: 'name' },
            { path: `projects/${projectId}/suppliers`, setter: setSuppliers },
            { path: `projects/${projectId}/inventory`, setter: setInventory },
            { path: `projects/${projectId}/equipment`, setter: setProjectEquipment },
        ];

        const unsubscribes = collectionsToFetch.map(({ path, setter, orderByField }) => {
            const collRef = collection(db, path);
            const q = orderByField ? query(collRef, orderBy(orderByField)) : query(collRef);
            
            return onSnapshot(q, (snapshot) => {
                const items = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Convert Timestamps for WBS items
                    if (path.endsWith('wbs')) {
                        return {
                            id: doc.id, ...data,
                            startDate: data.startDate ? (data.startDate as Timestamp).toDate() : undefined,
                            endDate: data.endDate ? (data.endDate as Timestamp).toDate() : undefined,
                            baselineStartDate: data.baselineStartDate ? (data.baselineStartDate as Timestamp).toDate() : undefined,
                            baselineEndDate: data.baselineEndDate ? (data.baselineEndDate as Timestamp).toDate() : undefined,
                        };
                    }
                    return { id: doc.id, ...data };
                });
                setter(items as any);
            }, (error) => {
                console.error(`Error fetching ${path}:`, error);
                toast({ title: `Erro ao carregar dados de ${path}`, variant: 'destructive' });
            });
        });

        // Failsafe loader hide
        const checkLoadingDone = () => {
             timeoutId = setTimeout(() => {
                setLoading(false);
            }, 3000);
        }
        checkLoadingDone();

        return () => {
            clearTimeout(timeoutId);
            unsubscribes.forEach(unsub => unsub());
        };
    }, [projectId, toast]);
    
    const hierarchicalWbs = useMemo((): WbsItemWithChildren[] => {
        const itemsById: { [key: string]: WbsItemWithChildren } = {};
        
        // Initialize items with children array and zero cost
        wbsItems.forEach(item => {
            itemsById[item.id] = { ...item, children: [], actualCost: 0 };
        });

        // Aggregate costs from transactions for each WBS item
        transactions.forEach(t => {
            if (t.type === 'Despesa' && t.wbsItemId && itemsById[t.wbsItemId]) {
                itemsById[t.wbsItemId].actualCost += t.amount;
            }
        });
        
        const roots: WbsItemWithChildren[] = [];
        wbsItems.forEach(item => {
            if (item.parentId && itemsById[item.parentId]) {
                itemsById[item.parentId].children.push(itemsById[item.id]);
            } else {
                roots.push(itemsById[item.id]);
            }
        });

        // Function to recursively sum up costs, budgets, and progress from children
        const calculateTotals = (item: WbsItemWithChildren) => {
            if (item.children.length === 0) {
                return;
            }
            item.children.forEach(calculateTotals);
            
            if (item.children.length > 0) {
                const childrenBudget = item.children.reduce((sum, child) => sum + (child.budget || 0), 0);
                item.budget = childrenBudget;
            }

            const childrenCost = item.children.reduce((sum, child) => sum + child.actualCost, 0);
            item.actualCost += childrenCost;
            
            // Calculate weighted progress
            const totalChildrenBudget = item.children.reduce((sum, child) => sum + (child.budget || 0), 0);
            if (totalChildrenBudget > 0) {
                 const weightedProgress = item.children.reduce((sum, child) => {
                    return sum + ((child.progress || 0) * (child.budget || 0));
                }, 0);
                item.progress = Math.round(weightedProgress / totalChildrenBudget);
            } else {
                // If no budget, simple average
                 const totalProgress = item.children.reduce((sum, child) => sum + (child.progress || 0), 0);
                 item.progress = item.children.length > 0 ? Math.round(totalProgress / item.children.length) : 0;
            }
        };

        roots.forEach(calculateTotals);
        
        // Calculate overall project progress
        const totalProjectBudget = roots.reduce((sum, root) => sum + (root.budget || 0), 0);
        let overallProgress = 0;
        if (totalProjectBudget > 0) {
            const weightedTotalProgress = roots.reduce((sum, root) => sum + (root.progress || 0) * (root.budget || 0), 0);
            overallProgress = weightedTotalProgress / totalProjectBudget;
        } else if (roots.length > 0) {
            const simpleTotalProgress = roots.reduce((sum, root) => sum + (root.progress || 0), 0);
            overallProgress = simpleTotalProgress / roots.length;
        }

        if (wbsItems.length > 0 && project) {
            updateProjectProgress(overallProgress);
        }

        return roots;
    }, [wbsItems, transactions, updateProjectProgress, project]);

    const criticalPathIds = useMemo(() => {
        const tasksWithDates = wbsItems.filter(t => t.startDate && t.endDate && !t.isMilestone);
        if (tasksWithDates.length < 1) return new Set<string>();

        const taskMap = new Map(tasksWithDates.map(t => [t.id, t]));

        const adj: Record<string, string[]> = {};
        const revAdj: Record<string, string[]> = {};
        tasksWithDates.forEach(task => {
            adj[task.id] = [];
            revAdj[task.id] = [];
        });
        tasksWithDates.forEach(task => {
            if (task.dependencies) {
                task.dependencies.forEach(depId => {
                    if (taskMap.has(depId)) {
                        adj[depId].push(task.id);
                        revAdj[task.id].push(depId);
                    }
                });
            }
        });

        const earliestStart: Record<string, number> = {};
        const earliestFinish: Record<string, number> = {};
        const sortedNodes = [...tasksWithDates].sort((a,b) => (a.startDate?.getTime() || 0) - (b.startDate?.getTime() || 0));

        sortedNodes.forEach(task => {
            const duration = task.startDate && task.endDate ? differenceInDays(task.endDate, task.startDate) + 1 : 0;
            if (!task.dependencies || task.dependencies.length === 0) {
                earliestStart[task.id] = 0;
            } else {
                 earliestStart[task.id] = Math.max(...task.dependencies.map(depId => earliestFinish[depId] || 0));
            }
            earliestFinish[task.id] = earliestStart[task.id] + duration;
        });

        const projectDuration = Math.max(0, ...Object.values(earliestFinish));

        const latestFinish: Record<string, number> = {};
        const latestStart: Record<string, number> = {};
        const reverseSortedNodes = [...tasksWithDates].sort((a,b) => (b.endDate?.getTime() || 0) - (a.endDate?.getTime() || 0));

        reverseSortedNodes.forEach(task => {
            const duration = task.startDate && task.endDate ? differenceInDays(task.endDate, task.startDate) + 1 : 0;
            if(!adj[task.id] || adj[task.id].length === 0) {
                latestFinish[task.id] = projectDuration;
            } else {
                 latestFinish[task.id] = Math.min(...adj[task.id].map(succId => latestStart[succId] === undefined ? Infinity : latestStart[succId]));
            }
            latestStart[task.id] = latestFinish[task.id] - duration;
        });

        const calculatedCriticalPathIds = new Set<string>();
        tasksWithDates.forEach(task => {
            const float = latestStart[task.id] - earliestStart[task.id];
            if (Math.abs(float) < 0.01) { 
                calculatedCriticalPathIds.add(task.id);
            }
        });

        return calculatedCriticalPathIds;

    }, [wbsItems]);
    
    const handleGenerateWbsWithAi = async () => {
        if (wbsItems.length > 0) {
            if (!confirm("A sua EAP atual será substituída. Deseja continuar?")) {
                return;
            }
        }
        if (aiDescription.length < 20) {
            toast({ title: 'Descrição muito curta', description: 'Por favor, forneça uma descrição mais detalhada do projeto (mínimo 20 caracteres).', variant: 'destructive' });
            return;
        }
        setIsGenerating(true);
        toast({ title: 'A gerar EAP com IA...', description: 'Aguarde um momento.' });

        try {
            const result = await generateWbsFlow({ description: aiDescription, numPhases: 5 });

            if (!result || result.wbs.length === 0) {
                toast({
                    title: 'Análise Concluída',
                    description: 'A IA não conseguiu gerar uma EAP. Tente uma descrição de projeto diferente ou mais detalhada.',
                    variant: 'destructive'
                });
                setIsGenerating(false);
                return;
            }
            
            const batch = writeBatch(db);

            // Delete existing WBS items first
            wbsItems.forEach(item => {
                const docRef = doc(db, 'projects', projectId, 'wbs', item.id);
                batch.delete(docRef);
            });

            // Create new items with temporary IDs and map them to new Firestore doc refs
            const idMap: Record<string, string> = {};
            result.wbs.forEach(item => {
                const newDocRef = doc(collection(db, 'projects', projectId, 'wbs'));
                idMap[item.id] = newDocRef.id;
            });

            result.wbs.forEach(item => {
                const newDocRef = doc(db, 'projects', projectId, 'wbs', idMap[item.id]);
                const parentId = item.parentId ? idMap[item.parentId] : null;

                batch.set(newDocRef, {
                    name: item.name,
                    parentId: parentId,
                    description: '',
                    budget: 0,
                    progress: 0,
                    // Add other default fields
                });
            });

            await batch.commit();
            toast({ title: 'EAP gerada com sucesso!', description: 'A sua nova estrutura de projeto está pronta.' });
            setIsAiDialogOpen(false);
            setAiDescription('');

        } catch (error: any) {
            toast({ title: 'Erro na Geração', description: error.message, variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleCreateRequest = async () => {
        if (!user) return;
        if (!reqDescription.trim() || reqItems.length === 0 || reqSelectedSupplierIds.length === 0) {
            toast({ title: 'Campos em falta', description: 'Descrição, pelo menos um item e um fornecedor são obrigatórios.', variant: 'destructive' });
            return;
        }

        setIsSubmittingRequest(true);
        try {
            await addDoc(collection(db, 'projects', projectId, 'purchaseRequests'), {
                description: reqDescription,
                items: reqItems.map(item => ({ ...item, id: crypto.randomUUID() })),
                status: 'Aguardando Cotações',
                supplierIds: reqSelectedSupplierIds,
                wbsItemId: requestSourceItem?.id || null,
                author: { uid: user.uid, displayName: user.displayName || user.email },
                createdAt: serverTimestamp(),
            });

            toast({ title: 'Pedido de Cotação criado!' });
            // Reset form
            setReqDescription('');
            setReqItems([]);
            setReqSelectedSupplierIds([]);
            setRequestSourceItem(null);
            setIsRequestDialogOpen(false);
        } catch (error) {
            console.error("Error creating purchase request:", error);
            toast({ title: 'Erro ao criar pedido', variant: 'destructive' });
        } finally {
            setIsSubmittingRequest(false);
        }
    };

    const handleGenerateWbsPdf = async () => {
        if (!project) {
            toast({ title: "Erro", description: "Detalhes do projeto não carregados.", variant: "destructive" });
            return;
        }
        if (hierarchicalWbs.length === 0) {
            toast({ title: "EAP Vazia", description: "Não há dados para gerar o relatório.", variant: "destructive" });
            return;
        }
        toast({ title: "A gerar PDF da EAP..." });
        try {
            await generateWbsReport(project, hierarchicalWbs, projectWorkforce, projectEquipment);
        } catch (e) {
            console.error(e);
            toast({ title: "Erro ao gerar PDF", variant: "destructive" });
        }
    };


    const renderWbsTree = (items: WbsItemWithChildren[]) => {
        return (
            <Accordion type="multiple" className="w-full">
                {items.map(item => (
                    <WbsItemRow
                        key={item.id}
                        item={item}
                        allItems={wbsItems}
                        projectWorkforce={projectWorkforce}
                        globalWorkforce={globalWorkforce}
                        projectEquipment={projectEquipment}
                        projectId={projectId}
                        project={project}
                        transactions={transactions}
                        openRequestDialog={(itemForRequest) => {
                            setRequestSourceItem(itemForRequest);
                            setReqDescription(`Ref: ${itemForRequest.name}`); // pre-fill
                            setIsRequestDialogOpen(true);
                        }}
                        canEdit={canEdit}
                        isCritical={criticalPathIds.has(item.id)}
                    >
                        {item.children.length > 0 && (
                            <div className="space-y-2 mt-4 pt-4 border-t">
                                <h4 className="font-semibold text-sm">Sub-atividades:</h4>
                                {renderWbsTree(item.children)}
                            </div>
                        )}
                    </WbsItemRow>
                ))}
            </Accordion>
        );
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Estrutura Analítica do Projeto (EAP)</CardTitle>
                    <CardDescription>Decomponha o projeto em fases, atividades e orçamentos para um planejamento detalhado.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        Carregando EAP...
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    // AddItemForm for Purchase Request Dialog
    const AddReqItemForm = ({ onAddItem }: { onAddItem: (item: Omit<PurchaseRequestItem, 'id'>) => void }) => {
        const [itemName, setItemName] = useState('');
        const [quantity, setQuantity] = useState('');
        const [unit, setUnit] = useState('un');
        const [selectedInventoryItem, setSelectedInventoryItem] = useState<string>('');

        const handleAddItem = () => {
            if (!itemName.trim() || !quantity) return;
            onAddItem({ name: itemName, quantity: parseFloat(quantity), unit });
            setItemName(''); setQuantity(''); setUnit('un'); setSelectedInventoryItem('');
        };

        const handleInventorySelect = (itemId: string) => {
            if (itemId === 'none') {
                setItemName('');
                setUnit('un');
                setSelectedInventoryItem('');
                return;
            }
            const item = inventory.find(i => i.id === itemId);
            if (item) {
                setItemName(item.name);
                setUnit(item.unit);
                setSelectedInventoryItem(itemId);
            }
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_auto] gap-2 items-end">
                <div className="space-y-1">
                    <Label>Item (do Inventário)</Label>
                    <Select onValueChange={handleInventorySelect} value={selectedInventoryItem}>
                        <SelectTrigger><SelectValue placeholder="Ou selecione do inventário..."/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Nenhum (inserir manualmente)</SelectItem>
                            {inventory.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-1">
                    <Label>Quantidade</Label>
                    <Input type="number" placeholder="10" value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>
                <div className="space-y-1">
                    <Label>Unidade</Label>
                    <Input placeholder="m³" value={unit} onChange={e => setUnit(e.target.value)} />
                </div>
                <Button onClick={handleAddItem} className="self-end">Adicionar</Button>
            </div>
        );
    };


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                     <div>
                        <div className="flex items-center gap-2">
                             <CardTitle>Estrutura Analítica do Projeto (EAP)</CardTitle>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">A Estrutura Analítica do Projeto (EAP) é a decomposição hierárquica do trabalho a ser executado. Comece por criar as fases principais e, de seguida, adicione as atividades dentro de cada fase.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <CardDescription>Decomponha o projeto em fases, atividades e orçamentos para um planejamento detalhado.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {canEdit && (
                            <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline"><Sparkles className="mr-2 h-4 w-4" />Gerar com IA</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-xl">
                                    <DialogHeader>
                                        <DialogTitle>Gerar Estrutura Analítica do Projeto com IA</DialogTitle>
                                        <DialogDescription>
                                            Descreva o seu projeto em detalhe e o nosso assistente irá criar uma estrutura de fases e atividades para si.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-2">
                                        <Label htmlFor="ai-desc">Descrição do Projeto</Label>
                                        <Textarea
                                            id="ai-desc"
                                            placeholder="Ex: Construção de um edifício residencial de 5 andares com 10 apartamentos, garagem subterrânea, e área de lazer com piscina..."
                                            value={aiDescription}
                                            onChange={(e) => setAiDescription(e.target.value)}
                                            rows={6}
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button variant="ghost" onClick={() => setIsAiDialogOpen(false)}>Cancelar</Button>
                                        <Button onClick={handleGenerateWbsWithAi} disabled={isGenerating}>
                                            {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                            {isGenerating ? 'A gerar...' : 'Gerar EAP'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                        {canEdit && (
                             <Dialog open={isAddPhaseDialogOpen} onOpenChange={setIsAddPhaseDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline"><Plus className="mr-2 h-4 w-4" />Adicionar Fase</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-3xl">
                                     <DialogHeader>
                                        <DialogTitle>Adicionar Nova Fase (Nível Raiz)</DialogTitle>
                                    </DialogHeader>
                                    <div className="py-4 max-h-[70vh] overflow-y-auto px-2">
                                    <AddWbsItemForm 
                                        parentId={null} 
                                        projectId={projectId} 
                                        allItems={wbsItems} 
                                        projectWorkforce={projectWorkforce} 
                                        projectEquipment={projectEquipment}
                                        onFormSubmit={() => setIsAddPhaseDialogOpen(false)}
                                        canEdit={canEdit}
                                    />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                        <Button onClick={handleGenerateWbsPdf} variant="outline" size="sm">
                            <FileDown className="mr-2 h-4 w-4" />
                            Imprimir EAP (PDF)
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {hierarchicalWbs.length === 0 ? (
                     <div className="text-center text-muted-foreground p-8">
                        <p>Nenhuma fase ou atividade encontrada.</p>
                        <p className="text-sm">Crie a primeira fase para começar.</p>
                    </div>
                ) : (
                    renderWbsTree(hierarchicalWbs)
                )}
            </CardContent>
            
            <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Novo Pedido de Cotação</DialogTitle>
                        <DialogDescription>A criar pedido a partir da tarefa: <span className="font-semibold">{requestSourceItem?.name}</span></DialogDescription>
                    </DialogHeader>
                     <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto px-2">
                        <div className="space-y-2">
                            <Label htmlFor="req-desc">Descrição do Pedido</Label>
                            <Input id="req-desc" value={reqDescription} onChange={(e) => setReqDescription(e.target.value)} />
                        </div>
                        <div className="space-y-4">
                            <Label>Itens e Quantidades</Label>
                            <div className="p-4 border rounded-md space-y-4">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qtd.</TableHead><TableHead>Unidade</TableHead><TableHead></TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {reqItems.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>{item.unit}</TableCell>
                                                <TableCell><Button variant="ghost" size="icon" onClick={() => setReqItems(prev => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <AddReqItemForm onAddItem={(item) => setReqItems(prev => [...prev, item])} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label>Enviar Para Fornecedores</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">{reqSelectedSupplierIds.length > 0 ? `${reqSelectedSupplierIds.length} selecionado(s)` : 'Selecione os fornecedores'}</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start"><Command><CommandList><CommandGroup className='max-h-48 overflow-y-auto'>
                                    {suppliers.map(supplier => (<CommandItem key={supplier.id} onSelect={() => setReqSelectedSupplierIds(prev => prev.includes(supplier.id) ? prev.filter(id => id !== supplier.id) : [...prev, supplier.id])}><Check className={cn("mr-2 h-4 w-4", reqSelectedSupplierIds.includes(supplier.id) ? "opacity-100" : "opacity-0")} />{supplier.name}</CommandItem>))}
                                </CommandGroup></CommandList></Command></PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:justify-between">
                         <div className="flex gap-2">
                             <Button variant="outline" onClick={() => handleShareFromDialog('email')}>
                                 <Mail className="h-4 w-4 mr-2" />
                                 Enviar por Email
                            </Button>
                             <Button variant="outline" onClick={() => handleShareFromDialog('whatsapp')}>
                                <WhatsAppIcon className="h-4 w-4 mr-2" />
                                Partilhar
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => { setIsRequestDialogOpen(false); }}>Cancelar</Button>
                            <Button onClick={handleCreateRequest} disabled={isSubmittingRequest}>{isSubmittingRequest ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}Criar Pedido</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
