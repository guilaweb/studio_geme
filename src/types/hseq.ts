import type { Timestamp } from 'firebase/firestore';
import type { ActionItem } from './collaboration';

export type { ActionItem };

export type IncidentType = 'Acidente de Trabalho' | 'Incidente Ambiental' | 'Quase Acidente' | 'Condição Insegura' | 'Ato Inseguro';
export type IncidentSeverity = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type IncidentStatus = 'Aberto' | 'Em Investigação' | 'Concluído';

export interface Incident {
    id: string;
    type: IncidentType;
    date: Timestamp;
    description: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    location: string; // Ex: "Bloco A, Piso 2"
    actionItems?: ActionItem[];
    photoUrls?: { url: string; name: string }[];
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}

export interface Comment {
    id: string;
    text: string;
    authorName: string;
    createdAt: Timestamp;
}

// --- AUDITORIAS ---

export type AuditType = 'Segurança' | 'Qualidade' | 'Ambiental' | 'Integrada';
export type AuditStatus = 'Agendada' | 'Em Andamento' | 'Concluída';
export type AuditFindingSeverity = 'Crítica' | 'Major' | 'Menor' | 'Oportunidade de Melhoria';


export interface AuditFinding {
    id: string;
    description: string;
    severity: AuditFindingSeverity;
    isResolved: boolean;
    createdAt: string; // ISO String
    actionItems?: ActionItem[];
}

export interface Audit {
    id: string;
    date: Timestamp;
    type: AuditType;
    scope: string; // Ex: "Auditoria aos processos de cofragem do Bloco B"
    auditor: string; // Nome do auditor
    status: AuditStatus;
    findings: AuditFinding[];
    reportUrl?: string; // Link para o relatório final em PDF
    createdAt: Timestamp;
    author: {
        uid: string;
        displayName: string;
    };
}


// --- CONTROLO DE QUALIDADE ---
export type QualityTestStatus = 'Pendente' | 'Aprovado' | 'Reprovado';

export interface QualityControlRecord {
    id: string;
    testType: string; // Ex: "Ensaio de Compressão de Betão", "Ensaio de Compactação de Solos"
    sampleId: string; // Ex: "Amostra C-15", "Lote 3"
    testDate: Timestamp;
    status: QualityTestStatus;
    reportUrl?: string; // Link to the uploaded lab report PDF
    reportName?: string;
    notes?: string;
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
    actionItems?: ActionItem[]; // <-- ADICIONADO
}


// --- ANÁLISE DE SEGURANÇA COM IA ---
export type PpeStatus = 'Presente' | 'Ausente' | 'Não Visível';
export type HazardSeverity = 'Baixa' | 'Média' | 'Alta';

export interface IdentifiedHazard {
    description: string;
    recommendation: string;
    severity: HazardSeverity;
}

export interface PpeCheck {
    item: 'Capacete' | 'Colete' | 'Botas' | 'Luvas';
    status: PpeStatus;
}

export interface SafetyAnalysisResult {
    hazards: IdentifiedHazard[];
    ppeCompliance: PpeCheck[];
    overallSafetyScore: number; // A score from 0 to 100
}

// Re-export UserRole from here if it's used across HSEQ types
export type { UserRole } from '@/app/projects/[id]/page';
