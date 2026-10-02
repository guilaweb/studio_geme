'use client';

import React from 'react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Diamond, 
  Zap, 
  Route, 
  Compass, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

interface WelcomeOnboardingModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function WelcomeOnboardingModal({ open, onOpenChange }: WelcomeOnboardingModalProps) {
  const { isWelcomeOpen, dismissWelcome, startTour } = useOnboarding();

  const isOpen = open !== undefined ? open : isWelcomeOpen;
  const handleOpenChange = onOpenChange || ((val: boolean) => {
    if (!val) dismissWelcome();
  });

  const handleStartGeneralTour = () => {
    handleOpenChange(false);
    startTour('tour-platform-overview');
  };

  const handleStartEnginesTour = () => {
    handleOpenChange(false);
    startTour('tour-decision-engines');
  };

  const sectors = [
    {
      id: 'construcao',
      title: 'Construção Civil & Infraestruturas',
      desc: 'EAP analítica, diário de obra RDO, planeamento Gantt, betão e medições.',
      icon: Building2,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
    },
    {
      id: 'mineracao',
      title: 'Mineração & Recursos Minerais',
      desc: 'Controlo de turnos, rastreabilidade Kimberley, custos/ton e frotas CAT.',
      icon: Diamond,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
    },
    {
      id: 'energia',
      title: 'Energia & Utilities',
      desc: 'Parques solares, centrais hídricas, telemetria de produção e manutenção.',
      icon: Zap,
      color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-900',
    },
    {
      id: 'estradas',
      title: 'Estradas & Obras Lineares',
      desc: 'Terraplanagem, balanço de massas DMT, ensaios de compactação e drenagem.',
      icon: Route,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
        {/* Banner Topo Gradiente */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            BEM-VINDO À PLATAFORMA
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            PROFUNDIDADE OS
          </DialogTitle>
          <DialogDescription className="text-indigo-200/80 text-xs sm:text-sm mt-2 leading-relaxed">
            O primeiro Sistema Operacional de Engenharia, Construção e Recursos Minerais de Angola que substitui formulários passivos por tomada de decisão em tempo real.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6">
          {/* Seleção de Setores */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Soluções Especializadas Disponíveis:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sectors.map(s => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className={`p-1.5 rounded-lg border ${s.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{s.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Destaque de Blindagem Jurídica */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-slate-900 dark:text-white">Blindagem Probatória com SHA-256</p>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Todos os Diários de Obra (RDO), ensaios laboratoriais e relatórios emitidos recebem hash criptográfico imutável garantindo conformidade contratual.
              </p>
            </div>
          </div>
        </div>

        {/* Footer com Ações */}
        <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            className="text-xs text-slate-600 dark:text-slate-300"
          >
            Explorar Diretamente
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleStartEnginesTour}
            className="text-xs"
          >
            Guia dos 5 Motores
          </Button>

          <Button
            size="sm"
            onClick={handleStartGeneralTour}
            className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Compass className="w-3.5 h-3.5 mr-1.5" />
            Iniciar Visita Guiada (2 min)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
