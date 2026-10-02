

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


export const WbsItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  category: z.enum(WbsItemCategories).optional().nullable(),
  parentId: z.string().nullable(),
  startDate: z.string().optional().describe('ISO date string'),
  endDate: z.string().optional().describe('ISO date string'),
  budget: z.number().optional(),
  actualCost: z.number().optional(),
  progress: z.number().optional(),
  dependencies: z.array(z.string()).optional(),
  isMilestone: z.boolean().optional(),
  effortHours: z.number().optional().describe('Estimated work hours required for the task.'),
  baselineStartDate: z.string().optional().describe('ISO date string'),
  baselineEndDate: z.string().optional().describe('ISO date string'),
  assignedWorkforce: z.array(z.string()).optional(),
  assignedEquipment: z.array(z.string()).optional(),
});

export type WbsItem = z.infer<typeof WbsItemSchema>;


export interface WbsItemWithChildren extends WbsItem {
    children: WbsItemWithChildren[];
}
