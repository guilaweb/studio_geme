import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyServerHrAuth } from '@/lib/server-hr-auth';
import { z } from 'zod';

const teamSchema = z.object({
  name: z.string().min(2, 'Nome da equipa obrigatório'),
  departmentId: z.string().min(1, 'Departamento obrigatório'),
  departmentName: z.string().min(1, 'Nome do departamento obrigatório'),
  leaderUid: z.string().optional().nullable(),
  leaderName: z.string().optional().nullable(),
  memberUids: z.array(z.string()).default([]),
  description: z.string().optional().default(''),
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

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');
    const myTeamsOnly = searchParams.get('myTeams') === 'true';

    let query: admin.firestore.Query = adminDb.collection('hrTeams');
    if (departmentId) {
      query = query.where('departmentId', '==', departmentId);
    }

    const snap = await query.orderBy('name', 'asc').get();
    let teams = snap.docs.map(d => {
      const data = d.data();
      const memberUids: string[] = data.memberUids || [];
      return {
        id: d.id,
        ...data,
        memberUids,
        memberCount: memberUids.length,
      } as any;
    });

    if (myTeamsOnly) {
      teams = teams.filter(t => t.leaderUid === user.uid || t.memberUids.includes(user.uid));
    }

    return NextResponse.json({ teams });
  } catch (err: any) {
    console.error('Error fetching HR teams:', err);
    return NextResponse.json({ error: 'Erro ao carregar equipas', details: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyServerHrAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.isHrManager && !user.isAdmin) {
      return NextResponse.json({ error: 'Apenas Gestores de RH e Administradores podem criar equipas.' }, { status: 403 });
    }

    const adminApp = getAdminApp();
    if (!adminApp) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 500 });
    const adminDb = getAdminDb() || admin.firestore(adminApp);

    const body = await req.json();
    const parsed = teamSchema.parse(body);

    const docRef = await adminDb.collection('hrTeams').add({
      ...parsed,
      memberCount: parsed.memberUids.length,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: {
        uid: user.uid,
        name: user.displayName,
      },
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
      team: { id: docRef.id, ...parsed, memberCount: parsed.memberUids.length },
    });
  } catch (err: any) {
    console.error('Error creating HR team:', err);
    return NextResponse.json({ error: 'Erro ao criar equipa', details: err?.message }, { status: 400 });
  }
}
