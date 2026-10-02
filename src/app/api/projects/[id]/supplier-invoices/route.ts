
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { UserRole } from '@/app/projects/[id]/page';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
let adminStorage: admin.storage.Storage | undefined;

if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
    adminStorage = admin.storage(adminApp);
}

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Número da fatura é obrigatório'),
  supplierId: z.string().min(1, 'Fornecedor é obrigatório'),
  invoiceDate: z.string().datetime('Data da fatura inválida'),
  dueDate: z.string().datetime('Data de vencimento inválida').optional(),
  totalAmount: z.string().min(1, 'Valor total é obrigatório'),
  purchaseOrderIds: z.array(z.string()).optional(),
  fileName: z.string().min(1, 'Nome do ficheiro é obrigatório'),
  wbsItemId: z.string().optional(),
  wbsItemName: z.string().optional(),
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
    const isOwner = projectDoc.data()?.ownerId === decodedToken.uid;
    let isAuthorized = false;
    if (isOwner) {
        isAuthorized = true;
    } else {
        const teamMemberDoc = await projectRef.collection('team').doc(decodedToken.uid).get();
        if (teamMemberDoc.exists) {
            const role = teamMemberDoc.data()?.role;
            if (role === 'Gestor' || role === 'Editor') {
                isAuthorized = true;
            }
        }
    }
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem registar faturas.' }, { status: 403 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'Ficheiro da fatura em falta.' }, { status: 400 });
    }

    const validation = invoiceSchema.safeParse({
        invoiceNumber: formData.get('invoiceNumber'),
        supplierId: formData.get('supplierId'),
        invoiceDate: formData.get('invoiceDate'),
        dueDate: formData.get('dueDate'),
        totalAmount: formData.get('totalAmount'),
        purchaseOrderIds: formData.getAll('purchaseOrderIds[]'),
        fileName: file.name,
        wbsItemId: formData.get('wbsItemId') || undefined,
        wbsItemName: formData.get('wbsItemName') || undefined,
    });

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { invoiceNumber, supplierId, invoiceDate, dueDate, totalAmount, purchaseOrderIds, fileName, wbsItemId, wbsItemName } = validation.data;
    
    // 1. Upload file to storage
    const bucket = adminStorage.bucket();
    const storagePath = `projects/${projectId}/supplier-invoices/${uuidv4()}-${fileName}`;
    const fileUpload = bucket.file(storagePath);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { saveFileAndGetDownloadUrl } = await import('@/lib/storage-helper');
    const fileUrl = await saveFileAndGetDownloadUrl(fileUpload, buffer, file.type);

    // 2. Prepare data for Firestore and start a batch
    const batch = adminDb.batch();
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const authorDisplayName = userDoc.data()?.displayName || 'Utilizador Desconhecido';

    const newInvoiceRef = adminDb.collection('projects').doc(projectId).collection('supplierInvoices').doc();
    const newInvoiceData = {
        invoiceNumber,
        supplierId,
        invoiceDate: admin.firestore.Timestamp.fromDate(new Date(invoiceDate)),
        dueDate: dueDate ? admin.firestore.Timestamp.fromDate(new Date(dueDate)) : null,
        totalAmount: parseFloat(totalAmount),
        purchaseOrderIds: purchaseOrderIds || [],
        status: 'Pendente',
        fileUrl,
        fileName,
        wbsItemId: wbsItemId || null,
        wbsItemName: wbsItemName || null,
        author: {
            uid: decodedToken.uid,
            displayName: authorDisplayName,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    batch.set(newInvoiceRef, newInvoiceData);

    // 3. Create a corresponding financial transaction
    const transactionRef = adminDb.collection('projects').doc(projectId).collection('transactions').doc();
    const supplier = await adminDb.doc(`projects/${projectId}/suppliers/${supplierId}`).get();
    
    batch.set(transactionRef, {
        description: `Fatura Fornecedor: ${supplier.data()?.name || ''} - ${invoiceNumber}`,
        amount: parseFloat(totalAmount),
        date: admin.firestore.Timestamp.fromDate(new Date(invoiceDate)),
        type: 'Despesa',
        status: 'Pendente',
        accountId: 'supplier-invoices', // A default account for supplier invoices
        accountName: 'Faturas de Fornecedores',
        supplierInvoiceId: newInvoiceRef.id,
        wbsItemId: wbsItemId || null,
        wbsItemName: wbsItemName || null,
        author: {
            uid: decodedToken.uid,
            displayName: authorDisplayName
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. Commit batch
    await batch.commit();

    return NextResponse.json({ success: true, id: newInvoiceRef.id }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao registar fatura de fornecedor:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
