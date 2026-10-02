export type TourCategory = 'geral' | 'projetos' | 'execucao' | 'motores' | 'relatorios';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface OnboardingStep {
    id: string;
    targetSelector: string; // CSS selector para o elemento foco (ou 'body' para modal central)
    title: string;
    description: string;
    placement?: TooltipPlacement;
    actionLabel?: string;
    badgeText?: string;
    route?: string; // Se precisar navegar para uma rota específica
    tabId?: string; // Se precisar alternar para uma aba do projeto
}

export interface OnboardingTour {
    id: string;
    title: string;
    description: string;
    category: TourCategory;
    estimatedMinutes: number;
    steps: OnboardingStep[];
}

export interface OnboardingChecklistItem {
    id: string;
    title: string;
    description: string;
    linkUrl?: string;
    actionTab?: string;
    completed: boolean;
    requiredRole?: string[];
}

export interface UserOnboardingState {
    completedTours: string[];
    dismissedWelcome: boolean;
    checklistProgress: Record<string, boolean>;
    activeTourId: string | null;
    currentStepIndex: number;
    lastSeenAt?: string;
}
