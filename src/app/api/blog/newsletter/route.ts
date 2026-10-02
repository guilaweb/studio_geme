import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const subscriberSchema = z.object({
    email: z.string().trim().email('Endereço de email inválido.'),
    source: z.string().optional().default('Portal Blog'),
});

// POST: Public endpoint to subscribe to the newsletter
export async function POST(req: NextRequest) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: 'Serviço temporariamente indisponível.' }, { status: 503 });
        }

        const body = await req.json();
        const validation = subscriberSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Email inválido.', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { email, source } = validation.data;
        const normalizedEmail = email.toLowerCase().trim();

        // Check if already subscribed
        const existingQuery = await adminDb
            .collection('newsletter_subscribers')
            .where('email', '==', normalizedEmail)
            .limit(1)
            .get();

        if (!existingQuery.empty) {
            const existingDoc = existingQuery.docs[0];
            const existingData = existingDoc.data();

            if (existingData.status === 'active') {
                return NextResponse.json(
                    { message: 'Este email já se encontra subscrito à newsletter.', alreadySubscribed: true },
                    { status: 200 }
                );
            } else {
                // Reactivate subscription
                await existingDoc.ref.update({
                    status: 'active',
                    subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
                    source: source || 'Portal Blog (Reativado)',
                });
                return NextResponse.json(
                    { message: 'Subscrição reativada com sucesso!', reactivated: true },
                    { status: 200 }
                );
            }
        }

        // Add new subscriber
        const newDocRef = adminDb.collection('newsletter_subscribers').doc();
        await newDocRef.set({
            id: newDocRef.id,
            email: normalizedEmail,
            source: source || 'Portal Blog',
            status: 'active',
            subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json(
            { message: 'Subscrição realizada com sucesso!', success: true },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error subscribing to newsletter:', error);
        return NextResponse.json(
            { error: error.message || 'Erro interno ao processar subscrição.' },
            { status: 500 }
        );
    }
}

// GET: Admin endpoint to list all subscribers
export async function GET(req: NextRequest) {
    try {
        const adminApp = getAdminApp();
        const adminDb = getAdminDb();

        if (!adminApp || !adminDb) {
            return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
        }

        const adminAuth = admin.auth(adminApp);
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        const adminUserDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const userRole = adminUserDoc.data()?.role;
        const allowedRoles = ['super-admin', 'admin', 'Gestor de Comunicação', 'Gestor Financeiro', 'Gestor de RH'];

        if (!adminUserDoc.exists || !allowedRoles.includes(userRole)) {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const snapshot = await adminDb
            .collection('newsletter_subscribers')
            .orderBy('subscribedAt', 'desc')
            .get();

        const subscribers = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                email: data.email,
                source: data.source || 'Portal Blog',
                status: data.status || 'active',
                subscribedAt: data.subscribedAt?.toDate ? data.subscribedAt.toDate() : new Date(),
            };
        });

        return NextResponse.json(subscribers);
    } catch (error: any) {
        console.error('Error fetching newsletter subscribers:', error);
        return NextResponse.json({ error: error.message || 'Erro ao obter subscritores.' }, { status: 500 });
    }
}

// DELETE: Admin endpoint to remove or cancel a subscriber
export async function DELETE(req: NextRequest) {
    try {
        const adminApp = getAdminApp();
        const adminDb = getAdminDb();

        if (!adminApp || !adminDb) {
            return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
        }

        const adminAuth = admin.auth(adminApp);
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        const adminUserDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const userRole = adminUserDoc.data()?.role;
        const allowedRoles = ['super-admin', 'admin', 'Gestor de Comunicação', 'Gestor Financeiro', 'Gestor de RH'];

        if (!adminUserDoc.exists || !allowedRoles.includes(userRole)) {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const url = new URL(req.url);
        const subscriberId = url.searchParams.get('id');

        if (!subscriberId) {
            return NextResponse.json({ error: 'ID de subscritor obrigatório.' }, { status: 400 });
        }

        await adminDb.collection('newsletter_subscribers').doc(subscriberId).delete();

        return NextResponse.json({ success: true, message: 'Subscritor removido com sucesso.' });
    } catch (error: any) {
        console.error('Error deleting subscriber:', error);
        return NextResponse.json({ error: error.message || 'Erro ao remover subscritor.' }, { status: 500 });
    }
}
