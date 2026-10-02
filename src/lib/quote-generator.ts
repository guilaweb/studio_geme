import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Opportunity, CustomerQuote } from '@/types/crm';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};


export const generateQuotePdf = async (opportunity: Opportunity, quote: CustomerQuote): Promise<void> => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    let yPos = 20;

    // ==== HEADER ====
    // TODO: Use company info from settings in the future
    doc.setFontSize(20);
    doc.text('A Sua Empresa', 15, yPos);
    doc.setFontSize(10);
    doc.text('A sua morada, cidade', 15, yPos + 5);
    doc.text('NIF: XXXXXXXXX', 15, yPos + 10);

    // ==== QUOTE INFO ====
    doc.setFontSize(16);
    doc.text('Proposta Comercial', 200, yPos, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`Número: ${quote.id.substring(0, 8).toUpperCase()}`, 200, yPos + 7, { align: 'right' });
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy')}`, 200, yPos + 12, { align: 'right' });
    yPos += 25;

    // ==== CLIENT INFO ====
    doc.rect(15, yPos, 80, 25);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', 20, yPos + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(opportunity.accountName || '', 20, yPos + 14);
    // Add more client details if available
    yPos += 35;

    // ==== SUBJECT ====
    doc.setFont('helvetica', 'bold');
    doc.text('Assunto:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(quote.title, 35, yPos);
    yPos += 15;


    // ==== ITEMS TABLE ====
    const tableBody = quote.items.map(item => {
        const itemSalePrice = item.cost * (1 + (quote.markup || 0) / 100);
        const itemTotal = itemSalePrice * item.quantity;
        return [
            item.name,
            item.quantity,
            item.unit,
            formatCurrency(itemSalePrice),
            formatCurrency(itemTotal),
        ];
    });

    autoTable(doc, {
        startY: yPos,
        head: [['Descrição', 'Qtd.', 'Un.', 'Preço Unit.', 'Total']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [38, 38, 38] },
        didDrawPage: (data) => {
            yPos = data.cursor?.y || 0;
        }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    if (yPos > doc.internal.pageSize.height - 40) {
        doc.addPage();
        yPos = 20;
    }

    // ==== TOTALS ====
    const totalsX = 140;
    doc.setFontSize(10);
    doc.text('Custo Total:', totalsX, yPos);
    doc.text(formatCurrency(quote.totalCost), 200, yPos, { align: 'right' });
    yPos += 7;

    doc.text(`Markup (${quote.markup}%):`, totalsX, yPos);
    doc.text(formatCurrency(quote.salePrice - quote.totalCost), 200, yPos, { align: 'right' });
    yPos += 7;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total da Proposta:', totalsX, yPos);
    doc.text(formatCurrency(quote.salePrice), 200, yPos, { align: 'right' });
    yPos += 15;
    
    // ==== FOOTER / NOTES ====
    doc.setFontSize(8);
    doc.text('Termos e Condições:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text('- Pagamento a 30 dias. - Esta proposta é válida por 30 dias.', 15, yPos + 4);
    
    const pageCount = (doc.internal as any).pages.length;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }
    
    // Save the PDF
    const fileName = `Proposta_${quote.title.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
};
