import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Project } from '@/types/project';
import type { ProductionLog } from '@/types/mining';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const formatNumber = (value: number | undefined) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

export const generateMonthlyProductionReport = async (
    project: Project, 
    logs: ProductionLog[],
    period: { start: Date, end: Date }
): Promise<void> => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    let yPos = 20;

    // ==== HEADER ====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Relatório de Produção Mensal', 105, yPos, { align: 'center' });
    yPos += 15;

    // ==== PROJECT & PERIOD INFO ====
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Projeto: ${project.name}`, 15, yPos);
    doc.text(`Período: ${format(period.start, 'dd/MM/yyyy')} a ${format(period.end, 'dd/MM/yyyy')}`, 195, yPos, { align: 'right' });
    yPos += 15;

    // ==== DATA AGGREGATION ====
    const summaryByMaterial = new Map<string, { totalTonnage: number; weightedGradeSum: number; countWithGrade: number }>();
    logs.forEach(log => {
        if (!summaryByMaterial.has(log.material)) {
            summaryByMaterial.set(log.material, { totalTonnage: 0, weightedGradeSum: 0, countWithGrade: 0 });
        }
        const materialSummary = summaryByMaterial.get(log.material)!;
        materialSummary.totalTonnage += log.tonnage;
        if (typeof log.grade === 'number' && log.grade > 0) {
            materialSummary.weightedGradeSum += log.grade * log.tonnage; // Weighted by tonnage
            materialSummary.countWithGrade += log.tonnage;
        }
    });

    const totalTonnage = Array.from(summaryByMaterial.values()).reduce((sum, item) => sum + item.totalTonnage, 0);

    // ==== SUMMARY CARDS ====
    autoTable(doc, {
        startY: yPos,
        body: [
            ['Produção Total do Período', `${formatNumber(totalTonnage)} t`],
            ['Número de Registos', `${logs.length}`],
        ],
        theme: 'plain',
        styles: { cellPadding: 2, fontSize: 10 },
        columnStyles: {
            0: { fontStyle: 'bold', halign: 'left' },
            1: { halign: 'right' },
        }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // ==== PRODUCTION TABLE ====
    if (yPos > doc.internal.pageSize.height - 60) {
        doc.addPage();
        yPos = 20;
    }
    doc.setFontSize(14);
    doc.text('Produção por Material', 15, yPos);
    yPos += 8;

    const tableBody = Array.from(summaryByMaterial.entries()).map(([material, data]) => {
        const avgGrade = data.countWithGrade > 0 ? data.weightedGradeSum / data.countWithGrade : 0;
        return [
            material,
            formatNumber(data.totalTonnage) + ' t',
            avgGrade > 0 ? `${avgGrade.toFixed(2)}%` : 'N/A'
        ];
    });

    autoTable(doc, {
        startY: yPos,
        head: [['Material', 'Tonelagem Total', 'Teor Médio Ponderado']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [38, 38, 38] },
        columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' },
        }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // ==== FOOTER ====
    const pageCount = (doc.internal as any).pages.length;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        const footerText = `Relatório gerado por Profundidade | Página ${i} de ${pageCount}`;
        doc.text(footerText, 105, doc.internal.pageSize.height - 10, { align: 'center' });
    }
    
    const fileName = `Relatorio_Producao_${project.name.replace(/\s+/g, '_')}_${format(period.start, 'yyyy-MM')}.pdf`;
    doc.save(fileName);
};
