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

const energyLogSchema = z.object({
  date: z.string().datetime(),
  assetId: z.string().min(1, "O ativo é obrigatório"),
  assetName: z.string().min(1, "O nome do ativo é obrigatório"),
  assetType: z.enum([
    'Solar Fotovoltaico', 
    'Gerador Diesel', 
    'Híbrido Solar-Diesel', 
    'Hídrico / PCH', 
    'Eólico', 
    'Bateria / BESS', 
    'Rede / Subestação'
  ]).optional(),
  productionKWh: z.number().positive("A produção deve ser um número positivo"),
  initialMeterReading: z.number().min(0).optional(),
  finalMeterReading: z.number().min(0).optional(),
  operationalHours: z.number().positive("As horas de operação devem ser um número positivo"),
  downtimeHours: z.number().min(0).optional(),
  downtimeReason: z.string().optional(),
  fuelConsumedLiters: z.number().min(0).optional(),
  notes: z.string().optional(),
  wbsItemId: z.string().nullable().optional(),
  wbsItemName: z.string().nullable().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const projectId = (await params).id;
  
  try {
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin SDK não inicializado.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Authorization Check
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
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = energyLogSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }
    
    const { 
        date, 
        assetId, 
        assetName, 
        assetType,
        productionKWh, 
        initialMeterReading,
        finalMeterReading,
        operationalHours, 
        downtimeHours, 
        downtimeReason,
        fuelConsumedLiters,
        notes,
        wbsItemId,
        wbsItemName
    } = validation.data;
    
    const batch = adminDb.batch();

    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const authorDisplayName = userDoc.exists ? userDoc.data()?.displayName : 'Utilizador Desconhecido';
    
    // Check asset data in equipment
    const globalEqRef = adminDb.collection('equipment').doc(assetId);
    const globalEqDoc = await globalEqRef.get();

    let assetCostPerHour = 0;
    if (globalEqDoc.exists) {
        const globalEqData = globalEqDoc.data()!;
        assetCostPerHour = globalEqData.operationalCostPerHour || 0;
        
        // Increment hours on asset
        batch.update(globalEqRef, {
            currentHours: admin.firestore.FieldValue.increment(operationalHours)
        });
    }

    // Cost calculations
    const equipmentOperationalCost = assetCostPerHour * operationalHours;
    // Preço médio referencial de gasóleo em Angola (300 Kz / litro)
    const fuelCost = (fuelConsumedLiters || 0) * 300;
    const totalOperationalCost = equipmentOperationalCost + fuelCost;
    const costPerKWh = productionKWh > 0 ? totalOperationalCost / productionKWh : 0;
    const efficiencyKWhPerHour = operationalHours > 0 ? productionKWh / operationalHours : 0;

    // CO2 avoided if renewable (approx. 0.45 kg CO2/kWh for solar/hydro/wind vs thermal)
    const isRenewable = assetType === 'Solar Fotovoltaico' || assetType === 'Hídrico / PCH' || assetType === 'Eólico';
    const co2AvoidedKg = isRenewable ? productionKWh * 0.45 : undefined;

    const logRef = adminDb.collection('projects').doc(projectId).collection('energy-logs').doc();
    const newLogData: Record<string, any> = {
        date: admin.firestore.Timestamp.fromDate(new Date(date)),
        assetId,
        assetName,
        productionKWh,
        operationalHours,
        downtimeHours: downtimeHours || 0,
        efficiencyKWhPerHour,
        costAOA: totalOperationalCost,
        costPerKWh,
        wbsItemId: wbsItemId || null,
        wbsItemName: wbsItemName || null,
        notes: notes || '',
        author: {
            uid: decodedToken.uid,
            displayName: authorDisplayName,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (assetType) newLogData.assetType = assetType;
    if (initialMeterReading !== undefined) newLogData.initialMeterReading = initialMeterReading;
    if (finalMeterReading !== undefined) newLogData.finalMeterReading = finalMeterReading;
    if (downtimeReason) newLogData.downtimeReason = downtimeReason;
    if (fuelConsumedLiters !== undefined) newLogData.fuelConsumedLiters = fuelConsumedLiters;
    if (co2AvoidedKg !== undefined) newLogData.co2AvoidedKg = co2AvoidedKg;

    batch.set(logRef, newLogData);
    
    // Automatic operational cost transaction in project finances
    if (totalOperationalCost > 0) {
        const transactionRef = adminDb.collection('projects').doc(projectId).collection('transactions').doc();
        batch.set(transactionRef, {
            description: `Custo operacional energia: ${assetName} (${operationalHours}h - ${productionKWh.toLocaleString('pt-AO')} kWh)`,
            amount: totalOperationalCost,
            date: admin.firestore.Timestamp.fromDate(new Date(date)),
            type: 'Despesa',
            status: 'Pago',
            accountId: 'energy-costs',
            accountName: 'Custos de Energia',
            wbsItemId: wbsItemId || null,
            wbsItemName: wbsItemName || null,
            author: { uid: decodedToken.uid, displayName: authorDisplayName },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    await batch.commit();

    return NextResponse.json({ success: true, id: logRef.id }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao registar produção de energia:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
