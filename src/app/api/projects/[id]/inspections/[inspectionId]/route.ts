import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { type InspectionStatus, type UserRole } from '@/types/post-construction';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const updateSchema = z.object({
  status: z.enum(['Agendada', 'Em Andamento', 'Concluída']),
});

const checklistSchema = z.object({
  id: z.string(),
  templateName: z.string(),
  templateUrl: z.string(),
  items: z.array(z.object({
      id: z.string(),
      text: z.string(),
      status: z.enum(['Conforme', 'Não Conforme', 'Não Aplicável']),
      observations: z.string().optional(),
  })),
  filledBy: z.object({
      uid: z.string(),
      displayName: z.string(),
  }),
});


// POST to add a checklist to an inspection
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string, inspectionId: string }> }) {
  const { id: projectId, inspectionId } = await params;
  
  try {
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK não inicializado.');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Authorization Check: Must be an editor/manager
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
    const validation = checklistSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });

    const inspectionRef = adminDb.collection('projects').doc(projectId).collection('inspections').doc(inspectionId);
    
    await inspectionRef.update({
        checklists: admin.firestore.FieldValue.arrayUnion({
            ...validation.data,
            filledAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
        status: 'Em Andamento' // Automatically update status
    });

    return NextResponse.json({ success: true, message: 'Checklist adicionado à vistoria.' });

  } catch (error: any) {
    console.error('Erro ao adicionar checklist:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string, inspectionId: string }> }) {
  const { id: projectId, inspectionId } = await params;
  
  try {
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK não inicializado.');

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
        return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem atualizar vistorias.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }
    
    const inspectionRef = adminDb.collection('projects').doc(projectId).collection('inspections').doc(inspectionId);
    
    await inspectionRef.update({
        status: validation.data.status
    });

    return NextResponse.json({ success: true, message: 'Estado da vistoria atualizado.' });

  } catch (error: any) {
    console.error(`Error updating inspection ${inspectionId}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
