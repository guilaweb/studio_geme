
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { type AuditType } from '@/types/hseq';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const auditSchema = z.object({
  date: z.string().datetime(),
  type: z.enum(['Segurança', 'Qualidade', 'Ambiental', 'Integrada']),
  auditor: z.string().min(1, 'Auditor é obrigatório.'),
  scope: z.string().min(1, 'Âmbito é obrigatório.'),
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
    
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }

    const isOwner = projectDoc.data()?.ownerId === decodedToken.uid;
    let isAuthorized = isOwner;
    
    if (!isAuthorized) {
        const teamMemberDoc = await projectRef.collection('team').doc(decodedToken.uid).get();
        if (teamMemberDoc.exists) {
            const role = teamMemberDoc.data()?.role;
            if (role === 'Gestor' || role === 'Editor') {
                isAuthorized = true;
            }
        }
    }
    
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Acesso negado. Requer função de Gestor ou Editor.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = auditSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { date, type, auditor, scope } = validation.data;
    
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const authorDisplayName = userDoc.exists ? userDoc.data()?.displayName : 'Utilizador Desconhecido';

    const newAuditData = {
        date: admin.firestore.Timestamp.fromDate(new Date(date)),
        type,
        auditor,
        scope,
        status: 'Agendada',
        findings: [],
        author: {
            uid: decodedToken.uid,
            displayName: authorDisplayName,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const auditRef = await adminDb.collection('projects').doc(projectId).collection('audits').add(newAuditData);

    return NextResponse.json({ success: true, id: auditRef.id }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao agendar auditoria:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
