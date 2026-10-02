// Types for Reinforcement Inspection Module (Inspeção de Armaduras)

export type RebarDiameter = '6' | '8' | '10' | '12' | '16' | '20' | '25' | '32';
export type SteelGrade = 'A400NR' | 'A500NR' | 'A500ER';
export type InspectionResult = 'approved' | 'rejected' | 'pending' | 'conditional';

export interface RebarCheck {
  element: string; // e.g., "Pilar P12", "Viga V5-A", "Laje L3"
  floor: string;
  rebarDiameter: RebarDiameter;
  steelGrade: SteelGrade;
  coverThickness: number; // in mm (recobrimento)
  overlapLength: number; // in mm (emenda por sobreposição)
  spacingOk: boolean; // afastamento
  tieWireOk: boolean; // arame de atar
  cleanliness: 'clean' | 'minor_rust' | 'major_rust' | 'contaminated'; // limpeza
  straightnessOk: boolean; // rectidão
  deficiencies: string; // lista de deficiências
  correctiveActions: string;
  result: InspectionResult;
  inspectedBy: string;
  reviewedBy: string;
  inspectionDate: string;
  photoCount: number;
  ncrNumber?: string; // Non-Conformance Report number if rejected
}

export interface ReinforcementInspection {
  id: string;
  projectId: string;
  inspectionNumber: string; // e.g., "INS-ARM-001"
  date: string;
  shift: 'morning' | 'afternoon' | 'night';
  checks: RebarCheck[];
  generalObservations: string;
  status: InspectionResult;
  linkedPourId?: string; // links to a ConcretePour record
  createdAt: string;
  updatedAt: string;
}
