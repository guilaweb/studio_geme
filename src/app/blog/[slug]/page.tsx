import { getAdminDb } from '@/lib/firebase-admin';
import { type Post, type PostComment } from '@/types/blog';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MarkdownViewer } from '@/components/markdown-viewer';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Tag,
    Clock,
    Calendar,
    ArrowLeft,
    ChevronRight,
    User,
    BookOpen,
    ArrowRight
} from 'lucide-react';
import type { Metadata, ResolvingMetadata } from 'next';
import { marked } from 'marked';
import { PostActions } from '@/components/blog/post-actions';
import { PostToc } from '@/components/blog/post-toc';
import { PostComments } from '@/components/blog/post-comments';
import { PostViewTracker } from '@/components/blog/post-view-tracker';
import { SITE_URL } from '@/lib/seo-config';
import { BreadcrumbJsonLd, ArticleJsonLd } from '@/components/seo/json-ld';
import { DEFAULT_BLOG_POSTS } from '@/lib/blog-data';
import { BlogPostAuthor } from '@/components/blog/blog-post-author';

export const dynamic = 'force-dynamic';

interface PostPageProps {
    params: Promise<{
        slug: string;
    }>;
}

async function getPost(slug: string): Promise<Post | null> {
    let post: Post | null = null;
    try {
        const adminDb = getAdminDb();
        if (adminDb) {
            const postsSnapshot = await adminDb.collection('posts')
                .where('slug', '==', slug)
                .where('isPublished', '==', true)
                .limit(1)
                .get();

            if (!postsSnapshot.empty) {
                const doc = postsSnapshot.docs[0];
                const data = doc.data();
                post = {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
                } as Post;
            }
        }
    } catch (error) {
        console.error(`Error fetching post from Firestore for slug ${slug}:`, error);
    }

    // Fallback to pre-authored static articles if not yet in DB
    if (!post) {
        const fallback = DEFAULT_BLOG_POSTS.find(p => p.slug === slug && p.isPublished);
        if (fallback) {
            post = { ...fallback };
        }
    }

    if (post && (!post.author?.displayName || post.author.displayName === 'Utilizador Activo' || post.author.uid === 'active-user')) {
        try {
            const adminDb = getAdminDb();
            if (adminDb) {
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
                    post.author = {
                        uid: activeUserDoc.id,
                        displayName: uData.displayName || (uData.email ? uData.email.split('@')[0] : null) || 'Utilizador Activo',
                        role: uData.jobTitle || (uData.role === 'super-admin' ? 'Diretor Técnico & Autor' : uData.role) || 'Autor Técnico',
                        avatarUrl: uData.photoURL || undefined,
                    };
                }
            }
        } catch {
            // Keep default
        }
    }

    return post;
}

async function getPostComments(postId: string): Promise<PostComment[]> {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) return [];

        const commentsSnapshot = await adminDb
            .collection('posts')
            .doc(postId)
            .collection('comments')
            .get();

        if (commentsSnapshot.empty) return [];

        return commentsSnapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    postId: data.postId || postId,
                    authorName: data.authorName,
                    authorCompany: data.authorCompany || '',
                    content: data.content,
                    likes: data.likes || 0,
                    isApproved: data.isApproved !== false,
                    replyToId: data.replyToId || null,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
                } as PostComment;
            })
            .filter(c => c.isApproved);
    } catch (e) {
        console.warn(`Error fetching comments for post ${postId}:`, e);
        return [];
    }
}

async function getRelatedPosts(category: string, currentPostId: string): Promise<Post[]> {
    let posts: Post[] = [];
    try {
        const adminDb = getAdminDb();
        if (adminDb) {
            const snapshot = await adminDb
                .collection('posts')
                .where('isPublished', '==', true)
                .where('category', '==', category)
                .limit(4)
                .get();

            if (!snapshot.empty) {
                posts = snapshot.docs
                    .map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
                            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
                        } as Post;
                    })
                    .filter(p => p.id !== currentPostId && p.slug !== currentPostId);
            }
        }
    } catch {
        posts = [];
    }

    // If Firestore has fewer than 3 related posts, supplement with default posts
    if (posts.length < 3) {
        const existingIds = new Set([currentPostId, ...posts.map(p => p.id), ...posts.map(p => p.slug)]);
        
        // Priority 1: same category from defaults
        const sameCatDefaults = DEFAULT_BLOG_POSTS.filter(
            p => p.isPublished && !existingIds.has(p.id) && !existingIds.has(p.slug) && p.category === category
        );
        for (const item of sameCatDefaults) {
            if (posts.length >= 3) break;
            posts.push(item);
            existingIds.add(item.id);
            existingIds.add(item.slug);
        }

        // Priority 2: other categories from defaults
        if (posts.length < 3) {
            const otherDefaults = DEFAULT_BLOG_POSTS.filter(
                p => p.isPublished && !existingIds.has(p.id) && !existingIds.has(p.slug)
            );
            for (const item of otherDefaults) {
                if (posts.length >= 3) break;
                posts.push(item);
                existingIds.add(item.id);
                existingIds.add(item.slug);
            }
        }
    }

    return posts.slice(0, 3);
}

