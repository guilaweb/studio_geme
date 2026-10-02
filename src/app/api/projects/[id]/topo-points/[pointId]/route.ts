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

const pointSchema = z.object({
  code: z.string().min(1),
  north: z.number(),
  east: z.number(),
  elevation: z.number(),
});

// Update a specific point
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string, pointId: string }> }) {
  const { id: projectId, pointId } = await params;
  
  try {
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK não inicializado.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Authorization Check: User must be part of the project team
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }
    const teamMemberDoc = await projectRef.collection('team').doc(decodedToken.uid).get();
    const isOwner = projectDoc.data()?.ownerId === decodedToken.uid;
    const role = teamMemberDoc.data()?.role;

    if (!isOwner && role !== 'Gestor' && role !== 'Editor') {
         return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem alterar pontos.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = pointSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const pointRef = adminDb.collection('projects').doc(projectId).collection('topoPoints').doc(pointId);
    await pointRef.update(validation.data);

    return NextResponse.json({ success: true, message: 'Ponto atualizado com sucesso.' });

  } catch (error: any) {
    console.error(`Error updating point ${pointId}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// Delete a specific point
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, pointId: string }> }) {
  const { id: projectId, pointId } = await params;
  
  try {
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK não inicializado.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Authorization Check: User must be part of the project team
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }
    const teamMemberDoc = await projectRef.collection('team').doc(decodedToken.uid).get();
    const isOwner = projectDoc.data()?.ownerId === decodedToken.uid;
    const role = teamMemberDoc.data()?.role;
    
    if (!isOwner && role !== 'Gestor' && role !== 'Editor') {
         return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem eliminar pontos.' }, { status: 403 });
    }

    const pointRef = adminDb.collection('projects').doc(projectId).collection('topoPoints').doc(pointId);
    await pointRef.delete();

    return NextResponse.json({ success: true, message: 'Ponto eliminado com sucesso.' });

  } catch (error: any) {
    console.error(`Error deleting point ${pointId}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
