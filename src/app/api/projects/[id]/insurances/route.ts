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

const insuranceSchema = z.object({
  type: z.enum(['Responsabilidade Civil', 'Acidentes de Trabalho', 'Equipamentos', 'Automóvel', 'Construção (All Risks)', 'Outro']),
  policyNumber: z.string().min(1),
  insurer: z.string().min(1),
  coverageAmount: z.string(), // Received as string from FormData
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime(),
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
        return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem adicionar apólices.' }, { status: 403 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'Ficheiro em falta.' }, { status: 400 });
    }

    const validation = insuranceSchema.safeParse({
        type: formData.get('type'),
        policyNumber: formData.get('policyNumber'),
        insurer: formData.get('insurer'),
        coverageAmount: formData.get('coverageAmount'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        fileName: file.name,
    });

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { type, policyNumber, insurer, coverageAmount, startDate, endDate, fileName } = validation.data;
    
    // 3. Upload file to storage
    const bucket = adminStorage.bucket();
    const storagePath = `projects/${projectId}/legal/policies/${uuidv4()}-${fileName}`;
    const fileUpload = bucket.file(storagePath);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { saveFileAndGetDownloadUrl } = await import('@/lib/storage-helper');
    const fileUrl = await saveFileAndGetDownloadUrl(fileUpload, buffer, file.type);


    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const authorDisplayName = userDoc.exists ? userDoc.data()?.displayName : 'Utilizador Desconhecido';

    const newPolicyData = {
        type,
        policyNumber,
        insurer,
        coverageAmount: parseFloat(coverageAmount),
        startDate: startDate ? admin.firestore.Timestamp.fromDate(new Date(startDate)) : null,
        endDate: admin.firestore.Timestamp.fromDate(new Date(endDate)),
        fileUrl,
        fileName,
        author: {
            uid: decodedToken.uid,
            displayName: authorDisplayName,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const policyRef = await adminDb.collection('projects').doc(projectId).collection('insurancePolicies').add(newPolicyData);

    return NextResponse.json({ success: true, id: policyRef.id }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao adicionar apólice:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
