import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyServerHrAuth } from '@/lib/server-hr-auth';
import { z } from 'zod';

const createReviewSchema = z.object({
  employeeUid: z.string().min(1, 'Colaborador obrigatório'),
  employeeName: z.string().min(1, 'Nome do colaborador obrigatório'),
  cycleName: z.string().min(1, 'Ciclo avaliativo obrigatório'),
  period: z.string().min(1, 'Período obrigatório'),
  technicalScore: z.number().min(1).max(5),
  behavioralScore: z.number().min(1).max(5),
  safetyScore: z.number().min(1).max(5),
  overallScore: z.number().min(1).max(5),
  strengths: z.string().default(''),
  improvements: z.string().default(''),
  goals: z.string().default(''),
  confidentialComments: z.string().optional().default(''),
  sharedWithEmployee: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const user = await verifyServerHrAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const adminApp = getAdminApp();
    if (!adminApp) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 500 });
    const adminDb = getAdminDb() || admin.firestore(adminApp);

    let query: admin.firestore.Query = adminDb.collection('hrReviews');

    if (user.isHrManager || user.isAdmin || user.isDirector) {
      // RH / Directores / Admin podem ver todas as avaliações
    } else if (user.isManager) {
      // Gestor pode ver avaliações que ele próprio realizou ou as suas partilhadas
      const madeByMeSnap = await adminDb.collection('hrReviews').where('reviewerUid', '==', user.uid).get();
      const forMeSnap = await adminDb.collection('hrReviews').where('employeeUid', '==', user.uid).where('sharedWithEmployee', '==', true).get();
      const map = new Map<string, any>();
      madeByMeSnap.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
      forMeSnap.docs.forEach(d => {
        const data = d.data();
        const { confidentialComments, ...sanitized } = data;
        map.set(d.id, { id: d.id, ...sanitized });
      });
      const list = Array.from(map.values()).sort((a, b) => {
        const timeA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      return NextResponse.json({ reviews: list });
    } else {
      // Colaborador vê apenas as suas avaliações que já foram homologadas e partilhadas com ele
      query = query.where('employeeUid', '==', user.uid).where('sharedWithEmployee', '==', true);
    }

    const snap = await query.limit(100).get();
    const reviews = snap.docs.map(d => {
      const data = d.data();
      // Se não for gestor ou RH, remover notas confidenciais
      if (!user.isHrManager && !user.isAdmin && data.reviewerUid !== user.uid) {
        const { confidentialComments, ...sanitized } = data;
        return { id: d.id, ...sanitized };
      }
      return { id: d.id, ...data };
    }).sort((a: any, b: any) => {
      const timeA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ reviews });
  } catch (err: any) {
    console.error('Error fetching HR reviews:', err);
    return NextResponse.json({ error: 'Erro ao carregar avaliações', details: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyServerHrAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.isManager && !user.isHrManager && !user.isAdmin) {
      return NextResponse.json({ error: 'Apenas Gestores, RH e Administradores podem emitir avaliações de desempenho.' }, { status: 403 });
    }

    const adminApp = getAdminApp();
    if (!adminApp) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 500 });
    const adminDb = getAdminDb() || admin.firestore(adminApp);

    const body = await req.json();
    const parsed = createReviewSchema.parse(body);

    const docRef = await adminDb.collection('hrReviews').add({
      ...parsed,
      reviewerUid: user.uid,
      reviewerName: user.displayName,
      reviewerRole: user.jobTitle || 'Avaliador',
      status: parsed.sharedWithEmployee ? 'Partilhada com Colaborador' : 'Submetida',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Avaliação de desempenho registada com sucesso.',
    });
  } catch (err: any) {
    console.error('Error creating HR review:', err);
    return NextResponse.json({ error: 'Erro ao criar avaliação', details: err?.message }, { status: 400 });
  }
}
