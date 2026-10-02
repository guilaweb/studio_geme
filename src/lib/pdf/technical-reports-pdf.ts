import { format } from 'date-fns';
import type { Project } from '@/types/project';
import type { Transaction } from '@/types/finance';
import type { Equipment, EquipmentUsageLog } from '@/types/equipment';
import type { Incident } from '@/types/hseq';
import type { WbsItem } from '@/types/wbs';
import type { Risk } from '@/types/risk';
import {
    createExecutiveDocument,
    applyInstitutionalHeaderAndFooter,
    renderDocumentTitle,
    renderKpiCardsGrid,
    renderEngineeringTable,
    renderSignaturesAndStampsBlock,
    formatCurrencyAOA,
    generateProbativeHash,
    TechnicalSignatory,
    TechnicalStampConfig,
    PDF_COLORS,
    jsPDFWithAutoTable
} from './executive-pdf-engine';

// ============================================================================
// 1. DOSSIÊ DO CONSELHO DE ADMINISTRAÇÃO (CURVA S & ANÁLISE DE VALOR GANHO EVA)
// ============================================================================
export interface BoardDossierPdfOptions {
    project: Project;
    wbsItems?: WbsItem[];
    transactions?: Transaction[];
    risks?: Risk[];
    signatories?: TechnicalSignatory[];
}

