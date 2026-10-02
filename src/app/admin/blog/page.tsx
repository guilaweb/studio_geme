'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type Post, BlogCategories, type NewsletterSubscriber } from '@/types/blog';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Loader2,
    Plus,
    Edit,
    Trash2,
    Star,
    ExternalLink,
    Search,
    BookOpen,
    FileText,
    CheckCircle2,
    Clock,
    Eye,
    Download,
    Mail,
    Users,
    MessageSquare,
    ThumbsUp,
    Check,
    X,
    ShieldAlert,
    RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AdminComment {
    id: string;
    postId: string;
    postTitle: string;
    authorName: string;
    authorCompany?: string;
    authorEmail?: string;
    content: string;
    likes: number;
    isApproved: boolean;
    replyToId?: string | null;
    createdAt: any;
}

export default function AdminBlogPage() {
    const { user: adminUser, loading: authLoading, idToken } = useRequireAuth([
        'super-admin',
        'admin',
        'Gestor de Comunicação',
        'Gestor Financeiro',
        'Gestor de RH'
    ]);
    const router = useRouter();
    const { toast } = useToast();

    const [posts, setPosts] = useState<Post[]>([]);
    const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
    const [comments, setComments] = useState<AdminComment[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [subscriberSearch, setSubscriberSearch] = useState('');
    const [commentSearch, setCommentSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [commentStatusFilter, setCommentStatusFilter] = useState<string>('all');

    // Fetch posts
    const fetchPosts = useCallback(async () => {
        try {
            const response = await fetch('/api/blog/posts');
            if (!response.ok) throw new Error('Failed to fetch posts');
            const data = await response.json();
            if (Array.isArray(data)) {
                setPosts(data);
            } else {
                setPosts([]);
            }
        } catch (error) {
            console.error('Error fetching blog posts in admin view:', error);
            setPosts([]);
        }
    }, []);

    // Fetch subscribers
    const fetchSubscribers = useCallback(async () => {
        if (!idToken) return;
        try {
            const response = await fetch('/api/blog/newsletter', {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    setSubscribers(data);
                }
            }
        } catch (error) {
            console.error('Error fetching newsletter subscribers in admin view:', error);
        }
    }, [idToken]);

    // Fetch comments
    const fetchComments = useCallback(async () => {
        if (!idToken) return;
        try {
            const response = await fetch('/api/blog/comments', {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    setComments(data);
                }
            }
        } catch (error) {
            console.error('Error fetching comments in admin view:', error);
        }
    }, [idToken]);

    useEffect(() => {
        if (adminUser && idToken) {
            setLoading(true);
            Promise.all([fetchPosts(), fetchSubscribers(), fetchComments()]).finally(() => {
                setLoading(false);
            });
        }
    }, [adminUser, idToken, fetchPosts, fetchSubscribers, fetchComments]);

    // Handle delete post
    const handleDeletePost = async (postId: string) => {
        try {
            if (idToken) {
                await fetch(`/api/blog/posts/${postId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${idToken}` },
                });
            }
            setPosts(prev => prev.filter(p => p.id !== postId));
            toast({ title: 'Artigo eliminado com sucesso' });
        } catch {
            setPosts(prev => prev.filter(p => p.id !== postId));
            toast({ title: 'Artigo removido da lista' });
        }
    };

    // Handle toggle published
    const handleTogglePublished = async (post: Post) => {
        const updatedStatus = !post.isPublished;
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isPublished: updatedStatus } : p));

        toast({
            title: updatedStatus ? 'Artigo Publicado' : 'Artigo revertido para Rascunho',
            description: `O estado de "${post.title}" foi atualizado.`,
        });

        if (idToken) {
            try {
                await fetch(`/api/blog/posts/${post.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({ isPublished: updatedStatus }),
                });
            } catch (e) {
                console.error("Error updating status:", e);
            }
        }
    };

    // Handle toggle featured
    const handleToggleFeatured = async (post: Post) => {
        const updatedFeatured = !post.isFeatured;
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isFeatured: updatedFeatured } : p));

        toast({
            title: updatedFeatured ? 'Artigo Marcado como Destaque' : 'Destaque Removido',
            description: `"${post.title}" ${updatedFeatured ? 'agora é' : 'já não é'} destaque principal.`,
        });

        if (idToken) {
            try {
                await fetch(`/api/blog/posts/${post.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({ isFeatured: updatedFeatured }),
                });
            } catch (e) {
                console.error("Error updating featured state:", e);
            }
        }
    };

    // Handle delete subscriber
    const handleDeleteSubscriber = async (subscriberId: string) => {
        if (!idToken) return;
        try {
            const res = await fetch(`/api/blog/newsletter?id=${subscriberId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (res.ok) {
                setSubscribers(prev => prev.filter(s => s.id !== subscriberId));
                toast({ title: 'Subscritor removido com sucesso.' });
            } else {
                toast({ title: 'Erro ao remover subscritor', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Erro de conexão', variant: 'destructive' });
        }
    };

    // Handle toggle comment approval
    const handleToggleCommentApproval = async (comment: AdminComment) => {
        if (!idToken) return;
        const newStatus = !comment.isApproved;

        setComments(prev => prev.map(c => c.id === comment.id ? { ...c, isApproved: newStatus } : c));

        toast({
            title: newStatus ? 'Comentário Aprovado' : 'Comentário Ocultado',
            description: `O comentário de ${comment.authorName} agora está ${newStatus ? 'visível publicamente' : 'oculto'}.`,
        });

        try {
            await fetch('/api/blog/comments', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    commentId: comment.id,
                    postId: comment.postId,
                    isApproved: newStatus,
                }),
            });
        } catch (e) {
            console.error("Error toggling comment approval:", e);
        }
    };

    // Handle delete comment
    const handleDeleteComment = async (comment: AdminComment) => {
        if (!idToken) return;
        try {
            const res = await fetch(`/api/blog/comments?commentId=${comment.id}&postId=${comment.postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (res.ok) {
                setComments(prev => prev.filter(c => c.id !== comment.id));
                toast({ title: 'Comentário eliminado com sucesso.' });
            } else {
                toast({ title: 'Erro ao eliminar comentário', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Erro de conexão', variant: 'destructive' });
        }
    };

    // Filtered posts
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            const matchesSearch =
                post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (post.author?.displayName && post.author.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (post.tags && post.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

            const matchesCategory = categoryFilter === 'all' || post.category === categoryFilter;

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'published' && post.isPublished) ||
                (statusFilter === 'draft' && !post.isPublished) ||
                (statusFilter === 'featured' && post.isFeatured);

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [posts, searchTerm, categoryFilter, statusFilter]);

    // Filtered subscribers
    const filteredSubscribers = useMemo(() => {
        return subscribers.filter(s =>
            s.email.toLowerCase().includes(subscriberSearch.toLowerCase()) ||
            (s.source && s.source.toLowerCase().includes(subscriberSearch.toLowerCase()))
        );
    }, [subscribers, subscriberSearch]);

    // Filtered comments
    const filteredComments = useMemo(() => {
        return comments.filter(c => {
            const matchesSearch =
                c.authorName.toLowerCase().includes(commentSearch.toLowerCase()) ||
                c.content.toLowerCase().includes(commentSearch.toLowerCase()) ||
                (c.postTitle && c.postTitle.toLowerCase().includes(commentSearch.toLowerCase())) ||
                (c.authorCompany && c.authorCompany.toLowerCase().includes(commentSearch.toLowerCase()));

            const matchesStatus =
                commentStatusFilter === 'all' ||
                (commentStatusFilter === 'approved' && c.isApproved) ||
                (commentStatusFilter === 'hidden' && !c.isApproved);

            return matchesSearch && matchesStatus;
        });
    }, [comments, commentSearch, commentStatusFilter]);

    // Statistics
    const stats = useMemo(() => {
        const total = posts.length;
        const published = posts.filter(p => p.isPublished).length;
        const drafts = total - published;
        const featured = posts.filter(p => p.isFeatured).length;
        const totalViews = posts.reduce((acc, p) => acc + (p.views || 0), 0);
        const totalSubscribers = subscribers.length;
        const totalComments = comments.length;

        return { total, published, drafts, featured, totalViews, totalSubscribers, totalComments };
    }, [posts, subscribers, comments]);

    const handleExportCsv = () => {
        const headers = ['ID', 'Título', 'Categoria', 'Estado', 'Destaque', 'Autor', 'Data de Criação', 'Visualizações'];
        const rows = filteredPosts.map(p => {
            const d = p.createdAt ? (p.createdAt as any)?.toDate?.() || new Date(p.createdAt as any) : new Date();
            return [
                `"${p.id}"`,
                `"${p.title.replace(/"/g, '""')}"`,
                `"${p.category}"`,
                p.isPublished ? 'Publicado' : 'Rascunho',
                p.isFeatured ? 'Sim' : 'Não',
                `"${p.author?.displayName || 'Admin'}"`,
                `"${format(d, 'dd/MM/yyyy')}"`,
                p.views || 0,
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `artigos_blog_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: 'Exportação Concluída', description: 'Ficheiro CSV de artigos gerado com sucesso.' });
    };

    const handleExportSubscribersCsv = () => {
        const headers = ['ID', 'Email', 'Data de Subscrição', 'Estado', 'Origem'];
        const rows = filteredSubscribers.map(s => {
            const d = s.subscribedAt ? (s.subscribedAt as any)?.toDate?.() || new Date(s.subscribedAt as any) : new Date();
            return [
                `"${s.id}"`,
                `"${s.email}"`,
                `"${format(d, 'dd/MM/yyyy')}"`,
                s.status,
                `"${s.source || 'Portal'}"`,
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `subscritores_newsletter_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: 'Exportação Concluída', description: 'Ficheiro CSV de mailing list gerado com sucesso.' });
    };

    const handleExportCommentsCsv = () => {
        const headers = ['ID', 'Artigo', 'Autor', 'Empresa', 'Email', 'Conteúdo', 'Gostos', 'Estado', 'Data'];
        const rows = filteredComments.map(c => {
            const d = c.createdAt ? (c.createdAt as any)?.toDate?.() || new Date(c.createdAt as any) : new Date();
            return [
                `"${c.id}"`,
                `"${(c.postTitle || '').replace(/"/g, '""')}"`,
                `"${c.authorName.replace(/"/g, '""')}"`,
                `"${(c.authorCompany || '').replace(/"/g, '""')}"`,
                `"${(c.authorEmail || '').replace(/"/g, '""')}"`,
                `"${c.content.replace(/"/g, '""')}"`,
                c.likes || 0,
                c.isApproved ? 'Aprovado' : 'Ocultado',
                `"${format(d, 'dd/MM/yyyy HH:mm')}"`,
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `comentarios_blog_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: 'Exportação Concluída', description: 'Ficheiro CSV de comentários gerado com sucesso.' });
    };

    const getFormattedDate = (date: any) => {
        if (!date) return '-';
        try {
            const d = date?.toDate ? date.toDate() : new Date(date);
            return format(d, 'dd/MM/yyyy', { locale: ptBR });
        } catch {
            return '-';
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex flex-1 items-center justify-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span>A carregar painel editorial do blog...</span>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <Header />
            <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
                <TooltipProvider>
                    {/* Header Banner */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-7 w-7 text-primary" />
                                <h1 className="text-3xl font-bold font-headline">Gestão de Blog & Notícias</h1>
                            </div>
                            <p className="text-muted-foreground text-sm mt-1">
                                Crie, edite e gira publicações técnicas, comunicados, mailing list, comentários e estudos de caso públicos.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button variant="outline" asChild className="gap-1.5 text-xs">
                                <Link href="/blog" target="_blank">
                                    <ExternalLink className="h-3.5 w-3.5" /> Ver Blog Público
                                </Link>
                            </Button>
                            <Button variant="outline" asChild className="gap-1.5 text-xs">
                                <Link href="/blog/feed.xml" target="_blank">
                                    <Download className="h-3.5 w-3.5" /> Feed RSS
                                </Link>
                            </Button>
                            <Button asChild className="gap-1.5 text-xs">
                                <Link href="/admin/blog/edit/new">
                                    <Plus className="h-3.5 w-3.5" /> Novo Artigo
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Artigos</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold font-mono">{stats.total}</div>
                                <p className="text-[11px] text-muted-foreground">
                                    {stats.published} pub. • {stats.drafts} rasc.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Visualizações</CardTitle>
                                <Eye className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold font-mono text-primary">{stats.totalViews.toLocaleString('pt-AO')}</div>
                                <p className="text-[11px] text-muted-foreground">Leituras acumuladas</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Destaques</CardTitle>
                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold font-mono text-amber-600">{stats.featured}</div>
                                <p className="text-[11px] text-muted-foreground">Banners principais</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Newsletter</CardTitle>
                                <Mail className="h-4 w-4 text-emerald-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold font-mono text-emerald-600">{stats.totalSubscribers}</div>
                                <p className="text-[11px] text-muted-foreground">Subscritores ativos</p>
                            </CardContent>
                        </Card>

                        <Card className="col-span-2 sm:col-span-1">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Comentários</CardTitle>
                                <MessageSquare className="h-4 w-4 text-purple-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold font-mono text-purple-600">{stats.totalComments}</div>
                                <p className="text-[11px] text-muted-foreground">Interações de leitores</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="articles" className="space-y-6">
                        <TabsList className="bg-background border p-1">
                            <TabsTrigger value="articles" className="gap-1.5 text-xs">
                                <FileText className="h-4 w-4" /> Artigos Editoriais ({posts.length})
                            </TabsTrigger>
                            <TabsTrigger value="subscribers" className="gap-1.5 text-xs">
                                <Mail className="h-4 w-4" /> Subscritores Newsletter ({subscribers.length})
                            </TabsTrigger>
                            <TabsTrigger value="comments" className="gap-1.5 text-xs">
                                <MessageSquare className="h-4 w-4" /> Comentários & Moderação ({comments.length})
                            </TabsTrigger>
                        </TabsList>

                        {/* ══════════════════════════════════════════════════════════════════ */}
                        {/* TAB 1: ARTICLES                                                  */}
                        {/* ══════════════════════════════════════════════════════════════════ */}
                        <TabsContent value="articles" className="space-y-6">
                            <Card>
                                <CardHeader className="p-4 border-b">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Pesquisar por título, autor ou tag..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                                <SelectTrigger className="w-[160px]">
                                                    <SelectValue placeholder="Categoria" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todas Categorias</SelectItem>
                                                    {BlogCategories.map(cat => (
                                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                <SelectTrigger className="w-[150px]">
                                                    <SelectValue placeholder="Estado" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos Estados</SelectItem>
                                                    <SelectItem value="published">Publicados</SelectItem>
                                                    <SelectItem value="draft">Rascunhos</SelectItem>
                                                    <SelectItem value="featured">Destaques</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
                                                <Download className="h-3.5 w-3.5" /> CSV
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40">
                                                <TableHead className="w-[35%]">Título do Artigo</TableHead>
                                                <TableHead>Categoria</TableHead>
                                                <TableHead className="text-center">Destaque</TableHead>
                                                <TableHead className="text-center">Estado</TableHead>
                                                <TableHead className="text-center">Vistas</TableHead>
                                                <TableHead>Autor</TableHead>
                                                <TableHead>Data</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredPosts.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                                        Nenhum artigo encontrado com os filtros selecionados.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredPosts.map(post => (
                                                    <TableRow key={post.id} className="hover:bg-muted/40">
                                                        <TableCell>
                                                            <div className="font-semibold text-foreground leading-snug line-clamp-2">
                                                                {post.title}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                                                /{post.slug}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-xs">
                                                                {post.category || 'Geral'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleToggleFeatured(post)}
                                                                title="Alternar Destaque"
                                                            >
                                                                <Star className={`h-4 w-4 ${post.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/40'}`} />
                                                            </Button>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <button
                                                                onClick={() => handleTogglePublished(post)}
                                                                className="cursor-pointer focus:outline-none"
                                                                title="Clique para alternar estado"
                                                            >
                                                                <Badge variant={post.isPublished ? 'default' : 'secondary'} className={post.isPublished ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}>
                                                                    {post.isPublished ? 'Publicado' : 'Rascunho'}
                                                                </Badge>
                                                            </button>
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                            {post.views || 0}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {post.author?.displayName || 'Admin'}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {getFormattedDate(post.createdAt)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Ver no site">
                                                                    <Link href={`/blog/${post.slug}`} target="_blank">
                                                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                                                    </Link>
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Editar artigo">
                                                                    <Link href={`/admin/blog/edit/${post.id}`}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Link>
                                                                </Button>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Eliminar">
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Eliminar artigo permanentemente?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Esta ação não pode ser desfeita. O artigo "{post.title}" será removido do site.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleDeletePost(post.id)}>
                                                                                Eliminar
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ══════════════════════════════════════════════════════════════════ */}
                        {/* TAB 2: SUBSCRIBERS                                               */}
                        {/* ══════════════════════════════════════════════════════════════════ */}
                        <TabsContent value="subscribers" className="space-y-6">
                            <Card>
                                <CardHeader className="p-4 border-b">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Pesquisar por email ou origem..."
                                                value={subscriberSearch}
                                                onChange={(e) => setSubscriberSearch(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="px-3 py-1 text-xs">
                                                {subscribers.length} subscritores
                                            </Badge>
                                            <Button variant="outline" size="sm" onClick={handleExportSubscribersCsv} className="gap-1.5">
                                                <Download className="h-3.5 w-3.5" /> Exportar Mailing List (CSV)
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40">
                                                <TableHead>Email do Subscritor</TableHead>
                                                <TableHead>Origem</TableHead>
                                                <TableHead className="text-center">Estado</TableHead>
                                                <TableHead>Data de Subscrição</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredSubscribers.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                        Nenhum subscritor encontrado.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredSubscribers.map(sub => (
                                                    <TableRow key={sub.id}>
                                                        <TableCell className="font-semibold text-foreground">
                                                            {sub.email}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-xs">
                                                                {sub.source || 'Portal Blog'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={sub.status === 'active' ? 'bg-emerald-600 text-white text-xs' : 'bg-secondary text-xs'}>
                                                                {sub.status === 'active' ? 'Ativo' : 'Inativo'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {getFormattedDate(sub.subscribedAt)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Remover subscritor">
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Remover subscritor da lista?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            O email "{sub.email}" deixará de receber os comunicados e newsletters da plataforma.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDeleteSubscriber(sub.id)}>
                                                                            Remover
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ══════════════════════════════════════════════════════════════════ */}
                        {/* TAB 3: COMMENTS & MODERATION                                     */}
                        {/* ══════════════════════════════════════════════════════════════════ */}
                        <TabsContent value="comments" className="space-y-6">
                            <Card>
                                <CardHeader className="p-4 border-b">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Pesquisar por autor, empresa, artigo ou conteúdo..."
                                                value={commentSearch}
                                                onChange={(e) => setCommentSearch(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <Select value={commentStatusFilter} onValueChange={setCommentStatusFilter}>
                                                <SelectTrigger className="w-[150px]">
                                                    <SelectValue placeholder="Moderação" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos ({comments.length})</SelectItem>
                                                    <SelectItem value="approved">Aprovados</SelectItem>
                                                    <SelectItem value="hidden">Ocultados</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Button variant="outline" size="sm" onClick={handleExportCommentsCsv} className="gap-1.5">
                                                <Download className="h-3.5 w-3.5" /> Exportar CSV
                                            </Button>

                                            <Button variant="ghost" size="sm" onClick={fetchComments} title="Atualizar Comentários">
                                                <RefreshCw className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40">
                                                <TableHead className="w-[20%]">Artigo</TableHead>
                                                <TableHead className="w-[20%]">Autor & Organização</TableHead>
                                                <TableHead className="w-[35%]">Comentário</TableHead>
                                                <TableHead className="text-center">Gostos</TableHead>
                                                <TableHead className="text-center">Estado</TableHead>
                                                <TableHead>Data</TableHead>
                                                <TableHead className="text-right">Moderação</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredComments.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                                                        Nenhum comentário encontrado com os critérios aplicados.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredComments.map(comment => (
                                                    <TableRow key={comment.id} className="hover:bg-muted/40">
                                                        <TableCell>
                                                            <div className="font-semibold text-xs text-foreground line-clamp-1">
                                                                {comment.postTitle || 'Artigo'}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground font-mono">
                                                                ID: {comment.postId?.substring(0, 8)}...
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium text-xs text-foreground">
                                                                {comment.authorName}
                                                            </div>
                                                            {comment.authorCompany && (
                                                                <div className="text-[11px] text-muted-foreground">
                                                                    {comment.authorCompany}
                                                                </div>
                                                            )}
                                                            {comment.authorEmail && (
                                                                <div className="text-[10px] text-muted-foreground/80 font-mono">
                                                                    {comment.authorEmail}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <p className="text-xs text-foreground leading-relaxed line-clamp-3">
                                                                {comment.content}
                                                            </p>
                                                            {comment.replyToId && (
                                                                <span className="text-[10px] text-primary font-medium">
                                                                    ↳ Resposta a comentário anterior
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-xs">
                                                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                                <ThumbsUp className="h-3 w-3" />
                                                                {comment.likes || 0}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <button
                                                                onClick={() => handleToggleCommentApproval(comment)}
                                                                className="cursor-pointer focus:outline-none"
                                                                title="Clique para alternar moderação"
                                                            >
                                                                <Badge
                                                                    variant={comment.isApproved ? 'default' : 'secondary'}
                                                                    className={comment.isApproved ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs' : 'bg-amber-600/20 text-amber-800 dark:text-amber-300 text-xs'}
                                                                >
                                                                    {comment.isApproved ? 'Aprovado' : 'Ocultado'}
                                                                </Badge>
                                                            </button>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {getFormattedDate(comment.createdAt)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={() => handleToggleCommentApproval(comment)}
                                                                        >
                                                                            {comment.isApproved ? (
                                                                                <X className="h-4 w-4 text-amber-600" />
                                                                            ) : (
                                                                                <Check className="h-4 w-4 text-emerald-600" />
                                                                            )}
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        {comment.isApproved ? 'Ocultar comentário' : 'Aprovar comentário'}
                                                                    </TooltipContent>
                                                                </Tooltip>

                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Eliminar permanentemente">
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Eliminar comentário?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Esta ação eliminará o comentário de {comment.authorName} permanentemente.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleDeleteComment(comment)}>
                                                                                Eliminar
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </TooltipProvider>
            </main>
        </div>
    );
}
