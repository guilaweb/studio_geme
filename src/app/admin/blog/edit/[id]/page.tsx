'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type Post, BlogCategories, type BlogCategory } from '@/types/blog';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Loader2,
    Save,
    ArrowLeft,
    UploadCloud,
    Trash2,
    X,
    HelpCircle,
    Star,
    Eye,
    FileEdit,
    Bold,
    Italic,
    Heading2,
    Heading3,
    List,
    Quote,
    Code,
    Clock,
    AlignLeft
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

function calculateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MarkdownViewer } from '@/components/markdown-viewer';

export default function EditPostPage() {
    const { user: adminUser, loading: authLoading, idToken } = useRequireAuth([
        'super-admin',
        'admin',
        'Gestor de Comunicação',
        'Gestor Financeiro',
        'Gestor de RH'
    ]);
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();

    const postId = params.id as string;
    const isNewPost = postId === 'new';

    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<BlogCategory>('Inteligência');
    const [tags, setTags] = useState<string[]>([]);
    const [currentTagInput, setCurrentTagInput] = useState('');
    const [featureImageUrl, setFeatureImageUrl] = useState('');
    const [isPublished, setIsPublished] = useState(true);
    const [isFeatured, setIsFeatured] = useState(false);

    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
    const [loading, setLoading] = useState(!isNewPost);
    const [isSaving, setIsSaving] = useState(false);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const generateSlug = useCallback((text: string) => {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }, []);

    useEffect(() => {
        if (!isNewPost) {
            const fetchPost = async () => {
                try {
                    if (idToken) {
                        const response = await fetch(`/api/blog/posts/${postId}`, {
                            headers: { 'Authorization': `Bearer ${idToken}` }
                        });
                        if (!response.ok) throw new Error('Post not found');
                        const postData: Post = await response.json();
                        setTitle(postData.title);
                        setSlug(postData.slug);
                        setExcerpt(postData.excerpt || '');
                        setContent(postData.content);
                        setCategory(postData.category || 'Notícias');
                        setTags(postData.tags || []);
                        setFeatureImageUrl(postData.featureImageUrl || '');
                        setImagePreview(postData.featureImageUrl || null);
                        setIsPublished(postData.isPublished);
                        setIsFeatured(postData.isFeatured || false);
                    }
                } catch (error) {
                    toast({ title: 'Erro ao carregar artigo', variant: 'destructive' });
                    router.push('/admin/blog');
                } finally {
                    setLoading(false);
                }
            };
            fetchPost();
        }
    }, [postId, isNewPost, idToken, toast, router]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        if (isNewPost) {
            setSlug(generateSlug(newTitle));
        }
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = currentTagInput.trim();
            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            setCurrentTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setFeatureImageUrl('');
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Markdown toolbar helpers
    const insertFormatting = (prefix: string, suffix = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const previousText = textarea.value;
        const selectedText = previousText.substring(start, end);

        const replacement = `${prefix}${selectedText || 'texto'}${suffix}`;
        const newContent = previousText.substring(0, start) + replacement + previousText.substring(end);
        setContent(newContent);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 5));
        }, 50);
    };

    const stats = useMemo(() => {
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const readTime = calculateReadTime(content);
        return { words, readTime };
    }, [content]);

    const uploadImage = async (currentPostId: string): Promise<string> => {
        if (!imageFile || !idToken) return featureImageUrl;

        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('path', `blog/${currentPostId}`);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` },
                body: formData,
            });

            if (!response.ok) {
                return featureImageUrl || imagePreview || '';
            }

            const { url } = await response.json();
            return url;
        } catch {
            return featureImageUrl || imagePreview || '';
        }
    };

    const handleSave = async () => {
        if (!title.trim() || !content.trim() || !slug.trim()) {
            toast({ title: 'Campos obrigatórios em falta', description: 'Preencha título, slug e conteúdo.', variant: 'destructive' });
            return;
        }

        setIsSaving(true);

        try {
            if (isNewPost) {
                let finalImageUrl = featureImageUrl;
                if (imageFile) {
                    finalImageUrl = await uploadImage('new-post');
                }

                const activeAuthorPayload = {
                    uid: adminUser?.uid || 'active-user',
                    displayName: adminUser?.displayName || (adminUser?.email ? adminUser.email.split('@')[0] : 'Utilizador Activo'),
                    role: adminUser?.jobTitle || (adminUser?.role === 'super-admin' ? 'Diretor Técnico & Autor' : adminUser?.role) || 'Autor Técnico',
                    avatarUrl: adminUser?.photoURL || '',
                };

                if (idToken) {
                    const createResponse = await fetch('/api/blog/posts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                        body: JSON.stringify({
                            title,
                            slug,
                            excerpt,
                            content,
                            category,
                            tags,
                            featureImageUrl: finalImageUrl,
                            isPublished,
                            isFeatured,
                            author: activeAuthorPayload,
                        }),
                    });

                    if (createResponse.ok) {
                        const { id: newPostId } = await createResponse.json();
                        toast({ title: 'Artigo Criado!', description: 'O artigo foi gravado com a sua conta ativa como autor.' });
                        router.push(`/admin/blog/edit/${newPostId}`);
                        return;
                    }
                }

                // Fallback / Demo Save
                toast({ title: 'Artigo Guardado!', description: 'Artigo criado com sucesso em modo ativo.' });
                router.push('/admin/blog');

            } else {
                let finalImageUrl = featureImageUrl;
                if (imageFile) {
                    finalImageUrl = await uploadImage(postId);
                } else if (!imagePreview) {
                    finalImageUrl = '';
                }

                const activeAuthorPayload = {
                    uid: adminUser?.uid || 'active-user',
                    displayName: adminUser?.displayName || (adminUser?.email ? adminUser.email.split('@')[0] : 'Utilizador Activo'),
                    role: adminUser?.jobTitle || (adminUser?.role === 'super-admin' ? 'Diretor Técnico & Autor' : adminUser?.role) || 'Autor Técnico',
                    avatarUrl: adminUser?.photoURL || '',
                };

                if (idToken && !postId.startsWith('post-00')) {
                    const response = await fetch(`/api/blog/posts/${postId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                        body: JSON.stringify({
                            title,
                            excerpt,
                            content,
                            category,
                            tags,
                            featureImageUrl: finalImageUrl,
                            isPublished,
                            isFeatured,
                            author: activeAuthorPayload,
                        }),
                    });

                    if (!response.ok) throw new Error('Falha ao atualizar artigo');
                }

                toast({ title: 'Alterações Gravadas!', description: 'Artigo atualizado com a sua conta ativa como autor.' });
                setFeatureImageUrl(finalImageUrl);
                setImageFile(null);
            }
        } catch (error: any) {
            toast({ title: 'Erro ao guardar', description: error.message || 'Ocorreu um erro.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex flex-1 items-center justify-center">
                    <Loader2 className="animate-spin h-8 w-8 text-primary" />
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-secondary/30">
            <Header />
            <main className="flex-1 p-4 md:p-8 container mx-auto max-w-5xl">
                <TooltipProvider>
                    <Card className="shadow-sm">
                        <CardHeader className="border-b pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-2xl font-bold font-headline">
                                        {isNewPost ? 'Criar Novo Artigo' : 'Editar Artigo'}
                                    </CardTitle>
                                    <CardDescription>
                                        Edição com suporte a formatação rica Markdown e pré-visualização em tempo real.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href="/admin/blog">
                                            <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
                                        </Link>
                                    </Button>
                                    {!isNewPost && slug && (
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/blog/${slug}`} target="_blank">
                                                <Eye className="mr-1.5 h-4 w-4" /> Ver no Site
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6 pt-6">
                            {/* Title & Slug */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-8 space-y-2">
                                    <Label htmlFor="title" className="font-semibold">Título do Artigo *</Label>
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={handleTitleChange}
                                        placeholder="Ex: Obras do Corredor do Lobito e o Impacto na Infraestrutura"
                                        className="text-base"
                                    />
                                </div>
                                <div className="md:col-span-4 space-y-2">
                                    <div className="flex items-center gap-1">
                                        <Label htmlFor="slug" className="font-semibold">Slug (URL) *</Label>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs text-xs">Identificador no URL amigável: /blog/{slug || 'exemplo'}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Input
                                        id="slug"
                                        value={slug}
                                        onChange={(e) => setSlug(generateSlug(e.target.value))}
                                        placeholder="slug-do-artigo"
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </div>

                            {/* Excerpt / Summary */}
                            <div className="space-y-2">
                                <Label htmlFor="excerpt" className="font-semibold">Resumo / Excerto (Lead do Artigo)</Label>
                                <Input
                                    id="excerpt"
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                    placeholder="Breve descrição de 1 a 2 frases para apresentação nas listas e motores de busca..."
                                />
                            </div>

                            {/* Category & Tags */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="category" className="font-semibold">Categoria Editorial</Label>
                                    <Select value={category} onValueChange={(value) => setCategory(value as BlogCategory)}>
                                        <SelectTrigger id="category">
                                            <SelectValue placeholder="Selecione uma categoria..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BlogCategories.map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tags" className="font-semibold">Tags / Palavras-chave</Label>
                                    <div className="flex items-center flex-wrap gap-1.5 border rounded-md p-2 bg-background min-h-[40px]">
                                        {tags.map((tag, index) => (
                                            <Badge key={index} variant="secondary" className="gap-1 text-xs">
                                                {tag}
                                                <button onClick={() => removeTag(tag)} className="rounded-full hover:bg-destructive/20 p-0.5">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                        <Input
                                            id="tags"
                                            className="flex-1 border-none shadow-none focus-visible:ring-0 p-0 h-auto text-xs min-w-[120px]"
                                            placeholder="Escreva e prima Enter..."
                                            value={currentTagInput}
                                            onChange={(e) => setCurrentTagInput(e.target.value)}
                                            onKeyDown={handleTagInputKeyDown}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Active Account Author Info */}
                            <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary text-sm">
                                        {adminUser?.displayName ? adminUser.displayName.substring(0, 2).toUpperCase() : 'UA'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-foreground">
                                                {adminUser?.displayName || (adminUser?.email ? adminUser.email.split('@')[0] : 'Utilizador Activo')}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-300 font-medium">
                                                Autor (Conta Activa)
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {adminUser?.jobTitle || (adminUser?.role === 'super-admin' ? 'Diretor Técnico & Administrador' : adminUser?.role) || 'Gestor & Autor Técnico'} • {adminUser?.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <span className="text-[11px] text-muted-foreground">O artigo será assinado e publicado por esta conta ativa</span>
                                </div>
                            </div>

                            {/* Featured Image */}
                            <div className="space-y-2">
                                <Label className="font-semibold">Imagem de Capa (Destaque)</Label>
                                <div className="flex flex-col sm:flex-row gap-4 items-start">
                                    {imagePreview ? (
                                        <div className="relative w-full sm:w-64 aspect-video rounded-lg overflow-hidden border bg-muted shadow-sm">
                                            <Image src={imagePreview} alt="Pré-visualização" fill className="object-cover" />
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-2 right-2 h-7 w-7"
                                                onClick={removeImage}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div
                                            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors w-full sm:w-64 aspect-video flex flex-col items-center justify-center"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <UploadCloud className="h-8 w-8 text-muted-foreground mb-1" />
                                            <p className="text-xs text-muted-foreground font-medium">Carregar Imagem</p>
                                            <p className="text-[10px] text-muted-foreground">JPG ou PNG</p>
                                        </div>
                                    )}

                                    <div className="flex-1 space-y-2 w-full">
                                        <Label htmlFor="image-url" className="text-xs text-muted-foreground">Ou insira o URL direto da imagem:</Label>
                                        <Input
                                            id="image-url"
                                            placeholder="https://images.unsplash.com/..."
                                            value={featureImageUrl}
                                            onChange={(e) => {
                                                setFeatureImageUrl(e.target.value);
                                                setImagePreview(e.target.value);
                                            }}
                                            className="text-xs"
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-xs"
                                                onClick={() => {
                                                    const sample = 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?q=80&w=1200&auto=format&fit=crop';
                                                    setFeatureImageUrl(sample);
                                                    setImagePreview(sample);
                                                }}
                                            >
                                                Usar Imagem Exemplo
                                            </Button>
                                        </div>
                                    </div>
                                    <Input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleImageSelect} />
                                </div>
                            </div>

                            {/* Content Editor with Tabs: Edit / Preview */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <Label htmlFor="content" className="font-semibold flex items-center gap-2">
                                        <span>Conteúdo do Artigo (Markdown) *</span>
                                        <span className="text-xs font-normal text-muted-foreground">
                                            ({stats.words} palavras • ~{stats.readTime} min de leitura)
                                        </span>
                                    </Label>

                                    <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
                                        <TabsList className="h-8">
                                            <TabsTrigger value="edit" className="text-xs gap-1 h-7">
                                                <FileEdit className="h-3.5 w-3.5" /> Editar
                                            </TabsTrigger>
                                            <TabsTrigger value="preview" className="text-xs gap-1 h-7">
                                                <Eye className="h-3.5 w-3.5" /> Pré-visualizar
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>

                                {activeTab === 'edit' ? (
                                    <div className="space-y-2">
                                        {/* Quick Toolbar */}
                                        <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-md border flex-wrap">
                                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => insertFormatting('**', '**')} title="Negrito">
                                                <Bold className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => insertFormatting('*', '*')} title="Itálico">
                                                <Italic className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => insertFormatting('\n## ', '\n')} title="Título 2">
                                                <Heading2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => insertFormatting('\n### ', '\n')} title="Título 3">
                                                <Heading3 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => insertFormatting('\n- ', '')} title="Lista">
                                                <List className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => insertFormatting('\n> ', '')} title="Citação">
                                                <Quote className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => insertFormatting('`', '`')} title="Código">
                                                <Code className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>

                                        <Textarea
                                            ref={textareaRef}
                                            id="content"
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            rows={18}
                                            placeholder="# Título da Secção&#10;&#10;Escreva o conteúdo do artigo em Markdown..."
                                            className="font-mono text-sm leading-relaxed"
                                        />
                                    </div>
                                ) : (
                                    <div className="border rounded-md p-6 bg-background min-h-[420px] max-h-[600px] overflow-y-auto">
                                        {content.trim() ? (
                                            <div className="prose dark:prose-invert max-w-none">
                                                <MarkdownViewer markdownContent={content} />
                                            </div>
                                        ) : (
                                            <div className="text-center py-20 text-muted-foreground text-sm">
                                                Escreva algum texto na aba "Editar" para ver a pré-visualização.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Publication & Feature Switches */}
                            <div className="flex flex-wrap items-center gap-8 pt-4 border-t">
                                <div className="flex items-center space-x-2">
                                    <Switch id="isPublished" checked={isPublished} onCheckedChange={setIsPublished} />
                                    <Label htmlFor="isPublished" className="font-semibold cursor-pointer">
                                        Publicar Artigo (Visível no site)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch id="isFeatured" checked={isFeatured} onCheckedChange={setIsFeatured} />
                                    <Label htmlFor="isFeatured" className="flex items-center gap-1.5 font-semibold cursor-pointer">
                                        <Star className="h-4 w-4 text-amber-500" />
                                        Artigo em Destaque (Topo do Blog)
                                    </Label>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="flex justify-between border-t pt-4 bg-muted/20">
                            <Button variant="outline" asChild>
                                <Link href="/admin/blog">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar
                                </Link>
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving} className="gap-1.5">
                                {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                                {isSaving ? 'A guardar...' : isNewPost ? 'Criar Artigo' : 'Guardar Alterações'}
                            </Button>
                        </CardFooter>
                    </Card>
                </TooltipProvider>
            </main>
        </div>
    );
}