export function compileExecutiveBoardDossierPDF(
    options: BoardDossierPdfOptions
): jsPDFWithAutoTable {
    const { project, wbsItems = [], transactions = [], risks = [], signatories } = options;
    const doc = createExecutiveDocument('portrait');

    let currentY = 38;

    currentY = renderDocumentTitle(
        doc,
        currentY,
        'DOSSIÊ EXECUTIVO DO CONSELHO DE ADMINISTRAÇÃO',
        `Empreitada: ${project.name} • Análise de Desempenho Físico-Financeiro (Curva S / EVA)`,
        'Alta Direção & Governação'
    );

    // Cálculos de EVA
    const totalBudget = project.budget || 1;
    const actualCost = transactions
        .filter(t => t.type === 'Despesa')
        .reduce((sum, t) => sum + t.amount, 0);

    const progressRatio = (project.progress || 0) / 100;
    const earnedValue = totalBudget * progressRatio;
    const plannedValue = totalBudget * Math.min(1, Math.max(0.1, progressRatio + 0.05)); // Projeção

    const cpi = actualCost > 0 ? (earnedValue / actualCost) : 1.0;
    const spi = plannedValue > 0 ? (earnedValue / plannedValue) : 1.0;
    const eac = cpi > 0 ? (totalBudget / cpi) : totalBudget;

    let evaStatus: 'success' | 'warning' | 'danger' = 'success';
    let statusText = 'Operação Eficiente (Dentro do Custo & Prazo)';
    if (cpi < 0.95 || spi < 0.95) {
        evaStatus = 'warning';
        statusText = 'Atenção aos Prazos e Consumo de Contingência';
    }
    if (cpi < 0.85 || spi < 0.85) {
        evaStatus = 'danger';
        statusText = 'Alerta Crítico: Desvio Significativo de Custo/Prazo';
    }

    currentY = renderKpiCardsGrid(doc, currentY, [
        {
            label: 'VALOR GANHO (EV)',
            value: formatCurrencyAOA(earnedValue),
            hint: `Avanço Físico: ${Math.round(project.progress || 0)}%`,
            status: 'success'
        },
        {
            label: 'CUSTO REAL (AC)',
            value: formatCurrencyAOA(actualCost),
            hint: 'Despesas Efetivamente Pagas',
            status: actualCost > earnedValue ? 'warning' : 'normal'
        },
        {
            label: 'ÍNDICE CPI (CUSTO)',
            value: cpi.toFixed(2),
            hint: cpi >= 1.0 ? 'Abaixo do Orçamento' : 'Acima do Orçamento',
            status: evaStatus
        },
        {
            label: 'PREVISÃO NO TÉRMINO (EAC)',
            value: formatCurrencyAOA(eac),
            hint: `Desvio: ${formatCurrencyAOA(eac - totalBudget)}`,
            status: evaStatus
        }
    ]);

    // Resumo Executivo para a Direção
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    doc.text('1. SÍNTESE EXECUTIVA PARA DECISÃO ESTRATÉGICA', 14, currentY);
    currentY += 4.5;

    doc.setFillColor(PDF_COLORS.slateBg[0], PDF_COLORS.slateBg[1], PDF_COLORS.slateBg[2]);
    doc.setDrawColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);

    const execSummaryText = `A empreitada apresenta um avanço físico global de ${Math.round(project.progress || 0)}%, com um índice de desempenho de custos (CPI) de ${cpi.toFixed(2)} e de prazos (SPI) de ${spi.toFixed(2)}. ${statusText}. O orçamento contratual aprovado de ${formatCurrencyAOA(totalBudget)} tem uma estimativa de custo final (EAC) recalculada em ${formatCurrencyAOA(eac)}.`;
    const splitExec = doc.splitTextToSize(execSummaryText, pageWidth - 36);
    const summaryBoxH = Math.max(16, (splitExec.length * 4) + 6);

    doc.roundedRect(14, currentY, pageWidth - 28, summaryBoxH, 1, 1, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    doc.text(splitExec, 18, currentY + 5);

    currentY += summaryBoxH + 6;

    // Tabela de Pacotes Críticos da EAP
    if (wbsItems.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
        doc.text('2. STATUS DOS PACOTES DE TRABALHO DA EAP', 14, currentY);
        currentY += 4;

        const wbsHeaders = ['PACOTE / ATIVIDADE', 'INÍCIO PREVISTO', 'TÉRMINO', 'PROGRESSO (%)', 'ORÇAMENTO (KZ)'];
        const wbsRows = wbsItems.slice(0, 10).map((item, idx) => [
            item.name,
            item.startDate ? format(new Date(item.startDate), 'dd/MM/yyyy') : '-',
            item.endDate ? format(new Date(item.endDate), 'dd/MM/yyyy') : '-',
            `${Math.round(item.progress || 0)}%`,
            formatCurrencyAOA(item.budget)
        ]);

        currentY = renderEngineeringTable(doc, currentY, wbsHeaders, wbsRows, {
            columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 26, halign: 'center' },
                2: { cellWidth: 26, halign: 'center' },
                3: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
                4: { cellWidth: 34, halign: 'right' }
            }
        });
    }

    // Tabela de Riscos Críticos
    if (risks.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
        doc.text('3. MATRIZ DE RISCOS CRÍTICOS & CONTRAMEDIDAS', 14, currentY);
        currentY += 4;

        const riskHeaders = ['RISCO IDENTIFICADO', 'IMPACTO', 'PROBABILIDADE', 'AÇÃO DE MITIGAÇÃO / PLANO DE CONTINGÊNCIA'];
        const riskRows = risks.slice(0, 5).map(r => [
            r.description || 'Risco Operacional Registado',
            String(r.impact || '3'),
            String(r.probability || '3'),
            r.mitigationPlan || 'Acompanhamento rigoroso em comitê de obra.'
        ]);

        currentY = renderEngineeringTable(doc, currentY, riskHeaders, riskRows, {
            columnStyles: {
                0: { cellWidth: 55 },
                1: { cellWidth: 22, halign: 'center' },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 80 }
            }
        });
    }

    // Bloco de Assinaturas
    const defaultSignatories: TechnicalSignatory[] = signatories || [
        {
            role: 'Diretor Geral de Operações',
            name: 'Diretoria de Engenharia & Infraestruturas',
            date: format(new Date(), 'dd/MM/yyyy'),
            status: 'Assinado Digitalmente'
        },
        {
            role: 'Diretor Financeiro (CFO)',
            name: 'Gabinete de Finanças & Controlo de Gestão',
            date: format(new Date(), 'dd/MM/yyyy'),
            status: 'Homologado com Visto'
        },
        {
            role: 'Presidente do Conselho de Administração',
            name: 'Conselho de Administração',
            date: format(new Date(), 'dd/MM/yyyy'),
            status: 'Aprovado pelo Dono da Obra'
        }
    ];

    renderSignaturesAndStampsBlock(doc, currentY, defaultSignatories);

    applyInstitutionalHeaderAndFooter(doc, {
        title: 'Dossiê do Conselho de Administração',
        documentType: 'DOSSIÊ EXECUTIVO',
        projectName: project.name,
        projectCode: (project as any).code || project.id.slice(0, 8).toUpperCase(),
        clientName: project.clientName,
        date: new Date(),
        classification: 'CONFIDENCIAL • RELATÓRIO DO CONSELHO DE ADMINISTRAÇÃO',
        hashSha256: generateProbativeHash(`${project.name}-BOARD-${eac}`)
    });

    return doc;
}

