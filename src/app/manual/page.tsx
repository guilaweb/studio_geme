'use client';

import React, { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { 
  BookOpen, 
  Search, 
  Printer, 
  ChevronRight, 
  ShieldCheck, 
  Cpu, 
  GanttChart, 
  Wallet, 
  Truck, 
  Layers, 
  Route, 
  HeartPulse, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Sparkles,
  ExternalLink,
  BookMarked,
  Users,
  Briefcase,
  Building,
  Building2,
  HardHat,
  Calculator,
  ClipboardCheck,
  MapPin,
  Gem,
  ShoppingCart,
  Package,
  FolderArchive,
  Smartphone,
  BarChart3,
  Wrench,
  Compass,
  Paintbrush,
  FolderCheck,
  Pickaxe,
  ShieldAlert,
  ArrowRight,
  Filter
} from 'lucide-react';
import { 
  ALL_MANUAL_PARTS, 
  ALL_MANUAL_CHAPTERS, 
  USER_PROFILES_LIST, 
  ManualPartId, 
  ManualChapter 
} from '@/lib/manual-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Icon resolver
const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen,
  Compass,
  Cpu,
  ShieldAlert,
  Building,
  Building2,
  Briefcase,
  HardHat,
  GanttChart,
  Calculator,
  ClipboardCheck,
  MapPin,
  Gem,
  Truck,
  ShoppingCart,
  Package,
  HeartPulse,
  Wallet,
  FolderArchive,
  Smartphone,
  ExternalLink,
  Route,
  Pickaxe,
  Paintbrush,
  FolderCheck,
  BarChart3,
  Lock,
  Wrench,
  BookMarked,
  Users,
  Layers,
  ShieldCheck,
  TrendingUp,
};

