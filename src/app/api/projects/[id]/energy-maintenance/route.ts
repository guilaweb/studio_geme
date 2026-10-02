import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const maintenancePlanSchema = z.object({
  assetId: z.string().min(1, "O ativo é obrigatório"),
  assetName: z.string().min(1, "O nome do ativo é obrigatório"),
  planName: z.string().min(1, "A designação do plano é obrigatória"),
  type: z.enum(['Preventiva', 'Corretiva', 'Preditiva', 'Inspeção']),
  intervalHours: z.number().positive().optional(),
  intervalDays: z.number().positive().optional(),
  nextDueDate: z.string().datetime().optional(),
  nextDueHours: z.number().positive().optional(),
  status: z.enum(['Programada', 'Pendente', 'Concluída', 'Atrasada']).default('Programada'),
  estimatedCostAOA: z.number().min(0).optional(),
  realCostAOA: z.number().min(0).optional(),
  checklist: z.array(z.object({
    item: z.string(),
    completed: z.boolean(),
  })).optional(),
  assignedTechnician: z.string().optional(),
  notes: z.string().optional(),
  wbsItemId: z.string().nullable().optional(),
  wbsItemName: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const projectId = (await params).id;

  try {
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin SDK não inicializado.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(idToken);

    const snapshot = await adminDb.collection('projects').doc(projectId).collection('energy-maintenance')
      .orderBy('createdAt', 'desc').get();

    const plans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      nextDueDate: doc.data().nextDueDate ? doc.data().nextDueDate.toDate().toISOString() : null,
      lastPerformedDate: doc.data().lastPerformedDate ? doc.data().lastPerformedDate.toDate().toISOString() : null,
      createdAt: doc.data().createdAt?.toDate().toISOString() || null,
    }));

    return NextResponse.json({ plans }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar planos de manutenção:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const projectId = (await params).id;

  try {
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin SDK não inicializado.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const body = await req.json();
    const validation = maintenancePlanSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const data = validation.data;
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const authorDisplayName = userDoc.exists ? userDoc.data()?.displayName : 'Utilizador';

    const batch = adminDb.batch();
    const planRef = adminDb.collection('projects').doc(projectId).collection('energy-maintenance').doc();

    const planData: Record<string, any> = {
      assetId: data.assetId,
      assetName: data.assetName,
      planName: data.planName,
      type: data.type,
      status: data.status,
      checklist: data.checklist || [],
      assignedTechnician: data.assignedTechnician || '',
      notes: data.notes || '',
      wbsItemId: data.wbsItemId || null,
      wbsItemName: data.wbsItemName || null,
      author: {
        uid: decodedToken.uid,
        displayName: authorDisplayName,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (data.intervalHours) planData.intervalHours = data.intervalHours;
    if (data.intervalDays) planData.intervalDays = data.intervalDays;
    if (data.nextDueDate) planData.nextDueDate = admin.firestore.Timestamp.fromDate(new Date(data.nextDueDate));
    if (data.nextDueHours) planData.nextDueHours = data.nextDueHours;
    if (data.estimatedCostAOA !== undefined) planData.estimatedCostAOA = data.estimatedCostAOA;
    if (data.realCostAOA !== undefined) planData.realCostAOA = data.realCostAOA;

    batch.set(planRef, planData);

    // If status is completed and cost is specified, create project financial transaction
    if (data.status === 'Concluída' && (data.realCostAOA || data.estimatedCostAOA)) {
      const amount = data.realCostAOA || data.estimatedCostAOA || 0;
      if (amount > 0) {
        const transactionRef = adminDb.collection('projects').doc(projectId).collection('transactions').doc();
        batch.set(transactionRef, {
          description: `Manutenção de Ativo Energético: ${data.assetName} - ${data.planName}`,
          amount,
          date: admin.firestore.FieldValue.serverTimestamp(),
          type: 'Despesa',
          status: 'Pago',
          accountId: 'energy-maintenance',
          accountName: 'Manutenção de Ativos de Energia',
          wbsItemId: data.wbsItemId || null,
          wbsItemName: data.wbsItemName || null,
          author: { uid: decodedToken.uid, displayName: authorDisplayName },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    return NextResponse.json({ success: true, id: planRef.id }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar plano de manutenção de energia:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
