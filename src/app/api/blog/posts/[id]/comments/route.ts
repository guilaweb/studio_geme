import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const commentSchema = z.object({
    authorName: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres.').max(80),
    authorCompany: z.string().trim().max(100).optional(),
    authorEmail: z.string().trim().email('Email inválido.').optional().or(z.literal('')),
    content: z.string().trim().min(3, 'O comentário deve ter pelo menos 3 caracteres.').max(2000),
    replyToId: z.string().optional().nullable(),
});

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

// GET comments for a specific post
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminApp = getAdminApp();
        const adminDb = getAdminDb();
        const postId = (await params).id;

        if (!adminDb) {
            return NextResponse.json([]);
        }

        const isAdmin = adminApp ? await checkIsAdmin(req, adminApp, adminDb) : false;

        let query: admin.firestore.Query = adminDb
            .collection('posts')
            .doc(postId)
            .collection('comments')
            .orderBy('createdAt', 'asc');

        const snapshot = await query.get();

        if (snapshot.empty) {
            return NextResponse.json([]);
        }

        const comments = snapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    postId: data.postId || postId,
                    authorName: data.authorName,
                    authorCompany: data.authorCompany || '',
                    authorEmail: isAdmin ? data.authorEmail : undefined,
                    content: data.content,
                    likes: data.likes || 0,
                    isApproved: data.isApproved !== false,
                    replyToId: data.replyToId || null,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                };
            })
            .filter(c => isAdmin || c.isApproved);

        return NextResponse.json(comments);
    } catch (error: any) {
        console.error('Error fetching comments:', error);
        return NextResponse.json([]);
    }
}

// POST: Add a new comment to a post
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminDb = getAdminDb();
        const postId = (await params).id;

        if (!adminDb) {
            return NextResponse.json({ error: 'Base de dados indisponível.' }, { status: 503 });
        }

        const postDoc = await adminDb.collection('posts').doc(postId).get();
        if (!postDoc.exists) {
            return NextResponse.json({ error: 'Artigo não encontrado.' }, { status: 404 });
        }
        const postTitle = postDoc.data()?.title || 'Artigo';

        const body = await req.json();
        const validation = commentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Dados inválidos.', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { authorName, authorCompany, authorEmail, content, replyToId } = validation.data;

        const commentRef = adminDb.collection('posts').doc(postId).collection('comments').doc();
        const commentId = commentRef.id;
        const now = admin.firestore.FieldValue.serverTimestamp();

        const commentData = {
            id: commentId,
            postId,
            postTitle,
            authorName,
            authorCompany: authorCompany || '',
            authorEmail: authorEmail || '',
            content,
            likes: 0,
            isApproved: true, // Default approved, can be moderated later
            replyToId: replyToId || null,
            createdAt: now,
        };

        // Save in subcollection and mirror in global comments collection
        const batch = adminDb.batch();
        batch.set(commentRef, commentData);
        batch.set(adminDb.collection('blog_comments').doc(commentId), commentData);
        await batch.commit();

        return NextResponse.json(
            {
                success: true,
                comment: {
                    ...commentData,
                    createdAt: new Date(),
                }
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating comment:', error);
        return NextResponse.json({ error: error.message || 'Erro ao publicar comentário.' }, { status: 500 });
    }
}

// PATCH: Like comment or toggle approval (admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminApp = getAdminApp();
        const adminDb = getAdminDb();
        const postId = (await params).id;

        if (!adminApp || !adminDb) {
            return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
        }

        const body = await req.json();
        const { commentId, action, isApproved } = body;

        if (!commentId) {
            return NextResponse.json({ error: 'commentId é obrigatório.' }, { status: 400 });
        }

        const commentSubRef = adminDb.collection('posts').doc(postId).collection('comments').doc(commentId);
        const commentGlobalRef = adminDb.collection('blog_comments').doc(commentId);

        if (action === 'like') {
            const batch = adminDb.batch();
            batch.update(commentSubRef, {
                likes: admin.firestore.FieldValue.increment(1),
            });
            batch.update(commentGlobalRef, {
                likes: admin.firestore.FieldValue.increment(1),
            });
            await batch.commit();

            return NextResponse.json({ success: true, message: 'Gosto adicionado.' });
        }

        // Toggle approval requires admin
        const isAdmin = await checkIsAdmin(req, adminApp, adminDb);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        if (action === 'toggleApproval' && typeof isApproved === 'boolean') {
            const batch = adminDb.batch();
            batch.update(commentSubRef, { isApproved });
            batch.update(commentGlobalRef, { isApproved });
            await batch.commit();

            return NextResponse.json({ success: true, isApproved });
        }

        return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    } catch (error: any) {
        console.error('Error patching comment:', error);
        return NextResponse.json({ error: error.message || 'Erro ao atualizar comentário.' }, { status: 500 });
    }
}

// DELETE: Remove comment (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminApp = getAdminApp();
        const adminDb = getAdminDb();
        const postId = (await params).id;

        if (!adminApp || !adminDb) {
            return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
        }

        const isAdmin = await checkIsAdmin(req, adminApp, adminDb);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const url = new URL(req.url);
        const commentId = url.searchParams.get('commentId');

        if (!commentId) {
            return NextResponse.json({ error: 'commentId é obrigatório.' }, { status: 400 });
        }

        const batch = adminDb.batch();
        batch.delete(adminDb.collection('posts').doc(postId).collection('comments').doc(commentId));
        batch.delete(adminDb.collection('blog_comments').doc(commentId));
        await batch.commit();

        return NextResponse.json({ success: true, message: 'Comentário eliminado com sucesso.' });
    } catch (error: any) {
        console.error('Error deleting comment:', error);
        return NextResponse.json({ error: error.message || 'Erro ao eliminar comentário.' }, { status: 500 });
    }
}
