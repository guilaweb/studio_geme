import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CustomerQuote, Opportunity, Account } from '@/types/crm';
import { PDF_COLORS, formatCurrencyAOA, generateProbativeHash, type jsPDFWithAutoTable } from './executive-pdf-engine';

export interface GenerateProposalPdfParams {
  quote: CustomerQuote;
  opportunity?: Opportunity | null;
  account?: Account | null;
  companyName?: string;
  companyNif?: string;
  companyAddress?: string;
  companyContact?: string;
}

export function compileCommercialProposalPDF(params: GenerateProposalPdfParams): jsPDFWithAutoTable {
  const { quote, opportunity, account } = params;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as jsPDFWithAutoTable;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const clientName = quote.accountName || opportunity?.accountName || account?.name || 'Cliente';
  const clientNif = quote.clientNif || account?.nif || 'Consulte os termos';
  const clientEmail = quote.clientEmail || account?.email || 'N/A';
  const clientPhone = quote.clientPhone || account?.phone || 'N/A';
  const quoteNumber = quote.quoteNumber || `PROP-${quote.id.substring(0, 6).toUpperCase()}`;
  const quoteDateStr = format(new Date(), 'dd/MM/yyyy');
  const validUntilStr = quote.validUntil
    ? typeof quote.validUntil === 'string'
      ? quote.validUntil
      : format((quote.validUntil as any).toDate ? (quote.validUntil as any).toDate() : new Date(quote.validUntil as any), 'dd/MM/yyyy')
    : format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy');

  // 1. Cabeçalho Corporativo
  doc.setFillColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent line
  doc.setFillColor(PDF_COLORS.amberWarning[0], PDF_COLORS.amberWarning[1], PDF_COLORS.amberWarning[2]);
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Logótipo & Marca
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PROFUNDIDADE OS', margin, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('Engenharia, Construção & Gestão Integral de Projetos', margin, 19);
  doc.text('Sistemas Operacionais de Construção Civil • Angola', margin, 24);

  // Badge da Proposta Comercial à Direita
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('PROPOSTA COMERCIAL', pageWidth - margin, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(254, 215, 170); // Light amber
  doc.text(`Nº: ${quoteNumber}`, pageWidth - margin, 19, { align: 'right' });
  doc.setTextColor(226, 232, 240);
  doc.text(`Data: ${quoteDateStr} • Validade: ${validUntilStr}`, pageWidth - margin, 24, { align: 'right' });

  y = 38;

  // 2. Grelha de Identificação: Cliente & Obra / Oportunidade
  const colWidth = (pageWidth - margin * 2 - 6) / 2;

  // Caixa do Cliente
  doc.setFillColor(PDF_COLORS.slateBg[0], PDF_COLORS.slateBg[1], PDF_COLORS.slateBg[2]);
  doc.setDrawColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
  doc.roundedRect(margin, y, colWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(PDF_COLORS.navySecondary[0], PDF_COLORS.navySecondary[1], PDF_COLORS.navySecondary[2]);
  doc.text('DADOS DO CLIENTE / ADJUDICANTE', margin + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
  doc.text(clientName, margin + 4, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(PDF_COLORS.slateDark[0], PDF_COLORS.slateDark[1], PDF_COLORS.slateDark[2]);
  doc.text(`NIF: ${clientNif}`, margin + 4, y + 19);
  doc.text(`Email: ${clientEmail}`, margin + 4, y + 24);
  doc.text(`Telefone: ${clientPhone}`, margin + 4, y + 29);

  // Caixa da Empreitada / Oportunidade
  const xCol2 = margin + colWidth + 6;
  doc.roundedRect(xCol2, y, colWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(PDF_COLORS.navySecondary[0], PDF_COLORS.navySecondary[1], PDF_COLORS.navySecondary[2]);
  doc.text('ESCOPO & ENQUADRAMENTO DA PROPOSTA', xCol2 + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
  doc.text(quote.title || opportunity?.name || 'Empreitada de Engenharia', xCol2 + 4, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(PDF_COLORS.slateDark[0], PDF_COLORS.slateDark[1], PDF_COLORS.slateDark[2]);
  doc.text(`Oportunidade: ${opportunity?.name || quote.opportunityName || 'Geral'}`, xCol2 + 4, y + 19);
  doc.text(`Responsável Comercial: ${quote.author?.displayName || 'Direção Comercial'}`, xCol2 + 4, y + 24);
  doc.text(`Estado da Proposta: ${quote.status || 'Enviada'}`, xCol2 + 4, y + 29);

  y += 40;

  // 3. Descrição / Âmbito dos Trabalhos (se existir)
  if (quote.scopeDescription) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    doc.text('1. OBJETO & ÂMBITO DOS SERVIÇOS', margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(PDF_COLORS.slateDark[0], PDF_COLORS.slateDark[1], PDF_COLORS.slateDark[2]);
    const splitScope = doc.splitTextToSize(quote.scopeDescription, pageWidth - margin * 2);
    doc.text(splitScope, margin, y);
    y += splitScope.length * 4.2 + 6;
  }

  // 4. Tabela de Preços & Quantidades
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
  doc.text('2. MAPA DE QUANTIDADES & PREÇOS UNITÁRIOS', margin, y);
  y += 3;

  const tableRows = (quote.items || []).map((item, idx) => {
    const unitPrice = item.unitPrice || item.cost * (1 + (quote.markup || 0) / 100);
    const total = item.total || unitPrice * item.quantity;
    return [
      String(idx + 1).padStart(2, '0'),
      item.name,
      String(item.quantity),
      item.unit || 'un',
      formatCurrencyAOA(unitPrice),
      formatCurrencyAOA(total),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Designação dos Trabalhos / Fornecimentos', 'Qtd.', 'Un.', 'Preço Unitário (Kz)', 'Valor Total (Kz)']],
    body: tableRows.length > 0 ? tableRows : [['01', 'Fornecimento e aplicação conforme cadernos de encargos', '1', 'vg', formatCurrencyAOA(quote.salePrice), formatCurrencyAOA(quote.salePrice)]],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'right' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 32, halign: 'right' },
      5: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 40;

  // 5. Bloco de Totais
  const totalBoxWidth = 85;
  const totalBoxX = pageWidth - margin - totalBoxWidth;

  doc.setFillColor(PDF_COLORS.navySecondary[0], PDF_COLORS.navySecondary[1], PDF_COLORS.navySecondary[2]);
  doc.roundedRect(totalBoxX, y, totalBoxWidth, 24, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('Total Ilíquido da Proposta:', totalBoxX + 5, y + 7);
  doc.text(formatCurrencyAOA(quote.salePrice), totalBoxX + totalBoxWidth - 5, y + 7, { align: 'right' });

  doc.text('Imposto sobre o Valor Acrescentado (IVA):', totalBoxX + 5, y + 13);
  doc.text('Incluído / À taxa legal', totalBoxX + totalBoxWidth - 5, y + 13, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(254, 215, 170); // Light amber
  doc.text('VALOR GLOBAL ADJUDICAÇÃO:', totalBoxX + 5, y + 19);
  doc.text(formatCurrencyAOA(quote.salePrice), totalBoxX + totalBoxWidth - 5, y + 19, { align: 'right' });

  // 6. Condições Comerciais & Pagamento (à esquerda dos totais)
  const condWidth = totalBoxX - margin - 6;
  doc.setFillColor(PDF_COLORS.slateBg[0], PDF_COLORS.slateBg[1], PDF_COLORS.slateBg[2]);
  doc.roundedRect(margin, y, condWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
  doc.text('CONDIÇÕES COMERCIAIS & PRAZOS:', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(PDF_COLORS.slateDark[0], PDF_COLORS.slateDark[1], PDF_COLORS.slateDark[2]);
  const paymentTerms = quote.paymentTerms || '30% Adiantamento na adjudicação • 70% por Autos de Medição Mensais';
  const deliveryDays = quote.deliveryPeriodDays ? `${quote.deliveryPeriodDays} dias de calendário` : 'A acordar no cronograma contratual';
  doc.text(`• Condições de Pagamento: ${paymentTerms}`, margin + 4, y + 11);
  doc.text(`• Prazo de Execução: ${deliveryDays}`, margin + 4, y + 16);
  doc.text(`• Validade da Proposta: 30 dias contados da presente data`, margin + 4, y + 21);

  y += 32;

  // 7. Bloco de Assinaturas & Validação Formal
  if (y + 40 > pageHeight) {
    doc.addPage();
    y = margin + 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
  doc.text('3. TERMO DE HOMOLOGAÇÃO & ACEITAÇÃO', margin, y);
  y += 6;

  const signWidth = (pageWidth - margin * 2 - 8) / 2;

  // Pela Proponente (Profundidade)
  doc.roundedRect(margin, y, signWidth, 32, 2, 2, 'D');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
  doc.text('PELA EMPRESA PROPONENTE:', margin + 4, y + 5);
  doc.line(margin + 10, y + 22, margin + signWidth - 10, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
  doc.text(quote.author?.displayName || 'Direção Comercial & Engenharia', margin + signWidth / 2, y + 26, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(PDF_COLORS.slateDark[0], PDF_COLORS.slateDark[1], PDF_COLORS.slateDark[2]);
  doc.text('Representante Legal Autorizado', margin + signWidth / 2, y + 29.5, { align: 'center' });

  // Pelo Cliente (Aceitação)
  const sign2X = margin + signWidth + 8;
  doc.roundedRect(sign2X, y, signWidth, 32, 2, 2, 'D');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
  doc.text('CONCORDÂNCIA & ACEITAÇÃO DO CLIENTE:', sign2X + 4, y + 5);
  doc.line(sign2X + 10, y + 22, sign2X + signWidth - 10, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
  doc.text(clientName, sign2X + signWidth / 2, y + 26, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(PDF_COLORS.slateDark[0], PDF_COLORS.slateDark[1], PDF_COLORS.slateDark[2]);
  doc.text('Assinatura e Carimbo / Data: ____ / ____ / 2026', sign2X + signWidth / 2, y + 29.5, { align: 'center' });

  // 8. Rodapé Probatório
  const hash = generateProbativeHash(quote.id + clientName + String(quote.salePrice));
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
    doc.text(`Profundidade OS • Proposta Comercial ${quoteNumber} • Confidencial`, margin, pageHeight - 8);
    doc.text(`Hash Probatório: ${hash.substring(0, 24)}... • Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  return doc;
}
