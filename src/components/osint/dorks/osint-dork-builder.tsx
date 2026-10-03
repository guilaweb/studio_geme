"use client";

import React, { useState } from "react";
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  Copy,
  ExternalLink,
  BookOpen,
  FileText,
  Globe,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Clock,
  Briefcase,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  INITIAL_DORK_TEMPLATES,
  validateDorkQuery,
  BLOCKED_DORK_PATTERNS,
} from "@/lib/osint-advanced-engine";
import { DorkTemplate, DorkQueryRecord } from "@/lib/osint-advanced-types";

export function OsintDorkBuilder() {
  const [subTab, setSubTab] = useState<"builder" | "templates" | "history" | "results">("builder");

  // Parâmetros do Construtor
  const [engine, setEngine] = useState<"Google" | "Bing" | "DuckDuckGo" | "MultiMotor">("Google");
  const [domain, setDomain] = useState("vortex-consulting.org");
  const [term, setTerm] = useState("relatório");
  const [inurl, setInurl] = useState("documentos");
  const [intitle, setIntitle] = useState("");
  const [filetype, setFiletype] = useState("pdf");
  const [dateRange, setDateRange] = useState("30d");
  const [exactMatch, setExactMatch] = useState(false);

  // Consulta Gerada
  const [generatedQuery, setGeneratedQuery] = useState(
    'site:vortex-consulting.org inurl:documentos filetype:pdf "relatório"'
  );
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [validationState, setValidationState] = useState<{
    tested: boolean;
    isAllowed: boolean;
    reason?: string;
  }>({ tested: true, isAllowed: true });

  // Histórico de Consultas
  const [history, setHistory] = useState<DorkQueryRecord[]>([
    {
      id: "drk-001",
      queryText: 'site:vortex-consulting.org inurl:documentos filetype:pdf "relatório"',
      engine: "Google",
      domain: "vortex-consulting.org",
      term: "relatório",
      inurl: "documentos",
      filetype: "pdf",
      dateRange: "30d",
      executedAt: "2026-10-03 14:45",
      resultsCount: 6,
      isEthicallyApproved: true,
    },
    {
      id: "drk-002",
      queryText: 'site:vortex-consulting.org inurl:admin password filetype:env',
      engine: "Google",
      domain: "vortex-consulting.org",
      term: "password",
      executedAt: "2026-10-03 13:10",
      resultsCount: 0,
      isEthicallyApproved: false,
      blockReason: "Tentativa de busca de credenciais ou arquivos de configuração confidenciais (.env/password).",
    },
    {
      id: "drk-003",
      queryText: 'site:gov.ao "Dr. Manuel V." OR "Vortex Consulting"',
      engine: "MultiMotor",
      domain: "gov.ao",
      term: "Dr. Manuel V.",
      executedAt: "2026-10-02 11:20",
      resultsCount: 14,
      isEthicallyApproved: true,
    },
  ]);

  // Resultados Normalizados de Pesquisa
  const [results, setResults] = useState([
    {
      id: "res-drk-1",
      title: "Relatório de Gestão Fiduciária & Governança Corporativa 2025",
      url: "https://vortex-consulting.org/documentos/relatorio-anual-2025.pdf",
      snippet: "...balancete consolidado e representação outorgada ao conselho fiduciário sob registro notarial em Luanda...",
      filetype: "PDF",
      size: "2.4 MB",
      date: "2026-04-12",
      contentHash: "3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b",
      saved: true,
    },
    {
      id: "res-drk-2",
      title: "Demonstrações Financeiras Intermédias e Balancete - Vortex",
      url: "https://vortex-consulting.org/documentos/financeiro/balancete-q2.pdf",
      snippet: "...distribuição de dividendos para a conta de compensação internacional do acionista maioritário...",
      filetype: "PDF",
      size: "1.1 MB",
      date: "2026-07-30",
      contentHash: "8e7d6c5b4a3210fedcba9876543210fedcba9876543210fedcba9876543210fe",
      saved: false,
    },
    {
      id: "res-drk-3",
      title: "Ata da Assembleia Geral Extraordinária - Nomeação de Procurador",
      url: "https://vortex-consulting.org/documentos/atas/ata-mar-2024.pdf",
      snippet: "...outorga de plenos poderes fiduciários ao Dr. Manuel V. para representação junto a instituições bancárias...",
      filetype: "PDF",
      size: "890 KB",
      date: "2024-03-18",
      contentHash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
      saved: false,
    },
  ]);

  // Constrói a consulta dinamicamente
  const handleBuildQuery = () => {
    const parts: string[] = [];
    if (domain.trim()) parts.push(`site:${domain.trim()}`);
    if (inurl.trim()) parts.push(`inurl:${inurl.trim()}`);
    if (intitle.trim()) parts.push(`intitle:${intitle.trim()}`);
    if (filetype.trim()) parts.push(`filetype:${filetype.trim()}`);
    if (term.trim()) {
      parts.push(exactMatch ? `"${term.trim()}"` : term.trim());
    }

    const q = parts.join(" ");
    setGeneratedQuery(q);

    // Validação ética
    const val = validateDorkQuery(q);
    setValidationState({
      tested: true,
      isAllowed: val.isAllowed,
      reason: val.reason,
    });
  };

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(generatedQuery);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleExecuteQuery = () => {
    const val = validateDorkQuery(generatedQuery);
    if (!val.isAllowed) {
      setValidationState({
        tested: true,
        isAllowed: false,
        reason: val.reason,
      });
      return;
    }

    // Registra no histórico
    const newRecord: DorkQueryRecord = {
      id: `drk-${Date.now().toString().slice(-4)}`,
      queryText: generatedQuery,
      engine,
      domain,
      term,
      inurl,
      filetype,
      dateRange,
      executedAt: new Date().toLocaleString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      resultsCount: results.length,
      isEthicallyApproved: true,
    };

    setHistory([newRecord, ...history]);
    setSubTab("results");
  };

  const handleApplyTemplate = (tmpl: DorkTemplate) => {
    let q = tmpl.queryTemplate;
    q = q.replace("{domain}", domain || "vortex-consulting.org");
    q = q.replace("{term}", term || "Manuel V.");
    setGeneratedQuery(q);
    setValidationState({ tested: true, isAllowed: true });
    setSubTab("builder");
  };

  const handleSaveAsEvidence = (index: number) => {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, saved: true } : r))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header com Ética e Salvaguarda Institucional */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Search className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white">
              OSINT Dork Builder & Motor de Descoberta Avançada
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Consultas estruturadas em fontes indexadas com filtro de governança e salvaguarda contra intrusão.
          </p>
        </div>

        {/* Badge de Governança Ética */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-neutral-300">
            Filtro Ativo: <strong className="text-emerald-300">Intrusão Proibida</strong>
          </span>
          <span className="text-neutral-500 text-[10px] hidden sm:inline">| RFC & Normas Forenses</span>
        </div>
      </div>

      {/* Subnavegação de Abas do Módulo Dorks */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          onClick={() => setSubTab("builder")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subTab === "builder"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Construtor
        </button>

        <button
          onClick={() => setSubTab("templates")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subTab === "templates"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Biblioteca de Templates
          <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-neutral-800 text-neutral-300">
            {INITIAL_DORK_TEMPLATES.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab("results")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subTab === "results"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Resultados Normalizados
          <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
            {results.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subTab === "history"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Consultas & Histórico
        </button>
      </div>

      {/* ABA 1: CONSTRUTOR DE CONSULTAS */}
      {subTab === "builder" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário do Construtor */}
          <div className="lg:col-span-2 space-y-5 p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                DORK BUILDER
              </h3>
              <span className="text-[11px] text-neutral-400">
                Sintaxe universal com tradução para motores de busca
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Pesquisar em
                </label>
                <select
                  value={engine}
                  onChange={(e) => setEngine(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="Google">Google Search (Global)</option>
                  <option value="Bing">Microsoft Bing</option>
                  <option value="DuckDuckGo">DuckDuckGo (Privacidade Estrita)</option>
                  <option value="MultiMotor">Multi-Motor Integrado (Metasearch)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Domínio (site:)
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="ex: example.com ou gov.ao"
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Termo / Palavra-chave
                </label>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="ex: relatório, balanço, ata..."
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  URL contém (inurl:)
                </label>
                <input
                  type="text"
                  value={inurl}
                  onChange={(e) => setInurl(e.target.value)}
                  placeholder="ex: documentos, uploads, atas..."
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Título contém (intitle:)
                </label>
                <input
                  type="text"
                  value={intitle}
                  onChange={(e) => setIntitle(e.target.value)}
                  placeholder="ex: comunicado, edital..."
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Tipo de Ficheiro (filetype:)
                </label>
                <select
                  value={filetype}
                  onChange={(e) => setFiletype(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="pdf">PDF (Documentos Portáteis)</option>
                  <option value="xlsx">XLSX (Planilhas Excel)</option>
                  <option value="docx">DOCX (Processador de Texto)</option>
                  <option value="csv">CSV (Dados Estruturados)</option>
                  <option value="pptx">PPTX (Apresentações Corporativas)</option>
                  <option value="">Qualquer Extensão</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Janela Temporal
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="any">Qualquer período</option>
                  <option value="24h">Últimas 24 horas</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="1y">Último ano</option>
                </select>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                  <input
                    type="checkbox"
                    checked={exactMatch}
                    onChange={(e) => setExactMatch(e.target.checked)}
                    className="rounded bg-neutral-900 border-neutral-700 text-emerald-500 focus:ring-0"
                  />
                  Correspondência Exata (&quot;...&quot;)
                </label>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleBuildQuery}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-emerald-950/40"
              >
                <Sparkles className="w-4 h-4" />
                Construir Consulta
              </button>
            </div>

            {/* Painel da Consulta Gerada */}
            <div className="pt-4 border-t border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  CONSULTA RESULTANTE
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyQuery}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-mono transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copyFeedback ? "Copiado!" : "Copiar"}
                  </button>

                  <button
                    onClick={handleExecuteQuery}
                    disabled={!validationState.isAllowed}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Pesquisar
                  </button>
                </div>
              </div>

              <textarea
                value={generatedQuery}
                onChange={(e) => {
                  setGeneratedQuery(e.target.value);
                  const val = validateDorkQuery(e.target.value);
                  setValidationState({
                    tested: true,
                    isAllowed: val.isAllowed,
                    reason: val.reason,
                  });
                }}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-500/50"
              />

              {/* Status de Validação Ética */}
              <div className="mt-3">
                {validationState.isAllowed ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Salvaguarda Ética Validada: Nenhum operador invasivo ou termo restrito detectado.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <div>
                      <strong className="block text-rose-200">CONSULTA BLOQUEADA POR SALVAGUARDA ÉTICA</strong>
                      <p className="mt-0.5 text-neutral-300">{validationState.reason}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coluna Lateral: Guia Ético & Boas Práticas */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Diretrizes de Governança
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                No <strong>PROFUNDIDADE</strong>, Dorks são instrumentos de <em>descoberta passiva de fontes públicas</em>, e não vetores de intrusão informática.
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
                  <span className="text-emerald-400 font-semibold">✓ Permitido:</span> Documentos institucionais públicos, relatórios de auditoria abertos, editais e matérias de imprensa oficial.
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
                  <span className="text-rose-400 font-semibold">✗ Bloqueado:</span> Senhas, credenciais, ficheiros de configuração (.env), chaves SSH/RSA, dados de cartões ou painéis administrativos restritos.
                </div>
              </div>
            </div>

            {/* Acesso rápido a templates */}
            <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Templates Rápidos
              </h4>
              <div className="space-y-2">
                {INITIAL_DORK_TEMPLATES.slice(0, 3).map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="w-full text-left p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 transition-colors group"
                  >
                    <div className="text-xs font-semibold text-white group-hover:text-emerald-400 flex items-center justify-between">
                      {tmpl.title}
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-emerald-400" />
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                      {tmpl.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: BIBLIOTECA DE TEMPLATES */}
      {subTab === "templates" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800">
            <h3 className="text-sm font-semibold text-white mb-1">
              Biblioteca de Dorks Institucionais & Forenses
            </h3>
            <p className="text-xs text-neutral-400">
              Templates validados contra o catálogo de operadores padrão de motores de pesquisa comerciais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INITIAL_DORK_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 flex flex-col justify-between hover:border-neutral-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-neutral-800 text-neutral-300">
                      {tmpl.category}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      Ético Validado
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-white mb-1.5">
                    {tmpl.title}
                  </h4>
                  <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
                    {tmpl.description}
                  </p>

                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 mb-3">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">
                      Template de Consulta:
                    </span>
                    <code className="text-xs text-emerald-300 font-mono break-all">
                      {tmpl.queryTemplate}
                    </code>
                  </div>

                  <div className="text-[11px] text-neutral-400 italic bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/80 mb-4">
                    <strong>Salvaguarda:</strong> {tmpl.ethicalGuidance}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800/60">
                  <button
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors"
                  >
                    <Sliders className="w-3 h-3" />
                    Carregar no Construtor
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 3: RESULTADOS NORMALIZADOS */}
      {subTab === "results" && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Resultados Normalizados da Descoberta
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Consulta: <code className="text-emerald-400 font-mono">{generatedQuery}</code>
              </p>
            </div>
            <span className="text-xs text-neutral-400">
              {results.length} artefactos indexados identificados
            </span>
          </div>

          <div className="space-y-3">
            {results.map((res, index) => (
              <div
                key={res.id}
                className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 hover:border-neutral-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300">
                        {res.filetype} ({res.size})
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Publicado em {res.date}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors">
                      {res.title}
                    </h4>

                    <a
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-400 font-mono hover:underline flex items-center gap-1"
                    >
                      {res.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                      {res.snippet}
                    </p>

                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-[10px] font-mono text-neutral-400">SHA-256:</span>
                      <code className="text-[10px] font-mono text-neutral-300 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                        {res.contentHash.slice(0, 24)}...
                      </code>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <button
                      onClick={() => handleSaveAsEvidence(index)}
                      disabled={res.saved}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        res.saved
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 cursor-default"
                          : "bg-neutral-800 hover:bg-neutral-700 text-white"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {res.saved ? "Preservado como Evidência" : "Guardar Evidência"}
                    </button>

                    <button
                      onClick={() => alert(`Artefacto associado ao inquérito CASO-2026-001.`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs transition-colors"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      Associar ao Caso
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 4: HISTÓRICO DE CONSULTAS */}
      {subTab === "history" && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800">
            <h3 className="text-sm font-semibold text-white">
              Histórico & Auditoria de Dorks Executados
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Registo rastreável com parecer de conformidade e auditoria de cada consulta.
            </p>
          </div>

          <div className="space-y-3">
            {history.map((record) => (
              <div
                key={record.id}
                className="p-4 rounded-xl bg-neutral-900/30 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-neutral-500">[{record.executedAt}]</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-800 text-neutral-300">
                      {record.engine}
                    </span>
                    {record.isEthicallyApproved ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        APROVADA
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-400 border border-rose-800">
                        BLOQUEADA
                      </span>
                    )}
                  </div>

                  <code className="text-xs text-neutral-200 font-mono block">
                    {record.queryText}
                  </code>

                  {record.blockReason && (
                    <p className="text-xs text-rose-300 italic pt-1">
                      {record.blockReason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setGeneratedQuery(record.queryText);
                      setSubTab("builder");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors"
                  >
                    Reutilizar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
