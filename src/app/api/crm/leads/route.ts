
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const adminApp = getAdminApp();
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminDb = admin.firestore(adminApp);
}

const leadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  source: z.string().optional(),
  message: z.string().optional(),
});

// This is the API endpoint for creating a lead from an external source (e.g., website form)
export async function POST(req: NextRequest) {
    // 1. Authenticate the request using a simple API key from server-side environment variables
    const apiKey = req.headers.get('x-api-key');
    if (!process.env.CRM_API_KEY || apiKey !== process.env.CRM_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminDb) {
        console.error('Firebase Admin not initialized. Cannot create lead.');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    try {
        // 2. Validate the request body
        const body = await req.json();
        const validation = leadSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error.flatten() }, { status: 400 });
        }

        const { name, email, phone, source, message } = validation.data;

        // 3. Create the new lead document in Firestore
        const newLeadRef = await adminDb.collection('leads').add({
            name,
            email,
            phone: phone || '',
            source: source || 'API',
            message: message || '',
            status: 'Novo',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
             author: {
                uid: 'API',
                displayName: 'Sistema Externo',
            }
        });

        return NextResponse.json({ success: true, id: newLeadRef.id }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating lead via API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
