import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

// POST: Atomically increment view counter for a blog post
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminDb = getAdminDb();
        const postId = (await params).id;

        if (!adminDb || !postId) {
            return NextResponse.json({ success: false }, { status: 400 });
        }

        const postRef = adminDb.collection('posts').doc(postId);
        await postRef.update({
            views: admin.firestore.FieldValue.increment(1),
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        // Fail silently if post does not exist or network glitch
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
