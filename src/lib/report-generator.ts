import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Importa a função default
import { format } from 'date-fns';

// Estende a interface jsPDF para incluir autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

// Define interfaces para as estruturas de dados
interface Project {
  id: string;
  name: string;
  ownerId: string;
  modelUrl?: string;
}

interface Comment {
  text: string;
  author: string;
  createdAt: any; // Usando 'any' para ser flexível com o Firestore Timestamp
  imageUrl?: string;
}

interface Annotation {
  id: string;
  text: string;
  author: string;
  createdAt: any;
  status: 'Aberta' | 'Resolvida';
  comments: Comment[];
}

export const generateProjectReport = async (project: Project, annotations: Annotation[]): Promise<void> => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  let yPos = 20;

  // ==== HEADER ====
  doc.setFontSize(22);
  doc.text(`Relatório do Projeto: ${project.name}`, 15, yPos);
  yPos += 10;
  doc.setFontSize(12);
  doc.text(`Data de Geração: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 15, yPos);
  yPos += 15;

  // ==== SUMMARY ====
  const total = annotations.length;
  const open = annotations.filter(a => a.status === 'Aberta').length;
  const resolved = annotations.filter(a => a.status === 'Resolvida').length;

  doc.setFontSize(16);
  doc.text('Resumo das Anotações', 15, yPos);
  yPos += 8;

  doc.setFontSize(12);
  doc.text(`Total de Anotações: ${total}`, 20, yPos);
  yPos += 7;
  doc.text(`Abertas: ${open}`, 20, yPos);
  yPos += 7;
  doc.text(`Resolvidas: ${resolved}`, 20, yPos);
  yPos += 15;

  // ==== DETAILS OF OPEN ANNOTATIONS ====
  doc.setFontSize(16);
  doc.text('Detalhes das Anotações Abertas', 15, yPos);
  yPos += 10;
  
  const openAnnotations = annotations.filter(a => a.status === 'Aberta');

  if (openAnnotations.length === 0) {
    doc.setFontSize(12);
    doc.text('Nenhuma anotação aberta no momento.', 15, yPos);
  } else {
    openAnnotations.forEach((annotation, index) => {
      if (yPos > doc.internal.pageSize.height - 40) { // Add new page if content overflows
        doc.addPage();
        yPos = 20;
      }
      
      const annotationTitle = `#${index + 1}: ${annotation.text}`;
      const annotationDate = annotation.createdAt?.toDate ? format(annotation.createdAt.toDate(), 'dd/MM/yyyy') : 'Data inválida';

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(annotationTitle, 15, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Autor: ${annotation.author} | Criado em: ${annotationDate}`, 15, yPos);
      yPos += 10;

      if (annotation.comments && annotation.comments.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Comentários:', 20, yPos);
        yPos += 5;

        const tableBody = annotation.comments.map(c => {
          const commentDate = c.createdAt?.toDate ? format(c.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A';
          return [commentDate, c.author, c.text];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Data', 'Autor', 'Comentário']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 8 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      } else {
         doc.setFontSize(9);
         doc.text('Nenhum comentário para esta anotação.', 20, yPos);
         yPos += 10;
      }
      yPos += 5; // Extra space between annotations
    });
  }

  // ==== FOOTER ====
  const pageCount = (doc.internal as any).pages.length;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 35, doc.internal.pageSize.height - 10);
  }


  // Save the PDF
  const fileName = `Relatorio_${project.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
};