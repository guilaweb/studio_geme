import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, differenceInDays, isAfter, isBefore, startOfWeek, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WbsItem } from '@/types/wbs';
import {
  createExecutiveDocument,
  applyInstitutionalHeaderAndFooter,
  renderDocumentTitle,
  renderKpiCardsGrid,
  renderSignaturesAndStampsBlock,
  TechnicalSignatory,
  PDF_COLORS,
  generateProbativeHash,
  jsPDFWithAutoTable
} from './executive-pdf-engine';

export interface GanttSchedulePdfOptions {
  project: {
    id: string;
    name: string;
    code?: string;
    clientName?: string;
    contractorName?: string;
    location?: string;
    budget?: number;
  };
  tasks: WbsItem[];
  paperSize?: 'a4' | 'a3';
  timeframe?: 'all' | 'lookahead_30' | 'lookahead_60' | 'lookahead_90';
  showCriticalPath?: boolean;
  showBaseline?: boolean;
  showProgressLine?: boolean;
  showKpis?: boolean;
  showSignatures?: boolean;
  statusDate?: Date;
  signatories?: TechnicalSignatory[];
}

/**
 * Compila o Cronograma do Projeto (Gráfico de Gantt) em formato PDF Executivo de Alta Resolução.
 * Gera prancha vetorial nos formatos internacionais A3 ou A4 (Paisagem) com tabela EAP e timeline gráfica.
 */
