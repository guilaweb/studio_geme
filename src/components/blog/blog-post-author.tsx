'use client';

import React from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ShieldCheck, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BlogPostAuthorProps {
    fallbackAuthor?: {
        uid?: string;
        displayName?: string;
        role?: string;
        avatarUrl?: string;
    };
    date?: any;
}

export function BlogPostAuthor({ fallbackAuthor, date }: BlogPostAuthorProps) {
    const { user: activeUser } = useAuth();

    // The active user with the currently active account takes precedence
    const authorName = activeUser?.displayName 
        || (activeUser?.email ? activeUser.email.split('@')[0] : null) 
        || fallbackAuthor?.displayName 
        || 'Utilizador Activo';

    const authorRole = activeUser?.jobTitle 
        || (activeUser?.role === 'super-admin' ? 'Diretor Técnico & Autor' : activeUser?.role)
        || fallbackAuthor?.role 
        || 'Autor Técnico';

    const avatarUrl = activeUser?.photoURL || fallbackAuthor?.avatarUrl;
    const initials = authorName.substring(0, 2).toUpperCase();

    // Format date safely
    let formattedDate = 'Recentemente';
    if (date) {
        try {
            const d = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date));
            formattedDate = format(d, "dd 'de' MMMM, yyyy", { locale: ptBR });
        } catch {
            formattedDate = 'Recentemente';
        }
    }

    return (
        <div className="flex items-center gap-3">
            <div className="relative">
                {avatarUrl ? (
                    <div className="relative h-11 w-11 rounded-full overflow-hidden border-2 border-primary/30 shadow-xs">
                        <Image
                            src={avatarUrl}
                            alt={authorName}
                            fill
                            className="object-cover"
                        />
                    </div>
                ) : (
                    <div className="h-11 w-11 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center font-bold text-primary text-sm shadow-xs">
                        {initials}
                    </div>
                )}
                {activeUser && (
                    <span 
                        title="Conta Activa" 
                        className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center text-[9px] text-white font-black"
                    >
                        ✓
                    </span>
                )}
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{authorName}</span>
                    {activeUser && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800 font-medium gap-1">
                            <UserCheck className="h-2.5 w-2.5" /> Conta Activa
                        </Badge>
                    )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span>{authorRole}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formattedDate}
                    </span>
                </div>
            </div>
        </div>
    );
}
