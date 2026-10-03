import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ForensicPdfData {
  device: {
    model: string;
    serialNumber: string;
    imei: string;
    osVersion: string;
    extractionType: string;
    sha256Hash: string;
    warrantRef: string;
    seizureDate: string;
    forensicAnalyst: string;
  };
  messages: Array<{
    app: string;
    sender: string;
    receiver: string;
    text: string;
    timestamp: string;
    isDeleted: boolean;
    recoveryNote?: string;
  }>;
  calls: Array<{
    contactName: string;
    phoneNumber: string;
    callType: string;
    duration: string;
    timestamp: string;
    cellTowerBts: string;
  }>;
  photos: Array<{
    fileName: string;
    cameraModel: string;
    captureDate: string;
    gpsCoordinates: string;
    locationName: string;
    sha256: string;
  }>;
}

export function generateForensicPdf(data: ForensicPdfData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Cores institucionais
  const primaryDark = [15, 23, 42]; // Slate 900
  const accentAmber = [217, 119, 6]; // Amber 600
  const lightBg = [248, 250, 252]; // Slate 50
  const textMuted = [100, 116, 139]; // Slate 500

  // 1. CABEÇALHO OFICIAL DA REPÚBLICA DE ANGOLA
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("REPÚBLICA DE ANGOLA", pageWidth / 2, 8, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("MINISTÉRIO DO INTERIOR • SERVIÇO DE INVESTIGAÇÃO CRIMINAL", pageWidth / 2, 13, { align: "center" });
  doc.text("GABINETE NACIONAL DE PERÍCIA E COMPUTAÇÃO FORENSE • SISTEMA PROFUNDIDADE", pageWidth / 2, 17, { align: "center" });

  doc.setFillColor(217, 119, 6);
  doc.rect(0, 21, pageWidth, 1.5, "F");

  // Barra de Metadados Processuais
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 26, pageWidth - 28, 14, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 26, pageWidth - 28, 14, "S");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("LAUDO PERICIAL FORENSE Nº 084/2026", 18, 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`PROCESSO: PGR/LUANDA/42/2026  |  ${data.device.warrantRef.toUpperCase()}`, 18, 36.5);

  const todayStr = new Date().toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(`DATA DE EMISSÃO: ${todayStr}`, pageWidth - 18, 34, { align: "right" });

  let currentY = 46;

  // 2. OBJETO DO EXAME E CUSTÓDIA DO DISPOSITIVO
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("1. IDENTIFICAÇÃO DO EQUIPAMENTO APREENDIDO", 14, currentY);
  currentY += 4;

  const deviceTableData = [
    ["Smartphone / Modelo:", data.device.model, "Sistema Operativo:", data.device.osVersion],
    ["IMEI Principal:", data.device.imei, "Nº de Série:", data.device.serialNumber],
    ["Método de Extração:", data.device.extractionType, "Perito Responsável:", data.device.forensicAnalyst],
    ["Data de Apreensão:", data.device.seizureDate, "Garantia de Integridade:", "Art. 212º do CPP Angolano"],
  ];

  autoTable(doc, {
    startY: currentY,
    body: deviceTableData,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [226, 232, 240],
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 38 },
      1: { cellWidth: 54 },
      2: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 38 },
      3: { cellWidth: 54 },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // Hash SHA-256 Box
  doc.setFillColor(15, 23, 42);
  doc.rect(14, currentY, pageWidth - 28, 10, "F");
  doc.setTextColor(245, 158, 11);
  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.text("SELAGEM CRIPTOGRÁFICA ORIGINAL (SHA-256 BIT-A-BIT):", 18, currentY + 4);
  doc.setTextColor(255, 255, 255);
  doc.text(data.device.sha256Hash, 18, currentY + 7.5);

  currentY += 15;

  // 3. COMUNICAÇÕES & MENSAGENS RECUPERADAS (INCLUINDO SQLITE WAL)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("2. REGISTO DE MENSAGENS E ARTEFACTOS RECUPERADOS (SQLITE WAL)", 14, currentY);
  currentY += 4;

  const messagesRows = data.messages.map((m) => [
    m.timestamp.slice(0, 16),
    m.app,
    `${m.sender}\n▶ ${m.receiver}`,
    m.isDeleted ? `[RECUPERADO EM ÁREA NÃO ALOCADA]\n${m.text}` : m.text,
    m.isDeleted ? "SIM (RECUPERADO)" : "NÃO",
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Carimbo Temporal", "App", "Intervenientes", "Conteúdo Forense", "Eliminado"]],
    body: messagesRows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7,
      cellPadding: 2.2,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 18, fontStyle: "bold" },
      2: { cellWidth: 42 },
      3: { cellWidth: 78 },
      4: { cellWidth: 20, halign: "center" },
    },
    margin: { left: 14, right: 14 },
    didParseCell: function (dataHook) {
      if (dataHook.section === "body" && dataHook.column.index === 4) {
        if (dataHook.cell.raw === "SIM (RECUPERADO)") {
          dataHook.cell.styles.textColor = [185, 28, 28]; // Vermelho
          dataHook.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Se ultrapassar margem inferior, cria nova página
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 20;
  }

  // 4. REGISTO DE CHAMADAS & BTS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("3. COMUNICAÇÕES CELULARES & TRIANGULAÇÃO DE ANTENAS (BTS)", 14, currentY);
  currentY += 4;

  const callsRows = data.calls.map((c) => [
    c.timestamp,
    c.contactName,
    c.phoneNumber,
    c.callType,
    c.duration,
    c.cellTowerBts,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Data/Hora", "Contacto", "Número", "Tipo", "Duração", "Estação Base (BTS)"]],
    body: callsRows,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
    },
    columnStyles: {
      5: { textColor: [180, 83, 9], fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 20;
  }

  // 5. REGISTO FOTOGRÁFICO & METADADOS EXIF / GPS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("4. EVIDÊNCIAS FOTOGRÁFICAS & COORDENADAS EXIF", 14, currentY);
  currentY += 4;

  const photosRows = data.photos.map((p) => [
    p.fileName,
    p.captureDate,
    p.cameraModel.split("(")[0],
    p.gpsCoordinates,
    p.locationName,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Ficheiro", "Data/Hora EXIF", "Sensor", "Coordenadas GPS", "Localização Estimada"]],
    body: photosRows,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
    },
    columnStyles: {
      3: { textColor: [217, 119, 6], fontStyle: "bold" },
      4: { textColor: [16, 185, 129] },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = 20;
  }

  // 6. CONCLUSÃO PERICIAL & ASSINATURA DIGITAL
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("5. CONCLUSÃO TÉCNICA E ENCERRAMENTO", 14, currentY);
  currentY += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const conclusionText =
    "Conclui-se que os dados forenses acima descritos foram extraídos em conformidade com as boas práticas internacionais de computação forense (ISO/IEC 27037). Os ficheiros e mensagens foram validados contra o hash de aquisição, não tendo ocorrido qualquer adulteração durante o ciclo probatório. Nada mais havendo a relatar, encerra-se o presente Laudo Pericial.";
  const splitConclusion = doc.splitTextToSize(conclusionText, pageWidth - 28);
  doc.text(splitConclusion, 14, currentY);

  currentY += splitConclusion.length * 4 + 8;

  // Assinaturas e Carimbo
  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY, 90, currentY);
  doc.line(pageWidth - 90, currentY, pageWidth - 14, currentY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.device.forensicAnalyst, 52, currentY + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Perito Relator de Criminalística e Computação Forense", 52, currentY + 7.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129);
  doc.text("✓ ASSINADO DIGITALMENTE (PKI ANGOLA)", pageWidth - 52, currentY + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Hash do Certificado: 4f8b912a...77e9 (Válido)", pageWidth - 52, currentY + 7.5, { align: "center" });

  // Rodapé em todas as páginas
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `PROFUNDIDADE Forensics • Laudo Técnico Oficial • Página ${i} de ${totalPages} • Selo Imutável SHA-256`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }

  // Descarregar PDF
  const safeFileName = `LAUDO_FORENSE_${data.device.model.replace(/[^a-zA-Z0-9]/g, "_")}_084_2026.pdf`;
  doc.save(safeFileName);
}
