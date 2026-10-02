import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { type IncidentStatus } from '@/types/hseq';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const addCommentSchema = z.object({
  text: z.string().min(1, 'O texto do comentário é obrigatório.'),
  authorName: z.string().min(1, 'O nome do autor é obrigatório.'),
});

const updateIncidentSchema = z.object({
  status: z.enum(['Aberto', 'Em Investigação', 'Concluído']).optional(),
  actionItems: z.array(z.any()).optional(),
});


// Add a comment to an incident
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string, incidentId: string }> }) {
  const { id: projectId, incidentId } = await params;
  
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
    
    // Authorization - Check if user is part of the project
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }
    const teamMemberDoc = await projectRef.collection('team').doc(decodedToken.uid).get();
    const isOwner = projectDoc.data()?.ownerId === decodedToken.uid;

    if (!isOwner && !teamMemberDoc.exists) {
      return NextResponse.json({ error: 'Acesso negado. Apenas membros do projeto podem comentar.' }, { status: 403 });
    }
    
    const body = await req.json();
    const validation = addCommentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const newComment = {
        ...validation.data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const commentRef = await adminDb.collection('projects').doc(projectId).collection('incidents').doc(incidentId).collection('comments').add(newComment);

    return NextResponse.json({ success: true, id: commentRef.id }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao adicionar comentário ao incidente:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// Update an incident's status or corrective actions
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string, incidentId: string }> }) {
  const { id: projectId, incidentId } = await params;
  
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
    
    // Authorization Check: User must have editor or manager role
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }
    const teamMemberDoc = await projectRef.collection('team').doc(decodedToken.uid).get();
    const isOwner = projectDoc.data()?.ownerId === decodedToken.uid;
    const role = teamMemberDoc.data()?.role;

    if (!isOwner && role !== 'Gestor' && role !== 'Editor') {
        return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem atualizar o incidente.' }, { status: 403 });
    }
    
    const body = await req.json();
    const validation = updateIncidentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const incidentRef = adminDb.collection('projects').doc(projectId).collection('incidents').doc(incidentId);
    
    const dataToUpdate: { [key: string]: any } = {};
    const { status, actionItems } = validation.data;

    if (status) {
        dataToUpdate.status = status;
    }
    if (actionItems !== undefined) {
        dataToUpdate.actionItems = actionItems;
    }

    if (Object.keys(dataToUpdate).length === 0) {
        return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 });
    }
    
    await incidentRef.update(dataToUpdate);

    return NextResponse.json({ success: true, message: 'Incidente atualizado.' });

  } catch (error: any) {
    console.error('Erro ao atualizar incidente:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
