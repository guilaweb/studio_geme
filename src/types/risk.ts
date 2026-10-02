

import type { Timestamp } from 'firebase/firestore';

export type RiskCategory = 'Operacional' | 'Financeiro' | 'Segurança' | 'Técnico' | 'Legal' | 'Ambiental' | 'Outro';
export type RiskLevel = 1 | 2 | 3 | 4 | 5; // e.g., 1 (Very Low) to 5 (Very High)
export type RiskStatus = 'Aberto' | 'Em Progresso' | 'Mitigado' | 'Fechado';

export interface MitigationAction {
    id: string;
    description: string;
    assignee?: {
        uid: string;
        displayName: string;
    };
    dueDate?: Timestamp;
    isCompleted: boolean;
}

export interface Risk {
    id: string;
    description: string;
    category: RiskCategory;
    probability: RiskLevel; // 1-5
    impact: RiskLevel; // 1-5
    status: RiskStatus;
    mitigationPlan?: string;
    actionItems: MitigationAction[];
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}
