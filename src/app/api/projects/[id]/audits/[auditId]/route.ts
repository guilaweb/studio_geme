
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { type AuditStatus, type AuditFinding, type AuditFindingSeverity, type UserRole } from '@/types/hseq';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const updateStatusSchema = z.object({
  status: z.enum(['Agendada', 'Em Andamento', 'Concluída']),
});

const addFindingSchema = z.object({
  description: z.string().min(1),
  severity: z.enum(['Crítica', 'Major', 'Menor', 'Oportunidade de Melhoria']),
  isResolved: z.boolean(),
  createdAt: z.string().datetime(),
});

const updateFindingSchema = z.object({
  findingId: z.string().min(1),
  isResolved: z.boolean().optional(),
  actionItems: z.array(z.any()).optional(),
});


// Add a new finding to an audit
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string, auditId: string }> }) {
  const { id: projectId, auditId } = await params;
  
  try {
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK não inicializado.');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Authorization check
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

    const body = await req.json();
    const validation = addFindingSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });

    const newFinding = {
        id: crypto.randomUUID(),
        ...validation.data
    };
    
    const auditRef = adminDb.collection('projects').doc(projectId).collection('audits').doc(auditId);
    
    await auditRef.update({
        findings: admin.firestore.FieldValue.arrayUnion(newFinding)
    });

    return NextResponse.json({ success: true, id: newFinding.id });

  } catch (error: any) {
    console.error('Erro ao adicionar achado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// Update the main status of an audit
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string, auditId: string }> }) {
  const { id: projectId, auditId } = await params;
  
  try {
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK não inicializado.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Authorization check
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
    
    const body = await req.json();
    const validation = updateStatusSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });

    const auditRef = adminDb.collection('projects').doc(projectId).collection('audits').doc(auditId);
    
    await auditRef.update({
        status: validation.data.status
    });

    return NextResponse.json({ success: true, message: 'Estado da auditoria atualizado.' });

  } catch (error: any) {
    console.error('Erro ao atualizar estado da auditoria:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// Update a specific finding within an audit (e.g., mark as resolved or update action items)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string, auditId: string }> }) {
    const { id: projectId, auditId } = await params;

    try {
        if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK não inicializado.');

        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        
        // Authorization check
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
        
        const body = await req.json();
        const validation = updateFindingSchema.safeParse(body);
        if (!validation.success) return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
        
        const { findingId, isResolved, actionItems } = validation.data;
        
        const auditRef = adminDb.collection('projects').doc(projectId).collection('audits').doc(auditId);
        const auditDoc = await auditRef.get();

        if (!auditDoc.exists) {
            return NextResponse.json({ error: 'Auditoria não encontrada.' }, { status: 404 });
        }
        
        const currentFindings = auditDoc.data()?.findings || [];
        const updatedFindings = currentFindings.map((finding: AuditFinding) => {
            if (finding.id === findingId) {
                const updatedFinding = { ...finding };
                if (isResolved !== undefined) {
                    updatedFinding.isResolved = isResolved;
                }
                if (actionItems !== undefined) {
                    updatedFinding.actionItems = actionItems;
                }
                return updatedFinding;
            }
            return finding;
        });


        await auditRef.update({ findings: updatedFindings });

        return NextResponse.json({ success: true, message: 'Estado do achado atualizado.' });

    } catch (error: any) {
        console.error('Erro ao atualizar achado:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
