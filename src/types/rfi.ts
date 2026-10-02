// Types for RFI Management (Pedidos de Informação / Esclarecimento)

export type RfiStatus =
  | 'draft'
  | 'open'
  | 'pending_response'
  | 'answered'
  | 'closed'
  | 'cancelled';

export type RfiPriority = 'low' | 'medium' | 'high' | 'critical';
export type RfiImpact = 'none' | 'cost' | 'schedule' | 'cost_and_schedule' | 'technical';

export type RfiDiscipline =
  | 'architecture'
  | 'structure'
  | 'mep'
  | 'civil'
  | 'geotechnics'
  | 'fire_safety'
  | 'contract'
  | 'other';

export interface RfiResponse {
  id: string;
  responseDate: string;
  respondedBy: string;
  responseText: string;
  attachments: string[];
  accepted: boolean;         // Was the response accepted by the originator?
  acceptedDate?: string;
  acceptedBy?: string;
}

export interface Rfi {
  id: string;
  projectId: string;
  rfiNumber: string;         // e.g. "RFI-2025-042"
  subject: string;
  description: string;
  discipline: RfiDiscipline;
  priority: RfiPriority;
  status: RfiStatus;
  submittedBy: string;
  submittedTo: string;       // who is expected to respond
  submittedDate: string;
  dueDate: string;
  closedDate?: string;
  // Impact
  impact: RfiImpact;
  costImpact?: number;       // EUR
  scheduleImpact?: number;   // working days
  // References
  linkedDrawingIds: string[];
  linkedClauseRef: string;   // Contract/spec clause
  // Response
  response?: RfiResponse;
  // Tracking
  daysOpen: number;
  isOverdue: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
