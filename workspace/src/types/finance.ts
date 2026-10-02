

import type { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

export type TransactionType = 'Despesa' | 'Receita';
export type TransactionStatus = 'Pendente' | 'Pago' | 'Atrasado';

export const TransactionSchema = z.object({
    id: z.string(),
    description: z.string(),
    amount: z.number(),
    date: z.string().optional().describe('ISO date string'),
    type: z.enum(['Despesa', 'Receita']),
    status: z.enum(['Pendente', 'Pago', 'Atrasado']),
    accountId: z.string(),
    accountName: z.string().optional(),
    wbsItemId: z.string().optional().nullable(),
    wbsItemName: z.string().optional(),
    purchaseOrderId: z.string().optional(),
    sourceOpportunityId: z.string().optional(),
    invoiceId: z.string().optional(), // Link to the client invoice
    changeRequestId: z.string().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;


export interface Account {
    id: string;
    code: string;
    name: string;
    type: 'Receita' | 'Despesa';
    parentId?: string | null;
    createdAt: Timestamp;
}

export interface Contract {
    id: string;
    projectId: string;
    fileName: string;
    fileUrl: string;
    contractValue: number;
    createdAt: Timestamp;
}

export interface ContractAmendment {
    id: string;
    contractId: string;
    description: string;
    valueChange: number; // Can be positive or negative
    fileName: string;
    fileUrl: string;
    effectiveDate: Timestamp;
    createdAt: Timestamp;
}

export type ClientInvoiceStatus = 'Pendente' | 'Paga' | 'Atrasada' | 'Anulada';

export interface InvoiceItem {
    id: string; // Corresponds to WBS item ID
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface ClientInvoice {
    id: string;
    invoiceNumber: string;
    projectId: string;
    measurementId?: string; // Link to the measurement document
    issueDate: Date;
    dueDate: Date;
    totalAmount: number;
    status: ClientInvoiceStatus;
    items: InvoiceItem[];
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}
