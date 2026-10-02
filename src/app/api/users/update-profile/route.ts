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

const updateProfileSchema = z.object({
  displayName: z.string().min(1, 'O nome de exibição não pode estar vazio.').optional(),
  photoURL: z.string().optional().nullable(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  professionalRegNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
  province: z.string().optional(),
  digitalSignatureUrl: z.string().optional().nullable(),
  defaultViewMode: z.enum(['field_operation', 'cost_engineer', 'executive_cockpit', 'full_engineering']).optional(),
  preferredTheme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.object({
    emailAlerts: z.boolean().optional(),
    costDeviationAlerts: z.boolean().optional(),
    hseqAlerts: z.boolean().optional(),
    dailyReportReminders: z.boolean().optional(),
    measurementApprovals: z.boolean().optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado: Token em falta.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    // Suporte para utilizador em modo demonstração local
    if (idToken === 'demo-token' || idToken === 'demo-id-token') {
      return NextResponse.json({ 
        success: true, 
        message: 'Perfil de demonstração atualizado com sucesso (modo local).' 
      });
    }

    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin não inicializado no servidor.');
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 403 });
    }

    const { uid } = decodedToken;
    const body = await req.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Dados de perfil inválidos.', 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const data = validation.data;
    const updateData: Record<string, any> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;
    if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.professionalRegNumber !== undefined) updateData.professionalRegNumber = data.professionalRegNumber;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.province !== undefined) updateData.province = data.province;
    if (data.digitalSignatureUrl !== undefined) updateData.digitalSignatureUrl = data.digitalSignatureUrl;
    if (data.defaultViewMode !== undefined) updateData.defaultViewMode = data.defaultViewMode;
    if (data.preferredTheme !== undefined) updateData.preferredTheme = data.preferredTheme;
    if (data.notifications !== undefined) updateData.notifications = data.notifications;

    // Atualiza no Firestore (cria ou funde o documento do utilizador)
    const userDocRef = adminDb.collection('users').doc(uid);
    await userDocRef.set(updateData, { merge: true });

    // Atualiza no Firebase Auth se displayName ou photoURL foram alterados
    const authUpdates: { displayName?: string; photoURL?: string } = {};
    if (data.displayName) authUpdates.displayName = data.displayName;
    if (data.photoURL && !data.photoURL.startsWith('data:')) {
      // Firebase Auth aceita URL válida para photoURL
      authUpdates.photoURL = data.photoURL;
    }

    if (Object.keys(authUpdates).length > 0) {
      try {
        await adminAuth.updateUser(uid, authUpdates);
      } catch (authError) {
        console.warn('Aviso: Não foi possível sincronizar o Firebase Auth diretamente:', authError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Perfil de engenharia atualizado com sucesso.' 
    });

  } catch (error: any) {
    console.error('Erro ao atualizar perfil do utilizador:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}

