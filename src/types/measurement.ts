import type { Timestamp } from 'firebase/firestore';

export type MeasurementStatus = 'Rascunho' | 'Emitido' | 'Pago';

export interface MeasurementItem {
    wbsItemId: string;
    name: string;
    progress: number;
    budget: number;
    valueToBill: number;
}

export interface Measurement {
    id: string;
    projectId: string;
    date: Timestamp;
    items: MeasurementItem[];
    totalAmount: number;
    status: MeasurementStatus;
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}
