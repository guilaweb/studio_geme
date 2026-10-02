
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

const addMemberSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.string().min(1),
  responsibility: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const projectId = (await params).id;
  
  try {
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin SDK não inicializado.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Check if the user making the request is the project owner, admin or manager
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }

    const projectData = projectDoc.data();
    const requesterUid = decodedToken.uid;
    const projectOwnerId = projectData?.ownerId;
    let isAuthorized = requesterUid === projectOwnerId;

    if (!isAuthorized) {
        const teamMemberDoc = await projectRef.collection('team').doc(requesterUid).get();
        const role = teamMemberDoc.data()?.role;
        if (teamMemberDoc.exists && (role === 'Gestor' || role === 'Gestor de Projecto' || role === 'Diretor')) {
            isAuthorized = true;
        } else {
            // Also check global user role
            const userDoc = await adminDb.collection('users').doc(requesterUid).get();
            const globalRole = userDoc.data()?.role;
            if (globalRole === 'admin' || globalRole === 'super-admin' || globalRole === 'Gestor de Projecto') {
                isAuthorized = true;
            }
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Acesso negado. Apenas gestores do projeto ou administradores podem adicionar membros.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = addMemberSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { uid, email, displayName, role, responsibility, department, phone } = validation.data;

    // Add user to the team subcollection
    const teamMemberRef = adminDb.collection('projects').doc(projectId).collection('team').doc(uid);
    await teamMemberRef.set({
        email,
        displayName,
        role,
        responsibility: responsibility || 'Coordenação Geral',
        department: department || '',
        phone: phone || '',
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Sync with user's assignedProjects in users collection
    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        const existingAssigned: any[] = userData?.assignedProjects || [];
        const filtered = existingAssigned.filter((p: any) => p.projectId !== projectId);
        filtered.push({
            projectId,
            projectTitle: projectData?.name || 'Projeto',
            projectRole: role,
            responsibility: responsibility || 'Coordenação Geral',
            assignedAt: new Date().toISOString(),
        });
        await userRef.update({ assignedProjects: filtered });
    }

    // Write audit log
    await adminDb.collection('audit_logs').add({
        action: 'Membro Adicionado ao Projeto',
        actorId: requesterUid,
        actorEmail: decodedToken.email || 'Sistema',
        targetId: uid,
        targetEmail: email,
        details: `Adicionado ao projeto "${projectData?.name || projectId}" com a função "${role}" e responsabilidade "${responsibility || 'Geral'}".`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        category: 'ProjectTeam',
    });

    return NextResponse.json({ success: true, message: 'Membro adicionado ao projeto com sucesso.' });

  } catch (error: any) {
    console.error('Erro ao adicionar membro:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}

    
