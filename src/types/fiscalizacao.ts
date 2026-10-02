// Types for Fiscalização & Engenharia de Controlo (Fiscalização Técnica de Obras em Angola)

export type InspectionPointType = 'H' | 'W' | 'R';
// H = Hold Point (Ponto de Paragem Obrigatória - trabalho não avança sem aprovação prévia do fiscal)
// W = Witness Point (Ponto de Testemunho - fiscal é convocado, mas obra pode prosseguir caso notificado)
// R = Review Point (Ponto de Revisão - análise e homologação documental prévia)

export type NonConformanceSeverity = 'menor' | 'maior' | 'critica';
export type NonConformanceStatus = 'aberta' | 'em_tratamento' | 'aguarda_vistoria' | 'encerrada';

export type RFIStatus = 'aberto' | 'em_analise' | 'respondido' | 'aprovado' | 'encerrado';
export type MaterialApprovalStatus = 'pendente' | 'aprovado' | 'aprovado_com_comentarios' | 'rejeitado';

export interface InspectionCheckItem {
  id: string;
  description: string;
  result: 'conforme' | 'nao_conforme' | 'na';
  observation?: string;
  photoUrl?: string;
}

export interface InspectionTicket {
  id: string;
  projectId: string;
  code: string; // Ex: INSP-2025-012
  title: string;
  location: string;
  pointType: InspectionPointType;
  category: 'Estruturas' | 'Fundações' | 'Terras' | 'Acabamentos' | 'Instalações' | 'HSEQ' | 'Outro';
  items: InspectionCheckItem[];
  status: 'pendente' | 'em_inspecao' | 'aprovado' | 'reprovado_com_ncr';
  scheduledDate: string;
  inspectedDate?: string;
  inspectorName: string;
  correctiveAction?: string;
  responsibleParty?: string;
  dueDate?: string;
  createdAt: string;
}

export interface NonConformance {
  id: string;
  projectId: string;
  ncrNumber: string; // Ex: RNC-2025-004
  title: string;
  location: string;
  description: string;
  severity: NonConformanceSeverity;
  photos: string[];
  responsibleParty: string; // Empreiteiro / Subempreiteiro / Encarregado
  detectedDate: string;
  detectedBy: string;
  dueDate: string;
  rootCause?: string;
  correctiveActionPlan?: string;
  resolutionNotes?: string;
  closedDate?: string;
  verifiedBy?: string;
  status: NonConformanceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RFIItem {
  id: string;
  projectId: string;
  rfiNumber: string; // Ex: RFI-2025-008
  subject: string;
  question: string;
  askedBy: {
    uid: string;
    name: string;
    organization: string;
  };
  assignedTo: {
    uid?: string;
    name: string;
    role: string;
  };
  questionDate: string;
  urgency: 'baixa' | 'media' | 'alta' | 'urgente';
  response?: string;
  respondedBy?: string;
  responseDate?: string;
  status: RFIStatus;
  createdAt: string;
}

export interface MaterialApprovalItem {
  id: string;
  projectId: string;
  code: string; // Ex: APM-2025-002
  materialName: string;
  supplier: string;
  technicalSpecs: string;
  labTestReference?: string; // Ex: Ensaio Laboratório Engenharia Angola nº 452
  submittedDate: string;
  submittedBy: string;
  decisionDate?: string;
  reviewedBy?: string;
  decision: MaterialApprovalStatus;
  comments?: string;
  createdAt: string;
}

export interface FiscalizacaoReport {
  id: string;
  projectId: string;
  reportNumber: string; // Ex: DF-2025-045
  date: string;
  weather: 'Limpo / Céu Aberto' | 'Nublado' | 'Chuva Ligeira' | 'Chuva Torrencial / Paralisação' | 'Poeira Intensa';
  workFront: string;
  observedConditions: string;
  verifiedActivities: string[];
  laborCount: {
    direct: number;
    subcontractor: number;
    total: number;
  };
  equipmentObserved: string[];
  materialsReceived: string[];
  occurrences: string;
  instructionsToContractor: string; // Ordens formais exaradas pelo fiscal no livro de obra
  pendingItems: string;
  photos: Array<{
    url: string;
    caption: string;
    gps?: string;
    timestamp: string;
  }>;
  inspector: {
    uid: string;
    displayName: string;
    role: string;
  };
  contractorRepresentative?: string;
  status: 'rascunho' | 'emitido' | 'homologado';
  createdAt: string;
  updatedAt: string;
}
