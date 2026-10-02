'use client';

import type { Timestamp } from 'firebase/firestore';

export const STAGES = [
    'Qualificação',
    'Contato Realizado',
    'Visita Agendada',
    'Proposta Enviada',
    'Negociação',
    'Ganha',
    'Perdida',
] as const;

export type Stage = typeof STAGES[number];

export interface Opportunity {
    id: string;
    name: string;
    accountId: string; // ID da conta/empresa associada
    accountName: string; // Nome da conta/cliente
    value: number;
    stage: Stage;
    createdAt: Timestamp | Date;
    closedAt?: Timestamp | Date;
    author: {
        uid: string;
        displayName: string;
    };
    sourceLeadId?: string; // ID do lead original
    projectId?: string; // ID do projeto criado a partir da oportunidade
    currency?: string; // Ex: 'AOA', 'USD', 'EUR'
    probability?: number; // 0 - 100%
    expectedCloseDate?: string | Timestamp | Date;
    assignedTo?: {
        uid: string;
        displayName: string;
    };
    origin?: string; // Ex: 'Indicação', 'Site', 'Concurso Público', 'Redes Sociais'
    description?: string;
    productsServices?: string;
    notes?: string;
    contactId?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    nextActivityDate?: string | Timestamp | Date;
    nextActivityTitle?: string;
    lastInteraction?: string | Timestamp | Date;
    documents?: {
        id?: string;
        name: string;
        url: string;
        uploadedAt?: string;
    }[];
    activities?: Activity[]; // Para acesso rápido nos cartões
}

export type StageColumn = {
    id: Stage;
    title: string;
    opportunities: Opportunity[];
};

export type ActivityType = 
    | 'Chamada' 
    | 'Reunião' 
    | 'Email' 
    | 'Visita' 
    | 'Tarefa' 
    | 'Demonstração' 
    | 'Proposta' 
    | 'Acompanhamento' 
    | 'Outro';

export type ActivityStatus = 'Pendente' | 'Em andamento' | 'Concluída' | 'Cancelada';

export interface Activity {
    id: string;
    text: string;
    type: ActivityType;
    status: ActivityStatus;
    dueDate?: Timestamp | Date;
    dueTime?: string;
    durationMinutes?: number;
    priority?: 'Baixa' | 'Média' | 'Alta';
    relatedTo?: {
        type: 'lead' | 'opportunity' | 'account' | 'contact';
        id: string;
        name: string;
    };
    assignee?: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp | Date;
    completedAt?: Timestamp | Date;
    author: {
        uid: string;
        displayName: string;
    };
}

export type LeadStatus = 'Novo' | 'Contactado' | 'Qualificado' | 'Não Qualificado' | 'Convertido';
export type LeadPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export interface Lead {
    id: string;
    name: string;
    email: string;
    phone: string;
    company?: string;
    role?: string;
    location?: string;
    source: string;
    industry?: string;
    interest?: string;
    status: LeadStatus;
    priority?: LeadPriority;
    assignedTo?: {
        uid: string;
        displayName: string;
    };
    message?: string;
    notes?: string;
    createdAt: Timestamp | Date;
    lastInteraction?: string | Timestamp | Date;
    nextActivity?: string;
    convertedAccountId?: string;
    convertedOpportunityId?: string;
    convertedAt?: Timestamp | Date;
    author: {
        uid: string;
        displayName: string;
    };
    activities?: Activity[];
}

export type CustomerQuoteStatus = 
    | 'Rascunho' 
    | 'Enviada' 
    | 'Visualizada' 
    | 'Em Negociação' 
    | 'Aprovada' 
    | 'Rejeitada' 
    | 'Expirada';

export interface CustomerQuote {
    id: string;
    quoteNumber?: string;
    title: string;
    status: CustomerQuoteStatus;
    items: QuoteItem[];
    totalCost: number;
    salePrice: number;
    margin: number;
    markup: number;
    opportunityId?: string;
    opportunityName?: string;
    accountId?: string;
    accountName?: string;
    clientContactPerson?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientNif?: string;
    validUntil?: string | Timestamp | Date;
    scopeDescription?: string;
    paymentTerms?: string;
    deliveryPeriodDays?: number;
    createdAt: Timestamp | Date;
    author: {
        uid: string;
        displayName: string;
    };
}

export interface QuoteItem {
    id: string;
    name: string;
    cost: number;
    unitPrice?: number;
    quantity: number;
    unit: string;
    total?: number;
}

export type AccountIndustry = 
    | 'Construção Civil' 
    | 'Imobiliário' 
    | 'Serviços de Engenharia' 
    | 'Governo' 
    | 'Mineração & Energia' 
    | 'Infraestruturas' 
    | 'Particular' 
    | 'Outro';

export type AccountRating = 'Estratégico' | 'Frequente' | 'Pontual';
export type AccountStatus = 'Ativo' | 'Inativo' | 'Potencial';

export interface Contact {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role?: string; // Ex: 'Diretor Geral', 'Diretor de Obras', 'Engenheiro Residente', 'Compras', 'Financeiro'
    department?: string;
    isPrimary?: boolean;
    notes?: string;
    createdAt?: Timestamp | Date | string;
}

export interface Account {
    id: string;
    name: string;
    nif?: string;
    industry: AccountIndustry;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    city?: string;
    province?: string;
    rating?: AccountRating;
    status?: AccountStatus;
    assignedTo?: {
        uid: string;
        displayName: string;
    };
    notes?: string;
    contacts?: Contact[];
    associatedProjectIds?: string[];
    createdAt: Timestamp | Date;
    author: {
        uid: string;
        displayName: string;
    };
}
