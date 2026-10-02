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

const movementSchema = z.object({
    location: z.string().min(1, "Localização é obrigatória"),
    notes: z.string().optional(),
});

const updateLotSchema = z.object({
    status: z.enum(['Em Processamento', 'Classificado', 'Pronto para Venda', 'Vendido', 'Exportado']).optional(),
    currentQuantity: z.number().positive().optional(),
    kimberleyProcessId: z.string().optional(),
    sealNumber: z.string().optional(),
    gemClassification: z.string().optional(),
    estimatedValueUSD: z.number().positive().optional(),
    estimatedValueAOA: z.number().positive().optional(),
    exportDestinationCountry: z.string().optional(),
    movement: movementSchema.optional(),
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

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; lotId: string }> }
) {
    const { id: projectId, lotId } = await params;

    try {
        const authCheck = await checkAuth(req, projectId);
        if ('error' in authCheck) {
            return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
        }
        const { decodedToken } = authCheck;

        const body = await req.json();
        const validation = updateLotSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
        }

        const lotRef = adminDb!.collection('projects').doc(projectId).collection('lots').doc(lotId);
        const lotDoc = await lotRef.get();
        if (!lotDoc.exists) {
            return NextResponse.json({ error: 'Lote não encontrado.' }, { status: 404 });
        }

        const updateData: Record<string, any> = {};
        const data = validation.data;

        if (data.status) updateData.status = data.status;
        if (data.currentQuantity) updateData.currentQuantity = data.currentQuantity;
        if (data.kimberleyProcessId !== undefined) updateData.kimberleyProcessId = data.kimberleyProcessId;
        if (data.sealNumber !== undefined) updateData.sealNumber = data.sealNumber;
        if (data.gemClassification !== undefined) updateData.gemClassification = data.gemClassification;
        if (data.estimatedValueUSD !== undefined) updateData.estimatedValueUSD = data.estimatedValueUSD;
        if (data.estimatedValueAOA !== undefined) updateData.estimatedValueAOA = data.estimatedValueAOA;
        if (data.exportDestinationCountry !== undefined) updateData.exportDestinationCountry = data.exportDestinationCountry;

        // Se houver nova movimentação de cadeia de custódia
        if (data.movement) {
            const userDoc = await adminDb!.collection('users').doc(decodedToken.uid).get();
            const authorDisplayName = userDoc.exists ? userDoc.data()?.displayName : 'Responsável de Custódia';

            const newMovement = {
                date: admin.firestore.Timestamp.now(),
                location: data.movement.location,
                notes: data.movement.notes || '',
                author: { uid: decodedToken.uid, displayName: authorDisplayName }
            };

            updateData.history = admin.firestore.FieldValue.arrayUnion(newMovement);
        }

        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        await lotRef.update(updateData);

        return NextResponse.json({ success: true, message: 'Lote atualizado com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao atualizar lote:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; lotId: string }> }
) {
    const { id: projectId, lotId } = await params;

    try {
        const authCheck = await checkAuth(req, projectId);
        if ('error' in authCheck) {
            return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
        }

        const lotRef = adminDb!.collection('projects').doc(projectId).collection('lots').doc(lotId);
        const lotDoc = await lotRef.get();
        if (!lotDoc.exists) {
            return NextResponse.json({ error: 'Lote não encontrado.' }, { status: 404 });
        }

        await lotRef.delete();

        return NextResponse.json({ success: true, message: 'Lote eliminado com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao eliminar lote:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
