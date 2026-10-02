
'use server';
/**
 * @fileOverview A flow to suggest equipment for a task based on the task description.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { EquipmentCategories } from '@/types/equipment';

const EquipmentSchema = z.object({
    id: z.string().describe('The unique ID of the equipment.'),
    name: z.string().describe('The name of the equipment.'),
    category: z.enum(EquipmentCategories).describe('The category of the equipment.'),
    notes: z.string().optional().describe('Additional notes about the equipment, like model or capacity.'),
});

const EquipmentSuggesterInputSchema = z.object({
  taskDescription: z.string().describe('The description of the task needing equipment.'),
  availableEquipment: z.array(EquipmentSchema).describe('The list of all available equipment.'),
});

const SuggestionSchema = z.object({
    equipmentId: z.string().describe('The ID of the suggested equipment.'),
    justification: z.string().describe('A brief explanation for why this equipment was suggested for the task.'),
});

const EquipmentSuggesterOutputSchema = z.object({
  suggestions: z.array(SuggestionSchema).describe('A list of suggested equipment, ordered by relevance.'),
});

export type EquipmentSuggesterInput = z.infer<typeof EquipmentSuggesterInputSchema>;
export type EquipmentSuggesterOutput = z.infer<typeof EquipmentSuggesterOutputSchema>;

export async function suggestEquipment(input: EquipmentSuggesterInput): Promise<EquipmentSuggesterOutput> {
  const res = await equipmentSuggesterFlow(input);
  return (res as any)?.output || res || { suggestions: [] };
}

const equipmentSuggesterFlow = ai.defineFlow(
  {
    name: 'equipmentSuggesterFlow',
    inputSchema: EquipmentSuggesterInputSchema,
    outputSchema: EquipmentSuggesterOutputSchema,
  },
  async (input) => {
    const prompt = `
        You are an expert construction resource planner.
        Your task is to analyze a task description and suggest the most suitable equipment from a list of available items.
        Your response must be in Portuguese.

        **Step 1: Analyze the Task**
        Read the task description to understand the work required. For example, "Escavação de sapatas" requires digging equipment, "Transporte de agregados" requires transport vehicles.

        **Step 2: Match with Available Equipment**
        Compare the task requirements against the name, category, and notes of each piece of equipment in the provided list.

        **Step 3: Provide Justified Suggestions**
        Provide a list of the most relevant pieces of equipment for the job.
        For each suggestion, provide a brief justification explaining why it is a good fit (e.g., "Adequado para escavação em espaços confinados.").

        **Task Description:**
        "${input.taskDescription}"

        **Available Equipment:**
        ${JSON.stringify(input.availableEquipment, null, 2)}
        
        Respond with a JSON object conforming to the output schema. Only include suggestions for equipment that is a good match.
    `;

    const { output } = await ai.generate({
      prompt,
      model: 'googleai/gemini-2.5-flash',
      output: { schema: EquipmentSuggesterOutputSchema, format: 'json' },
      config: { temperature: 0.2 },
    });
    
    return output || { suggestions: [] };
  }
);
