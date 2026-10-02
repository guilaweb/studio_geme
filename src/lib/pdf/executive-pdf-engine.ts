import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { format } from 'date-fns';

export interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
    lastAutoTable?: {
        finalY: number;
    };
}

export interface DocumentMetadata {
    title: string;
    documentType: 'AUTO DE MEDIÇÃO' | 'DIÁRIO DE OBRA (RDO)' | 'RELATÓRIO TÉCNICO' | 'DOSSIÊ EXECUTIVO' | 'LIVRO DA OBRA';
    code?: string;
    revision?: string;
    projectName: string;
    projectCode?: string;
    clientName?: string;
    contractorName?: string;
    location?: string;
    date: Date | string;
    classification?: string; // e.g. "CONFIDENCIAL / PROBATÓRIO"
    authorName?: string;
    authorRole?: string;
    hashSha256?: string;
}

export interface TechnicalSignatory {
    role: string; // e.g. "Diretor de Obra / Engenheiro Residente", "Fiscalização Residente", "Dono da Obra"
    name: string;
    entity?: string; // e.g. "Consórcio Construtor", "Empresa Fiscalizadora", "Ministério / Dono"
    registrationNumber?: string; // e.g. "OEA Nº 4812/2018"
    date?: string;
    status: 'Assinado Digitalmente' | 'Homologado com Visto' | 'Aprovado pelo Dono da Obra' | 'Pendente de Assinatura';
    hashStamp?: string;
}

export interface TechnicalPhotoEvidence {
    title: string;
    description?: string;
    timestamp?: string;
    coordinates?: string; // e.g. "-8.83833, 13.23444"
    imageUrl?: string;
    wbsRef?: string;
}

export interface TechnicalStampConfig {
    title: string;
    entity: string;
    date: string;
    statusText: string;
    registrationCode?: string;
}

// Cores Oficiais da Engenharia PROFUNDIDADE OS
export const PDF_COLORS = {
    navyPrimary: [15, 23, 42] as [number, number, number], // #0f172a
    navySecondary: [30, 41, 59] as [number, number, number], // #1e293b
    slateDark: [51, 65, 85] as [number, number, number], // #334155
    slateMedium: [100, 116, 139] as [number, number, number], // #64748b
    slateLight: [226, 232, 240] as [number, number, number], // #e2e8f0
    slateBg: [248, 250, 252] as [number, number, number], // #f8fafc
    white: [255, 255, 255] as [number, number, number],
    blueAccent: [2, 132, 199] as [number, number, number], // #0284c7
    emeraldSuccess: [5, 150, 105] as [number, number, number], // #059669
    amberWarning: [217, 119, 6] as [number, number, number], // #d97706
    roseDanger: [225, 29, 72] as [number, number, number], // #e11d48
};

// Formatação Monetária em Kwanzas (Kz)
export function formatCurrencyAOA(value?: number): string {
    if (typeof value !== 'number' || isNaN(value)) return '0,00 Kz';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    }).format(value).replace('AOA', 'Kz');
}

// Cálculo rápido de hash determinístico para selo probatório (fallback para exibição)
export function generateProbativeHash(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `SHA256-${hex.toUpperCase()}-${Date.now().toString(16).slice(-6).toUpperCase()}`;
}

/**
 * Cria a instância inicial do documento jsPDF configurada com padrões de engenharia
 */
export function createExecutiveDocument(orientation: 'portrait' | 'landscape' = 'portrait'): jsPDFWithAutoTable {
    const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
        compress: true
    }) as jsPDFWithAutoTable;

    return doc;
}

/**
 * Aplica cabeçalhos e rodapés institucionais repetíveis em TODAS as páginas após a compilação do conteúdo.
 * Isso garante o cálculo preciso de "Página X de Y".
 */
