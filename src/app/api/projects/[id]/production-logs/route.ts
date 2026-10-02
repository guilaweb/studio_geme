import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import type { UserRole } from '@/app/projects/[id]/page';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const productionLogSchema = z.object({
  date: z.string().datetime(),
  shift: z.enum(['Dia', 'Noite']),
  material: z.string().min(1, "Material é obrigatório"),
  materialType: z.enum(['Minério', 'Estéril', 'Sub-económico']).optional(),
  tonnage: z.number().positive("Tonelagem deve ser um número positivo"),
  wasteTonnage: z.number().nonnegative().optional(),
  oreTonnage: z.number().nonnegative().optional(),
  grade: z.number().nullable().optional(),
  density: z.number().positive().optional(),
  volume: z.number().positive().optional(),
  pitBench: z.string().optional(),
  operationHours: z.number().positive("Horas de operação devem ser um número positivo").optional(),
  sourceLocation: z.string().min(1, "Origem é obrigatória"),
  destination: z.string().min(1, "Destino é obrigatório"),
  notes: z.string().optional(),
  wbsItemId: z.string().nullable().optional(),
  wbsItemName: z.string().nullable().optional(),
  team: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  equipment: z.array(z.object({ 
    id: z.string(), 
    name: z.string(),
    equipmentId: z.string(),
  })).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const projectId = (await params).id;
  
  try {
    if (!adminAuth || !adminDb) {
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
            if (role === 'Gestor' || role === 'Editor' || role === 'Mestre de Obra') {
                isAuthorized = true;
            }
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Acesso negado. Requer função de Gestor, Editor ou Mestre de Obra.' }, { status: 403 });
    }

    // 2. Validate request body
    const body = await req.json();
    const validation = productionLogSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }
    
    const { 
        date, 
        shift, 
        material, 
        materialType, 
        tonnage, 
        wasteTonnage, 
        oreTonnage, 
        grade, 
        density, 
        volume, 
        pitBench, 
        operationHours, 
        sourceLocation, 
        destination, 
        notes, 
        wbsItemId, 
        wbsItemName, 
        team, 
        equipment 
    } = validation.data;
    
    const batch = adminDb.batch();

    // 3. Create Production Log
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const authorDisplayName = userDoc.exists ? userDoc.data()?.displayName : 'Utilizador Desconhecido';
    
    const logRef = adminDb.collection('projects').doc(projectId).collection('production-logs').doc();
    const newLogData: Record<string, any> = {
        date: admin.firestore.Timestamp.fromDate(new Date(date)),
        shift,
        material,
        materialType: materialType || (material.toLowerCase().includes('estéril') ? 'Estéril' : 'Minério'),
        tonnage,
        wasteTonnage: wasteTonnage !== undefined ? wasteTonnage : (material.toLowerCase().includes('estéril') ? tonnage : 0),
        oreTonnage: oreTonnage !== undefined ? oreTonnage : (!material.toLowerCase().includes('estéril') ? tonnage : 0),
        sourceLocation,
        destination,
        team: team || [],
        equipment: equipment || [],
        wbsItemId: wbsItemId || null,
        wbsItemName: wbsItemName || null,
        author: {
            uid: decodedToken.uid,
            displayName: authorDisplayName,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (grade !== undefined && grade !== null) newLogData.grade = grade;
    if (density !== undefined && density !== null) newLogData.density = density;
    if (volume !== undefined && volume !== null) newLogData.volume = volume;
    if (pitBench) newLogData.pitBench = pitBench;
    if (operationHours !== undefined && operationHours !== null) newLogData.operationHours = operationHours;
    if (notes) newLogData.notes = notes;

    batch.set(logRef, newLogData);
    
    // 4. Update equipment usage hours and create cost transactions
    if (operationHours && equipment && equipment.length > 0) {
        for (const eq of equipment) {
            if (eq.equipmentId) {
                const globalEqRef = adminDb.collection('equipment').doc(eq.equipmentId);
                
                // We must fetch the equipment data to get the cost per hour
                const globalEqDoc = await globalEqRef.get();

                if (globalEqDoc.exists) {
                    const globalEqData = globalEqDoc.data()!;
                    
                    // Increment hours
                    batch.update(globalEqRef, {
                        currentHours: admin.firestore.FieldValue.increment(operationHours)
                    });

                    // Create cost transaction if applicable
                    const operationalCost = (globalEqData.operationalCostPerHour || 0) * operationHours;
                    if (operationalCost > 0) {
                        const transactionRef = adminDb.collection('projects').doc(projectId).collection('transactions').doc();
                        batch.set(transactionRef, {
                            description: `Custo operacional: ${eq.name} (${operationHours}h) - ${material}`,
                            amount: operationalCost,
                            date: admin.firestore.Timestamp.fromDate(new Date(date)),
                            type: 'Despesa',
                            status: 'Pago',
                            accountId: 'equipment-costs', // A default account for equipment costs
                            accountName: 'Custos de Equipamentos',
                            wbsItemId: wbsItemId || null,
                            wbsItemName: wbsItemName || null,
                            author: {
                                uid: decodedToken.uid,
                                displayName: authorDisplayName,
                            },
                        });
                    }
                }
            }
        }
    }

    // 5. Commit the batch
    await batch.commit();

    return NextResponse.json({ success: true, id: logRef.id }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao registar produção:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
