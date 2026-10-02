'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Check, Copy, MessageCircle, Linkedin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PostActionsProps {
    title: string;
    slug: string;
}

export function PostActions({ title, slug }: PostActionsProps) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const getFullUrl = () => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/blog/${slug}`;
        }
        return `https://profundidade.app/blog/${slug}`;
    };

    const handleCopyLink = () => {
        const url = getFullUrl();
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast({
            title: 'Link copiado!',
            description: 'O link do artigo foi copiado para a sua área de transferência.',
        });
        setTimeout(() => setCopied(false), 3000);
    };

    const handleShareWhatsapp = () => {
        const url = getFullUrl();
        const text = encodeURIComponent(`Veja este artigo no Blog da Profundidade: "${title}" - ${url}`);
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    const handleShareLinkedin = () => {
        const url = getFullUrl();
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium mr-1 flex items-center gap-1">
                <Share2 className="h-3.5 w-3.5" /> Partilhar:
            </span>

            <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsapp}
                className="h-8 px-2.5 gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={handleShareLinkedin}
                className="h-8 px-2.5 gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
                <Linkedin className="h-3.5 w-3.5" />
                <span>LinkedIn</span>
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="h-8 px-2.5 gap-1.5 text-xs"
            >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar Link'}</span>
            </Button>
        </div>
    );
}
