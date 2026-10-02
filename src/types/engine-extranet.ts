export type ExtranetRole = 'fornecedor' | 'fiscalizacao' | 'investidor';

export interface ExtranetAccessToken {
    token: string;
    projectId: string;
    projectName: string;
    role: ExtranetRole;
    recipientName: string;
    recipientEmail?: string;
    referenceId?: string; // ex: id da requisição de compra ou auto de medição
    expiresAt: string | Date;
    isRevoked: boolean;
    lastAccessedAt?: string | Date;
    createdAt: string | Date;
}

export interface SupplierQuotationItemSubmission {
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
    unitPriceAOA: number;
    brandOrOrigin?: string;
    deliveryTimeDays: number;
    notes?: string;
}

export interface SupplierQuotationSubmission {
    token: string;
    supplierName: string;
    contactPerson: string;
    phoneNumber: string;
    paymentTerms: string; // ex: '30 dias', '50% adiantado', 'Pronto Pagamento'
    proposalValidityDays: number;
    items: SupplierQuotationItemSubmission[];
    totalQuotationAOA: number;
    submittedAt: string | Date;
}

export interface SupervisionReviewSubmission {
    token: string;
    measurementId: string;
    reviewerName: string;
    decision: 'aprovado' | 'aprovado_com_reservas' | 'rejeitado';
    technicalNotes: string;
    recommendedDeductionAOA?: number;
    stampedDate: string | Date;
    signatureEvidenceHash?: string;
}

export interface InvestorProgressView {
    projectId: string;
    projectName: string;
    clientName: string;
    physicalProgressPct: number;
    financialProgressPct: number;
    plannedEndDate: string | Date;
    contractMilestones: {
        id: string;
        name: string;
        dueDate: string | Date;
        status: 'cumprido' | 'em_curso' | 'em_risco';
    }[];
    recentPhotos: {
        id: string;
        title: string;
        date: string;
        location?: string;
        url: string;
    }[];
    lastReportDate: string | Date;
}
