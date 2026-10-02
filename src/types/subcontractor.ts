// Types for Subcontractor Management Module (Gestão de Subempreiteiros)

export type SubcontractorStatus = 'active' | 'inactive' | 'suspended' | 'completed';
export type WorkPackageStatus = 'pending' | 'in_progress' | 'completed' | 'disputed' | 'cancelled';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type ContractType = 'global_price' | 'unit_price' | 'cost_plus' | 'time_materials';

export interface Subcontractor {
  id: string;
  projectId: string;
  name: string;
  nif: string; // Tax ID
  contact: string;
  email: string;
  phone: string;
  specialty: string; // e.g., "Betão Armado", "Impermeabilização", "Electricidade"
  status: SubcontractorStatus;
  // Contract info
  contractNumber: string;
  contractType: ContractType;
  contractValue: number;
  startDate: string;
  endDate: string;
  // Insurance & compliance
  insuranceExpiry: string;
  alvara: string; // Construction license number (alvará de construção)
  alvaraExpiry: string;
  segurancaTrabalhoExpiry: string; // Occupational safety certification expiry
  // Performance
  qualityScore: number; // 0-100
  safetyScore: number;
  scheduleScore: number;
  notes: string;
  createdAt: string;
}

export interface WorkPackage {
  id: string;
  projectId: string;
  subcontractorId: string;
  subcontractorName: string;
  description: string;
  wbsRef: string; // EAP reference
  unit: string; // m², m³, un, vg, etc.
  plannedQty: number;
  completedQty: number;
  unitPrice: number;
  totalValue: number;
  startDate: string;
  endDate: string;
  status: WorkPackageStatus;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  retentionPct: number; // % retenção de garantia
  retentionReleased: boolean;
  measurementDate?: string; // auto-medicao
  notes: string;
  createdAt: string;
}
