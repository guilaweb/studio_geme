import type { Timestamp } from 'firebase/firestore';

export const SupplierCategory = ['Material de Construção', 'Equipamentos', 'Serviços', 'Consultoria', 'Outros'] as const;
export type SupplierCategory = typeof SupplierCategory[number];

export interface Supplier {
    id: string;
    name: string;
    category: SupplierCategory;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}
