
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminStorage: admin.storage.Storage | undefined;

if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminStorage = admin.storage(adminApp);
}

export async function POST(req: NextRequest) {
    if (!adminAuth || !adminStorage) {
        return NextResponse.json({ error: 'Firebase Admin not initialized.' }, { status: 500 });
    }

    try {
        // 1. Authenticate User
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: Missing token.' }, { status: 401 });
        }
        const idToken = authHeader.split('Bearer ')[1];
        await adminAuth.verifyIdToken(idToken);

        // 2. Parse FormData & Tenant Scope
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        let path = formData.get('path') as string | null;

        if (!file || !path) {
            return NextResponse.json({ error: 'File or path missing.' }, { status: 400 });
        }

        // Extrair Tenant ID
        let tenantId = req.headers.get('x-tenant-id');
        if (!tenantId) {
            const cookieHeader = req.headers.get('cookie') || '';
            const match = cookieHeader.match(/x-tenant-id=([^;]+)/);
            if (match) {
                tenantId = decodeURIComponent(match[1]);
            }
        }
        if (!tenantId) {
            tenantId = 'org_default_profundidade';
        }

        // Sanitizar path e isolar sob a directoria do tenant
        const cleanPath = path.replace(/^\/+/, '').replace(/\.\./g, '');
        const tenantScopedPath = cleanPath.startsWith(`tenants/${tenantId}`)
            ? cleanPath
            : `tenants/${tenantId}/${cleanPath}`;

        // 3. Upload to Firebase Storage
        const bucket = adminStorage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${tenantScopedPath}/${uuidv4()}-${sanitizedFileName}`;
        const fileUpload = bucket.file(fileName);

        const buffer = Buffer.from(await file.arrayBuffer());

        // 4. Save and Get Secure Download URL (without requiring iam.serviceAccounts.signBlob)
        const { saveFileAndGetDownloadUrl } = await import('@/lib/storage-helper');
        const url = await saveFileAndGetDownloadUrl(fileUpload, buffer, file.type);

        return NextResponse.json({ success: true, url });

    } catch (error: any) {
        console.error('Error uploading file:', error);
         if (error.code === 'auth/id-token-expired') {
            return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
        }
        return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
    }
}
