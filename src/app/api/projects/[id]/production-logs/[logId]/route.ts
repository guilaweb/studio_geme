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

const updateProductionLogSchema = z.object({
  date: z.string().datetime().optional(),
  shift: z.enum(['Dia', 'Noite']).optional(),
  material: z.string().min(1).optional(),
  materialType: z.enum(['Minério', 'Estéril', 'Sub-económico']).optional(),
  tonnage: z.number().positive().optional(),
  wasteTonnage: z.number().nonnegative().optional(),
  oreTonnage: z.number().nonnegative().optional(),
  grade: z.number().nullable().optional(),
  density: z.number().positive().optional(),
  volume: z.number().positive().optional(),
  pitBench: z.string().optional(),
  operationHours: z.number().positive().optional(),
  sourceLocation: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  notes: z.string().optional(),
  wbsItemId: z.string().nullable().optional(),
  wbsItemName: z.string().nullable().optional(),
});

async function checkAuth(req: NextRequest, projectId: string) {
    if (!adminAuth || !adminDb) {
        throw new Error('Firebase Admin SDK não inicializado.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'Não autorizado.', status: 401 };
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
        return { error: 'Projeto não encontrado.', status: 404 };
    }

    const isOwner = projectDoc.data()?.ownerId === decodedToken.uid;
    let isAuthorized = false;
    if (isOwner) {
        isAuthorized = true;
    } else {
        const teamMemberDoc = await projectRef.collection('team').doc(decodedToken.uid).get();
        if (teamMemberDoc.exists) {
            const role = teamMemberDoc.data()?.role;
            if (role === 'Gestor' || role === 'Editor') {
                isAuthorized = true;
            }
        }
    }

    if (!isAuthorized) {
        return { error: 'Acesso negado. Requer função de Gestor ou Editor.', status: 403 };
    }

    return { decodedToken, isAuthorized: true };
}

export async function DELETE(
    req: NextRequest, 
    { params }: { params: Promise<{ id: string; logId: string }> }
) {
    const { id: projectId, logId } = await params;

    try {
        const authCheck = await checkAuth(req, projectId);
        if ('error' in authCheck) {
            return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
        }

        const logRef = adminDb!.collection('projects').doc(projectId).collection('production-logs').doc(logId);
        const logDoc = await logRef.get();
        if (!logDoc.exists) {
            return NextResponse.json({ error: 'Registo de produção não encontrado.' }, { status: 404 });
        }

        await logRef.delete();

        return NextResponse.json({ success: true, message: 'Registo de produção eliminado com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao eliminar registo de produção:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest, 
    { params }: { params: Promise<{ id: string; logId: string }> }
) {
    const { id: projectId, logId } = await params;

    try {
        const authCheck = await checkAuth(req, projectId);
        if ('error' in authCheck) {
            return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
        }

        const body = await req.json();
        const validation = updateProductionLogSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
        }

        const logRef = adminDb!.collection('projects').doc(projectId).collection('production-logs').doc(logId);
        const logDoc = await logRef.get();
        if (!logDoc.exists) {
            return NextResponse.json({ error: 'Registo de produção não encontrado.' }, { status: 404 });
        }

        const updateData: Record<string, any> = { ...validation.data };
        if (updateData.date) {
            updateData.date = admin.firestore.Timestamp.fromDate(new Date(updateData.date));
        }
        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        await logRef.update(updateData);

        return NextResponse.json({ success: true, message: 'Registo de produção atualizado com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao atualizar registo de produção:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
