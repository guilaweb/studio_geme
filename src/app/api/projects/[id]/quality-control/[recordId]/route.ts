import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { type QualityTestStatus, type ActionItem } from '@/types/hseq';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const updateStatusSchema = z.object({
  status: z.enum(['Pendente', 'Aprovado', 'Reprovado']),
});

const updateActionItemsSchema = z.object({
  actionItems: z.array(z.any()),
});

// PUT - Update a quality record's status
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string, recordId: string }> }) {
  const { id: projectId, recordId } = await params;
  
  try {
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK não inicializado.');

    // 1. Authenticate and Authorize
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Authorization Check: User must have editor or manager role
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
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
        return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem atualizar registos de qualidade.' }, { status: 403 });
    }

    // 2. Validate request body
    const body = await req.json();
    const validation = updateStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }
    const { status } = validation.data;
    
    // 3. Update the document
    const recordRef = adminDb.collection('projects').doc(projectId).collection('quality-control').doc(recordId);
    await recordRef.update({ status });

    return NextResponse.json({ success: true, message: 'Estado do ensaio atualizado.' });

  } catch (error: any) {
    console.error(`Error updating quality record ${recordId}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// PATCH - Update action items for a quality record
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string, recordId: string }> }) {
  const { id: projectId, recordId } = await params;

  try {
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK não inicializado.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Authorization check
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
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
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = updateActionItemsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }
    
    const { actionItems } = validation.data;

    const recordRef = adminDb.collection('projects').doc(projectId).collection('quality-control').doc(recordId);
    await recordRef.update({ actionItems });
    
    return NextResponse.json({ success: true, message: 'Plano de ação atualizado.' });

  } catch (error: any) {
    console.error(`Error updating action items for quality record ${recordId}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
