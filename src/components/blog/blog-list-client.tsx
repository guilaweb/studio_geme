'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Post, BlogCategory, BlogCategories } from '@/types/blog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    Clock,
    Calendar,
    ArrowRight,
    Sparkles,
    BookOpen,
    Filter,
    Send,
    CheckCircle2,
    Eye,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface BlogListClientProps {
    initialPosts: Post[];
}

const CATEGORY_COLORS: Record<string, string> = {
    'Inteligência': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
    'Cibersegurança': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    'Pentest': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    'Investigação': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    'SI': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    'Geointeligência': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    'Outros': 'bg-secondary text-secondary-foreground border-border',
};

export function BlogListClient({ initialPosts }: BlogListClientProps) {
    const { user: activeUser } = useAuth();
    const searchParams = useSearchParams();
    const urlSearch = searchParams.get('search');
    const urlCategory = searchParams.get('category');

    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState(urlSearch || '');
    const [selectedCategory, setSelectedCategory] = useState<string>(urlCategory || 'all');
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);

    React.useEffect(() => {
        if (urlSearch !== null) setSearchTerm(urlSearch);
    }, [urlSearch]);

    React.useEffect(() => {
        if (urlCategory !== null) setSelectedCategory(urlCategory);
    }, [urlCategory]);


    // Filter posts
    const filteredPosts = useMemo(() => {
        return initialPosts.filter(post => {
            const matchesSearch =
                post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (post.excerpt && post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (post.tags && post.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

            const matchesCategory =
                selectedCategory === 'all' || post.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [initialPosts, searchTerm, selectedCategory]);

    // Find featured post among filtered or fallback to first
    const featuredPost = useMemo(() => {
        return filteredPosts.find(p => p.isFeatured) || (filteredPosts.length > 0 ? filteredPosts[0] : null);
    }, [filteredPosts]);

    // Remaining regular posts excluding featured
    const regularPosts = useMemo(() => {
        if (!featuredPost) return [];
        return filteredPosts.filter(p => p.id !== featuredPost.id);
    }, [filteredPosts, featuredPost]);

    const handleNewsletterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedEmail = newsletterEmail.trim();
        if (!trimmedEmail) return;

        setIsSubscribing(true);
        try {
            const res = await fetch('/api/blog/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: trimmedEmail, source: 'Portal Blog' }),
            });
            const data = await res.json();
            if (res.ok) {
                setNewsletterSubscribed(true);
                toast({
                    title: 'Newsletter',
                    description: data.message || 'Subscrição realizada com sucesso!',
                });
            } else {
                toast({
                    title: 'Erro na subscrição',
                    description: data.error || 'Não foi possível registar o seu email.',
                    variant: 'destructive',
                });
            }
        } catch {
            toast({
                title: 'Erro de conexão',
                description: 'Verifique a sua ligação e tente novamente.',
                variant: 'destructive',
            });
        } finally {
            setIsSubscribing(false);
        }
    };

    const formatDate = (date: any) => {
        if (!date) return '-';
        try {
            const d = date?.toDate ? date.toDate() : new Date(date);
            return format(d, "dd 'de' MMMM, yyyy", { locale: ptBR });
        } catch {
            return '-';
        }
    };

    return (
        <div className="space-y-12">
            {/* Search & Category Filter Bar */}
            <div className="flex flex-col gap-6 items-center max-w-4xl mx-auto">
                <div className="relative w-full">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Pesquisar artigos por título, tecnologia, normas ou palavras-chave..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-4 h-12 text-base rounded-full bg-background border-border shadow-sm focus-visible:ring-primary"
                    />
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                        variant={selectedCategory === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory('all')}
                        className="rounded-full text-xs font-medium"
                    >
                        Todos ({initialPosts.length})
                    </Button>
                    {BlogCategories.map((cat) => {
                        const count = initialPosts.filter(p => p.category === cat).length;
                        return (
                            <Button
                                key={cat}
                                variant={selectedCategory === cat ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedCategory(cat)}
                                className="rounded-full text-xs font-medium"
                            >
                                {cat} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Content Results */}
            {filteredPosts.length === 0 ? (
                <div className="text-center py-20 bg-background/50 rounded-2xl border border-dashed p-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-bold font-headline mb-2">Nenhum artigo publicado</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm">
                        {searchTerm || selectedCategory !== 'all'
                            ? `Não encontramos nenhum artigo correspondente aos filtros aplicados. Tente outros termos ou remova os filtros.`
                            : 'Ainda não existem artigos ou notícias publicadas no blog. Novos conteúdos técnicos e novidades serão disponibilizados em breve.'}
                    </p>
                    {(searchTerm || selectedCategory !== 'all') && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('all');
                            }}
                        >
                            Limpar Filtros
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-12">
                    {/* Featured Article Banner */}
                    {featuredPost && (
                        <div className="relative group">
                            <Link href={`/blog/${featuredPost.slug}`} className="block">
                                <Card className="overflow-hidden border-border/80 shadow-md hover:shadow-xl transition-all duration-300 hover:border-primary/50 grid md:grid-cols-12 bg-card">
                                    <div className="relative md:col-span-7 aspect-[16/10] md:aspect-auto overflow-hidden bg-muted">
                                        {featuredPost.featureImageUrl ? (
                                            <Image
                                                src={featuredPost.featureImageUrl}
                                                alt={featuredPost.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                priority
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-primary/5">
                                                <BookOpen className="h-16 w-16 text-primary/30" />
                                            </div>
                                        )}
                                        <div className="absolute top-4 left-4 flex gap-2">
                                            <Badge className="bg-primary text-primary-foreground font-semibold flex items-center gap-1 shadow-sm">
                                                <Sparkles className="h-3 w-3" /> Artigo em Destaque
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="md:col-span-5 p-6 md:p-8 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <Badge variant="outline" className={CATEGORY_COLORS[featuredPost.category] || 'bg-secondary'}>
                                                    {featuredPost.category}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {featuredPost.readTimeMinutes || 5} min de leitura
                                                </span>
                                            </div>

                                            <h2 className="text-2xl md:text-3xl font-bold font-headline leading-snug group-hover:text-primary transition-colors mb-3">
                                                {featuredPost.title}
                                            </h2>

                                            <p className="text-muted-foreground text-sm line-clamp-3 md:line-clamp-4 leading-relaxed mb-4">
                                                {featuredPost.excerpt || featuredPost.content.substring(0, 180).replace(/[#*`_]/g, '')}...
                                            </p>
                                        </div>

                                        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                    {activeUser?.displayName || (activeUser?.email ? activeUser.email.split('@')[0] : null) || featuredPost.author?.displayName || 'Utilizador Activo'}
                                                    {activeUser && (
                                                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Conta Activa" />
                                                    )}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(featuredPost.createdAt)}
                                                </p>
                                            </div>

                                            <span className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                Ler Artigo <ArrowRight className="h-3.5 w-3.5" />
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        </div>
                    )}

                    {/* Grid of Regular Posts */}
                    {regularPosts.length > 0 && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold font-headline flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-primary" />
                                Artigos Mais Recentes
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {regularPosts.map((post) => (
                                    <Link key={post.id} href={`/blog/${post.slug}`} className="group block h-full">
                                        <Card className="h-full flex flex-col overflow-hidden border-border/80 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-primary/50 bg-card">
                                            <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted">
                                                {post.featureImageUrl ? (
                                                    <Image
                                                        src={post.featureImageUrl}
                                                        alt={post.title}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-primary/5">
                                                        <BookOpen className="h-10 w-10 text-primary/30" />
                                                    </div>
                                                )}
                                                <div className="absolute top-3 left-3">
                                                    <Badge variant="outline" className={`${CATEGORY_COLORS[post.category] || 'bg-secondary'} bg-background/90 backdrop-blur-sm shadow-xs font-medium`}>
                                                        {post.category}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <CardHeader className="p-5 pb-2">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(post.createdAt)}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {post.readTimeMinutes || 4} min
                                                    </span>
                                                </div>
                                                <CardTitle className="text-lg font-bold font-headline leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                                    {post.title}
                                                </CardTitle>
                                            </CardHeader>

                                            <CardContent className="p-5 pt-0 flex-grow">
                                                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                                                    {post.excerpt || post.content.substring(0, 140).replace(/[#*`_]/g, '')}...
                                                </p>
                                            </CardContent>

                                            <CardFooter className="p-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground font-medium truncate max-w-[170px] flex items-center gap-1.5">
                                                    {activeUser?.displayName || (activeUser?.email ? activeUser.email.split('@')[0] : null) || post.author?.displayName || 'Utilizador Activo'}
                                                    {activeUser && (
                                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Conta Activa" />
                                                    )}
                                                </span>
                                                <span className="text-primary font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                    Ler mais <ArrowRight className="h-3 w-3" />
                                                </span>
                                            </CardFooter>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Newsletter Subscription Banner */}
            <div className="mt-16 rounded-3xl bg-primary/10 border border-primary/20 p-8 md:p-12 text-center max-w-3xl mx-auto shadow-sm">
                <h3 className="text-2xl font-bold font-headline mb-2 text-foreground">
                    Subscreva a Nossa Newsletter de Engenharia & Gestão
                </h3>
                <p className="text-muted-foreground text-sm max-w-lg mx-auto mb-6">
                    Receba quinzenalmente no seu email análises sobre obras públicas, inovações em materiais de construção e boas práticas de gestão de projetos em Angola.
                </p>

                {newsletterSubscribed ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm py-2">
                        <CheckCircle2 className="h-5 w-5" /> Obrigado por subscrever! Ficará a par de todas as novidades técnicas.
                    </div>
                ) : (
                    <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <Input
                            type="email"
                            required
                            disabled={isSubscribing}
                            placeholder="O seu email profissional..."
                            value={newsletterEmail}
                            onChange={(e) => setNewsletterEmail(e.target.value)}
                            className="bg-background h-11"
                        />
                        <Button type="submit" disabled={isSubscribing} className="h-11 px-6 whitespace-nowrap">
                            {isSubscribing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A registar...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" /> Subscrever
                                </>
                            )}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
