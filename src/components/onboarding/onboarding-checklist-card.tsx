'use client';

import React, { useState } from 'react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Circle, 
  Compass, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  ArrowRight,
  ExternalLink 
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function OnboardingChecklistCard({ className }: { className?: string } = {}) {
  const { 
    checklist, 
    checklistCompletedCount, 
    checklistTotalCount, 
    toggleChecklistItem, 
    startTour 
  } = useOnboarding();

  const [isCollapsed, setIsCollapsed] = useState(false);

  const pct = Math.round((checklistCompletedCount / (checklistTotalCount || 1)) * 100);

  return (
    <Card className={cn("border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900/80 shadow-sm transition-all overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Primeiros Passos no PROFUNDIDADE OS
                <Badge variant="outline" className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                  {checklistCompletedCount}/{checklistTotalCount} Concluídos
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Complete as 5 etapas centrais para operar com decisão em tempo real e blindagem probatória.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => startTour('tour-platform-overview')}
              className="h-8 text-xs font-semibold border-indigo-300 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
            >
              <Compass className="w-3.5 h-3.5 mr-1.5" />
              Visita Guiada Geral
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expandir" : "Recolher"}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-[11px] font-medium text-slate-500">
            <span>Progresso da Integração</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2 bg-indigo-100 dark:bg-indigo-950" />
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-2 pb-4 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {checklist.map(item => (
              <div
                key={item.id}
                onClick={() => toggleChecklistItem(item.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                  item.completed 
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60' 
                    : 'bg-white/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <button
                  type="button"
                  className="mt-0.5 text-slate-400 hover:text-indigo-600 transition flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChecklistItem(item.id);
                  }}
                >
                  {item.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className={`text-xs font-bold leading-snug truncate ${
                    item.completed ? 'text-emerald-900 dark:text-emerald-300 line-through opacity-80' : 'text-slate-900 dark:text-white'
                  }`}>
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {item.description}
                  </p>
                </div>

                {item.linkUrl && (
                  <Link
                    href={item.linkUrl}
                    onClick={(e) => e.stopPropagation()}
                    className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 p-1"
                    title="Aceder"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
