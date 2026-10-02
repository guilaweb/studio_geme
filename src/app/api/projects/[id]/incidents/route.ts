
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { type IncidentType, type IncidentSeverity, type UserRole } from '@/types/hseq';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const incidentSchema = z.object({
  date: z.string().datetime(),
  type: z.enum(["Acidente de Trabalho", "Incidente Ambiental", "Quase Acidente", "Condição Insegura", "Ato Inseguro"]),
  severity: z.enum(["Baixa", "Média", "Alta", "Crítica"]),
  location: z.string().min(1, 'Localização é obrigatória.'),
  description: z.string().min(1, 'Descrição é obrigatória.'),
  photoUrls: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
  })).optional(),
});


export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const projectId = (await params).id;
  
  try {
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin SDK não inicializado.');
    }

    // 1. Authenticate the request
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
        return NextResponse.json({ error: 'Acesso negado. Apenas editores ou gestores podem registar incidentes.' }, { status: 403 });
    }
    
    // 2. Validate the request body
    const body = await req.json();
    const validation = incidentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { date, type, severity, location, description, photoUrls } = validation.data;
    
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const authorDisplayName = userDoc.exists ? userDoc.data()?.displayName : 'Utilizador Desconhecido';

    const newIncidentData = {
        date: admin.firestore.Timestamp.fromDate(new Date(date)),
        type,
        severity,
        location,
        description,
        photoUrls: photoUrls || [],
        status: 'Aberto',
        author: {
            uid: decodedToken.uid,
            displayName: authorDisplayName,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 3. Save the new incident document
    const incidentRef = await adminDb.collection('projects').doc(projectId).collection('incidents').add(newIncidentData);

    return NextResponse.json({ success: true, id: incidentRef.id }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao registar incidente:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
