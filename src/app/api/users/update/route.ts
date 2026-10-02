import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { USER_ROLES } from '@/types/user-roles';

// Initialize Firebase Admin SDK
const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const updateSchema = z.object({
  userId: z.string().min(1),
  field: z.enum(['role', 'plan']),
  value: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
        throw new Error('Firebase Admin not initialized.');
    }
    // 1. Verify Authorization Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado: Token não fornecido.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    // 2. Verify the token and check if the user is a super-admin
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 403 });
    }

    const adminUserDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const adminRole = adminUserDoc.data()?.role;

    if (!adminUserDoc.exists || !['super-admin', 'Gestor Financeiro'].includes(adminRole)) {
      return NextResponse.json({ error: 'Acesso negado: Requer privilégios de administrador ou gestor financeiro.' }, { status: 403 });
    }

    // 3. Validate the request body
    const body = await req.json();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Solicitação inválida.', details: validation.error.flatten() }, { status: 400 });
    }

    const { userId, field, value } = validation.data;
    
    // Prevent a super-admin from changing their own role/plan to avoid lockout
    if (userId === decodedToken.uid) {
        return NextResponse.json({ error: 'Super-admins não podem alterar sua própria função ou plano.' }, { status: 400 });
    }
    
    // Validate role value if that's the field being updated
    if (field === 'role') {
        const roleSchema = z.enum(USER_ROLES);
        const roleValidation = roleSchema.safeParse(value);
        if (!roleValidation.success) {
            return NextResponse.json({ error: 'Função inválida.', details: roleValidation.error.flatten() }, { status: 400 });
        }
    }
    
    // Validate plan value
    if (field === 'plan') {
        const planSchema = z.enum(['hobby', 'pro', 'enterprise']);
        const planValidation = planSchema.safeParse(value);
        if (!planValidation.success) {
            return NextResponse.json({ error: 'Plano inválido.', details: planValidation.error.flatten() }, { status: 400 });
        }
    }

    // 4. Perform the update in Firestore
    const userDocRef = adminDb.collection('users').doc(userId);
    await userDocRef.update({
      [field]: value,
    });

    return NextResponse.json({ success: true, message: `Usuário ${userId} atualizado com sucesso.` });

  } catch (error: any) {
    console.error('Erro na atualização do usuário:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
