import type { Timestamp } from 'firebase/firestore';

export type ApprovalTier = 'encarregado' | 'diretor_obra' | 'cfo_diretoria';
export type WorkflowStatus = 'pendente' | 'em_aprovacao' | 'aprovado' | 'rejeitado' | 'bloqueado_probatorio';

export interface ApprovalLevelThreshold {
    tier: ApprovalTier;
    roleName: string;
    maxAmountAOA: number; // ex: 1500000, 15000000, Infinity
}

export interface WorkflowApprovalStep {
    tier: ApprovalTier;
    roleName: string;
    assignedUserId?: string;
    assignedUserName?: string;
    approvedAt?: string | Date;
    status: 'pendente' | 'aprovado' | 'rejeitado';
    comments?: string;
    digitalSignatureHash?: string;
}

export interface RequisitionWorkflow {
    id: string;
    projectId: string;
    requisitionNumber: string;
    description: string;
    totalAmountAOA: number;
    requiredTier: ApprovalTier;
    currentTier: ApprovalTier;
    status: WorkflowStatus;
    requestedBy: { uid: string; name: string };
    requestedAt: string | Date;
    steps: WorkflowApprovalStep[];
    wbsItemId?: string | null;
    wbsItemName?: string | null;
}

export interface DailyLogProbativeLock {
    id: string;
    projectId: string;
    dailyReportId: string;
    date: string;
    weatherCondition: string;
    workforceCount: number;
    equipmentCount: number;
    executedTasksCount: number;
    digitalSignatureHash: string; // SHA-256
    signedBy: { uid: string; displayName: string; role: string };
    timestamp: string | Date;
    isLocked: boolean;
    verificationChainUrl?: string;
}

export interface MeasurementEvidenceCheck {
    measurementId: string;
    certificateNumber: string;
    hasGeotaggedPhotos: boolean;
    photoCount: number;
    hasLabTestsOrStakeLogs: boolean;
    testReportCount: number;
    isEligibleForSubmission: boolean;
    missingEvidenceWarnings: string[];
}

export interface SmartStockReplenishmentTrigger {
    id: string;
    materialName: string;
    unit: string;
    currentStock: number;
    dailyConsumptionRate: number; // Consumo médio por dia
    leadTimeDays: number; // Tempo de entrega do fornecedor
    safetyStock: number; // Margem de contingência
    reorderPoint: number; // Ponto de encomenda: (C_diário * T_entrega) + S_segurança
    suggestedOrderQty: number;
    isTriggered: boolean;
    status: 'alerta_gerado' | 'pre_ordem_emitida' | 'cotacao_em_curso';
    lastUpdated: string | Date;
}
