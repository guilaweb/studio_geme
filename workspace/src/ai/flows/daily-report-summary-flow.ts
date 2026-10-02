'use server';
/**
 * @fileOverview A flow that summarizes daily construction reports for a given period.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { type DailyReport as DailyReportType } from '@/types/daily-reports';

const DailyReportSchema = z.object({
  id: z.string(),
  date: z.string().describe('The date of the report in ISO format.'),
  weather: z.string(),
  ownManpower: z.number(),
  subcontractorManpower: z.number(),
  activities: z.string(),
  occurrences: z.string().optional(),
  author: z.object({
    uid: z.string(),
    displayName: z.string(),
  }),
});

const DailyReportSummaryInputSchema = z.object({
  reports: z.array(DailyReportSchema),
});

const DailyReportSummaryOutputSchema = z.object({
  highlights: z.array(z.string()).describe("Um array de 2 a 4 pontos chave que resumem os avanços mais significativos da semana."),
  workforce: z.object({
    average: z.number().describe("Média de trabalhadores no estaleiro durante a semana (soma de mão de obra própria e subcontratada)."),
    peak: z.number().describe("Pico de trabalhadores no estaleiro num único dia."),
    notes: z.string().optional().describe("Qualquer observação relevante sobre a mão de obra."),
  }).describe("Análise da mão de obra."),
  blockers: z.array(z.object({
    date: z.string().describe("Data da ocorrência no formato YYYY-MM-DD."),
    description: z.string().describe("Descrição clara do bloqueio ou ocorrência."),
  })).describe("Uma lista de problemas, atrasos ou ocorrências importantes que impactaram o projeto. Se não houver, retorne um array vazio."),
  nextWeekOutlook: z.string().describe("Uma breve perspetiva para a próxima semana, com base nas atividades e ocorrências da semana atual."),
});

export type DailyReportSummaryInput = z.infer<typeof DailyReportSummaryInputSchema>;
export type DailyReportSummaryOutput = z.infer<typeof DailyReportSummaryOutputSchema>;

export async function summarizeDailyReports(input: DailyReportSummaryInput): Promise<DailyReportSummaryOutput | null> {
    const { output } = await dailyReportSummaryFlow(input);
    return output;
}

const dailyReportSummaryFlow = ai.defineFlow(
  {
    name: 'dailyReportSummaryFlow',
    inputSchema: DailyReportSummaryInputSchema,
    outputSchema: DailyReportSummaryOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an expert construction project manager analyzing a week's worth of daily reports ("Diários de Obra") to generate a concise executive summary in Portuguese.
      Your task is to extract key information and present it in a structured JSON format.

      **Instructions:**
      1.  **Analyze the data:** Carefully read all provided reports. Pay close attention to the 'activities' and 'occurrences' fields.
      2.  **Highlights:** Identify 2 to 4 major achievements or key activities completed. These should be high-level summaries (e.g., "Conclusão da betonagem da laje do 2º piso", "Início da instalação da fachada de vidro"). Do not just list activities, synthesize them into achievements.
      3.  **Workforce Analysis:** Calculate the average and peak number of total workers on site during the week. The total is the sum of 'ownManpower' and 'subcontractorManpower'.
      4.  **Blockers and Incidents:** Extract any significant issues from the "occurrences" field. These are critical. If an occurrence mentions a delay, a safety incident, equipment failure, or a major problem, list it with its date. If no significant occurrences are reported, return an empty array for this field.
      5.  **Next Week's Outlook:** Based on the week's activities and any reported issues, provide a short, forward-looking statement about what is likely to be the focus for the next week.

      **Input Data (Daily Reports):**
      ${JSON.stringify(input.reports, null, 2)}

      **Output Format:**
      Respond ONLY with a valid JSON object that conforms to the specified output schema. Do not add any extra text or markdown formatting.
    `;

    const { output } = await ai.generate({
      prompt,
      model: 'googleai/gemini-2.5-flash',
      output: { schema: DailyReportSummaryOutputSchema },
      config: { temperature: 0.2 },
    });
    
    return output;
  }
);
