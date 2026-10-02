import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { buildEarlyWarningSummary } from '@/lib/engines/early-warning-engine';
import type { Equipment, EquipmentUsageLog } from '@/types/equipment';
import type { WbsItem } from '@/types/wbs';
import type { LicensePermit, InsurancePolicy } from '@/types/legal';
import type { Concession } from '@/types/mining';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;

if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        if (!adminDb) {
            throw new Error('Firebase Admin SDK não inicializado.');
        }

        // 1. Carregar Equipamentos e Logs de Uso
        const [equipmentSnap, usageLogsSnap, wbsSnap, licensesSnap, insurancesSnap, concessionsSnap] = await Promise.all([
            adminDb.collection('projects').doc(projectId).collection('equipment').get(),
            adminDb.collection('projects').doc(projectId).collection('equipmentUsageLogs').get(),
            adminDb.collection('projects').doc(projectId).collection('wbs').get(),
            adminDb.collection('projects').doc(projectId).collection('licenses').get(),
            adminDb.collection('projects').doc(projectId).collection('insurances').get(),
            adminDb.collection('projects').doc(projectId).collection('concessions').get(),
        ]);

        const equipmentList = equipmentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment));
        const usageLogs = usageLogsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EquipmentUsageLog));
        const wbsItems = wbsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WbsItem));
        const licenses = licensesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LicensePermit));
        const insurances = insurancesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InsurancePolicy));
        const concessions = concessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Concession));

        // Executar o motor de Early Warning
        const summary = buildEarlyWarningSummary(
            equipmentList,
            usageLogs,
            wbsItems,
            licenses,
            insurances,
            concessions
        );

        return NextResponse.json({ summary });
    } catch (error: any) {
        console.error('Erro ao executar motor Early Warning:', error);
        return NextResponse.json({ error: 'Erro interno ao processar motor preditivo.' }, { status: 500 });
    }
}