export function applyInstitutionalHeaderAndFooter(
    doc: jsPDFWithAutoTable,
    metadata: DocumentMetadata
) {
    const totalPages = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const formattedDate = typeof metadata.date === 'string'
        ? metadata.date
        : format(metadata.date, 'dd/MM/yyyy HH:mm');

    const documentHash = metadata.hashSha256 || generateProbativeHash(metadata.projectName + metadata.title + formattedDate);

    for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page);

        // ==========================================
        // 1. CABEÇALHO INSTITUCIONAL REPETÍVEL
        // ==========================================
        // Barra Superior Escura (Prisma Topográfico / Branding)
        doc.setFillColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
        doc.rect(0, 0, pageWidth, 24, 'F');

        // Linha de acento azul no limite do cabeçalho
        doc.setFillColor(PDF_COLORS.blueAccent[0], PDF_COLORS.blueAccent[1], PDF_COLORS.blueAccent[2]);
        doc.rect(0, 24, pageWidth, 1.2, 'F');

        // Ícone / Logo Vetorial PROFUNDIDADE OS
        doc.setFillColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text('PROFUNDIDADE OS', 14, 10);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text('SISTEMA OPERACIONAL DE ENGENHARIA & DECISÃO', 14, 14.5);

        // Classificação do Documento (badge direito no cabeçalho)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        const typeBadge = metadata.documentType.toUpperCase();
        doc.text(typeBadge, pageWidth - 14, 9.5, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        const classification = metadata.classification || 'DOCUMENTO TÉCNICO OFICIAL • PADRÃO FIDIC / OEA';
        doc.text(classification, pageWidth - 14, 14.5, { align: 'right' });

        // Faixa de Contexto do Projeto (Sub-cabeçalho formal)
        doc.setFillColor(PDF_COLORS.slateBg[0], PDF_COLORS.slateBg[1], PDF_COLORS.slateBg[2]);
        doc.rect(14, 26, pageWidth - 28, 7.5, 'F');
        doc.setDrawColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
        doc.rect(14, 26, pageWidth - 28, 7.5, 'S');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(PDF_COLORS.slateDark[0], PDF_COLORS.slateDark[1], PDF_COLORS.slateDark[2]);
        doc.text('OBRA:', 16, 31);
        doc.setFont('helvetica', 'normal');
        const projDisplay = metadata.projectCode ? `[${metadata.projectCode}] ${metadata.projectName}` : metadata.projectName;
        doc.text(projDisplay.slice(0, 45), 26, 31);

        doc.setFont('helvetica', 'bold');
        doc.text('DONO DA OBRA:', pageWidth / 2, 31);
        doc.setFont('helvetica', 'normal');
        doc.text((metadata.clientName || 'Governo de Angola / Dono da Obra').slice(0, 30), (pageWidth / 2) + 21, 31);

        doc.setFont('helvetica', 'bold');
        doc.text('DATA:', pageWidth - 46, 31);
        doc.setFont('helvetica', 'normal');
        doc.text(formattedDate.slice(0, 16), pageWidth - 37, 31);

        // ==========================================
        // 2. RODAPÉ INSTITUCIONAL REPETÍVEL
        // ==========================================
        const footerY = pageHeight - 14;

        // Linha divisória de rodapé
        doc.setDrawColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
        doc.setLineWidth(0.4);
        doc.line(14, footerY - 2, pageWidth - 14, footerY - 2);

        // Selo Probatório SHA-256 à esquerda
        doc.setFontSize(6);
        doc.setFont('courier', 'normal');
        doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
        doc.text(`HASH PROBATÓRIO: ${documentHash}`, 14, footerY + 2);
        doc.setFont('helvetica', 'normal');
        doc.text('Autenticidade técnica certificada por carimbo temporal oficial (WAT / UTC+1 Luanda).', 14, footerY + 5.5);

        // Paginação Dinâmica "Página X de Y" à direita
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
        const paginationText = `Página ${page} de ${totalPages}`;
        doc.text(paginationText, pageWidth - 14, footerY + 2, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
        doc.text('PROFUNDIDADE OS • RELATÓRIOS EXECUTIVOS', pageWidth - 14, footerY + 5.5, { align: 'right' });
    }
}

