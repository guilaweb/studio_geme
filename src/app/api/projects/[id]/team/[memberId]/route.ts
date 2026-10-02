
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, memberId: string }> }) {
  const { id: projectId, memberId } = await params;
  
  try {
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin SDK não inicializado.');
    }

    // 1. Authenticate the user making the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // 2. Check if the user making the request is the project owner or a manager
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }
    
    const requesterUid = decodedToken.uid;
    const projectOwnerId = projectDoc.data()?.ownerId;
    let isAuthorized = false;

    if (requesterUid === projectOwnerId) {
        isAuthorized = true;
    } else {
        const teamMemberDoc = await projectRef.collection('team').doc(requesterUid).get();
        if (teamMemberDoc.exists && teamMemberDoc.data()?.role === 'Gestor') {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Acesso negado. Apenas o dono ou gestores do projeto podem remover membros.' }, { status: 403 });
    }


    // 3. Prevent the owner from being removed
    if (memberId === projectOwnerId) {
        return NextResponse.json({ error: 'O dono do projeto não pode ser removido.' }, { status: 400 });
    }

    // 4. Delete the member from the subcollection
    const teamMemberRef = adminDb.collection('projects').doc(projectId).collection('team').doc(memberId);
    
    // Check if the member exists before deleting
    const memberDoc = await teamMemberRef.get();
    if (!memberDoc.exists) {
        return NextResponse.json({ error: 'Membro da equipa não encontrado.' }, { status: 404 });
    }

    await teamMemberRef.delete();

    // Sync user's assignedProjects
    const userRef = adminDb.collection('users').doc(memberId);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        const existingAssigned: any[] = userData?.assignedProjects || [];
        const filtered = existingAssigned.filter((p: any) => p.projectId !== projectId);
        await userRef.update({ assignedProjects: filtered });
    }

    // Audit log
    await adminDb.collection('audit_logs').add({
        action: 'Membro Removido do Projeto',
        actorId: requesterUid,
        actorEmail: decodedToken.email || 'Sistema',
        targetId: memberId,
        details: `Removido da equipa do projeto "${projectDoc.data()?.name || projectId}".`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        category: 'ProjectTeam',
    });

    return NextResponse.json({ success: true, message: 'Membro removido com sucesso.' });

  } catch (error: any) {
    console.error('Erro ao remover membro:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
