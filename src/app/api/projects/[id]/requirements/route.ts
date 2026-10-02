import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { type RequirementType, type RequirementPriority } from '@/types/requirements';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const requirementSchema = z.object({
  text: z.string().min(1, 'A descrição é obrigatória.'),
  type: z.enum(['Funcional', 'Não-Funcional', 'Técnico', 'De Negócio']),
  priority: z.enum(['Essencial', 'Importante', 'Desejável']),
  notes: z.string().optional(),
  wbsItemId: z.string().optional().nullable(),
  wbsItemName: z.string().optional().nullable(),
  fvsId: z.string().optional().nullable(),
  fvsName: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const projectId = (await params).id;
  
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
      return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem adicionar requisitos.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = requirementSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { text, type, priority, notes, wbsItemId, wbsItemName, fvsId, fvsName } = validation.data;
    
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const authorDisplayName = userDoc.exists ? userDoc.data()?.displayName : 'Utilizador Desconhecido';

    const newRequirementData = {
        text,
        type,
        priority,
        notes: notes || '',
        status: 'Proposto',
        wbsItemId: wbsItemId || null,
        wbsItemName: wbsItemName || null,
        fvsId: fvsId || null,
        fvsName: fvsName || null,
        author: {
            uid: decodedToken.uid,
            displayName: authorDisplayName,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const requirementRef = await adminDb.collection('projects').doc(projectId).collection('requirements').add(newRequirementData);

    return NextResponse.json({ success: true, id: requirementRef.id }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao adicionar requisito:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
