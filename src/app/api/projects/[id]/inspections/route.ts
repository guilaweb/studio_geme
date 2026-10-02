import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import type { UserRole } from '@/app/projects/[id]/page';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const inspectionSchema = z.object({
  date: z.string().datetime(),
  unitIdentifier: z.string().min(1, 'Identificador da unidade é obrigatório.'),
  clientName: z.string().min(1, 'Nome do cliente é obrigatório.'),
  clientEmail: z.string().email('Email do cliente inválido.'),
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
      return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem agendar vistorias.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = inspectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { date, unitIdentifier, clientName, clientEmail } = validation.data;
    
    const newInspectionData = {
        date: admin.firestore.Timestamp.fromDate(new Date(date)),
        unitIdentifier,
        clientName,
        clientEmail,
        status: 'Agendada',
        checklists: [],
        signatures: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const inspectionRef = await adminDb.collection('projects').doc(projectId).collection('inspections').add(newInspectionData);

    return NextResponse.json({ success: true, id: inspectionRef.id }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao agendar vistoria:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