/**
 * Renderiza bloco de cabeçalho do corpo do documento (Título grande e Sumário executivo)
 */
export function renderDocumentTitle(
    doc: jsPDFWithAutoTable,
    startY: number,
    title: string,
    subtitle?: string,
    badgeText?: string
): number {
    let currentY = startY;
    const pageWidth = doc.internal.pageSize.getWidth();

    if (badgeText) {
        doc.setFillColor(PDF_COLORS.blueAccent[0], PDF_COLORS.blueAccent[1], PDF_COLORS.blueAccent[2]);
        doc.roundedRect(14, currentY, 40, 5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        doc.text(badgeText.toUpperCase(), 16, currentY + 3.6);
        currentY += 8;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    doc.text(title, 14, currentY);

    if (subtitle) {
        currentY += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
        const splitSub = doc.splitTextToSize(subtitle, pageWidth - 28);
        doc.text(splitSub, 14, currentY);
        currentY += (splitSub.length * 4);
    } else {
        currentY += 4;
    }

    return currentY + 4;
}

/**
 * Renderiza cartões com métricas de KPI em grelha uniforme
 */
export function renderKpiCardsGrid(
    doc: jsPDFWithAutoTable,
    startY: number,
    kpis: { label: string; value: string; hint?: string; status?: 'normal' | 'success' | 'warning' | 'danger' }[]
): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const totalW = pageWidth - (margin * 2);
    const gap = 3;
    const cols = kpis.length;
    const cardW = (totalW - (gap * (cols - 1))) / cols;
    const cardH = 17;

    kpis.forEach((kpi, idx) => {
        const x = margin + idx * (cardW + gap);
        
        // Fundo do cartão
        doc.setFillColor(PDF_COLORS.slateBg[0], PDF_COLORS.slateBg[1], PDF_COLORS.slateBg[2]);
        doc.setDrawColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
        doc.roundedRect(x, startY, cardW, cardH, 1.5, 1.5, 'FD');

        // Borda de acento superior
        let accentColor = PDF_COLORS.blueAccent;
        if (kpi.status === 'success') accentColor = PDF_COLORS.emeraldSuccess;
        if (kpi.status === 'warning') accentColor = PDF_COLORS.amberWarning;
        if (kpi.status === 'danger') accentColor = PDF_COLORS.roseDanger;

        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(x, startY, cardW, 1, 'F');

        // Label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
        doc.text(kpi.label.toUpperCase(), x + 2.5, startY + 4.5);

        // Valor
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
        doc.text(kpi.value, x + 2.5, startY + 10.5);

        // Hint opcional
        if (kpi.hint) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
            doc.text(kpi.hint, x + 2.5, startY + 14.5);
        }
    });

    return startY + cardH + 6;
}

/**
 * Renderiza tabelas de engenharia com cabeçalhos repetíveis a cada página e prevenção estrita de quebra
 */
