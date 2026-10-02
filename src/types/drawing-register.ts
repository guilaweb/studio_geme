// Types for Drawing Register (Registo de Peças Desenhadas)

export type DrawingDiscipline =
  | 'architecture'
  | 'structure'
  | 'mep_hvac'
  | 'mep_electrical'
  | 'mep_plumbing'
  | 'civil'
  | 'landscaping'
  | 'geotechnics'
  | 'fire_safety'
  | 'other';

export type DrawingStatus =
  | 'for_review'          // Para revisão
  | 'for_approval'        // Para aprovação
  | 'approved'            // Aprovado para construção
  | 'approved_as_noted'   // Aprovado com comentários
  | 'revise_resubmit'     // Rever e resubmeter
  | 'rejected'            // Reprovado
  | 'superseded'          // Substituído
  | 'as_built'            // Telas finais
  | 'cancelled';

export type DrawingFormat = 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'custom';
export type DrawingScale = '1:1' | '1:2' | '1:5' | '1:10' | '1:20' | '1:25' | '1:50' | '1:100' | '1:200' | '1:500' | '1:1000' | 'NTS';

export interface DrawingRevision {
  revision: string;         // e.g. "A", "B", "C", "0", "1", "2"
  date: string;
  description: string;      // e.g. "Emissão inicial", "Incorpora comentários DO"
  issuedBy: string;
  receivedBy?: string;
  status: DrawingStatus;
  fileUrl?: string;
}

export interface Drawing {
  id: string;
  projectId: string;
  drawingNumber: string;    // e.g. "EST-100", "ARQ-A01-001"
  title: string;
  discipline: DrawingDiscipline;
  phase: string;            // e.g. "Estudo Prévio", "Anteprojeto", "Projeto de Execução"
  format: DrawingFormat;
  scale: DrawingScale;
  currentRevision: string;
  currentStatus: DrawingStatus;
  revisions: DrawingRevision[];
  linkedRfiIds: string[];
  linkedBimElementIds: string[];
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}
