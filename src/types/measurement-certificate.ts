// Types for Measurement Certificates Module (Autos de Medição)

export type MeasurementStatus = 'draft' | 'submitted' | 'approved' | 'disputed' | 'paid';
export type MeasurementParty = 'client' | 'contractor' | 'subcontractor';

export interface MeasurementLineItem {
  id: string;
  wbsRef: string;        // e.g. "1.3.2"
  description: string;   // e.g. "Betão C25/30 em lajes"
  unit: string;          // m², m³, un, ml, vg
  unitPrice: number;
  // Quantities
  previousQty: number;   // acumulado anterior
  currentQty: number;    // medição actual
  totalQty: number;      // acumulado total
  contractQty: number;   // quantidade contratada total
  // Values
  currentValue: number;  // calculated: currentQty * unitPrice
  totalValue: number;    // calculated: totalQty * unitPrice
  contractValue: number; // calculated: contractQty * unitPrice
  // Deviations
  deviationPct: number;  // (totalQty - contractQty) / contractQty * 100
}

export interface MeasurementCertificate {
  id: string;
  projectId: string;
  certificateNumber: string;  // e.g. "AM-2025-004"
  period: string;             // e.g. "Março 2025"
  periodStart: string;
  periodEnd: string;
  party: MeasurementParty;
  subcontractorId?: string;
  subcontractorName?: string;
  contractNumber: string;
  status: MeasurementStatus;
  lineItems: MeasurementLineItem[];
  // Totals
  previousAccumulated: number;
  currentPeriodValue: number;
  newAccumulated: number;
  contractTotalValue: number;
  // Retention
  retentionPct: number;
  retentionAmount: number;
  netPayable: number;        // currentPeriodValue - retentionAmount
  // Approval
  preparedBy: string;
  checkedBy: string;
  approvedBy?: string;
  approvalDate?: string;
  disputeReason?: string;
  notes?: string;
  auditTrail?: {
    status: MeasurementStatus;
    changedBy: string;
    date: string;
    notes?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

