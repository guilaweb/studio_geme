
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Project } from '@/types/project';
import type { WbsItemWithChildren } from '@/types/wbs';
import type { ProjectWorkforceMember } from '@/types/workforce';
import type { ProjectEquipment } from '@/types/equipment';

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

// This function will now generate a richer data structure for autoTable
const processWbsItems = (
    items: WbsItemWithChildren[],
    projectWorkforce: ProjectWorkforceMember[], 
    projectEquipment: ProjectEquipment[],
    level = 0
): any[] => {
    let rows: any[] = [];
    items.forEach(item => {
        const indent = '  '.repeat(level);
        const isParent = item.children && item.children.length > 0;
        
        // Main row for the item
        const mainRow = {
            name: { content: `${indent}${item.name}`, styles: { fontStyle: isParent ? 'bold' : 'normal' } },
            startDate: item.startDate ? format(item.startDate, 'dd/MM/yy') : '',
            endDate: item.endDate ? format(item.endDate, 'dd/MM/yy') : '',
            progress: { content: `${item.progress || 0}%` }, // Placeholder for progress bar
            budget: { content: formatCurrency(item.budget), styles: { halign: 'right' } },
            actualCost: { content: formatCurrency(item.actualCost), styles: { halign: 'right' } },
            balance: { content: formatCurrency((item.budget || 0) - (item.actualCost || 0)), styles: { halign: 'right' } },
            _progressValue: item.progress || 0, // Raw value for drawing
        };
        rows.push(mainRow);
        
        // Details row
        const effortText = item.effortHours ? `Esforço: ${item.effortHours}h` : '';

        const workforceNames = (item.assignedWorkforce || [])
            .map(id => projectWorkforce.find(m => m.id === id)?.name)
            .filter(Boolean)
            .join(', ');
        const workforceText = workforceNames ? `Pessoal: ${workforceNames}` : '';
        
        const equipmentNames = (item.assignedEquipment || [])
            .map(id => projectEquipment.find(eq => eq.id === id)?.name)
            .filter(Boolean)
            .join(', ');
        const equipmentText = equipmentNames ? `Equipamentos: ${equipmentNames}` : '';

        const details = [effortText, workforceText, equipmentText].filter(Boolean).join('  |  ');
        
        if (details) {
            rows.push({
                name: {
                    content: details,
                    colSpan: 7,
                    styles: {
                        fillColor: [248, 249, 250],
                        textColor: 80,
                        fontSize: 7,
                        cellPadding: 1.5,
                        halign: 'left',
                    },
                },
            });
        }

        if (item.children && item.children.length > 0) {
            rows = rows.concat(processWbsItems(item.children, projectWorkforce, projectEquipment, level + 1));
        }
    });
    return rows;
};

export const generateWbsReport = async (
    project: Project, 
    wbsItems: WbsItemWithChildren[],
    projectWorkforce: ProjectWorkforceMember[],
    projectEquipment: ProjectEquipment[]
): Promise<void> => {
    const doc = new jsPDF('p', 'mm', 'a4') as jsPDFWithAutoTable;
    let yPos = 20;

    // ==== HEADER ====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Relatório da Estrutura Analítica do Projeto (EAP)', 105, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Projeto: ${project.name}`, 15, yPos);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy')}`, 195, yPos, { align: 'right' });
    yPos += 7;
    if (project.clientName) {
        doc.text(`Cliente: ${project.clientName}`, 15, yPos);
    }
    yPos += 10;
    doc.line(15, yPos, 195, yPos); // Separator line
    yPos += 15;
    
    // ==== SUMMARY ====
    const totalBudget = wbsItems.reduce((sum, item) => sum + (item.budget || 0), 0);
    const totalCost = wbsItems.reduce((sum, item) => sum + (item.actualCost || 0), 0);
    
    let overallProgress = 0;
    if (totalBudget > 0) {
        const weightedTotalProgress = wbsItems.reduce((sum, root) => sum + (root.progress || 0) * (root.budget || 0), 0);
        overallProgress = weightedTotalProgress / totalBudget;
    } else if (wbsItems.length > 0) {
        const simpleTotalProgress = wbsItems.reduce((sum, root) => sum + (root.progress || 0), 0);
        overallProgress = simpleTotalProgress / wbsItems.length;
    }


    autoTable(doc, {
        startY: yPos,
        body: [
            ['Orçamento Total', formatCurrency(totalBudget)],
            ['Custo Real Total', formatCurrency(totalCost)],
            ['Saldo', formatCurrency(totalBudget - totalCost)],
            ['Progresso Geral', `${Math.round(overallProgress)}%`],
        ],
        theme: 'plain',
        styles: { cellPadding: 2 },
        columnStyles: {
            0: { fontStyle: 'bold', halign: 'right' },
            1: { halign: 'left' },
        }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;


    // ==== WBS TABLE ====
    const tableBody = processWbsItems(wbsItems, projectWorkforce, projectEquipment);

    autoTable(doc, {
        startY: yPos,
        head: [['Atividade', 'Início', 'Fim', 'Progresso', 'Orçamento', 'Custo Real', 'Saldo']],
        body: tableBody,
        theme: 'grid',
        headStyles: { 
            fillColor: [38, 38, 38], 
            textColor: 255, 
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 18 },
            2: { cellWidth: 18 },
            3: { cellWidth: 20 },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right' },
        },
        didDrawCell: (data) => {
            const rawRow = data.row.raw as any;
            if (data.column.dataKey === 'progress' && data.cell.section === 'body' && rawRow._progressValue !== undefined) {
                const progress = rawRow._progressValue;
                
                const progressBarWidth = data.cell.width - 4; // padding
                const progressBarHeight = 4;
                const progressBarX = data.cell.x + 2;
                const progressBarY = data.cell.y + (data.cell.height / 2) + 2;

                // Draw bar background
                doc.setFillColor(230, 230, 230);
                doc.rect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 'F');
                
                // Draw progress
                const progressWidth = (progressBarWidth * progress) / 100;
                doc.setFillColor(4, 120, 87); // A nice green
                doc.rect(progressBarX, progressBarY, progressWidth, progressBarHeight, 'F');
            }
        },
    });
    
    // ==== FOOTER ====
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        const footerText = `Relatório gerado por Profundidade | Página ${i} de ${pageCount}`;
        doc.text(footerText, 105, doc.internal.pageSize.height - 10, { align: 'center' });
    }
    
    const fileName = `EAP_${project.name.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
};
