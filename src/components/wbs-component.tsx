
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, Timestamp, doc, updateDoc, writeBatch, deleteDoc, arrayUnion, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, GripVertical, CircleDollarSign, Pencil, Save, X, Check, Diamond, Library, Users, Truck, Trash2, Clock, Sparkles, Wand2, Search, ShoppingCart, Send, FileDown, Mail, HelpCircle, AlertTriangle, Share2, Download, FolderTree, Table as TableIcon, Activity, TrendingUp, Calendar, Filter, ChevronDown, ChevronUp, BookOpen, Copy, Bookmark, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type WbsItem, type WbsItemWithChildren, WbsItemCategories, type WbsItemCategory } from '@/types/wbs';
import { WBS_TEMPLATES, type WbsTemplate, type WbsTemplateItem } from '@/lib/wbs-templates';
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

/**
 * Converte de forma segura qualquer formato de data (Date, Timestamp, string ISO, objeto com toDate/seconds)
 * num Timestamp válido do Firestore, ou devolve null se for nulo/inválido.
 * NUNCA devolve undefined para impedir erros de "Unsupported field value: undefined" no Firestore.
 */
const toTimestampOrNull = (val: any): Timestamp | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : Timestamp.fromDate(val);
    if (typeof val?.toDate === 'function') {
        try {
            const d = val.toDate();
            return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
        } catch {
            return null;
        }
    }
    if (typeof val === 'string' || typeof val === 'number') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
    }
    if (typeof val?.seconds === 'number') {
        return new Timestamp(val.seconds, val.nanoseconds || 0);
    }
    return null;
};

/**
 * Remove qualquer campo cujo valor seja undefined para impedir que o Firestore rejeite a operação.
 */
