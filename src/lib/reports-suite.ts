import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Project } from '@/types/project';
import type { WbsItem } from '@/types/wbs';
import type { Transaction } from '@/types/finance';
import type { Equipment, EquipmentUsageLog } from '@/types/equipment';
import type { Incident } from '@/types/hseq';
import type { DailyReport } from '@/types/daily-reports';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const formatKz = (val?: number) => {
  if (typeof val !== 'number') return '0,00 Kz';
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0
  }).format(val).replace('AOA', 'Kz');
};

export interface ReportExportMetadata {
  projectName: string;
  projectCode?: string;
  clientName?: string;
  generatedAt: string;
  generatedBy: string;
  periodLabel?: string;
}

// 1. Relatório Financeiro e Fluxo de Caixa Detalhado
export const generateFinancialAuditReport = (
  project: Project,
  transactions: Transaction[],
  budget: number,
  metadata?: Partial<ReportExportMetadata>
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Escuro Corporativo
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PROFUNDIDADE OS • RELATÓRIO DE GESTÃO FINANCEIRA', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Obra: ${project.name} | Emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 23);
  doc.text(`Cliente: ${project.clientName || 'Dono da Obra'} | Moeda Oficial: Kwanzas (AOA)`, 14, 29);

  // Cálculos
  const expenses = transactions.filter(t => t.type === 'Despesa');
  const revenues = transactions.filter(t => t.type === 'Receita');
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalRevenues = revenues.reduce((sum, t) => sum + t.amount, 0);
  const balance = budget - totalExpenses;
  const marginPct = budget > 0 ? (((budget - totalExpenses) / budget) * 100).toFixed(1) : '0';

  // Cards de Topo
  let currentY = 44;
  const cardW = (pageWidth - 28 - 9) / 4;
  const cardH = 18;

  const kpis = [
    { label: 'ORÇAMENTO PREVISTO', val: formatKz(budget), bg: [248, 250, 252], text: [15, 23, 42] },
    { label: 'DESPESAS REALIZADAS', val: formatKz(totalExpenses), bg: [254, 242, 242], text: [185, 28, 28] },
    { label: 'RECEITAS RECEBIDAS', val: formatKz(totalRevenues), bg: [240, 253, 244], text: [22, 101, 52] },
    { label: 'MARGEM RESIDUAL', val: `${marginPct}%`, bg: [240, 249, 255], text: [3, 105, 161] }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardW + 3);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.roundedRect(x, currentY, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, currentY + 5);
    doc.setFontSize(8.5);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.val, x + 3, currentY + 12);
  });

  currentY += cardH + 10;

  // Despesas por Categoria
  const categoryTotals: Record<string, number> = {};
  expenses.forEach(t => {
    const cat = (t as any).category || t.accountName || 'Geral';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('DISTRIBUIÇÃO DE DESPESAS POR CATEGORIA DE CUSTO', 14, currentY);

  const catRows = Object.entries(categoryTotals).map(([cat, val]) => {
    const pct = totalExpenses > 0 ? ((val / totalExpenses) * 100).toFixed(1) : '0';
    return [cat, formatKz(val), `${pct}%`];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Categoria de Custo', 'Total Liquidado (Kz)', '% do Total de Despesas']],
    body: catRows.length > 0 ? catRows : [['Sem despesas registadas', '0 Kz', '0%']],
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Tabela de Transações
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('EXTRATO DISCRIMINADO DE MOVIMENTOS FINANCEIROS', 14, currentY);

  const txRows = transactions.slice(0, 35).map(t => {
    const dt = t.date ? format(new Date((t.date as any).toDate ? (t.date as any).toDate() : t.date), 'dd/MM/yyyy') : '-';
    return [
      dt,
      t.type,
      (t as any).category || t.accountName || 'Geral',
      t.description || 'Sem descrição',
      formatKz(t.amount)
    ];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Data', 'Tipo', 'Categoria', 'Descrição da Operação', 'Valor (Kz)']],
    body: txRows.length > 0 ? txRows : [['-', '-', '-', 'Nenhuma transação registada', '-']],
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Footer
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(`PROFUNDIDADE OS • Relatório de Gestão Financeira • Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }

  const cleanName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  doc.save(`relatorio-financeiro-${cleanName}.pdf`);
};

// 2. Relatório de Frotas, Horímetros e Combustível
export const generateFleetEquipmentReport = (
  project: Project,
  equipments: Equipment[],
  usageLogs: EquipmentUsageLog[]
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PROFUNDIDADE OS • RELATÓRIO DE FROTAS & HORÍMETROS', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Obra: ${project.name} | Total de Máquinas no Parque: ${equipments.length}`, 14, 23);
  doc.text(`Data de Emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Controlo de Eficiência Energética`, 14, 29);

  let currentY = 44;

  // Resumo de Horas e Combustível
  const totalHoursUsed = usageLogs.reduce((sum, l) => sum + (l.hoursUsed || 0), 0);
  const totalFuelLiters = usageLogs.reduce((sum, l) => sum + (l.fuelConsumed || 0), 0);
  const avgFuelPerHour = totalHoursUsed > 0 ? (totalFuelLiters / totalHoursUsed).toFixed(1) : '0';

  const summaryBoxes = [
    { label: 'MÁQUINAS CADASTRADAS', val: `${equipments.length} Ativos` },
    { label: 'HORAS TOTAIS REGISTADAS', val: `${totalHoursUsed.toLocaleString()} h` },
    { label: 'GASÓLEO TOTAL CONSUMIDO', val: `${totalFuelLiters.toLocaleString()} L` },
    { label: 'CONSUMO MÉDIO DA FROTA', val: `${avgFuelPerHour} L/hora` }
  ];

  const colW = (pageWidth - 28 - 9) / 4;
  summaryBoxes.forEach((b, idx) => {
    const x = 14 + idx * (colW + 3);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, currentY, colW, 18, 2, 2, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(b.label, x + 3, currentY + 5);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(b.val, x + 3, currentY + 12);
  });

  currentY += 26;

  // Tabela de Equipamentos
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('PARQUE DE EQUIPAMENTOS & HORÍMETROS ATUAIS', 14, currentY);

  const eqRows = equipments.map((eq, idx) => [
    `${idx + 1}. ${eq.name}`,
    eq.category || 'Geral',
    eq.status || 'Disponível',
    eq.isOwned ? 'Próprio' : 'Alugado',
    `${(eq.currentHours || 0).toLocaleString()} h`,
    eq.operationalCostPerHour ? formatKz(eq.operationalCostPerHour) + '/h' : 'N/D'
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Equipamento', 'Categoria', 'Estado', 'Propriedade', 'Horímetro Acumulado', 'Custo Operacional']],
    body: eqRows.length > 0 ? eqRows : [['Sem equipamentos cadastrados', '-', '-', '-', '-', '-']],
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Logs Recentes de Combustível
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('HISTÓRICO RECENTE DE APONTAMENTOS DE CAMPO (HORAS / GASÓLEO)', 14, currentY);

  const logRows = usageLogs.slice(0, 30).map(l => {
    const d = l.date ? format(new Date((l.date as any).toDate ? (l.date as any).toDate() : l.date), 'dd/MM/yyyy') : '-';
    const rate = l.hoursUsed > 0 ? ((l.fuelConsumed || 0) / l.hoursUsed).toFixed(1) : '-';
    return [
      d,
      l.equipmentId || 'Equipamento',
      `${l.hoursUsed} h`,
      `${l.hourMeterReading || '-'}`,
      `${l.fuelConsumed || 0} L`,
      `${rate} L/h`,
      l.operatorName || 'Operador Padrão'
    ];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Data', 'ID Equipamento', 'Horas', 'Leitura Horímetro', 'Combustível', 'Rácio', 'Operador']],
    body: logRows.length > 0 ? logRows : [['Sem apontamentos registados', '-', '-', '-', '-', '-', '-']],
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(`PROFUNDIDADE OS • Relatório de Frotas & Equipamentos • Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }

  const cleanName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  doc.save(`relatorio-frotas-${cleanName}.pdf`);
};

// 3. Relatório de HSEQ, Segurança e Controlo de Qualidade
export const generateHseqAuditReport = (
  project: Project,
  incidents: Incident[],
  daysWithoutIncident: number = 45
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PROFUNDIDADE OS • RELATÓRIO DE HSEQ & SEGURANÇA', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Obra: ${project.name} | Emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 23);
  doc.text('Controlo Integrado de Saúde, Segurança, Ambiente e Qualidade em Campo', 14, 29);

  let currentY = 44;

  const totalIncidents = incidents.length;
  const criticalCount = incidents.filter(i => i.severity === 'Crítica' || i.severity === 'Alta').length;
  const resolvedCount = incidents.filter(i => i.status === 'Concluído').length;

  const cards = [
    { label: 'DIAS SEM ACIDENTES', val: `${daysWithoutIncident} Dias`, color: [22, 101, 52], bg: [240, 253, 244] },
    { label: 'TOTAL DE INCIDENTES', val: `${totalIncidents} Registos`, color: [15, 23, 42], bg: [248, 250, 252] },
    { label: 'SEVERIDADE CRÍTICA / ALTA', val: `${criticalCount}`, color: [185, 28, 28], bg: [254, 242, 242] },
    { label: 'AÇÕES MITIGADAS / FECHADAS', val: `${resolvedCount} de ${totalIncidents}`, color: [3, 105, 161], bg: [240, 249, 255] }
  ];

  const colW = (pageWidth - 28 - 9) / 4;
  cards.forEach((c, idx) => {
    const x = 14 + idx * (colW + 3);
    doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
    doc.roundedRect(x, currentY, colW, 18, 2, 2, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, x + 3, currentY + 5);
    doc.setFontSize(9);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.val, x + 3, currentY + 12);
  });

  currentY += 26;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('MATRIZ DE INCIDENTES, QUASE-ACIDENTES & AÇÕES DE MITIGAÇÃO', 14, currentY);

  const incRows = incidents.map(inc => {
    const dt = inc.date ? format(new Date((inc.date as any).toDate ? (inc.date as any).toDate() : inc.date), 'dd/MM/yyyy') : '-';
    return [
      dt,
      inc.type || 'Incidente',
      inc.severity || 'Média',
      inc.description || 'Sem descrição',
      inc.location || 'Estaleiro',
      inc.status || 'Aberto'
    ];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Data', 'Tipo', 'Severidade', 'Descrição do Evento', 'Localização', 'Estado']],
    body: incRows.length > 0 ? incRows : [['-', '-', '-', 'Nenhum incidente de segurança registado', '-', 'Conforme']],
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(`PROFUNDIDADE OS • Relatório de HSEQ & Segurança • Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }

  const cleanName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  doc.save(`relatorio-hseq-${cleanName}.pdf`);
};

// 4. Utilitário genérico de Exportação CSV / Excel
export const exportDataToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escapeCsv = (val: any) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(','))
  ].join('\r\n');

  const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
