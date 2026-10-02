import { z } from 'zod';

export const WbsItemCategories = [
    'Planeamento e Licenciamento',
    'Fundações',
    'Estrutura',
    'Alvenaria e Vedações',
    'Cobertura',
    'Instalações Elétricas',
    'Instalações Hidráulicas',
    'Acabamentos',
    'Áreas Exteriores',
    'Outros',
] as const;

export type WbsItemCategory = typeof WbsItemCategories[number];

export type ActivityStatus = 
  | 'not_started' 
  | 'planning' 
  | 'in_progress' 
  | 'paused' 
  | 'completed' 
  | 'delayed' 
  | 'cancelled';

export type ActivityPriority = 'low' | 'medium' | 'high' | 'critical';

export interface CpuResourceItem {
  id: string;
  name: string;
  type: 'material' | 'labor' | 'equipment' | 'subcontractor' | 'consumable';
  unit: string;
  coefficient: number; // quantidade por unidade do serviço
  unitCost: number;
  totalCost: number;
}

export const WbsItemSchema = z.object({
  id: z.string(),
  code: z.string().optional().describe('Código hierárquico da EAP, ex: 1.1.2'),
  name: z.string(),
  description: z.string().optional().nullable(),
  category: z.enum(WbsItemCategories).optional().nullable(),
  parentId: z.string().nullable(),
  level: z.enum(['project', 'phase', 'subphase', 'activity']).optional(),
  
  // Datas & Prazos
  startDate: z.any().optional().describe('Should be a Date object'),
  endDate: z.any().optional().describe('Should be a Date object'),
  durationDays: z.number().optional(),
  baselineStartDate: z.any().optional().describe('Should be a Date object'),
  baselineEndDate: z.any().optional().describe('Should be a Date object'),
  baselineBudget: z.number().optional().nullable(),
  
  // Quantitativos e CPU
  unit: z.string().optional().describe('Unidade métrica: m², m³, ton, kg, ml, un, h'),
  plannedQuantity: z.number().optional(),
  executedQuantity: z.number().optional(),
  unitPrice: z.number().optional(),
  totalValue: z.number().optional(),
  
  // Financeiro e Progresso
  budget: z.number().optional(),
  committedCost: z.number().optional(),
  actualCost: z.number().optional(),
  progress: z.number().optional(),
  weight: z.number().optional().describe('Peso ponderado na EAP (em %) para cálculo do avanço físico global'),
  
  // Estados e Prioridades
  status: z.enum(['not_started', 'planning', 'in_progress', 'paused', 'completed', 'delayed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  
  // Responsabilidade
  assignedToName: z.string().optional(),
  assignedToUid: z.string().optional(),
  assignedWorkforce: z.array(z.string()).optional(),
  assignedEquipment: z.array(z.string()).optional(),

  // Rede & CPM
  dependencies: z.array(z.string()).optional(),
  isMilestone: z.boolean().optional(),
  isCriticalPath: z.boolean().optional(),
  slackDays: z.number().optional().describe('Folga total da atividade no cronograma'),
  effortHours: z.number().optional().describe('Estimated work hours required for the task.'),
  
  // Entregáveis & Governança
  deliverable: z.string().optional().nullable().describe('Entregavel tangivel do pacote de trabalho'),
  acceptanceCriteria: z.string().optional().nullable().describe('Criterios de aceitacao tecnica e qualidade'),
  documentUrls: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
});

export type WbsItem = z.infer<typeof WbsItemSchema> & {
  compositionItems?: CpuResourceItem[];
};

export interface WbsItemWithChildren extends WbsItem {
    children: WbsItemWithChildren[];
}
