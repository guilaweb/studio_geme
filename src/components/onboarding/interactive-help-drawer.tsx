'use client';

import * as React from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOnboarding } from '@/hooks/use-onboarding';
import { ONBOARDING_TOURS } from '@/lib/onboarding-tours';
import { TourCategory } from '@/types/onboarding';
import Link from 'next/link';
import {
    Compass,
    Sparkles,
    CheckCircle2,
    Clock,
    Play,
    BookOpen,
    HelpCircle,
    RotateCcw,
    Layers,
    ShieldCheck,
    Cpu,
    FileText,
    ArrowRight
} from 'lucide-react';

interface InteractiveHelpDrawerProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

const CATEGORY_COLORS: Record<TourCategory, { bg: string; text: string; label: string }> = {
    geral: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', text: 'text-blue-600', label: 'Geral' },
    projetos: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', text: 'text-emerald-600', label: 'Projetos' },
    execucao: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', text: 'text-amber-600', label: 'Execução' },
    motores: { bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', text: 'text-purple-600', label: 'Motores' },
    relatorios: { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', text: 'text-rose-600', label: 'Relatórios' }
};

export function InteractiveHelpDrawer({
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    trigger
}: InteractiveHelpDrawerProps) {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

    const {
        state,
        startTour,
        resetAllOnboarding,
        checklistCompletionRate
    } = useOnboarding();

    const handleStartTour = (tourId: string) => {
        setOpen(false);
        // Aguardar fechamento da gaveta para focar elementos com animação suave
        setTimeout(() => {
            startTour(tourId);
        }, 250);
    };

    const completedToursCount = state.completedTours.length;
    const totalToursCount = ONBOARDING_TOURS.length;

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
            <SheetContent side="right" className="w-[90vw] sm:w-[460px] p-0 flex flex-col h-full bg-background">
                {/* Header fixo */}
                <div className="p-6 border-b border-border bg-muted/20">
                    <SheetHeader className="text-left space-y-2">
                        <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                                <Compass className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-base font-bold uppercase tracking-wide flex items-center gap-2">
                                    Centro de Apoio & Guias
                                </SheetTitle>
                                <SheetDescription className="text-xs text-muted-foreground">
                                    Assistência contextual e visitas guiadas ao PROFUNDIDADE OS
                                </SheetDescription>
                            </div>
                        </div>

                        {/* Barra de Progresso Geral */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Progresso de Acolhimento
                                </span>
                                <span className="font-semibold text-foreground">
                                    {checklistCompletionRate}%
                                </span>
                            </div>
                            <Progress value={checklistCompletionRate} className="h-2 rounded-full" />
                            <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-1.5">
                                <span>{completedToursCount} de {totalToursCount} visitas concluídas</span>
                                <span>Checklist {checklistCompletionRate}%</span>
                            </div>
                        </div>
                    </SheetHeader>
                </div>

                {/* Conteúdo com Scroll */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Lista de Visitas Guiadas */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Layers className="h-3.5 w-3.5" /> Visitas Guiadas Disponíveis
                            </h3>
                            <span className="text-[11px] text-muted-foreground">Passo a passo</span>
                        </div>

                        <div className="space-y-3">
                            {ONBOARDING_TOURS.map((tour) => {
                                const isCompleted = state.completedTours.includes(tour.id);
                                const categoryMeta = CATEGORY_COLORS[tour.category] || CATEGORY_COLORS.geral;

                                return (
                                    <div
                                        key={tour.id}
                                        className="group relative rounded-xl border border-border/70 hover:border-primary/40 bg-card p-4 transition-all hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] px-2 py-0.5 border ${categoryMeta.bg}`}
                                                >
                                                    {categoryMeta.label}
                                                </Badge>
                                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                    <Clock className="h-3 w-3" /> {tour.estimatedMinutes} min
                                                </span>
                                            </div>

                                            {isCompleted && (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] flex items-center gap-1 shrink-0"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" /> Concluído
                                                </Badge>
                                            )}
                                        </div>

                                        <h4 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                                            {tour.title}
                                        </h4>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                            {tour.description}
                                        </p>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[11px] text-muted-foreground">
                                                {tour.steps.length} passos guiados
                                            </span>
                                            <Button
                                                size="sm"
                                                variant={isCompleted ? 'outline' : 'default'}
                                                className="h-8 text-xs font-medium gap-1.5 rounded-lg"
                                                onClick={() => handleStartTour(tour.id)}
                                            >
                                                <Play className="h-3 w-3 fill-current" />
                                                {isCompleted ? 'Repetir Visita' : 'Iniciar Visita'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dicas Rápidas de Operação */}
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wide">
                            <ShieldCheck className="h-4 w-4" /> Integridade Probatória
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Todos os relatórios, diários de obra (RDO) e autos de medição contêm assinatura imutável SHA-256 com carimbo de data/hora oficial de Angola (WAT / UTC+1).
                        </p>
                    </div>

                    {/* Links Oficiais e Suporte */}
                    <div className="space-y-2.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5" /> Recursos & Documentação
                        </h3>

                        <div className="grid grid-cols-1 gap-2">
                            <Button
                                variant="outline"
                                className="justify-between h-auto py-2.5 px-3.5 text-xs text-left font-medium rounded-xl"
                                asChild
                                onClick={() => setOpen(false)}
                            >
                                <Link href="/ajuda">
                                    <span className="flex items-center gap-2.5">
                                        <HelpCircle className="h-4 w-4 text-primary" />
                                        <span>Manual do Utilizador & FAQs</span>
                                    </span>
                                    <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                                </Link>
                            </Button>

                            <Button
                                variant="outline"
                                className="justify-between h-auto py-2.5 px-3.5 text-xs text-left font-medium rounded-xl"
                                asChild
                                onClick={() => setOpen(false)}
                            >
                                <Link href="/blog">
                                    <span className="flex items-center gap-2.5">
                                        <FileText className="h-4 w-4 text-primary" />
                                        <span>Casos de Estudo & Artigos Técnicos</span>
                                    </span>
                                    <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Footer fixo com botão de reiniciar */}
                <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                        onClick={resetAllOnboarding}
                    >
                        <RotateCcw className="h-3.5 w-3.5" /> Reiniciar Guias & Boas-Vindas
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setOpen(false)}
                    >
                        Fechar
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
