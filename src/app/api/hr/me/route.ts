import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { verifyServerHrAuth } from '@/lib/server-hr-auth';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyServerHrAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const adminApp = getAdminApp();
    if (!adminApp) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 500 });
    const adminDb = getAdminDb() || admin.firestore(adminApp);

    // 1. Procurar registo em workforce (por email ou uid)
    let workforceMember: any = null;
    const wfByEmail = await adminDb.collection('workforce').where('contact', '==', user.email).limit(1).get();
    if (!wfByEmail.empty) {
      const doc = wfByEmail.docs[0];
      workforceMember = { id: doc.id, ...doc.data() };
    } else {
      const wfById = await adminDb.collection('workforce').doc(user.uid).get();
      if (wfById.exists) {
        workforceMember = { id: wfById.id, ...wfById.data() };
      }
    }

    // 2. Procurar solicitações do colaborador (sem exigir índice composto)
    const requestsSnap = await adminDb.collection('hrRequests')
      .where('employeeUid', '==', user.uid)
      .limit(50)
      .get();

    const myRequests = requestsSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .sort((a, b) => {
        const timeA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

    // 3. Calcular saldo de férias do ano corrente
    const currentYear = new Date().getFullYear();
    const approvedVacations = myRequests.filter(r => 
      r.type === 'Férias' && 
      r.status === 'Aprovado' && 
      (new Date(r.startDate).getFullYear() === currentYear || r.startDate?.toDate?.()?.getFullYear?.() === currentYear)
    );
    const pendingVacations = myRequests.filter(r => 
      r.type === 'Férias' && 
      (r.status === 'Pendente Gestor' || r.status === 'Pendente RH')
    );

    const daysUsed = approvedVacations.reduce((sum, r) => sum + (Number(r.daysCount) || 0), 0);
    const daysPending = pendingVacations.reduce((sum, r) => sum + (Number(r.daysCount) || 0), 0);
    const totalDaysEntitled = 22; // Direito legal base
    const daysRemaining = Math.max(0, totalDaysEntitled - daysUsed - daysPending);

    // 4. Documentos autorizados do colaborador (de hrDocuments e de workforce.documents)
    let hrDocs: any[] = [];
    try {
      const documentsSnap = await adminDb.collection('hrDocuments')
        .where('employeeUid', '==', user.uid)
        .get();

      hrDocs = documentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (docErr) {
      console.warn('Could not read hrDocuments:', docErr);
    }

    const wfDocs = (workforceMember?.documents || []).map((doc: any, i: number) => ({
      id: doc.id || `wf-doc-${i}`,
      title: doc.name || doc.title || 'Documento Funcional',
      type: doc.type || 'Ficha Cadastral / Certificado',
      url: doc.url || doc.fileUrl || '',
      uploadedAt: doc.uploadDate || doc.expiryDate || new Date().toISOString(),
      visibility: 'employee',
      expiryDate: doc.expiryDate || null,
    }));

    const myDocuments = [...hrDocs, ...wfDocs].sort((a, b) => {
      const timeA = new Date(a.uploadedAt?.toDate?.() || a.uploadedAt || 0).getTime();
      const timeB = new Date(b.uploadedAt?.toDate?.() || b.uploadedAt || 0).getTime();
      return timeB - timeA;
    });

    // 5. Avaliações partilhadas com o colaborador (sem exigir índice composto)
    let myReviews: any[] = [];
    try {
      const reviewsSnap = await adminDb.collection('hrReviews')
        .where('employeeUid', '==', user.uid)
        .where('sharedWithEmployee', '==', true)
        .get();

      myReviews = reviewsSnap.docs.map(d => {
        const data = d.data();
        // Ocultar notas confidenciais de RH do colaborador
        const { confidentialComments, ...publicReview } = data;
        return { id: d.id, ...publicReview };
      }).sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
    } catch (revErr) {
      console.warn('Could not read hrReviews:', revErr);
    }

    // 6. Benefícios corporativos aplicáveis ao colaborador
    const myBenefits = workforceMember?.benefits || [
      { name: 'Seguro de Saúde & Acidentes de Trabalho', status: 'Ativo', provider: 'ENSA Seguros', coverage: 'Cobertura médica nacional e em obra' },
      { name: 'Subsídio de Alimentação', status: 'Ativo', provider: 'Empresa', coverage: 'Cartão de Refeição / Cantina Operacional' },
      { name: 'Transporte Corporativo / Obra', status: 'Ativo', provider: 'Logística', coverage: 'Rotas de transporte e apoio de deslocação' },
      { name: 'Equipamento de Proteção Individual (EPI)', status: 'Atribuído', provider: 'HSEQ', coverage: 'Kit homologado: Capacete, Botas S3, Colete e Óculos' },
    ];

    // 7. Consolidar projetos atribuídos (Utilizador -> Colaborador -> Equipa -> Projectos)
    const assignedProjectsMap = new Map<string, any>();
    for (const p of (user.assignedProjects || [])) {
      if (p.projectId) assignedProjectsMap.set(p.projectId, p);
    }
    if (workforceMember?.currentProjectId && !assignedProjectsMap.has(workforceMember.currentProjectId)) {
      assignedProjectsMap.set(workforceMember.currentProjectId, {
        projectId: workforceMember.currentProjectId,
        projectName: workforceMember.currentProjectName || 'Obra Atribuída',
        projectRole: workforceMember.role || user.jobTitle || 'Membro da Equipa',
        responsibility: 'Alocação Operacional',
      });
    }

    try {
      const teamSnap = await adminDb.collectionGroup('team').where('uid', '==', user.uid).get();
      for (const d of teamSnap.docs) {
        const projRef = d.ref.parent.parent;
        if (projRef && !assignedProjectsMap.has(projRef.id)) {
          const tData = d.data();
          assignedProjectsMap.set(projRef.id, {
            projectId: projRef.id,
            projectName: tData.projectName || null,
            projectRole: tData.role || 'Membro da Equipa',
            responsibility: tData.responsibility || 'Equipa de Obra',
          });
        }
      }
    } catch (_) {}

    const finalProjects = Array.from(assignedProjectsMap.values());
    for (const p of finalProjects) {
      if (!p.projectName && p.projectId) {
        try {
          const pDoc = await adminDb.collection('projects').doc(p.projectId).get();
          if (pDoc.exists) {
            p.projectName = pDoc.data()?.name || `Projeto #${p.projectId.slice(0, 6)}`;
          }
        } catch (_) {}
      }
    }

    return NextResponse.json({
      userProfile: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        jobTitle: user.jobTitle,
        department: user.department,
        role: user.role,
        profileId: user.profileId,
        assignedProjects: finalProjects,
      },
      workforceRecord: workforceMember,
      vacationBalance: {
        year: currentYear,
        totalDaysEntitled,
        daysUsed,
        daysPending,
        daysRemaining,
      },
      myRequests,
      myDocuments,
      myReviews,
      myBenefits,
    });
  } catch (err: any) {
    console.error('Error fetching Meu RH:', err);
    return NextResponse.json({ error: 'Erro ao carregar dados de RH', details: err?.message }, { status: 500 });
  }
}
