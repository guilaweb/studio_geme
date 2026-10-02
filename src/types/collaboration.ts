
import type { Timestamp } from 'firebase/firestore';
import type { ProjectFile } from './documents';

export interface ActionItem {
    id: string;
    text: string;
    assignee?: {
        uid: string;
        displayName: string;
    };
    dueDate?: Timestamp;
    isCompleted: boolean;
}

export interface MeetingMinute {
    id: string;
    subject: string;
    date: Date;
    participants: {
        uid: string;
        displayName: string;
    }[];
    agenda: string; // Markdown supported
    decisions: string; // Markdown supported
    actionItems: ActionItem[];
    author: {
        uid:string;
        displayName: string;
    };
    createdAt: Timestamp;
}

export type TransmittalStatus = 'Enviado' | 'Em Revisão' | 'Aprovado' | 'Aprovado com Comentários' | 'Rejeitado';

export interface TransmittalItem {
    fileId: string;
    fileName: string;
    version: number;
}

export interface TransmittalHistoryItem {
    status: TransmittalStatus;
    notes?: string;
    updatedAt: Date;
    updatedBy: {
        uid: string;
        displayName: string;
    };
}


export interface Transmittal {
    id: string;
    subject: string;
    status: TransmittalStatus;
    from: {
        uid: string;
        displayName: string | null;
    };
    to: {
        uid: string;
        displayName: string;
        email: string;
        role: string;
    }[];
    items: TransmittalItem[];
    notes?: string;
    history: TransmittalHistoryItem[];
    createdAt: Date;
    author: {
        uid: string;
        displayName: string | null;
    };
}

// --- RFI (Request For Information) ---
export type RfiStatus = 'Aberta' | 'Respondida' | 'Fechada';

export interface RfiAttachment {
    name: string;
    url: string;
}

export interface RfiResponse {
    text: string;
    attachments: RfiAttachment[];
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}

export interface Rfi {
    id: string;
    subject: string;
    question: string;
    status: RfiStatus;
    attachments: RfiAttachment[];
    responses: RfiResponse[]; // An array to allow for back-and-forth
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}
