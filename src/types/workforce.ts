import type { Timestamp } from 'firebase/firestore';

export type WorkforceStatus = 'Ativo' | 'Inativo' | 'De Férias';
export type EmploymentType = 'Efetivo' | 'Temporário' | 'Subcontratado';

export interface WorkforceDocument {
    id: string;
    name: string;
    fileUrl: string;
    fileName: string;
    expiryDate?: Timestamp;
    uploadedAt: Timestamp;
}

export interface TrainingRecord {
    id: string;
    courseName: string;
    institution: string;
    completionDate: Timestamp;
    expiryDate?: Timestamp;
    documentId?: string; // Link to a document in the documents array
    documentName?: string;
    documentUrl?: string;
}

export interface OnboardingChecklistItem {
    id: string;
    text: string;
    isCompleted: boolean;
    completedAt?: Timestamp;
    completedBy?: {
        uid: string;
        displayName: string | null;
    };
}

export interface AssignedChecklist {
    id: string;
    templateName: 'Onboarding' | 'Offboarding';
    items: OnboardingChecklistItem[];
    assignedAt: Timestamp;
    isCompleted: boolean;
}


// Represents a member in the global company workforce pool
export interface WorkforceMember {
    id: string;
    name: string;
    role: string; // ex: 'Engenheiro Civil', 'Carpinteiro'
    status: WorkforceStatus;
    employmentType: EmploymentType;
    photoURL?: string;
    contact?: string;
    admissionDate?: Timestamp;
    birthDate?: Timestamp;
    address?: string;
    costPerHour?: number;
    costPerUnit?: number; // Custo por unidade de produção (ex: Kz/m²)
    documents?: WorkforceDocument[];
    skills?: string[];
    training?: TrainingRecord[];
    checklists?: AssignedChecklist[];
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelationship?: string;
    notes?: string;
    createdAt: Timestamp;
    author: {
        uid: string;
        displayName: string;
    };
    currentProjectId?: string | null;
    currentProjectName?: string | null;
}

// Represents a workforce member specifically allocated to a project
export interface ProjectWorkforceMember {
    id: string; // The doc ID in the subcollection
    workforceId: string; // ID of the member in the global 'workforce' collection
    name: string;
    role: string;
    employmentType: EmploymentType;
    allocatedAt: Timestamp;
}


export interface TimesheetEntry {
    id: string;
    date: Date;
    workforceId: string;
    workforceName: string;
    wbsItemId: string;
    wbsItemName: string;
    hours: number;
    cost: number;
    notes?: string;
    dailyReportId: string;
    projectId?: string;
}

export interface ProductionEntry {
    id: string;
    date: Timestamp;
    workforceId: string;
    workforceName: string;
    wbsItemId: string;
    wbsItemName: string;
    quantity: number;
    unit: string; // e.g., m², m³, un
    dailyReportId: string;
    projectId?: string;
}

export type LeaveType = 'Férias' | 'Licença Médica' | 'Falta Justificada' | 'Outro';
export type LeaveRequestStatus = 'Pendente' | 'Aprovado' | 'Rejeitado';

export interface LeaveRequest {
    id: string;
    type: LeaveType;
    status: LeaveRequestStatus;
    startDate: Date;
    endDate: Date;
    notes?: string;
    requester: {
        uid: string;
        displayName: string | null;
    };
    approver?: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}

export interface Payslip {
    id: string;
    periodStart: Timestamp;
    periodEnd: Timestamp;
    totalHours: number;
    totalHourlyPay: number;
    productionDetails: string;
    totalProductionPay: number;
    totalPay: number;
    generatedAt: Timestamp;
    projectId?: string;
}
