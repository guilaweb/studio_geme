import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Inspection, ChecklistItem, DigitalSignature } from '@/types/post-construction';
import type { Project } from '@/types/project';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export const generateHandoverReport = async (project: Project, inspection: Inspection): Promise<void> => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    let yPos = 20;

    // ==== HEADER ====
    doc.setFontSize(20);
    doc.text('Auto de Vistoria e Entrega', 105, yPos, { align: 'center' });
    yPos += 15;

    // ==== PROJECT & UNIT INFO ====
    doc.setFontSize(12);
    doc.text(`Projeto: ${project.name}`, 15, yPos);
    doc.text(`Unidade: ${inspection.unitIdentifier}`, 15, yPos + 7);
    doc.text(`Data da Vistoria: ${format(inspection.date, 'dd/MM/yyyy')}`, 15, yPos + 14);
    yPos += 25;

    // ==== CLIENT INFO ====
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${inspection.clientName}`, 20, yPos + 7);
    doc.text(`Email: ${inspection.clientEmail}`, 20, yPos + 14);
    yPos += 25;

    // ==== CHECKLISTS ====
    doc.setFontSize(14);
    doc.text('Resultados dos Checklists de Verificação', 15, yPos);
    yPos += 8;

    if (!inspection.checklists || inspection.checklists.length === 0) {
        doc.setFontSize(10);
        doc.text('Nenhum checklist foi preenchido para esta vistoria.', 15, yPos);
        yPos += 10;
    } else {
        inspection.checklists.forEach(checklist => {
            if (yPos > doc.internal.pageSize.height - 60) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Checklist: ${checklist.templateName}`, 15, yPos);
            yPos += 7;

            const tableBody = checklist.items.map((item: ChecklistItem) => {
                return [item.text, item.status, item.observations || ''];
            });

            autoTable(doc, {
                startY: yPos,
                head: [['Item Verificado', 'Resultado', 'Observações']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [38, 38, 38] },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 80 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 'auto' },
                }
            });
            yPos = (doc as any).lastAutoTable.finalY + 10;
        });
    }

    if (yPos > doc.internal.pageSize.height - 80) { // Increased margin for signatures
        doc.addPage();
        yPos = 20;
    }
    
    // ==== DECLARATION AND SIGNATURES ====
    yPos += 10;
    doc.setFontSize(10);
    doc.text('Declaração:', 15, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.text('Pelo presente, o Cliente declara ter recebido a unidade acima identificada, tendo verificado que a mesma se encontra em conformidade com o acordado, com exceção das observações apontadas nos checklists (se aplicável), as quais deverão ser retificadas pela construtora.', 15, yPos, { maxWidth: 180 });
    yPos += 20;

    const signatureY = yPos;
    const clientSignature = inspection.signatures?.find(s => s.signedBy === 'Cliente');
    const constructorSignature = inspection.signatures?.find(s => s.signedBy === 'Construtora');

    if (clientSignature) {
        doc.addImage(clientSignature.signatureDataUrl, 'PNG', 30, signatureY, 60, 20);
    }
    doc.line(30, signatureY + 25, 90, signatureY + 25);
    doc.text('Assinatura do Cliente', 45, signatureY + 30);

    if (constructorSignature) {
        doc.addImage(constructorSignature.signatureDataUrl, 'PNG', 120, signatureY, 60, 20);
    }
    doc.line(120, signatureY + 25, 180, signatureY + 25);
    doc.text('Assinatura da Construtora', 130, signatureY + 30);


    // ==== FOOTER ====
    const pageCount = (doc.internal as any).pages.length;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }
    
    const fileName = `Auto_Entrega_${inspection.unitIdentifier.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
};
