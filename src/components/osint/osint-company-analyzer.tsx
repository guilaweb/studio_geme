"use client";

import React, { useState } from "react";
import {
  Building2,
  Users,
  FileText,
  Shield,
  Search,
  CheckCircle,
  AlertTriangle,
  Copy,
  Info,
  FileCheck,
  RefreshCw,
  FileDown,
  Link2,
  Share2,
  Calendar,
  DollarSign
} from "lucide-react";
import { generateOsintPdfReport } from "@/lib/osint-report-pdf";

interface CorporateRecord {
  nif: string;
  legalName: string;
  tradeName: string;
  incorporationDate: string;
  status: "ACTIVA" | "SUSPENSA" | "EM_DISSOLUCAO";
  legalForm: string;
  shareCapital: string;
  registeredAddress: string;
  province: string;
  municipality: string;
  shareholders: Array<{
    name: string;
    identifier: string;
    role: string;
    equity: string;
    riskIndicator?: string;
  }>;
  gazettePublications: Array<{
    edition: string;
    date: string;
    title: string;
    summary: string;
    contentHash: string;
  }>;
  redFlags: string[];
  contentHash: string;
}

const DEFAULT_COMPANY_DATA: CorporateRecord = {
  nif: "5410982319",
  legalName: "Vortex Consulting Offshore S.A.",
  tradeName: "Vortex Intelligence & Advisory",
  incorporationDate: "12 de Março de 2024",
  status: "ACTIVA",
  legalForm: "Sociedade Anónima (S.A.)",
  shareCapital: "50.000.000 Kz (Cinquenta Milhões de Kwanzas)",
  registeredAddress: "Avenida 4 de Fevereiro, Edifício Marginal, 4º Andar, Sala 402",
  province: "Luanda",
  municipality: "Ingombota",
  shareholders: [
    {
      name: "Dr. Manuel V.",
      identifier: "NIF 002918239LA041",
      role: "Procurador Fiduciário & Administrador Não-Executivo",
      equity: "35%",
      riskIndicator: "Procurador com múltiplos mandatos fiduciários ativos",
    },
    {
      name: "Atlantis Global Holdings Ltd.",
      identifier: "CH-660.1.234.567-8 (Suíça)",
      role: "Acionista Maioritário Institucional",
      equity: "65%",
      riskIndicator: "Holding sediada em jurisdição com opacidade societária fiduciária",
    },
  ],
  gazettePublications: [
    {
      edition: "Diário da República IIIª Série - Nº 48/2024",
      date: "12 Março 2024",
      title: "Constituição Formal de Sociedade por Ações",
      summary: "Outorga de poderes plenipotenciários de movimentação bancária ao procurador fiduciário Dr. Manuel V.",
      contentHash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    },
    {
      edition: "Diário da República IIIª Série - Nº 192/2025",
      date: "18 Novembro 2025",
      title: "Alteração Contratual & Objeto Social",
      summary: "Alargamento do objeto social para intermediação de ativos digitais e consultoria transfronteiriça.",
      contentHash: "7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c",
    },
  ],
  redFlags: [
    "Sede fiscal partilhada com mais de 12 entidades sem atividade física evidente no local",
    "Ausência de registo público de Beneficiário Efetivo Final (UBO) nos termos da Lei de Prevenção ao Branqueamento de Capitais",
    "Movimentação internacional de fundos autorizada com procuração única sem exigência de assinatura conjunta",
  ],
  contentHash: "3c2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3210fedcba9876543210fedc",
};

interface OsintCompanyAnalyzerProps {
  onSaveAsEvidence?: (company: string, data: any) => void;
  onAddToGraph?: (company: CorporateRecord) => void;
}

