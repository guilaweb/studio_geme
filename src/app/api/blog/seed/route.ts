import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { DEFAULT_BLOG_POSTS } from '@/lib/blog-data';

export async function POST(req: NextRequest) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
        }

        // Resolve active user account to assign as author
        let activeAuthor = {
            uid: 'active-user',
            displayName: 'Utilizador Activo',
            role: 'Gestor & Autor Técnico',
            avatarUrl: '',
        };

        try {
            const usersSnap = await adminDb.collection('users')
                .where('role', 'in', ['super-admin', 'admin', 'Gestor de Comunicação', 'Gestor Financeiro', 'Gestor de RH'])
                .limit(1)
                .get();

            let activeUserDoc = !usersSnap.empty ? usersSnap.docs[0] : null;
            if (!activeUserDoc) {
                const anyUserSnap = await adminDb.collection('users').limit(1).get();
                if (!anyUserSnap.empty) activeUserDoc = anyUserSnap.docs[0];
            }

            if (activeUserDoc) {
                const uData = activeUserDoc.data();
                activeAuthor = {
                    uid: activeUserDoc.id,
                    displayName: uData.displayName || (uData.email ? uData.email.split('@')[0] : null) || 'Utilizador Activo',
                    role: uData.jobTitle || (uData.role === 'super-admin' ? 'Diretor Técnico & Autor' : uData.role) || 'Autor Técnico',
                    avatarUrl: uData.photoURL || '',
                };
            }
        } catch {
            // Keep default
        }

        const seeded: string[] = [];
        const skipped: string[] = [];

        for (const post of DEFAULT_BLOG_POSTS) {
            const existing = await adminDb.collection('posts').where('slug', '==', post.slug).limit(1).get();
            if (existing.empty) {
                const { id, ...postData } = post;
                await adminDb.collection('posts').add({
                    ...postData,
                    author: activeAuthor,
                    createdAt: post.createdAt,
                    updatedAt: post.updatedAt,
                });
                seeded.push(post.slug);
            } else {
                skipped.push(post.slug);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Seed concluído. ${seeded.length} novos artigos criados, ${skipped.length} já existiam.`,
            seeded,
            skipped,
        });
    } catch (error: any) {
        console.error('Error seeding blog posts:', error);
        return NextResponse.json({ error: error.message || 'Falha ao sincronizar artigos' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return POST(req);
}
