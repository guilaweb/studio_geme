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

const licenseSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['Alvará de Construção', 'Licença de Utilização', 'Licença Ambiental', 'Outro']),
  referenceNumber: z.string().min(1),
  issuingBody: z.string().optional(),
  issueDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime(),
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
        return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem adicionar licenças.' }, { status: 403 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'Ficheiro em falta.' }, { status: 400 });
    }

    const validation = licenseSchema.safeParse({
        name: formData.get('name'),
        type: formData.get('type'),
        referenceNumber: formData.get('referenceNumber'),
        issuingBody: formData.get('issuingBody'),
        issueDate: formData.get('issueDate'),
        expiryDate: formData.get('expiryDate'),
        fileName: file.name,
    });

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { name, type, referenceNumber, issuingBody, issueDate, expiryDate, fileName } = validation.data;
    
    const bucket = adminStorage.bucket();
    const storagePath = `projects/${projectId}/legal/licenses/${uuidv4()}-${fileName}`;
    const fileUpload = bucket.file(storagePath);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { saveFileAndGetDownloadUrl } = await import('@/lib/storage-helper');
    const fileUrl = await saveFileAndGetDownloadUrl(fileUpload, buffer, file.type);

    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const authorDisplayName = userDoc.exists ? userDoc.data()?.displayName : 'Utilizador Desconhecido';

    const newLicenseData = {
        name,
        type,
        referenceNumber,
        issuingBody,
        issueDate: issueDate ? admin.firestore.Timestamp.fromDate(new Date(issueDate)) : null,
        expiryDate: admin.firestore.Timestamp.fromDate(new Date(expiryDate)),
        fileUrl,
        fileName,
        author: {
            uid: decodedToken.uid,
            displayName: authorDisplayName,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const licenseRef = await adminDb.collection('projects').doc(projectId).collection('licenses').add(newLicenseData);

    return NextResponse.json({ success: true, id: licenseRef.id }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao adicionar licença:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
