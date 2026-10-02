'use client';

import React from 'react';
import { useExperienceMode, EXPERIENCE_MODES, type ExperienceMode } from '@/hooks/use-experience-mode';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronDown, Sparkles, SlidersHorizontal, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExperienceModeSelectorProps {
  className?: string;
  variant?: 'compact' | 'pill' | 'button';
}

export function ExperienceModeSelector({
  className,
  variant = 'compact',
}: ExperienceModeSelectorProps) {
  const { mode, setMode, config } = useExperienceMode();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'pill' ? (
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all hover:bg-accent/60',
              mode === 'basic' && 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300',
              mode === 'professional' && 'border-blue-300 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300',
              mode === 'advanced' && 'border-slate-400 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100',
              className
            )}
            title="Alterar nível de complexidade da plataforma"
          >
            <span className={cn('h-2 w-2 rounded-full', config.dotColor)} />
            <span>Modo: {config.label}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 text-xs font-medium gap-1.5 px-2.5 border-dashed hover:border-solid',
              mode === 'basic' && 'border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20',
              mode === 'professional' && 'border-blue-400 text-blue-700 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20',
              mode === 'advanced' && 'border-slate-500 text-slate-800 dark:text-slate-200 bg-slate-100/40 dark:bg-slate-800/30',
              className
            )}
          >
            <span className={cn('h-2 w-2 rounded-full shrink-0', config.dotColor)} />
            <span className="hidden sm:inline">Modo:</span>
            <span className="font-semibold">{config.label}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 p-2 bg-popover/95 backdrop-blur-md shadow-xl rounded-xl border">
        <DropdownMenuLabel className="p-2 pb-1 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nível de Operação</span>
            <span className="text-[10px] text-muted-foreground font-normal">Complexidade nos bastidores</span>
          </div>
          <p className="text-[11px] text-foreground font-medium mt-1 leading-snug">
            “O utilizador diz o que quer fazer; o sistema sabe como fazer.”
          </p>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="my-1" />

        {(['basic', 'professional', 'advanced'] as ExperienceMode[]).map((m) => {
          const item = EXPERIENCE_MODES[m];
          const isSelected = mode === m;

          return (
            <DropdownMenuItem
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors',
                isSelected && 'bg-accent/80 font-medium'
              )}
            >
              <div className="pt-0.5">
                <span className={cn('block h-2.5 w-2.5 rounded-full mt-0.5', item.dotColor)} />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{item.badge}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary ml-1" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {item.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator className="my-1" />
        <div className="p-2 text-[10px] text-muted-foreground bg-muted/40 rounded-lg">
          💡 No modo <strong>Básico</strong>, métricas analíticas e grafos multidimensionais ficam simplificados para foco direto na recolha de evidências e notas de caso.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
