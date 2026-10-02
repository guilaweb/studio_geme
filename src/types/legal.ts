import type { Timestamp } from 'firebase/firestore';

export type LicenseType = 'Alvará de Construção' | 'Licença de Utilização' | 'Licença Ambiental' | 'Outro';
export type LegalDocStatus = 'Válido' | 'Perto de Expirar' | 'Expirado' | 'Em Revisão';

export interface LicensePermit {
    id: string;
    name: string;
    type: LicenseType;
    status: LegalDocStatus;
    issueDate: Date;
    expiryDate: Date;
    issuingBody: string; // Ex: Administração Municipal
    referenceNumber: string;
    fileUrl?: string;
    fileName?: string;
    notes?: string;
    createdAt: Timestamp;
    author: {
        uid: string;
        displayName: string;
    };
}

export type InsuranceType = 'Responsabilidade Civil' | 'Acidentes de Trabalho' | 'Equipamentos' | 'Automóvel' | 'Construção (All Risks)' | 'Outro';

export interface InsurancePolicy {
    id: string;
    type: InsuranceType;
    policyNumber: string;
    insurer: string; // Companhia de seguros
    status: LegalDocStatus;
    startDate: Date;
    endDate: Date;
    coverageAmount: number;
    fileUrl?: string;
    fileName?: string;
    notes?: string;
    createdAt: Timestamp;
    author: {
        uid: string;
        displayName: string;
    };
}
