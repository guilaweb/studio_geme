
import type { Timestamp } from 'firebase/firestore';

export const EquipmentCategories = ['Veículo Pesado', 'Veículo Leve', 'Ferramenta Elétrica', 'Ferramenta Manual', 'Andaimes', 'Energia', 'Outros'] as const;
export type EquipmentCategory = typeof EquipmentCategories[number];

export type EquipmentStatus = 'Disponível' | 'Em Uso' | 'Em Manutenção' | 'Inativo';

// Represents a piece of equipment in the company's global inventory
export interface Equipment {
    id: string;
    organizationId?: string;
    name: string;
    category: EquipmentCategory;
    status: EquipmentStatus;
    isOwned: boolean; // true for own, false for rented
    currentProjectId?: string | null;
    currentProjectName?: string | null;
    purchaseDate?: Timestamp;
    cost?: number; // Purchase cost or monthly rental cost
    operationalCostPerHour?: number;
    notes?: string;
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
    currentHours?: number; // Current total hours from the hour meter
    // Maintenance scheduling fields
    maintenanceIntervalHours?: number; // e.g., perform maintenance every 250 hours
    lastMaintenanceDate?: Timestamp;
    lastMaintenanceHours?: number; // Hour meter reading at last maintenance
}

// Represents an equipment specifically allocated to a project's inventory
export interface ProjectEquipment {
    id: string; // The doc ID in the project's subcollection
    equipmentId: string; // ID of the equipment in the global 'equipment' collection
    name: string;
    category: EquipmentCategory;
    allocatedAt: Timestamp;
}

// Log of usage for a piece of equipment on a project
export interface EquipmentUsageLog {
    id: string;
    date: Timestamp | Date;
    hoursUsed: number;
    hourMeterReading: number;
    fuelConsumed?: number;
    notes?: string;
    wbsItemId?: string | null;
    author: {
        uid: string;
        displayName: string;
    };
    operatorId?: string | null;
    operatorName?: string | null;
    projectId: string;
    equipmentId: string;
}

export type MaintenanceType = 'Preventiva' | 'Corretiva' | 'Avaria';

// Log of maintenance performed on a piece of equipment on a project
export interface MaintenanceRecord {
    id: string;
    date: Timestamp | Date;
    type: MaintenanceType;
    description: string;
    cost: number;
    downtimeHours?: number; // How long the equipment was out of service
    notes?: string;
    author: {
        uid: string;
        displayName: string;
    };
}