function toJsDate(dateVal: any): Date {
    if (!dateVal) return new Date();
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (dateVal instanceof Date) return dateVal;
    return new Date(dateVal);
}

export async function generateMetadata(
    { params }: PostPageProps,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) {
        return {
            title: 'Artigo não encontrado | Profundidade',
        };
    }

    const postUrl = `${SITE_URL}/blog/${post.slug}`;
    const plainTextContent = await marked.parse(post.content);
    const cleanText = plainTextContent.replace(/<[^>]*>?/gm, '').replace(/\n+/g, ' ').trim();
    const description = post.excerpt || cleanText.substring(0, 160) + '...';
    const previousImages = (await parent).openGraph?.images || [];
    const createdAtDate = toJsDate(post.createdAt);
    const updatedAtDate = toJsDate(post.updatedAt || post.createdAt);

    return {
        title: `${post.title} | Blog Profundidade`,
        description: description,
        metadataBase: new URL(SITE_URL),
        alternates: {
            canonical: postUrl,
            languages: {
                'pt-AO': postUrl,
                'pt': postUrl,
                'x-default': postUrl,
            },
        },
        keywords: [post.category, ...(post.tags || []), 'engenharia angola', 'construção civil', 'profundidade'],
        openGraph: {
            title: post.title,
            description: description,
            type: 'article',
            url: postUrl,
            publishedTime: createdAtDate.toISOString(),
            modifiedTime: updatedAtDate.toISOString(),
            authors: [post.author?.displayName || 'Equipa Profundidade'],
            section: post.category || 'Engenharia',
            tags: post.tags || [],
            images: post.featureImageUrl ? [post.featureImageUrl, ...previousImages] : previousImages,
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: description,
            images: post.featureImageUrl ? [post.featureImageUrl] : [`${SITE_URL}/opengraph-image`],
        },
    };
}

