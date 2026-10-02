import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

// Helper to check admin status
async function checkIsAdmin(req: NextRequest, adminApp: admin.app.App, adminDb: admin.firestore.Firestore): Promise<boolean> {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth(adminApp).verifyIdToken(idToken);
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const role = userDoc.data()?.role;
        return ['super-admin', 'admin', 'Gestor de Comunicação', 'Gestor Financeiro', 'Gestor de RH'].includes(role);
    } catch {
        return false;
    }
}

// GET all comments for admin moderation
export async function GET(req: NextRequest) {
    try {
        const adminApp = getAdminApp();
        const adminDb = getAdminDb();

        if (!adminApp || !adminDb) {
            return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
        }

        const isAdmin = await checkIsAdmin(req, adminApp, adminDb);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const url = new URL(req.url);
        const limitParam = parseInt(url.searchParams.get('limit') || '100', 10);

        const snapshot = await adminDb
            .collection('blog_comments')
            .orderBy('createdAt', 'desc')
            .limit(limitParam)
            .get();

        if (snapshot.empty) {
            return NextResponse.json([]);
        }

        const comments = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                postId: data.postId,
                postTitle: data.postTitle || 'Artigo',
                authorName: data.authorName,
                authorCompany: data.authorCompany || '',
                authorEmail: data.authorEmail || '',
                content: data.content,
                likes: data.likes || 0,
                isApproved: data.isApproved !== false,
                replyToId: data.replyToId || null,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            };
        });

        return NextResponse.json(comments);
    } catch (error: any) {
        console.error('Error fetching global blog comments:', error);
        return NextResponse.json({ error: error.message || 'Erro ao carregar comentários.' }, { status: 500 });
    }
}

// PATCH: Toggle approval status or batch moderation
export async function PATCH(req: NextRequest) {
    try {
        const adminApp = getAdminApp();
        const adminDb = getAdminDb();

        if (!adminApp || !adminDb) {
            return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
        }

        const isAdmin = await checkIsAdmin(req, adminApp, adminDb);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const body = await req.json();
        const { commentId, postId, isApproved } = body;

        if (!commentId || typeof isApproved !== 'boolean') {
            return NextResponse.json({ error: 'commentId e isApproved são obrigatórios.' }, { status: 400 });
        }

        const batch = adminDb.batch();
        batch.update(adminDb.collection('blog_comments').doc(commentId), { isApproved });

        if (postId) {
            batch.update(adminDb.collection('posts').doc(postId).collection('comments').doc(commentId), { isApproved });
        }

        await batch.commit();

        return NextResponse.json({ success: true, isApproved });
    } catch (error: any) {
        console.error('Error moderating comment:', error);
        return NextResponse.json({ error: error.message || 'Erro ao moderar comentário.' }, { status: 500 });
    }
}

// DELETE: Delete comment globally
export async function DELETE(req: NextRequest) {
    try {
        const adminApp = getAdminApp();
        const adminDb = getAdminDb();

        if (!adminApp || !adminDb) {
            return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
        }

        const isAdmin = await checkIsAdmin(req, adminApp, adminDb);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const url = new URL(req.url);
        const commentId = url.searchParams.get('commentId');
        const postId = url.searchParams.get('postId');

        if (!commentId) {
            return NextResponse.json({ error: 'commentId é obrigatório.' }, { status: 400 });
        }

        const batch = adminDb.batch();
        batch.delete(adminDb.collection('blog_comments').doc(commentId));

        if (postId) {
            batch.delete(adminDb.collection('posts').doc(postId).collection('comments').doc(commentId));
        }

        await batch.commit();

        return NextResponse.json({ success: true, message: 'Comentário eliminado com sucesso.' });
    } catch (error: any) {
        console.error('Error deleting comment:', error);
        return NextResponse.json({ error: error.message || 'Erro ao eliminar comentário.' }, { status: 500 });
    }
}
