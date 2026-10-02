'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { type AccountIndustry } from '@/types/crm';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const accountUpdateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  industry: z.enum(['Construção Civil', 'Imobiliário', 'Serviços de Engenharia', 'Governo', 'Particular', 'Outro']).optional(),
  phone: z.string().optional(),
  website: z.string().url('URL inválido').or(z.literal('')).optional(),
});


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = (await params).id;
  
  try {
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK não inicializado.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(idToken);
    
    const body = await req.json();
    const validation = accountUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const accountRef = adminDb.collection('accounts').doc(accountId);
    
    const docSnap = await accountRef.get();
    if (!docSnap.exists) {
        return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
    }

    await accountRef.update(validation.data);

    return NextResponse.json({ success: true, message: 'Conta atualizada com sucesso.' });

  } catch (error: any) {
    console.error(`Error updating account ${accountId}:`, error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = (await params).id;
  
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
    
    const accountRef = adminDb.collection('accounts').doc(accountId);
    
    const docSnap = await accountRef.get();
    if (!docSnap.exists) {
        return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
    }

    // Note: In a real app, you might want to check for related opportunities before deleting.
    await accountRef.delete();

    return NextResponse.json({ success: true, message: 'Conta eliminada com sucesso.' });

  } catch (error: any) {
    console.error(`Error deleting account ${accountId}:`, error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}