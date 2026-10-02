import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { addYears } from 'date-fns';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
let adminStorage: admin.storage.Storage | undefined;

if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
    adminStorage = admin.storage(adminApp);
}

const warrantySchema = z.object({
  itemDescription: z.string().min(1, 'Descrição é obrigatória'),
  supplierId: z.string().min(1, 'Fornecedor é obrigatório'),
  startDate: z.string().datetime(),
  durationYears: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: "Duração deve ser um número positivo" }),
  fileName: z.string().min(1, "O nome do ficheiro é obrigatório"),
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
    
    // Authorization Check: User must have editor or manager role
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }
    const teamMemberDoc = await projectRef.collection('team').doc(decodedToken.uid).get();
    const isOwner = projectDoc.data()?.ownerId === decodedToken.uid;
    const role = teamMemberDoc.data()?.role;

    if (!isOwner && role !== 'Gestor' && role !== 'Editor') {
        return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem adicionar garantias.' }, { status: 403 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'Ficheiro do certificado em falta.' }, { status: 400 });
    }

    const validation = warrantySchema.safeParse({
        itemDescription: formData.get('itemDescription'),
        supplierId: formData.get('supplierId'),
        startDate: formData.get('startDate'),
        durationYears: formData.get('durationYears'),
        fileName: file.name,
    });

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { itemDescription, supplierId, startDate, durationYears, fileName } = validation.data;
    
    const bucket = adminStorage.bucket();
    const storagePath = `projects/${projectId}/warranties/${uuidv4()}-${fileName}`;
    const fileUpload = bucket.file(storagePath);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { saveFileAndGetDownloadUrl } = await import('@/lib/storage-helper');
    const fileUrl = await saveFileAndGetDownloadUrl(fileUpload, buffer, file.type);

    const supplierDoc = await adminDb.collection('projects').doc(projectId).collection('suppliers').doc(supplierId).get();
    if (!supplierDoc.exists) {
        return NextResponse.json({ error: 'Fornecedor não encontrado.' }, { status: 404 });
    }
    
    const startDateObj = new Date(startDate);
    const duration = parseFloat(durationYears);
    const endDateObj = addYears(startDateObj, duration);

    const newWarrantyData = {
        itemDescription,
        supplierId,
        supplierName: supplierDoc.data()?.name || 'Desconhecido',
        startDate: admin.firestore.Timestamp.fromDate(startDateObj),
        endDate: admin.firestore.Timestamp.fromDate(endDateObj),
        durationYears: duration,
        certificateUrl: fileUrl,
        certificateName: fileName,
        author: {
            uid: decodedToken.uid,
            displayName: decodedToken.name || 'Utilizador',
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const warrantyRef = await adminDb.collection('projects').doc(projectId).collection('warranties').add(newWarrantyData);

    return NextResponse.json({ success: true, id: warrantyRef.id }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao adicionar garantia:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
