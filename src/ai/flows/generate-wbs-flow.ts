'use server';
/**
 * @fileOverview A flow to generate a Work Breakdown Structure (WBS) from a project description.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define a schema for a single WBS item in the output
const WbsItemOutputSchema = z.object({
  id: z.string().describe('A temporary unique ID for this item, e.g., "item-1".'),
  name: z.string().describe('The name of the task or phase.'),
  parentId: z.string().nullable().describe('The ID of the parent item, or null for root items.'),
});

const GenerateWbsInputSchema = z.object({
  description: z.string().min(20, 'A descrição deve ter pelo menos 20 caracteres.'),
  numPhases: z.number().int().min(2).max(10).describe('The desired number of top-level phases.'),
});

const GenerateWbsOutputSchema = z.object({
  wbs: z.array(WbsItemOutputSchema).describe('A flat list of WBS items representing the project structure.'),
});

export type GenerateWbsInput = z.infer<typeof GenerateWbsInputSchema>;
export type GenerateWbsOutput = z.infer<typeof GenerateWbsOutputSchema>;


export async function generateWbsFlow(input: GenerateWbsInput): Promise<GenerateWbsOutput> {
  const res = await wbsGenerationFlow(input);
  return (res as any)?.output || res || { wbs: [] };
}


const wbsGenerationFlow = ai.defineFlow(
  {
    name: 'generateWbsFlow',
    inputSchema: GenerateWbsInputSchema,
    outputSchema: GenerateWbsOutputSchema,
  },
  async (input) => {
    const prompt = `
        You are an expert construction project manager. Your task is to create a detailed Work Breakdown Structure (WBS) based on a project description.

        Project Description:
        "${input.description}"

        Break down the project into approximately ${input.numPhases} main phases (root items). For each main phase, create several detailed sub-tasks.

        Your output MUST be a flat list of WBS items. Each item must have:
        - A unique 'id' (e.g., "item-1", "item-2").
        - A 'name' for the task.
        - A 'parentId' which is the 'id' of the parent task, or 'null' if it's a main phase.
        
        Example for a simple house construction:
        [
            { "id": "item-1", "name": "1. Planeamento e Licenciamento", "parentId": null },
            { "id": "item-2", "name": "1.1. Projeto de Arquitetura", "parentId": "item-1" },
            { "id": "item-3", "name": "1.2. Licenças de Construção", "parentId": "item-1" },
            { "id": "item-4", "name": "2. Fundações e Estrutura", "parentId": null },
            { "id": "item-5", "name": "2.1. Escavação", "parentId": "item-4" },
            { "id": "item-6", "name": "2.2. Betonagem das Sapatas", "parentId": "item-4" }
        ]

        Generate a complete WBS for the project described. Ensure the parent-child relationships are correct using the 'id' and 'parentId' fields. Make sure the task names are in Portuguese.
    `;

    const { output } = await ai.generate({
      prompt,
      model: 'googleai/gemini-2.5-flash',
      output: { schema: GenerateWbsOutputSchema },
      config: { temperature: 0.5 },
    });
    
    return output || { wbs: [] };
  }
);