// ============================================================================
// 2. RELATÓRIO DE AUDITORIA FINANCEIRA & FLUXO DE CAIXA EM KWANZAS (KZ)
// ============================================================================
export interface FinancialAuditPdfOptions {
    project: Project;
    transactions: Transaction[];
    budget: number;
    signatories?: TechnicalSignatory[];
}

export function compileExecutiveFinancialAuditPDF(
    options: FinancialAuditPdfOptions
): jsPDFWithAutoTable {
    const { project, transactions, budget, signatories } = options;
    const doc = createExecutiveDocument('portrait');

    let currentY = 38;

    currentY = renderDocumentTitle(
        doc,
        currentY,
        'RELATÓRIO DE AUDITORIA FINANCEIRA & FLUXO DE CAIXA',
        `Empreitada: ${project.name} | Moeda Oficial: Kwanzas de Angola (AOA / Kz)`,
        'Auditoria & Controlo Financeiro'
    );

    const expenses = transactions.filter(t => t.type === 'Despesa');
    const revenues = transactions.filter(t => t.type === 'Receita');
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalRevenues = revenues.reduce((sum, t) => sum + t.amount, 0);
    const balance = budget - totalExpenses;
    const marginPct = budget > 0 ? (((budget - totalExpenses) / budget) * 100).toFixed(1) : '0';

    currentY = renderKpiCardsGrid(doc, currentY, [
        {
            label: 'ORÇAMENTO PREVISTO',
            value: formatCurrencyAOA(budget),
            hint: 'Dotação Inicial Aprovada'
        },
        {
            label: 'DESPESAS REALIZADAS',
            value: formatCurrencyAOA(totalExpenses),
            hint: `${expenses.length} Pagamentos Validados`,
            status: totalExpenses > budget ? 'danger' : 'normal'
        },
        {
            label: 'RECEITAS RECEBIDAS',
            value: formatCurrencyAOA(totalRevenues),
            hint: `${revenues.length} Autos Pagos`,
            status: 'success'
        },
        {
            label: 'SALDO RESIDUAL (KZ)',
            value: formatCurrencyAOA(balance),
            hint: `Margem: ${marginPct}%`,
            status: balance >= 0 ? 'success' : 'danger'
        }
    ]);

    // Tabela com as Despesas Detalhadas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    doc.text('EXTRATO ANALÍTICO DE MOVIMENTOS FINANCEIROS', 14, currentY);
    currentY += 4;

    const txHeaders = ['DATA', 'TIPO', 'CATEGORIA / CONTA', 'DESCRIÇÃO DA OPERAÇÃO', 'VALOR (KZ)'];
    const txRows = transactions.slice(0, 25).map(t => {
        const d = t.date ? new Date((t.date as any).toDate ? (t.date as any).toDate() : t.date) : new Date();
        return [
            format(d, 'dd/MM/yyyy'),
            t.type,
            (t as any).category || t.accountName || 'Geral',
            t.description || 'Movimento Financeiro Registado',
            formatCurrencyAOA(t.amount)
        ];
    });

    currentY = renderEngineeringTable(doc, currentY, txHeaders, txRows, {
        columnStyles: {
            0: { cellWidth: 24, halign: 'center' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 40 },
            3: { cellWidth: 62 },
            4: { cellWidth: 36, halign: 'right', fontStyle: 'bold' }
        }
    });

    // Bloco de Assinaturas
    const defaultSignatories: TechnicalSignatory[] = signatories || [
        {
            role: 'Controler Financeiro de Obra',
            name: 'Responsável pelo Controlo de Custos',
            date: format(new Date(), 'dd/MM/yyyy'),
            status: 'Assinado Digitalmente'
        },
        {
            role: 'Diretor Financeiro (CFO)',
            name: 'Direção Financeira e Administrativa',
            date: format(new Date(), 'dd/MM/yyyy'),
            status: 'Homologado com Visto'
        }
    ];

    const stamp: TechnicalStampConfig = {
        title: 'EXTRATO FINANCEIRO OFICIAL AUDITADO',
        entity: 'DIREÇÃO DE CONTROLADORIA & AUDITORIA INTERNA',
        date: format(new Date(), 'dd/MM/yyyy'),
        statusText: `SALDO LIQUIDADO CONFORME AS CONTAS DA EMPREITADA`
    };

    renderSignaturesAndStampsBlock(doc, currentY, defaultSignatories, stamp);

    applyInstitutionalHeaderAndFooter(doc, {
        title: 'Relatório de Auditoria Financeira',
        documentType: 'RELATÓRIO TÉCNICO',
        projectName: project.name,
        projectCode: (project as any).code || project.id.slice(0, 8).toUpperCase(),
        clientName: project.clientName,
        date: new Date(),
        classification: 'EXTRATO PROBATÓRIO FINANCEIRO',
        hashSha256: generateProbativeHash(`${project.name}-FIN-${totalExpenses}`)
    });

    return doc;
}

