import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Project } from '@/types/project';
import type { WbsItem } from '@/types/wbs';
import type { Transaction } from '@/types/finance';

const formatKz = (val?: number) => {
  if (typeof val !== 'number') return '0,00 Kz';
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(val);
};

export const exportExecutiveProjectReport = (
  project: Project,
  wbsItems: WbsItem[],
  transactions: Transaction[]
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PROFUNDIDADE • RELATÓRIO EXECUTIVO', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  const nowFormatted = format(new Date(), 'dd/MM/yyyy, HH:mm');
  doc.text(`Data de Emissao: ${nowFormatted} | Plataforma Integrada de Gestao de Obras`, 14, 25);
  doc.text('Base de Dados Oficial: profundidadedboasis', 14, 31);

  // Project Info
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(project.name, 14, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  const col1X = 14;
  const col2X = 110;
  let currentY = 58;

  doc.text(`Cliente: ${project.clientName || 'Nao especificado'}`, col1X, currentY);
  doc.text(`Tipo de Obra: ${project.type || 'Geral'}`, col2X, currentY);
  currentY += 6;

  doc.text(`Localizacao: ${project.location?.address || 'Angola'}`, col1X, currentY);
  doc.text(`Estado: ${project.status}`, col2X, currentY);
  currentY += 6;

  const startStr = project.startDate ? format(new Date(project.startDate), 'dd/MM/yyyy') : 'N/D';
  const endStr = project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : 'N/D';
  doc.text(`Periodo Contratual: ${startStr} ate ${endStr}`, col1X, currentY);
  doc.text(`Progresso Fisico: ${project.progress || 0}%`, col2X, currentY);

  currentY += 12;

  // KPI summary
  const totalBudget = wbsItems.reduce((sum, item) => sum + (item.budget || 0), project.budget || 0);
  const totalExpenses = transactions.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalBudget - totalExpenses;
  const marginPct = totalBudget > 0 ? (((totalBudget - totalExpenses) / totalBudget) * 100).toFixed(1) : '0';

  const cardWidth = 43;
  const cardHeight = 20;
  const kpis = [
    { title: 'ORCAMENTO PREVISTO', val: formatKz(totalBudget), color: [241, 245, 249] },
    { title: 'CUSTO REALIZADO', val: formatKz(totalExpenses), color: [254, 242, 242] },
    { title: 'SALDO DISPONIVEL', val: formatKz(balance), color: balance >= 0 ? [240, 253, 244] : [254, 226, 226] },
    { title: 'MARGEM ESTIMADA', val: `${marginPct}%`, color: [240, 249, 255] }
  ];

  kpis.forEach((kpi, index) => {
    const cardX = 14 + (index * 46);
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, cardX + 3, currentY + 6);
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, cardX + 3, currentY + 14);
  });

  currentY += cardHeight + 12;

  // WBS Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('ESTRUTURA ANALITICA DE PACOTES DE TRABALHO (EAP)', 14, currentY);

  const tableBody = wbsItems.map((item, idx) => {
    const budget = formatKz(item.budget);
    const actual = formatKz(item.actualCost);
    const itemProg = `${item.progress || 0}%`;
    const start = item.startDate ? format(new Date(item.startDate), 'dd/MM/yy') : '-';
    const end = item.endDate ? format(new Date(item.endDate), 'dd/MM/yy') : '-';

    return [
      `${idx + 1}. ${item.name}`,
      start,
      end,
      itemProg,
      budget,
      actual
    ];
  });

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Item / Disciplina', 'Inicio', 'Termino', 'Progresso', 'Orcamento', 'Custo Real']],
    body: tableBody.length > 0 ? tableBody : [['Nenhum pacote EAP registado', '-', '-', '-', '-', '-']],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const sanitizedName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  doc.save(`relatorio-executivo-${sanitizedName}.pdf`);
};
