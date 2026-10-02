import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { BlogCategories } from '@/types/blog';

const postUpdateSchema = z.object({
    title: z.string().min(1, 'Title is required.').optional(),
    content: z.string().min(1, 'Content is required.').optional(),
    excerpt: z.string().optional(),
    featureImageUrl: z.string().url('Must be a valid URL.').or(z.literal('')).optional(),
    isPublished: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    category: z.enum(BlogCategories).optional(),
    tags: z.array(z.string()).optional(),
    author: z.object({
        uid: z.string().optional(),
        displayName: z.string().optional(),
        role: z.string().optional(),
        avatarUrl: z.string().optional(),
    }).optional(),
});

// GET a single post by ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const postId = (await params).id;

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        const postDoc = await adminDb.collection('posts').doc(postId).get();
        if (!postDoc.exists) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        return NextResponse.json({ id: postDoc.id, ...postDoc.data() });

    } catch (error: any) {
        console.error(`Error fetching post:`, error);
        return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
    }
}

// PUT (update) a post
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminApp = getAdminApp();
        const adminDb = getAdminDb();
        const postId = (await params).id;

        if (!adminApp || !adminDb) {
            return NextResponse.json({ success: true, id: postId });
        }

        const adminAuth = admin.auth(adminApp);
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        const adminUserDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const userRole = adminUserDoc.data()?.role;
        const allowedRoles = ['super-admin', 'admin', 'Gestor de Comunicação', 'Gestor Financeiro', 'Gestor de RH'];

        if (!adminUserDoc.exists || !allowedRoles.includes(userRole)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const validation = postUpdateSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data.', details: validation.error.flatten() }, { status: 400 });
        }

        const { title, content, excerpt, featureImageUrl, isPublished, isFeatured, category, tags } = validation.data;

        const postRef = adminDb.collection('posts').doc(postId);
        const existingPost = await postRef.get();

        const dataToUpdate: { [key: string]: any } = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (title !== undefined) dataToUpdate.title = title;
        if (content !== undefined) {
            dataToUpdate.content = content;
            const wordCount = content.trim().split(/\s+/).length;
            dataToUpdate.readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
        }
        if (excerpt !== undefined) dataToUpdate.excerpt = excerpt;
        if (featureImageUrl !== undefined) dataToUpdate.featureImageUrl = featureImageUrl;
        if (isPublished !== undefined) dataToUpdate.isPublished = isPublished;
        if (isFeatured !== undefined) dataToUpdate.isFeatured = isFeatured;
        if (category !== undefined) dataToUpdate.category = category;
        if (tags !== undefined) dataToUpdate.tags = tags;

        const activeAuthorName = validation.data.author?.displayName
            || adminUserDoc.data()?.displayName
            || (decodedToken as any).name
            || (decodedToken.email ? decodedToken.email.split('@')[0] : null)
            || 'Utilizador Activo';

        const activeAuthorRole = validation.data.author?.role
            || adminUserDoc.data()?.jobTitle
            || (userRole === 'super-admin' ? 'Diretor Técnico & Autor' : userRole)
            || 'Autor Técnico';

        const activeAuthorAvatar = validation.data.author?.avatarUrl
            || adminUserDoc.data()?.photoURL
            || (decodedToken as any).picture
            || '';

        dataToUpdate.author = {
            uid: decodedToken.uid,
            displayName: activeAuthorName,
            role: activeAuthorRole,
            avatarUrl: activeAuthorAvatar,
        };

        if (existingPost.exists) {
            await postRef.update(dataToUpdate);
        } else {
            // If updating a demo post, save it as a new document
            await postRef.set({
                ...dataToUpdate,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        return NextResponse.json({ success: true, id: postId });

    } catch (error: any) {
        console.error(`Error updating post:`, error);
        return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
    }
}

// DELETE a post
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminApp = getAdminApp();
        const adminDb = getAdminDb();
        const postId = (await params).id;

        if (!adminApp || !adminDb) {
            return NextResponse.json({ success: true });
        }

        const adminAuth = admin.auth(adminApp);
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        const adminUserDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const userRole = adminUserDoc.data()?.role;
        const allowedRoles = ['super-admin', 'admin', 'Gestor de Comunicação', 'Gestor Financeiro', 'Gestor de RH'];

        if (!adminUserDoc.exists || !allowedRoles.includes(userRole)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await adminDb.collection('posts').doc(postId).delete();
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error(`Error deleting post:`, error);
        return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
    }
}
