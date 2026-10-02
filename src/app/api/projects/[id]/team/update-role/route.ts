
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

const updateRoleSchema = z.object({
  memberId: z.string().min(1),
  newRole: z.string().min(1),
  responsibility: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const projectId = (await params).id;
  
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
    
    // 2. Check if the authenticated user is the project owner or a 'Gestor'
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }

    const requesterUid = decodedToken.uid;
    const projectOwnerId = projectDoc.data()?.ownerId;

    let isAuthorized = requesterUid === projectOwnerId;
    if (!isAuthorized) {
        const teamMemberDoc = await projectRef.collection('team').doc(requesterUid).get();
        const role = teamMemberDoc.data()?.role;
        if (teamMemberDoc.exists && (role === 'Gestor' || role === 'Gestor de Projecto' || role === 'Diretor')) {
            isAuthorized = true;
        } else {
            const userDoc = await adminDb.collection('users').doc(requesterUid).get();
            const globalRole = userDoc.data()?.role;
            if (globalRole === 'admin' || globalRole === 'super-admin') {
                isAuthorized = true;
            }
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Acesso negado. Apenas o dono ou gestores do projeto podem alterar funções.' }, { status: 403 });
    }

    // 3. Validate request body
    const body = await req.json();
    const validation = updateRoleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { memberId, newRole, responsibility } = validation.data;

    // Prevent anyone from changing the project owner's role
    if (memberId === projectOwnerId) {
        return NextResponse.json({ error: 'A função do dono do projeto não pode ser alterada.' }, { status: 400 });
    }
    
    // 4. Update the role in the subcollection
    const teamMemberRef = adminDb.collection('projects').doc(projectId).collection('team').doc(memberId);
    
    // Check if the member exists before updating
    const memberDoc = await teamMemberRef.get();
    if (!memberDoc.exists) {
        return NextResponse.json({ error: 'Membro da equipa não encontrado.' }, { status: 404 });
    }
    
    const updateData: any = {
        role: newRole,
    };
    if (responsibility !== undefined) {
        updateData.responsibility = responsibility;
    }

    await teamMemberRef.update(updateData);

    // Sync user's assignedProjects
    const userRef = adminDb.collection('users').doc(memberId);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        const existingAssigned: any[] = userData?.assignedProjects || [];
        const updated = existingAssigned.map((p: any) => {
            if (p.projectId === projectId) {
                return {
                    ...p,
                    projectRole: newRole,
                    ...(responsibility ? { responsibility } : {}),
                };
            }
            return p;
        });
        await userRef.update({ assignedProjects: updated });
    }

    // Audit log
    await adminDb.collection('audit_logs').add({
        action: 'Função do Membro de Projeto Atualizada',
        actorId: requesterUid,
        actorEmail: decodedToken.email || 'Sistema',
        targetId: memberId,
        details: `Atualizada a função para "${newRole}"${responsibility ? ` e responsabilidade para "${responsibility}"` : ''} no projeto ${projectDoc.data()?.name || projectId}.`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        category: 'ProjectTeam',
    });

    return NextResponse.json({ success: true, message: 'Função do membro atualizada com sucesso.' });

  } catch (error: any) {
    console.error('Erro ao atualizar função:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