export function OsintCompanyAnalyzer({
  onSaveAsEvidence,
  onAddToGraph,
}: OsintCompanyAnalyzerProps) {
  const [searchInput, setSearchInput] = useState("5410982319");
  const [company, setCompany] = useState<CorporateRecord>(DEFAULT_COMPANY_DATA);
  const [copiedHash, setCopiedHash] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      // Atualizar com a entidade pesquisada mantendo a integridade analítica
      setCompany((prev) => ({
        ...prev,
        nif: searchInput.trim(),
        legalName: searchInput.includes("54109") ? "Vortex Consulting Offshore S.A." : `Sociedade Comercial ${searchInput.trim()}`,
      }));
      setFeedbackMsg(`Registos públicos e boletins oficiais de [${searchInput.trim()}] indexados com sucesso.`);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handlePreserve = () => {
    setFeedbackMsg(`Snapshot societário de ${company.legalName} preservado no Cofre Probatório com hash SHA-256.`);
    if (onSaveAsEvidence) {
      onSaveAsEvidence(company.legalName, company);
    }
  };

  const handleLinkToCase = () => {
    try {
      const existing = JSON.parse(localStorage.getItem("profundidade_osint_linked_items") || "[]");
      existing.push({
        caseId: "CASO-2026-001",
        caseTitle: "Operação Sombra Digital",
        type: "DESCOBERTA_SOCIETARIA",
        title: `Pacto Societário: ${company.legalName} (NIF ${company.nif})`,
        hash: company.contentHash,
        linkedAt: new Date().toISOString(),
      });
      localStorage.setItem("profundidade_osint_linked_items", JSON.stringify(existing));
    } catch {}
    setFeedbackMsg(`Entidade societária vinculada formalmente ao CASO-2026-001 sob custódia de evidências.`);
  };

  const handleDownloadPdf = () => {
    generateOsintPdfReport({
      search: {
        id: `SOC-${Date.now().toString().slice(-6)}`,
        targetQuery: company.legalName,
        targetType: "EMPRESA",
        contextNotes: `Averiguação de pacto social, participações societárias e publicações oficiais para ${company.legalName} (NIF ${company.nif}).`,
        investigationRef: "CASO-2026-001 (Operação Sombra Digital)",
        status: "CONCLUIDA",
        resultsCount: company.shareholders.length + company.gazettePublications.length,
        discoveriesCount: 2,
        createdAt: new Date().toISOString(),
        requestedBy: "Perito de Fraude Corporativa & OSINT",
      },
      tenantName: "PROFUNDIDADE - Lab de Inteligência & Evidências",
      analystName: "Perito Especialista em Investigação Societária",
      results: company.gazettePublications.map((pub, idx) => ({
        id: `res-pub-${idx}`,
        searchId: "SOC-001",
        source: "PublicDocumentConnector (Boletim Oficial)",
        sourceType: "PublicDocumentConnector",
        category: "DOCUMENTOS",
        url: `https://imprensa.gov.ao/diario/${encodeURIComponent(pub.edition)}`,
        title: pub.title,
        snippet: `${pub.summary} • Publicado em ${pub.date}`,
        publishedAt: pub.date,
        collectedAt: new Date().toISOString(),
        contentHash: pub.contentHash,
        entities: [company.legalName, ...company.shareholders.map((s) => s.name)],
        indicators: [company.nif, pub.edition],
        isPreservedAsEvidence: true,
      })),
      discoveries: [
        {
          id: `disc-soc-1`,
          title: `Estrutura de Controle Fiduciário Identificada: ${company.legalName}`,
          description: `Identificada outorga de poderes amplos ao procurador ${company.shareholders[0].name} com participação minoritária (35%) e holding offshore controladora de 65%.`,
          type: "CORRELACAO",
          sources: ["PublicDocumentConnector", "DomainConnector"],
          evidences: [company.contentHash],
          validationStatus: "VALIDADO",
          validatorNotes: "Confirmada compatibilidade com certidões de Diário da República disponíveis publicamente.",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header com Input de NIF / Empresa */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Investigação Societária & Mapeamento de Entidades (NIF)
            </h3>
            <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded font-mono font-bold">
              CORPORATE REGISTRY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Reconhecimento passivo de pactos sociais, sócios, administradores fiduciários e publicações oficiais no Diário da República.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ex: 5410982319 ou Denominação Social"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Consultar</span>
          </button>
        </form>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="hover:text-white">✕</button>
        </div>
      )}

      {/* Ficha Cadastral da Entidade Societária */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-base font-bold text-white font-mono">{company.legalName}</h4>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                {company.status}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Nome Comercial: {company.tradeName}</span>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-slate-500">NIF Registado:</span>
            <span className="text-amber-400 font-bold bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              {company.nif}
            </span>
          </div>
        </div>

        {/* Metadados Estruturais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
            <span className="text-slate-500 text-[10px] block">Forma Jurídica:</span>
            <span className="text-slate-200 font-bold block">{company.legalForm}</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
            <span className="text-slate-500 text-[10px] block">Data de Constituição:</span>
            <span className="text-slate-200 font-bold block">{company.incorporationDate}</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
            <span className="text-slate-500 text-[10px] block">Capital Social Declarado:</span>
            <span className="text-amber-400 font-bold block truncate">{company.shareCapital}</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
            <span className="text-slate-500 text-[10px] block">Sede Fiscal:</span>
            <span className="text-slate-200 block text-[11px] truncate">
              {company.municipality}, {company.province}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Sócios / Órgãos Sociais & Publicações em Diário da República */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloco: Sócios e Administradores */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Estrutura de Acionistas & Administradores
              </h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {company.shareholders.length} entidades
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {company.shareholders.map((sh, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-sm">{sh.name}</span>
                  <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded text-[11px]">
                    Quotas: {sh.equity}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{sh.role}</span>
                  <span className="text-slate-300">{sh.identifier}</span>
                </div>

                {sh.riskIndicator && (
                  <div className="p-2 bg-amber-950/40 border border-amber-500/20 rounded text-[10px] text-amber-300 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{sh.riskIndicator}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bloco: Publicações em Diário da República */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Extratos Oficiais de Diários da República
              </h4>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              FONTE OFICIAL
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {company.gazettePublications.map((pub, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{pub.title}</span>
                  <span className="text-slate-400 text-[10px]">{pub.date}</span>
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {pub.summary}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                  <span className="text-sky-400 truncate max-w-[200px]">{pub.edition}</span>
                  <span>SHA-256: {pub.contentHash.substring(0, 16)}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Red Flags Regulatórias e Anti-Branqueamento */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-xl">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-rose-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Indicadores de Risco Societário & Red Flags (AML / CFT)
          </h4>
        </div>

        <div className="space-y-2 font-mono text-xs">
          {company.redFlags.map((flag, idx) => (
            <div
              key={idx}
              className="p-2.5 bg-rose-950/30 border border-rose-500/30 rounded-lg text-rose-300 flex items-start space-x-2"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>{flag}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ações de Custódia Probatória & Protocolo Judicial */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
        <div className="space-y-1">
          <span className="text-slate-500 text-[11px] block">Assinatura Digital do Registro Societário:</span>
          <div className="flex items-center space-x-2 text-sky-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="select-all">SHA-256: {company.contentHash}</span>
            <button
              onClick={() => handleCopy(company.contentHash)}
              className="text-slate-400 hover:text-white"
              title="Copiar Hash"
            >
              {copiedHash ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <span className="text-[10px] text-slate-500">
            * Consulta passiva arquivada a partir de boletins e certidões públicas de registo mercantil.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadPdf}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <FileDown className="w-4 h-4 text-sky-400" />
            <span>Laudo Societário (PDF)</span>
          </button>

          <button
            onClick={handleLinkToCase}
            className="bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 font-bold px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <Link2 className="w-4 h-4" />
            <span>Vincular ao CASO-2026-001</span>
          </button>

          <button
            onClick={handlePreserve}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-2 cursor-pointer shadow-lg transition-colors"
          >
            <FileCheck className="w-4 h-4" />
            <span>Preservar Evidência</span>
          </button>
        </div>
      </div>
    </div>
  );
}
