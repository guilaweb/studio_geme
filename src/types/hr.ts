'use client';

import { type Timestamp } from 'firebase/firestore';

export type HrLeaveType = 
  | 'Férias'
  | 'Licença Médica'
  | 'Falta Justificada'
  | 'Falta Injustificada'
  | 'Maternidade / Paternidade'
  | 'Luto'
  | 'Casamento'
  | 'Formação'
  | 'Outro';

export type HrRequestStatus = 
  | 'Pendente Gestor'
  | 'Pendente RH'
  | 'Aprovado'
  | 'Rejeitado'
  | 'Cancelado';

export interface HrWorkflowHistoryItem {
  action: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  timestamp: string | any;
  comment?: string;
}

export interface HrRequest {
  id: string;
  category: 'vacation' | 'absence' | 'document' | 'other';
  type: HrLeaveType;
  employeeUid: string;
  employeeWorkforceId?: string;
  employeeName: string;
  employeeEmail: string;
  employeeRole?: string;
  department: string;
  teamId?: string | null;
  teamName?: string | null;
  managerUid?: string | null;
  managerName?: string | null;
  startDate: any;
  endDate: any;
  daysCount: number;
  reason: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  status: HrRequestStatus;
  managerApproval?: {
    decision: 'approved' | 'rejected';
    decidedBy: string;
    decidedByName: string;
    decidedAt: any;
    comment?: string;
  };
  hrApproval?: {
    decision: 'approved' | 'rejected';
    decidedBy: string;
    decidedByName: string;
    decidedAt: any;
    comment?: string;
  };
  history: HrWorkflowHistoryItem[];
  createdAt: any;
  updatedAt: any;
}

export interface HrDepartment {
  id: string;
  name: string;
  code: string;
  managerUid?: string | null;
  managerName?: string | null;
  description?: string;
  memberCount?: number;
  createdAt?: any;
}

export interface HrTeam {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  leaderUid?: string | null;
  leaderName?: string | null;
  memberUids: string[];
  memberCount?: number;
  description?: string;
  createdAt?: any;
}

export interface HrPerformanceReview {
  id: string;
  employeeUid: string;
  employeeWorkforceId?: string;
  employeeName: string;
  reviewerUid: string;
  reviewerName: string;
  reviewerRole: string;
  cycleName: string;
  period: string;
  technicalScore: number; // 1 - 5
  behavioralScore: number; // 1 - 5
  safetyScore: number; // 1 - 5
  overallScore: number; // 1 - 5
  strengths: string;
  improvements: string;
  goals: string;
  confidentialComments?: string; // Visível apenas a RH e avaliador
  status: 'Rascunho' | 'Submetida' | 'Homologada pelo RH' | 'Partilhada com Colaborador';
  sharedWithEmployee: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface HrVacationBalance {
  employeeUid: string;
  year: number;
  totalDaysEntitled: number; // Padrão: 22 dias (legislação angolana)
  daysUsed: number;
  daysPending: number;
  daysRemaining: number;
}

export interface HrDocument {
  id: string;
  name: string;
  category: 'Contrato' | 'Identificação' | 'Ficha Médica' | 'Certificado' | 'Avaliação' | 'Outro';
  fileUrl: string;
  fileName: string;
  employeeUid: string;
  employeeName: string;
  visibility: 'personal' | 'team_lead' | 'confidential_hr';
  uploadedAt: any;
  expiryDate?: any;
  notes?: string;
}

export interface HrUserAccessSummary {
  isAdmin: boolean;
  isDirector: boolean;
  isHrManager: boolean;
  isManager: boolean;
  isCollaborator: boolean;
  managedTeamIds: string[];
  managedDepartmentIds: string[];
  department?: string;
  jobTitle?: string;
}
