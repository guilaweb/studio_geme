'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Sparkles, 
  Compass,
  CheckCircle2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export function OnboardingTourSpotlight() {
  const { 
    isTourActive, 
    activeTour, 
    currentStep, 
    currentStepIndex, 
    totalSteps, 
    nextStep, 
    prevStep, 
    skipTour 
  } = useOnboarding();

  const [rect, setRect] = useState<ElementRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 100, left: 100 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!currentStep) return;

    if (currentStep.targetSelector === 'body' || !currentStep.targetSelector) {
      setRect(null);
      return;
    }

    const el = document.querySelector(currentStep.targetSelector);
    if (!el) {
      setRect(null);
      return;
    }

    const r = el.getBoundingClientRect();
    setRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      bottom: r.bottom,
      right: r.right,
    });

    // Scroll elemento suavemente para a vista se necessário
    if (r.top < 0 || r.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Calcular posição do tooltip
    const padding = 12;
    const tooltipWidth = 360;
    const tooltipHeight = 220;
    let top = r.bottom + padding;
    let left = r.left + (r.width / 2) - (tooltipWidth / 2);

    const placement = currentStep.placement || 'bottom';

    if (placement === 'top') {
      top = Math.max(16, r.top - tooltipHeight - padding);
      left = r.left + (r.width / 2) - (tooltipWidth / 2);
    } else if (placement === 'left') {
      top = r.top + (r.height / 2) - (tooltipHeight / 2);
      left = Math.max(16, r.left - tooltipWidth - padding);
    } else if (placement === 'right') {
      top = r.top + (r.height / 2) - (tooltipHeight / 2);
      left = Math.min(window.innerWidth - tooltipWidth - 16, r.right + padding);
    } else { // bottom
      top = Math.min(window.innerHeight - tooltipHeight - 16, r.bottom + padding);
      left = r.left + (r.width / 2) - (tooltipWidth / 2);
    }

    // Prevenir overflow na tela
    left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));
    top = Math.max(16, Math.min(window.innerHeight - tooltipHeight - 16, top));

    setTooltipPos({ top, left });
  }, [currentStep]);

  useEffect(() => {
    if (!isTourActive || !currentStep) return;

    // Atualiza imediatamente e após pequeno delay para acomodar animações/toggles
    updatePosition();
    const timeout = setTimeout(updatePosition, 150);
    const interval = setInterval(updatePosition, 1000);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipTour();
      if (e.key === 'ArrowRight') nextStep();
      if (e.key === 'ArrowLeft') prevStep();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTourActive, currentStep, updatePosition, skipTour, nextStep, prevStep]);

  if (!isTourActive || !currentStep || !activeTour) return null;

  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-auto">
      {/* Backdrop SVG com recorte (Spotlight) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={Math.max(0, rect.left - 6)}
                y={Math.max(0, rect.top - 6)}
                width={rect.width + 12}
                height={rect.height + 12}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.72)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Borda pulsante ao redor do elemento focado */}
      {rect && (
        <div
          className="absolute rounded-lg border-2 border-primary shadow-[0_0_24px_rgba(59,130,246,0.5)] transition-all duration-300 pointer-events-none animate-pulse"
          style={{
            top: Math.max(0, rect.top - 6),
            left: Math.max(0, rect.left - 6),
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      {/* Tooltip / Cartão de Explicação */}
      <div
        ref={tooltipRef}
        className={cn(
          "absolute w-[360px] max-w-[calc(100vw-32px)] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 p-5 transition-all duration-300",
          !rect && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        style={rect ? { top: tooltipPos.top, left: tooltipPos.left } : undefined}
      >
        {/* Header do Tooltip */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/20 text-primary-foreground border-primary/40 text-[11px] font-semibold uppercase tracking-wider">
              {currentStep.badgeText || activeTour.title}
            </Badge>
            <span className="text-xs text-slate-400 font-mono">
              {currentStepIndex + 1} de {totalSteps}
            </span>
          </div>

          <button
            onClick={skipTour}
            className="text-slate-400 hover:text-white p-1 rounded-md transition hover:bg-slate-800"
            title="Fechar guia (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Título e Conteúdo */}
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          {currentStep.title}
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed mb-5">
          {currentStep.description}
        </p>

        {/* Barra de Progresso em Pontos */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  idx === currentStepIndex 
                    ? "w-5 bg-primary" 
                    : idx < currentStepIndex 
                      ? "w-2 bg-emerald-500" 
                      : "w-1.5 bg-slate-700"
                )}
              />
            ))}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={prevStep}
                className="h-8 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Anterior
              </Button>
            )}

            <Button
              size="sm"
              onClick={nextStep}
              className="h-8 px-3.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Concluir Visita
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
