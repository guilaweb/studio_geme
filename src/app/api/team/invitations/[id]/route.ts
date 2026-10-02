import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
  adminAuth = admin.auth(adminApp);
  adminDb = admin.firestore(adminApp);
}

async function verifyPrivileged(req: NextRequest) {
  if (!adminAuth || !adminDb) throw new Error('Firebase Admin indisponível.');
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();

    const isPrivileged =
      userData?.role === 'super-admin' ||
      userData?.role === 'admin' ||
      userData?.profileId === 'admin' ||
      userData?.profileId === 'director';

    if (!isPrivileged) return null;

    return {
      uid: decodedToken.uid,
      displayName: userData?.displayName || decodedToken.name || 'Administrador',
      email: decodedToken.email,
    };
  } catch {
    return null;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyPrivileged(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
    if (!adminDb) throw new Error('DB indisponível');

    const inviteId = (await params).id;
    const inviteRef = adminDb.collection('invitations').doc(inviteId);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 });
    }

    const inviteData = inviteDoc.data();
    await inviteRef.update({
      status: 'Cancelado',
      canceledAt: admin.firestore.FieldValue.serverTimestamp(),
      canceledBy: {
        uid: authResult.uid,
        displayName: authResult.displayName,
      }
    });

    // Audit log
    await adminDb.collection('audit_logs').add({
      actor: {
        uid: authResult.uid,
        displayName: authResult.displayName,
        email: authResult.email,
      },
      action: 'CONVITE_CANCELADO',
      target: {
        type: 'invitation',
        id: inviteId,
        name: inviteData?.displayName || inviteData?.email || inviteId,
      },
      details: `Convite para ${inviteData?.email} cancelado por ${authResult.displayName}.`,
      context: 'Gestão de Equipa & Acessos',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: 'Convite cancelado com sucesso.' });
  } catch (error: any) {
    console.error('Error canceling invitation:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyPrivileged(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
    if (!adminDb) throw new Error('DB indisponível');

    const inviteId = (await params).id;
    const inviteRef = adminDb.collection('invitations').doc(inviteId);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 });
    }

    const inviteData = inviteDoc.data();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    await inviteRef.update({
      status: 'Pendente',
      invitedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      resentBy: {
        uid: authResult.uid,
        displayName: authResult.displayName,
      }
    });

    // Audit log
    await adminDb.collection('audit_logs').add({
      actor: {
        uid: authResult.uid,
        displayName: authResult.displayName,
        email: authResult.email,
      },
      action: 'CONVITE_REENVIADO',
      target: {
        type: 'invitation',
        id: inviteId,
        name: inviteData?.displayName || inviteData?.email || inviteId,
      },
      details: `Convite para ${inviteData?.email} reenviado. Validade renovada por 7 dias.`,
      context: 'Gestão de Equipa & Acessos',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: 'Convite reenviado com sucesso.' });
  } catch (error: any) {
    console.error('Error resending invitation:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
