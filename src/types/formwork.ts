// Types for Formwork Control Module (Controlo de Cofragem)

export type FormworkType = 'metal' | 'wood' | 'plastic' | 'mixed';
export type FormworkStatus = 'in_use' | 'available' | 'maintenance' | 'scrapped';
export type AlignmentStatus = 'approved' | 'adjusted' | 'rejected';

export interface FormworkRecord {
  id: string;
  projectId: string;
  recordNumber: string; // e.g., "COF-001"
  element: string; // e.g., "Pilar P01-P04, Piso 2"
  floor: string;
  formworkType: FormworkType;
  supplier: string;
  installDate: string;
  plannedStripDate: string;
  actualStripDate?: string;
  // Alignment checks (prumo e nível)
  verticalAlignmentMm: number; // deviation in mm
  horizontalAlignmentMm: number;
  alignmentStatus: AlignmentStatus;
  // Reuse tracking
  reuseCount: number; // how many times this panel has been used
  maxReuseAllowed: number;
  condition: 'good' | 'fair' | 'poor';
  // Area and quantities
  formworkArea: number; // m²
  releasingAgent: string; // produto desmoldante
  releasingAgentApplied: boolean;
  // Safety
  bracingOk: boolean; // escoramentos
  accessOk: boolean;
  notes: string;
  responsibleEngineer: string;
  status: FormworkStatus;
  createdAt: string;
}

export interface FormworkInventoryItem {
  id: string;
  projectId: string;
  panelRef: string; // e.g., "PT-120x60-001"
  formworkType: FormworkType;
  dimensions: string; // e.g., "120x60 cm"
  quantity: number;
  reuseCount: number;
  maxReuseAllowed: number;
  status: FormworkStatus;
  lastUsedDate?: string;
}
