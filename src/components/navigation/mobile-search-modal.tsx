'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  X,
  FolderKanban,
  Briefcase,
  Users,
  CheckSquare,
  FileText,
  Building2,
  ArrowRight,
  Loader2,
  Clock,
  Sparkles
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { type Project } from '@/types/project';

interface MobileSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'projetos' | 'crm' | 'equipa' | 'tarefas';
  badge: string;
  url: string;
}

export function MobileSearchModal({ open, onOpenChange }: MobileSearchModalProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'projetos' | 'crm' | 'equipa' | 'tarefas'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);
  const [cachedData, setCachedData] = useState<{
    projects: SearchItem[];
    crm: SearchItem[];
    team: SearchItem[];
  }>({ projects: [], crm: [], team: [] });

  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-load essential searchable entities when modal opens
  useEffect(() => {
    if (!open || !user) return;

    let isMounted = true;
    const loadSearchCache = async () => {
      setIsLoading(true);
      try {
        const [projSnap, oppSnap, userSnap] = await Promise.all([
          getDocs(query(collection(db, 'projects'), limit(30))),
          getDocs(query(collection(db, 'opportunities'), limit(25))),
          getDocs(query(collection(db, 'users'), limit(30)))
        ]);

        if (!isMounted) return;

        const projItems: SearchItem[] = projSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            title: data.name || 'Projeto sem nome',
            subtitle: `${data.clientName || 'Cliente'} • ${Math.round(data.progress || 0)}% Concluído`,
            category: 'projetos',
            badge: data.status || 'Ativo',
            url: `/projects/${d.id}`
          };
        });

        const crmItems: SearchItem[] = oppSnap.docs.map(d => {
          const data = d.data();
          const valFormatted = data.value ? `${new Intl.NumberFormat('pt-AO').format(data.value)} Kz` : 'Sem valor';
          return {
            id: d.id,
            title: data.name || 'Oportunidade',
            subtitle: `${data.accountName || 'Cliente'} • ${valFormatted}`,
            category: 'crm',
            badge: data.stage || 'Pipeline',
            url: `/crm?tab=funnel`
          };
        });

        const teamItems: SearchItem[] = userSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            title: data.displayName || data.email || 'Membro',
            subtitle: `${data.jobTitle || 'Técnico'} • ${data.department || 'Engenharia'}`,
            category: 'equipa',
            badge: data.role || 'Colaborador',
            url: `/team`
          };
        });

        setCachedData({
          projects: projItems,
          crm: crmItems,
          team: teamItems
        });
      } catch (err) {
        console.warn('Erro ao carregar índice de pesquisa móvel:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSearchCache();
    return () => { isMounted = false; };
  }, [open, user]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setSearchQuery('');
    }
  }, [open]);

  // Filter items based on user typing and active category
  const filteredResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const all = [...cachedData.projects, ...cachedData.crm, ...cachedData.team];

    let filtered = all;
    if (activeCategory !== 'all') {
      filtered = filtered.filter(item => item.category === activeCategory);
    }

    if (!q) {
      return filtered.slice(0, 10);
    }

    return filtered.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.badge.toLowerCase().includes(q)
    );
  }, [searchQuery, activeCategory, cachedData]);

  const handleSelect = (url: string) => {
    onOpenChange(false);
    router.push(url);
  };

  const getCategoryIcon = (cat: SearchItem['category']) => {
    switch (cat) {
      case 'projetos':
        return <FolderKanban className="h-4 w-4 text-primary" />;
      case 'crm':
        return <Briefcase className="h-4 w-4 text-emerald-600" />;
      case 'equipa':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'tarefas':
        return <CheckSquare className="h-4 w-4 text-amber-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-lg p-0 top-6 translate-y-0 rounded-2xl overflow-hidden border shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Pesquisa Global do Profundidade</DialogTitle>
        </DialogHeader>

        {/* Input Bar */}
        <div className="flex items-center px-3.5 py-2.5 border-b bg-muted/20">
          <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Procurar projetos, clientes, pessoas..."
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-base h-10 px-0"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground touch-target-44 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b overflow-x-auto touch-scroll-horizontal bg-background">
          <Button
            size="sm"
            variant={activeCategory === 'all' ? 'default' : 'ghost'}
            className="h-7 text-xs rounded-full px-2.5"
            onClick={() => setActiveCategory('all')}
          >
            Todos
          </Button>
          <Button
            size="sm"
            variant={activeCategory === 'projetos' ? 'default' : 'ghost'}
            className="h-7 text-xs rounded-full px-2.5 gap-1"
            onClick={() => setActiveCategory('projetos')}
          >
            <FolderKanban className="h-3 w-3" /> Projetos
          </Button>
          <Button
            size="sm"
            variant={activeCategory === 'crm' ? 'default' : 'ghost'}
            className="h-7 text-xs rounded-full px-2.5 gap-1"
            onClick={() => setActiveCategory('crm')}
          >
            <Briefcase className="h-3 w-3" /> CRM
          </Button>
          <Button
            size="sm"
            variant={activeCategory === 'equipa' ? 'default' : 'ghost'}
            className="h-7 text-xs rounded-full px-2.5 gap-1"
            onClick={() => setActiveCategory('equipa')}
          >
            <Users className="h-3 w-3" /> Equipa
          </Button>
        </div>

        {/* Results List */}
        <ScrollArea className="max-h-[60vh] p-2">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">A carregar índice de pesquisa...</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-1.5">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">Nenhum resultado encontrado</p>
              <p className="text-xs text-muted-foreground/80">Tente outros termos ou remova os filtros.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {!searchQuery && (
                <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" /> Sugestões & Ativos Recentes
                </div>
              )}
              {filteredResults.map((item) => (
                <div
                  key={`${item.category}-${item.id}`}
                  onClick={() => handleSelect(item.url)}
                  className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/50 active:bg-muted transition-colors cursor-pointer touch-target-44"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 border border-border/50">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge variant="outline" className="text-[10px] py-0 font-normal">
                      {item.badge}
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
