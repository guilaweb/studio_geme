
import type { Timestamp } from 'firebase/firestore';

export type EnergyAssetType = 
    | 'Solar Fotovoltaico' 
    | 'Gerador Diesel' 
    | 'Híbrido Solar-Diesel' 
    | 'Hídrico / PCH' 
    | 'Eólico' 
    | 'Bateria / BESS' 
    | 'Rede / Subestação';

export type DowntimeReason = 
    | 'Manutenção Preventiva' 
    | 'Avaria Elétrica / Mecânica' 
    | 'Falta de Combustível' 
    | 'Falha da Rede Pública' 
    | 'Condições Climáticas' 
    | 'Operacional / Standby'
    | 'Outro';

export interface EnergyProductionLog {
    id: string;
    date: Date;
    assetId: string; 
    assetName: string;
    assetType?: EnergyAssetType;
    productionKWh: number;
    initialMeterReading?: number;
    finalMeterReading?: number;
    operationalHours: number;
    downtimeHours?: number;
    downtimeReason?: DowntimeReason;
    fuelConsumedLiters?: number; // Litros para geradores
    efficiencyKWhPerHour?: number; // kWh/h
    costAOA?: number;
    costPerKWh?: number;
    co2AvoidedKg?: number;
    notes?: string;
    wbsItemId?: string | null;
    wbsItemName?: string | null;
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}

export type MaintenancePlanStatus = 'Programada' | 'Pendente' | 'Concluída' | 'Atrasada';

export interface EnergyMaintenancePlan {
    id: string;
    assetId: string;
    assetName: string;
    planName: string;
    type: 'Preventiva' | 'Corretiva' | 'Preditiva' | 'Inspeção';
    intervalHours?: number;
    intervalDays?: number;
    lastPerformedDate?: Date;
    lastPerformedHours?: number;
    nextDueDate?: Date;
    nextDueHours?: number;
    status: MaintenancePlanStatus;
    estimatedCostAOA?: number;
    realCostAOA?: number;
    checklist?: { item: string; completed: boolean }[];
    assignedTechnician?: string;
    notes?: string;
    wbsItemId?: string | null;
    wbsItemName?: string | null;
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}

