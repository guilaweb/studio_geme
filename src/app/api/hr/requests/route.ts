import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyServerHrAuth } from '@/lib/server-hr-auth';
import { z } from 'zod';

const createRequestSchema = z.object({
  type: z.enum([
    'Férias',
    'Licença Médica',
    'Falta Justificada',
    'Falta Injustificada',
    'Maternidade / Paternidade',
    'Luto',
    'Casamento',
    'Formação',
    'Outro'
  ]),
  category: z.enum(['vacation', 'absence', 'document', 'other']).default('vacation'),
  startDate: z.string().min(1, 'Data de início obrigatória'),
  endDate: z.string().min(1, 'Data de término obrigatória'),
  daysCount: z.number().min(0.5, 'Contagem mínima de 0.5 dias'),
  reason: z.string().min(3, 'Justificação ou motivo obrigatório'),
  attachmentUrl: z.string().optional().nullable(),
  attachmentName: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  teamName: z.string().optional().nullable(),
  managerUid: z.string().optional().nullable(),
  managerName: z.string().optional().nullable(),
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
    const filterStatus = searchParams.get('status');
    const filterType = searchParams.get('type');

    let query: admin.firestore.Query = adminDb.collection('hrRequests');

    // Controlo de autorização rigoroso no backend
    if (user.isHrManager || user.isDirector || user.isAdmin) {
      // RH / Directores / Admins podem consultar todos os pedidos da organização
      if (filterStatus) query = query.where('status', '==', filterStatus);
      if (filterType) query = query.where('type', '==', filterType);
    } else if (user.isManager) {
      // Gestores consultam pedidos da sua equipa OU os seus próprios
      // Devido às limitações de disjunção do Firestore, consultamos por managerUid e unimos aos próprios
      const managedSnap = await adminDb.collection('hrRequests')
        .where('managerUid', '==', user.uid)
        .get();
      const ownSnap = await adminDb.collection('hrRequests')
        .where('employeeUid', '==', user.uid)
        .get();

      const map = new Map<string, any>();
      managedSnap.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
      ownSnap.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));

      const list = Array.from(map.values()).sort((a, b) => {
        const timeA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      return NextResponse.json({ requests: list });
    } else {
      // Colaborador comum consulta EXCLUSIVAMENTE os seus próprios pedidos
      query = query.where('employeeUid', '==', user.uid);
    }

    // Ordenação em memória para não exigir índices compostos no Firestore
    const snap = await query.limit(200).get();
    const requests = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

    return NextResponse.json({ requests });
  } catch (err: any) {
    console.error('Error fetching HR requests:', err);
    return NextResponse.json({ error: 'Erro ao carregar pedidos de RH', details: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyServerHrAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const adminApp = getAdminApp();
    if (!adminApp) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 500 });
    const adminDb = getAdminDb() || admin.firestore(adminApp);

    const body = await req.json();
    const parsed = createRequestSchema.parse(body);

    // Se o colaborador indicou um gestor ou se o utilizador pertence a uma equipa com líder
    let managerUid = parsed.managerUid || null;
    let managerName = parsed.managerName || null;

    if (!managerUid) {
      // Tentar encontrar líder da equipa do utilizador
      const teamsSnap = await adminDb.collection('hrTeams')
        .where('memberUids', 'array-contains', user.uid)
        .limit(1)
        .get();

      if (!teamsSnap.empty) {
        const teamData = teamsSnap.docs[0].data();
        if (teamData.leaderUid && teamData.leaderUid !== user.uid) {
          managerUid = teamData.leaderUid;
          managerName = teamData.leaderName || 'Gestor de Equipa';
        }
      }
    }

    // Estado inicial: se existir gestor de equipa diferente do requerente, vai para "Pendente Gestor", senão "Pendente RH"
    const initialStatus = (managerUid && managerUid !== user.uid) ? 'Pendente Gestor' : 'Pendente RH';

    const now = new Date();
    const newRequestData: any = {
      type: parsed.type,
      category: parsed.type === 'Férias' ? 'vacation' : 'absence',
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      daysCount: parsed.daysCount,
      reason: parsed.reason,
      attachmentUrl: parsed.attachmentUrl || null,
      attachmentName: parsed.attachmentName || null,
      employeeUid: user.uid,
      employeeName: user.displayName,
      employeeEmail: user.email,
      employeeRole: user.jobTitle,
      department: user.department || 'Geral',
      teamId: parsed.teamId || null,
      teamName: parsed.teamName || null,
      managerUid,
      managerName,
      status: initialStatus,
      history: [
        {
          action: 'Submissão',
          actorUid: user.uid,
          actorName: user.displayName,
          actorRole: 'Colaborador',
          timestamp: now.toISOString(),
          comment: `Pedido de ${parsed.type} (${parsed.daysCount} dias) submetido.`,
        }
      ],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('hrRequests').add(newRequestData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      status: initialStatus,
      message: initialStatus === 'Pendente Gestor' 
        ? 'Solicitação enviada ao Gestor de Equipa para parecer.' 
        : 'Solicitação enviada diretamente ao departamento de RH.'
    });
  } catch (err: any) {
    console.error('Error creating HR request:', err);
    return NextResponse.json({ error: 'Erro ao criar solicitação', details: err?.message }, { status: 400 });
  }
}
