'use server';
/**
 * @fileOverview A flow that analyzes an image of a construction site for safety compliance.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { SafetyAnalysisResult } from '@/types/hseq';

const SafetyAnalysisInputSchema = z.object({
  imageDataUri: z.string().describe("A photo of a construction site, as a data URI that must include a MIME type and use Base64 encoding. Format: 'data:<mimetype>;base64,<data>'."),
});

const SafetyAnalysisOutputSchema = z.object({
    hazards: z.array(z.object({
        description: z.string().describe("Clear and concise description of the identified hazard."),
        recommendation: z.string().describe("A practical recommendation to mitigate the hazard."),
        severity: z.enum(['Baixa', 'Média', 'Alta']).describe("The severity of the hazard."),
    })).describe("A list of safety hazards identified in the image."),
    ppeCompliance: z.array(z.object({
        item: z.enum(['Capacete', 'Colete', 'Botas', 'Luvas']).describe("The Personal Protective Equipment item."),
        status: z.enum(['Presente', 'Ausente', 'Não Visível']).describe("The status of the PPE on workers in the image."),
    })).describe("A checklist of Personal Protective Equipment (PPE) compliance."),
    overallSafetyScore: z.number().min(0).max(100).describe("An overall safety score for the scene, from 0 (very unsafe) to 100 (very safe)."),
});


export async function analyzeSafetyImage(imageDataUri: string): Promise<SafetyAnalysisResult> {
    const res = await safetyAnalysisFlow({ imageDataUri });
    return (res as any)?.output || res || { hazards: [], ppeCompliance: [], overallSafetyScore: 0 };
}


const safetyAnalysisFlow = ai.defineFlow(
  {
    name: 'safetyAnalysisFlow',
    inputSchema: SafetyAnalysisInputSchema,
    outputSchema: SafetyAnalysisOutputSchema,
  },
  async (input) => {
    const prompt = `
        You are an expert construction safety inspector. Your task is to analyze the provided image of a construction site and identify safety hazards and compliance with Personal Protective Equipment (PPE) standards.
        
        Analyze the image and respond with a structured JSON object.

        1.  **Hazards**: Identify all potential safety hazards. For each hazard, provide a clear description, a practical recommendation for mitigation, and classify its severity (Baixa, Média, Alta). Examples of hazards include, but are not limited to:
            *   Improperly stored materials
            *   Unsafe scaffolding or ladders
            *   Lack of fall protection (e.g., guardrails)
            *   Exposed rebar or electrical wires
            *   Poor housekeeping (tripping hazards)
            *   Unsafe operation of equipment

        2.  **PPE Compliance**: Check for the presence of essential PPE on all visible workers. For each of the following items (Capacete, Colete, Botas, Luvas), determine if it is 'Presente', 'Ausente', or 'Não Visível' on the workers.
        
        3.  **Overall Safety Score**: Based on your analysis of hazards and PPE compliance, provide an overall safety score for the scene from 0 (extremely unsafe) to 100 (appears very safe). A high number of severe hazards or widespread lack of PPE should result in a very low score.

        Here is the image to analyze:
        {{media url=imageDataUri}}

        Respond *only* with the JSON object conforming to the output schema. Do not include any explanatory text before or after the JSON.
    `;

    const { output } = await ai.generate({
      prompt,
      model: 'googleai/gemini-2.5-flash',
      output: { schema: SafetyAnalysisOutputSchema, format: 'json' },
      config: { temperature: 0.2 },
    });
    
    return output || { hazards: [], ppeCompliance: [], overallSafetyScore: 0 };
  }
);
