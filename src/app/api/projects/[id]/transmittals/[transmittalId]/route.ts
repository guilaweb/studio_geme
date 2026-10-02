import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { type TransmittalStatus } from '@/types/collaboration';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const updateStatusSchema = z.object({
  status: z.enum(['Enviado', 'Em Revisão', 'Aprovado', 'Aprovado com Comentários', 'Rejeitado']),
  notes: z.string().optional(),
});


// PUT (update) a transmittal status
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string, transmittalId: string }> }) {
  const { id: projectId, transmittalId } = await params;
  
  try {
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK não inicializado.');

    // 1. Authenticate and Authorize
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const transmittalRef = adminDb.collection('projects').doc(projectId).collection('transmittals').doc(transmittalId);
    const transmittalDoc = await transmittalRef.get();
    if (!transmittalDoc.exists) {
        return NextResponse.json({ error: 'Submissão não encontrada.' }, { status: 404 });
    }

    // Authorization: Check if the user is one of the recipients
    const recipients = transmittalDoc.data()?.to.map((t: any) => t.uid) || [];
    if (!recipients.includes(decodedToken.uid)) {
        return NextResponse.json({ error: 'Acesso negado. Apenas destinatários podem responder.' }, { status: 403 });
    }

    // 2. Validate request body
    const body = await req.json();
    const validation = updateStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }
    const { status, notes } = validation.data;
    
    // 3. Update the transmittal document
    const now = admin.firestore.FieldValue.serverTimestamp();
    const historyEntry = {
        status,
        notes,
        updatedAt: now,
        updatedBy: {
            uid: decodedToken.uid,
            displayName: decodedToken.name || decodedToken.email,
        }
    };
    
    await transmittalRef.update({
      status: status,
      history: admin.firestore.FieldValue.arrayUnion(historyEntry),
    });

    return NextResponse.json({ success: true, message: 'Estado da submissão atualizado.' });

  } catch (error: any) {
    console.error(`Error updating transmittal ${transmittalId}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
