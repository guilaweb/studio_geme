import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
let adminStorage: admin.storage.Storage | undefined;

if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
    adminStorage = admin.storage(adminApp);
}

const updateConcessionSchema = z.object({
  name: z.string().min(1).optional(),
  licenseNumber: z.string().optional(),
  issuingAuthority: z.string().optional(),
  mineralType: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  area: z.number().positive().optional(),
  holder: z.string().min(1).optional(),
  miningMethod: z.enum(['Céu Aberto', 'Subterrânea', 'Aluvionar', 'Quimberlito']).optional(),
  coordinates: z.string().optional(),
  legalStatus: z.enum(['Ativa', 'Expirada', 'Em Renovação', 'Pendente']).optional(),
  validityStart: z.string().datetime().optional(),
  validityEnd: z.string().datetime().optional(),
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
    { params }: { params: Promise<{ id: string; concessionId: string }> }
) {
    const { id: projectId, concessionId } = await params;

    try {
        const authCheck = await checkAuth(req, projectId);
        if ('error' in authCheck) {
            return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
        }

        const concessionRef = adminDb!.collection('projects').doc(projectId).collection('concessions').doc(concessionId);
        const concessionDoc = await concessionRef.get();
        if (!concessionDoc.exists) {
            return NextResponse.json({ error: 'Concessão não encontrada.' }, { status: 404 });
        }

        await concessionRef.delete();

        return NextResponse.json({ success: true, message: 'Concessão eliminada com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao eliminar concessão:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest, 
    { params }: { params: Promise<{ id: string; concessionId: string }> }
) {
    const { id: projectId, concessionId } = await params;

    try {
        const authCheck = await checkAuth(req, projectId);
        if ('error' in authCheck) {
            return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
        }

        const body = await req.json();
        const validation = updateConcessionSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
        }

        const concessionRef = adminDb!.collection('projects').doc(projectId).collection('concessions').doc(concessionId);
        const concessionDoc = await concessionRef.get();
        if (!concessionDoc.exists) {
            return NextResponse.json({ error: 'Concessão não encontrada.' }, { status: 404 });
        }

        const updateData: Record<string, any> = { ...validation.data };
        if (updateData.validityStart) {
            updateData.validityStart = admin.firestore.Timestamp.fromDate(new Date(updateData.validityStart));
        }
        if (updateData.validityEnd) {
            updateData.validityEnd = admin.firestore.Timestamp.fromDate(new Date(updateData.validityEnd));
        }
        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        await concessionRef.update(updateData);

        return NextResponse.json({ success: true, message: 'Concessão atualizada com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao atualizar concessão:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
