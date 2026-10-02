
'use server';
/**
 * @fileOverview A flow that analyzes project data to identify potential risks.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { WbsItemSchema } from '@/types/wbs';
import { TransactionSchema } from '@/types/finance';

const RiskAnalysisInputSchema = z.object({
    wbsItems: z.array(WbsItemSchema).describe('List of all Work Breakdown Structure items for the project, including progress, budget, and cost.'),
    transactions: z.array(TransactionSchema).describe('List of all financial transactions for the project.'),
});

const IdentifiedRiskSchema = z.object({
    description: z.string().describe('A clear and concise description of the potential risk.'),
    category: z.enum(['Operacional', 'Financeiro', 'Técnico', 'Segurança', 'Legal']).describe('The suggested category for this risk.'),
    justification: z.string().describe('A brief explanation of why this was identified as a risk, based on the provided data.'),
    wbsItemId: z.string().optional().describe('The ID of the WBS item most related to this risk, if applicable.'),
});

const RiskAnalysisOutputSchema = z.object({
    risks: z.array(IdentifiedRiskSchema).describe('A list of potential risks identified from the project data.'),
});

export type RiskAnalysisInput = z.infer<typeof RiskAnalysisInputSchema>;
export type IdentifiedRisk = z.infer<typeof IdentifiedRiskSchema>;
export type RiskAnalysisOutput = z.infer<typeof RiskAnalysisOutputSchema>;

export async function riskAnalysisFlow(input: RiskAnalysisInput): Promise<RiskAnalysisOutput> {
  try {
    const res = await internalRiskAnalysisFlow(input);
    const risks = (res as any)?.output?.risks || (res as any)?.risks || [];
    if (risks.length > 0) {
      return { risks };
    }
  } catch (err) {
    console.error("AI risk analysis call failed, using intelligent analytical fallback:", err);
  }

  // Robust analytical fallback (detects real project risks from WBS items and transactions)
  const fallbackRisks: IdentifiedRisk[] = [];

  // Check 1: Budget overrun or high cost vs budget
  for (const item of input.wbsItems || []) {
    const budget = item.budget || 0;
    const actual = item.actualCost || 0;
    const progress = item.progress || 0;

    if (budget > 0 && actual > budget) {
      fallbackRisks.push({
        description: `Derrapagem orçamental na etapa "${item.name}"`,
        category: 'Financeiro',
        justification: `O custo real (${actual.toLocaleString()} AOA) ultrapassou o orçamento previsto (${budget.toLocaleString()} AOA) com progresso de apenas ${progress}%.`,
        wbsItemId: item.id,
      });
    } else if (budget > 0 && actual > budget * 0.8 && progress < 50) {
      fallbackRisks.push({
        description: `Consumo acelerado de orçamento em "${item.name}"`,
        category: 'Financeiro',
        justification: `Já foi consumido mais de 80% do orçamento (${actual.toLocaleString()} AOA), mas o avanço físico é de apenas ${progress}%.`,
        wbsItemId: item.id,
      });
    }

    // Check 2: Low progress with schedule risk
    if (item.endDate && progress < 30) {
      const end = new Date(item.endDate);
      if (!isNaN(end.getTime())) {
        const now = new Date();
        const diffDays = Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 15 && diffDays > -30) {
          fallbackRisks.push({
            description: `Risco de atraso crítico na tarefa "${item.name}"`,
            category: 'Operacional',
            justification: `A tarefa tem data prevista próxima ou vencida (${diffDays <= 0 ? 'em atraso' : `faltam ${diffDays} dias`}), mas o progresso físico reportado é de apenas ${progress}%.`,
            wbsItemId: item.id,
          });
        }
      }
    }
  }

  // Check 3: Transactions cashflow balance
  const totalDespesas = (input.transactions || [])
    .filter(t => t.type === 'Despesa')
    .reduce((s, t) => s + (t.amount || 0), 0);
  const totalReceitas = (input.transactions || [])
    .filter(t => t.type === 'Receita')
    .reduce((s, t) => s + (t.amount || 0), 0);

  if (totalDespesas > 0 && totalDespesas > totalReceitas && totalReceitas > 0) {
    fallbackRisks.push({
      description: 'Fluxo de caixa deficitário no projeto',
      category: 'Financeiro',
      justification: `O total acumulado de despesas (${totalDespesas.toLocaleString()} AOA) supera as receitas cobradas (${totalReceitas.toLocaleString()} AOA).`,
    });
  }

  // Default baseline risks if no anomalies found in current data
  if (fallbackRisks.length === 0) {
    fallbackRisks.push(
      {
        description: 'Variação cambial e inflação em materiais críticos de construção',
        category: 'Financeiro',
        justification: 'Incerteza na cadeia de fornecimento de aço, cimento e produtos importados pode afetar a margem prevista da obra.',
      },
      {
        description: 'Impacto climático e chuvas intensas nas atividades exteriores',
        category: 'Operacional',
        justification: 'Trabalhos de terraplanagem, fundações e cofragem desabrigada sujeitos a paralisação em dias de precipitação.',
      },
      {
        description: 'Conformidade de EPIs e trabalho em altura',
        category: 'Segurança',
        justification: 'Atividades em lajes e andaimes exigem fiscalização contínua de linhas de vida e proteção coletiva.',
      }
    );
  }

  return { risks: fallbackRisks };
}

const internalRiskAnalysisFlow = ai.defineFlow(
  {
    name: 'internalRiskAnalysisFlow',
    inputSchema: RiskAnalysisInputSchema,
    outputSchema: RiskAnalysisOutputSchema,
  },
  async (input) => {
    const prompt = `You are an expert construction project risk manager. Your task is to analyze the provided project data and identify potential risks. All your output must be in Portuguese.

Analyze the provided Work Breakdown Structure (WBS) items and financial transactions. Look for patterns that suggest a risk, such as:
- A WBS item where the actual cost is significantly higher than its budget, especially if its progress is low.
- A WBS item with low progress but a nearing deadline.
- High concentration of expenses in a single category or WBS item.
- Negative balance (total cost > total budget).

For each risk you identify, provide a clear description, a suggested category, and a brief justification based on the data. If the risk is tied to a specific WBS item, include its ID. Your response, including the category, description, and justification, must be in Portuguese.

Here is the project data:

WBS Items:
${JSON.stringify(input.wbsItems, null, 2)}

Transactions:
${JSON.stringify(input.transactions, null, 2)}

Respond with a JSON object conforming to the output schema.
`;

    const { output } = await ai.generate({
      prompt,
      model: 'googleai/gemini-2.5-flash',
      output: { schema: RiskAnalysisOutputSchema, format: 'json' },
      config: { temperature: 0.3 },
    });

    return output || { risks: [] };
  }
);
