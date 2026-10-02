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

const inviteSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  email: z.string().email('Email inválido.'),
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
    
    // Authorization Check: Only project managers or owners can invite clients
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }
    
    const isOwner = projectDoc.data()?.ownerId === decodedToken.uid;
    let isAuthorized = false;
    if (isOwner) {
        isAuthorized = true;
    } else {
        const teamMemberDoc = await projectRef.collection('team').doc(decodedToken.uid).get();
        if (teamMemberDoc.exists && teamMemberDoc.data()?.role === 'Gestor') {
            isAuthorized = true;
        }
    }
    
    if (!isAuthorized) {
         return NextResponse.json({ error: 'Acesso negado. Apenas o dono ou gestores do projeto podem convidar clientes.' }, { status: 403 });
    }
    
    const body = await req.json();
    const validation = inviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { name, email } = validation.data;
    let userRecord;
    let isNewUser = false;

    try {
        userRecord = await adminAuth.getUserByEmail(email);
        const userDocRef = adminDb.collection('users').doc(userRecord.uid);
        const userDoc = await userDocRef.get();

        if (userDoc.exists) {
            await userDocRef.update({ role: 'cliente' });
        } else {
            // This case handles a user that exists in Firebase Auth but not in Firestore DB.
            await userDocRef.set({
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName || name, // Use provided name as fallback
                role: 'cliente',
                plan: 'hobby',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }

    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            // User does not exist, create them
            userRecord = await adminAuth.createUser({
                email: email,
                displayName: name,
                emailVerified: false, // They will verify by setting password
            });
            
            const newUserDocRef = adminDb.collection('users').doc(userRecord.uid);
            await newUserDocRef.set({
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                role: 'cliente',
                plan: 'hobby', // Clients get a default hobby plan
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            isNewUser = true;
        } else {
            // Re-throw other auth errors
            throw error;
        }
    }
    
    // Update the project with the client's info
    await projectRef.update({
        clientName: name,
        clientEmail: email,
    });
    
    const message = isNewUser
      ? 'Conta de cliente criada. O cliente deve usar a opção "Esqueceu sua senha?" na página do portal para definir a sua senha inicial.'
      : 'Função de cliente atribuída a um utilizador existente. Já pode aceder ao portal.';

    return NextResponse.json({ success: true, message: message }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao convidar cliente:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
