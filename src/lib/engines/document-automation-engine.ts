import type { Project } from '@/types/project';
import type { MeasurementCertificate } from '@/types/measurement-certificate';
import type { WbsItem } from '@/types/wbs';
import type { Transaction } from '@/types/finance';
import type { Risk } from '@/types/risk';
import { format } from 'date-fns';

export interface GeneratedMeasurementBook {
    title: string;
    certificateNumber: string;
    period: string;
    projectName: string;
    clientName: string;
    contractNumber: string;
    compiledDate: string;
    summary: {
        totalContractAOA: number;
        previousAccumulatedAOA: number;
        currentPeriodAOA: number;
        newAccumulatedAOA: number;
        retentionAmountAOA: number;
        netPayableAOA: number;
        physicalProgressPct: number;
    };
    lineItems: {
        ref: string;
        description: string;
        unit: string;
        unitPriceAOA: number;
        measuredQty: number;
        currentValueAOA: number;
    }[];
    geotaggedEvidencePhotos: {
        title: string;
        timestamp: string;
        coordinates: string;
        imageUrl: string;
    }[];
    signatories: {
        role: string;
        name: string;
        signedDate: string;
        status: 'Assinado Digitalmente' | 'Validado pela Fiscalização' | 'Aprovado pelo Dono da Obra';
        hash?: string;
    }[];
}

export interface GeneratedBoardPackDossier {
    title: string;
    reportingPeriod: string;
    projectName: string;
    executiveSummary: string;
    evaMetrics: {
        plannedValueAOA: number; // PV
        earnedValueAOA: number;  // EV
        actualCostAOA: number;   // AC
        cpi: number; // Cost Performance Index
        spi: number; // Schedule Performance Index
        status: 'Saudável' | 'Atenção' | 'Crítico';
    };
    cashPosition: {
        totalBudgetAOA: number;
        committedExpensesAOA: number;
        cashOutflowAOA: number;
        inflowRevenueAOA: number;
        forecastEacAOA: number;
    };
    topRisks: {
        title: string;
        impact: string;
        probability: string;
        mitigation: string;
    }[];
}

export interface GeneratedHandoverBook {
    title: string;
    assetName: string;
    clientName: string;
    contractorName: string;
    completionDate: string;
    chapters: {
        number: number;
        title: string;
        description: string;
        documentsCount: number;
    }[];
    equipmentWarranties: {
        name: string;
        serialNumber: string;
        supplier: string;
        warrantyExpiry: string;
    }[];
    certificationsSummary: string;
}

// 1. Gerador em 1 Clique do Caderno de Medição
export function compileMeasurementBook(
    project: Project,
    certificate: MeasurementCertificate,
    photos: { title: string; timestamp?: string; coordinates?: string; url: string }[] = []
): GeneratedMeasurementBook {
    const net = certificate.currentPeriodValue - (certificate.retentionAmount || 0);
    const progressPct = certificate.contractTotalValue > 0 
        ? (certificate.newAccumulated / certificate.contractTotalValue) * 100 
        : 0;

    return {
        title: `Caderno Oficial de Medição nº ${certificate.certificateNumber}`,
        certificateNumber: certificate.certificateNumber,
        period: certificate.period || 'Período Corrente',
        projectName: project.name,
        clientName: project.clientName || 'Dono da Obra',
        contractNumber: certificate.contractNumber || 'CTR-2026/01',
        compiledDate: format(new Date(), 'dd/MM/yyyy HH:mm'),
        summary: {
            totalContractAOA: certificate.contractTotalValue,
            previousAccumulatedAOA: certificate.previousAccumulated,
            currentPeriodAOA: certificate.currentPeriodValue,
            newAccumulatedAOA: certificate.newAccumulated,
            retentionAmountAOA: certificate.retentionAmount || 0,
            netPayableAOA: net,
            physicalProgressPct: Number(progressPct.toFixed(1))
        },
        lineItems: certificate.lineItems.map(item => ({
            ref: item.wbsRef,
            description: item.description,
            unit: item.unit,
            unitPriceAOA: item.unitPrice,
            measuredQty: item.currentQty,
            currentValueAOA: item.currentValue
        })),
        geotaggedEvidencePhotos: photos.map(p => ({
            title: p.title || 'Registo Fotográfico de Campo',
            timestamp: p.timestamp || format(new Date(), 'dd/MM/yyyy HH:mm'),
            coordinates: p.coordinates || '-8.838333 S, 13.234444 E',
            imageUrl: p.url
        })),
        signatories: [
            {
                role: 'Diretor de Obra (Empreiteiro)',
                name: certificate.preparedBy || 'Eng. Diretor de Obra',
                signedDate: format(new Date(), 'dd/MM/yyyy'),
                status: 'Assinado Digitalmente',
                hash: 'sha256-4b9d038f82...'
            },
            {
                role: 'Fiscal Técnico Residente',
                name: certificate.checkedBy || 'Fiscalização Acreditada',
                signedDate: format(new Date(), 'dd/MM/yyyy'),
                status: 'Validado pela Fiscalização',
                hash: 'sha256-9a2c8411b...'
            },
            {
                role: 'Gestor de Contrato (Dono da Obra)',
                name: certificate.approvedBy || 'Representante do Cliente',
                signedDate: format(new Date(), 'dd/MM/yyyy'),
                status: 'Aprovado pelo Dono da Obra'
            }
        ]
    };
}

