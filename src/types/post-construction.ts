import type { Timestamp } from 'firebase/firestore';
import type { ProjectFile } from './documents';
import type { UserRole } from '@/app/projects/[id]/page';

export interface DigitalSignature {
    signedBy: string; // "Cliente" or "Construtora"
    signatureDataUrl: string; // The signature image as a data URL
    signedAt: Timestamp;
}

export type ChecklistItemStatus = 'Conforme' | 'Não Conforme' | 'Não Aplicável';

export interface ChecklistItem {
    id: string; // Unique ID for the item within the checklist
    text: string;
    status: ChecklistItemStatus;
    observations?: string;
}

export interface InspectionChecklist {
    id: string;
    templateName: string; // Name of the .md template file used
    templateUrl: string;
    items: ChecklistItem[];
    filledAt: Timestamp;
    filledBy: {
        uid: string;
        displayName: string;
    };
}


export type InspectionStatus = 'Agendada' | 'Em Andamento' | 'Concluída';

export interface Inspection {
    id: string;
    date: Date;
    clientName: string;
    clientEmail: string;
    unitIdentifier: string; // Ex: "Apartamento 101, Bloco A"
    status: InspectionStatus;
    checklists: InspectionChecklist[]; // Now stores structured checklist data
    notes?: string;
    signatures?: DigitalSignature[];
    finalReportUrl?: string; // URL to the generated PDF report
}

export interface Warranty {
    id: string;
    itemDescription: string;
    supplierId: string;
    supplierName: string;
    startDate: Date;
    endDate: Date;
    durationYears: number;
    certificateUrl?: string;
    certificateName?: string;
    createdAt: Timestamp;
}

// Re-export UserRole
export type { UserRole };
