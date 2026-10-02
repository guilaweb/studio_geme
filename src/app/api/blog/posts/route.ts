import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { BlogCategories } from '@/types/blog';

const postSchema = z.object({
    title: z.string().min(1, 'Title is required.'),
    content: z.string().min(1, 'Content is required.'),
    slug: z.string().min(1, 'Slug is required.').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be in kebab-case.'),
    excerpt: z.string().optional(),
    featureImageUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
    isPublished: z.boolean(),
    isFeatured: z.boolean().optional(),
    category: z.enum(BlogCategories),
    tags: z.array(z.string()),
    author: z.object({
        uid: z.string().optional(),
        displayName: z.string().optional(),
        role: z.string().optional(),
        avatarUrl: z.string().optional(),
    }).optional(),
});

export async function GET(req: NextRequest) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json([]);
        }

        const postsSnapshot = await adminDb.collection('posts')
            .orderBy('createdAt', 'desc')
            .get();

        if (postsSnapshot.empty) {
            return NextResponse.json([]);
        }

        const posts = postsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
            };
        });

        return NextResponse.json(posts);

    } catch (error: any) {
        console.error('Error fetching posts from Firestore:', error.message);
        return NextResponse.json([]);
    }
}

export async function POST(req: NextRequest) {
    try {
        const adminApp = getAdminApp();
        const adminDb = getAdminDb();

        if (!adminApp || !adminDb) {
            throw new Error('Firebase Admin SDK not initialized.');
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
        const validation = postSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data.', details: validation.error.flatten() }, { status: 400 });
        }
        const { title, content, slug, excerpt, featureImageUrl, isPublished, isFeatured, category, tags } = validation.data;

        const slugQuery = await adminDb.collection('posts').where('slug', '==', slug).limit(1).get();
        if (!slugQuery.empty) {
            return NextResponse.json({ error: 'Slug already exists.' }, { status: 409 });
        }

        const newPostRef = adminDb.collection('posts').doc();
        const now = admin.firestore.FieldValue.serverTimestamp();

        const wordCount = content.trim().split(/\s+/).length;
        const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

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

        await newPostRef.set({
            title,
            content,
            slug,
            excerpt: excerpt || '',
            featureImageUrl: featureImageUrl || '',
            isPublished,
            isFeatured: isFeatured || false,
            category,
            tags,
            views: 0,
            readTimeMinutes,
            author: {
                uid: decodedToken.uid,
                displayName: activeAuthorName,
                role: activeAuthorRole,
                avatarUrl: activeAuthorAvatar,
            },
            createdAt: now,
            updatedAt: now,
        });

        return NextResponse.json({ success: true, id: newPostRef.id }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating post:', error);
        return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
    }
}
