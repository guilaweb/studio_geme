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

const manageSubscriptionSchema = z.object({
  requestId: z.string().min(1),
  userId: z.string().min(1),
  newStatus: z.enum(['aprovado', 'rejeitado']),
  plan: z.enum(['hobby', 'pro', 'enterprise']),
});

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
        throw new Error('Firebase Admin not initialized.');
    }
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado: Token não fornecido.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 403 });
    }

    const adminUserDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!adminUserDoc.exists || adminUserDoc.data()?.role !== 'super-admin') {
      return NextResponse.json({ error: 'Acesso negado: Requer privilégios de super-admin.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = manageSubscriptionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Solicitação inválida.', details: validation.error.flatten() }, { status: 400 });
    }

    const { requestId, userId, newStatus, plan } = validation.data;
    
    const requestRef = adminDb.collection('subscriptionRequests').doc(requestId);
    const userRef = adminDb.collection('users').doc(userId);
    
    const batch = adminDb.batch();
    
    batch.update(requestRef, {
        status: newStatus,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (newStatus === 'aprovado') {
        batch.update(userRef, {
            plan: plan
        });
    }

    await batch.commit();

    return NextResponse.json({ success: true, message: 'Pedido de subscrição processado com sucesso.' });

  } catch (error: any) {
    console.error('Erro ao processar pedido de subscrição:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
