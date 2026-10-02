import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
let adminStorage: admin.storage.Storage | undefined;

if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
    adminStorage = admin.storage(adminApp);
}

const contractSchema = z.object({
  contractValue: z.string(),
  fileName: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const projectId = (await params).id;
  
  try {
    if (!adminAuth || !adminDb || !adminStorage) {
      throw new Error('Firebase Admin SDK não inicializado.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Authorization Check
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }
    const teamMemberDoc = await projectRef.collection('team').doc(decodedToken.uid).get();
    const isOwner = projectDoc.data()?.ownerId === decodedToken.uid;
    const role = teamMemberDoc.data()?.role;

    if (!isOwner && role !== 'Gestor' && role !== 'Editor') {
        return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem carregar contratos.' }, { status: 403 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'Ficheiro do contrato em falta.' }, { status: 400 });
    }

    const validation = contractSchema.safeParse({
        contractValue: formData.get('contractValue'),
        fileName: file.name,
    });

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { contractValue, fileName } = validation.data;
    
    const bucket = adminStorage.bucket();
    const storagePath = `projects/${projectId}/contracts/${fileName}`;
    const fileUpload = bucket.file(storagePath);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { saveFileAndGetDownloadUrl } = await import('@/lib/storage-helper');
    const fileUrl = await saveFileAndGetDownloadUrl(fileUpload, buffer, file.type);

    const newContractData = {
        projectId,
        fileName,
        fileUrl,
        contractValue: parseFloat(contractValue),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const contractRef = adminDb.collection('projects').doc(projectId).collection('contracts').doc('main');
    await contractRef.set(newContractData);

    return NextResponse.json({ success: true, id: 'main' }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao carregar contrato:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
