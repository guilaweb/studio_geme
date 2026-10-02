import type { Timestamp } from 'firebase/firestore';

export type AnomalySeverity = 'crítica' | 'alta' | 'média' | 'baixa';
export type AnomalyCategory = 'combustivel' | 'caminho_critico' | 'regulatorio' | 'qualidade' | 'financeiro';

export interface FuelAnomalyAlert {
    id: string;
    equipmentId: string;
    equipmentName: string;
    operatorName?: string;
    date: string | Date;
    expectedConsumptionPerHour: number; // L/h média da categoria
    actualConsumptionPerHour: number; // L/h medido no período
    deviationPct: number; // ex: +32%
    excessLiters: number;
    excessCostAOA: number;
    severity: AnomalySeverity;
    suspectedCause: 'Possível Fuga / Rompimento' | 'Suspeita de Furto / Desvio' | 'Injeção Descalibrada / Motor Sobrecarga' | 'Ralenti Excessivo';
    status: 'novo' | 'investigando' | 'justificado' | 'resolvido';
    justificationNotes?: string;
}

export interface CriticalPathRiskAlert {
    id: string;
    wbsItemId: string;
    wbsItemName: string;
    predecessorName?: string;
    plannedProgress: number; // ex: 80%
    actualProgress: number; // ex: 55%
    delayDays: number;
    affectedSuccessorCount: number;
    impactOnFinalDeliveryDays: number;
    originalEndDate: string | Date;
    projectedEndDate: string | Date;
    severity: AnomalySeverity;
    recommendedMitigation: string;
}

export interface RegulatoryWatchItem {
    id: string;
    title: string;
    type: 'Licença Ambiental' | 'Título de Concessão' | 'Seguro All Risks' | 'Garantia Bancária' | 'Alvará de Construção';
    entity: string; // Ex: MIREMPET, Ministério do Ambiente, BNA
    referenceNumber: string;
    expiryDate: string | Date;
    daysRemaining: number;
    urgency: 'crítico' | 'alerta' | 'regular' | 'expirado';
    associatedAssetOrContract?: string;
}

export interface EarlyWarningSummary {
    totalActiveAlerts: number;
    criticalAlertsCount: number;
    estimatedFinancialLossAOA: number;
    criticalPathDelayDaysMax: number;
    expiringRegulationsWithin30Days: number;
    fuelAnomalies: FuelAnomalyAlert[];
    criticalPathRisks: CriticalPathRiskAlert[];
    regulatoryWatches: RegulatoryWatchItem[];
}
