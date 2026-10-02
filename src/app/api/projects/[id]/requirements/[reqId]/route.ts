import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { type RequirementStatus } from '@/types/requirements';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const updateSchema = z.object({
  status: z.enum(['Proposto', 'Em Análise', 'Aprovado', 'Rejeitado', 'Em Teste', 'Verificado']).optional(),
  // Add other fields that can be updated here
});


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string, reqId: string }> }) {
  const { id: projectId, reqId } = await params;
  
  try {
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK não inicializado.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Authorization check
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }
    const teamMemberDoc = await projectRef.collection('team').doc(decodedToken.uid).get();
    const isOwner = projectDoc.data()?.ownerId === decodedToken.uid;
    const role = teamMemberDoc.data()?.role;

    if (!isOwner && role !== 'Gestor' && role !== 'Editor') {
      return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem atualizar requisitos.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }
    
    const requirementRef = adminDb.collection('projects').doc(projectId).collection('requirements').doc(reqId);
    
    await requirementRef.update(validation.data);

    return NextResponse.json({ success: true, message: 'Requisito atualizado.' });

  } catch (error: any) {
    console.error(`Error updating requirement ${reqId}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
