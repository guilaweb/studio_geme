import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { Transmittal, TransmittalStatus, TransmittalItem } from '@/types/collaboration';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const transmittalItemSchema = z.object({
  fileId: z.string(),
  fileName: z.string(),
  version: z.number(),
});

const transmittalSchema = z.object({
  subject: z.string().min(1, 'Assunto é obrigatório.'),
  notes: z.string().optional(),
  status: z.enum(['Enviado', 'Em Revisão', 'Aprovado', 'Aprovado com Comentários', 'Rejeitado']),
  from: z.object({
    uid: z.string(),
    displayName: z.string().nullable(),
  }),
  to: z.array(z.object({
    uid: z.string(),
    displayName: z.string(),
    email: z.string(),
    role: z.string(),
  })).min(1, 'Pelo menos um destinatário é obrigatório.'),
  items: z.array(transmittalItemSchema).min(1, 'Pelo menos um documento é obrigatório.'),
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
    
    // Authorization check - any team member can create a transmittal
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }
    const teamMemberDoc = await projectRef.collection('team').doc(decodedToken.uid).get();
    const isOwner = projectDoc.data()?.ownerId === decodedToken.uid;

    if (!isOwner && !teamMemberDoc.exists) {
      return NextResponse.json({ error: 'Acesso negado. Apenas membros do projeto podem criar submissões.' }, { status: 403 });
    }
    
    const body = await req.json();
    const validation = transmittalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }
    
    const now = admin.firestore.FieldValue.serverTimestamp();
    const newTransmittalData = {
        ...validation.data,
        createdAt: now,
        author: {
            uid: decodedToken.uid,
            displayName: decodedToken.name || decodedToken.email,
        },
        history: [{
            status: validation.data.status,
            notes: 'Submissão criada e enviada.',
            updatedAt: now,
            updatedBy: {
                uid: decodedToken.uid,
                displayName: decodedToken.name || decodedToken.email,
            }
        }]
    };

    const transmittalRef = await adminDb.collection('projects').doc(projectId).collection('transmittals').add(newTransmittalData);

    return NextResponse.json({ success: true, id: transmittalRef.id }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar submissão:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
