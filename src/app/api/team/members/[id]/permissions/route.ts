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

const permissionsSchema = z.object({
  jobTitle: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  profileId: z.string().min(1).optional(),
  customPermissions: z.record(z.any()).optional(),
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
    const body = await req.json();
    const validation = permissionsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { jobTitle, department, profileId, customPermissions } = validation.data;
    const userRef = adminDb.collection('users').doc(targetUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }

    const userData = userDoc.data();
    const updates: Record<string, any> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: {
        uid: authResult.uid,
        displayName: authResult.displayName,
      }
    };

    if (jobTitle) updates.jobTitle = jobTitle;
    if (department) updates.department = department;
    if (profileId) {
      updates.profileId = profileId;
      updates.role = profileId === 'admin' ? 'super-admin' : profileId;
    }
    if (customPermissions !== undefined) {
      updates.customPermissions = customPermissions;
    }

    await userRef.update(updates);

    // Register Audit Log
    await adminDb.collection('audit_logs').add({
      actor: {
        uid: authResult.uid,
        displayName: authResult.displayName,
        email: authResult.email,
      },
      action: profileId ? 'PERFIL_ALTERADO' : 'PERMISSOES_ALTERADAS',
      target: {
        type: 'user',
        id: targetUid,
        name: userData?.displayName || userData?.email || targetUid,
      },
      details: `Funções e permissões de ${userData?.displayName || userData?.email} atualizadas. Perfil: ${profileId || userData?.profileId}, Dept: ${department || userData?.department}.`,
      context: 'Gestão de Equipa & Acessos',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        updates,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Perfil e permissões do membro atualizados com sucesso.',
    });

  } catch (error: any) {
    console.error('Error updating member permissions:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
