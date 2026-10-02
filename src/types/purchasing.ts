
import type { Timestamp } from 'firebase/firestore';

export type RequestStatus = 'Pendente' | 'Aguardando Cotações' | 'Concluído';
export type QuoteStatus = 'Pendente' | 'Aprovada' | 'Rejeitada';
export type PurchaseOrderStatus = 'Emitida' | 'Recebida Parcialmente' | 'Recebida Totalmente';
export type SupplierInvoiceStatus = 'Pendente' | 'Em Processamento' | 'Paga' | 'Disputa';

export interface PurchaseRequestItem {
    id: string; // Can be inventory item ID or a random ID for a new item
    name: string;
    quantity: number;
    unit: string;
}

// A request sent to one or more suppliers for pricing
export interface PurchaseRequest {
    id: string;
    description: string; // Ex: Material para fundações Bloco A
    items: PurchaseRequestItem[]; // A structured list of items
    status: RequestStatus;
    supplierIds: string[]; // List of supplier IDs this request was sent to
    wbsItemId?: string | null; // ID of the WBS item this request is for
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}

// A quote received from a supplier for a specific request
export interface Quote {
    id: string;
    requestId: string;
    supplierId: string;
    amount: number;
    status: QuoteStatus;
    // attachmentUrl?: string;
    createdAt: Timestamp;
}

// A formal document created after a quote is approved
export interface PurchaseOrder {
    id: string;
    quoteId: string;
    requestId: string;
    supplierId: string;
    items: PurchaseRequestItem[]; // The structured list of items is carried over
    totalAmount: number;
    status: PurchaseOrderStatus;
    createdAt: Timestamp;
    approvedBy: {
        uid: string;
        displayName: string;
        date: Timestamp;
    };
}

export interface SupplierInvoice {
    id: string;
    projectId: string;
    supplierId: string;
    purchaseOrderIds: string[];
    invoiceNumber: string;
    invoiceDate: Timestamp;
    dueDate?: Timestamp;
    totalAmount: number;
    status: SupplierInvoiceStatus;
    fileUrl: string;
    fileName: string;
    notes?: string;
    createdAt: Timestamp;
    author: {
        uid: string;
        displayName: string;
    };
}
