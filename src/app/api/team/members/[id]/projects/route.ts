import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { PROJECT_ROLES, PROJECT_RESPONSIBILITIES } from '@/types/team';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
  adminAuth = admin.auth(adminApp);
  adminDb = admin.firestore(adminApp);
}

const assignProjectSchema = z.object({
  projectId: z.string().min(1, 'ID do projeto obrigatório.'),
  projectName: z.string().min(1, 'Nome do projeto obrigatório.'),
  projectCode: z.string().optional(),
  projectRole: z.string().min(1, 'Função no projeto obrigatória.'),
  responsibility: z.string().optional().default('Membro Técnico'),
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
      userData?.profileId === 'director' ||
      userData?.profileId === 'project_manager';

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyPrivileged(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Acesso negado: Requer privilégios administrativos ou de gestão.' }, { status: 403 });
    }
    if (!adminDb) throw new Error('DB indisponível');

    const targetUid = (await params).id;
    const body = await req.json();
    const validation = assignProjectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { projectId, projectName, projectCode, projectRole, responsibility } = validation.data;
    const userRef = adminDb.collection('users').doc(targetUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }

    const userData = userDoc.data();
    const existingProjects: any[] = userData?.assignedProjects || [];

    // Filter out existing reference to the same project if present to update it
    const updatedProjects = existingProjects.filter(p => p.projectId !== projectId);
    updatedProjects.push({
      projectId,
      projectName,
      projectCode: projectCode || null,
      projectRole,
      responsibility,
      assignedAt: new Date().toISOString(),
    });

    await userRef.update({
      assignedProjects: updatedProjects,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Write to projects/{projectId}/team/{targetUid}
    const teamMemberRef = adminDb.collection('projects').doc(projectId).collection('team').doc(targetUid);
    await teamMemberRef.set({
      uid: targetUid,
      email: userData?.email,
      displayName: userData?.displayName,
      role: projectRole,
      responsibility,
      department: userData?.department || 'Engenharia & Projetos',
      status: userData?.status || 'Activo',
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Register Audit Log
    await adminDb.collection('audit_logs').add({
      actor: {
        uid: authResult.uid,
        displayName: authResult.displayName,
        email: authResult.email,
      },
      action: 'PROJETO_ATRIBUIDO',
      target: {
        type: 'user',
        id: targetUid,
        name: userData?.displayName || userData?.email || targetUid,
      },
      details: `${userData?.displayName} alocado ao projeto "${projectName}" como ${projectRole} (${responsibility}).`,
      context: `Projeto: ${projectName}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        projectId,
        projectName,
        projectRole,
        responsibility,
      }
    });

    return NextResponse.json({
      success: true,
      message: `Membro alocado com sucesso ao projeto "${projectName}".`,
      assignedProjects: updatedProjects,
    });

  } catch (error: any) {
    console.error('Error assigning project to member:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyPrivileged(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Acesso negado: Requer privilégios administrativos ou de gestão.' }, { status: 403 });
    }
    if (!adminDb) throw new Error('DB indisponível');

    const targetUid = (await params).id;
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Parâmetro projectId é obrigatório.' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(targetUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }

    const userData = userDoc.data();
    const existingProjects: any[] = userData?.assignedProjects || [];
    const targetProject = existingProjects.find(p => p.projectId === projectId);
    const updatedProjects = existingProjects.filter(p => p.projectId !== projectId);

    await userRef.update({
      assignedProjects: updatedProjects,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Delete from projects/{projectId}/team/{targetUid}
    await adminDb.collection('projects').doc(projectId).collection('team').doc(targetUid).delete();

    // Register Audit Log
    await adminDb.collection('audit_logs').add({
      actor: {
        uid: authResult.uid,
        displayName: authResult.displayName,
        email: authResult.email,
      },
      action: 'PROJETO_REMOVIDO',
      target: {
        type: 'user',
        id: targetUid,
        name: userData?.displayName || userData?.email || targetUid,
      },
      details: `${userData?.displayName} desvinculado do projeto "${targetProject?.projectName || projectId}".`,
      context: `Projeto: ${projectId}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        projectId,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Membro removido do projeto com sucesso.',
      assignedProjects: updatedProjects,
    });

  } catch (error: any) {
    console.error('Error removing member from project:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
