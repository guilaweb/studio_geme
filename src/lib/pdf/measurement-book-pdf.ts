import { format } from 'date-fns';
import type { Project } from '@/types/project';
import type { MeasurementCertificate, MeasurementLineItem } from '@/types/measurement-certificate';
import {
    createExecutiveDocument,
    applyInstitutionalHeaderAndFooter,
    renderDocumentTitle,
    renderKpiCardsGrid,
    renderEngineeringTable,
    renderPhotoEvidenceGrid,
    renderSignaturesAndStampsBlock,
    formatCurrencyAOA,
    generateProbativeHash,
    TechnicalPhotoEvidence,
    TechnicalSignatory,
    TechnicalStampConfig,
    jsPDFWithAutoTable
} from './executive-pdf-engine';

export interface MeasurementBookPdfOptions {
    project: Project;
    certificate: Partial<MeasurementCertificate>;
    items?: MeasurementLineItem[];
    photos?: TechnicalPhotoEvidence[];
    signatories?: TechnicalSignatory[];
    notes?: string;
}

/**
 * Compila o Auto / Caderno de Medição em PDF de Padrão Executivo de Engenharia
 */
export function compileExecutiveMeasurementBookPDF(
    options: MeasurementBookPdfOptions
): jsPDFWithAutoTable {
    const { project, certificate, items = [], photos = [], signatories } = options;

    const certNumber = certificate.certificateNumber || 'AM-2026-001';
    const period = certificate.period || format(new Date(), 'MMMM yyyy');
    const contractNo = certificate.contractNumber || 'CONT-ENG-AO/2026';

    // Orientação Landscape se houver muitas colunas ou se for mais adequado para tabelas de medição
    const isLandscape = items.length > 0;
    const doc = createExecutiveDocument(isLandscape ? 'landscape' : 'portrait');

    let currentY = 38; // Inicia logo abaixo da faixa de sub-cabeçalho institucional

    // 1. Título do Documento
    currentY = renderDocumentTitle(
        doc,
        currentY,
        `AUTO DE MEDIÇÃO MENSAL DE TRABALHOS • Nº ${certNumber}`,
        `Empreitada: ${project.name} | Período de Medição: ${period} | Contrato Nº: ${contractNo}`,
        'Engenharia & Infraestruturas'
    );

    // 2. Cálculos Financeiros
    const contractTotal = certificate.contractTotalValue || project.budget || 0;
    const previousAccumulated = certificate.previousAccumulated || 0;
    const currentPeriodValue = certificate.currentPeriodValue || 
        items.reduce((acc, item) => acc + (item.currentValue || (item.currentQty * item.unitPrice) || 0), 0);
    const newAccumulated = certificate.newAccumulated || (previousAccumulated + currentPeriodValue);
    const retentionPct = certificate.retentionPct ?? 5;
    const retentionAmount = certificate.retentionAmount || (currentPeriodValue * (retentionPct / 100));
    const netPayable = certificate.netPayable || (currentPeriodValue - retentionAmount);
    const physicalProgress = contractTotal > 0 ? ((newAccumulated / contractTotal) * 100).toFixed(1) : '0';

    // 3. Cartões de KPIs Financeiros
    currentY = renderKpiCardsGrid(doc, currentY, [
        {
            label: 'VALOR DO CONTRATO',
            value: formatCurrencyAOA(contractTotal),
            hint: 'Orçamento Base Homologado'
        },
        {
            label: 'MEDIDO NO PERÍODO',
            value: formatCurrencyAOA(currentPeriodValue),
            hint: `Mês de Referência: ${period}`,
            status: 'success'
        },
        {
            label: 'RETENÇÃO GARANTIA',
            value: formatCurrencyAOA(retentionAmount),
            hint: `Taxa Contratual: ${retentionPct}%`,
            status: 'warning'
        },
        {
            label: 'LÍQUIDO A FATURAR',
            value: formatCurrencyAOA(netPayable),
            hint: 'Aprovado para Pagamento',
            status: 'success'
        },
        {
            label: 'AVANÇO ACUMULADO',
            value: `${physicalProgress}%`,
            hint: `Total: ${formatCurrencyAOA(newAccumulated)}`,
            status: 'normal'
        }
    ]);

    // 4. Tabela de Quantidades e Medições Físicas
    const tableHeaders = [
        'REF',
        'DISCRIMINAÇÃO DOS TRABALHOS (EAP)',
        'UN.',
        'P. UNITÁRIO',
        'QTD CONTRATO',
        'ACUM. ANTERIOR',
        'PERÍODO',
        'NOVO ACUM.',
        'VALOR PERÍODO (KZ)'
    ];

    const tableRows = items.map((item, index) => [
        item.wbsRef || `${index + 1}`,
        item.description,
        item.unit,
        formatCurrencyAOA(item.unitPrice),
        item.contractQty?.toLocaleString('pt-AO') || '0',
        item.previousQty?.toLocaleString('pt-AO') || '0',
        item.currentQty?.toLocaleString('pt-AO') || '0',
        item.totalQty?.toLocaleString('pt-AO') || '0',
        formatCurrencyAOA(item.currentValue || (item.currentQty * item.unitPrice))
    ]);

    // Linha de Totalizador
    if (items.length > 0) {
        tableRows.push([
            'TOTAL',
            'TOTAL DOS TRABALHOS MEDIDOS NO PERÍODO',
            '-',
            '-',
            '-',
            '-',
            '-',
            '-',
            formatCurrencyAOA(currentPeriodValue)
        ]);
    }

    currentY = renderEngineeringTable(
        doc,
        currentY,
        tableHeaders,
        tableRows,
        {
            columnStyles: {
                0: { cellWidth: 16, halign: 'center' },
                1: { cellWidth: isLandscape ? 80 : 50 },
                2: { cellWidth: 12, halign: 'center' },
                3: { cellWidth: 26, halign: 'right' },
                4: { cellWidth: 20, halign: 'right' },
                5: { cellWidth: 20, halign: 'right' },
                6: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
                7: { cellWidth: 20, halign: 'right' },
                8: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
            }
        }
    );

    // 5. Evidências Fotográficas Georreferenciadas (se houver)
    if (photos.length > 0) {
        currentY = renderPhotoEvidenceGrid(doc, currentY, photos);
    }

    // 6. Bloco Formal de Assinaturas e Carimbos
    const defaultSignatories: TechnicalSignatory[] = signatories || [
        {
            role: 'Diretor de Obra / Empreiteiro',
            name: certificate.preparedBy || 'Eng. Diretor de Obra Residente',
            entity: (project as any).contractorName || 'Consórcio de Engenharia & Construção',
            registrationNumber: 'OEA Nº 3421/2016',
            date: format(new Date(), 'dd/MM/yyyy'),
            status: 'Assinado Digitalmente'
        },
        {
            role: 'Fiscalização Residente',
            name: certificate.checkedBy || 'Eng. Fiscal de Obra Residente',
            entity: 'Gabinete de Fiscalização Técnica e Controlo de Qualidade',
            registrationNumber: 'OEA Nº 1892/2012',
            date: format(new Date(), 'dd/MM/yyyy'),
            status: 'Homologado com Visto'
        },
        {
            role: 'Dono da Obra / Contratante',
            name: certificate.approvedBy || project.clientName || 'Representante do Dono da Obra',
            entity: project.clientName || 'Entidade Pública / Privada Contratante',
            date: format(new Date(), 'dd/MM/yyyy'),
            status: 'Aprovado pelo Dono da Obra'
        }
    ];

    const stamp: TechnicalStampConfig = {
        title: 'AUTO DE MEDIÇÃO HOMOLOGADO PARA PAGAMENTO',
        entity: 'FISCALIZAÇÃO GERAL DA EMPREITADA',
        date: format(new Date(), 'dd/MM/yyyy'),
        statusText: `CONFORME CADERNO DE ENCARGOS • VALOR LÍQUIDO: ${formatCurrencyAOA(netPayable)}`
    };

    renderSignaturesAndStampsBlock(doc, currentY, defaultSignatories, stamp);

    // 7. Aplicação Final de Cabeçalhos e Rodapés com "Página X de Y" e Hash SHA-256
    applyInstitutionalHeaderAndFooter(doc, {
        title: `Auto de Medição Nº ${certNumber}`,
        documentType: 'AUTO DE MEDIÇÃO',
        projectName: project.name,
        projectCode: (project as any).code || project.id.slice(0, 8).toUpperCase(),
        clientName: project.clientName,
        contractorName: (project as any).contractorName || 'Consórcio de Engenharia & Construção',
        date: new Date(),
        classification: 'AUTO PROBATÓRIO DE MEDIÇÃO • VALIDADE FISCAL',
        hashSha256: generateProbativeHash(`${project.name}-${certNumber}-${netPayable}`)
    });

    return doc;
}