const cleanFirestorePayload = <T extends Record<string, any>>(obj: T): Partial<T> => {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
        if (val !== undefined) {
            clean[key] = val;
        }
    }
    return clean as Partial<T>;
};

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
    const [newItemDeliverable, setNewItemDeliverable] = useState('');
    const [newItemAcceptanceCriteria, setNewItemAcceptanceCriteria] = useState('');
    const [newAssignedWorkforce, setNewAssignedWorkforce] = useState<string[]>([]);
    const [newAssignedEquipment, setNewAssignedEquipment] = useState<string[]>([]);

    const [isAdding, setIsAdding] = useState(false);
    const { toast } = useToast();

    // Filter out descendants and the item itself from possible dependencies
    const possibleDependencies = useMemo(() => {
        return allItems;
    }, [allItems]);

    const handleAddItem = async () => {
        if (!newItemName.trim()) {
            toast({ title: 'Nome inválido', description: 'O nome da atividade não pode ser vazio.', variant: 'destructive' });
            return;
        }

        setIsAdding(true);
        try {
             const docData: any = cleanFirestorePayload({
                name: newItemName.trim(),
                parentId: parentId || null,
                description: newItemDescription.trim() || '',
                category: newItemCategory,
                startDate: toTimestampOrNull(newItemStartDate),
                endDate: toTimestampOrNull(isNewItemMilestone ? newItemStartDate : newItemEndDate),
                budget: parseFloat(newItemBudget) || 0,
                effortHours: parseFloat(newItemEffortHours) || 0,
                dependencies: newItemDependencies,
                isMilestone: isNewItemMilestone,
                deliverable: newItemDeliverable.trim() || null,
                acceptanceCriteria: newItemAcceptanceCriteria.trim() || null,
                assignedWorkforce: newAssignedWorkforce,
                assignedEquipment: newAssignedEquipment,
                progress: 0,
                actualCost: 0,
            });

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
            setNewItemDeliverable('');
            setNewItemAcceptanceCriteria('');
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
    
    const [showAdvancedFields, setShowAdvancedFields] = useState(false);

    return (
        <div className={cn("space-y-4 p-4 rounded-xl border bg-card/60", parentId ? "mt-3 border-dashed" : "mt-2")}>
             {/* 1. CAMPOS ESSENCIAIS (MÍNIMO ESFORÇO DE DECISÃO) */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div className="space-y-1.5">
                    <Label htmlFor={`new-item-name-${parentId || 'root'}`} className="text-xs font-bold">Nome da Atividade *</Label>
                    <Input
                        id={`new-item-name-${parentId || 'root'}`}
                        placeholder={parentId ? "Ex: Escavação manual de sapatas" : "Ex: Fundações e Estrutura"}
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        disabled={isAdding || !canEdit}
                        className="text-xs"
                    />
                </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="category" className="text-xs font-bold">Frente / Categoria</Label>
                    <Select value={newItemCategory} onValueChange={(v) => setNewItemCategory(v as WbsItemCategory)} disabled={isAdding || !canEdit}>
                        <SelectTrigger id="category" className="text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {WbsItemCategories.map(cat => <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                 <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Orçamento Estimado (Kz)</Label>
                    <Input
                        type="number"
                        placeholder="Ex: 500000"
                        value={newItemBudget}
                        onChange={(e) => setNewItemBudget(e.target.value)}
                        disabled={isAdding || !canEdit}
                        className="text-xs font-mono"
                    />
                </div>
                 <div className="space-y-1.5">
                     <Label className="text-xs font-bold">Data de Início</Label>
                    <DatePicker date={newItemStartDate} setDate={setNewItemStartDate} disabled={isAdding || !canEdit}/>
                 </div>
                 <div className="space-y-1.5">
                     <Label className="text-xs font-bold">Data de Conclusão</Label>
                     <DatePicker date={newItemEndDate} setDate={setNewItemEndDate} disabled={isNewItemMilestone || isAdding || !canEdit}/>
                 </div>
            </div>

            {/* 2. BOTÃO TOGGLE DE OPÇÕES AVANÇADAS */}
            <div className="pt-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                    className="text-xs text-muted-foreground hover:text-foreground h-7 px-2 gap-1.5 font-medium"
                >
                    <SlidersHorizontal className="h-3 w-3" />
                    <span>{showAdvancedFields ? 'Ocultar Opções Avançadas' : '⚙ Opções Avançadas (Recursos, Dependências & Horas)'}</span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", showAdvancedFields && "rotate-180")} />
                </Button>
            </div>

            {/* 3. CAMPOS AVANÇADOS (ESCONDIDOS POR PADRÃO) */}
            {showAdvancedFields && (
                <div className="space-y-3 pt-2 border-t border-border/50 bg-muted/20 p-3 rounded-lg text-xs">
                    <div className="space-y-1.5">
                        <Label className="text-[11px]">Descrição Técnica Detalhada</Label>
                        <Textarea
                            placeholder="Notas construtivas, especificações dos materiais..."
                            value={newItemDescription}
                            onChange={(e) => setNewItemDescription(e.target.value)}
                            disabled={isAdding || !canEdit}
                            rows={2}
                            className="text-xs"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">Entregável Tangível (Deliverable)</Label>
                            <Input
                                placeholder="Ex: Laje betonada e curada, alvará emitido..."
                                value={newItemDeliverable}
                                onChange={(e) => setNewItemDeliverable(e.target.value)}
                                disabled={isAdding || !canEdit}
                                className="text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">Critérios de Aceitação / Qualidade</Label>
                            <Input
                                placeholder="Ex: Nivelamento ±5mm, provete de betão aprovado..."
                                value={newItemAcceptanceCriteria}
                                onChange={(e) => setNewItemAcceptanceCriteria(e.target.value)}
                                disabled={isAdding || !canEdit}
                                className="text-xs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">Esforço de Homem-Hora</Label>
                            <Input
                                type="number"
                                placeholder="Ex: 80"
                                value={newItemEffortHours}
                                onChange={(e) => setNewItemEffortHours(e.target.value)}
                                disabled={isAdding || isNewItemMilestone || !canEdit}
                                className="text-xs font-mono"
                            />
                        </div>
                        <div className="flex items-center pt-4">
                            <Checkbox id={`is-milestone-new-${parentId || 'root'}`} checked={isNewItemMilestone} onCheckedChange={(checked) => setIsNewItemMilestone(!!checked)} disabled={isAdding || !canEdit} />
                            <Label htmlFor={`is-milestone-new-${parentId || 'root'}`} className="ml-2 cursor-pointer text-xs">Marcar como Marco (Milestone)</Label>
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
                </div>
            )}

            {canEdit && (
                <Button onClick={handleAddItem} disabled={isAdding} className="mt-2 text-xs font-semibold bg-primary text-primary-foreground">
                    {isAdding ? <Loader2 className="animate-spin mr-2 h-3.5 w-3.5" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
                    {parentId ? "Adicionar Atividade" : "Adicionar Fase Principal"}
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
    wbsCode?: string;
    openDictionaryModal?: (item: WbsItemWithChildren, code: string) => void;
    onDuplicatePhase?: (item: WbsItemWithChildren) => void;
}

const WbsItemRow = ({ item, allItems, projectWorkforce, globalWorkforce, projectEquipment, projectId, project, transactions, children, openRequestDialog, canEdit, isCritical, wbsCode, openDictionaryModal, onDuplicatePhase }: WbsItemRowProps) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
    const [editData, setEditData] = useState<Partial<WbsItem>>(item);
    const [currentProgress, setCurrentProgress] = useState(item.progress || 0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [showEditAdvanced, setShowEditAdvanced] = useState(false);
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
            if (!currentItem?.id) return;
            descendantIds.add(currentItem.id);
            if (Array.isArray(currentItem.children)) {
                currentItem.children.forEach(getDescendants);
            }
        };
        getDescendants(item);
        
        return allItems.filter(potentialDep => !descendantIds.has(potentialDep.id));
    }, [allItems, item]);

    // Permite mover de nível ou mudar a fase-mãe sem criar ciclos
    const possibleParents = useMemo(() => {
        const descendantIds = new Set<string>();
        const getDescendants = (currentItem: WbsItemWithChildren) => {
            if (!currentItem?.id) return;
            descendantIds.add(currentItem.id);
            if (Array.isArray(currentItem.children)) {
                currentItem.children.forEach(getDescendants);
            }
        };
        getDescendants(item);
        
        return allItems.filter(p => !descendantIds.has(p.id));
    }, [allItems, item]);

    const costBreakdown = useMemo(() => {
        const breakdown: Record<string, number> = {};
        const descendantIds = new Set<string>();
        const getDescendants = (currentItem: WbsItemWithChildren) => {
            if (!currentItem?.id) return;
            descendantIds.add(currentItem.id);
            if (Array.isArray(currentItem.children)) {
                currentItem.children.forEach(getDescendants);
            }
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

            // Serialize WBS items with dates safely
            const serializableWbs = allItems.map(task => ({
                ...task,
                startDate: task.startDate instanceof Date && !isNaN(task.startDate.getTime()) ? task.startDate.toISOString() : undefined,
                endDate: task.endDate instanceof Date && !isNaN(task.endDate.getTime()) ? task.endDate.toISOString() : undefined,
                baselineStartDate: task.baselineStartDate instanceof Date && !isNaN(task.baselineStartDate.getTime()) ? task.baselineStartDate.toISOString() : undefined,
                baselineEndDate: task.baselineEndDate instanceof Date && !isNaN(task.baselineEndDate.getTime()) ? task.baselineEndDate.toISOString() : undefined,
            }));

            const result = await suggestResources({
                taskDescription: editData.description,
                availableWorkforce: availableForSuggestion,
                projectSchedule: serializableWbs,
                taskDateRange: {
                    startDate: editData.startDate instanceof Date && !isNaN(editData.startDate.getTime()) ? editData.startDate.toISOString() : undefined,
                    endDate: editData.endDate instanceof Date && !isNaN(editData.endDate.getTime()) ? editData.endDate.toISOString() : undefined
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
        
        let dataToUpdate: { [key: string]: any } = {};

        if (fieldUpdate) {
            dataToUpdate = { ...fieldUpdate };
            if (dataToUpdate.startDate !== undefined) {
                dataToUpdate.startDate = toTimestampOrNull(dataToUpdate.startDate);
            }
            if (dataToUpdate.endDate !== undefined) {
                dataToUpdate.endDate = toTimestampOrNull(dataToUpdate.endDate);
            }
            if (dataToUpdate.baselineStartDate !== undefined) {
                dataToUpdate.baselineStartDate = toTimestampOrNull(dataToUpdate.baselineStartDate);
            }
            if (dataToUpdate.baselineEndDate !== undefined) {
                dataToUpdate.baselineEndDate = toTimestampOrNull(dataToUpdate.baselineEndDate);
            }
        } else {
            setIsSavingEdit(true);
            // Exclude non-persisted properties
            const { children, actualCost, id, ...cleanedData } = editData as WbsItemWithChildren;

            const sanitized: any = {};
            if (cleanedData.name !== undefined) sanitized.name = cleanedData.name.trim();
            if (cleanedData.category !== undefined) sanitized.category = cleanedData.category;
            if (cleanedData.description !== undefined) sanitized.description = cleanedData.description || '';
            if (cleanedData.deliverable !== undefined) sanitized.deliverable = cleanedData.deliverable?.trim() || null;
            if (cleanedData.acceptanceCriteria !== undefined) sanitized.acceptanceCriteria = cleanedData.acceptanceCriteria?.trim() || null;
            sanitized.parentId = cleanedData.parentId === 'root' ? null : (cleanedData.parentId || null);
            if (cleanedData.budget !== undefined) sanitized.budget = Number(cleanedData.budget) || 0;
            if (cleanedData.effortHours !== undefined) sanitized.effortHours = Number(cleanedData.effortHours) || 0;
            if (cleanedData.isMilestone !== undefined) sanitized.isMilestone = !!cleanedData.isMilestone;
            if (cleanedData.dependencies !== undefined) sanitized.dependencies = Array.isArray(cleanedData.dependencies) ? cleanedData.dependencies : [];
            if (cleanedData.assignedWorkforce !== undefined) sanitized.assignedWorkforce = Array.isArray(cleanedData.assignedWorkforce) ? cleanedData.assignedWorkforce : [];
            if (cleanedData.assignedEquipment !== undefined) sanitized.assignedEquipment = Array.isArray(cleanedData.assignedEquipment) ? cleanedData.assignedEquipment : [];
            
            if (cleanedData.startDate !== undefined) {
                sanitized.startDate = toTimestampOrNull(cleanedData.startDate);
            }
            if (cleanedData.endDate !== undefined || cleanedData.startDate !== undefined) {
                if (cleanedData.isMilestone) {
                    sanitized.endDate = toTimestampOrNull(cleanedData.startDate);
                } else {
                    sanitized.endDate = toTimestampOrNull(cleanedData.endDate);
                }
            }

            // Note: baselineStartDate, baselineEndDate and baselineBudget are not modified here.
            // They are frozen snapshots managed exclusively via handleSaveBaseline.

            dataToUpdate = sanitized;
        }

        // Strict failsafe: remove any key whose value is undefined
        const cleanDataToUpdate = cleanFirestorePayload(dataToUpdate);

        try {
            await updateDoc(itemDocRef, cleanDataToUpdate);
            if (!fieldUpdate) {
                toast({ title: 'Item atualizado!' });
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Error updating item: ", error);
            toast({ title: 'Erro ao atualizar', variant: 'destructive' });
        } finally {
            if (!fieldUpdate) {
                setIsSavingEdit(false);
            }
        }
    };

    const handleDelete = async (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (isDeleting) return;
        setIsDeleting(true);

        try {
            const descendantIds = new Set<string>();

            const collectDescendants = (currentItem: WbsItemWithChildren) => {
                if (!currentItem?.id) return;
                descendantIds.add(currentItem.id);
                if (Array.isArray(currentItem.children)) {
                    currentItem.children.forEach(collectDescendants);
                }
            };

            collectDescendants(item);

            // Prepare batch operations
            type BatchOp = (b: ReturnType<typeof writeBatch>) => void;
            const operations: BatchOp[] = [];

            // 1. Find all other tasks that depend on any of the tasks being deleted and update their dependencies
            const allOtherTasks = allItems.filter(task => !descendantIds.has(task.id));
            allOtherTasks.forEach(task => {
                if (Array.isArray(task.dependencies)) {
                    const newDependencies = task.dependencies.filter(depId => !descendantIds.has(depId));
                    if (newDependencies.length < task.dependencies.length) {
                        const taskRef = doc(db, 'projects', projectId, 'wbs', task.id);
                        operations.push((b) => b.update(taskRef, { dependencies: newDependencies }));
                    }
                }
            });

            // 2. Delete the item and all its descendants
            descendantIds.forEach(id => {
                const docRef = doc(db, 'projects', projectId, 'wbs', id);
                operations.push((b) => b.delete(docRef));
            });

            // Commit in chunks of 450 to respect Firestore batch limit of 500
            const CHUNK_SIZE = 450;
            for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
                const batch = writeBatch(db);
                const chunk = operations.slice(i, i + CHUNK_SIZE);
                chunk.forEach(op => op(batch));
                await batch.commit();
            }

            toast({ title: 'Item e sub-tarefas eliminados com sucesso.' });
        } catch (error) {
            console.error('Error deleting item and descendants:', error);
            toast({ title: 'Erro ao eliminar o item.', description: 'Ocorreu uma falha ao eliminar a fase ou atividade.', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
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


    const actualCostVal = item.actualCost || 0;
    const costProgress = item.budget && item.budget > 0 ? (actualCostVal / item.budget) * 100 : 0;
    const balance = (item.budget || 0) - actualCostVal;

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
                        <Label>Fase Superior (Posição na Hierarquia da EAP)</Label>
                        <Select
                            value={editData.parentId || 'root'}
                            onValueChange={(val) => setEditData(prev => ({ ...prev, parentId: val === 'root' ? null : val }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a fase-mãe..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                                <SelectItem value="root">
                                    <span className="font-semibold text-primary">★ Nível Raiz (Fase Principal 1.0, 2.0...)</span>
                                </SelectItem>
                                {possibleParents.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name} {p.category ? `(${p.category})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Permite mover a atividade para outra fase ou promovê-la a fase principal.
                        </p>
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

                    {/* Toggle de Detalhes e Opções Avançadas */}
                    <div className="pt-2 border-t">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowEditAdvanced(!showEditAdvanced)}
                            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2 gap-1.5 font-medium"
                        >
                            <SlidersHorizontal className="h-3 w-3" />
                            <span>{showEditAdvanced ? 'Ocultar Opções Avançadas' : '⚙ Opções Avançadas (Descrição, Esforço, Entregáveis, Dependências & Recursos)'}</span>
                            <ChevronDown className={cn("h-3 w-3 transition-transform", showEditAdvanced && "rotate-180")} />
                        </Button>
                    </div>

                    {showEditAdvanced && (
                        <div className="space-y-4 pt-3 border-t bg-muted/20 p-3 rounded-lg border">
                            <div className="space-y-2">
                                <Label>Descrição Técnica Detalhada</Label>
                                <Textarea
                                    value={editData.description || ''}
                                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={2}
                                />
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <span>Entregável Tangível (Deliverable)</span>
                                    </Label>
                                    <Input
                                        placeholder="Ex: Laje betonada e curada, alvará emitido..."
                                        value={editData.deliverable || ''}
                                        onChange={(e) => setEditData(prev => ({ ...prev, deliverable: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <span>Critérios de Aceitação / Qualidade</span>
                                    </Label>
                                    <Input
                                        placeholder="Ex: Nivelamento ±5mm, ensaio de betão aprovado..."
                                        value={editData.acceptanceCriteria || ''}
                                        onChange={(e) => setEditData(prev => ({ ...prev, acceptanceCriteria: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 pt-4 border-t">
                                <Label>Depende de (Predecessoras)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            {(editData.dependencies?.length || 0) > 0
                                                ? `${editData.dependencies?.length} selecionada(s)`
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
                                                {(editData.assignedWorkforce?.length || 0) > 0 ? `${editData.assignedWorkforce?.length} alocado(s)` : 'Nenhum'}
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
                                                {(editData.assignedEquipment?.length || 0) > 0
                                                    ? `${editData.assignedEquipment?.length} alocado(s)`
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
                        </div>
                    )}

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
                    <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSavingEdit}>Cancelar</Button>
                    <Button onClick={() => handleUpdate()} disabled={isSavingEdit}>
                        {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Salvar Alterações
                    </Button>
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
                            {item.isMilestone && <Diamond className="h-4 w-4 text-primary shrink-0" />}
                            {wbsCode && (
                                <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-muted/80 text-foreground border border-border shrink-0 shadow-2xs">
                                    {wbsCode}
                                </span>
                            )}
                            <span className="text-left font-medium">{item.name}</span>
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
                                    <Button variant="ghost" size="icon" className="mr-1" onClick={(e) => { e.stopPropagation(); if (openDictionaryModal) openDictionaryModal(item, wbsCode || ''); }}>
                                        <BookOpen className="h-4 w-4 text-primary" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Ficha do Dicionário da EAP</p></TooltipContent>
                            </Tooltip>

                            {onDuplicatePhase && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="mr-1" onClick={(e) => { e.stopPropagation(); onDuplicatePhase(item); }}>
                                            <Copy className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Duplicar Fase com Sub-atividades</p></TooltipContent>
                                </Tooltip>
                            )}

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="mr-2" 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setIsEditing(true); 
                                            setEditData(item); 
                                        }}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Editar Tarefa</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setDeleteAlertOpen(true); 
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Eliminar Tarefa</p></TooltipContent>
                            </Tooltip>

                            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                            <AlertTriangle className="h-5 w-5 text-destructive" />
                                            Eliminar "{item.name}"?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta ação não pode ser desfeita. Isto irá eliminar permanentemente este item
                                            {item.children && item.children.length > 0 && ` e todas as suas ${item.children.length} sub-tarefas subordinadas`}.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={(e) => { e.stopPropagation(); setDeleteAlertOpen(false); }} disabled={isDeleting}>
                                            Cancelar
                                        </AlertDialogCancel>
                                        <Button 
                                            variant="destructive" 
                                            disabled={isDeleting} 
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await handleDelete(e);
                                                setDeleteAlertOpen(false);
                                            }}
                                        >
                                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                            Eliminar
                                        </Button>
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

                    {((item.assignedWorkforce?.length || 0) > 0 || (item.assignedEquipment?.length || 0) > 0 || item.effortHours) && (
                         <div className='flex flex-wrap gap-4 pt-2 text-xs'>
                            {item.effortHours && (
                                <div>
                                    <p className='font-semibold flex items-center gap-1 mb-1'><Clock className='h-3 w-3'/> Esforço:</p>
                                    <span className='bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full'>{item.effortHours} horas</span>
                                </div>
                            )}
                            {(item.assignedWorkforce?.length || 0) > 0 && (
                                <div>
                                    <p className='font-semibold flex items-center gap-1 mb-1'><Users className='h-3 w-3'/> Pessoal:</p>
                                    <div className='flex flex-wrap gap-1'>
                                        {item.assignedWorkforce?.map(id => {
                                            const member = projectWorkforce.find(m => m.id === id);
                                            return member ? <span key={id} className='bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full'>{member.name}</span> : null;
                                        })}
                                    </div>
                                </div>
                            )}
                             {(item.assignedEquipment?.length || 0) > 0 && (
                                <div>
                                    <p className='font-semibold flex items-center gap-1 mb-1'><Truck className='h-3 w-3'/> Equipamentos:</p>
                                     <div className='flex flex-wrap gap-1'>
                                        {item.assignedEquipment?.map(id => {
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
    project?: Project | null;
    userRole?: UserRole | null;
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

    // EAP Controls & View State
    const [activeTab, setActiveTab] = useState<'tree' | 'dictionary'>('tree');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [expandedAccordionItems, setExpandedAccordionItems] = useState<string[]>([]);

    // Template Dialog State
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<WbsTemplate | null>(null);

    // Baseline Dialog State
    const [isBaselineDialogOpen, setIsBaselineDialogOpen] = useState(false);
    const [isSavingBaseline, setIsSavingBaseline] = useState(false);

    // Duplicate Phase Dialog State
    const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
    const [itemToDuplicate, setItemToDuplicate] = useState<WbsItemWithChildren | null>(null);
    const [newDuplicateName, setNewDuplicateName] = useState('');
    const [isDuplicating, setIsDuplicating] = useState(false);

    // Dictionary Sheet Modal State
    const [dictionaryModalOpen, setDictionaryModalOpen] = useState(false);
    const [selectedDictionaryItem, setSelectedDictionaryItem] = useState<any | null>(null);
    const [dictEditName, setDictEditName] = useState('');
    const [dictEditCategory, setDictEditCategory] = useState<WbsItemCategory>('Outros');
    const [dictEditDesc, setDictEditDesc] = useState('');
    const [dictEditDeliverable, setDictEditDeliverable] = useState('');
    const [dictEditCriteria, setDictEditCriteria] = useState('');
    const [dictEditBudget, setDictEditBudget] = useState<string>('');
    const [dictEditProgress, setDictEditProgress] = useState<number>(0);
    const [dictEditStartDate, setDictEditStartDate] = useState<Date | undefined>();
    const [dictEditEndDate, setDictEditEndDate] = useState<Date | undefined>();
    const [dictEditParentId, setDictEditParentId] = useState<string | null>(null);
    const [isSavingDictDetails, setIsSavingDictDetails] = useState(false);

    // Dictionary Delete State
    const [dictItemToDelete, setDictItemToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeletingDictItem, setIsDeletingDictItem] = useState(false);


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
                itemsById[t.wbsItemId].actualCost = (itemsById[t.wbsItemId].actualCost || 0) + t.amount;
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

            const childrenCost = item.children.reduce((sum, child) => sum + (child.actualCost || 0), 0);
            item.actualCost = (item.actualCost || 0) + childrenCost;
            
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

    const handleShareFromDialog = (type: 'whatsapp' | 'email') => {
        const itemsAsText = reqItems.map(item => `- ${item.quantity} ${item.unit} de ${item.name}`).join('\n');
        if (!reqDescription.trim() || !itemsAsText.trim()) {
            toast({ title: 'Campos em falta', description: 'Preencha a descrição e os itens antes de partilhar.', variant: 'destructive' });
            return;
        }
        if (type === 'whatsapp') {
            const selectedSuppliers = suppliers.filter(s => reqSelectedSupplierIds.includes(s.id)).map(s => s.name).join(', ');
            let message = `*PEDIDO DE COTAÇÃO*\n\n*Obra:* ${project?.name || 'N/D'}\n*Descrição:* ${reqDescription}\n\n*Itens a cotar:*\n${itemsAsText}\n\n`;
            if (selectedSuppliers) message += `_(Fornecedores: ${selectedSuppliers})_`;
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            const selectedSupplierEmails = suppliers.filter(s => reqSelectedSupplierIds.includes(s.id) && s.email).map(s => s.email).join(',');
            const subject = `Pedido de Cotação: ${reqDescription}`;
            const body = `Exmos. Srs.,\n\nVimos por este meio solicitar cotação para:\n\n*Obra:* ${project?.name || ''}\n*Descrição:* ${reqDescription}\n\n*Itens:*\n${itemsAsText}\n\nMelhores cumprimentos,`;
            window.open(`mailto:${selectedSupplierEmails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
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


    const handleExpandAll = () => {
        const allIds: string[] = [];
        const collect = (items: WbsItemWithChildren[]) => {
            items.forEach(i => {
                allIds.push(i.id);
                if (i.children && i.children.length > 0) collect(i.children);
            });
        };
        collect(hierarchicalWbs);
        setExpandedAccordionItems(allIds);
    };

    const handleCollapseAll = () => {
        setExpandedAccordionItems([]);
    };

    const handleExportWbsCsv = () => {
        if (hierarchicalWbs.length === 0) {
            toast({ title: "EAP Vazia", description: "Não há dados para exportar.", variant: "destructive" });
            return;
        }

        const flattenItems = (items: WbsItemWithChildren[], prefix = ''): any[] => {
            let res: any[] = [];
            items.forEach((item, index) => {
                const code = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
                const workforceNames = (item.assignedWorkforce || [])
                    .map(id => projectWorkforce.find(m => m.id === id)?.name)
                    .filter(Boolean)
                    .join('; ');
                const equipmentNames = (item.assignedEquipment || [])
                    .map(id => projectEquipment.find(eq => eq.id === id)?.name)
                    .filter(Boolean)
                    .join('; ');
                
                res.push({
                    code,
                    name: item.name,
                    description: item.description || '',
                    deliverable: item.deliverable || '',
                    acceptanceCriteria: item.acceptanceCriteria || '',
                    category: item.category || 'Outros',
                    startDate: item.startDate ? format(item.startDate, 'dd/MM/yyyy') : '',
                    endDate: item.endDate ? format(item.endDate, 'dd/MM/yyyy') : '',
                    budget: item.budget || 0,
                    actualCost: item.actualCost || 0,
                    balance: (item.budget || 0) - (item.actualCost || 0),
                    progress: item.progress || 0,
                    isMilestone: item.isMilestone ? 'Sim' : 'Não',
                    workforce: workforceNames,
                    equipment: equipmentNames,
                });
                if (item.children && item.children.length > 0) {
                    res = res.concat(flattenItems(item.children, code));
                }
            });
            return res;
        };

        const flatData = flattenItems(hierarchicalWbs);
        const headers = ['Código EAP', 'Nome da Atividade/Fase', 'Descrição', 'Entregável (Deliverable)', 'Critérios de Aceitação', 'Categoria', 'Início', 'Fim', 'Orçamento (AOA)', 'Custo Real (AOA)', 'Saldo (AOA)', 'Progresso (%)', 'Marco', 'Pessoal Alocado', 'Equipamentos Alocados'];
        const csvRows = [
            headers.join(';'),
            ...flatData.map(row => [
                `"${row.code}"`,
                `"${row.name.replace(/"/g, '""')}"`,
                `"${row.description.replace(/"/g, '""')}"`,
                `"${row.deliverable.replace(/"/g, '""')}"`,
                `"${row.acceptanceCriteria.replace(/"/g, '""')}"`,
                `"${row.category}"`,
                `"${row.startDate}"`,
                `"${row.endDate}"`,
                row.budget,
                row.actualCost,
                row.balance,
                row.progress,
                `"${row.isMilestone}"`,
                `"${row.workforce}"`,
                `"${row.equipment}"`,
            ].join(';'))
        ];

        const csvContent = '\uFEFF' + csvRows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `EAP_${(project?.name || 'Projeto').replace(/[^a-zA-Z0-9_-]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'EAP Exportada', description: 'Ficheiro CSV gerado e descarregado com sucesso.' });
    };

    // Resumo Executivo / KPIs da EAP
    const eapKpis = useMemo(() => {
        const totalBudget = hierarchicalWbs.reduce((acc, root) => acc + (root.budget || 0), 0);
        const totalCost = hierarchicalWbs.reduce((acc, root) => acc + (root.actualCost || 0), 0);
        const balance = totalBudget - totalCost;
        const totalTasks = wbsItems.length;
        const totalPhases = wbsItems.filter(i => !i.parentId).length;
        const totalMilestones = wbsItems.filter(i => i.isMilestone).length;
        const totalCritical = criticalPathIds.size;
        
        let overallProgress = 0;
        if (totalBudget > 0) {
            const weighted = hierarchicalWbs.reduce((acc, root) => acc + (root.progress || 0) * (root.budget || 0), 0);
            overallProgress = Math.round(weighted / totalBudget);
        } else if (hierarchicalWbs.length > 0) {
            const simple = hierarchicalWbs.reduce((acc, root) => acc + (root.progress || 0), 0);
            overallProgress = Math.round(simple / hierarchicalWbs.length);
        }

        return {
            totalBudget,
            totalCost,
            balance,
            totalTasks,
            totalPhases,
            totalMilestones,
            totalCritical,
            overallProgress,
        };
    }, [hierarchicalWbs, wbsItems, criticalPathIds]);

    // Dicionário da EAP (WBS Dictionary)
    interface WbsDictionaryRow {
        id: string;
        code: string;
        name: string;
        description: string;
        deliverable?: string | null;
        acceptanceCriteria?: string | null;
        category: string;
        parentId?: string | null;
        startDate?: Date;
        endDate?: Date;
        durationDays: number;
        budget: number;
        actualCost: number;
        balance: number;
        progress: number;
        isMilestone: boolean;
        isCritical: boolean;
        workforce: string;
        equipment: string;
        effortHours: number;
        baselineStartDate?: Date;
        baselineEndDate?: Date;
        baselineBudget?: number | null;
    }

    const flattenedWbsDictionary = useMemo((): WbsDictionaryRow[] => {
        const result: WbsDictionaryRow[] = [];
        const traverse = (items: WbsItemWithChildren[], prefix = '') => {
            items.forEach((item, index) => {
                const code = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
                const workforceNames = (item.assignedWorkforce || [])
                    .map(id => projectWorkforce.find(m => m.id === id)?.name)
                    .filter(Boolean)
                    .join(', ');
                const equipmentNames = (item.assignedEquipment || [])
                    .map(id => projectEquipment.find(eq => eq.id === id)?.name)
                    .filter(Boolean)
                    .join(', ');
                const duration = item.startDate && item.endDate ? differenceInDays(item.endDate, item.startDate) + 1 : 0;

                result.push({
                    id: item.id,
                    code,
                    name: item.name,
                    description: item.description || 'Sem descrição.',
                    deliverable: item.deliverable || null,
                    acceptanceCriteria: item.acceptanceCriteria || null,
                    category: item.category || 'Outros',
                    parentId: item.parentId || null,
                    startDate: item.startDate,
                    endDate: item.endDate,
                    durationDays: duration,
                    budget: item.budget || 0,
                    actualCost: item.actualCost || 0,
                    balance: (item.budget || 0) - (item.actualCost || 0),
                    progress: item.progress || 0,
                    isMilestone: !!item.isMilestone,
                    isCritical: criticalPathIds.has(item.id),
                    workforce: workforceNames || 'Nenhum',
                    equipment: equipmentNames || 'Nenhum',
                    effortHours: item.effortHours || 0,
                    baselineStartDate: item.baselineStartDate,
                    baselineEndDate: item.baselineEndDate,
                    baselineBudget: item.baselineBudget,
                });

                if (item.children && item.children.length > 0) {
                    traverse(item.children, code);
                }
            });
        };
        traverse(hierarchicalWbs);
        return result;
    }, [hierarchicalWbs, projectWorkforce, projectEquipment, criticalPathIds]);

    const filteredDictionary = useMemo(() => {
        return flattenedWbsDictionary.filter(row => {
            const matchesSearch = !searchTerm || 
                row.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                row.code.includes(searchTerm) || 
                row.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (row.deliverable && row.deliverable.toLowerCase().includes(searchTerm.toLowerCase())) ||
                row.workforce.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesCategory = categoryFilter === 'all' || row.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [flattenedWbsDictionary, searchTerm, categoryFilter]);

    const filteredHierarchicalWbs = useMemo(() => {
        if (!searchTerm && categoryFilter === 'all') {
            return hierarchicalWbs;
        }

        const filterTree = (nodes: WbsItemWithChildren[]): WbsItemWithChildren[] => {
            return nodes.reduce((acc: WbsItemWithChildren[], node) => {
                const matchesSearch = !searchTerm || 
                    node.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    (node.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (node.deliverable || '').toLowerCase().includes(searchTerm.toLowerCase());
                const matchesCategory = categoryFilter === 'all' || node.category === categoryFilter;
                const selfMatches = matchesSearch && matchesCategory;

                const filteredChildren = node.children && node.children.length > 0 ? filterTree(node.children) : [];

                if (selfMatches || filteredChildren.length > 0) {
                    acc.push({
                        ...node,
                        children: filteredChildren,
                    });
                }
                return acc;
            }, []);
        };

        return filterTree(hierarchicalWbs);
    }, [hierarchicalWbs, searchTerm, categoryFilter]);

    // Parent candidates for dictionary modal (prevents cycles)
    const possibleDictionaryParents = useMemo(() => {
        if (!selectedDictionaryItem) return [];
        const descendantIds = new Set<string>();
        descendantIds.add(selectedDictionaryItem.id);

        const findDescendants = (parentId: string) => {
            wbsItems.filter(it => it.parentId === parentId).forEach(child => {
                descendantIds.add(child.id);
                findDescendants(child.id);
            });
        };
        findDescendants(selectedDictionaryItem.id);

        return wbsItems.filter(it => !descendantIds.has(it.id));
    }, [selectedDictionaryItem, wbsItems]);

    // Handlers para Ficha Técnica do Dicionário
    const handleOpenDictionaryFromRow = (row: WbsDictionaryRow) => {
        setSelectedDictionaryItem(row);
        setDictEditName(row.name || '');
        setDictEditCategory((row.category as WbsItemCategory) || 'Outros');
        setDictEditDesc(row.description === 'Sem descrição.' ? '' : (row.description || ''));
        setDictEditDeliverable(row.deliverable || '');
        setDictEditCriteria(row.acceptanceCriteria || '');
        setDictEditBudget(row.budget !== undefined && row.budget !== null ? String(row.budget) : '');
        setDictEditProgress(row.progress || 0);
        setDictEditStartDate(row.startDate);
        setDictEditEndDate(row.endDate);
        setDictEditParentId(row.parentId || null);
        setDictionaryModalOpen(true);
    };

    const handleOpenDictionaryFromItem = (item: WbsItemWithChildren, code: string) => {
        const row = flattenedWbsDictionary.find(r => r.id === item.id);
        if (row) {
            handleOpenDictionaryFromRow(row);
        } else {
            const workforceNames = (item.assignedWorkforce || [])
                .map(id => projectWorkforce.find(m => m.id === id)?.name)
                .filter(Boolean)
                .join(', ');
            const equipmentNames = (item.assignedEquipment || [])
                .map(id => projectEquipment.find(eq => eq.id === id)?.name)
                .filter(Boolean)
                .join(', ');
            const duration = item.startDate && item.endDate ? differenceInDays(item.endDate, item.startDate) + 1 : 0;
            const tempRow: WbsDictionaryRow = {
                id: item.id,
                code,
                name: item.name,
                description: item.description || '',
                deliverable: item.deliverable || null,
                acceptanceCriteria: item.acceptanceCriteria || null,
                category: item.category || 'Outros',
                parentId: item.parentId || null,
                startDate: item.startDate,
                endDate: item.endDate,
                durationDays: duration,
                budget: item.budget || 0,
                actualCost: item.actualCost || 0,
                balance: (item.budget || 0) - (item.actualCost || 0),
                progress: item.progress || 0,
                isMilestone: !!item.isMilestone,
                isCritical: criticalPathIds.has(item.id),
                workforce: workforceNames || 'Nenhum',
                equipment: equipmentNames || 'Nenhum',
                effortHours: item.effortHours || 0,
            };
            handleOpenDictionaryFromRow(tempRow);
        }
    };

    const handleSaveDictionaryModal = async () => {
        if (!selectedDictionaryItem) return;
        if (!dictEditName.trim()) {
            toast({ title: 'Nome Obrigatório', description: 'Por favor, insira o nome do pacote ou fase.', variant: 'destructive' });
            return;
        }
        setIsSavingDictDetails(true);
        try {
            const itemRef = doc(db, 'projects', projectId, 'wbs', selectedDictionaryItem.id);
            const parsedBudget = parseFloat(dictEditBudget);

            await updateDoc(itemRef, cleanFirestorePayload({
                name: dictEditName.trim(),
                category: dictEditCategory || 'Outros',
                description: dictEditDesc || '',
                deliverable: dictEditDeliverable?.trim() || null,
                acceptanceCriteria: dictEditCriteria?.trim() || null,
                budget: !isNaN(parsedBudget) ? parsedBudget : 0,
                progress: Math.min(100, Math.max(0, dictEditProgress || 0)),
                startDate: toTimestampOrNull(dictEditStartDate),
                endDate: toTimestampOrNull(dictEditEndDate),
                parentId: dictEditParentId || null,
            }));

            toast({
                title: 'Ficha do Dicionário Atualizada!',
                description: `Alterações de "${dictEditName.trim()}" guardadas com sucesso.`,
            });
            setDictionaryModalOpen(false);
        } catch (err) {
            console.error('Erro ao guardar ficha técnica:', err);
            toast({ title: 'Erro ao guardar ficha', description: 'Ocorreu um erro ao atualizar os dados.', variant: 'destructive' });
        } finally {
            setIsSavingDictDetails(false);
        }
    };

    const handleConfirmDeleteDictItem = async () => {
        if (!dictItemToDelete) return;
        setIsDeletingDictItem(true);
        try {
            const targetId = dictItemToDelete.id;
            const descendantIds = new Set<string>();
            descendantIds.add(targetId);

            const findDescendants = (parentId: string) => {
                wbsItems.filter(it => it.parentId === parentId).forEach(child => {
                    descendantIds.add(child.id);
                    findDescendants(child.id);
                });
            };
            findDescendants(targetId);

            type BatchOp = (b: ReturnType<typeof writeBatch>) => void;
            const operations: BatchOp[] = [];

            // 1. Clean dependencies in other items
            const otherItems = wbsItems.filter(task => !descendantIds.has(task.id));
            otherItems.forEach(task => {
                if (Array.isArray(task.dependencies)) {
                    const newDeps = task.dependencies.filter(depId => !descendantIds.has(depId));
                    if (newDeps.length < task.dependencies.length) {
                        const taskRef = doc(db, 'projects', projectId, 'wbs', task.id);
                        operations.push((b) => b.update(taskRef, { dependencies: newDeps }));
                    }
                }
            });

            // 2. Delete item and descendants
            descendantIds.forEach(id => {
                const docRef = doc(db, 'projects', projectId, 'wbs', id);
                operations.push((b) => b.delete(docRef));
            });

            const CHUNK_SIZE = 450;
            for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
                const batch = writeBatch(db);
                const chunk = operations.slice(i, i + CHUNK_SIZE);
                chunk.forEach(op => op(batch));
                await batch.commit();
            }

            toast({
                title: 'Pacote Eliminado',
                description: `"${dictItemToDelete.name}" e todas as suas sub-atividades foram eliminados com sucesso.`,
            });

            if (selectedDictionaryItem && descendantIds.has(selectedDictionaryItem.id)) {
                setDictionaryModalOpen(false);
                setSelectedDictionaryItem(null);
            }
            setDictItemToDelete(null);
        } catch (err) {
            console.error('Erro ao eliminar item:', err);
            toast({ title: 'Erro ao eliminar', description: 'Não foi possível eliminar o item.', variant: 'destructive' });
        } finally {
            setIsDeletingDictItem(false);
        }
    };

    // Handler para Gravar Linha de Base (Baseline)
    const handleSaveBaseline = async () => {
        if (wbsItems.length === 0) {
            toast({ title: 'EAP Vazia', description: 'Crie fases e tarefas antes de congelar a linha de base.', variant: 'destructive' });
            return;
        }
        setIsSavingBaseline(true);
        try {
            const batchOps = wbsItems.map(item => ({
                ref: doc(db, 'projects', projectId, 'wbs', item.id),
                data: cleanFirestorePayload({
                    baselineStartDate: toTimestampOrNull(item.startDate),
                    baselineEndDate: toTimestampOrNull(item.endDate),
                    baselineBudget: item.budget || 0,
                })
            }));

            for (let i = 0; i < batchOps.length; i += 450) {
                const batch = writeBatch(db);
                const chunk = batchOps.slice(i, i + 450);
                chunk.forEach(op => batch.update(op.ref, op.data));
                await batch.commit();
            }

            toast({
                title: 'Linha de Base Registada!',
                description: `Cronograma e orçamentos de ${wbsItems.length} itens congelados como Linha de Base oficial do projeto.`,
            });
            setIsBaselineDialogOpen(false);
        } catch (err) {
            console.error('Erro ao gravar linha de base:', err);
            toast({ title: 'Erro ao gravar linha de base', variant: 'destructive' });
        } finally {
            setIsSavingBaseline(false);
        }
    };

    // Handler para Aplicar Modelo de EAP
    const handleApplyTemplate = async (template: WbsTemplate) => {
        setIsApplyingTemplate(true);
        try {
            const projectStartDate = project?.startDate || new Date();
            let currentDayOffset = 0;

            const createItemsRecursively = async (items: WbsTemplateItem[], parentId: string | null) => {
                for (const tmplItem of items) {
                    const itemStart = new Date(projectStartDate);
                    itemStart.setDate(itemStart.getDate() + currentDayOffset);

                    const duration = tmplItem.durationDays || (tmplItem.effortHours ? Math.ceil(tmplItem.effortHours / 8) : 7);
                    const itemEnd = new Date(itemStart);
                    itemEnd.setDate(itemEnd.getDate() + (tmplItem.isMilestone ? 0 : duration));

                    const docData: any = cleanFirestorePayload({
                        name: tmplItem.name,
                        parentId: parentId,
                        category: tmplItem.category,
                        description: tmplItem.description || '',
                        deliverable: tmplItem.deliverable || null,
                        acceptanceCriteria: tmplItem.acceptanceCriteria || null,
                        effortHours: tmplItem.effortHours || 0,
                        budget: 0,
                        actualCost: 0,
                        progress: 0,
                        isMilestone: !!tmplItem.isMilestone,
                        startDate: toTimestampOrNull(itemStart),
                        endDate: toTimestampOrNull(itemEnd),
                        dependencies: [],
                        assignedWorkforce: [],
                        assignedEquipment: [],
                    });

                    const docRef = await addDoc(collection(db, 'projects', projectId, 'wbs'), docData);

                    if (tmplItem.children && tmplItem.children.length > 0) {
                        await createItemsRecursively(tmplItem.children, docRef.id);
                    } else {
                        currentDayOffset += duration;
                    }
                }
            };

            await createItemsRecursively(template.items, null);

            toast({
                title: 'Modelo Aplicado com Sucesso!',
                description: `A estrutura "${template.title}" foi importada com sucesso para o projeto.`,
            });
            setIsTemplateDialogOpen(false);
        } catch (err) {
            console.error('Erro ao aplicar modelo de EAP:', err);
            toast({ title: 'Erro ao aplicar modelo', variant: 'destructive' });
        } finally {
            setIsApplyingTemplate(false);
        }
    };

    // Handler para Duplicar Fase com Sub-atividades
    const handleDuplicatePhase = async () => {
        if (!itemToDuplicate || !newDuplicateName.trim()) return;
        setIsDuplicating(true);
        try {
            const cloneData: any = cleanFirestorePayload({
                name: newDuplicateName,
                parentId: itemToDuplicate.parentId,
                category: itemToDuplicate.category || 'Outros',
                description: itemToDuplicate.description || '',
                deliverable: itemToDuplicate.deliverable || null,
                acceptanceCriteria: itemToDuplicate.acceptanceCriteria || null,
                effortHours: itemToDuplicate.effortHours || 0,
                budget: itemToDuplicate.budget || 0,
                actualCost: 0,
                progress: 0,
                isMilestone: !!itemToDuplicate.isMilestone,
                startDate: toTimestampOrNull(itemToDuplicate.startDate),
                endDate: toTimestampOrNull(itemToDuplicate.endDate),
                dependencies: [],
                assignedWorkforce: itemToDuplicate.assignedWorkforce || [],
                assignedEquipment: itemToDuplicate.assignedEquipment || [],
            });

            const rootRef = await addDoc(collection(db, 'projects', projectId, 'wbs'), cloneData);

            const cloneChildren = async (children: WbsItemWithChildren[], newParentId: string) => {
                for (const child of children) {
                    const childData: any = cleanFirestorePayload({
                        name: child.name,
                        parentId: newParentId,
                        category: child.category || 'Outros',
                        description: child.description || '',
                        deliverable: child.deliverable || null,
                        acceptanceCriteria: child.acceptanceCriteria || null,
                        effortHours: child.effortHours || 0,
                        budget: child.budget || 0,
                        actualCost: 0,
                        progress: 0,
                        isMilestone: !!child.isMilestone,
                        startDate: toTimestampOrNull(child.startDate),
                        endDate: toTimestampOrNull(child.endDate),
                        dependencies: [],
                        assignedWorkforce: child.assignedWorkforce || [],
                        assignedEquipment: child.assignedEquipment || [],
                    });
                    const childRef = await addDoc(collection(db, 'projects', projectId, 'wbs'), childData);
                    if (child.children && child.children.length > 0) {
                        await cloneChildren(child.children, childRef.id);
                    }
                }
            };

            if (itemToDuplicate.children && itemToDuplicate.children.length > 0) {
                await cloneChildren(itemToDuplicate.children, rootRef.id);
            }

            toast({
                title: 'Fase Duplicada com Sucesso!',
                description: `"${newDuplicateName}" e as suas sub-atividades foram criadas.`,
            });
            setDuplicateDialogOpen(false);
            setItemToDuplicate(null);
        } catch (err) {
            console.error('Erro ao duplicar fase:', err);
            toast({ title: 'Erro ao duplicar fase', variant: 'destructive' });
        } finally {
            setIsDuplicating(false);
        }
    };

    const renderWbsTree = (items: WbsItemWithChildren[], prefix = '') => {
        return (
            <Accordion 
                type="multiple" 
                value={expandedAccordionItems.length > 0 ? expandedAccordionItems : undefined}
                onValueChange={setExpandedAccordionItems}
                className="w-full space-y-2"
            >
                {items.map((item, index) => {
                    const currentCode = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
                    return (
                        <WbsItemRow
                            key={item.id}
                            item={item}
                            wbsCode={currentCode}
                            allItems={wbsItems}
                            projectWorkforce={projectWorkforce}
                            globalWorkforce={globalWorkforce}
                            projectEquipment={projectEquipment}
                            projectId={projectId}
                            project={project || null}
                            transactions={transactions}
                            openRequestDialog={(itemForRequest) => {
                                setRequestSourceItem(itemForRequest);
                                setReqDescription(`Ref: ${itemForRequest.name}`); // pre-fill
                                setIsRequestDialogOpen(true);
                            }}
                            canEdit={canEdit}
                            isCritical={criticalPathIds.has(item.id)}
                            openDictionaryModal={(item, code) => handleOpenDictionaryFromItem(item, code)}
                            onDuplicatePhase={canEdit ? (item) => {
                                setItemToDuplicate(item);
                                setNewDuplicateName(`${item.name} (Cópia)`);
                                setDuplicateDialogOpen(true);
                            } : undefined}
                        >
                            {item.children.length > 0 && (
                                <div className="space-y-2 mt-4 pt-4 border-t">
                                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Sub-atividades ({currentCode}):</h4>
                                    {renderWbsTree(item.children, currentCode)}
                                </div>
                            )}
                        </WbsItemRow>
                    );
                })}
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
        <Card className="shadow-sm border">
            <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <FolderTree className="h-5 w-5 text-primary" />
                                Estrutura Analítica do Projeto (EAP / WBS)
                            </CardTitle>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs text-xs">A Estrutura Analítica do Projeto (EAP) é a decomposição hierárquica e orientada às entregas do trabalho a ser executado. Cada nível detalha o escopo, cronograma, orçamentos e responsáveis.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <CardDescription className="text-xs sm:text-sm">
                            Decomponha o projeto em fases, pacotes de trabalho e tarefas para controle de prazos, custos e avanço físico.
                        </CardDescription>
                    </div>

                    {/* Barra de Ações Rápidas */}
                    <div className="flex flex-wrap items-center gap-2">
                        {canEdit && (
                            <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9">
                                        <Sparkles className="mr-1.5 h-4 w-4 text-purple-600" />
                                        Gerar com IA
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-xl">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                            <Sparkles className="h-5 w-5 text-purple-600" />
                                            Gerar Estrutura Analítica com IA
                                        </DialogTitle>
                                        <DialogDescription>
                                            Descreva o seu projeto em detalhe e a IA criará automaticamente a árvore de fases, atividades, estimativas de esforço e prazos recomendados.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-2">
                                        <Label htmlFor="ai-desc">Descrição do Projeto</Label>
                                        <Textarea
                                            id="ai-desc"
                                            placeholder="Ex: Construção de edifício habitacional de 4 pisos, incluindo fundações diretas, estrutura em betão armado, acabamentos finos e instalações elétricas/hidráulicas..."
                                            value={aiDescription}
                                            onChange={(e) => setAiDescription(e.target.value)}
                                            rows={6}
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button variant="ghost" onClick={() => setIsAiDialogOpen(false)}>Cancelar</Button>
                                        <Button onClick={handleGenerateWbsWithAi} disabled={isGenerating}>
                                            {isGenerating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                            {isGenerating ? 'A gerar estrutura...' : 'Gerar EAP Completa'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}

                        {canEdit && (
                            <Dialog open={isAddPhaseDialogOpen} onOpenChange={setIsAddPhaseDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="h-9">
                                        <Plus className="mr-1.5 h-4 w-4" />
                                        Nova Fase
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-3xl">
                                    <DialogHeader>
                                        <DialogTitle>Adicionar Nova Fase (Nível Raiz 1.0)</DialogTitle>
                                        <DialogDescription>Crie uma fase principal para estruturar as atividades e sub-pacotes de trabalho.</DialogDescription>
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
                        {canEdit && (
                            <Button onClick={() => setIsTemplateDialogOpen(true)} variant="outline" size="sm" className="h-9">
                                <Library className="mr-1.5 h-4 w-4 text-blue-600" />
                                Modelos Prontos
                            </Button>
                        )}

                        {canEdit && (
                            <Button onClick={() => setIsBaselineDialogOpen(true)} variant="outline" size="sm" className="h-9">
                                <Bookmark className="mr-1.5 h-4 w-4 text-amber-600" />
                                Linha de Base
                            </Button>
                        )}

                        <Button onClick={handleExportWbsCsv} variant="outline" size="sm" className="h-9">
                            <Download className="mr-1.5 h-4 w-4" />
                            Exportar CSV
                        </Button>

                        <Button onClick={handleGenerateWbsPdf} variant="outline" size="sm" className="h-9">
                            <FileDown className="mr-1.5 h-4 w-4" />
                            PDF da EAP
                        </Button>
                    </div>
                </div>

                {/* Resumo Executivo / KPIs da EAP */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4">
                    <div className="p-3 bg-muted/40 rounded-lg border">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Estrutura</span>
                            <FolderTree className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-xl font-bold text-foreground">
                            {eapKpis.totalTasks} <span className="text-xs font-normal text-muted-foreground">itens</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{eapKpis.totalPhases} fases principais</div>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Orçado (EAP)</span>
                            <CircleDollarSign className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-xl font-bold text-foreground truncate" title={formatCurrency(eapKpis.totalBudget)}>
                            {formatCurrency(eapKpis.totalBudget)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">Total planeado</div>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Realizado</span>
                            <TrendingUp className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="text-xl font-bold text-foreground truncate" title={formatCurrency(eapKpis.totalCost)}>
                            {formatCurrency(eapKpis.totalCost)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            Saldo: <span className={cn("font-semibold", eapKpis.balance >= 0 ? "text-emerald-600" : "text-destructive")}>
                                {formatCurrency(eapKpis.balance)}
                            </span>
                        </div>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Avanço Físico</span>
                            <Activity className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="text-xl font-bold text-foreground">{eapKpis.overallProgress}%</div>
                        <Progress value={eapKpis.overallProgress} className="h-1.5 mt-1.5" />
                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border col-span-2 md:col-span-1">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Caminho Crítico</span>
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                        </div>
                        <div className="text-xl font-bold text-destructive">
                            {eapKpis.totalCritical} <span className="text-xs font-normal text-muted-foreground">tarefas</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{eapKpis.totalMilestones} marcos (milestones)</div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-2">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                    {/* Barra de Seleção de Vista e Filtros */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b">
                        <TabsList className="bg-muted/70">
                            <TabsTrigger value="tree" className="flex items-center gap-2">
                                <FolderTree className="h-4 w-4" />
                                Decomposição em Árvore
                            </TabsTrigger>
                            <TabsTrigger value="dictionary" className="flex items-center gap-2">
                                <TableIcon className="h-4 w-4" />
                                Dicionário da EAP
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Pesquisa Rápida */}
                            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Pesquisar atividade ou código..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 h-9 text-xs sm:text-sm"
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')} 
                                        className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Filtro por Categoria */}
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-[180px] h-9 text-xs">
                                    <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                                    <SelectValue placeholder="Todas as Categorias" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Categorias</SelectItem>
                                    {WbsItemCategories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Controles de Expansão (Apenas na Árvore) */}
                            {activeTab === 'tree' && (
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="sm" onClick={handleExpandAll} className="h-9 text-xs">
                                        <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                        Expandir Tudo
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleCollapseAll} className="h-9 text-xs">
                                        <ChevronUp className="h-3.5 w-3.5 mr-1" />
                                        Recolher Tudo
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vista 1: Árvore Hierárquica */}
                    <TabsContent value="tree" className="m-0 focus-visible:outline-none">
                        {hierarchicalWbs.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                                <FolderTree className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                                <h3 className="font-semibold text-lg">Nenhuma fase ou atividade registada</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                                    Comece por criar a primeira fase principal ou use o assistente de inteligência artificial para gerar a EAP completa.
                                </p>
                                {canEdit && (
                                    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                                        <Button onClick={() => setIsAddPhaseDialogOpen(true)}>
                                            <Plus className="mr-2 h-4 w-4" /> Criar 1ª Fase
                                        </Button>
                                        <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)} className="border-blue-300 hover:bg-blue-50 text-blue-700 dark:text-blue-300">
                                            <Library className="mr-2 h-4 w-4 text-blue-600" /> Usar Modelo Pronto
                                        </Button>
                                        <Button variant="outline" onClick={() => setIsAiDialogOpen(true)}>
                                            <Sparkles className="mr-2 h-4 w-4 text-purple-600" /> Gerar com IA
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : filteredHierarchicalWbs.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>Nenhum item corresponde ao filtro ou pesquisa.</p>
                                <Button variant="link" size="sm" onClick={() => { setSearchTerm(''); setCategoryFilter('all'); }}>
                                    Limpar filtros
                                </Button>
                            </div>
                        ) : (
                            renderWbsTree(filteredHierarchicalWbs)
                        )}
                    </TabsContent>

                    {/* Vista 2: Dicionário da EAP (Tabela Analítica) */}
                    <TabsContent value="dictionary" className="m-0 focus-visible:outline-none">
                        <div className="border rounded-lg overflow-x-auto bg-card shadow-2xs">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[60px] text-center font-bold">Ficha</TableHead>
                                        <TableHead className="w-[90px] font-bold">Código</TableHead>
                                        <TableHead className="min-w-[200px] font-bold">Pacote / Atividade</TableHead>
                                        <TableHead className="font-bold">Categoria</TableHead>
                                        <TableHead className="font-bold text-center">Período / Dias</TableHead>
                                        <TableHead className="font-bold text-right">Orçamento</TableHead>
                                        <TableHead className="font-bold text-right">Custo Real</TableHead>
                                        <TableHead className="font-bold text-right">Saldo</TableHead>
                                        <TableHead className="font-bold text-center w-[120px]">Progresso</TableHead>
                                        <TableHead className="font-bold min-w-[140px]">Equipa & Recursos</TableHead>
                                        {canEdit && <TableHead className="w-[100px] text-right font-bold pr-4">Ações</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredDictionary.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={canEdit ? 11 : 10} className="text-center py-8 text-muted-foreground">
                                                Nenhum pacote encontrado para o filtro aplicado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredDictionary.map((row) => (
                                            <TableRow key={row.id} className={cn("hover:bg-muted/30 transition-colors", row.isCritical && "bg-destructive/5")}>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        title="Abrir Ficha do Dicionário da EAP"
                                                        onClick={() => handleOpenDictionaryFromRow(row)}
                                                    >
                                                        <BookOpen className="h-4 w-4 text-primary" />
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="font-mono font-semibold text-xs text-primary">
                                                    {row.code}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-0.5">
                                                        <div className="font-medium text-sm flex items-center gap-1.5">
                                                            {row.isMilestone && <Diamond className="h-3.5 w-3.5 text-primary shrink-0" />}
                                                            {row.isCritical && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent><p className="text-xs">Caminho Crítico</p></TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                            <span>{row.name}</span>
                                                        </div>
                                                        {row.deliverable && (
                                                            <div className="text-[11px] text-primary font-medium flex items-center gap-1">
                                                                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                                                                <span className="truncate max-w-[280px]" title={row.deliverable}>
                                                                    {row.deliverable}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {row.description && row.description !== 'Sem descrição.' && (
                                                            <p className="text-xs text-muted-foreground line-clamp-1 italic">
                                                                {row.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[11px] font-normal">
                                                        {row.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center text-xs text-muted-foreground whitespace-nowrap">
                                                    {row.startDate ? (
                                                        <div>
                                                            <div>{format(row.startDate, 'dd/MM/yy')} {row.endDate && `- ${format(row.endDate, 'dd/MM/yy')}`}</div>
                                                            {row.durationDays > 0 && <span className="text-[10px] text-muted-foreground/80">({row.durationDays} dias)</span>}
                                                        </div>
                                                    ) : (
                                                        <span>-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-xs font-medium">
                                                    {formatCurrency(row.budget)}
                                                </TableCell>
                                                <TableCell className="text-right text-xs">
                                                    {formatCurrency(row.actualCost)}
                                                </TableCell>
                                                <TableCell className={cn("text-right text-xs font-semibold", row.balance >= 0 ? "text-emerald-600" : "text-destructive")}>
                                                    {formatCurrency(row.balance)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={row.progress} className="h-2 flex-1" />
                                                        <span className="text-xs font-medium w-8 text-right">{row.progress}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    <div className="space-y-0.5">
                                                        {row.workforce !== 'Nenhum' && (
                                                            <div className="truncate max-w-[160px]" title={row.workforce}>
                                                                <span className="font-semibold text-[10px] text-foreground">Pessoal:</span> {row.workforce}
                                                            </div>
                                                        )}
                                                        {row.equipment !== 'Nenhum' && (
                                                            <div className="truncate max-w-[160px]" title={row.equipment}>
                                                                <span className="font-semibold text-[10px] text-foreground">Eq:</span> {row.equipment}
                                                            </div>
                                                        )}
                                                        {row.workforce === 'Nenhum' && row.equipment === 'Nenhum' && (
                                                            <span className="text-muted-foreground/60">-</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                {canEdit && (
                                                    <TableCell className="text-right pr-4">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                            onClick={() => handleOpenDictionaryFromRow(row)}
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>Editar no Dicionário</p></TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>

                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                                                                            onClick={() => setDictItemToDelete({ id: row.id, name: row.name })}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>Eliminar Pacote</p></TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
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
                                <Share2 className="h-4 w-4 mr-2" />
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
            {/* Modal Ficha do Dicionário da EAP */}
            <Dialog open={dictionaryModalOpen} onOpenChange={setDictionaryModalOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20 px-2 py-0.5">
                                WBS {selectedDictionaryItem?.code}
                            </Badge>
                            <DialogTitle className="text-xl font-bold truncate">
                                {selectedDictionaryItem?.name}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="flex items-center gap-2 pt-1">
                            <span>Ficha Técnica do Pacote de Trabalho / Dicionário da EAP</span>
                            {selectedDictionaryItem?.category && (
                                <Badge variant="secondary" className="text-[11px]">
                                    {selectedDictionaryItem.category}
                                </Badge>
                            )}
                            {selectedDictionaryItem?.isMilestone && (
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[11px] border-amber-500/30">
                                    <Diamond className="w-3 h-3 mr-1 fill-current" /> Marco do Projeto
                                </Badge>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-5 py-3">
                        {/* Secção 0: Identificação e Posição na Hierarquia */}
                        <div className="rounded-lg border bg-card p-4 space-y-4 shadow-2xs">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <FolderTree className="h-3.5 w-3.5 text-primary" />
                                Identificação e Estrutura Hierárquica
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="dict-name" className="text-xs font-semibold">Nome do Pacote / Fase</Label>
                                    <Input
                                        id="dict-name"
                                        value={dictEditName}
                                        onChange={(e) => setDictEditName(e.target.value)}
                                        placeholder="Ex: Fundações e Estrutura de Betão"
                                        disabled={!canEdit}
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="dict-category" className="text-xs font-semibold">Categoria</Label>
                                    <Select
                                        value={dictEditCategory}
                                        onValueChange={(val) => setDictEditCategory(val as WbsItemCategory)}
                                        disabled={!canEdit}
                                    >
                                        <SelectTrigger id="dict-category" className="h-9 text-sm">
                                            <SelectValue placeholder="Selecione a categoria..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {WbsItemCategories.map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="dict-parent" className="text-xs font-semibold">
                                    Fase Superior (Posição na Hierarquia da EAP)
                                </Label>
                                <Select
                                    value={dictEditParentId || 'root'}
                                    onValueChange={(val) => setDictEditParentId(val === 'root' ? null : val)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger id="dict-parent" className="h-9 text-sm">
                                        <SelectValue placeholder="Selecione a fase-mãe..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-56">
                                        <SelectItem value="root">
                                            <span className="font-semibold text-primary">★ Nível Raiz (Fase Principal 1.0, 2.0...)</span>
                                        </SelectItem>
                                        {possibleDictionaryParents.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} {p.category ? `(${p.category})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                                <div className="space-y-1.5">
                                    <Label htmlFor="dict-budget" className="text-xs font-semibold">Orçamento Previsto (AOA)</Label>
                                    <Input
                                        id="dict-budget"
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={dictEditBudget}
                                        onChange={(e) => setDictEditBudget(e.target.value)}
                                        placeholder="0.00"
                                        disabled={!canEdit}
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="dict-progress" className="text-xs font-semibold">Avanço Físico (%)</Label>
                                    <Input
                                        id="dict-progress"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={dictEditProgress}
                                        onChange={(e) => setDictEditProgress(Number(e.target.value))}
                                        disabled={!canEdit}
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Data de Início</Label>
                                    <DatePicker
                                        date={dictEditStartDate}
                                        setDate={setDictEditStartDate}
                                        disabled={!canEdit}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Data de Fim</Label>
                                    <DatePicker
                                        date={dictEditEndDate}
                                        setDate={setDictEditEndDate}
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Secção 1: Descrição Detalhada do Escopo */}
                        <div className="space-y-2">
                            <Label htmlFor="dict-desc" className="text-sm font-semibold flex items-center gap-1.5">
                                <BookOpen className="h-4 w-4 text-primary" />
                                Descrição do Escopo do Pacote de Trabalho
                            </Label>
                            <Textarea
                                id="dict-desc"
                                value={dictEditDesc}
                                onChange={(e) => setDictEditDesc(e.target.value)}
                                placeholder="Descreva detalhadamente o que está e o que não está incluído neste pacote..."
                                disabled={!canEdit}
                                rows={3}
                                className="text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                Define com clareza o limite do trabalho a realizar para evitar ambiguidades com empreiteiros e fornecedores.
                            </p>
                        </div>

                        {/* Secção 2: Entregável Tangível (Deliverable) */}
                        <div className="space-y-2">
                            <Label htmlFor="dict-deliverable" className="text-sm font-semibold flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                Entregável Tangível (Deliverable)
                            </Label>
                            <Input
                                id="dict-deliverable"
                                value={dictEditDeliverable}
                                onChange={(e) => setDictEditDeliverable(e.target.value)}
                                placeholder="Ex: Lajes betonadas e curadas; Auto de vistoria camarária assinado; Janelas montadas..."
                                disabled={!canEdit}
                                className="text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                Produto, resultado ou serviço verificável e mensurável que conclui este pacote (PMBOK / ISO 21500).
                            </p>
                        </div>

                        {/* Secção 3: Critérios Técnicos de Aceitação */}
                        <div className="space-y-2">
                            <Label htmlFor="dict-criteria" className="text-sm font-semibold flex items-center gap-1.5">
                                <Check className="h-4 w-4 text-blue-600" />
                                Critérios de Aceitação Técnica e Qualidade
                            </Label>
                            <Textarea
                                id="dict-criteria"
                                value={dictEditCriteria}
                                onChange={(e) => setDictEditCriteria(e.target.value)}
                                placeholder="Ex: Tolerância de nivelamento < 3mm; Ensaio de estanquidade 72h sem fuga; Betão classe C30/37 aprovado..."
                                disabled={!canEdit}
                                rows={2}
                                className="text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                Condições técnicas, normativas ou ensaios obrigatórios para aprovação e receção do trabalho pela fiscalização.
                            </p>
                        </div>

                        {/* Secção 4: Painel de Informações Técnicas e Financeiras */}
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Activity className="h-3.5 w-3.5" />
                                Parâmetros Operacionais e Controlo Financeiro
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div className="bg-card p-2.5 rounded border">
                                    <span className="text-muted-foreground block text-[11px]">Orçamento</span>
                                    <span className="font-semibold text-sm">{formatCurrency(selectedDictionaryItem?.budget)}</span>
                                </div>
                                <div className="bg-card p-2.5 rounded border">
                                    <span className="text-muted-foreground block text-[11px]">Custo Real</span>
                                    <span className="font-semibold text-sm">{formatCurrency(selectedDictionaryItem?.actualCost)}</span>
                                </div>
                                <div className="bg-card p-2.5 rounded border">
                                    <span className="text-muted-foreground block text-[11px]">Saldo Previsto</span>
                                    <span className={cn("font-semibold text-sm", (selectedDictionaryItem?.balance || 0) < 0 ? "text-destructive" : "text-emerald-600")}>
                                        {formatCurrency(selectedDictionaryItem?.balance)}
                                    </span>
                                </div>
                                <div className="bg-card p-2.5 rounded border">
                                    <span className="text-muted-foreground block text-[11px]">Avanço Físico</span>
                                    <span className="font-semibold text-sm">{selectedDictionaryItem?.progress || 0}%</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                                <div className="bg-card p-2.5 rounded border">
                                    <span className="text-muted-foreground block text-[11px]">Período Programado</span>
                                    <span className="font-medium">
                                        {selectedDictionaryItem?.startDate ? format(selectedDictionaryItem.startDate, 'dd/MM/yyyy') : 'N/D'}
                                        {' → '}
                                        {selectedDictionaryItem?.endDate ? format(selectedDictionaryItem.endDate, 'dd/MM/yyyy') : 'N/D'}
                                    </span>
                                </div>
                                <div className="bg-card p-2.5 rounded border">
                                    <span className="text-muted-foreground block text-[11px]">Duração / Horas de Esforço</span>
                                    <span className="font-medium">
                                        {selectedDictionaryItem?.durationDays || 0} dias ({selectedDictionaryItem?.effortHours || 0}h estimadas)
                                    </span>
                                </div>
                                <div className="bg-card p-2.5 rounded border">
                                    <span className="text-muted-foreground block text-[11px]">Caminho Crítico</span>
                                    <span className={cn("font-medium", selectedDictionaryItem?.isCritical ? "text-destructive font-semibold" : "text-muted-foreground")}>
                                        {selectedDictionaryItem?.isCritical ? '⚠️ Sim (Sem Folga)' : 'Não'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                                <div className="bg-card p-2.5 rounded border">
                                    <span className="text-muted-foreground block text-[11px]">Mão de Obra Responsável</span>
                                    <span className="font-medium text-foreground">{selectedDictionaryItem?.workforce || 'Nenhuma alocada'}</span>
                                </div>
                                <div className="bg-card p-2.5 rounded border">
                                    <span className="text-muted-foreground block text-[11px]">Equipamentos Alocados</span>
                                    <span className="font-medium text-foreground">{selectedDictionaryItem?.equipment || 'Nenhum alocado'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:justify-between border-t pt-3">
                        <div>
                            {canEdit && selectedDictionaryItem && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                    onClick={() => setDictItemToDelete({ id: selectedDictionaryItem.id, name: dictEditName || selectedDictionaryItem.name })}
                                >
                                    <Trash2 className="h-4 w-4 mr-1.5" />
                                    Eliminar Pacote
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => setDictionaryModalOpen(false)}>
                                Fechar
                            </Button>
                            {canEdit && (
                                <Button onClick={handleSaveDictionaryModal} disabled={isSavingDictDetails}>
                                    {isSavingDictDetails ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            A Guardar...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Guardar Alterações
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmação de Eliminação no Dicionário da EAP */}
            <AlertDialog open={!!dictItemToDelete} onOpenChange={(open) => { if (!open) setDictItemToDelete(null); }}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Eliminar "{dictItemToDelete?.name}"?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isto irá eliminar permanentemente este pacote de trabalho e todas as suas sub-atividades subordinadas, limpando as dependências de tarefas relacionadas na EAP.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingDictItem} onClick={() => setDictItemToDelete(null)}>
                            Cancelar
                        </AlertDialogCancel>
                        <Button
                            variant="destructive"
                            disabled={isDeletingDictItem}
                            onClick={handleConfirmDeleteDictItem}
                        >
                            {isDeletingDictItem ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Eliminar Pacote
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de Modelos Prontos de EAP */}
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[88vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Library className="h-5 w-5 text-blue-600" />
                            Modelos Profissionais de Estrutura Analítica (EAP / WBS)
                        </DialogTitle>
                        <DialogDescription>
                            Escolha uma estrutura analítica de referência com fases, entregáveis, critérios de aceitação e durações estimadas conforme as normas da construção civil.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 overflow-y-auto py-3">
                        {/* Lista de Modelos */}
                        <div className="md:col-span-5 space-y-2.5">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Catálogo de Modelos</Label>
                            {WBS_TEMPLATES.map((tmpl) => (
                                <div
                                    key={tmpl.id}
                                    onClick={() => setSelectedTemplate(tmpl)}
                                    className={cn(
                                        "p-3 rounded-lg border text-left cursor-pointer transition-all",
                                        selectedTemplate?.id === tmpl.id 
                                            ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs" 
                                            : "hover:bg-muted/50 border-border"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <Badge variant="outline" className="text-[10px] font-normal">
                                            {tmpl.category}
                                        </Badge>
                                        <span className="text-[11px] text-muted-foreground font-medium">
                                            {tmpl.estimatedPhases} Fases
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-sm text-foreground">{tmpl.title}</h4>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                        {tmpl.description}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Pré-visualização do Modelo Selecionado */}
                        <div className="md:col-span-7 flex flex-col border rounded-lg p-4 bg-muted/20">
                            {selectedTemplate ? (
                                <div className="space-y-4 flex-1 overflow-y-auto">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <Badge className="bg-primary/10 text-primary border-primary/20">{selectedTemplate.category}</Badge>
                                            <span className="text-xs text-muted-foreground">{selectedTemplate.items.length} fases principais</span>
                                        </div>
                                        <h3 className="font-bold text-base mt-2">{selectedTemplate.title}</h3>
                                        <p className="text-xs text-muted-foreground mt-1">{selectedTemplate.description}</p>
                                    </div>

                                    <div className="space-y-2 border-t pt-3">
                                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Fases e Entregáveis Inclusos:</Label>
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                            {selectedTemplate.items.map((phase, pIdx) => (
                                                <div key={pIdx} className="bg-card p-2.5 rounded border text-xs space-y-1">
                                                    <div className="flex items-center justify-between font-semibold text-foreground">
                                                        <span>{phase.name}</span>
                                                        <Badge variant="secondary" className="text-[10px]">{phase.category}</Badge>
                                                    </div>
                                                    {phase.description && (
                                                        <p className="text-[11px] text-muted-foreground">{phase.description}</p>
                                                    )}
                                                    {phase.children && phase.children.length > 0 && (
                                                        <div className="pl-3 border-l-2 border-primary/30 mt-1.5 space-y-1">
                                                            {phase.children.map((sub, sIdx) => (
                                                                <div key={sIdx} className="text-[11px] flex items-center justify-between py-0.5">
                                                                    <span className="text-foreground">{sub.name}</span>
                                                                    {sub.isMilestone ? (
                                                                        <span className="text-[10px] text-amber-600 font-medium">Marco</span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-muted-foreground">{sub.effortHours ? `${sub.effortHours}h` : ''}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {wbsItems.length > 0 && (
                                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                            <span>
                                                <strong>Atenção:</strong> O projeto já contém {wbsItems.length} pacotes na EAP. As fases deste modelo serão adicionadas como novos pacotes na sua estrutura existente.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                                    <Library className="h-10 w-10 text-muted-foreground/40 mb-2" />
                                    <p className="text-sm font-medium">Selecione um modelo à esquerda para ver a decomposição completa.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:justify-between border-t pt-3">
                        <Button variant="ghost" onClick={() => setIsTemplateDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => selectedTemplate && handleApplyTemplate(selectedTemplate)}
                            disabled={!selectedTemplate || isApplyingTemplate}
                        >
                            {isApplyingTemplate ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    A Importar Estrutura...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Aplicar Modelo à Obra
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Linha de Base (Scope Baseline) */}
            <Dialog open={isBaselineDialogOpen} onOpenChange={setIsBaselineDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Bookmark className="h-5 w-5 text-amber-600" />
                            Congelar Linha de Base da EAP
                        </DialogTitle>
                        <DialogDescription>
                            A Linha de Base (Baseline) é a versão oficial aprovada do cronograma e orçamento da obra para cálculo de Earned Value Management (EVM).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 space-y-4 text-sm">
                        <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Pacotes a congelar:</span>
                                <span className="font-semibold">{wbsItems.length} itens</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Orçamento Total Previsto:</span>
                                <span className="font-semibold text-primary">{formatCurrency(eapKpis.totalBudget)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Fases Principais:</span>
                                <span className="font-semibold">{eapKpis.totalPhases} fases</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Marcos Contratuais:</span>
                                <span className="font-semibold">{eapKpis.totalMilestones} marcos</span>
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md text-xs text-blue-800 dark:text-blue-300 space-y-1.5">
                            <div className="flex items-center gap-1.5 font-semibold">
                                <HelpCircle className="h-4 w-4" />
                                Como funciona a Linha de Base?
                            </div>
                            <p>
                                Ao congelar a linha de base, as datas de início e fim e os orçamentos atuais de cada pacote serão registados como referências fixas. Futuras alterações no cronograma permitirão calcular os desvios de prazo (SV) e custo (CV).
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:justify-between">
                        <Button variant="ghost" onClick={() => setIsBaselineDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveBaseline}
                            disabled={isSavingBaseline || wbsItems.length === 0}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {isSavingBaseline ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    A Congelar...
                                </>
                            ) : (
                                <>
                                    <Bookmark className="mr-2 h-4 w-4" />
                                    Congelar Linha de Base Agora
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Duplicação de Fase / Ramo da EAP */}
            <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Copy className="h-5 w-5 text-primary" />
                            Duplicar Fase da EAP
                        </DialogTitle>
                        <DialogDescription>
                            Crie uma cópia exata de <span className="font-semibold text-foreground">"{itemToDuplicate?.name}"</span> com todas as suas sub-atividades, estimativas de esforço e recursos alocados.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="dup-name">Nome da Nova Fase</Label>
                            <Input
                                id="dup-name"
                                value={newDuplicateName}
                                onChange={(e) => setNewDuplicateName(e.target.value)}
                                placeholder="Ex: Piso 2 - Estrutura e Alvenarias"
                            />
                        </div>
                        {itemToDuplicate?.children && itemToDuplicate.children.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Inclui {itemToDuplicate.children.length} sub-atividades subordinadas que serão replicadas sob esta nova fase.
                            </p>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:justify-between">
                        <Button variant="ghost" onClick={() => setDuplicateDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDuplicatePhase}
                            disabled={isDuplicating || !newDuplicateName.trim()}
                        >
                            {isDuplicating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    A Duplicar...
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicar Fase
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
