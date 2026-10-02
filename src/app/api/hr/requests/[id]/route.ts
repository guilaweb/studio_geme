import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyServerHrAuth } from '@/lib/server-hr-auth';
import { z } from 'zod';

const updateActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'cancel']),
  comment: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyServerHrAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const adminApp = getAdminApp();
    if (!adminApp) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 500 });
    const adminDb = getAdminDb() || admin.firestore(adminApp);

    const docRef = adminDb.collection('hrRequests').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    const requestData = docSnap.data()!;
    const body = await req.json();
    const { action, comment } = updateActionSchema.parse(body);

    const now = new Date().toISOString();
    let newStatus = requestData.status;
    let historyAction = '';
    let actorRole = 'Colaborador';

    // 1. CANCELAR (apenas o próprio colaborador enquanto pendente)
    if (action === 'cancel') {
      if (requestData.employeeUid !== user.uid && !user.isAdmin) {
        return NextResponse.json({ error: 'Apenas o requerente pode cancelar a solicitação.' }, { status: 403 });
      }
      if (requestData.status === 'Aprovado') {
        return NextResponse.json({ error: 'Não é possível cancelar uma solicitação já aprovada.' }, { status: 400 });
      }
      newStatus = 'Cancelado';
      historyAction = 'Cancelamento';
      actorRole = 'Colaborador';
    } 
    // 2. REJEITAR
    else if (action === 'reject') {
      const canReject = 
        user.isAdmin || 
        user.isHrManager || 
        (user.isManager && requestData.managerUid === user.uid);

      if (!canReject) {
        return NextResponse.json({ error: 'Sem permissão para rejeitar esta solicitação.' }, { status: 403 });
      }

      newStatus = 'Rejeitado';
      historyAction = 'Rejeição';
      actorRole = user.isHrManager ? 'Gestor de RH' : (user.isAdmin ? 'Administrador' : 'Gestor de Equipa');
    }
    // 3. APROVAR
    else if (action === 'approve') {
      // Se estiver pendente do Gestor
      if (requestData.status === 'Pendente Gestor') {
        const canApproveAsManager = 
          user.isAdmin || 
          user.isHrManager || 
          (user.isManager && requestData.managerUid === user.uid);

        if (!canApproveAsManager) {
          return NextResponse.json({ error: 'Sem permissão para emitir parecer de chefia.' }, { status: 403 });
        }

        // Se quem aprovou for RH/Admin, pode aprovar definitivamente logo, ou avançar para RH
        if (user.isHrManager || user.isAdmin) {
          newStatus = 'Aprovado';
          historyAction = 'Aprovação Final Direta (RH/Admin)';
          actorRole = user.isHrManager ? 'Gestor de RH' : 'Administrador';
        } else {
          newStatus = 'Pendente RH';
          historyAction = 'Parecer Favorável da Chefia';
          actorRole = 'Gestor de Equipa';
        }
      } 
      // Se estiver pendente de RH
      else if (requestData.status === 'Pendente RH') {
        if (!user.isHrManager && !user.isAdmin) {
          return NextResponse.json({ error: 'Apenas o departamento de RH ou Administrador podem conceder aprovação final.' }, { status: 403 });
        }
        newStatus = 'Aprovado';
        historyAction = 'Aprovação Final (RH)';
        actorRole = user.isHrManager ? 'Gestor de RH' : 'Administrador';
      } else {
        return NextResponse.json({ error: `Solicitação já se encontra no estado "${requestData.status}".` }, { status: 400 });
      }
    }

    const historyItem = {
      action: historyAction,
      actorUid: user.uid,
      actorName: user.displayName,
      actorRole,
      timestamp: now,
      comment: comment || (action === 'approve' ? 'Solicitação aprovada.' : action === 'reject' ? 'Solicitação rejeitada.' : 'Cancelada pelo colaborador.'),
    };

    const updatePayload: any = {
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
      history: FieldValue.arrayUnion(historyItem),
    };

    if (action === 'approve' && requestData.status === 'Pendente Gestor' && newStatus === 'Pendente RH') {
      updatePayload.managerApproval = {
        decision: 'approved',
        decidedBy: user.uid,
        decidedByName: user.displayName,
        decidedAt: now,
        comment: comment || '',
      };
    } else if (action === 'approve' && newStatus === 'Aprovado') {
      updatePayload.hrApproval = {
        decision: 'approved',
        decidedBy: user.uid,
        decidedByName: user.displayName,
        decidedAt: now,
        comment: comment || '',
      };
    }

    await docRef.update(updatePayload);

    return NextResponse.json({
      success: true,
      id,
      previousStatus: requestData.status,
      newStatus,
      message: `Solicitação ${newStatus.toLowerCase()} com sucesso.`,
    });
  } catch (err: any) {
    console.error('Error updating HR request:', err);
    return NextResponse.json({ error: 'Erro ao processar solicitação', details: err?.message }, { status: 400 });
  }
}
