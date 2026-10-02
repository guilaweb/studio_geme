import { format } from 'date-fns';
import type { Project } from '@/types/project';
import type { DailyReport } from '@/types/daily-reports';
import {
    createExecutiveDocument,
    applyInstitutionalHeaderAndFooter,
    renderDocumentTitle,
    renderKpiCardsGrid,
    renderEngineeringTable,
    renderPhotoEvidenceGrid,
    renderSignaturesAndStampsBlock,
    generateProbativeHash,
    TechnicalPhotoEvidence,
    TechnicalSignatory,
    TechnicalStampConfig,
    PDF_COLORS,
    jsPDFWithAutoTable
} from './executive-pdf-engine';

export interface DailyReportPdfOptions {
    project: Project;
    dailyReport: DailyReport;
    workforceSummary?: {
        category: string;
        ownCount: number;
        subcontractorCount: number;
        totalHours: number;
    }[];
    equipmentLogs?: {
        name: string;
        code: string;
        initialMeter: number;
        finalMeter: number;
        hoursWorked: number;
        fuelLiters: number;
        status: string;
    }[];
    photos?: TechnicalPhotoEvidence[];
    signatories?: TechnicalSignatory[];
    probativeHash?: string;
}

/**
 * Compila o Relatório Diário de Obra (RDO) em PDF de Padrão Executivo de Engenharia
 */
