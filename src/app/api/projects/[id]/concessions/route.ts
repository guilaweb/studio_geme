
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import type { ConcessionStatus } from '@/types/mining';
import type { UserRole } from '@/app/projects/[id]/page';
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

const concessionSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  licenseNumber: z.string().optional(),
  issuingAuthority: z.string().optional(),
  mineralType: z.string().min(1, "Tipo de minério é obrigatório"),
  province: z.string().min(1, "Província é obrigatória"),
  area: z.string(), // From FormData, it will be a string
  holder: z.string().min(1, "Titular é obrigatório"),
  miningMethod: z.enum(['Céu Aberto', 'Subterrânea', 'Aluvionar', 'Quimberlito']).optional(),
  coordinates: z.string().optional(),
  legalStatus: z.enum(['Ativa', 'Expirada', 'Em Renovação', 'Pendente']),
  validityStart: z.string().datetime(),
  validityEnd: z.string().datetime(),
  fileName: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const projectId = (await params).id;
  
  try {
    if (!adminAuth || !adminDb || !adminStorage) {
      throw new Error('Firebase Admin SDK não inicializado.');
    }

    // 1. Authenticate and Authorize
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
        return NextResponse.json({ error: 'Acesso negado. Requer função de Gestor ou Editor.' }, { status: 403 });
    }

    // 2. Validate request body (FormData)
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
        return NextResponse.json({ error: 'O ficheiro do documento é obrigatório.' }, { status: 400 });
    }

    const validation = concessionSchema.safeParse({
        name: formData.get('name'),
        licenseNumber: formData.get('licenseNumber') || undefined,
        issuingAuthority: formData.get('issuingAuthority') || undefined,
        mineralType: formData.get('mineralType'),
        province: formData.get('province'),
        area: formData.get('area'),
        holder: formData.get('holder'),
        miningMethod: formData.get('miningMethod') || undefined,
        coordinates: formData.get('coordinates') || undefined,
        legalStatus: formData.get('legalStatus'),
        validityStart: formData.get('validityStart'),
        validityEnd: formData.get('validityEnd'),
        fileName: file.name,
    });
    
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }
    
    const { 
        name, 
        licenseNumber, 
        issuingAuthority, 
        mineralType, 
        province, 
        area, 
        holder, 
        miningMethod, 
        coordinates, 
        legalStatus, 
        validityStart, 
        validityEnd, 
        fileName 
    } = validation.data;
    
    // 3. Upload file to storage
    const bucket = adminStorage.bucket();
    const storagePath = `projects/${projectId}/concessions/${uuidv4()}-${fileName}`;
    const fileUpload = bucket.file(storagePath);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { saveFileAndGetDownloadUrl } = await import('@/lib/storage-helper');
    const fileUrl = await saveFileAndGetDownloadUrl(fileUpload, buffer, file.type);
    
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const authorDisplayName = userDoc.exists ? userDoc.data()?.displayName : 'Utilizador Desconhecido';

    const newConcessionData: Record<string, any> = {
        name,
        mineralType,
        province,
        area: parseFloat(area),
        holder,
        legalStatus,
        fileUrl,
        fileName,
        validityStart: admin.firestore.Timestamp.fromDate(new Date(validityStart)),
        validityEnd: admin.firestore.Timestamp.fromDate(new Date(validityEnd)),
        author: {
            uid: decodedToken.uid,
            displayName: authorDisplayName,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (licenseNumber) newConcessionData.licenseNumber = licenseNumber;
    if (issuingAuthority) newConcessionData.issuingAuthority = issuingAuthority;
    if (miningMethod) newConcessionData.miningMethod = miningMethod;
    if (coordinates) newConcessionData.coordinates = coordinates;

    // 4. Save to Firestore
    const concessionRef = await adminDb.collection('projects').doc(projectId).collection('concessions').add(newConcessionData);

    return NextResponse.json({ success: true, id: concessionRef.id }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao registar concessão:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
