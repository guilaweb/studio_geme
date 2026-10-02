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

const settingsSchema = z.object({
  projectName: z.string().min(1, 'O nome do projeto é obrigatório.').optional(),
  webhookUrl: z.string().url('URL de webhook inválido.').optional().or(z.literal('')),
  clientName: z.string().optional().or(z.literal('')),
  clientEmail: z.string().email('Email do cliente inválido.').optional().or(z.literal('')),
  imageUrl: z.string().url('URL da imagem inválido.').optional().or(z.literal('')),
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
    
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }

    if (projectDoc.data()?.ownerId !== decodedToken.uid) {
        return NextResponse.json({ error: 'Acesso negado. Apenas o dono do projeto pode alterar as definições.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = settingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { projectName, webhookUrl, clientName, clientEmail, imageUrl } = validation.data;
    
    const dataToUpdate: {[key: string]: any} = {};
    if (projectName !== undefined) dataToUpdate.name = projectName;
    if (webhookUrl !== undefined) dataToUpdate.webhookUrl = webhookUrl;
    if (clientName !== undefined) dataToUpdate.clientName = clientName;
    if (clientEmail !== undefined) dataToUpdate.clientEmail = clientEmail;
    if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl;

    if (Object.keys(dataToUpdate).length > 0) {
      await projectRef.update(dataToUpdate);
    }

    return NextResponse.json({ success: true, message: 'Definições do projeto atualizadas com sucesso.' });

  } catch (error: any) {
    console.error('Erro ao atualizar definições:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