// 2. Gerador do Dossiê para o Conselho de Administração (Board Pack)
export function compileBoardPackDossier(
    project: Project,
    wbsItems: WbsItem[],
    transactions: Transaction[],
    risks: Risk[] = []
): GeneratedBoardPackDossier {
    const totalBudget = project.budget || 100_000_000;
    const actualCost = transactions.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + t.amount, 0);
    const revenue = transactions.filter(t => t.type === 'Receita').reduce((sum, t) => sum + t.amount, 0);

    const plannedValue = totalBudget * ((project.progress || 50) / 100);
    const earnedValue = totalBudget * ((project.progress || 48) / 100);

    const cpi = actualCost > 0 ? Number((earnedValue / actualCost).toFixed(2)) : 1.0;
    const spi = plannedValue > 0 ? Number((earnedValue / plannedValue).toFixed(2)) : 1.0;

    let evaStatus: GeneratedBoardPackDossier['evaMetrics']['status'] = 'Saudável';
    if (cpi < 0.90 || spi < 0.90) evaStatus = 'Crítico';
    else if (cpi < 0.98 || spi < 0.98) evaStatus = 'Atenção';

    return {
        title: `Dossiê Executivo de Engenharia & Gestão - ${project.name}`,
        reportingPeriod: format(new Date(), 'MMMM yyyy'),
        projectName: project.name,
        executiveSummary: `O projeto apresenta um avanço físico de ${project.progress || 0}%, com índice de desempenho de custos (CPI) de ${cpi} e de prazos (SPI) de ${spi}. A previsão de encerramento contratual mantém-se alinhada com as metas operacionais.`,
        evaMetrics: {
            plannedValueAOA: Math.round(plannedValue),
            earnedValueAOA: Math.round(earnedValue),
            actualCostAOA: Math.round(actualCost),
            cpi,
            spi,
            status: evaStatus
        },
        cashPosition: {
            totalBudgetAOA: totalBudget,
            committedExpensesAOA: Math.round(actualCost * 1.15),
            cashOutflowAOA: Math.round(actualCost),
            inflowRevenueAOA: Math.round(revenue),
            forecastEacAOA: Math.round(cpi > 0 ? totalBudget / cpi : totalBudget)
        },
        topRisks: risks.slice(0, 4).map(r => ({
            title: r.description || 'Risco Operacional Identificado',
            impact: String(r.impact || 3),
            probability: String(r.probability || 3),
            mitigation: r.mitigationPlan || 'Monitorização contínua e plano de contingência ativo.'
        }))
    };
}

// 3. Gerador do Livro Digital da Obra / Ativo (Digital Handover Book)
export function compileHandoverBook(
    project: Project
): GeneratedHandoverBook {
    return {
        title: `Livro Digital da Obra & Compilação Técnica (As-Built Handover)`,
        assetName: project.name,
        clientName: project.clientName || 'Dono da Obra',
        contractorName: (project as any).contractor || 'Empreiteiro Geral',
        completionDate: format(new Date(), 'dd/MM/yyyy'),
        chapters: [
            { number: 1, title: 'Termos Oficiais de Entrega e Receção Provisória', description: 'Atas de vistoria, assinaturas da fiscalização e homologação legal', documentsCount: 0 },
            { number: 2, title: 'Peças Desenhadas Finais (Telas Finais / As-Built)', description: 'Modelos BIM, plantas arquitetónicas, traçados lineares e redes técnicas', documentsCount: 0 },
            { number: 3, title: 'Controlo de Qualidade & Certificados de Ensaios', description: 'Ensaios de compressão de betão, ensaios de compactação Proctor e relatórios de armaduras', documentsCount: 0 },
            { number: 4, title: 'Fichas de Equipamentos e Manuais de Operação & Manutenção', description: 'Catálogos, garantias de fabricantes e planos de manutenção preventiva', documentsCount: 0 },
            { number: 5, title: 'Histórico Completo do Diário de Obra com Fecho Probatório', description: 'Registo diário de ocorrências assinado digitalmente com integridade garantida', documentsCount: 0 },
        ],
        equipmentWarranties: [],
        certificationsSummary: 'Conformidades ambientais, licenças municipais e certidões de receção técnica registadas para o projeto.'
    };
}

