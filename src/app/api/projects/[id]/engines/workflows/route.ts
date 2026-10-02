import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { buildApprovalPipeline, createDailyReportLock } from '@/lib/engines/workflow-governance-engine';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;

if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const requisitionWorkflowSchema = z.object({
    requisitionNumber: z.string().min(1),
    description: z.string().min(1),
    totalAmountAOA: z.number().positive(),
    wbsItemId: z.string().nullable().optional(),
    wbsItemName: z.string().nullable().optional(),
});

const probativeLockSchema = z.object({
    dailyReportId: z.string().min(1),
    date: z.string(),
    weatherCondition: z.string().optional(),
    workforceCount: z.number().optional(),
    equipmentCount: z.number().optional(),
    executedTasksCount: z.number().optional(),
});

async function checkAuth(req: NextRequest) {
    if (!adminAuth || !adminDb) {
        throw new Error('Firebase Admin SDK não inicializado.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'Não autorizado.', status: 401 };
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return { decodedToken };
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const authCheck = await checkAuth(req);
        if ('error' in authCheck) {
            return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
        }
        const { decodedToken } = authCheck;

        const body = await req.json();
        const action = req.nextUrl.searchParams.get('action') || 'create_requisition';

        if (action === 'create_requisition') {
            const validation = requisitionWorkflowSchema.safeParse(body);
            if (!validation.success) {
                return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
            }

            const { requisitionNumber, description, totalAmountAOA, wbsItemId, wbsItemName } = validation.data;
            const steps = buildApprovalPipeline(totalAmountAOA);
            const requiredTier = steps[steps.length - 1].tier;

            const userDoc = await adminDb!.collection('users').doc(decodedToken.uid).get();
            const authorName = userDoc.exists ? userDoc.data()?.displayName : 'Utilizador';

            const newWorkflow = {
                projectId,
                requisitionNumber,
                description,
                totalAmountAOA,
                requiredTier,
                currentTier: steps[0].tier,
                status: 'pendente',
                requestedBy: { uid: decodedToken.uid, name: authorName },
                requestedAt: admin.firestore.FieldValue.serverTimestamp(),
                steps,
                wbsItemId: wbsItemId || null,
                wbsItemName: wbsItemName || null,
            };

            const docRef = await adminDb!.collection('projects').doc(projectId).collection('approval-workflows').add(newWorkflow);
            return NextResponse.json({ success: true, id: docRef.id, steps }, { status: 201 });
        }

        if (action === 'probative_lock') {
            const validation = probativeLockSchema.safeParse(body);
            if (!validation.success) {
                return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
            }

            const userDoc = await adminDb!.collection('users').doc(decodedToken.uid).get();
            const authorName = userDoc.exists ? userDoc.data()?.displayName : 'Engenheiro Responsável';

            const lockRecord = await createDailyReportLock(
                projectId,
                validation.data.dailyReportId,
                validation.data,
                { uid: decodedToken.uid, displayName: authorName, role: 'Diretor de Obra' }
            );

            await adminDb!.collection('projects').doc(projectId).collection('daily-locks').doc(lockRecord.dailyReportId).set(lockRecord);
            return NextResponse.json({ success: true, lock: lockRecord }, { status: 200 });
        }

        return NextResponse.json({ error: 'Ação não reconhecida.' }, { status: 400 });
    } catch (error: any) {
        console.error('Erro na rota de workflows:', error);
        return NextResponse.json({ error: 'Erro interno ao processar esteira de governação.' }, { status: 500 });
    }
}
