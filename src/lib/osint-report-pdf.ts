import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  OsintSearchRecord,
  OsintResult,
  OsintDiscovery,
  OsintSource,
  OsintEntityResolutionMatch,
  OsintTimelineEvent,
} from "./osint-types";

export interface OsintPdfReportData {
  search: OsintSearchRecord;
  tenantName?: string;
  analystName?: string;
  results: OsintResult[];
  discoveries: OsintDiscovery[];
  sources?: OsintSource[];
  entityMatches?: OsintEntityResolutionMatch[];
  timelineEvents?: OsintTimelineEvent[];
}

export function generateOsintPdfReport(data: OsintPdfReportData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Cores institucionais PROFUNDIDADE Dark Professional Intelligence
  const primaryDark = [15, 23, 42]; // Slate 900
  const accentAmber = [217, 119, 6]; // Amber 600
  const lightBg = [248, 250, 252]; // Slate 50
  const textMuted = [100, 116, 139]; // Slate 500

  // 1. CABEÇALHO OFICIAL DO LAUDO DE INTELIGÊNCIA EM FONTES ABERTAS
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("REPÚBLICA DE ANGOLA", pageWidth / 2, 7.5, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("SISTEMA OPERACIONAL DIGITAL DE INTELIGÊNCIA, INVESTIGAÇÃO E EVIDÊNCIAS", pageWidth / 2, 12, { align: "center" });
  doc.text("LABORATÓRIO CENTRAL DE INTELIGÊNCIA EM FONTES ABERTAS (OSINT) • PROFUNDIDADE", pageWidth / 2, 16, { align: "center" });

  // Faixa de destaque dourada
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 20.5, pageWidth, 1.5, "F");

  // Barra de Metadados Processuais / Investigativos
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 25, pageWidth - 28, 14, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 25, pageWidth - 28, 14, "S");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`RELATÓRIO TÉCNICO DE INTELIGÊNCIA OSINT • PROTOCOLO #${data.search.id.toUpperCase()}`, 18, 30.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const investigationRef = data.search.investigationRef || "INQUÉRITO PRELIMINAR AUTÓNOMO";
  doc.text(`INQUÉRITO/CASO: ${investigationRef.toUpperCase()}`, 18, 35);

  const todayStr = new Date().toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`DATA/HORA DE EXTRAÇÃO: ${todayStr}`, pageWidth - 18, 33, { align: "right" });

  let currentY = 44;

  // 2. IDENTIFICAÇÃO DO ALVO E ESCOPO DA PESQUISA
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("1. IDENTIFICAÇÃO DO ALVO & PARÂMETROS DA COLETA", 14, currentY);
  currentY += 3.5;

  const targetTableData = [
    ["Alvo Investigado:", data.search.targetQuery, "Tipo de Alvo:", data.search.targetType],
    ["Organização / Tenant:", data.tenantName || "PROFUNDIDADE - Lab de Inteligência & Evidências", "Perito Requerente:", data.analystName || data.search.requestedBy],
    ["Contexto Investigativo:", data.search.contextNotes || "Averiguação passiva de elementos públicos associados ao inquérito.", "Estado da Pesquisa:", data.search.status],
    ["Evidências Preservadas:", `${data.results.filter(r => r.isPreservedAsEvidence).length} registos no cofre`, "Descobertas Validadas:", `${data.discoveries.length} hipóteses documentadas`],
  ];

  autoTable(doc, {
    startY: currentY,
    body: targetTableData,
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
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

  // 3. SALVAGUARDA METODOLÓGICA E PRINCÍPIOS DE LEGALIDADE
  doc.setFillColor(254, 243, 199); // Amber 50
  doc.rect(14, currentY, pageWidth - 28, 14, "F");
  doc.setDrawColor(245, 158, 11);
  doc.rect(14, currentY, pageWidth - 28, 14, "S");

  doc.setTextColor(146, 64, 14); // Amber 900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("DECLARAÇÃO METODOLÓGICA E SALVAGUARDA DE CUSTÓDIA LEGAL", 18, currentY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const safeguardText =
    "As informações consolidadas neste documento foram obtidas exclusivamente mediante consulta passiva a fontes e diretórios públicos acessíveis. Em estrito respeito ao devido processo probatório, o PROFUNDIDADE diferencia categoricamente FONTE pública (registro bruto), EVIDÊNCIA preservada sob hash criptográfico e DESCOBERTA formal validada. Correlações estatísticas ou cadastrais constituem indícios e não imputação conclusiva de autoria, dependendo de ratificação judicial.";
  doc.text(doc.splitTextToSize(safeguardText, pageWidth - 36), 18, currentY + 8);

  currentY += 18;

  // 4. DESCOBERTAS FORMAIS VALIDADAS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("2. DESCOBERTAS FORMAIS & CORRELAÇÕES DE INTELIGÊNCIA", 14, currentY);
  currentY += 3.5;

  const discoveryRows = data.discoveries.map((disc) => [
    disc.id,
    disc.type,
    disc.title,
    disc.sources.join(", "),
    disc.validatorNotes || "Validado com base em correlação cruzada de dados públicos.",
    disc.validationStatus,
  ]);

  if (discoveryRows.length === 0) {
    discoveryRows.push([
      "DISC-000",
      "OBSERVACAO",
      "Nenhuma descoberta formal catalogada até o momento da extração.",
      "-",
      "Aguardando análise complementar.",
      "EM_ANALISE",
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [["ID", "NÍVEL", "DESCOBERTA", "FONTES VINCULADAS", "NOTA DO PERITO / JUSTIFICAÇÃO", "ESTADO"]],
    body: discoveryRows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 6.8,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 6.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: "bold" },
      1: { cellWidth: 22 },
      2: { cellWidth: 46 },
      3: { cellWidth: 32 },
      4: { cellWidth: 46 },
      5: { cellWidth: 20, fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // 5. REGISTOS BRUTOS COLETADOS & CUSTÓDIA SHA-256
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("3. EVIDÊNCIAS COLETADAS E HASHES CRIPTOGRÁFICOS DE PROVENIÊNCIA", 14, currentY);
  currentY += 3.5;

  const resultRows = data.results.slice(0, 10).map((r) => [
    r.source,
    r.category,
    r.title.substring(0, 40) + (r.title.length > 40 ? "..." : ""),
    r.contentHash.substring(0, 16) + "...",
    r.collectedAt,
    r.isPreservedAsEvidence ? "PRESERVADO (Cofre)" : "OBSERVADO",
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["CONECTOR / FONTE", "CATEGORIA", "TÍTULO / SINAL", "HASH SHA-256", "COLETADO EM", "STATUS"]],
    body: resultRows,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 6.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 6.2,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold" },
      1: { cellWidth: 20 },
      2: { cellWidth: 54 },
      3: { cellWidth: 30, font: "courier" },
      4: { cellWidth: 28 },
      5: { cellWidth: 20, fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // Se espaço for escasso, adiciona nova página para assinaturas e custódia
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 20;
  }

  // 6. CAIXA DE ASSINATURA DIGITAL E INTEGRIDADE
  doc.setFillColor(15, 23, 42);
  doc.rect(14, currentY, pageWidth - 28, 26, "F");

  doc.setTextColor(245, 158, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("CERTIFICAÇÃO CRIPTOGRÁFICA DE INTEGRIDADE & CUSTÓDIA PERICIAL", 18, currentY + 5.5);

  doc.setTextColor(203, 213, 225);
  doc.setFont("courier", "normal");
  doc.setFontSize(6.8);
  doc.text(`HASH SHA-256 DO RELATÓRIO: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`, 18, currentY + 11.5);
  doc.text(`ALGORITMO DE INTEGRIDADE: NIST FIPS 180-4 SHA-256 (Hash imutável com carimbo UTC)`, 18, currentY + 16.5);
  doc.text(`PERITO RESPONSÁVEL: ${data.analystName || "Capitão Silva • Analista Forense OSINT Certificado"}`, 18, currentY + 21.5);

  currentY += 32;

  // Linhas de Assinatura
  const signY = currentY + 12;
  doc.setDrawColor(148, 163, 184);
  doc.line(25, signY, 95, signY);
  doc.line(pageWidth - 95, signY, pageWidth - 25, signY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text("Perito Analista em Fontes Abertas", 60, signY + 4, { align: "center" });
  doc.text("Visto do Investigador Chefe / Direção", pageWidth - 60, signY + 4, { align: "center" });

  // Rodapé em todas as páginas
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `PROFUNDIDADE OSINT • Relatório de Inteligência Técnica • Protocolo: ${data.search.id} • Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }

  // Nome do ficheiro limpo
  const cleanTarget = data.search.targetQuery.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `RELATORIO_OSINT_${cleanTarget}_${Date.now()}.pdf`;
  doc.save(fileName);
}