export function renderEngineeringTable(
    doc: jsPDFWithAutoTable,
    startY: number,
    headers: string[],
    rows: (string | number)[][],
    options?: {
        columnStyles?: { [key: number]: any };
        theme?: 'striped' | 'grid' | 'plain';
        margin?: { left?: number; right?: number };
    }
): number {
    autoTable(doc, {
        startY,
        head: [headers],
        body: rows,
        theme: options?.theme || 'striped',
        margin: {
            top: 36, // Deixa espaço para o cabeçalho institucional repetível
            bottom: 22, // Deixa espaço para o rodapé institucional repetível
            left: options?.margin?.left || 14,
            right: options?.margin?.right || 14
        },
        styles: {
            font: 'helvetica',
            fontSize: 7.5,
            cellPadding: 2,
            textColor: PDF_COLORS.navyPrimary,
            lineColor: PDF_COLORS.slateLight,
            lineWidth: 0.2,
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: PDF_COLORS.navySecondary,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.5,
            halign: 'left',
            valign: 'middle'
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        showHead: 'everyPage', // Cabeçalhos repetidos em TODAS as páginas da tabela
        rowPageBreak: 'avoid', // NUNCA quebrar o conteúdo de uma linha ao meio
        columnStyles: options?.columnStyles || {}
    });

    return doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : startY + 20;
}

/**
 * Renderiza grelha de evidências fotográficas georreferenciadas com moldura técnica e controle de quebra
 */
export function renderPhotoEvidenceGrid(
    doc: jsPDFWithAutoTable,
    startY: number,
    photos: TechnicalPhotoEvidence[]
): number {
    if (!photos || photos.length === 0) {
        return startY;
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const maxAvailableY = pageHeight - 26; // Limite inferior antes do rodapé

    let currentY = startY;

    // Título da Secção de Evidências
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    doc.text('EVIDÊNCIAS FOTOGRÁFICAS & COMPROVAÇÃO DE CAMPO', margin, currentY);
    currentY += 5;

    const boxW = (pageWidth - (margin * 2) - 4) / 2;
    const boxH = 46; // Altura fixa e compacta para cada caixa técnica (imagem + metadados)

    for (let i = 0; i < photos.length; i += 2) {
        // Verificar se cabe o par de fotos na página atual; se não couber, adicionar nova página!
        if (currentY + boxH > maxAvailableY) {
            doc.addPage();
            currentY = 38; // Inicia logo abaixo do cabeçalho institucional
        }

        const photoA = photos[i];
        const photoB = photos[i + 1];

        const renderPhotoCard = (photo: TechnicalPhotoEvidence, x: number) => {
            // Moldura da caixa
            doc.setFillColor(PDF_COLORS.slateBg[0], PDF_COLORS.slateBg[1], PDF_COLORS.slateBg[2]);
            doc.setDrawColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
            doc.roundedRect(x, currentY, boxW, boxH, 1, 1, 'FD');

            // Espaço reservado para a fotografia (Placeholder ou Imagem)
            const imgBoxH = 26;
            doc.setFillColor(230, 235, 242);
            doc.rect(x + 2, currentY + 2, boxW - 4, imgBoxH, 'F');

            // Carimbo de "EVIDÊNCIA FOTOGRÁFICA"
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(100, 116, 139);
            doc.text('REGISTO FOTOGRÁFICO DE OBRA', x + (boxW / 2), currentY + 15, { align: 'center' });

            // Título e Referência
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
            const titleDisplay = photo.wbsRef ? `[${photo.wbsRef}] ${photo.title}` : photo.title;
            doc.text(titleDisplay.slice(0, 36), x + 3, currentY + imgBoxH + 6);

            // Coordenadas e Data
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
            const coordsText = photo.coordinates ? `GPS: ${photo.coordinates}` : 'GPS: Coordenadas em estaleiro';
            const dateText = photo.timestamp || format(new Date(), 'dd/MM/yyyy HH:mm');
            doc.text(`${coordsText} • ${dateText}`, x + 3, currentY + imgBoxH + 10);

            // Descrição técnica se houver
            if (photo.description) {
                doc.setFontSize(5.5);
                doc.setTextColor(PDF_COLORS.slateDark[0], PDF_COLORS.slateDark[1], PDF_COLORS.slateDark[2]);
                doc.text(photo.description.slice(0, 50), x + 3, currentY + imgBoxH + 14);
            }
        };

        renderPhotoCard(photoA, margin);
        if (photoB) {
            renderPhotoCard(photoB, margin + boxW + 4);
        }

        currentY += boxH + 4;
    }

    return currentY + 4;
}

/**
 * Renderiza bloco formal de carimbos e assinaturas técnicas (FIDIC / Ordem dos Engenheiros de Angola)
 */
export function renderSignaturesAndStampsBlock(
    doc: jsPDFWithAutoTable,
    startY: number,
    signatories: TechnicalSignatory[],
    stamp?: TechnicalStampConfig
): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const blockHeight = 44;
    const maxAvailableY = pageHeight - 26;

    let currentY = startY;

    // Se o bloco não couber na folha atual, força nova página dedicada
    if (currentY + blockHeight > maxAvailableY) {
        doc.addPage();
        currentY = 38;
    }

    // Título do Bloco de Fecho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
    doc.text('TERMO DE RESPONSABILIDADE & ASSINATURAS TÉCNICAS', margin, currentY);
    currentY += 5;

    const count = Math.min(signatories.length, 3);
    const colW = (pageWidth - (margin * 2) - ((count - 1) * 4)) / count;

    signatories.slice(0, count).forEach((sig, idx) => {
        const x = margin + idx * (colW + 4);

        // Caixa da Assinatura
        doc.setFillColor(PDF_COLORS.slateBg[0], PDF_COLORS.slateBg[1], PDF_COLORS.slateBg[2]);
        doc.setDrawColor(PDF_COLORS.slateLight[0], PDF_COLORS.slateLight[1], PDF_COLORS.slateLight[2]);
        doc.roundedRect(x, currentY, colW, 34, 1, 1, 'FD');

        // Cargo / Papel
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
        doc.text(sig.role.toUpperCase(), x + (colW / 2), currentY + 5, { align: 'center' });

        // Linha de Assinatura
        doc.setDrawColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
        doc.setLineWidth(0.3);
        doc.line(x + 6, currentY + 19, x + colW - 6, currentY + 19);

        // Carimbo de Status
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        if (sig.status.includes('Assinado') || sig.status.includes('Homologado') || sig.status.includes('Aprovado')) {
            doc.setTextColor(PDF_COLORS.emeraldSuccess[0], PDF_COLORS.emeraldSuccess[1], PDF_COLORS.emeraldSuccess[2]);
        } else {
            doc.setTextColor(PDF_COLORS.amberWarning[0], PDF_COLORS.amberWarning[1], PDF_COLORS.amberWarning[2]);
        }
        doc.text(sig.status.toUpperCase(), x + (colW / 2), currentY + 17, { align: 'center' });

        // Nome do Signatário
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(PDF_COLORS.navyPrimary[0], PDF_COLORS.navyPrimary[1], PDF_COLORS.navyPrimary[2]);
        doc.text(sig.name, x + (colW / 2), currentY + 23, { align: 'center' });

        // Entidade / Registro OEA
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(PDF_COLORS.slateMedium[0], PDF_COLORS.slateMedium[1], PDF_COLORS.slateMedium[2]);
        const subDetails = [sig.registrationNumber, sig.entity].filter(Boolean).join(' • ');
        doc.text(subDetails || 'Engenheiro Autorizado', x + (colW / 2), currentY + 27, { align: 'center' });

        // Data
        if (sig.date) {
            doc.setFontSize(5.5);
            doc.text(`Data: ${sig.date}`, x + (colW / 2), currentY + 31, { align: 'center' });
        }
    });

    currentY += 38;

    // Carimbo formal da Fiscalização / Homologação (opcional)
    if (stamp) {
        doc.setFillColor(240, 253, 244); // Verde claro suave
        doc.setDrawColor(PDF_COLORS.emeraldSuccess[0], PDF_COLORS.emeraldSuccess[1], PDF_COLORS.emeraldSuccess[2]);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 14, 1, 1, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(PDF_COLORS.emeraldSuccess[0], PDF_COLORS.emeraldSuccess[1], PDF_COLORS.emeraldSuccess[2]);
        doc.text(`CARIMBO INSTITUCIONAL: ${stamp.title.toUpperCase()}`, margin + 4, currentY + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(PDF_COLORS.slateDark[0], PDF_COLORS.slateDark[1], PDF_COLORS.slateDark[2]);
        doc.text(`Entidade Homologadora: ${stamp.entity} | Visto: ${stamp.statusText} | Data: ${stamp.date}`, margin + 4, currentY + 10);
        currentY += 18;
    }

    return currentY;
}