export function compileGanttSchedulePDF(options: GanttSchedulePdfOptions): jsPDFWithAutoTable {
  const {
    project,
    tasks,
    paperSize = 'a3',
    timeframe = 'all',
    showCriticalPath = true,
    showBaseline = true,
    showProgressLine = true,
    showKpis = true,
    showSignatures = true,
    statusDate = new Date(),
    signatories
  } = options;

  // 1. Criação do documento jsPDF em modo Paisagem
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: paperSize,
    compress: true
  }) as jsPDFWithAutoTable;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // 2. Normalização e ordenação de tarefas
  const validTasks = tasks
    .filter((t) => t.startDate && t.endDate)
    .map((t) => {
      const start = t.startDate instanceof Date ? t.startDate : (t.startDate as any)?.toDate ? (t.startDate as any).toDate() : new Date(t.startDate);
      const end = t.endDate instanceof Date ? t.endDate : (t.endDate as any)?.toDate ? (t.endDate as any).toDate() : new Date(t.endDate);
      const bStart = t.baselineStartDate ? (t.baselineStartDate instanceof Date ? t.baselineStartDate : (t.baselineStartDate as any)?.toDate ? (t.baselineStartDate as any).toDate() : new Date(t.baselineStartDate)) : undefined;
      const bEnd = t.baselineEndDate ? (t.baselineEndDate instanceof Date ? t.baselineEndDate : (t.baselineEndDate as any)?.toDate ? (t.baselineEndDate as any).toDate() : new Date(t.baselineEndDate)) : undefined;
      return {
        ...t,
        startDate: start,
        endDate: end,
        baselineStartDate: bStart,
        baselineEndDate: bEnd
      };
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  if (validTasks.length === 0) {
    let y = 38;
    y = renderDocumentTitle(
      doc,
      y,
      'CRONOGRAMA GERAL DE EXECUÇÃO & REDE CPM',
      `Empreitada: ${project.name} • Sem atividades com datas cadastradas`,
      'Cronograma Oficial'
    );
    return doc;
  }

  // 3. Determinação da Janela Temporal (Timeline Bounds)
  const earliestTaskStart = validTasks.reduce(
    (min, t) => (t.startDate < min ? t.startDate : min),
    validTasks[0].startDate
  );
  const latestTaskEnd = validTasks.reduce(
    (max, t) => (t.endDate > max ? t.endDate : max),
    validTasks[0].endDate
  );

  let timelineStart = startOfWeek(earliestTaskStart, { weekStartsOn: 1 });
  let timelineEnd = addDays(latestTaskEnd, 7);

  if (timeframe === 'lookahead_30') {
    timelineStart = startOfDay(statusDate);
    timelineEnd = addDays(timelineStart, 30);
  } else if (timeframe === 'lookahead_60') {
    timelineStart = startOfDay(statusDate);
    timelineEnd = addDays(timelineStart, 60);
  } else if (timeframe === 'lookahead_90') {
    timelineStart = startOfDay(statusDate);
    timelineEnd = addDays(timelineStart, 90);
  }

  const totalTimelineDays = Math.max(1, differenceInDays(timelineEnd, timelineStart) + 1);

  // 4. Cabeçalho do Documento
  let currentY = 36;
  const timeframeLabel =
    timeframe === 'all'
      ? 'Cronograma Integral da Empreitada'
      : timeframe === 'lookahead_30'
      ? 'Lookahead Operacional (30 Dias)'
      : timeframe === 'lookahead_60'
      ? 'Bimestre Executivo (60 Dias)'
      : 'Trimestre Contratual (90 Dias)';

  currentY = renderDocumentTitle(
    doc,
    currentY,
    'CRONOGRAMA GERAL DE EXECUÇÃO & REDE CPM',
    `Empreitada: ${project.name} • Código: ${project.code || 'OBRA-2026'} • Local: ${project.location || 'Angola'} • ${timeframeLabel} • Data de Corte: ${format(statusDate, 'dd/MM/yyyy')}`,
    'Cronograma Homologado'
  );

  // 5. KPIs Executivos do Cronograma
  if (showKpis) {
    const totalDays = differenceInDays(latestTaskEnd, earliestTaskStart) + 1;
    const criticalTasks = validTasks.filter((t) => (t as any).isCriticalPath || (t as any).isCritical);
    const milestones = validTasks.filter((t) => t.isMilestone);
    const completedMilestones = milestones.filter((m) => (m.progress || 0) === 100);
    const totalWeight = validTasks.reduce((acc, t) => acc + (t.weight || 5), 0) || 1;
    const weightedProgress = Math.round(
      validTasks.reduce((acc, t) => acc + (t.progress || 0) * (t.weight || 5), 0) / totalWeight
    );

    currentY = renderKpiCardsGrid(doc, currentY, [
      {
        label: 'DURAÇÃO GLOBAL',
        value: `${totalDays} dias`,
        hint: `${format(earliestTaskStart, 'dd/MM/yy')} → ${format(latestTaskEnd, 'dd/MM/yy')}`,
        status: 'normal'
      },
      {
        label: 'AVANÇO FÍSICO',
        value: `${weightedProgress}%`,
        hint: 'Média Ponderada da EAP',
        status: weightedProgress >= 100 ? 'success' : 'normal'
      },
      {
        label: 'CAMINHO CRÍTICO',
        value: `${criticalTasks.length} itens`,
        hint: `${Math.round((criticalTasks.length / validTasks.length) * 100)}% da rede sem folga`,
        status: criticalTasks.length > 0 ? 'danger' : 'success'
      },
      {
        label: 'MARCOS CONCLUÍDOS',
        value: `${completedMilestones.length} / ${milestones.length}`,
        hint: 'Pontos de Controle',
        status: completedMilestones.length === milestones.length ? 'success' : 'warning'
      },
      {
        label: 'ESCALA DA FOLHA',
        value: paperSize.toUpperCase(),
        hint: `${totalTimelineDays} dias na prancha`,
        status: 'normal'
      }
    ]);
  }

  // 6. Preparação das Colunas da Tabela
  // Para A3 (420mm): mais espaço para o gráfico. Para A4 (297mm): proporções compactas.
  const isA3 = paperSize === 'a3';
  const tableMargin = margin;
  const availableTableWidth = pageWidth - tableMargin * 2;

  const colWidths = isA3
    ? {
        code: 16,
        name: 80,
        start: 18,
        end: 18,
        duration: 12,
        progress: 12,
        cpm: 12,
        slack: 14,
        timeline: availableTableWidth - (16 + 80 + 18 + 18 + 12 + 12 + 12 + 14)
      }
    : {
        code: 12,
        name: 52,
        start: 15,
        end: 15,
        duration: 10,
        progress: 10,
        cpm: 10,
        slack: 11,
        timeline: availableTableWidth - (12 + 52 + 15 + 15 + 10 + 10 + 10 + 11)
      };

  const headers = [
    'CÓD',
    'PACOTE DE TRABALHO / ATIVIDADE',
    'INÍCIO',
    'TÉRMINO',
    'DUR',
    '%',
    'CPM',
    'FOLGA',
    `CRONOGRAMA DE GANTT (${format(timelineStart, 'dd/MM')} a ${format(timelineEnd, 'dd/MM/yyyy')})`
  ];

  const tableRows = validTasks.map((t) => {
    const isCritical = (t as any).isCriticalPath || (t as any).isCritical;
    const dur = differenceInDays(t.endDate, t.startDate) + 1;
    const slack = (t as any).totalSlack !== undefined ? `${(t as any).totalSlack}d` : '0d';

    return [
      t.code || '-',
      t.name,
      format(t.startDate, 'dd/MM/yy'),
      format(t.endDate, 'dd/MM/yy'),
      `${dur}d`,
      `${t.progress || 0}%`,
      isCritical ? 'CRÍTICO' : 'Normal',
      slack,
      '' // Coluna da timeline desenhada no didDrawCell
    ];
  });

  // 7. Renderização com jsPDF AutoTable com gancho didDrawCell para desenhar barras vetoriais
  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: tableRows,
    theme: 'grid',
    margin: {
      top: 36,
      bottom: 24,
      left: tableMargin,
      right: tableMargin
    },
    styles: {
      font: 'helvetica',
      fontSize: isA3 ? 7.5 : 6.5,
      cellPadding: isA3 ? 1.8 : 1.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: PDF_COLORS.navyPrimary,
      valign: 'middle'
    },
    headStyles: {
      fillColor: PDF_COLORS.navySecondary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: isA3 ? 7.5 : 6.5,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: colWidths.code, halign: 'center', font: 'courier' },
      1: { cellWidth: colWidths.name },
      2: { cellWidth: colWidths.start, halign: 'center' },
      3: { cellWidth: colWidths.end, halign: 'center' },
      4: { cellWidth: colWidths.duration, halign: 'center' },
      5: { cellWidth: colWidths.progress, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: colWidths.cpm, halign: 'center' },
      7: { cellWidth: colWidths.slack, halign: 'center' },
      8: { cellWidth: colWidths.timeline, halign: 'left' }
    },
    showHead: 'everyPage',
    rowPageBreak: 'avoid',

    didDrawCell: (data) => {
      // Desenho do Grid de Timeline na coluna 8
      if (data.column.index === 8) {
        const { x, y, width, height } = data.cell;

        // Cabeçalho da Timeline: Marcas de meses / semanas
        if (data.section === 'head') {
          doc.setFillColor(241, 245, 249);
          doc.rect(x, y, width, height, 'F');

          // Divisões temporais
          const segments = isA3 ? 8 : 4;
          const segWidth = width / segments;
          doc.setFontSize(5.5);
          doc.setTextColor(71, 85, 105);

          for (let i = 0; i < segments; i++) {
            const segX = x + i * segWidth;
            const segDate = addDays(timelineStart, Math.round((i / segments) * totalTimelineDays));
            doc.setDrawColor(203, 213, 225);
            doc.line(segX, y, segX, y + height);
            doc.text(format(segDate, 'dd/MM', { locale: ptBR }), segX + 1.5, y + height - 1.5);
          }
          return;
        }

        // Linhas de Dados: Desenho da Barra de Gantt
        if (data.section === 'body') {
          const task = validTasks[data.row.index];
          if (!task) return;

          // Desenha fundo da célula de tempo com linhas verticais subtis
          doc.setDrawColor(241, 245, 249);
          const segments = isA3 ? 8 : 4;
          const segWidth = width / segments;
          for (let i = 1; i < segments; i++) {
            const segX = x + i * segWidth;
            doc.line(segX, y, segX, y + height);
          }

          // Linha de Status de Hoje (se dentro da janela)
          if (showProgressLine && !isBefore(statusDate, timelineStart) && !isAfter(statusDate, timelineEnd)) {
            const statusOffsetDays = differenceInDays(statusDate, timelineStart);
            const statusX = x + (statusOffsetDays / totalTimelineDays) * width;
            doc.setDrawColor(245, 158, 11); // Âmbar
            doc.setLineWidth(0.4);
            doc.setLineDashPattern([1, 1], 0);
            doc.line(statusX, y, statusX, y + height);
            doc.setLineDashPattern([], 0); // Reset
          }

          // Barra de Linha de Base (Baseline) se habilitada
          if (showBaseline && task.baselineStartDate && task.baselineEndDate) {
            const bStartOffset = Math.max(0, differenceInDays(task.baselineStartDate, timelineStart));
            const bDuration = Math.max(1, differenceInDays(task.baselineEndDate, task.baselineStartDate) + 1);
            const bX = x + (bStartOffset / totalTimelineDays) * width;
            const bW = Math.max(1.5, (bDuration / totalTimelineDays) * width);
            const bY = y + height - 2.2;

            doc.setFillColor(148, 163, 184); // Slate 400
            doc.roundedRect(bX, bY, bW, 1.2, 0.4, 0.4, 'F');
          }

          // Atividade: Marco Contratual (Milestone)
          if (task.isMilestone) {
            const startOffset = Math.max(0, differenceInDays(task.startDate, timelineStart));
            const diamondX = x + (startOffset / totalTimelineDays) * width;
            const diamondY = y + height / 2;
            const size = isA3 ? 2.5 : 2;

            doc.setFillColor(245, 158, 11); // Âmbar
            doc.setDrawColor(217, 119, 6);
            doc.triangle(
              diamondX, diamondY - size,
              diamondX + size, diamondY,
              diamondX, diamondY + size,
              'FD'
            );
            doc.triangle(
              diamondX, diamondY - size,
              diamondX - size, diamondY,
              diamondX, diamondY + size,
              'FD'
            );
            return;
          }

          // Atividade Normal: Cálculo de Posição da Barra
          const startOffset = Math.max(0, differenceInDays(task.startDate, timelineStart));
          const duration = Math.max(1, differenceInDays(task.endDate, task.startDate) + 1);
          const barX = x + (startOffset / totalTimelineDays) * width;
          const barW = Math.max(2, (duration / totalTimelineDays) * width);
          const barH = isA3 ? 3.8 : 3;
          const barY = y + (height - barH) / 2;

          const isCritical = (task as any).isCriticalPath || (task as any).isCritical;
          const isDelayed = task.status === 'delayed' || ((task.progress || 0) < 100 && task.endDate < new Date());
          const isCompleted = (task.progress || 0) === 100;

          // Cores da Barra Principal
          let barBgColor: [number, number, number] = [2, 132, 199]; // Azul
          let barProgressColor: [number, number, number] = [3, 105, 161]; // Azul Escuro
          let borderColor: [number, number, number] = [2, 132, 199];

          if (isCompleted) {
            barBgColor = [209, 250, 229];
            barProgressColor = [5, 150, 105]; // Verde
            borderColor = [5, 150, 105];
          } else if (isCritical && showCriticalPath) {
            barBgColor = [254, 205, 211];
            barProgressColor = [225, 29, 72]; // Carmim
            borderColor = [225, 29, 72];
          } else if (isDelayed) {
            barBgColor = [254, 226, 226];
            barProgressColor = [220, 38, 38]; // Vermelho
            borderColor = [220, 38, 38];
          }

          // Fundo da Barra
          doc.setFillColor(barBgColor[0], barBgColor[1], barBgColor[2]);
          doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
          doc.setLineWidth(0.2);
          doc.roundedRect(barX, barY, barW, barH, 0.8, 0.8, 'FD');

          // Preenchimento de Progresso Físico
          const progress = Math.min(100, Math.max(0, task.progress || 0));
          if (progress > 0) {
            const fillW = Math.max(1, (barW * progress) / 100);
            doc.setFillColor(barProgressColor[0], barProgressColor[1], barProgressColor[2]);
            doc.roundedRect(barX, barY, fillW, barH, 0.8, 0.8, 'F');
          }

          // Rótulo de % dentro ou ao lado da barra
          if (barW > 12) {
            doc.setFontSize(5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(`${progress}%`, barX + 1.5, barY + barH - 1);
          }
        }
      }
    }
  });

  let nextY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : currentY + 40;

  // 8. Bloco Formal de Assinaturas e Carimbos Técnicos
  if (showSignatures) {
    const defaultSignatories: TechnicalSignatory[] = signatories || [
      {
        role: 'Diretor de Obra / Engenheiro Residente',
        name: project.contractorName || 'Engenheiro Responsável',
        entity: 'Empreiteiro Geral',
        status: 'Assinado Digitalmente',
        date: format(statusDate, 'dd/MM/yyyy')
      },
      {
        role: 'Fiscalização Técnica Residente',
        name: 'Gabinete de Fiscalização',
        entity: 'Empresa Fiscalizadora',
        status: 'Homologado com Visto',
        date: format(statusDate, 'dd/MM/yyyy')
      },
      {
        role: 'Dono da Obra / Diretor de Projeto',
        name: project.clientName || 'Ministério / Dono da Obra',
        entity: 'Entidade Contratante',
        status: 'Aprovado pelo Dono da Obra',
        date: format(statusDate, 'dd/MM/yyyy')
      }
    ];

    nextY = renderSignaturesAndStampsBlock(doc, nextY, defaultSignatories, {
      title: 'CRONOGRAMA EXECUTIVO FIDIC',
      entity: 'REPÚBLICA DE ANGOLA',
      date: format(statusDate, 'dd/MM/yyyy'),
      statusText: 'HOMOLOGADO PARA PRODUÇÃO DE CAMPO'
    });
  }

  // 9. Aplicação do Cabeçalho e Rodapé Institucional Repetível
  applyInstitutionalHeaderAndFooter(doc, {
    title: 'CRONOGRAMA DE GANTT & CAMINHO CRÍTICO',
    documentType: 'DOSSIÊ EXECUTIVO',
    projectName: project.name,
    projectCode: project.code,
    clientName: project.clientName,
    contractorName: project.contractorName,
    location: project.location,
    date: statusDate,
    classification: 'CRONOGRAMA CONTRATUAL OFICIAL • PADRÃO FIDIC / OEA',
    hashSha256: generateProbativeHash(project.name + (project.code || '') + validTasks.length)
  });

  return doc;
}
