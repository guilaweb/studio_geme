'use client';

import { useState, useEffect, useCallback } from 'react';

export type ExperienceMode = 'basic' | 'professional' | 'advanced';

export interface ExperienceModeConfig {
  mode: ExperienceMode;
  label: string;
  badge: string;
  dotColor: string;
  description: string;
}

export const EXPERIENCE_MODES: Record<ExperienceMode, ExperienceModeConfig> = {
  basic: {
    mode: 'basic',
    label: 'Básico',
    badge: '🟢 Básico',
    dotColor: 'bg-emerald-500',
    description: 'Para recolha direta de evidências e notas de campo. Interface guiada e direta para peritos e agentes no terreno.',
  },
  professional: {
    mode: 'professional',
    label: 'Profissional',
    badge: '🔵 Profissional',
    dotColor: 'bg-blue-500',
    description: 'Para investigadores e analistas. Dossiês de caso, cadeia de custódia SHA-256, mapeamento de entidades e relatórios periciais.',
  },
  advanced: {
    mode: 'advanced',
    label: 'Avançado',
    badge: '⚫ Avançado',
    dotColor: 'bg-slate-900 dark:bg-slate-100',
    description: 'Para peritos seniores e diretores de inteligência. Grafos relacionais complexos, fontes OSINT, IA assistiva e trilhas imutáveis de auditoria.',
  },
};

const STORAGE_KEY = 'profundidade_experience_mode';
const EVENT_NAME = 'profundidade_experience_mode_change';

export function useExperienceMode() {
  const [mode, setModeState] = useState<ExperienceMode>('professional');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem(STORAGE_KEY) as ExperienceMode | null;
    if (saved && (saved === 'basic' || saved === 'professional' || saved === 'advanced')) {
      setModeState(saved);
    }
    setIsLoaded(true);

    const handleModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode: ExperienceMode }>;
      if (customEvent.detail?.mode) {
        setModeState(customEvent.detail.mode);
      }
    };

    window.addEventListener(EVENT_NAME, handleModeChange);
    return () => window.removeEventListener(EVENT_NAME, handleModeChange);
  }, []);

  const setMode = useCallback((newMode: ExperienceMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newMode);
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, { detail: { mode: newMode } })
      );
    }
  }, []);

  return {
    mode,
    setMode,
    isLoaded,
    isBasic: mode === 'basic',
    isProfessional: mode === 'professional',
    isAdvanced: mode === 'advanced',
    config: EXPERIENCE_MODES[mode],
  };
}
