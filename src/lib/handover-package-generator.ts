import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Project } from '@/types/project';
import type { ProjectFile } from '@/types/documents';
import type { Warranty } from '@/types/post-construction';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export const generateHandoverPackage = async (
    project: Project, 
    documents: ProjectFile[], 
    warranties: Warranty[]
): Promise<void> => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    let yPos = 20;

    // ==== HEADER ====
    doc.setFontSize(20);
    doc.text(`Pacote de Entrega do Projeto: ${project.name}`, 105, yPos, { align: 'center' });
    yPos += 15;
    doc.setFontSize(12);
    doc.text(`Data de Geração: ${format(new Date(), 'dd/MM/yyyy')}`, 15, yPos);
    yPos += 15;

    // ==== DOCUMENTS ====
    if (documents.length > 0) {
        doc.setFontSize(16);
        doc.text('Documentos "As-Built" e Manuais', 15, yPos);
        yPos += 8;

        const docsBody = documents.map(doc => {
            const version = doc.versions.find(v => v.version === doc.latestVersion);
            return [doc.name, `v${doc.latestVersion}`, version ? format((version.createdAt as any).toDate(), 'dd/MM/yyyy') : ''];
        });

        autoTable(doc, {
            startY: yPos,
            head: [['Nome do Documento', 'Versão', 'Data']],
            body: docsBody,
            theme: 'grid',
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    if (yPos > doc.internal.pageSize.height - 60) {
        doc.addPage();
        yPos = 20;
    }

    // ==== WARRANTIES ====
    if (warranties.length > 0) {
        doc.setFontSize(16);
        doc.text('Certificados de Garantia', 15, yPos);
        yPos += 8;
        
        const warrantiesBody = warranties.map(w => [
            w.itemDescription,
            w.supplierName,
            format(w.endDate, 'dd/MM/yyyy')
        ]);
        
        autoTable(doc, {
            startY: yPos,
            head: [['Item/Sistema', 'Fornecedor', 'Fim da Garantia']],
            body: warrantiesBody,
            theme: 'grid',
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // ==== FOOTER ====
    const pageCount = (doc.internal as any).pages.length;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }
    
    const fileName = `Pacote_Entrega_${project.name.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
};
