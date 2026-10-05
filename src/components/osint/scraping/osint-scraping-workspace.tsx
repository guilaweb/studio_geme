"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Globe,
  Plus,
  Play,
  CheckCircle,
  AlertTriangle,
  FileText,
  FileCheck,
  Link2,
  RefreshCw,
  ExternalLink,
  Shield,
  Eye,
  History,
  Lock,
  ArrowRight,
  Sparkles,
  GitCompare,
  Copy
} from "lucide-react";
import {
  ScrapeJob,
  ScrapeResult,
  ScrapeSnapshot,
  ComplianceCheckResult,
} from "@/lib/osint-advanced-types";
import {
  INITIAL_SCRAPE_JOBS,
  INITIAL_SCRAPE_RESULTS,
  INITIAL_WEBSITE_SNAPSHOT,
  evaluateComplianceGate,
} from "@/lib/osint-advanced-engine";
import {
  subscribeToScrapeJobs,
  saveScrapeJob,
} from "@/lib/osint-db-service";

export function OsintScrapingWorkspace() {
  const [activeSubTab, setActiveSubTab] = useState<"novo-coletor" | "jobs" | "resultados" | "alteracoes">("jobs");
  const [jobs, setJobs] = useState<ScrapeJob[]>(INITIAL_SCRAPE_JOBS);
  const [selectedJob, setSelectedJob] = useState<ScrapeJob>(INITIAL_SCRAPE_JOBS[0]);
  const [results, setResults] = useState<ScrapeResult[]>(INITIAL_SCRAPE_RESULTS);
  const [snapshot, setSnapshot] = useState<ScrapeSnapshot>(INITIAL_WEBSITE_SNAPSHOT);

  useEffect(() => {
    const unsub = subscribeToScrapeJobs((list) => {
      if (list && list.length > 0) {
        setJobs(list);
        setSelectedJob((prev) => (list.find((j) => j.id === prev.id) || list[0]));
      }
    });
    return () => unsub();
  }, []);

  // Form State Novo Coletor
  const [targetUrl, setTargetUrl] = useState("https://vortex-consulting.org");
  const [objective, setObjective] = useState("Mapeamento passivo de estrutura societária, representantes legais e comunicados institucionais.");
  const [crawlType, setCrawlType] = useState<ScrapeJob["crawlType"]>("SITE");
  const [maxDepth, setMaxDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(100);
  const [respectRobots, setRespectRobots] = useState(true);
  const [verifyTosFirst, setVerifyTosFirst] = useState(true);
  const [rateLimitSafe, setRateLimitSafe] = useState(true);

  // Compliance modal
  const [complianceResult, setComplianceResult] = useState<ComplianceCheckResult | null>(null);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleVerifyPermissions = (e: React.FormEvent) => {
    e.preventDefault();
    const result = evaluateComplianceGate(targetUrl, respectRobots, verifyTosFirst, rateLimitSafe);
    setComplianceResult(result);
    setShowComplianceModal(true);
  };

  const handleCreateCollector = () => {
    const compliance = evaluateComplianceGate(targetUrl, respectRobots, verifyTosFirst, rateLimitSafe);

    if (compliance.decision === "BLOCK") {
      setComplianceResult(compliance);
      setShowComplianceModal(true);
      return;
    }

    const newJob: ScrapeJob = {
      id: `SCR-00${jobs.length + 483}`,
      tenantId: "org-profundidade-lab",
      investigationId: "CASO-2026-001",
      targetUrl,
      objective,
      crawlType,
      maxDepth,
      maxPages,
      requestIntervalMs: 1500,
      respectRobots,
      verifyTosFirst,
      rateLimitSafe,
      status: "EM_EXECUCAO",
      progressPercentage: 10,
      pagesDiscovered: 14,
      pagesProcessed: 1,
      errorCount: 0,
      evidencesCount: 1,
      lastDiscoveredUrls: [targetUrl],
      startedAt: new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC+1",
      complianceDecision: compliance.decision,
    };

    setJobs([newJob, ...jobs]);
    setSelectedJob(newJob);
    // Persistência em tempo real no banco de dados Firestore
    saveScrapeJob(newJob);
    setShowComplianceModal(false);
    setActiveSubTab("jobs");
    showToast(`Coletor [${newJob.id}] gravado no banco de dados e instanciado com sucesso.`);
  };

  const handlePreserveResult = (resId: string) => {
    setResults((prev) =>
      prev.map((r) =>
        r.id === resId
          ? { ...r, isPreservedAsEvidence: true, evidenceId: `EV-SCR-${Date.now().toString().slice(-4)}` }
          : r
      )
    );
    showToast("Página e hash SHA-256 preservados como prova no Cofre Probatório.");
  };

  const handleLinkResultToCase = (res: ScrapeResult) => {
    try {
      const existing = JSON.parse(localStorage.getItem("profundidade_osint_linked_items") || "[]");
      existing.push({
        caseId: "CASO-2026-001",
        caseTitle: "Operação Sombra Digital",
        type: "EVIDENCIA_SCRAPING",
        title: `Página Coletada: ${res.title}`,
        hash: res.contentHash,
        linkedAt: new Date().toISOString(),
      });
      localStorage.setItem("profundidade_osint_linked_items", JSON.stringify(existing));
    } catch {}
    showToast(`Evidência de página [${res.pageUrl}] vinculada com sucesso ao CASO-2026-001.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="hover:text-white">✕</button>
        </div>
      )}

      {/* Header do Módulo de Scraping */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Scraping & Coleta Automatizada de Conteúdo Público Autorizado
            </h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
              COMPLIANT CRAWLER
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Indexação e extração estruturada de páginas abertas com respeito estrito a robots.txt, verificação de ToS e selagem SHA-256.
          </p>
        </div>

        {/* Sub-Abas do Scraping */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveSubTab("novo-coletor")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSubTab === "novo-coletor" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            + Novo Coletor
          </button>
          <button
            onClick={() => setActiveSubTab("jobs")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSubTab === "jobs" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setActiveSubTab("resultados")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSubTab === "resultados" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Resultados ({results.length})
          </button>
          <button
            onClick={() => setActiveSubTab("alteracoes")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSubTab === "alteracoes" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Website Monitoring
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. NOVO COLETOR (WIZARD COM VERIFICAÇÃO DE COMPLIANCE) */}
      {/* ============================================================ */}
      {activeSubTab === "novo-coletor" && (
        <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
              CONFIGURAÇÃO DE EXTRAÇÃO EM FONTES PÚBLICAS
            </span>
            <h4 className="text-base font-bold text-white tracking-tight mt-0.5">Novo Coletor de Scraping</h4>
            <p className="text-xs text-slate-400">
              O PROFUNDIDADE não contorna CAPTCHAs, paywalls ou autenticações restritas. Toda coleta deve ter base legal de inteligência.
            </p>
          </div>

          <form onSubmit={handleVerifyPermissions} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-slate-300 mb-1.5 font-bold">URL Inicial de Entrada:</label>
              <input
                type="url"
                required
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com/"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5 font-bold">Objetivo Investigativo da Coleta:</label>
              <textarea
                rows={2}
                required
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Fundamentação da recolha e escopo de interesse probatório..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">Tipo de Coleta:</label>
                <div className="space-y-1.5 bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px]">
                  {[
                    { id: "SINGLE_PAGE", label: "Página única" },
                    { id: "SITE", label: "Site completo (dentro do domínio)" },
                    { id: "URL_LIST", label: "Lista específica de URLs" },
                    { id: "SITEMAP", label: "Sitemap XML oficial" },
                  ].map((t) => (
                    <label key={t.id} className="flex items-center space-x-2 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="crawlType"
                        checked={crawlType === t.id}
                        onChange={() => setCrawlType(t.id as any)}
                        className="accent-amber-500"
                      />
                      <span>{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Profundidade Máxima de Links (Depth):</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                  <span className="text-[10px] text-slate-500">Padrão pericial recomendado: 2 a 3 níveis.</span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Limite Máximo de Páginas:</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                  <span className="text-[10px] text-slate-500">Bloqueio preventivo contra exaustão de recursos.</span>
                </div>
              </div>
            </div>

            {/* Salvaguardas Éticas e de Governança */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-amber-400 font-bold block text-[11px] uppercase tracking-wider">
                Salvaguardas de Conformidade Obrigatórias:
              </span>
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={respectRobots}
                  onChange={(e) => setRespectRobots(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Respeitar diretivas do robots.txt (Disallow e Crawl-delay)</span>
              </label>
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={verifyTosFirst}
                  onChange={(e) => setVerifyTosFirst(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Verificar Termos de Serviço (ToS) e matriz de direitos antes da execução</span>
              </label>
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={rateLimitSafe}
                  onChange={(e) => setRateLimitSafe(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Limitar taxa de requisições automaticamente (mínimo 1.2s entre pedidos)</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer"
              >
                Verificar Permissões (Compliance Gate)
              </button>
              <button
                type="button"
                onClick={handleCreateCollector}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 rounded-lg flex items-center space-x-1.5 shadow-lg cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Criar Coletor</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. JOBS & WORKSPACE ATIVO (DESIGN EXATO SOLICITADO) */}
      {/* ============================================================ */}
      {activeSubTab === "jobs" && (
        <div className="space-y-6">
          {/* Card Principal de Telemetria do Job Selecionado */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] text-amber-400 font-bold tracking-widest block uppercase">
                  MONITOR DE EXTRAÇÃO ATIVA
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  SCRAPER #{selectedJob.id}
                </h3>
                <span className="text-xs text-sky-400 block mt-0.5">{selectedJob.targetUrl}</span>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-[11px] text-slate-400">Estado:</span>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full flex items-center space-x-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>{selectedJob.status.replace("_", " ")}</span>
                </span>
              </div>
            </div>

            {/* Estatísticas Estruturadas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] block">Páginas Descobertas:</span>
                <span className="text-lg font-bold text-white">{selectedJob.pagesDiscovered}</span>
              </div>
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] block">Páginas Processadas:</span>
                <span className="text-lg font-bold text-sky-400">{selectedJob.pagesProcessed}</span>
              </div>
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] block">Erros de Conexão:</span>
                <span className="text-lg font-bold text-rose-400">{selectedJob.errorCount}</span>
              </div>
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] block">Evidências Seladas:</span>
                <span className="text-lg font-bold text-emerald-400">{selectedJob.evidencesCount}</span>
              </div>
            </div>

            {/* Barra de Progresso Realista */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">PROGRESSO</span>
                <span className="text-amber-400 font-bold">{selectedJob.progressPercentage}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                <div
                  className="bg-amber-500 h-full transition-all duration-500"
                  style={{ width: `${selectedJob.progressPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Últimas Páginas Processadas */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                ÚLTIMAS PÁGINAS PROCESSADAS:
              </span>
              <div className="space-y-1.5">
                {selectedJob.lastDiscoveredUrls.map((url, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                    <span className="truncate max-w-xl text-sky-400">{url}</span>
                    <span className="text-[10px] text-emerald-400 font-bold">200 OK • SHA-256</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabela de Todos os Jobs de Scraping */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl font-mono text-xs">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">Todos os Coletores de Scraping</span>
              <span className="text-slate-400 text-[10px]">{jobs.length} tarefas</span>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">ID Coletor</th>
                  <th className="p-3">Alvo</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Progresso</th>
                  <th className="p-3">Evidências</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`cursor-pointer transition-colors ${
                      selectedJob.id === job.id ? "bg-slate-800/80" : "hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="p-3 text-amber-400 font-bold">{job.id}</td>
                    <td className="p-3 text-white truncate max-w-xs">{job.targetUrl}</td>
                    <td className="p-3">{job.crawlType}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        job.status === "EM_EXECUCAO"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                          : job.status === "CONCLUIDO"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="p-3">{job.progressPercentage}%</td>
                    <td className="p-3 font-bold text-emerald-400">{job.evidencesCount}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                          setActiveSubTab("resultados");
                        }}
                        className="text-amber-400 hover:text-amber-300 font-bold"
                      >
                        Ver Resultados →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. RESULTADOS NORMALIZADOS DO SCRAPING */}
      {/* ============================================================ */}
      {activeSubTab === "resultados" && (
        <div className="space-y-4 font-mono text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white">Conteúdos Públicos Extraídos & Normalizados</h4>
              <p className="text-slate-400 text-xs">Dados limpos de tags HTML com separação de entidades, mídias e hashes probatórios.</p>
            </div>
            <span className="text-[10px] text-amber-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              Coletor Ativo: {selectedJob.id}
            </span>
          </div>

          <div className="space-y-3">
            {results.map((res) => (
              <div key={res.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-xl hover:border-slate-700 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <h5 className="text-sm font-bold text-white hover:text-amber-400 transition-colors">
                      {res.title}
                    </h5>
                    <a href={res.pageUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline text-[11px] block mt-0.5">
                      {res.pageUrl}
                    </a>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                    <span>Coletado: {res.collectedAt}</span>
                    {res.isPreservedAsEvidence && (
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        ✓ PRESERVADO NO COFRE
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  {res.textSnippet}
                </p>

                {/* Métricas do Conteúdo */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-400">
                  <div>Links Extraídos: <strong className="text-white">{res.linksCount}</strong></div>
                  <div>Imagens: <strong className="text-white">{res.imagesCount}</strong></div>
                  <div>Documentos: <strong className="text-white">{res.documentsCount}</strong></div>
                  <div>Autor Declarado: <strong className="text-white">{res.author || "Institucional"}</strong></div>
                </div>

                {/* Entidades Extraídas */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                  <span className="text-slate-500 text-[10px]">Entidades Observáveis:</span>
                  {res.extractedEntities.map((ent, idx) => (
                    <span key={idx} className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-amber-400 text-[10px]">
                      {ent}
                    </span>
                  ))}
                </div>

                {/* Hash & Ações Oficiais */}
                <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <span className="text-[10px] text-slate-500 truncate max-w-sm">SHA-256: {res.contentHash}</span>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={res.pageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir</span>
                    </a>

                    <button
                      onClick={() => handleLinkResultToCase(res)}
                      className="bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 px-3 py-1.5 rounded-lg flex items-center space-x-1"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Associar ao Caso</span>
                    </button>

                    {!res.isPreservedAsEvidence && (
                      <button
                        onClick={() => handlePreserveResult(res.id)}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Guardar Evidência</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. DETECÇÃO DE ALTERAÇÕES (WEBSITE MONITORING & DIFF) */}
      {/* ============================================================ */}
      {activeSubTab === "alteracoes" && (
        <div className="space-y-6 font-mono text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-2">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-amber-400" />
              <h4 className="text-base font-bold text-white tracking-tight">
                Website Monitoring & Análise Diferencial de Páginas (Diff)
              </h4>
            </div>
            <p className="text-slate-400 text-xs">
              Monitorização contínua de mudanças textuais, adição de parágrafos, eliminação de menções a entidades e alteração de canais de contacto.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-white">{snapshot.targetUrl}</span>
                <span className="text-[10px] text-slate-500 block">Snapshot Comparativo Automático</span>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-slate-400">Versão Anterior: <strong className="text-white">{snapshot.previousDate}</strong></span>
                <span className="text-amber-400">➔</span>
                <span className="text-slate-400">Versão Atual: <strong className="text-amber-400">{snapshot.currentDate}</strong></span>
              </div>
            </div>

            {/* Blocos de Alterações */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                Alterações Detectadas pelo Motor de Inteligência:
              </span>

              {/* Adições */}
              <div className="space-y-1.5">
                {snapshot.addedContent.map((item, idx) => (
                  <div key={idx} className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
                    {item}
                  </div>
                ))}
              </div>

              {/* Remoções */}
              <div className="space-y-1.5">
                {snapshot.removedContent.map((item, idx) => (
                  <div key={idx} className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
                    {item}
                  </div>
                ))}
              </div>

              {/* Modificações */}
              <div className="space-y-1.5">
                {snapshot.modifiedContent.map((item, idx) => (
                  <div key={idx} className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg text-amber-300 text-xs">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
              <span>SHA-256 Snapshot: {snapshot.contentHash}</span>
              <button
                onClick={() => showToast("Relatório comparativo de versões arquivado com carimbo de tempo.")}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
              >
                <GitCompare className="w-3.5 h-3.5 text-amber-400" />
                <span>Salvar Histórico de Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: VERIFICAÇÃO DO COMPLIANCE GATE */}
      {/* ============================================================ */}
      {showComplianceModal && complianceResult && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Verificação de Coleta (Compliance Gate)</h3>
              </div>
              <button onClick={() => setShowComplianceModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block">CHECKLIST DE AUDITORIA LEGAL:</span>
              <div className="space-y-1.5">
                {complianceResult.checks.map((chk) => (
                  <div key={chk.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-white font-bold block">{chk.label}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{chk.detail}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      chk.status === "PASSED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : chk.status === "WARNING"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {chk.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Decisão Final */}
            <div className={`p-3.5 rounded-xl border ${
              complianceResult.decision === "ALLOW"
                ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-300"
                : complianceResult.decision === "REVIEW"
                ? "bg-amber-950/60 border-amber-500/30 text-amber-300"
                : "bg-rose-950/60 border-rose-500/30 text-rose-300"
            }`}>
              <div className="flex items-center space-x-2 font-bold text-xs uppercase mb-1">
                {complianceResult.decision === "ALLOW" ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                <span>DECISÃO: {complianceResult.decision}</span>
              </div>
              <p className="text-[11px] leading-relaxed">{complianceResult.decisionSummary}</p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowComplianceModal(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Fechar
              </button>
              {complianceResult.decision !== "BLOCK" && (
                <button
                  type="button"
                  onClick={handleCreateCollector}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg flex items-center space-x-1"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Iniciar Coleta Autorizada</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
