
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Project } from '@/types/project';
import type { PurchaseRequest } from '@/types/purchasing';
import type { Supplier } from '@/types/suppliers';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export const generateRfqPdf = async (
    project: Project, 
    request: PurchaseRequest,
    suppliers: Supplier[]
): Promise<void> => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    let yPos = 20;

    // ==== HEADER ====
    doc.setFontSize(20);
    doc.text('Pedido de Cotação', 105, yPos, { align: 'center' });
    yPos += 15;

    // ==== PROJECT & REQUEST INFO ====
    doc.setFontSize(12);
    doc.text(`Projeto: ${project.name}`, 15, yPos);
    doc.text(`Nº Pedido: ${request.id.substring(0, 8).toUpperCase()}`, 195, yPos, { align: 'right' });
    yPos += 7;
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy')}`, 195, yPos, { align: 'right' });
    yPos += 10;
    
    // ==== SUBJECT ====
    doc.setFont('helvetica', 'bold');
    doc.text('Assunto:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(request.description, 35, yPos);
    yPos += 15;
    
    // ==== SUPPLIERS ====
    const supplierNames = suppliers.map(s => s.name).join(', ');
    doc.setFontSize(10);
    doc.text(`Para: ${supplierNames}`, 15, yPos);
    yPos += 10;

    // ==== ITEMS TABLE ====
    doc.setFontSize(12);
    doc.text('Itens a cotar:', 15, yPos);
    yPos += 7;

    const tableBody = request.items.map(item => [item.name, item.quantity, item.unit]);

    autoTable(doc, {
        startY: yPos,
        head: [['Descrição', 'Quantidade', 'Unidade']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [38, 38, 38] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // ==== FOOTER / NOTES ====
    if (yPos > doc.internal.pageSize.height - 40) {
        doc.addPage();
        yPos = 20;
    }
    
    doc.setFontSize(10);
    doc.text('Observações:', 15, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.text('- Por favor, indicar os prazos de entrega e condições de pagamento na vossa proposta.', 15, yPos);
    yPos += 5;
    doc.text('- A proposta deve ser enviada para [o seu email aqui].', 15, yPos);
    yPos += 15;
    
    doc.text('Com os melhores cumprimentos,', 15, yPos);
    yPos += 5;
    doc.text(project.name, 15, yPos);
    
    // ==== PAGE NUMBER ====
    const pageCount = (doc.internal as any).getNumberOfPages().length;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }
    
    const fileName = `RFQ_${request.id.substring(0, 8)}.pdf`;
    doc.save(fileName);
};
