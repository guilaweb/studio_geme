import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyServerHrAuth } from '@/lib/server-hr-auth';
import { ORGANIZATION_DEPARTMENTS } from '@/types/team';
import { z } from 'zod';

const departmentSchema = z.object({
  name: z.string().min(2, 'Nome do departamento obrigatório'),
  code: z.string().min(2, 'Código obrigatório').max(10),
  managerUid: z.string().optional().nullable(),
  managerName: z.string().optional().nullable(),
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

    let snap: admin.firestore.QuerySnapshot;
    try {
      snap = await adminDb.collection('hrDepartments').get();
    } catch (e: any) {
      console.warn('Could not read hrDepartments collection:', e);
      snap = { empty: true, docs: [] } as any;
    }

    // Se a coleção ainda estiver vazia, pré-inicializar e devolver os departamentos padrão
    if (snap.empty) {
      const initialDeps = ORGANIZATION_DEPARTMENTS.map(name => {
        const code = name.substring(0, 3).toUpperCase();
        return {
          name,
          code,
          managerUid: null,
          managerName: null,
          description: `Departamento de ${name} da organização.`,
          memberCount: 0,
        };
      });

      // Tentar persistir em background sem bloquear ou quebrar a resposta
      try {
        const batch = adminDb.batch();
        initialDeps.forEach(dep => {
          const docRef = adminDb.collection('hrDepartments').doc();
          batch.set(docRef, {
            ...dep,
            createdAt: FieldValue.serverTimestamp(),
          });
        });
        batch.commit().catch(err => console.warn('Background seed of departments failed:', err));
      } catch (seedErr) {
        console.warn('Error during batch set for hrDepartments:', seedErr);
      }

      return NextResponse.json({
        departments: initialDeps.map((d, index) => ({ id: `dept-${index + 1}`, ...d }))
      });
    }

    // Contar membros por departamento a partir da coleção users com tratamento seguro
    const countByDept: Record<string, number> = {};
    try {
      const usersSnap = await adminDb.collection('users').get();
      usersSnap.docs.forEach(d => {
        const dept = d.data().department;
        if (dept) {
          countByDept[dept] = (countByDept[dept] || 0) + 1;
        }
      });
    } catch (usersErr) {
      console.warn('Could not count users by department:', usersErr);
    }

    const departments = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        memberCount: countByDept[data.name] || data.memberCount || 0,
      };
    }).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    return NextResponse.json({ departments });
  } catch (err: any) {
    console.error('Error fetching HR departments:', err);
    return NextResponse.json({ error: 'Erro ao carregar departamentos', details: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyServerHrAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.isHrManager && !user.isAdmin) {
      return NextResponse.json({ error: 'Apenas Gestores de RH e Administradores podem criar departamentos.' }, { status: 403 });
    }

    const adminApp = getAdminApp();
    if (!adminApp) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 500 });
    const adminDb = getAdminDb() || admin.firestore(adminApp);

    const body = await req.json();
    const parsed = departmentSchema.parse(body);

    const docRef = await adminDb.collection('hrDepartments').add({
      ...parsed,
      memberCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: {
        uid: user.uid,
        name: user.displayName,
      },
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
      department: { id: docRef.id, ...parsed },
    });
  } catch (err: any) {
    console.error('Error creating HR department:', err);
    return NextResponse.json({ error: 'Erro ao criar departamento', details: err?.message }, { status: 400 });
  }
}
