'use client';

import React, { useMemo } from 'react';
import { ListTree, ChevronRight } from 'lucide-react';

interface PostTocProps {
    content: string;
}

interface TocItem {
    id: string;
    text: string;
    level: 2 | 3;
}

export function PostToc({ content }: PostTocProps) {
    const tocItems = useMemo(() => {
        const lines = content.split('\n');
        const items: TocItem[] = [];

        for (const line of lines) {
            const h2Match = line.match(/^##\s+(.+)$/);
            if (h2Match) {
                const text = h2Match[1].trim().replace(/[*_`]/g, '');
                const id = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                items.push({ id, text, level: 2 });
                continue;
            }

            const h3Match = line.match(/^###\s+(.+)$/);
            if (h3Match) {
                const text = h3Match[1].trim().replace(/[*_`]/g, '');
                const id = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                items.push({ id, text, level: 3 });
            }
        }

        return items;
    }, [content]);

    if (tocItems.length < 2) return null;

    const scrollToHeading = (id: string) => {
        // Try finding by text or id in DOM
        const element = document.getElementById(id) || Array.from(document.querySelectorAll('h2, h3')).find(el => {
            const cleanText = (el.textContent || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            return cleanText === id;
        });

        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="p-4 rounded-xl bg-secondary/50 border border-border/80 my-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                <ListTree className="h-4 w-4 text-primary" /> Índice de Conteúdos
            </h4>
            <nav className="space-y-1.5">
                {tocItems.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => scrollToHeading(item.id)}
                        className={`block text-left text-xs text-foreground/80 hover:text-primary transition-colors cursor-pointer w-full truncate ${
                            item.level === 3 ? 'pl-4 text-[11px] text-muted-foreground' : 'font-medium'
                        }`}
                    >
                        <span className="flex items-center gap-1">
                            <ChevronRight className="h-3 w-3 text-primary/60 flex-shrink-0" />
                            <span className="truncate">{item.text}</span>
                        </span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
