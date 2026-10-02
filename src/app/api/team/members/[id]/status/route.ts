import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { USER_STATUSES } from '@/types/team';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
  adminAuth = admin.auth(adminApp);
  adminDb = admin.firestore(adminApp);
}

const statusSchema = z.object({
  status: z.enum(USER_STATUSES),
  reason: z.string().optional(),
});

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyPrivileged(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Acesso negado: Requer privilégios administrativos.' }, { status: 403 });
    }
    if (!adminDb) throw new Error('DB indisponível');

    const targetUid = (await params).id;

    // Prevent self suspension to avoid system lockout
    if (targetUid === authResult.uid) {
      return NextResponse.json({ error: 'Não é possível alterar o próprio estado.' }, { status: 400 });
    }

    const body = await req.json();
    const validation = statusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Estado inválido.', details: validation.error.flatten() }, { status: 400 });
    }

    const { status, reason } = validation.data;
    const userRef = adminDb.collection('users').doc(targetUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }

    const userData = userDoc.data();
    await userRef.update({
      status,
      statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      statusUpdatedBy: {
        uid: authResult.uid,
        displayName: authResult.displayName,
      },
      statusReason: reason || null,
    });

    // Also update status in all projects where the user is an assigned team member
    const assignedProjects = userData?.assignedProjects || [];
    for (const proj of assignedProjects) {
      if (proj.projectId) {
        try {
          const teamMemberDoc = adminDb.collection('projects').doc(proj.projectId).collection('team').doc(targetUid);
          await teamMemberDoc.update({ status });
        } catch {}
      }
    }

    // Register Audit Log
    const actionKey = status === 'Suspenso' 
      ? 'UTILIZADOR_SUSPENSO' 
      : status === 'Activo' 
      ? 'UTILIZADOR_ATIVADO' 
      : 'UTILIZADOR_DESATIVADO';

    await adminDb.collection('audit_logs').add({
      actor: {
        uid: authResult.uid,
        displayName: authResult.displayName,
        email: authResult.email,
      },
      action: actionKey,
      target: {
        type: 'user',
        id: targetUid,
        name: userData?.displayName || userData?.email || targetUid,
      },
      details: `Estado do utilizador ${userData?.displayName || userData?.email} alterado para "${status}". ${reason ? `Motivo: ${reason}` : ''}`,
      context: 'Gestão de Equipa & Acessos',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        newStatus: status,
        reason: reason || null,
      }
    });

    return NextResponse.json({
      success: true,
      message: `Estado atualizado para "${status}". Dados históricos e autoria preservados.`,
    });

  } catch (error: any) {
    console.error('Error updating member status:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
