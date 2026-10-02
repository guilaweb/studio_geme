
import type { Timestamp } from 'firebase/firestore';

export type StockMovementType = 'Entrada' | 'Saída' | 'Ajuste';

export interface StockMovement {
    id: string;
    date: Timestamp;
    type: StockMovementType;
    quantity: number;
    reason?: string; // Ex: "Receção OC-123", "Uso na frente de trabalho X", "Ajuste de inventário"
    wbsItemId?: string | null; // ID of the WBS item this stock was used for
    author: {
        uid: string;
        displayName: string;
    };
}

export interface InventoryItem {
    id: string;
    name: string;
    unit: string; // Ex: "un", "m²", "kg", "saco"
    unitCost: number; // Cost per unit
    quantity: number; // Current quantity in stock
    minStockLevel?: number; // Minimum stock level before triggering a reorder
    reorderQuantity?: number; // How much to reorder when stock is low
    createdAt: Timestamp;
    author: {
        uid: string;
        displayName: string;
    };
}
