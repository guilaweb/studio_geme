
import { streamText } from 'ai';
import { ai } from '@/ai/genkit';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import type { Timestamp } from 'firebase-admin/firestore';
import type { WbsItem } from '@/types/wbs';
import type { Transaction } from '@/types/finance';
import type { Risk } from '@/types/risk';
import type { DailyReport } from '@/types/daily-reports';
import type { TeamMember } from '@/app/projects/[id]/page';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const messages = body.messages || [];
  const projectId = body.projectId || body.data?.projectId;

  if (!projectId) {
    return new Response('Project ID is required', { status: 400 });
  }

  const adminApp = getAdminApp();
  if (!adminApp) {
    return new Response(JSON.stringify({ error: 'Firebase Admin SDK not initialized.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const adminDb = admin.firestore(adminApp);


  // 1. Fetch all relevant data from Firestore for the given project
  const projectRef = adminDb.collection('projects').doc(projectId);
  const wbsQuery = projectRef.collection('wbs');
  const transactionsQuery = projectRef.collection('transactions');
  const teamQuery = projectRef.collection('team');
  const risksQuery = projectRef.collection('risks');
  const dailyReportsQuery = projectRef.collection('daily-reports').orderBy('date', 'desc').limit(7);
  const equipmentLogsQuery = projectRef.collection('equipmentUsageLogs').orderBy('date', 'desc').limit(15);
  const supplierInvoicesQuery = projectRef.collection('supplierInvoices').orderBy('invoiceDate', 'desc').limit(15);
  const measurementsQuery = projectRef.collection('measurementCertificates').limit(10);
  const ncrsQuery = projectRef.collection('fiscalizacao_ncrs').limit(10);
  const inspectionsQuery = projectRef.collection('fiscalizacao_inspections').limit(10);
  const inventoryQuery = projectRef.collection('inventory').limit(20);

  const [
    projectDoc,
    wbsSnapshot, 
    transactionsSnapshot, 
    teamSnapshot, 
    risksSnapshot, 
    dailyReportsSnapshot,
    equipmentLogsSnapshot,
    supplierInvoicesSnapshot,
    measurementsSnapshot,
    ncrsSnapshot,
    inspectionsSnapshot,
    inventorySnapshot
  ] = await Promise.all([
    projectRef.get(),
    wbsQuery.get(),
    transactionsQuery.get(),
    teamQuery.get(),
    risksQuery.get(),
    dailyReportsQuery.get(),
    equipmentLogsQuery.get(),
    supplierInvoicesQuery.get(),
    measurementsQuery.get(),
    ncrsQuery.get(),
    inspectionsQuery.get(),
    inventoryQuery.get()
  ]);

  const projectInfo = projectDoc.exists ? projectDoc.data() : null;

  const wbsItems: WbsItem[] = wbsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        startDate: (data.startDate as Timestamp)?.toDate?.()?.toISOString?.() || data.startDate,
        endDate: (data.endDate as Timestamp)?.toDate?.()?.toISOString?.() || data.endDate,
    } as WbsItem;
  });

  const transactions: Transaction[] = transactionsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        date: (data.date as Timestamp)?.toDate?.()?.toISOString?.() || data.date,
    } as Transaction;
  });

  const teamMembers: TeamMember[] = teamSnapshot.docs.map(doc => doc.data() as TeamMember);
  const risks: Risk[] = risksSnapshot.docs.map(doc => doc.data() as Risk);
  const dailyReports: DailyReport[] = dailyReportsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
          ...data,
          date: (data.date as Timestamp)?.toDate?.()?.toISOString?.() || data.date
      } as unknown as DailyReport;
  });

  const equipmentLogs = equipmentLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const supplierInvoices = supplierInvoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const measurements = measurementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const ncrs = ncrsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const inspections = inspectionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const inventory = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // 2. Format the data as context for the prompt
  const projectContext = `
    Project Overview:
    ${JSON.stringify({ name: projectInfo?.name, budget: projectInfo?.budget, progress: projectInfo?.progress, status: projectInfo?.status }, null, 2)}

    WBS (Work Breakdown Structure) Items:
    ${JSON.stringify(wbsItems.slice(0, 10), null, 2)}

    Autos de Medição (Measurement Certificates):
    ${JSON.stringify(measurements, null, 2)}

    Fiscalização Técnica - Não Conformidades (NCRs):
    ${JSON.stringify(ncrs, null, 2)}

    Fiscalização Técnica - Pontos de Paragem e Inspeções (Hold/Witness):
    ${JSON.stringify(inspections, null, 2)}

    Inventário e Materiais de Estaleiro (Cement, Steel, Fuel, etc.):
    ${JSON.stringify(inventory, null, 2)}

    Financial Transactions:
    ${JSON.stringify(transactions.slice(0, 10), null, 2)}

    Equipment & Fuel Usage Logs:
    ${JSON.stringify(equipmentLogs, null, 2)}

    Supplier Invoices & Procurement:
    ${JSON.stringify(supplierInvoices, null, 2)}

    Team Members:
    ${JSON.stringify(teamMembers, null, 2)}

    Identified Risks:
    ${JSON.stringify(risks, null, 2)}

    Recent Daily Reports:
    ${JSON.stringify(dailyReports, null, 2)}
  `;

  // 3. Create the system prompt
  const systemPrompt = `Você é o Copiloto e Assistente SI (Sistema de Inteligência, Investigação e Perícia Forense) da plataforma PROFUNDIDADE.
Sua missão é responder com o mais alto rigor metodológico, objetividade probatória e estrita conformidade com a cadeia de custódia de evidências (ISO/IEC 27037).
Moeda oficial: Kwanzas (Kz ou AOA). Fuso horário oficial: Luanda / Angola (WAT UTC+1).

AVISO LEGAL OBRIGATÓRIO (Human-in-the-Loop):
Todas as hipóteses, anomalias e correlações sugeridas pelo SI são de natureza automatizada e preliminar. Exigem validação humana qualificada por um perito ou investigador responsável antes de integrar qualquer laudo pericial ou decisão jurídica/operacional.

Regras de Interação e Ações Forenses:
1. "Análise de Vínculos e Grafos":
   - Descreva conexões diretas e indiretas entre entidades (Pessoas, Empresas, Veículos, Contas Bancárias).
   - Indique o nível de confiança (0.0 a 1.0) e identifique nós centrais de alto risco.
   - Inclua no fim da resposta a tag de ação: [ACTION:VIEW_GRAPH].

2. "Cadeia de Custódia & Integridade SHA-256":
   - Explique o status de integridade das evidências digitais e o histórico de atos de custódia.
   - Nunca altere evidências silenciosamente; evidências novas devem receber novas versões imutáveis.
   - Inclua no fim da resposta a tag de ação: [ACTION:VERIFY_CUSTODY].

3. "Deteção de Anomalias & Riscos":
   - Aponte discrepâncias financeiras, fluxos atípicos, padrões de evasão e transações suspeitas.
   - Inclua no fim da resposta a tag de ação: [ACTION:RUN_SI_INFERENCE].

4. "Dossiês & Relatórios Periciais":
   - Formate achados com clareza forense para anexar a relatórios finais selados criptograficamente.
   - Inclua no fim da resposta a tag de ação: [ACTION:GENERATE_REPORT].

5. "OSINT & Fontes Abertas":
   - Sintetize dados públicos, registos societários e publicações em Diário da República.
   - Inclua no fim da resposta a tag de ação: [ACTION:SEARCH_OSINT].

Seja formal, conciso, profissional e use tabelas markdown estruturadas com referências periciais explícitas.
Contexto Operacional do Caso:
${projectContext}`;

  // 4. Call Genkit to stream the response
  const result = await streamText({
    model: (ai as any).model?.('googleai/gemini-2.5-flash') || ('googleai/gemini-2.5-flash' as any),
    system: systemPrompt,
    messages,
  });

  return result.toAIStreamResponse();
}