// ============================================================================
// 3. RELATÓRIO DE EFICIÊNCIA DE FROTAS & CONSUMO DE COMBUSTÍVEL
// ============================================================================
export interface FleetReportPdfOptions {
    project: Project;
    equipments: Equipment[];
    usageLogs: EquipmentUsageLog[];
    signatories?: TechnicalSignatory[];
}

export function compileExecutiveFleetReportPDF(
    options: FleetReportPdfOptions
): jsPDFWithAutoTable {
    const { project, equipments, usageLogs, signatories } = options;
    const doc = createExecutiveDocument('portrait');

    let currentY = 38;

    currentY = renderDocumentTitle(
        doc,
        currentY,
        'RELATÓRIO DE EFICIÊNCIA DA FROTA & TELEMETRIA DE COMBUSTÍVEL',
        `Empreitada: ${project.name} | Auditoria de Disponibilidade Mecânica e Consumo de Gasóleo`,
        'Gestão de Ativos & Frotas'
    );

    const totalHours = usageLogs.reduce((acc, l) => acc + (l.hoursUsed || (l as any).hoursWorked || 0), 0);
    const totalFuel = usageLogs.reduce((acc, l) => acc + (l.fuelConsumed || (l as any).fuelLiters || 0), 0);
    const avgRatio = totalHours > 0 ? (totalFuel / totalHours).toFixed(1) : '0';
    const activeCount = equipments.filter(e => e.status === 'Em Uso' || (e.status as string) === 'Em Operação').length;

    currentY = renderKpiCardsGrid(doc, currentY, [
        {
            label: 'FROTA REGISTADA',
            value: `${equipments.length} Máquinas`,
            hint: `${activeCount} em Operação Ativa`,
            status: 'normal'
        },
        {
            label: 'HORÍMETRO TOTAL',
            value: `${totalHours.toFixed(0)} Horas`,
            hint: 'Período Apontado',
            status: 'normal'
        },
        {
            label: 'GASÓLEO ABASTECIDO',
            value: `${totalFuel.toLocaleString('pt-AO')} Litros`,
            hint: 'Consumo no Estaleiro',
            status: 'warning'
        },
        {
            label: 'RÁCIO MÉDIO (L/H)',
            value: `${avgRatio} L/h`,
            hint: 'Média de Eficiência Global',
            status: Number(avgRatio) > 25 ? 'danger' : 'success'
        }
    ]);

    // Tabela de Equipamentos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    doc.text('ESTADO INDIVIDUAL DAS MÁQUINAS E HORÍMETROS', 14, currentY);
    currentY += 4;

    const eqHeaders = ['EQUIPAMENTO', 'CATEGORIA', 'ESTADO ATUAL', 'PROPRIEDADE', 'HORÍMETRO ACUM.'];
    const eqRows = equipments.map(eq => [
        eq.name,
        eq.category || 'Veículo Pesado',
        eq.status || 'Disponível',
        eq.isOwned ? 'Próprio' : 'Alugado',
        `${eq.currentHours || (eq as any).totalHours || 0} h`
    ]);

    currentY = renderEngineeringTable(doc, currentY, eqHeaders, eqRows, {
        columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 35 },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 28, halign: 'center' },
            4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
        }
    });

    const defaultSignatories: TechnicalSignatory[] = signatories || [
        {
            role: 'Chefe de Oficina / Manutenção',
            name: 'Encarregado Mecânico Residente',
            date: format(new Date(), 'dd/MM/yyyy'),
            status: 'Assinado Digitalmente'
        },
        {
            role: 'Diretor de Obra Residente',
            name: 'Direção Técnica da Empreitada',
            date: format(new Date(), 'dd/MM/yyyy'),
            status: 'Homologado com Visto'
        }
    ];

    renderSignaturesAndStampsBlock(doc, currentY, defaultSignatories);

    applyInstitutionalHeaderAndFooter(doc, {
        title: 'Relatório de Eficiência da Frota',
        documentType: 'RELATÓRIO TÉCNICO',
        projectName: project.name,
        projectCode: (project as any).code || project.id.slice(0, 8).toUpperCase(),
        clientName: project.clientName,
        date: new Date(),
        classification: 'TELEMETRIA DE EQUIPAMENTOS • USO OFICIAL',
        hashSha256: generateProbativeHash(`${project.name}-FLEET-${totalFuel}`)
    });

    return doc;
}

