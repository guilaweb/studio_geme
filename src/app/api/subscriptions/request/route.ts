
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
let adminStorage: admin.storage.Storage | undefined;

if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
    adminStorage = admin.storage(adminApp);
}

export async function POST(req: NextRequest) {
    if (!adminAuth || !adminDb || !adminStorage) {
        return NextResponse.json({ error: 'Firebase Admin not initialized.' }, { status: 500 });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: Missing token.' }, { status: 401 });
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const { uid } = decodedToken;

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const plan = formData.get('plan') as string;
        const userName = formData.get('userName') as string;
        const userEmail = formData.get('userEmail') as string;

        if (!file) {
            return NextResponse.json({ error: 'Proof of payment is required.' }, { status: 400 });
        }

        const requestId = uuidv4();
        const bucket = adminStorage.bucket();
        const storagePath = `subscriptions/${uid}/${requestId}-${file.name}`;
        const fileUpload = bucket.file(storagePath);
        const buffer = Buffer.from(await file.arrayBuffer());

        const { saveFileAndGetDownloadUrl } = await import('@/lib/storage-helper');
        const fileUrl = await saveFileAndGetDownloadUrl(fileUpload, buffer, file.type);

        const newRequestRef = adminDb.collection('subscriptionRequests').doc();
        
        await newRequestRef.set({
            userId: uid,
            userName: userName,
            userEmail: userEmail,
            plan: plan,
            status: 'pendente',
            requestedAt: admin.firestore.FieldValue.serverTimestamp(),
            proofOfPaymentUrl: fileUrl,
            proofOfPaymentFileName: file.name,
        });

        return NextResponse.json({ success: true, id: newRequestRef.id }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating subscription request:', error);
        return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
    }
}
