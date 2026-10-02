
'use server';
/**
 * @fileOverview A flow to suggest workforce members for a task based on skills and availability.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { WbsItemSchema } from '@/types/wbs';

const WorkforceMemberSchema = z.object({
    id: z.string().describe('The unique ID of the workforce member.'),
    name: z.string().describe('The name of the workforce member.'),
    role: z.string().describe('The primary role or job title of the member.'),
    skills: z.array(z.string()).optional().describe('A list of skills and certifications.'),
});

const ResourceSuggesterInputSchema = z.object({
  taskDescription: z.string().describe('The description of the task needing resources.'),
  availableWorkforce: z.array(WorkforceMemberSchema).describe('The list of all available workforce members.'),
  projectSchedule: z.array(WbsItemSchema).describe('The entire project schedule with tasks, dates, and current assignments.'),
  taskDateRange: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
  }).describe('The date range for the task needing resources.')
});

const SuggestionSchema = z.object({
    workforceId: z.string().describe('The ID of the suggested workforce member.'),
    justification: z.string().describe('A brief explanation for why this member was suggested, considering skills and availability.'),
});

const ResourceSuggesterOutputSchema = z.object({
  suggestions: z.array(SuggestionSchema).describe('A list of suggested workforce members, ordered by relevance.'),
});

export type ResourceSuggesterInput = z.infer<typeof ResourceSuggesterInputSchema>;
export type ResourceSuggesterOutput = z.infer<typeof ResourceSuggesterOutputSchema>;

export async function suggestResources(input: ResourceSuggesterInput): Promise<ResourceSuggesterOutput> {
  const res = await resourceSuggesterFlow(input);
  return (res as any)?.output || res || { suggestions: [] };
}

const resourceSuggesterFlow = ai.defineFlow(
  {
    name: 'resourceSuggesterFlow',
    inputSchema: ResourceSuggesterInputSchema,
    outputSchema: ResourceSuggesterOutputSchema,
  },
  async (input) => {
    const prompt = `
        You are an expert resource manager for a construction company.
        Your task is to analyze a task description and suggest the most suitable people from a list of available workforce members, considering both their skills and their current availability in the project schedule.
        Your response must be in Portuguese.

        **Step 1: Analyze Skills**
        First, analyze the task description and compare it against the roles and skills of each person in the workforce list. Identify a pool of candidates who are qualified for the job.

        **Step 2: Analyze Availability**
        From the pool of qualified candidates, check their current workload based on the provided project schedule. The task needing resources has the following date range: ${input.taskDateRange.startDate} to ${input.taskDateRange.endDate}. Prioritize workers who are not heavily allocated to other tasks during this overlapping period. A worker assigned to another task in the same period is considered less available.

        **Step 3: Provide Justified Suggestions**
        Provide a list of up to 3 of the most relevant people for the job, ordered by the best combination of skills and availability.
        For each suggestion, provide a brief justification explaining why they are a good fit (e.g., "Skill relevante: Soldador Certificado. Disponível no período.").

        **Task Description:**
        "${input.taskDescription}"

        **Available Workforce:**
        ${JSON.stringify(input.availableWorkforce, null, 2)}
        
        **Current Project Schedule (for availability context):**
        ${JSON.stringify(input.projectSchedule, null, 2)}

        Respond with a JSON object conforming to the output schema. Only include suggestions for members who are a good match.
    `;

    const { output } = await ai.generate({
      prompt,
      model: 'googleai/gemini-2.5-flash',
      output: { schema: ResourceSuggesterOutputSchema, format: 'json' },
      config: { temperature: 0.2 },
    });
    
    return output || { suggestions: [] };
  }
);