// ============================================================================
// 4. RELATÓRIO DE AUDITORIA DE SEGURANÇA & HSEQ
// ============================================================================
export interface HseqReportPdfOptions {
    project: Project;
    incidents: Incident[];
    daysWithoutIncident: number;
    signatories?: TechnicalSignatory[];
}

export function compileExecutiveHseqReportPDF(
    options: HseqReportPdfOptions
): jsPDFWithAutoTable {
    const { project, incidents, daysWithoutIncident, signatories } = options;
    const doc = createExecutiveDocument('portrait');

    let currentY = 38;

    currentY = renderDocumentTitle(
        doc,
        currentY,
        'AUDITORIA DE SEGURANÇA NO TRABALHO, SAÚDE & AMBIENTE (HSEQ)',
        `Empreitada: ${project.name} | Controlo de Incidentes e Mitigação de Riscos Ocupacionais`,
        'Conformidade Regulamentar HSEQ'
    );

    const criticalIncidents = incidents.filter(i => i.severity === 'Crítica' || i.severity === 'Alta').length;

    currentY = renderKpiCardsGrid(doc, currentY, [
        {
            label: 'DIAS SEM ACIDENTES (LTI)',
            value: `${daysWithoutIncident} Dias`,
            hint: 'Meta: Zero Acidentes',
            status: daysWithoutIncident > 30 ? 'success' : 'warning'
        },
        {
            label: 'TOTAL DE OCORRÊNCIAS',
            value: `${incidents.length} Registos`,
            hint: 'Histórico Completo',
            status: 'normal'
        },
        {
            label: 'OCORRÊNCIAS CRÍTICAS',
            value: `${criticalIncidents}`,
            hint: 'Ações Imediatas Mitigadas',
            status: criticalIncidents > 0 ? 'danger' : 'success'
        },
        {
            label: 'STATUS DE CONFORMIDADE',
            value: criticalIncidents === 0 ? 'Conforme' : 'Sob Auditoria',
            hint: 'Normas Angolanas e OIT',
            status: criticalIncidents === 0 ? 'success' : 'warning'
        }
    ]);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    doc.text('REGISTO HISTÓRICO DE OCORRÊNCIAS E AÇÕES CORRETIVAS', 14, currentY);
    currentY += 4;

    const incHeaders = ['DATA', 'TÍTULO / OCORRÊNCIA', 'SEVERIDADE', 'ESTADO', 'AÇÃO MITIGADORA'];
    const incRows = incidents.map(inc => {
        const d = inc.date ? new Date((inc.date as any).toDate ? (inc.date as any).toDate() : inc.date) : new Date();
        const actionDesc = (inc.actionItems && inc.actionItems.length > 0)
            ? inc.actionItems.map(a => a.text || (a as any).description || 'Ação implementada').join('; ')
            : 'Investigação e treino da equipa de campo executado.';
        return [
            format(d, 'dd/MM/yyyy'),
            inc.description || 'Ocorrência HSEQ Registada',
            inc.severity || 'Baixa',
            inc.status || 'Resolvido',
            actionDesc
        ];
    });

    currentY = renderEngineeringTable(doc, currentY, incHeaders, incRows, {
        columnStyles: {
            0: { cellWidth: 24, halign: 'center' },
            1: { cellWidth: 50 },
            2: { cellWidth: 26, halign: 'center' },
            3: { cellWidth: 26, halign: 'center' },
            4: { cellWidth: 56 }
        }
    });

    const defaultSignatories: TechnicalSignatory[] = signatories || [
        {
            role: 'Técnico de Segurança e Higiene (HSEQ)',
            name: 'Responsável de Segurança no Trabalho',
            date: format(new Date(), 'dd/MM/yyyy'),
            status: 'Assinado Digitalmente'
        },
        {
            role: 'Diretor de Obra Residente',
            name: 'Direção Técnica da Empreitada',
            date: format(new Date(), 'dd/MM/yyyy'),
            status: 'Homologado com Visto'
        }
    ];

    renderSignaturesAndStampsBlock(doc, currentY, defaultSignatories);

    applyInstitutionalHeaderAndFooter(doc, {
        title: 'Auditoria de Segurança & HSEQ',
        documentType: 'RELATÓRIO TÉCNICO',
        projectName: project.name,
        projectCode: (project as any).code || project.id.slice(0, 8).toUpperCase(),
        clientName: project.clientName,
        date: new Date(),
        classification: 'AUDITORIA HSEQ • LIVRO DE SEGURANÇA',
        hashSha256: generateProbativeHash(`${project.name}-HSEQ-${daysWithoutIncident}`)
    });

    return doc;
}

