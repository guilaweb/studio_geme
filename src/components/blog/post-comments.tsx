'use client';

import React, { useState, useEffect } from 'react';
import { PostComment } from '@/types/blog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ThumbsUp, Send, CheckCircle2, CornerDownRight, User, Loader2, Reply, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface PostCommentsProps {
    postId: string;
    initialComments?: PostComment[];
}

export function PostComments({ postId, initialComments = [] }: PostCommentsProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [comments, setComments] = useState<PostComment[]>(initialComments);
    const [name, setName] = useState(user?.displayName || '');
    const [company, setCompany] = useState('');
    const [commentText, setCommentText] = useState('');
    const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch latest comments on mount or sync with initialComments
    useEffect(() => {
        if (postId) {
            fetch(`/api/blog/posts/${postId}/comments`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data) && data.length > 0) {
                        setComments(data);
                    }
                })
                .catch(err => console.warn('Could not load comments:', err));
        }
    }, [postId]);

    // Keep name in sync with user if logged in
    useEffect(() => {
        if (user?.displayName && !name) {
            setName(user.displayName);
        }
    }, [user, name]);

    const handleLike = async (commentId: string) => {
        if (likedIds.has(commentId)) return;

        // Optimistic UI update
        setLikedIds(prev => new Set(prev).add(commentId));
        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                return { ...c, likes: (c.likes || 0) + 1 };
            }
            return c;
        }));

        try {
            await fetch(`/api/blog/posts/${postId}/comments`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commentId, action: 'like' }),
            });
        } catch (err) {
            console.warn('Error saving comment like:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();
        const trimmedContent = commentText.trim();

        if (!trimmedName || !trimmedContent) {
            toast({
                title: 'Campos obrigatórios',
                description: 'Por favor, preencha o seu nome e o texto do comentário.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/blog/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    authorName: trimmedName,
                    authorCompany: company.trim() || undefined,
                    authorEmail: user?.email || undefined,
                    content: trimmedContent,
                    replyToId: replyTo?.id || null,
                }),
            });

            const data = await res.json();

            if (res.ok && data.comment) {
                setComments(prev => [...prev, data.comment]);
                setCommentText('');
                setReplyTo(null);
                toast({
                    title: 'Comentário publicado!',
                    description: 'O seu comentário foi registado com sucesso na discussão técnica.',
                });
            } else {
                toast({
                    title: 'Erro ao publicar',
                    description: data.error || 'Não foi possível gravar o seu comentário.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Erro de conexão',
                description: 'Verifique a ligação à internet e tente novamente.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (date: any) => {
        if (!date) return '-';
        try {
            const d = date?.toDate ? date.toDate() : new Date(date);
            return format(d, "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR });
        } catch {
            return '-';
        }
    };

    // Separate parent comments and replies
    const parentComments = comments.filter(c => !c.replyToId);
    const repliesMap = comments.filter(c => !!c.replyToId).reduce<Record<string, PostComment[]>>((acc, r) => {
        if (!acc[r.replyToId!]) acc[r.replyToId!] = [];
        acc[r.replyToId!].push(r);
        return acc;
    }, {});

    return (
        <section className="space-y-8 pt-8 border-t">
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold font-headline flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-primary" />
                    Discussão Técnica & Comentários ({comments.length})
                </h3>
            </div>

            {/* Comment Form */}
            <Card className="border-border/80 bg-card shadow-sm">
                <CardHeader className="p-5 pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold">
                                {replyTo ? `Responder a ${replyTo.authorName}` : 'Partilhe a sua perspetiva técnica'}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {replyTo 
                                    ? 'A sua resposta será associada ao comentário selecionado.' 
                                    : 'Deixe a sua opinião, dúvida ou experiência prática sobre o tema deste artigo.'
                                }
                            </CardDescription>
                        </div>
                        {replyTo && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setReplyTo(null)} 
                                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" /> Cancelar resposta
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="comm-name" className="text-xs font-medium">Nome Completo *</Label>
                                <Input
                                    id="comm-name"
                                    placeholder="Ex: Eng. Afonso Cruz"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-9 text-xs"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="comm-company" className="text-xs font-medium">Empresa / Instituição (Opcional)</Label>
                                <Input
                                    id="comm-company"
                                    placeholder="Ex: Construtora Luanda Sul / INEA"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    className="h-9 text-xs"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="comm-text" className="text-xs font-medium">Comentário *</Label>
                            <Textarea
                                id="comm-text"
                                placeholder={replyTo ? `Responder a ${replyTo.authorName}...` : "Escreva o seu comentário ou observação técnica..."}
                                rows={3}
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                className="text-xs resize-none"
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5 text-xs">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> A publicar...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-3.5 w-3.5" /> Publicar Comentário
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Comments List */}
            {parentComments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm border rounded-xl border-dashed">
                    Seja o primeiro a comentar este artigo!
                </div>
            ) : (
                <div className="space-y-4">
                    {parentComments.map((comment) => (
                        <div key={comment.id} className="space-y-3">
                            {/* Parent comment */}
                            <div className="p-4 rounded-xl bg-card border border-border/70 space-y-2 hover:border-border transition-colors">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary">
                                            {comment.authorName.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-xs text-foreground mr-2">
                                                {comment.authorName}
                                            </span>
                                            {comment.authorCompany && (
                                                <Badge variant="outline" className="text-[10px] font-normal py-0">
                                                    {comment.authorCompany}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">
                                        {formatDate(comment.createdAt)}
                                    </span>
                                </div>

                                <p className="text-xs text-foreground/90 leading-relaxed pl-10">
                                    {comment.content}
                                </p>

                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setReplyTo({ id: comment.id, authorName: comment.authorName })}
                                        className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                                    >
                                        <Reply className="h-3 w-3" />
                                        <span>Responder</span>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleLike(comment.id)}
                                        className={`h-7 px-2 text-[11px] gap-1 ${likedIds.has(comment.id) ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-primary'}`}
                                    >
                                        <ThumbsUp className="h-3 w-3" />
                                        <span>{comment.likes || 0}</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Replies (if any) */}
                            {repliesMap[comment.id]?.map((reply) => (
                                <div key={reply.id} className="ml-8 p-3 rounded-xl bg-secondary/50 border border-border/60 space-y-1.5 flex items-start gap-2.5">
                                    <CornerDownRight className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between flex-wrap gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-xs text-foreground">
                                                    {reply.authorName}
                                                </span>
                                                {reply.authorCompany && (
                                                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] py-0">
                                                        {reply.authorCompany}
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                                {formatDate(reply.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-foreground/90 leading-relaxed">
                                            {reply.content}
                                        </p>
                                        <div className="flex justify-end pt-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleLike(reply.id)}
                                                className={`h-6 px-1.5 text-[10px] gap-1 ${likedIds.has(reply.id) ? 'text-primary font-semibold' : 'text-muted-foreground'}`}
                                            >
                                                <ThumbsUp className="h-2.5 w-2.5" />
                                                <span>{reply.likes || 0}</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
