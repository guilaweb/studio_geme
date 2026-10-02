// Types for Quality Control Plan Module (Plano de Qualidade / PPAQ)

export type InspectionPointType = 'W' | 'H' | 'R';
// W = Witness Point (ponto de testemunho - work can proceed if inspector absent after notice)
// H = Hold Point (ponto de paragem - work CANNOT proceed without inspector approval)
// R = Review Point (ponto de revisão - document review only)

export type CheckpointStatus = 'pending' | 'scheduled' | 'passed' | 'failed' | 'waived' | 'not_applicable';
export type NonConformanceSeverity = 'minor' | 'major' | 'critical';
export type NonConformanceStatus = 'open' | 'in_treatment' | 'closed' | 'cancelled';

export interface QualityCheckpoint {
  id: string;
  planId: string;
  sequenceNo: number;
  phase: string;              // e.g. "Fundações", "Estrutura – Piso 1"
  activity: string;           // e.g. "Verificação de armaduras antes da betonagem"
  pointType: InspectionPointType;
  applicableSpec: string;     // e.g. "LNEC E 460, EN 1992"
  acceptanceCriteria: string; // e.g. "Recobrimento ≥ 25mm, espaçamento ± 10%"
  inspectorRole: string;      // e.g. "Eng. Fiscalização", "Dono de Obra"
  frequency: string;          // e.g. "100%", "1 por piso", "Aleatório 20%"
  status: CheckpointStatus;
  scheduledDate?: string;
  completedDate?: string;
  completedBy?: string;
  result?: string;
  linkedNcrIds: string[];
  notes: string;
}

export interface NonConformanceReport {
  id: string;
  projectId: string;
  ncrNumber: string;          // e.g. "NCR-2025-012"
  detectedDate: string;
  detectedBy: string;
  location: string;           // e.g. "Piso 2 – Pilar P07"
  description: string;
  severity: NonConformanceSeverity;
  rootCause: string;
  correctiveAction: string;
  responsibleParty: string;
  dueDate: string;
  closedDate?: string;
  verifiedBy?: string;
  status: NonConformanceStatus;
  linkedCheckpointId?: string;
  cost?: number;              // cost of correction
  createdAt: string;
  updatedAt: string;
}

export interface QualityPlan {
  id: string;
  projectId: string;
  revision: string;           // e.g. "Rev.02"
  title: string;
  scope: string;
  approvedBy: string;
  approvalDate: string;
  checkpoints: QualityCheckpoint[];
  createdAt: string;
  updatedAt: string;
}