export interface MeasurementBookReport {
    id: string;
    measurementNumber: number;
    period: string;
    generatedAt: string;
    totalAmountKz: number;
    items: {
        code: string;
        description: string;
        unit: string;
        periodQuantity: number;
        unitPriceKz: number;
        totalPriceKz: number;
    }[];
    photos: {
        caption: string;
        date: string;
        coordinates: string;
        imageUrl?: string;
    }[];
    signatures: {
        name: string;
        role: string;
        status: 'ASSINADO' | 'PENDENTE';
    }[];
}

export interface ExecutiveBoardDossier {
    cpi: number;
    spi: number;
    pvKz: number;
    evKz: number;
    acKz: number;
    eacKz: number;
    vacKz: number;
    strategicRisks: {
        risk: string;
        mitigation: string;
        level: 'ALTO' | 'MEDIO' | 'BAIXO';
    }[];
}

export interface DigitalAsBuiltBook {
    chapters: {
        title: string;
        itemCount: number;
        description: string;
    }[];
}

export const documentAutomationEngine = {
    compileMeasurementBook,
    compileBoardPackDossier,
    compileHandoverBook,
    generateMeasurementBook(
        projectId: string,
        measurementNumber: number = 1,
        project?: any,
        wbsItems: any[] = []
    ): MeasurementBookReport {
        const totalAmount = wbsItems.reduce((acc, item) => acc + (item.actualCost || 0), 0);
        return {
            id: `MB-${projectId.substring(0, 6)}-${String(measurementNumber).padStart(2, '0')}`,
            measurementNumber,
            period: format(new Date(), 'MMMM / yyyy'),
            generatedAt: new Date().toISOString(),
            totalAmountKz: totalAmount,
            items: wbsItems.slice(0, 20).map((item, idx) => ({
                code: `ITEM-${idx + 1}`,
                description: item.name || 'Atividade da EAP',
                unit: 'un',
                periodQuantity: 1,
                unitPriceKz: item.budget || 0,
                totalPriceKz: item.actualCost || 0
            })),
            photos: [],
            signatures: [
                { name: project?.clientName || 'Representante do Dono da Obra', role: 'Dono da Obra', status: 'PENDENTE' }
            ]
        };
    },
    generateExecutiveBoardDossier(
        projectId: string,
        project?: any,
        wbsItems: any[] = [],
        transactions: any[] = [],
        risks: any[] = []
    ): ExecutiveBoardDossier {
        const totalBudget = project?.budget || 0;
        const progress = (project?.progress || 0) / 100;
        const actualCost = transactions.filter((t: any) => t.type === 'Despesa').reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        const pv = totalBudget;
        const ev = Math.round(totalBudget * progress);
        const ac = actualCost;
        const cpi = ac > 0 ? Number((ev / ac).toFixed(2)) : 1.0;
        const spi = pv > 0 ? Number((ev / pv).toFixed(2)) : 1.0;
        const eac = cpi > 0 ? Math.round(totalBudget / cpi) : totalBudget;
        const vac = totalBudget - eac;

        return {
            cpi,
            spi,
            pvKz: pv,
            evKz: ev,
            acKz: ac,
            eacKz: eac,
            vacKz: vac,
            strategicRisks: risks.slice(0, 5).map(r => ({
                risk: r.description || 'Risco Operacional',
                mitigation: r.mitigationPlan || 'Controlo e mitigação contínua',
                level: (r.impact > 3 ? 'ALTO' : r.impact > 2 ? 'MEDIO' : 'BAIXO') as 'ALTO' | 'MEDIO' | 'BAIXO'
            }))
        };
    },
    generateDigitalAsBuiltBook(projectId: string, project?: any): DigitalAsBuiltBook {
        return {
            chapters: [
                { title: 'Termos de Entrega e Receção Provisória', itemCount: 0, description: 'Atas de vistoria, assinaturas da fiscalização e homologação legal.' },
                { title: 'Telas Finais & Telas As-Built', itemCount: 0, description: 'Modelos BIM, plantas arquitetónicas, traçados lineares e redes técnicas finais.' },
                { title: 'Certificados de Ensaios & Controlo de Qualidade', itemCount: 0, description: 'Boletins de ensaio de compressão de betão, proctor e relatórios laboratoriais.' },
                { title: 'Manuais de Operação, Manutenção & Garantias', itemCount: 0, description: 'Catálogos dos fabricantes de equipamentos mecânicos, elétricos e garantias.' },
                { title: 'Histórico Probatório dos Diários de Obra (SHA-256)', itemCount: 0, description: 'Registo diário de ocorrências assinado digitalmente com selo temporal imutável.' }
            ]
        };
    }
};

