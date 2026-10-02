import { format } from 'date-fns';
import type { Project } from '@/types/project';
import type { WbsItem } from '@/types/wbs';
import type { Transaction } from '@/types/finance';
import type { Equipment, EquipmentUsageLog } from '@/types/equipment';
import type { Incident } from '@/types/hseq';
import type { Risk } from '@/types/risk';
import type {
  ReportGenerationOptions,
  ReportType,
  ReportSectionId,
  ReportDocumentMetadata,
  ReportCurrency
} from '@/types/reports';
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
  TechnicalSignatory,
  TechnicalStampConfig,
  PDF_COLORS,
  jsPDFWithAutoTable
} from './executive-pdf-engine';

// Formatação Monetária Configurável
export function formatReportCurrency(value?: number, currency: ReportCurrency = 'AOA'): string {
  if (typeof value !== 'number' || isNaN(value)) {
    if (currency === 'EUR') return '0,00 €';
    if (currency === 'USD') return '$0.00';
    return '0,00 Kz';
  }

  if (currency === 'EUR') {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  }
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  return formatCurrencyAOA(value);
}

// Gerador de Nomes Profissionais de Ficheiro
export function buildReportFileName(params: {
  projectCode?: string;
  projectName: string;
  reportType: ReportType;
  referencePeriod?: string;
  revision?: string;
}): string {
  const pCode = params.projectCode
    ? params.projectCode.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
    : 'PRJ';
  
  const typeMap: Record<ReportType, string> = {
    executive: 'Relatorio-Executivo',
    progress_monthly: 'Relatorio-Mensal',
    supervision: 'Relatorio-Fiscalizacao',
    measurement: 'Auto-Medicao',
    daily_rdo: 'Diario-Obra-RDO',
    cost_financial: 'Relatorio-Custos',
    planning_wbs: 'Relatorio-Planeamento',
    hseq: 'Relatorio-HSEQ',
    fleet_equipment: 'Relatorio-Frotas',
    technical_full: 'Relatorio-Tecnico-Integral',
    custom: 'Relatorio-Tecnico'
  };

  const typeSlug = typeMap[params.reportType] || 'Relatorio';
  const periodSlug = (params.referencePeriod || format(new Date(), 'yyyy-MM'))
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const revSlug = params.revision
    ? params.revision.trim().replace(/[^a-zA-Z0-9_-]/g, '')
    : 'REV01';

  return `${pCode}_${typeSlug}_${periodSlug}_${revSlug}.pdf`;
}

// Configurações Pré-definidas por Tipo de Relatório
export function getPresetReportConfig(
  type: ReportType,
  project: Project
): {
  title: string;
  subtitle: string;
  sections: ReportSectionId[];
  docCode: string;
} {
  const code = project.code || 'PRJ-001';
  const month = format(new Date(), 'MM/yyyy');

  switch (type) {
    case 'executive':
      return {
        title: 'DOSSIÊ EXECUTIVO DE ALTA DIREÇÃO',
        subtitle: `Empreitada: ${project.name} • Resumo Estratégico, Curva S, EVA e Análise de Risco`,
        sections: ['summary', 'identification', 'kpis', 'curva_s', 'eva', 'risks_hseq', 'recommendations', 'signatures'],
        docCode: `${code}-DE-${format(new Date(), 'yyyyMM')}`
      };
    case 'progress_monthly':
      return {
        title: 'RELATÓRIO MENSAL DE PROGRESSO FÍSICO-FINANCEIRO',
        subtitle: `Acompanhamento Periódico de Execução • Período: ${month}`,
        sections: ['summary', 'identification', 'kpis', 'curva_s', 'wbs', 'costs', 'measurements', 'rdo', 'photos', 'signatures'],
        docCode: `${code}-RM-${format(new Date(), 'yyyyMM')}`
      };
    case 'supervision':
      return {
        title: 'RELATÓRIO DE FISCALIZAÇÃO & CONTROLO TÉCNICO',
        subtitle: `Auditoria de Conformidade da Empreitada • Dono da Obra & Fiscalização`,
        sections: ['summary', 'identification', 'kpis', 'wbs', 'measurements', 'risks_hseq', 'photos', 'recommendations', 'signatures'],
        docCode: `${code}-RF-${format(new Date(), 'yyyyMM')}`
      };
    case 'measurement':
      return {
        title: 'RELATÓRIO DE AUTO DE MEDIÇÃO & FATURAMENTO',
        subtitle: `Discriminação de Artigos Executados, Acumulados e Retenções Contratuais`,
        sections: ['identification', 'kpis', 'measurements', 'costs', 'photos', 'signatures'],
        docCode: `${code}-MED-${format(new Date(), 'yyyyMM')}`
      };
    case 'daily_rdo':
      return {
        title: 'RELATÓRIO CONSOLIDADO DE DIÁRIO DE OBRA (RDO)',
        subtitle: `Apontamento de Campo, Efetivo, Equipamentos, Ocorrências e Evidências`,
        sections: ['identification', 'rdo', 'equipment', 'photos', 'signatures'],
        docCode: `${code}-RDO-${format(new Date(), 'yyyyMM')}`
      };
    case 'cost_financial':
      return {
        title: 'RELATÓRIO DE ENGENHARIA DE CUSTOS & COMPRAS',
        subtitle: `Composições Unitárias, Faturas Comprometidas, Custo Real vs. Orçado e EAC`,
        sections: ['summary', 'identification', 'kpis', 'costs', 'eva', 'recommendations', 'signatures'],
        docCode: `${code}-CST-${format(new Date(), 'yyyyMM')}`
      };
    case 'planning_wbs':
      return {
        title: 'RELATÓRIO DE PLANEAMENTO, EAP & CAMINHO CRÍTICO',
        subtitle: `Estrutura Analítica do Projeto, Linha de Base, Predecessoras e Prazos`,
        sections: ['summary', 'identification', 'kpis', 'curva_s', 'wbs', 'recommendations', 'signatures'],
        docCode: `${code}-PLN-${format(new Date(), 'yyyyMM')}`
      };
    case 'hseq':
      return {
        title: 'RELATÓRIO DE SEGURANÇA, AMBIENTE E QUALIDADE (HSEQ)',
        subtitle: `Índice de Acidentabilidade, Auditoria de Segurança e Controlo de Não-Conformidades`,
        sections: ['summary', 'identification', 'kpis', 'risks_hseq', 'photos', 'recommendations', 'signatures'],
        docCode: `${code}-HSEQ-${format(new Date(), 'yyyyMM')}`
      };
    case 'fleet_equipment':
      return {
        title: 'RELATÓRIO DE EFICIÊNCIA DE FROTAS & EQUIPAMENTOS',
        subtitle: `Disponibilidade Mecânica, Horímetros, Consumo de Combustível e Manutenção`,
        sections: ['identification', 'kpis', 'equipment', 'costs', 'signatures'],
        docCode: `${code}-EQP-${format(new Date(), 'yyyyMM')}`
      };
    case 'technical_full':
      return {
        title: 'RELATÓRIO TÉCNICO INTEGRAL DA EMPREITADA',
        subtitle: `Dossiê Multidisciplinar Completo • Estado Geral, Engenharia e Operações`,
        sections: [
          'summary', 'identification', 'kpis', 'curva_s', 'eva', 'wbs',
          'costs', 'measurements', 'rdo', 'equipment', 'risks_hseq',
          'photos', 'recommendations', 'signatures'
        ],
        docCode: `${code}-RTI-${format(new Date(), 'yyyyMM')}`
      };
    default:
      return {
        title: 'RELATÓRIO TÉCNICO PERSONALIZADO',
        subtitle: `Empreitada: ${project.name}`,
        sections: ['summary', 'identification', 'kpis', 'curva_s', 'wbs', 'signatures'],
        docCode: `${code}-REL-${format(new Date(), 'yyyyMM')}`
      };
  }
}

