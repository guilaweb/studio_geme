import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { ORGANIZATION_DEPARTMENTS, ACCESS_PROFILES, PROJECT_ROLES } from '@/types/team';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
  adminAuth = admin.auth(adminApp);
  adminDb = admin.firestore(adminApp);
}

const inviteSchema = z.object({
  displayName: z.string().min(1, 'Nome é obrigatório.'),
  email: z.string().email('Email inválido.'),
  jobTitle: z.string().min(1, 'Cargo é obrigatório.'),
  department: z.string().min(1, 'Departamento é obrigatório.'),
  profileId: z.string().min(1, 'Perfil de acesso é obrigatório.'),
  assignedProjects: z.array(z.object({
    projectId: z.string(),
    projectName: z.string(),
    projectRole: z.string(),
    responsibility: z.string().optional(),
  })).optional().default([]),
});

async function verifyAuth(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    throw new Error('Firebase Admin SDK não inicializado.');
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    // Check if user is active
    if (userData?.status === 'Suspenso' || userData?.status === 'Inactivo') {
      return { authorized: false, suspended: true };
    }

    const isPrivileged = 
      userData?.role === 'super-admin' || 
      userData?.role === 'admin' || 
      userData?.profileId === 'admin' || 
      userData?.profileId === 'director';

    return {
      authorized: true,
      uid: decodedToken.uid,
      displayName: userData?.displayName || decodedToken.name || decodedToken.email || 'Administrador',
      email: decodedToken.email,
      isPrivileged,
      userData,
    };
  } catch (error) {
    console.error('Error verifying token in team API:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    if ((authResult as any).suspended) {
      return NextResponse.json({ error: 'Acesso suspenso.' }, { status: 403 });
    }
    if (!adminDb) throw new Error('DB indisponível');

    const snap = await adminDb.collection('invitations').orderBy('invitedAt', 'desc').get();
    const invitations = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, invitations });
  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    if ((authResult as any).suspended) {
      return NextResponse.json({ error: 'Acesso suspenso.' }, { status: 403 });
    }
    if (!authResult.isPrivileged) {
      return NextResponse.json({ error: 'Apenas Administradores ou Directores podem convidar membros.' }, { status: 403 });
    }

    if (!adminDb) throw new Error('DB indisponível');

    const body = await req.json();
    const validation = inviteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { displayName, email, jobTitle, department, profileId, assignedProjects } = validation.data;

    // Check if an active invitation already exists for this email
    const existingSnap = await adminDb.collection('invitations')
      .where('email', '==', email.toLowerCase().trim())
      .where('status', '==', 'Pendente')
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json({ error: 'Já existe um convite pendente para este endereço de email.' }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const invitationData = {
      email: email.toLowerCase().trim(),
      displayName: displayName.trim(),
      jobTitle: jobTitle.trim(),
      department,
      profileId,
      assignedProjects,
      status: 'Pendente',
      token,
      invitedBy: {
        uid: authResult.uid,
        displayName: authResult.displayName,
      },
      invitedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    };

    const inviteRef = await adminDb.collection('invitations').add(invitationData);

    // Register Audit Log
    await adminDb.collection('audit_logs').add({
      actor: {
        uid: authResult.uid,
        displayName: authResult.displayName,
        email: authResult.email,
      },
      action: 'CONVITE_ENVIADO',
      target: {
        type: 'invitation',
        id: inviteRef.id,
        name: displayName,
      },
      details: `Convite enviado para ${email} como ${jobTitle} (${department} - ${profileId})`,
      context: 'Gestão de Equipa & Acessos',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        email,
        assignedProjectsCount: assignedProjects.length,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Convite registado com sucesso.',
      invitationId: inviteRef.id,
      token,
    });

  } catch (error: any) {
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
