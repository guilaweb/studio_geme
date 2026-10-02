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

export async function PATCH(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string; siteId: string }> }
) {
  const { id: projectId, siteId } = await params;

  try {
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin SDK não inicializado.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(idToken);

    const body = await req.json();
    const siteRef = adminDb.collection('projects').doc(projectId).collection('sites').doc(siteId);
    const siteDoc = await siteRef.get();

    if (!siteDoc.exists) {
      return NextResponse.json({ error: 'Site não encontrado.' }, { status: 404 });
    }

    const updateData: Record<string, any> = { ...body };

    // Handle timestamps if passed
    if (body.targetOnAirDate) {
      updateData.targetOnAirDate = admin.firestore.Timestamp.fromDate(new Date(body.targetOnAirDate));
    }
    if (body.actualOnAirDate) {
      updateData.actualOnAirDate = admin.firestore.Timestamp.fromDate(new Date(body.actualOnAirDate));
    }

    // Auto update progress if status changes
    if (body.status === 'Ativo' && body.progressPercent === undefined) {
      updateData.progressPercent = 100;
      if (!updateData.actualOnAirDate) {
        updateData.actualOnAirDate = admin.firestore.FieldValue.serverTimestamp();
      }
    }

    await siteRef.update(updateData);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar site:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string; siteId: string }> }
) {
  const { id: projectId, siteId } = await params;

  try {
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin SDK não inicializado.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(idToken);

    await adminDb.collection('projects').doc(projectId).collection('sites').doc(siteId).delete();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao eliminar site:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
