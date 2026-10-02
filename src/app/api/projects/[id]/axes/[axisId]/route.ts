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

const axisUpdateSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  startX: z.number(),
  startY: z.number(),
  endX: z.number(),
  endY: z.number(),
});


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string, axisId: string }> }) {
  const { id: projectId, axisId } = await params;
  
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
    const teamMemberDoc = await projectRef.collection('team').doc(decodedToken.uid).get();
    const isOwner = projectDoc.data()?.ownerId === decodedToken.uid;
    const role = teamMemberDoc.data()?.role;

    if (!isOwner && role !== 'Gestor' && role !== 'Editor') {
      return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem realizar esta ação.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = axisUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const axisRef = adminDb.collection('projects').doc(projectId).collection('axes').doc(axisId);
    
    const docSnap = await axisRef.get();
    if (!docSnap.exists) {
        return NextResponse.json({ error: 'Eixo não encontrado.' }, { status: 404 });
    }

    await axisRef.update(validation.data);

    return NextResponse.json({ success: true, message: 'Eixo atualizado com sucesso.' });

  } catch (error: any) {
    console.error(`Error updating axis ${axisId}:`, error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, axisId: string }> }) {
  const { id: projectId, axisId } = await params;
  
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
      return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem realizar esta ação.' }, { status: 403 });
    }

    const axisRef = adminDb.collection('projects').doc(projectId).collection('axes').doc(axisId);
    
    const docSnap = await axisRef.get();
    if (!docSnap.exists) {
        return NextResponse.json({ error: 'Eixo não encontrado.' }, { status: 404 });
    }

    await axisRef.delete();

    return NextResponse.json({ success: true, message: 'Eixo eliminado com sucesso.' });

  } catch (error: any) {
    console.error(`Error deleting axis ${axisId}:`, error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
