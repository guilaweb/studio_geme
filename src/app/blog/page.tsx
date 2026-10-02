import { Suspense } from 'react';
import { getAdminDb } from '@/lib/firebase-admin';
import { type Post } from '@/types/blog';
import { Header } from '@/components/Header';
import { BlogListClient } from '@/components/blog/blog-list-client';
import type { Metadata } from 'next';


import { generateSeoMetadata } from '@/lib/seo-config';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

import { DEFAULT_BLOG_POSTS } from '@/lib/blog-data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generateSeoMetadata({
    title: 'Profundidade Intelligence — Conhecimento para quem investiga o mundo digital',
    description: 'Centro editorial e publicação técnica de Inteligência Digital, OSINT, Cibersegurança, Pentest, Forense Digital, Geointeligência e Super Inteligência (SI).',
    path: '/blog',
    keywords: [
        'inteligência digital',
        'osint',
        'cibersegurança',
        'pentest e análise de vulnerabilidades',
        'geointeligência e metadados',
        'investigação digital e forense',
        'profundidade intelligence'
    ],
});

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 1200): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), timeoutMs)),
    ]);
}

async function getPublishedPosts(): Promise<Post[]> {
    let dbPosts: Post[] = [];
    try {
        const adminDb = getAdminDb();
        if (adminDb) {
            const postsSnapshot = await withTimeout(
                adminDb.collection('posts')
                    .where('isPublished', '==', true)
                    .orderBy('createdAt', 'desc')
                    .get()
            );

            if (!postsSnapshot.empty) {
                dbPosts = postsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
                        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
                    } as Post;
                });
            }
        }
    } catch {
        // Fallback rápido para DEFAULT_BLOG_POSTS se Firestore offline
    }

    // Merge default high-quality posts if not already existing by slug in DB
    const existingSlugs = new Set(dbPosts.map(p => p.slug));
    const fallbackPosts = DEFAULT_BLOG_POSTS.filter(p => p.isPublished && !existingSlugs.has(p.slug));

    // Resolve primary active user account from database if available
    let primaryAuthor: Post['author'] | null = null;
    try {
        const adminDb = getAdminDb();
        if (adminDb) {
            const adminUsersSnap = await withTimeout(
                adminDb.collection('users')
                    .where('role', 'in', ['super-admin', 'admin', 'Gestor de Comunicação', 'Gestor Financeiro', 'Gestor de RH'])
                    .limit(1)
                    .get()
            );

            let activeUserDoc = !adminUsersSnap.empty ? adminUsersSnap.docs[0] : null;
            if (!activeUserDoc) {
                const anyUserSnap = await adminDb.collection('users').limit(1).get();
                if (!anyUserSnap.empty) activeUserDoc = anyUserSnap.docs[0];
            }

            if (activeUserDoc) {
                const uData = activeUserDoc.data();
                primaryAuthor = {
                    uid: activeUserDoc.id,
                    displayName: uData.displayName || (uData.email ? uData.email.split('@')[0] : null) || 'Utilizador Activo',
                    role: uData.jobTitle || (uData.role === 'super-admin' ? 'Diretor Técnico & Autor' : uData.role) || 'Autor Técnico',
                    avatarUrl: uData.photoURL || undefined,
                };
            }
        }
    } catch {
        // Keep existing author
    }

    function toJsDate(dateVal: any): Date {
        if (!dateVal) return new Date();
        if (typeof dateVal.toDate === 'function') return dateVal.toDate();
        if (dateVal instanceof Date) return dateVal;
        return new Date(dateVal);
    }

    const allPosts = [...dbPosts, ...fallbackPosts]
        .map(post => {
            if (primaryAuthor && (!post.author?.displayName || post.author.displayName === 'Utilizador Activo' || post.author.uid === 'active-user')) {
                return { ...post, author: primaryAuthor };
            }
            return post;
        })
        .sort((a, b) => {
            const dateA = toJsDate(a.createdAt).getTime();
            const dateB = toJsDate(b.createdAt).getTime();
            return dateB - dateA;
        });

    return allPosts;
}

export default async function BlogPage() {
    const posts = await getPublishedPosts();

    return (
        <div className="flex min-h-screen w-full flex-col bg-secondary/30">
            <BreadcrumbJsonLd items={[{ name: 'Blog', item: '/blog' }]} />
            <Header />
            <main className="flex-1 pb-24">
                {/* Hero Header — Revista Técnica */}
                <section className="w-full py-16 md:py-24 bg-gradient-to-b from-background via-background to-secondary/30 border-b border-border/50">
                    <div className="container mx-auto text-center px-4 md:px-6 max-w-4xl">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-4 tracking-wider uppercase">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            <span>Publicação Técnica & Centro Editorial</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black font-headline tracking-tight text-foreground">
                            PROFUNDIDADE INTELLIGENCE
                        </h1>
                        <p className="max-w-2xl mx-auto mt-4 text-muted-foreground text-base md:text-lg leading-relaxed font-sans">
                            Conhecimento técnico de ponta para quem investiga o mundo digital. Metodologias OSINT, cadeia de custódia, engenharia reversa de desinformação, cibersegurança e geointeligência.
                        </p>
                    </div>
                </section>

                {/* Main Content Area with Client Search and Filters */}
                <section className="container mx-auto px-4 md:px-6 pt-10">
                    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">A carregar artigos...</div>}>
                        <BlogListClient initialPosts={posts} />
                    </Suspense>
                </section>

            </main>
        </div>
    );
}