export default function ManualPage() {
  const [activePartId, setActivePartId] = useState<ManualPartId>('part-1');
  const [activeChapterId, setActiveChapterId] = useState<string>('p1-sobre');
  const [selectedProfile, setSelectedProfile] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Current active part
  const activePart = useMemo(() => {
    return ALL_MANUAL_PARTS.find(p => p.id === activePartId) || ALL_MANUAL_PARTS[0];
  }, [activePartId]);

  // Filtered chapters based on search, active part, and profile
  const filteredChapters = useMemo(() => {
    let chapters = activePart.chapters;

    // Filter by user profile if selected
    if (selectedProfile !== 'Todos') {
      chapters = ALL_MANUAL_CHAPTERS.filter(c => {
        if (!c.relevantProfiles) return false;
        return c.relevantProfiles.includes('Todos') || c.relevantProfiles.includes(selectedProfile);
      });
    }

    // Filter by search query
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return ALL_MANUAL_CHAPTERS.filter(c => 
        c.title.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        c.subsections.some(s => 
          s.title.toLowerCase().includes(term) || 
          s.content.toLowerCase().includes(term) ||
          (s.steps && s.steps.some(st => st.toLowerCase().includes(term)))
        )
      );
    }

    return chapters;
  }, [activePart, selectedProfile, searchTerm]);

  // Current active chapter
  const activeChapter = useMemo(() => {
    const found = ALL_MANUAL_CHAPTERS.find(c => c.id === activeChapterId);
    if (found) return found;
    return filteredChapters[0] || ALL_MANUAL_CHAPTERS[0];
  }, [activeChapterId, filteredChapters]);

  const handlePrint = () => {
    window.print();
  };

  const ActivePartIcon = ICON_MAP[activePart.iconName] || BookOpen;
  const ActiveChapterIcon = ICON_MAP[activeChapter.iconName] || BookOpen;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Header />

      {/* Hero Banner */}
      <div className="bg-slate-900 border-b border-slate-800 text-white py-10 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3 border border-blue-500/30">
              <BookMarked className="w-3.5 h-3.5" />
              Manual do Utilizador Oficial — PROFUNDIDADE OS
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Documentação Oficial, Perfis & Guias de Engenharia
            </h1>
            <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-3xl leading-relaxed">
              Manual completo estruturado por perfis de utilizador, tipologias de projeto (Civil, Mineração, Vias, Topografia), casos práticos passo a passo e matriz de resolução de problemas.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>
          </div>
        </div>

        {/* 8 Parts Tabs Selector */}
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {ALL_MANUAL_PARTS.map((part) => {
              const PartIcon = ICON_MAP[part.iconName] || BookOpen;
              const isSelected = part.id === activePartId && selectedProfile === 'Todos' && !searchTerm;
              return (
                <button
                  key={part.id}
                  onClick={() => {
                    setActivePartId(part.id);
                    setSelectedProfile('Todos');
                    setSearchTerm('');
                    if (part.chapters.length > 0) {
                      setActiveChapterId(part.chapters[0].id);
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-2 transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/50'
                  }`}
                >
                  <PartIcon className="w-3.5 h-3.5" />
                  <span>{part.number}: {part.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-4 sm:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Profile Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-blue-600" /> Perfil:
            </span>
            <select
              value={selectedProfile}
              onChange={(e) => {
                setSelectedProfile(e.target.value);
                setSearchTerm('');
              }}
              className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {USER_PROFILES_LIST.map((prof) => (
                <option key={prof} value={prof}>
                  {prof}
                </option>
              ))}
            </select>
            {selectedProfile !== 'Todos' && (
              <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 border-blue-200">
                A filtrar por {selectedProfile}
              </Badge>
            )}
          </div>

          {/* Instant Search Bar */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Pesquisar manual (ex: EAP, horímetro, SHA-256, pintura, alçada)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Navigation */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">
                <span>Capítulos ({filteredChapters.length})</span>
                {selectedProfile !== 'Todos' && (
                  <span className="text-[10px] text-blue-500 lowercase">filtrado</span>
                )}
              </div>

              {filteredChapters.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Nenhum capítulo encontrado para os filtros aplicados.
                </div>
              ) : (
                filteredChapters.map(chap => {
                  const IconComp = ICON_MAP[chap.iconName] || BookOpen;
                  const isActive = chap.id === activeChapter.id;
                  return (
                    <button
                      key={chap.id}
                      onClick={() => setActiveChapterId(chap.id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-sm font-semibold' 
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                        <span className="truncate">{chap.number}. {chap.title}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    </button>
                  );
                })
              )}
            </div>

            {/* Quick Helper Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-background to-blue-500/5 border border-blue-500/20 text-xs text-muted-foreground space-y-2">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Formato Padronizado
              </div>
              <p className="leading-relaxed text-[11px]">
                Todas as instruções do manual obedecem à regra de documentação técnica: Objetivo, Pré-requisitos, Procedimento passo a passo e Resultado esperado.
              </p>
            </div>
          </div>

          {/* Chapter Content Reader */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
              
              {/* Chapter Header */}
              <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1">
                    <ActivePartIcon className="w-3.5 h-3.5" />
                    Capítulo {activeChapter.number}
                  </span>
                  <span>•</span>
                  <span>{activeChapter.category}</span>
                  {activeChapter.relevantProfiles && (
                    <>
                      <span>•</span>
                      <span className="text-slate-500 dark:text-slate-400 lowercase">
                        indicado para: {activeChapter.relevantProfiles.join(', ')}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <ActiveChapterIcon className="w-8 h-8 text-blue-600 shrink-0" />
                  {activeChapter.title}
                </h2>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {activeChapter.description}
                </p>
              </div>

              {/* Subsections Content */}
              <div className="space-y-12">
                {activeChapter.subsections.map((sub, idx) => (
                  <div key={idx} className="space-y-4">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
                      {sub.title}
                    </h3>

                    {/* Metadata summary if available */}
                    {(sub.objective || sub.targetAudience || sub.whenToUse) && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                        {sub.objective && (
                          <div>
                            <span className="font-bold text-foreground block">1. Objetivo:</span>
                            <span className="text-muted-foreground">{sub.objective}</span>
                          </div>
                        )}
                        {sub.targetAudience && (
                          <div>
                            <span className="font-bold text-foreground block">2. Quem pode utilizar:</span>
                            <span className="text-muted-foreground">{sub.targetAudience}</span>
                          </div>
                        )}
                        {sub.whenToUse && (
                          <div>
                            <span className="font-bold text-foreground block">3. Quando utilizar:</span>
                            <span className="text-muted-foreground">{sub.whenToUse}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Main Content */}
                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line prose dark:prose-invert max-w-none">
                      {sub.content}
                    </div>

                    {/* Step by Step Execution if available */}
                    {sub.steps && sub.steps.length > 0 && (
                      <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 space-y-3">
                        <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Procedimento Passo a Passo:
                        </span>
                        <ol className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-2 pl-6 list-decimal font-medium">
                          {sub.steps.map((step, sIdx) => (
                            <li key={sIdx} className="leading-relaxed">{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Pro Tip Alert */}
                    {sub.tips && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Boas Práticas & Dica Operacional: </span>
                          {sub.tips}
                        </div>
                      </div>
                    )}

                    {/* Warning Alert */}
                    {sub.warning && (
                      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Atenção / Bloqueio de Governação: </span>
                          {sub.warning}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation Footer between chapters */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex justify-between items-center text-xs">
                {activeChapter.number > 1 ? (
                  <button
                    onClick={() => {
                      const prev = ALL_MANUAL_CHAPTERS.find(c => c.number === activeChapter.number - 1);
                      if (prev) {
                        setActiveChapterId(prev.id);
                        setActivePartId(prev.partId);
                      }
                    }}
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    ← Capítulo Anterior ({activeChapter.number - 1})
                  </button>
                ) : <span />}

                {activeChapter.number < ALL_MANUAL_CHAPTERS.length && (
                  <button
                    onClick={() => {
                      const next = ALL_MANUAL_CHAPTERS.find(c => c.number === activeChapter.number + 1);
                      if (next) {
                        setActiveChapterId(next.id);
                        setActivePartId(next.partId);
                      }
                    }}
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Próximo Capítulo ({activeChapter.number + 1}) →
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