export default async function PostPage({ params }: PostPageProps) {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) {
        notFound();
    }

    const postUrl = `${SITE_URL}/blog/${post.slug}`;
    const plainTextContent = await marked.parse(post.content);
    const cleanText = plainTextContent.replace(/<[^>]*>?/gm, '').replace(/\n+/g, ' ').trim();
    const description = post.excerpt || cleanText.substring(0, 160) + '...';
    const wordCount = cleanText.split(/\s+/).length;
    const postCreatedAtDate = toJsDate(post.createdAt);
    const postUpdatedAtDate = toJsDate(post.updatedAt || post.createdAt);

    const [comments, relatedPosts] = await Promise.all([
        getPostComments(post.id),
        getRelatedPosts(post.category || 'Notícias', post.id),
    ]);

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <BreadcrumbJsonLd
                items={[
                    { name: 'Blog', item: '/blog' },
                    { name: post.title, item: `/blog/${post.slug}` },
                ]}
            />
            <ArticleJsonLd
                title={post.title}
                description={description}
                url={postUrl}
                imageUrl={post.featureImageUrl}
                datePublished={postCreatedAtDate.toISOString()}
                dateModified={postUpdatedAtDate.toISOString()}
                authorName={post.author?.displayName || 'Equipa Profundidade'}
                keywords={[post.category, ...(post.tags || [])]}
                wordCount={wordCount}
            />
            <Header />
            <PostViewTracker postId={post.id} />
            <main className="flex-1 pb-20">
                {/* Breadcrumbs & Navigation Header */}
                <div className="border-b bg-secondary/30">
                    <div className="container mx-auto max-w-4xl py-4 px-4 flex flex-wrap items-center justify-between gap-4">
                        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                            <Link href="/" className="hover:text-primary transition-colors">Início</Link>
                            <ChevronRight className="h-3 w-3" />
                            <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
                            <ChevronRight className="h-3 w-3" />
                            <span className="text-foreground font-medium">{post.category}</span>
                        </nav>

                        <Button variant="ghost" size="sm" asChild className="h-8 text-xs gap-1">
                            <Link href="/blog">
                                <ArrowLeft className="h-3.5 w-3.5" /> Todos os Artigos
                            </Link>
                        </Button>
                    </div>
                </div>

                <article className="container mx-auto max-w-4xl py-10 px-4">
                    {/* Header Details */}
                    <header className="mb-8 space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="px-3 py-1 font-semibold text-xs">
                                {post.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {post.readTimeMinutes || 5} min de leitura
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold font-headline tracking-tight text-foreground leading-[1.15]">
                            {post.title}
                        </h1>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/60">
                            <BlogPostAuthor fallbackAuthor={post.author} date={post.createdAt} />

                            {/* Share Actions */}
                            <PostActions title={post.title} slug={post.slug} />
                        </div>
                    </header>

                    {/* Feature Image */}
                    {post.featureImageUrl && (
                        <div className="relative w-full aspect-[16/9] mb-10 rounded-2xl overflow-hidden shadow-lg border bg-muted">
                            <Image
                                src={post.featureImageUrl}
                                alt={post.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                    )}

                    {/* Excerpt Lead Box */}
                    {post.excerpt && (
                        <div className="p-6 rounded-xl bg-secondary/50 border-l-4 border-primary mb-6 text-muted-foreground text-base md:text-lg italic leading-relaxed">
                            {post.excerpt}
                        </div>
                    )}

                    {/* Table of Contents */}
                    <PostToc content={post.content} />

                    {/* Main Content Markdown */}
                    <div className="prose prose-base md:prose-lg dark:prose-invert max-w-none prose-headings:font-headline prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary hover:prose-a:underline prose-img:rounded-xl">
                        <MarkdownViewer markdownContent={post.content} />
                    </div>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="mt-12 pt-6 border-t flex flex-wrap items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground mr-1" />
                            <span className="text-xs font-semibold text-muted-foreground mr-2">Tags:</span>
                            {post.tags.map((tag) => (
                                <Link key={tag} href={`/blog?search=${encodeURIComponent(tag)}`}>
                                    <Badge variant="outline" className="text-xs hover:bg-secondary cursor-pointer transition-colors">
                                        #{tag}
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Author Bio Card */}
                    <div className="mt-12 p-6 rounded-2xl bg-secondary/40 border border-border/80 flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary text-base flex-shrink-0">
                            {post.author?.displayName ? post.author.displayName.substring(0, 2).toUpperCase() : 'EP'}
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-base text-foreground">Sobre o Autor: {post.author?.displayName}</h4>
                            <p className="text-xs text-primary font-medium">{post.author?.role || 'Especialista em Gestão e Engenharia'}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                                Contribuidor técnico na plataforma Profundidade, focado em metodologias ágeis de controlo de custos, análise do valor agregado e melhores práticas da engenharia civil e infraestruturas em Angola.
                            </p>
                        </div>
                    </div>

                    {/* Technical Discussion & Comments */}
                    <PostComments postId={post.id} initialComments={comments} />

                    {/* Related Posts */}
                    {relatedPosts.length > 0 && (
                        <section className="mt-16 pt-10 border-t">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold font-headline flex items-center gap-2">
                                    <BookOpen className="h-6 w-6 text-primary" />
                                    Artigos Relacionados
                                </h3>
                                <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
                                    <Link href="/blog">
                                        Ver Todos <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {relatedPosts.map((related) => (
                                    <Link key={related.id} href={`/blog/${related.slug}`} className="group block">
                                        <Card className="h-full flex flex-col overflow-hidden border-border/80 hover:border-primary/50 hover:shadow-md transition-all">
                                            {related.featureImageUrl && (
                                                <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted">
                                                    <Image
                                                        src={related.featureImageUrl}
                                                        alt={related.title}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                </div>
                                            )}
                                            <CardHeader className="p-4 pb-2">
                                                <Badge variant="outline" className="w-fit text-[10px] mb-1">
                                                    {related.category}
                                                </Badge>
                                                <CardTitle className="text-sm font-bold font-headline line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                                                    {related.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 pt-0 flex-grow">
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {related.excerpt || related.content.substring(0, 100).replace(/[#*`_]/g, '')}...
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </article>
            </main>
        </div>
    );
}

export async function generateStaticParams() {
    try {
        const adminDb = getAdminDb();
        if (adminDb) {
            const postsSnapshot = await adminDb.collection('posts')
                .where('isPublished', '==', true)
                .get();

            const dbSlugs = postsSnapshot.docs.map(doc => ({
                slug: doc.data().slug,
            }));

            return dbSlugs;
        }
    } catch (e) {
        console.warn("Error generating static params for blog:", e);
    }

    return [];
}
