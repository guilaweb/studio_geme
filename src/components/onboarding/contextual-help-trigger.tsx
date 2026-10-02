'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Compass, Sparkles } from 'lucide-react';
import { InteractiveHelpDrawer } from './interactive-help-drawer';
import { useOnboarding } from '@/hooks/use-onboarding';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ContextualHelpTriggerProps {
    className?: string;
}

export function ContextualHelpTrigger({ className }: ContextualHelpTriggerProps = {}) {
    const [drawerOpen, setDrawerOpen] = React.useState(false);
    const { state, checklistCompletionRate } = useOnboarding();

    // Ocultar gatilho enquanto um tour está em execução ativa para evitar poluição visual
    if (state.activeTourId) {
        return null;
    }

    const hasIncompleteTasks = checklistCompletionRate < 100;

    return (
        <>
            <TooltipProvider>
                <div className={cn("fixed bottom-6 right-6 z-40 print:hidden flex items-center", className)}>
                    <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={() => setDrawerOpen(true)}
                                className="relative group h-12 px-4 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 shadow-xl border border-border/40 backdrop-blur-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2.5"
                                aria-label="Abrir Guias Interativos e Ajuda"
                            >
                                <div className="relative flex items-center justify-center">
                                    <Compass className="h-5 w-5 text-primary group-hover:rotate-45 transition-transform duration-300" />
                                    {hasIncompleteTasks && (
                                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                                        </span>
                                    )}
                                </div>
                                <span className="font-medium text-xs hidden sm:inline-block">
                                    Guias & Ajuda
                                </span>
                                {hasIncompleteTasks && (
                                    <span className="text-[10px] font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full hidden sm:inline-block">
                                        {checklistCompletionRate}%
                                    </span>
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                            <p className="font-semibold flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-primary" /> Visitas Guiadas & Centro de Apoio
                            </p>
                            <p className="text-muted-foreground text-[11px]">
                                Clique para abrir os guias passo a passo do sistema.
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>

            <InteractiveHelpDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
            />
        </>
    );
}
