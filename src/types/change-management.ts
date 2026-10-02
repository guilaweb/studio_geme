'use server';
import type { Timestamp } from 'firebase/firestore';

export type ChangeRequestStatus = 'Submetido' | 'Em Análise' | 'Aprovado' | 'Rejeitado';

export interface ChangeRequest {
    id: string;
    title: string;
    description: string;
    status: ChangeRequestStatus;
    requester: {
        uid: string;
        displayName: string;
    };
    wbsItemId?: string | null; // ID of the related WBS item
    wbsItemName?: string;
    costImpact: number; // Pode ser positivo, negativo ou zero
    scheduleImpact: string; // Ex: "+5 dias", "-2 semanas", "Nenhum"
    createdAt: Timestamp;
    approvedBy?: {
        uid: string;
        displayName: string;
    };
    approvedAt?: Timestamp;
}
