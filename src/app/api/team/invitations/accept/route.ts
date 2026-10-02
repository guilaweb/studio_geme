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

const acceptSchema = z.object({
  token: z.string().min(1, 'Token obrigatório.'),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin SDK não inicializado.');
    }

    const body = await req.json();
    const validation = acceptSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { token, userId } = validation.data;

    // Query invitation by token
    const snap = await adminDb.collection('invitations')
      .where('token', '==', token)
      .where('status', '==', 'Pendente')
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: 'Convite inválido, cancelado ou já utilizado.' }, { status: 404 });
    }

    const inviteDoc = snap.docs[0];
    const inviteData = inviteDoc.data();

    // Check expiration
    const expiresAt = inviteData.expiresAt?.toDate?.() || new Date(inviteData.expiresAt);
    if (expiresAt && expiresAt < new Date()) {
      await inviteDoc.ref.update({ status: 'Expirado' });
      return NextResponse.json({ error: 'Este convite expirou. Solicite um novo convite ao administrador.' }, { status: 410 });
    }

    // Resolve or find User UID
    let targetUid = userId;
    if (!targetUid) {
      // Check if user exists by email
      try {
        const authUser = await adminAuth.getUserByEmail(inviteData.email);
        targetUid = authUser.uid;
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          // If no auth user, the user will be registered through standard sign-in/sign-up
          // We can link the invitation data
        }
      }
    }

    if (targetUid) {
      // Update User profile in Firestore
      const userRef = adminDb.collection('users').doc(targetUid);
      await userRef.set({
        uid: targetUid,
        email: inviteData.email,
        displayName: inviteData.displayName,
        jobTitle: inviteData.jobTitle,
        department: inviteData.department,
        profileId: inviteData.profileId,
        role: inviteData.profileId === 'admin' ? 'super-admin' : inviteData.profileId,
        status: 'Activo',
        assignedProjects: inviteData.assignedProjects || [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // Add user to assigned projects team subcollections
      if (Array.isArray(inviteData.assignedProjects)) {
        for (const proj of inviteData.assignedProjects) {
          if (proj.projectId) {
            const teamMemberRef = adminDb.collection('projects').doc(proj.projectId).collection('team').doc(targetUid);
            await teamMemberRef.set({
              email: inviteData.email,
              displayName: inviteData.displayName,
              role: proj.projectRole || 'Engenheiro de Campo',
              responsibility: proj.responsibility || 'Membro Técnico',
              department: inviteData.department,
              status: 'Activo',
              joinedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          }
        }
      }
    }

    // Mark invitation as Accepted
    await inviteDoc.ref.update({
      status: 'Aceite',
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      acceptedUid: targetUid || null,
    });

    // Register Audit Log
    await adminDb.collection('audit_logs').add({
      actor: {
        uid: targetUid || 'anónimo',
        displayName: inviteData.displayName,
        email: inviteData.email,
      },
      action: 'CONVITE_ACEITE',
      target: {
        type: 'user',
        id: targetUid || inviteDoc.id,
        name: inviteData.displayName,
      },
      details: `${inviteData.displayName} aceitou o convite e ativou a sua conta como ${inviteData.jobTitle} (${inviteData.department}).`,
      context: 'Gestão de Equipa & Acessos',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Convite aceite com sucesso. A sua conta está ativa!',
      profile: {
        displayName: inviteData.displayName,
        email: inviteData.email,
        jobTitle: inviteData.jobTitle,
        department: inviteData.department,
        profileId: inviteData.profileId,
      }
    });

  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