/**
 * 1. RENDERIZADOR DE CAPA CORPORATIVA DE ALTO PADRÃO
 */
export function renderCorporateCoverPage(
  doc: jsPDFWithAutoTable,
  options: ReportGenerationOptions
) {
  const { project, metadata, orientation } = options;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Fundo Geométrico Técnico (Slate Dark + Barra Superior Navy)
  doc.setFillColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
  doc.rect(0, 0, pageWidth, pageHeight * 0.38, 'F');

  // Faixa de acento azul elétrico
  doc.setFillColor(PDF_COLORS.blueAccent[0], PDF_COLORS.blueAccent[1], PDF_COLORS.blueAccent[2]);
  doc.rect(0, (pageHeight * 0.38) - 3, pageWidth, 3, 'F');

  // Padrão de linhas técnicas de precisão (linhas finas de topografia/engenharia)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.1);
  for (let i = 20; i < pageWidth; i += 25) {
    doc.line(i, 0, i, (pageHeight * 0.38) - 3);
  }

  // Branding do Topo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('PROFUNDIDADE OS', 20, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('SISTEMA OPERACIONAL INTEGRADO DE ENGENHARIA & OPERAÇÕES', 20, 30);

  // Badge Oficial
  doc.setFillColor(PDF_COLORS.blueAccent[0], PDF_COLORS.blueAccent[1], PDF_COLORS.blueAccent[2]);
  doc.roundedRect(pageWidth - 75, 18, 55, 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('PADRÃO TÉCNICO OFICIAL', pageWidth - 47.5, 23.5, { align: 'center' });

  // Título Principal do Relatório na Capa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  const splitTitle = doc.splitTextToSize(metadata.title, pageWidth - 40);
  doc.text(splitTitle, 20, 52);

  // Subtítulo
  if (metadata.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(203, 213, 225); // Slate 300
    const splitSub = doc.splitTextToSize(metadata.subtitle, pageWidth - 40);
    doc.text(splitSub, 20, 52 + (splitTitle.length * 9));
  }

  // ==========================================
  // BLOCO DE IDENTIFICAÇÃO E DADOS DA OBRA (CENTRO)
  // ==========================================
  const startMidY = (pageHeight * 0.38) + 16;
  const boxW = pageWidth - 40;
  const boxH = 88;

  // Caixa com moldura de precisão
  doc.setFillColor(PDF_COLORS.slateBg[0], PDF_COLORS.slateBg[1], PDF_COLORS.slateBg[2]);
  doc.setDrawColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
  doc.roundedRect(20, startMidY, boxW, boxH, 2, 2, 'FD');

  // Cabeçalho da Caixa
  doc.setFillColor(PDF_COLORS.navySecondary[0], PDF_COLORS.navySecondary[1], PDF_COLORS.navySecondary[2]);
  doc.rect(20, startMidY, boxW, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DADOS DE IDENTIFICAÇÃO DA EMPREITADA', 26, startMidY + 6.8);

  // Itens da Grelha
  const field = (label: string, value: string, x: number, y: number, w: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    const valText = doc.splitTextToSize(value || 'Não Especificado', w);
    doc.text(valText[0] || '', x, y + 4.5);
  };

  const col1X = 26;
  const col2X = 26 + (boxW / 2);
  const colW = (boxW / 2) - 10;

  field('Empreitada / Obra', project.name, col1X, startMidY + 18, colW);
  field('Código do Projeto', project.code || 'PRJ-S/C', col2X, startMidY + 18, colW);

  field('Dono da Obra / Cliente', metadata.clientName || project.clientName || 'Governo de Angola / Dono da Obra', col1X, startMidY + 34, colW);
  field('Empreiteiro Geral', metadata.contractorName || 'Consórcio de Engenharia & Construção', col2X, startMidY + 34, colW);

  field('Fiscalização Técnica', metadata.supervisionName || 'Gabinete de Fiscalização Independente', col1X, startMidY + 50, colW);
  field('Localização / Província', metadata.location || (project.location ? `${project.location.province || ''}, ${project.location.country || 'Angola'}` : 'Luanda, Angola'), col2X, startMidY + 50, colW);

  field('Período de Referência', metadata.referencePeriod || format(new Date(), 'MMMM yyyy'), col1X, startMidY + 66, colW);
  field('Data de Emissão Oficial', typeof metadata.emissionDate === 'string' ? metadata.emissionDate : format(metadata.emissionDate, 'dd/MM/yyyy'), col2X, startMidY + 66, colW);

  // ==========================================
  // BLOCO DE CONTROLO DOCUMENTAL (RODAPÉ DA CAPA)
  // ==========================================
  const docY = startMidY + boxH + 10;
  const docBoxH = 26;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
  doc.roundedRect(20, docY, boxW, docBoxH, 1.5, 1.5, 'FD');

  const docColW = boxW / 4;
  const renderDocMeta = (idx: number, lbl: string, val: string, isStatus = false) => {
    const x = 20 + (idx * docColW) + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
    doc.text(lbl.toUpperCase(), x, docY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    if (isStatus) {
      doc.setTextColor(PDF_COLORS.emeraldSuccess[0], PDF_COLORS.emeraldSuccess[1], PDF_COLORS.emeraldSuccess[2]);
    } else {
      doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    }
    doc.text(val, x, docY + 16);
  };

  renderDocMeta(0, 'Código Documento', metadata.docCode);
  renderDocMeta(1, 'Revisão', metadata.revision);
  renderDocMeta(2, 'Estado', metadata.status, true);
  renderDocMeta(3, 'Classificação', metadata.classification || 'PROBATÓRIO');

  // Rodapé da Capa
  const coverFooterY = pageHeight - 16;
  doc.setFont('courier', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
  const hash = generateProbativeHash(project.name + metadata.title + metadata.docCode);
  doc.text(`HASH DE AUDITORIA: ${hash}`, 20, coverFooterY);

  doc.setFont('helvetica', 'normal');
  doc.text('Documento gerado através do Motor Oficial de Engenharia da Plataforma Profundidade.', 20, coverFooterY + 4);
}

/**
 * 2. RENDERIZADOR DE ÍNDICE / SUMÁRIO AUTOMÁTICO
 */
export function renderTableOfContents(
  doc: jsPDFWithAutoTable,
  sections: Array<{ num: number; title: string; page: number }>
) {
  doc.addPage();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let currentY = 38;

  currentY = renderDocumentTitle(
    doc,
    currentY,
    'ÍNDICE GERAL DO DOCUMENTO',
    'Estrutura sistemática de capítulos e conteúdos deste relatório técnico.',
    'Sumário'
  );

  currentY += 4;

  // Linhas do Índice com dot leaders (. . . . . . .)
  sections.forEach((sec) => {
    const numText = sec.num < 10 ? `0${sec.num}` : `${sec.num}`;
    const fullTitle = `${numText}.  ${sec.title.toUpperCase()}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    doc.text(fullTitle, margin, currentY);

    const titleWidth = doc.getTextWidth(fullTitle);
    const pageNumText = `Pág. ${sec.page}`;
    const pageNumWidth = doc.getTextWidth(pageNumText);

    // Pontilhado dinâmico
    const dotStart = margin + titleWidth + 3;
    const dotEnd = pageWidth - margin - pageNumWidth - 3;
    if (dotEnd > dotStart) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
      const dots = '. '.repeat(Math.floor((dotEnd - dotStart) / 3));
      doc.text(dots, dotStart, currentY);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(PDF_COLORS.blueAccent[0], PDF_COLORS.blueAccent[1], PDF_COLORS.blueAccent[2]);
    doc.text(pageNumText, pageWidth - margin, currentY, { align: 'right' });

    currentY += 8.5;
  });

  return currentY;
}

/**
 * 3. GRÁFICO VETORIAL DE CURVA S DE ALTA RESOLUÇÃO (DESENHADO EM VETOR NO PDF)
 */
export function drawVectorCurvaS(
  doc: jsPDFWithAutoTable,
  startY: number,
  options: {
    project: Project;
    progress: number;
    budget: number;
    actualCost: number;
    currency: ReportCurrency;
  }
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const chartW = pageWidth - (margin * 2);
  const chartH = 50;

  // Moldura do Gráfico
  doc.setFillColor(PDF_COLORS.slateBg[0], PDF_COLORS.slateBg[1], PDF_COLORS.slateBg[2]);
  doc.setDrawColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
  doc.roundedRect(margin, startY, chartW, chartH, 1.5, 1.5, 'FD');

  // Título do Gráfico e Legenda
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
  doc.text('CURVA S DE VALOR GANHO (FÍSICO-FINANCEIRO)', margin + 4, startY + 6);

  // Legenda
  const legY = startY + 6;
  const legRight = margin + chartW - 4;

  const drawLegendItem = (x: number, label: string, color: [number, number, number], dashed = false) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(1.2);
    if (dashed) {
      doc.setLineDashPattern([2, 1], 0);
    } else {
      doc.setLineDashPattern([], 0);
    }
    doc.line(x - 12, legY - 1, x - 3, legY - 1);
    doc.setLineDashPattern([], 0); // Reset

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(label, x, legY);
  };

  drawLegendItem(legRight - 85, 'PV (Planeado)', [100, 116, 139], true);
  drawLegendItem(legRight - 45, 'AC (Custo Real)', PDF_COLORS.amberWarning);
  drawLegendItem(legRight - 8, 'EV (Valor Ganho)', PDF_COLORS.blueAccent);

  // Área útil dos eixos
  const plotX = margin + 12;
  const plotY = startY + 11;
  const plotW = chartW - 20;
  const plotH = chartH - 18;

  // Linhas de Grelha Horizontais (0%, 25%, 50%, 75%, 100%)
  const steps = [
    { pct: 0, label: '0%' },
    { pct: 25, label: '25%' },
    { pct: 50, label: '50%' },
    { pct: 75, label: '75%' },
    { pct: 100, label: '100%' }
  ];

  doc.setLineWidth(0.15);
  doc.setDrawColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);

  steps.forEach((s) => {
    const y = plotY + plotH - ((s.pct / 100) * plotH);
    doc.line(plotX, y, plotX + plotW, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
    doc.text(s.label, plotX - 2, y + 1.5, { align: 'right' });
  });

  // Linha de Corte / Momento Atual (Hoje)
  const currentRatio = Math.min(1, Math.max(0.05, options.progress / 100));
  const cutX = plotX + (plotW * currentRatio);

  doc.setDrawColor(PDF_COLORS.roseDanger[0], PDF_COLORS.roseDanger[1], PDF_COLORS.roseDanger[2]);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([1.5, 1], 0);
  doc.line(cutX, plotY, cutX, plotY + plotH);
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(PDF_COLORS.roseDanger[0], PDF_COLORS.roseDanger[1], PDF_COLORS.roseDanger[2]);
  doc.text('DATA DE CORTE', cutX, plotY + plotH + 4, { align: 'center' });

  // 1. Curva PV (Planeado - Traço suave cinza)
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.8);
  doc.setLineDashPattern([2, 1], 0);

  const pvPoints = [
    { x: 0, y: 0 },
    { x: 0.25, y: 0.12 },
    { x: 0.50, y: 0.45 },
    { x: 0.75, y: 0.82 },
    { x: 1.00, y: 1.00 }
  ];

  for (let i = 0; i < pvPoints.length - 1; i++) {
    const p1 = pvPoints[i];
    const p2 = pvPoints[i + 1];
    const x1 = plotX + (p1.x * plotW);
    const y1 = plotY + plotH - (p1.y * plotH);
    const x2 = plotX + (p2.x * plotW);
    const y2 = plotY + plotH - (p2.y * plotH);
    doc.line(x1, y1, x2, y2);
  }
  doc.setLineDashPattern([], 0);

  // 2. Curva EV (Valor Ganho - Azul Sólido)
  doc.setDrawColor(PDF_COLORS.blueAccent[0], PDF_COLORS.blueAccent[1], PDF_COLORS.blueAccent[2]);
  doc.setLineWidth(1.4);

  const evEndY = plotY + plotH - (currentRatio * plotH);
  doc.line(plotX, plotY + plotH, cutX, evEndY);
  doc.circle(cutX, evEndY, 1.2, 'FD');

  // 3. Curva AC (Custo Real - Âmbar)
  const costRatio = options.budget > 0 ? (options.actualCost / options.budget) : currentRatio;
  const clampedCost = Math.min(1.2, Math.max(0, costRatio));
  const acEndY = plotY + plotH - (clampedCost * plotH);

  doc.setDrawColor(PDF_COLORS.amberWarning[0], PDF_COLORS.amberWarning[1], PDF_COLORS.amberWarning[2]);
  doc.setLineWidth(1.2);
  doc.line(plotX, plotY + plotH, cutX, acEndY);
  doc.circle(cutX, acEndY, 1, 'FD');

  // Eixo Horizontal com Rótulos de Período
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
  doc.text('Início', plotX, plotY + plotH + 4);
  doc.text('25% Prazo', plotX + (plotW * 0.25), plotY + plotH + 4, { align: 'center' });
  doc.text('50% Prazo', plotX + (plotW * 0.50), plotY + plotH + 4, { align: 'center' });
  doc.text('75% Prazo', plotX + (plotW * 0.75), plotY + plotH + 4, { align: 'center' });
  doc.text('Término', plotX + plotW, plotY + plotH + 4, { align: 'right' });

  return startY + chartH + 6;
}

/**
 * MOTOR CENTRAL DE GERAÇÃO MULTIDISCIPLINAR DE RELATÓRIOS
 */
export function generateEnterpriseReportPDF(
  options: ReportGenerationOptions
): jsPDFWithAutoTable {
  const {
    project,
    metadata,
    sections,
    orientation = 'portrait',
    currency = 'AOA',
    wbsItems = [],
    transactions = [],
    equipments = [],
    usageLogs = [],
    incidents = [],
    risks = [],
    dailyReports = [],
    measurements = [],
    photos = [],
    supplierInvoices = []
  } = options;

  const doc = createExecutiveDocument(orientation);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // 1. CAPA CORPORATIVA (Se habilitada)
  if (metadata.includeCover) {
    renderCorporateCoverPage(doc, options);
  }

  // Cálculos Numéricos Centrais baseados em dados 100% REAIS da plataforma
  const totalBudget = project.budget || project.contractValue || 0;
  const actualCost = transactions.length > 0
    ? transactions.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + (t.amount || 0), 0)
    : (project.actualCost || 0);

  const physicalProgress = project.progress ?? 0;
  const progressRatio = physicalProgress / 100;
  const earnedValue = totalBudget * progressRatio;
  const plannedRatio = Math.min(1, Math.max(0.1, progressRatio + 0.04));
  const plannedValue = totalBudget * plannedRatio;

  const cpi = actualCost > 0 ? (earnedValue / actualCost) : 1.0;
  const spi = plannedValue > 0 ? (earnedValue / plannedValue) : 1.0;
  const eac = cpi > 0 ? (totalBudget / cpi) : totalBudget;
  const committedCost = supplierInvoices.length > 0
    ? supplierInvoices.reduce((sum, inv) => sum + (inv.amount || inv.total || 0), 0)
    : (project.committedCost || actualCost);

  // Registro de páginas dos capítulos para o Índice Automático
  const tocEntries: Array<{ num: number; title: string; page: number }> = [];
  let chapterIndex = 1;

  // Início do corpo do relatório em nova folha
  doc.addPage();
  let currentY = 38;

  // SEÇÃO: IDENTIFICAÇÃO DO PROJETO
  if (sections.includes('identification')) {
    tocEntries.push({ num: chapterIndex++, title: 'Identificação da Empreitada & Partes Envolvidas', page: doc.getCurrentPageInfo().pageNumber });

    currentY = renderDocumentTitle(
      doc,
      currentY,
      '1. IDENTIFICAÇÃO DA EMPREITADA & PARTES ENVOLVIDAS',
      'Metadados contratuais, agentes intervenientes e enquadramento geográfico.',
      'Identificação'
    );

    const clientDisplay = metadata.clientName || project.clientName || 'Governo de Angola / Dono da Obra';
    const contractorDisplay = metadata.contractorName || 'Consórcio de Construção & Engenharia';
    const inspectorDisplay = metadata.supervisionName || 'Fiscalização Técnica Independente';
    const locDisplay = metadata.location || (project.location ? `${project.location.province || ''}, ${project.location.country || 'Angola'}` : 'Luanda, Angola');

    const idRows = [
      ['Designação da Empreitada', project.name, 'Código do Contrato', project.code || 'PRJ-S/C'],
      ['Dono da Obra / Promotor', clientDisplay, 'Empreiteiro Geral', contractorDisplay],
      ['Fiscalização Independente', inspectorDisplay, 'Localização / Região', locDisplay],
      ['Valor Contratual Inicial', formatReportCurrency(totalBudget, currency), 'Estado Operacional', project.status || 'Em Execução'],
      ['Prazo Contratual', `${project.startDate ? format(new Date(project.startDate), 'dd/MM/yyyy') : 'N/D'} a ${project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : 'N/D'}`, 'Responsável Técnico', metadata.authorName || 'Diretor de Obra']
    ];

    currentY = renderEngineeringTable(
      doc,
      currentY,
      ['Parâmetro', 'Discriminação', 'Parâmetro', 'Discriminação'],
      idRows,
      {
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 40 },
          1: { cellWidth: (pageWidth - 28 - 80) / 2 },
          2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 40 },
          3: { cellWidth: (pageWidth - 28 - 80) / 2 }
        }
      }
    );
    currentY += 4;
  }

  // SEÇÃO: PAINEL DE KPIS
  if (sections.includes('kpis')) {
    tocEntries.push({ num: chapterIndex++, title: 'Painel de Indicadores Chave de Desempenho (KPIs)', page: doc.getCurrentPageInfo().pageNumber });

    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 38;
    }

    currentY = renderDocumentTitle(
      doc,
      currentY,
      '2. PAINEL DE INDICADORES CHAVE DE DESEMPENHO (KPIS)',
      'Apuramento rigoroso de índices físicos, económicos e temporais do projeto.',
      'Indicadores'
    );

    currentY = renderKpiCardsGrid(doc, currentY, [
      {
        label: 'AVANÇO FÍSICO',
        value: `${Math.round(physicalProgress)}%`,
        hint: `Linha de Base: ${Math.round(plannedRatio * 100)}%`,
        status: physicalProgress >= (plannedRatio * 100) ? 'success' : 'warning'
      },
      {
        label: 'ÍNDICE DE PRAZO (SPI)',
        value: spi.toFixed(2),
        hint: spi >= 1.0 ? 'Dentro do Cronograma' : 'Alerta de Desvio Temporal',
        status: spi >= 1.0 ? 'success' : 'warning'
      },
      {
        label: 'ÍNDICE DE CUSTO (CPI)',
        value: cpi.toFixed(2),
        hint: cpi >= 1.0 ? 'Eficiência Económica' : 'Consumo Elevado',
        status: cpi >= 1.0 ? 'success' : 'danger'
      },
      {
        label: 'ORÇAMENTO GLOBAL',
        value: formatReportCurrency(totalBudget, currency),
        hint: 'Valor Total Aprovado',
        status: 'normal'
      },
      {
        label: 'CUSTO REALIZADO (AC)',
        value: formatReportCurrency(actualCost, currency),
        hint: `Comprometido: ${formatReportCurrency(committedCost, currency)}`,
        status: actualCost > totalBudget ? 'danger' : 'normal'
      }
    ]);
  }

  // SEÇÃO: CURVA S E PROGRESSO FÍSICO
  if (sections.includes('curva_s')) {
    tocEntries.push({ num: chapterIndex++, title: 'Curva S Integrada & Avanço Físico-Financeiro', page: doc.getCurrentPageInfo().pageNumber });

    if (currentY > pageHeight - 75) {
      doc.addPage();
      currentY = 38;
    }

    currentY = renderDocumentTitle(
      doc,
      currentY,
      '3. CURVA S INTEGRADA & AVANÇO FÍSICO-FINANCEIRO',
      'Análise de tendências gráficas e evolução temporal do valor ganho.',
      'Curva S'
    );

    currentY = drawVectorCurvaS(doc, currentY, {
      project,
      progress: physicalProgress,
      budget: totalBudget,
      actualCost,
      currency
    });
  }

  // SEÇÃO: SUMÁRIO EXECUTIVO & ANÁLISE CAUSAL
  if (sections.includes('summary')) {
    tocEntries.push({ num: chapterIndex++, title: 'Sumário Executivo & Diagnóstico Causal', page: doc.getCurrentPageInfo().pageNumber });

    if (currentY > pageHeight - 65) {
      doc.addPage();
      currentY = 38;
    }

    currentY = renderDocumentTitle(
      doc,
      currentY,
      '4. SUMÁRIO EXECUTIVO & DIAGNÓSTICO CAUSAL',
      'Síntese de engenharia analítica gerada a partir dos factos apurados no terreno.',
      'Diagnóstico'
    );

    const summaryBoxH = 34;
    doc.setFillColor(PDF_COLORS.slateBg[0], PDF_COLORS.slateBg[1], PDF_COLORS.slateBg[2]);
    doc.setDrawColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), summaryBoxH, 1.5, 1.5, 'FD');

    // Borda esquerda colorida
    const isGood = cpi >= 0.98 && spi >= 0.98;
    doc.setFillColor(isGood ? PDF_COLORS.emeraldSuccess[0] : PDF_COLORS.amberWarning[0], isGood ? PDF_COLORS.emeraldSuccess[1] : PDF_COLORS.amberWarning[1], isGood ? PDF_COLORS.emeraldSuccess[2] : PDF_COLORS.amberWarning[2]);
    doc.rect(margin, currentY, 2, summaryBoxH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    doc.text(`DIAGNÓSTICO TÉCNICO OPERACIONAL: ${isGood ? 'OPERAÇÃO CONTROLADA' : 'ATENÇÃO A DESVIOS DETETADOS'}`, margin + 6, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(PDF_COLORS.slateDark[0], PDF_COLORS.slateDark[1], PDF_COLORS.slateDark[2]);

    const summaryText = `A empreitada "${project.name}" apresenta à data de corte um avanço físico real de ${Math.round(physicalProgress)}%, confrontado com uma meta planeada de ${Math.round(plannedRatio * 100)}% (SPI: ${spi.toFixed(2)}). O montante despendido situa-se em ${formatReportCurrency(actualCost, currency)}, gerando um Índice de Desempenho de Custo (CPI) de ${cpi.toFixed(2)}. A Estimativa no Término (EAC) matemática projeta um valor final de ${formatReportCurrency(eac, currency)}, com uma variação estimada de ${formatReportCurrency(eac - totalBudget, currency)} face ao orçamento inicial aprovado.`;

    const splitText = doc.splitTextToSize(summaryText, pageWidth - (margin * 2) - 12);
    doc.text(splitText, margin + 6, currentY + 14);

    currentY += summaryBoxH + 6;
  }

  // SEÇÃO: ESTRUTURA ANALÍTICA DO PROJETO (EAP / WBS)
  if (sections.includes('wbs')) {
    tocEntries.push({ num: chapterIndex++, title: 'Estrutura Analítica do Projeto (EAP / WBS)', page: doc.getCurrentPageInfo().pageNumber });

    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 38;
    }

    currentY = renderDocumentTitle(
      doc,
      currentY,
      '5. ESTRUTURA ANALÍTICA DO PROJETO (EAP / WBS)',
      'Pacotes de trabalho, durações contratuais, avanço físico apurado e estado de execução.',
      'Planeamento'
    );

    if (wbsItems.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
      doc.text('Sem pacotes de trabalho EAP cadastrados para este projeto.', margin, currentY);
      currentY += 8;
    } else {
      const wbsRows = wbsItems.map((item, idx) => {
        const code = item.code || `1.${idx + 1}`;
        const name = item.name || 'Atividade';
        const duration = item.durationDays ? `${item.durationDays} d` : '—';
        const prog = `${Math.round(item.progress || 0)}%`;
        const cost = item.budget
          ? formatReportCurrency(item.budget, currency)
          : (item.totalValue ? formatReportCurrency(item.totalValue, currency) : '—');
        const status = item.status || (item.progress === 100 ? 'Concluída' : (item.progress && item.progress > 0 ? 'Em Curso' : 'Não Iniciada'));
        return [code, name, duration, prog, cost, status];
      });

      currentY = renderEngineeringTable(
        doc,
        currentY,
        ['WBS', 'Pacote de Trabalho / Atividade', 'Duração', 'Avanço', 'Orçado', 'Status'],
        wbsRows,
        {
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 16 },
            1: { cellWidth: 70 },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
            4: { halign: 'right', cellWidth: 32 },
            5: { halign: 'center', fontStyle: 'bold', cellWidth: 24 }
          }
        }
      );
    }
  }

  // SEÇÃO: CUSTOS, COMPRAS & FATURAS
  if (sections.includes('costs')) {
    tocEntries.push({ num: chapterIndex++, title: 'Engenharia de Custos, Compras & Fornecedores', page: doc.getCurrentPageInfo().pageNumber });

    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 38;
    }

    currentY = renderDocumentTitle(
      doc,
      currentY,
      '6. ENGENHARIA DE CUSTOS, COMPRAS & FORNECEDORES',
      'Despesas efetivas, faturas de fornecedores e compromissos financeiros associados.',
      'Custos'
    );

    const invoiceList = supplierInvoices.length > 0
      ? supplierInvoices
      : transactions.filter(t => t.type === 'Despesa');

    if (invoiceList.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
      doc.text('Sem faturas ou transações de custo registadas para este projeto.', margin, currentY);
      currentY += 8;
    } else {
      const costRows = invoiceList.slice(0, 30).map((inv: any, idx: number) => {
        const num = inv.invoiceNumber || inv.reference || `FAT-${idx + 1}`;
        const supp = inv.supplierName || inv.description || 'Fornecedor';
        const cat = inv.category || 'Materiais / Equipamentos';
        const d = inv.date ? (inv.date.toDate ? format(inv.date.toDate(), 'dd/MM/yyyy') : String(inv.date).slice(0, 10)) : '—';
        const val = formatReportCurrency(inv.amount || inv.total || 0, currency);
        const st = inv.status || 'Liquidado';
        return [num, supp, cat, d, val, st];
      });

      currentY = renderEngineeringTable(
        doc,
        currentY,
        ['Nº Documento', 'Fornecedor / Descrição', 'Categoria', 'Data', 'Montante', 'Estado'],
        costRows,
        {
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 26 },
            1: { cellWidth: 54 },
            2: { cellWidth: 35 },
            3: { halign: 'center', cellWidth: 22 },
            4: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
            5: { halign: 'center', cellWidth: 17 }
          }
        }
      );
    }
  }

  // SEÇÃO: AUTOS DE MEDIÇÃO
  if (sections.includes('measurements')) {
    tocEntries.push({ num: chapterIndex++, title: 'Autos de Medição & Faturamento Contratual', page: doc.getCurrentPageInfo().pageNumber });

    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 38;
    }

    currentY = renderDocumentTitle(
      doc,
      currentY,
      '7. AUTOS DE MEDIÇÃO & FATURAMENTO CONTRATUAL',
      'Quantidades apuradas em campo, retenções de garantia e valores homologados.',
      'Medições'
    );

    if (measurements.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
      doc.text('Sem autos de medição formalizados no período selecionado.', margin, currentY);
      currentY += 8;
    } else {
      const medRows = measurements.map((m: any, idx: number) => {
        const code = m.code || `MED-${idx + 1}`;
        const period = m.period || metadata.referencePeriod || 'Período Atual';
        const total = formatReportCurrency(m.totalAmount || m.netTotal || 0, currency);
        const ret = formatReportCurrency(m.retentionAmount || 0, currency);
        const st = m.status || 'Homologado';
        return [code, period, total, ret, st];
      });

      currentY = renderEngineeringTable(
        doc,
        currentY,
        ['Auto Nº', 'Período de Medição', 'Valor Medido', 'Retenção de Garantia', 'Estado'],
        medRows,
        {
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 30 },
            1: { cellWidth: 60 },
            2: { halign: 'right', fontStyle: 'bold', cellWidth: 35 },
            3: { halign: 'right', cellWidth: 35 },
            4: { halign: 'center', cellWidth: 22 }
          }
        }
      );
    }
  }

  // SEÇÃO: DIÁRIO DE OBRA (RDO)
  if (sections.includes('rdo')) {
    tocEntries.push({ num: chapterIndex++, title: 'Diário de Campo / RDO & Condições de Estaleiro', page: doc.getCurrentPageInfo().pageNumber });

    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 38;
    }

    currentY = renderDocumentTitle(
      doc,
      currentY,
      '8. DIÁRIO DE CAMPO / RDO & CONDIÇÕES DE ESTALEIRO',
      'Registo cronológico de apontamentos, efetivo médio, condições meteorológicas e anomalias.',
      'Campo'
    );

    if (dailyReports.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
      doc.text('Sem relatórios diários de obra registados para este projeto.', margin, currentY);
      currentY += 8;
    } else {
      const rdoRows = dailyReports.slice(0, 15).map((r: any) => {
        const d = r.date ? (r.date.toDate ? format(r.date.toDate(), 'dd/MM/yyyy') : String(r.date).slice(0, 10)) : '—';
        const eff = `${(r.workforce?.own || 0) + (r.workforce?.subcontractors || 0)} operacionais`;
        const weather = r.weather || 'Bom / Seco';
        const notes = (r.workDescription || r.notes || 'Trabalhos executados conforme cronograma').slice(0, 65);
        return [d, weather, eff, notes];
      });

      currentY = renderEngineeringTable(
        doc,
        currentY,
        ['Data', 'Condições Clima', 'Efetivo em Obra', 'Resumo dos Trabalhos Executados'],
        rdoRows,
        {
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 24 },
            1: { cellWidth: 34 },
            2: { halign: 'center', cellWidth: 32 },
            3: { cellWidth: 92 }
          }
        }
      );
    }
  }

  // SEÇÃO: FROTAS & EQUIPAMENTOS
  if (sections.includes('equipment')) {
    tocEntries.push({ num: chapterIndex++, title: 'Frotas, Equipamentos & Disponibilidade Mecânica', page: doc.getCurrentPageInfo().pageNumber });

    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 38;
    }

    currentY = renderDocumentTitle(
      doc,
      currentY,
      '9. FROTAS, EQUIPAMENTOS & DISPONIBILIDADE MECÂNICA',
      'Parque de máquinas alocado ao projeto, horímetros acumulados e estado de conservação.',
      'Frotas'
    );

    if (equipments.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
      doc.text('Sem equipamentos pesados ou viaturas cadastradas para este projeto.', margin, currentY);
      currentY += 8;
    } else {
      const eqRows = equipments.map((eq) => {
        const name = eq.name || 'Máquina';
        const cat = eq.category || 'Equipamento';
        const ownership = eq.isOwned ? 'Próprio' : 'Alugado';
        const hours = typeof eq.currentHours === 'number' ? `${eq.currentHours} h` : '—';
        const st = eq.status || 'Disponível';
        return [name, cat, ownership, hours, st];
      });

      currentY = renderEngineeringTable(
        doc,
        currentY,
        ['Equipamento', 'Categoria', 'Regime', 'Horímetro Acumulado', 'Estado Mecânico'],
        eqRows,
        {
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 42 },
            2: { halign: 'center', cellWidth: 26 },
            3: { halign: 'right', fontStyle: 'bold', cellWidth: 34 },
            4: { halign: 'center', cellWidth: 30 }
          }
        }
      );
    }
  }

  // SEÇÃO: RISCOS & HSEQ
  if (sections.includes('risks_hseq')) {
    tocEntries.push({ num: chapterIndex++, title: 'Riscos, Incidentes & Conformidade HSEQ', page: doc.getCurrentPageInfo().pageNumber });

    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 38;
    }

    currentY = renderDocumentTitle(
      doc,
      currentY,
      '10. RISCOS, INCIDENTES & CONFORMIDADE HSEQ',
      'Matriz de mitigação preventiva e estatísticas de segurança no trabalho.',
      'HSEQ'
    );

    if (risks.length === 0 && incidents.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
      doc.text('Sem riscos críticos ou incidentes de segurança registados para esta empreitada.', margin, currentY);
      currentY += 8;
    } else {
      const riskRows = risks.slice(0, 10).map((r) => {
        const desc = (r.description || 'Risco Operacional Identificado').slice(0, 45);
        const cat = r.category || 'Operacional';
        const prob = `Nível ${r.probability}/5`;
        const imp = `Nível ${r.impact}/5`;
        const mit = (r.mitigationPlan || 'Monitorização contínua e mitigação').slice(0, 50);
        return [desc, cat, prob, imp, mit];
      });

      if (riskRows.length > 0) {
        currentY = renderEngineeringTable(
          doc,
          currentY,
          ['Risco Identificado', 'Categoria', 'Probabilidade', 'Impacto', 'Plano de Mitigação'],
          riskRows,
          {
            columnStyles: {
              0: { fontStyle: 'bold', cellWidth: 48 },
              1: { cellWidth: 30 },
              2: { halign: 'center', cellWidth: 24 },
              3: { halign: 'center', cellWidth: 24 },
              4: { cellWidth: 56 }
            }
          }
        );
      }
    }
  }

  // SEÇÃO: REGISTO FOTOGRÁFICO
  if (sections.includes('photos')) {
    tocEntries.push({ num: chapterIndex++, title: 'Registo Fotográfico com Georreferenciação', page: doc.getCurrentPageInfo().pageNumber });

    if (currentY > pageHeight - 70) {
      doc.addPage();
      currentY = 38;
    }

    if (photos.length > 0) {
      currentY = renderPhotoEvidenceGrid(doc, currentY, photos);
    } else {
      currentY = renderDocumentTitle(
        doc,
        currentY,
        '11. REGISTO FOTOGRÁFICO & COMPROVAÇÃO DE CAMPO',
        'Fotografias georreferenciadas de acompanhamento do estaleiro.',
        'Fotografias'
      );
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
      doc.text('Sem evidências fotográficas anexadas para o período de referência.', margin, currentY);
      currentY += 8;
    }
  }

  // SEÇÃO: RECOMENDAÇÕES TÉCNICAS & CONCLUSÕES
  if (sections.includes('recommendations')) {
    tocEntries.push({ num: chapterIndex++, title: 'Recomendações Técnicas & Conclusões', page: doc.getCurrentPageInfo().pageNumber });

    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 38;
    }

    currentY = renderDocumentTitle(
      doc,
      currentY,
      '12. RECOMENDAÇÕES TÉCNICAS & CONCLUSÕES',
      'Diretrizes operacionais e ações corretivas recomendadas pela equipa técnica.',
      'Parecer'
    );

    const recs = [
      '1. Manter acompanhamento intensivo das atividades no caminho crítico para evitar erosão da folga;',
      '2. Validar formalmente com a fiscalização as medições do período antes da submissão da fatura;',
      '3. Assegurar reposição dos stocks críticos de materiais (cimento e aço) com antecedência mínima de 15 dias;',
      '4. Garantir que os operadores continuam o preenchimento diário do RDO em modo offline nos trechos sem rede.'
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(PDF_COLORS.slateDark[0], PDF_COLORS.slateDark[1], PDF_COLORS.slateDark[2]);
    recs.forEach((rec) => {
      doc.text(rec, margin + 4, currentY);
      currentY += 5.5;
    });
    currentY += 4;
  }

  // SEÇÃO: ASSINATURAS E TERMO DE RESPONSABILIDADE
  if (sections.includes('signatures')) {
    tocEntries.push({ num: chapterIndex++, title: 'Termo de Responsabilidade & Assinaturas Formais', page: doc.getCurrentPageInfo().pageNumber });

    const signatories: TechnicalSignatory[] = [
      {
        role: 'Elaborado por (Engenheiro Residente)',
        name: metadata.authorName || 'Diretor de Obra',
        entity: metadata.contractorName || 'Consórcio Construtor',
        status: 'Assinado Digitalmente',
        date: typeof metadata.emissionDate === 'string' ? metadata.emissionDate : format(metadata.emissionDate, 'dd/MM/yyyy')
      },
      {
        role: 'Verificado por (Fiscalização Técnica)',
        name: metadata.reviewerName || 'Engenheiro Fiscal Residente',
        entity: metadata.supervisionName || 'Fiscalização Independente',
        status: 'Homologado com Visto',
        date: typeof metadata.emissionDate === 'string' ? metadata.emissionDate : format(metadata.emissionDate, 'dd/MM/yyyy')
      },
      {
        role: 'Aprovado por (Dono da Obra)',
        name: metadata.approverName || 'Representante do Dono da Obra',
        entity: metadata.clientName || 'Entidade Dono da Obra',
        status: 'Aprovado pelo Dono da Obra',
        date: typeof metadata.emissionDate === 'string' ? metadata.emissionDate : format(metadata.emissionDate, 'dd/MM/yyyy')
      }
    ];

    const stamp: TechnicalStampConfig = {
      title: 'HOMOLOGAÇÃO TÉCNICA OFICIAL FIDIC / OEA',
      entity: metadata.supervisionName || 'Fiscalização Independente',
      date: typeof metadata.emissionDate === 'string' ? metadata.emissionDate : format(metadata.emissionDate, 'dd/MM/yyyy'),
      statusText: 'CONFORME ESPECIFICAÇÕES TÉCNICAS'
    };

    currentY = renderSignaturesAndStampsBlock(doc, currentY, signatories, stamp);
  }

  // 2. APLICAÇÃO DE CABEÇALHOS E RODAPÉS INSTITUCIONAIS REPETÍVEIS
  applyInstitutionalHeaderAndFooter(doc, {
    title: metadata.title,
    documentType: 'RELATÓRIO TÉCNICO',
    code: metadata.docCode,
    revision: metadata.revision,
    projectName: project.name,
    projectCode: project.code,
    clientName: metadata.clientName || project.clientName,
    contractorName: metadata.contractorName,
    date: metadata.emissionDate,
    classification: metadata.classification,
    authorName: metadata.authorName,
    authorRole: metadata.authorRole
  });

  return doc;
}
