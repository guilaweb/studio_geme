
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { type LeadStatus } from '@/types/crm';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const leadUpdateSchema = z.object({
  status: z.enum(['Novo', 'Contactado', 'Qualificado', 'Não Qualificado']),
});


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const leadId = (await params).id;
  
  try {
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK não inicializado.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(idToken);
    
    const body = await req.json();
    const validation = leadUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const leadRef = adminDb.collection('leads').doc(leadId);
    
    const docSnap = await leadRef.get();
    if (!docSnap.exists) {
        return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
    }

    await leadRef.update(validation.data);

    return NextResponse.json({ success: true, message: 'Estado do Lead atualizado com sucesso.' });

  } catch (error: any) {
    console.error(`Error updating lead ${leadId}:`, error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const leadId = (await params).id;
  
  try {
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin SDK não inicializado.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(idToken);
    
    const leadRef = adminDb.collection('leads').doc(leadId);
    
    const docSnap = await leadRef.get();
    if (!docSnap.exists) {
        return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
    }

    await leadRef.delete();

    return NextResponse.json({ success: true, message: 'Lead eliminado com sucesso.' });

  } catch (error: any) {
    console.error(`Error deleting lead ${leadId}:`, error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
