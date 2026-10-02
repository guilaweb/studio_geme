'use client';

import { useState, useEffect, useCallback } from 'react';
import { OnboardingTour, OnboardingChecklistItem, UserOnboardingState } from '@/types/onboarding';
import { ONBOARDING_TOURS, DEFAULT_CHECKLIST_ITEMS } from '@/lib/onboarding-tours';

const STORAGE_KEY = 'profundidade_onboarding_state';
const ONBOARDING_EVENT = 'profundidade_onboarding_update';

const DEFAULT_STATE: UserOnboardingState = {
    completedTours: [],
    dismissedWelcome: false,
    checklistProgress: {},
    activeTourId: null,
    currentStepIndex: 0,
};

export function useOnboarding() {
    const [state, setState] = useState<UserOnboardingState>(DEFAULT_STATE);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Carregar estado do localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setState(prev => ({ ...prev, ...parsed }));
            }
        } catch (e) {
            console.warn('Erro ao carregar estado de onboarding:', e);
        } finally {
            setIsLoaded(true);
        }

        const handleSync = () => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    setState(JSON.parse(stored));
                }
            } catch (e) {
                console.warn('Erro ao sincronizar onboarding:', e);
            }
        };

        window.addEventListener(ONBOARDING_EVENT, handleSync);
        return () => window.removeEventListener(ONBOARDING_EVENT, handleSync);
    }, []);

    // Gravar estado
    const persistState = useCallback((newState: UserOnboardingState) => {
        setState(newState);
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
                window.dispatchEvent(new Event(ONBOARDING_EVENT));
            } catch (e) {
                console.warn('Erro ao persistir estado de onboarding:', e);
            }
        }
    }, []);

    const activeTour: OnboardingTour | undefined = state.activeTourId 
        ? ONBOARDING_TOURS.find(t => t.id === state.activeTourId)
        : undefined;

    const currentStep = activeTour && activeTour.steps[state.currentStepIndex];

    const startTour = useCallback((tourId: string) => {
        const targetTour = ONBOARDING_TOURS.find(t => t.id === tourId);
        if (!targetTour) return;

        persistState({
            ...state,
            activeTourId: tourId,
            currentStepIndex: 0,
            dismissedWelcome: true
        });
        setIsHelpOpen(false);
    }, [state, persistState]);

    const nextStep = useCallback(() => {
        if (!activeTour) return;

        if (state.currentStepIndex < activeTour.steps.length - 1) {
            persistState({
                ...state,
                currentStepIndex: state.currentStepIndex + 1
            });
        } else {
            // Concluiu o tour
            const completed = Array.from(new Set([...state.completedTours, activeTour.id]));
            persistState({
                ...state,
                completedTours: completed,
                activeTourId: null,
                currentStepIndex: 0
            });
        }
    }, [activeTour, state, persistState]);

    const prevStep = useCallback(() => {
        if (!activeTour || state.currentStepIndex <= 0) return;

        persistState({
            ...state,
            currentStepIndex: state.currentStepIndex - 1
        });
    }, [activeTour, state, persistState]);

    const skipTour = useCallback(() => {
        persistState({
            ...state,
            activeTourId: null,
            currentStepIndex: 0
        });
    }, [state, persistState]);

    const dismissWelcome = useCallback(() => {
        persistState({
            ...state,
            dismissedWelcome: true
        });
    }, [state, persistState]);

    const toggleChecklistItem = useCallback((itemId: string) => {
        const currentVal = !!state.checklistProgress[itemId];
        const newProgress = {
            ...state.checklistProgress,
            [itemId]: !currentVal
        };

        persistState({
            ...state,
            checklistProgress: newProgress
        });
    }, [state, persistState]);

    const resetOnboarding = useCallback(() => {
        persistState(DEFAULT_STATE);
    }, [persistState]);

    // Checklist enriquecida com o estado atual
    const checklist: OnboardingChecklistItem[] = DEFAULT_CHECKLIST_ITEMS.map(item => ({
        ...item,
        completed: !!state.checklistProgress[item.id]
    }));

    const checklistCompletedCount = checklist.filter(i => i.completed).length;
    const checklistCompletionRate = checklist.length > 0 
        ? Math.round((checklistCompletedCount / checklist.length) * 100) 
        : 0;

    return {
        isLoaded,
        state,
        activeTour,
        currentStep,
        currentStepIndex: state.currentStepIndex,
        totalSteps: activeTour ? activeTour.steps.length : 0,
        isTourActive: Boolean(state.activeTourId && activeTour),
        isWelcomeOpen: isLoaded && !state.dismissedWelcome,
        isHelpOpen,
        setIsHelpOpen,
        checklist,
        checklistCompletedCount,
        checklistTotalCount: checklist.length,
        checklistCompletionRate,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        dismissWelcome,
        toggleChecklistItem,
        resetOnboarding,
        resetAllOnboarding: resetOnboarding,
        allTours: ONBOARDING_TOURS
    };
}
