import type { Timestamp } from 'firebase/firestore';
import type { UserRole } from '@/app/projects/[id]/page';

export type RequirementType = 'Funcional' | 'Não-Funcional' | 'Técnico' | 'De Negócio';
export type RequirementStatus = 'Proposto' | 'Em Análise' | 'Aprovado' | 'Rejeitado' | 'Em Teste' | 'Verificado';
export type RequirementPriority = 'Essencial' | 'Importante' | 'Desejável';

export interface Requirement {
    id: string;
    text: string;
    type: RequirementType;
    priority: RequirementPriority;
    status: RequirementStatus;
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
    wbsItemId?: string | null;
    wbsItemName?: string;
    fvsId?: string | null; // ID of the FVS template from the documents collection
    fvsName?: string;
    testCaseId?: string | null;
    notes?: string;
}

// Re-export UserRole
export type { UserRole };