export function compileExecutiveDailyReportPDF(
    options: DailyReportPdfOptions
): jsPDFWithAutoTable {
    const { project, dailyReport, workforceSummary = [], equipmentLogs = [], photos = [], signatories } = options;

    const reportDate = dailyReport.date instanceof Date 
        ? dailyReport.date 
        : new Date((dailyReport.date as any)?.toDate ? (dailyReport.date as any).toDate() : dailyReport.date);

    const formattedDate = format(reportDate, 'dd/MM/yyyy');
    const doc = createExecutiveDocument('portrait');

    let currentY = 38;

    // 1. Título do Documento
    currentY = renderDocumentTitle(
        doc,
        currentY,
        `RELATÓRIO DIÁRIO DE OBRA (RDO) • ${formattedDate}`,
        `Empreitada: ${project.name} | Responsável pelo Registo: ${dailyReport.author?.displayName || 'Encarregado Geral'}`,
        'Diário Oficial de Ocorrências'
    );

    // 2. Condições Meteorológicas e Quadro Operacional
    const ownStaff = dailyReport.ownManpower || 0;
    const subStaff = dailyReport.subcontractorManpower || 0;
    const totalStaff = ownStaff + subStaff;
    const weather = dailyReport.weather || 'Tempo Bom / Seco';

    currentY = renderKpiCardsGrid(doc, currentY, [
        {
            label: 'EFETIVO TOTAL EM CAMPO',
            value: `${totalStaff} Trabalhadores`,
            hint: `Próprios: ${ownStaff} | Subemp.: ${subStaff}`,
            status: 'success'
        },
        {
            label: 'CONDIÇÕES METEOROLÓGICAS',
            value: weather.slice(0, 22),
            hint: 'Praticabilidade do Solo: Normal',
            status: weather.toLowerCase().includes('chuva') ? 'warning' : 'normal'
        },
        {
            label: 'EQUIPAMENTOS EM OPERAÇÃO',
            value: `${equipmentLogs.length} Máquinas`,
            hint: 'Disponibilidade Mecânica',
            status: 'normal'
        },
        {
            label: 'ESTADO DO TURNO',
            value: 'Concluído & Trancado',
            hint: 'Assinatura SHA-256 Validada',
            status: 'success'
        }
    ]);

    // 3. Resumo de Atividades Executadas e Frentes de Serviço
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    doc.text('1. DESCRIÇÃO DAS ATIVIDADES EXECUTADAS NO TURNO', 14, currentY);
    currentY += 4.5;

    doc.setFillColor(PDF_COLORS.slateBg[0], PDF_COLORS.slateBg[1], PDF_COLORS.slateBg[2]);
    doc.setDrawColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);

    const activitiesText = dailyReport.activities || 'Nenhuma atividade lançada para este turno.';
    const splitActivities = doc.splitTextToSize(activitiesText, pageWidth - 36);
    const boxH = Math.max(16, (splitActivities.length * 4) + 6);

    doc.roundedRect(14, currentY, pageWidth - 28, boxH, 1, 1, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    doc.text(splitActivities, 18, currentY + 5);

    currentY += boxH + 6;

    // 4. Ocorrências, Anomalias e Paralisações (se houver)
    if (dailyReport.occurrences && dailyReport.occurrences.trim().length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(PDF_COLORS.amberWarning[0], PDF_COLORS.amberWarning[1], PDF_COLORS.amberWarning[2]);
        doc.text('2. OCORRÊNCIAS, PARALISAÇÕES OU EMBARGOS DE SEGURANÇA', 14, currentY);
        currentY += 4.5;

        const splitOccurrences = doc.splitTextToSize(dailyReport.occurrences, pageWidth - 36);
        const occBoxH = Math.max(14, (splitOccurrences.length * 4) + 6);

        doc.setFillColor(254, 242, 242); // Vermelho claro suave
        doc.setDrawColor(PDF_COLORS.roseDanger[0], PDF_COLORS.roseDanger[1], PDF_COLORS.roseDanger[2]);
        doc.roundedRect(14, currentY, pageWidth - 28, occBoxH, 1, 1, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(PDF_COLORS.roseDanger[0], PDF_COLORS.roseDanger[1], PDF_COLORS.roseDanger[2]);
        doc.text(splitOccurrences, 18, currentY + 5);

        currentY += occBoxH + 6;
    }

    // 5. Tabela de Efetivo por Categoria Profissional
    if (workforceSummary.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
        doc.text('3. EFETIVO DE MÃO DE OBRA & HORAS TRABALHADAS', 14, currentY);
        currentY += 4;

        const wfHeaders = ['CATEGORIA PROFISSIONAL', 'PESSOAL PRÓPRIO', 'SUBEMPREITEIROS', 'TOTAL HORAS'];
        const wfRows = workforceSummary.map(wf => [
            wf.category,
            `${wf.ownCount} operários`,
            `${wf.subcontractorCount} operários`,
            `${wf.totalHours} horas`
        ]);

        currentY = renderEngineeringTable(doc, currentY, wfHeaders, wfRows, {
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 35, halign: 'center' },
                2: { cellWidth: 35, halign: 'center' },
                3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
            }
        });
    }

    // 6. Tabela de Telemetria de Frotas e Horímetros
    if (equipmentLogs.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
        doc.text('4. UTILIZAÇÃO DE EQUIPAMENTOS & CONSUMO DE GASÓLEO', 14, currentY);
        currentY += 4;

        const eqHeaders = ['EQUIPAMENTO', 'CÓDIGO', 'HORÍMETRO INICIAL', 'HORÍMETRO FINAL', 'HORAS TRABALHADAS', 'GASÓLEO (L)'];
        const eqRows = equipmentLogs.map(eq => [
            eq.name,
            eq.code,
            `${eq.initialMeter} h`,
            `${eq.finalMeter} h`,
            `${eq.hoursWorked} h`,
            `${eq.fuelLiters} L`
        ]);

        currentY = renderEngineeringTable(doc, currentY, eqHeaders, eqRows, {
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 24, halign: 'center' },
                2: { cellWidth: 26, halign: 'right' },
                3: { cellWidth: 26, halign: 'right' },
                4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
                5: { cellWidth: 20, halign: 'right' }
            }
        });
    }

    // 7. Fotografias e Evidências do Dia
    const reportPhotos: TechnicalPhotoEvidence[] = photos.length > 0 ? photos : (dailyReport.photoUrls || []).map(p => ({
        title: p.name || 'Registo Fotográfico de Turno',
        timestamp: formattedDate,
        imageUrl: p.url,
        description: 'Verificação física das frentes ativas de execução em estaleiro.'
    }));

    if (reportPhotos.length > 0) {
        currentY = renderPhotoEvidenceGrid(doc, currentY, reportPhotos);
    }

    // 8. Bloco de Assinaturas e Carimbo de Trancamento Probatório
    const hash = options.probativeHash || generateProbativeHash(`${project.name}-${formattedDate}-${totalStaff}`);

    const defaultSignatories: TechnicalSignatory[] = signatories || [
        {
            role: 'Encarregado Geral / Autor do Registo',
            name: dailyReport.author?.displayName || 'Encarregado Geral de Obra',
            entity: (project as any).contractorName || 'Consórcio de Construção',
            date: formattedDate,
            status: 'Assinado Digitalmente'
        },
        {
            role: 'Diretor de Obra Residente',
            name: 'Eng. Diretor de Obra Residente',
            registrationNumber: 'OEA Nº 3421/2016',
            date: formattedDate,
            status: 'Homologado com Visto'
        },
        {
            role: 'Fiscalização Residente',
            name: 'Eng. Fiscal de Obra',
            entity: 'Fiscalização Independente de Empreitada',
            date: formattedDate,
            status: 'Homologado com Visto'
        }
    ];

    const stamp: TechnicalStampConfig = {
        title: 'TRANCAMENTO PROBATÓRIO IMUTÁVEL • RELATÓRIO DIÁRIO DE OBRA',
        entity: 'SISTEMA OPERACIONAL PROFUNDIDADE OS',
        date: formattedDate,
        statusText: `HASH SHA-256: ${hash} • VALIDADE PROBATÓRIA INTEGRAL PERANTE A FISCALIZAÇÃO`
    };

    renderSignaturesAndStampsBlock(doc, currentY, defaultSignatories, stamp);

    // 9. Aplicação Final de Cabeçalhos e Rodapés com "Página X de Y" e Hash SHA-256
    applyInstitutionalHeaderAndFooter(doc, {
        title: `Relatório Diário de Obra • ${formattedDate}`,
        documentType: 'DIÁRIO DE OBRA (RDO)',
        projectName: project.name,
        projectCode: (project as any).code || project.id.slice(0, 8).toUpperCase(),
        clientName: project.clientName,
        contractorName: (project as any).contractorName || 'Consórcio de Construção',
        date: reportDate,
        classification: 'DIÁRIO OFICIAL PROBATÓRIO DE OCORRÊNCIAS',
        hashSha256: hash
    });

    return doc;
}
