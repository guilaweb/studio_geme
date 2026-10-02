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

const lotSchema = z.object({
  lotNumber: z.string().min(1, "Número do lote é obrigatório"),
  material: z.string().min(1, "Material é obrigatório"),
  materialType: z.enum(['Minério', 'Estéril', 'Sub-económico']).optional(),
  initialQuantity: z.number().positive("Quantidade inicial deve ser positiva"),
  currentQuantity: z.number().positive("Quantidade atual deve ser positiva"),
  unit: z.enum(['t', 'kg', 'ct']),
  origin: z.string().min(1, "Origem é obrigatória"),
  status: z.enum(['Em Processamento', 'Classificado', 'Pronto para Venda', 'Vendido', 'Exportado']).default('Em Processamento'),
  kimberleyProcessId: z.string().optional(),
  sealNumber: z.string().optional(),
  carats: z.number().positive().optional(),
  estimatedValueUSD: z.number().positive().optional(),
  estimatedValueAOA: z.number().positive().optional(),
  gemClassification: z.string().optional(),
  exportDestinationCountry: z.string().optional(),
  issuerEntity: z.string().optional(),
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

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        if (!adminDb) {
            throw new Error('Firebase Admin SDK não inicializado.');
        }

        const lotsSnapshot = await adminDb
            .collection('projects')
            .doc(projectId)
            .collection('lots')
            .orderBy('createdAt', 'desc')
            .get();

        const lots = lotsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({ lots });
    } catch (error: any) {
        console.error('Erro ao listar lotes:', error);
        return NextResponse.json({ error: 'Erro interno ao consultar lotes.' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const authCheck = await checkAuth(req, projectId);
        if ('error' in authCheck) {
            return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
        }
        const { decodedToken } = authCheck;

        const body = await req.json();
        const validation = lotSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
        }

        const userDoc = await adminDb!.collection('users').doc(decodedToken.uid).get();
        const authorDisplayName = userDoc.exists ? userDoc.data()?.displayName : 'Utilizador';

        const lotData = validation.data;
        const initialMovement = {
            date: admin.firestore.Timestamp.now(),
            location: `Origem: ${lotData.origin} (Entrada em Parque / Central de Escolha)`,
            notes: 'Lote registado e etiquetado preliminarmente.',
            author: { uid: decodedToken.uid, displayName: authorDisplayName }
        };

        const newLot: Record<string, any> = {
            ...lotData,
            history: [initialMovement],
            author: {
                uid: decodedToken.uid,
                displayName: authorDisplayName,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const lotRef = await adminDb!.collection('projects').doc(projectId).collection('lots').add(newLot);

        return NextResponse.json({ success: true, id: lotRef.id }, { status: 201 });
    } catch (error: any) {
        console.error('Erro ao registar lote:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