// ============================================================================
// 5. RELATÓRIO CUSTOMIZADO EMITIDO PELO CONSTRUTOR DE CONSULTAS
// ============================================================================
export interface CustomQueryReportPdfOptions {
    project: Project;
    reportTitle: string;
    sourceName: string;
    dateRangeLabel?: string;
    summaryMetrics: { label: string; value: string; hint?: string }[];
    headers: string[];
    rows: (string | number)[][];
    signatories?: TechnicalSignatory[];
}

export function compileExecutiveCustomQueryReportPDF(
    options: CustomQueryReportPdfOptions
): jsPDFWithAutoTable {
    const { project, reportTitle, sourceName, dateRangeLabel, summaryMetrics, headers, rows, signatories } = options;
    const isLandscape = headers.length > 5;
    const doc = createExecutiveDocument(isLandscape ? 'landscape' : 'portrait');

    let currentY = 38;

    currentY = renderDocumentTitle(
        doc,
        currentY,
        reportTitle.toUpperCase(),
        `Empreitada: ${project.name} | Fonte de Dados: ${sourceName} ${dateRangeLabel ? `| Período: ${dateRangeLabel}` : ''}`,
        'Consulta Técnica Customizada'
    );

    if (summaryMetrics && summaryMetrics.length > 0) {
        currentY = renderKpiCardsGrid(doc, currentY, summaryMetrics.map(m => ({
            label: m.label,
            value: m.value,
            hint: m.hint,
            status: 'normal'
        })));
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    doc.text('RESULTADO DETALHADO DA CONSULTA DINÂMICA', 14, currentY);
    currentY += 4;

    currentY = renderEngineeringTable(doc, currentY, headers, rows);

    const defaultSignatories: TechnicalSignatory[] = signatories || [
        {
            role: 'Engenheiro Responsável pela Consulta',
            name: 'Gabinete Técnico de Planeamento',
            date: format(new Date(), 'dd/MM/yyyy'),
            status: 'Assinado Digitalmente'
        },
        {
            role: 'Diretor de Obra Residente',
            name: 'Direção Técnica da Empreitada',
            date: format(new Date(), 'dd/MM/yyyy'),
            status: 'Homologado com Visto'
        }
    ];

    renderSignaturesAndStampsBlock(doc, currentY, defaultSignatories);

    applyInstitutionalHeaderAndFooter(doc, {
        title: reportTitle,
        documentType: 'RELATÓRIO TÉCNICO',
        projectName: project.name,
        projectCode: (project as any).code || project.id.slice(0, 8).toUpperCase(),
        clientName: project.clientName,
        date: new Date(),
        classification: 'RELATÓRIO TÉCNICO CUSTOMIZADO • PROFUNDIDADE OS',
        hashSha256: generateProbativeHash(`${project.name}-${reportTitle}-${rows.length}`)
    });

    return doc;
}
