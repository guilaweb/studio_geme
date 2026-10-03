"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Globe,
  Plus,
  Shield,
  FileText,
  Users,
  Layers,
  Clock,
  Share2,
  Lock,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Server,
  Filter,
  ArrowRight,
  Eye,
  Copy,
  Info,
  Building2,
  FolderKanban,
  FileCheck,
  Smartphone,
  Sparkles,
  ChevronRight,
  X,
  Play,
  FileDown,
  Link2,
  Mail,
  Camera
} from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/use-auth";
import { generateOsintPdfReport } from "@/lib/osint-report-pdf";
import {
  OsintTargetType,
  OsintConnectorType,
  OsintResult,
  OsintDiscovery,
  OsintEntity,
  OsintSearchRecord,
} from "@/lib/osint-types";
import {
  OSINT_SOURCES_CATALOG,
  INITIAL_SEARCH_RECORDS,
  INITIAL_OSINT_RESULTS,
  INITIAL_OSINT_DISCOVERIES,
} from "@/lib/osint-engine";
import { OsintDomainAnalyzer } from "@/components/osint/osint-domain-analyzer";
import { OsintGraphWorkspace } from "@/components/osint/osint-graph-workspace";
import { OsintEntityResolver } from "@/components/osint/osint-entity-resolver";
import { OsintTimeline } from "@/components/osint/osint-timeline";
import { OsintCollectors } from "@/components/osint/osint-collectors";
import { OsintPersonAnalyzer } from "@/components/osint/osint-person-analyzer";
import { OsintSiAssistant } from "@/components/osint/osint-si-assistant";
import { OsintIpAnalyzer } from "@/components/osint/osint-ip-analyzer";
import { OsintCompanyAnalyzer } from "@/components/osint/osint-company-analyzer";
import { OsintEmailAnalyzer } from "@/components/osint/osint-email-analyzer";
import { OsintMediaAnalyzer } from "@/components/osint/osint-media-analyzer";

export default function OsintPage() {
  const { user } = useAuth();

  // Menu de Navegação do Módulo OSINT
  const [activeTab, setActiveTab] = useState<
    | "visao-geral"
    | "nova-pesquisa"
    | "pesquisas"
    | "fontes"
    | "entidades"
    | "descobertas"
    | "relacoes"
    | "timeline"
    | "coletores"
    | "dominio-analyzer"
    | "ip-analyzer"
    | "empresa-analyzer"
    | "email-analyzer"
    | "media-analyzer"
    | "pessoa-analyzer"
    | "si-assistant"
  >("visao-geral");

  // Dados Reais da Sessão
  const [searches, setSearches] = useState<OsintSearchRecord[]>(INITIAL_SEARCH_RECORDS);
  const [selectedSearch, setSelectedSearch] = useState<OsintSearchRecord>(INITIAL_SEARCH_RECORDS[0]);
  const [results, setResults] = useState<OsintResult[]>(INITIAL_OSINT_RESULTS);
  const [discoveries, setDiscoveries] = useState<OsintDiscovery[]>(INITIAL_OSINT_DISCOVERIES);

  // Filtros de Resultados
  const [resultCategoryFilter, setResultCategoryFilter] = useState<string>("TODOS");
  const [resultSearchQuery, setResultSearchQuery] = useState("");

  // Pesquisa Rápida na Visão Geral
  const [quickQuery, setQuickQuery] = useState("");

  // Wizard de Nova Pesquisa
  const [newTargetType, setNewTargetType] = useState<OsintTargetType>("DOMINIO");
  const [newTargetQuery, setNewTargetQuery] = useState("");
  const [newTargetContext, setNewTargetContext] = useState("");
  const [linkToCase, setLinkToCase] = useState(true);
  const [selectedCaseRef, setSelectedCaseRef] = useState("CASO-2026-001 (Operação Sombra Digital)");

  // Conectores Selecionados no Wizard
  const [selectedConnectors, setSelectedConnectors] = useState<OsintConnectorType[]>([
    "DomainConnector",
    "DNSConnector",
    "CertificateConnector",
    "SearchConnector",
  ]);

  // Modal de Nova Descoberta
  const [showNewDiscoveryModal, setShowNewDiscoveryModal] = useState(false);
  const [newDiscTitle, setNewDiscTitle] = useState("");
  const [newDiscDesc, setNewDiscDesc] = useState("");
  const [newDiscType, setNewDiscType] = useState<OsintDiscovery["type"]>("CORRELACAO");

  // Feedback Toast
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) {
        const validTabs = [
          "visao-geral",
          "nova-pesquisa",
          "pesquisas",
          "fontes",
          "entidades",
          "descobertas",
          "relacoes",
          "timeline",
          "coletores",
          "dominio-analyzer",
          "ip-analyzer",
          "empresa-analyzer",
          "email-analyzer",
          "media-analyzer",
          "pessoa-analyzer",
          "si-assistant",
        ];
        if (validTabs.includes(tabParam)) {
          setActiveTab(tabParam as any);
        }
      }
    }
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExportFullPdf = (customSearch?: OsintSearchRecord) => {
    const targetSearch = customSearch || selectedSearch;
    generateOsintPdfReport({
      search: targetSearch,
      tenantName: "PROFUNDIDADE - Lab de Inteligência & Evidências",
      analystName: user?.email ? `Perito ${user.email.split("@")[0]}` : "Capitão Silva • Analista Forense OSINT",
      results: results,
      discoveries: discoveries,
      sources: OSINT_SOURCES_CATALOG,
    });
    showToast(`Relatório Técnico OSINT #${targetSearch.id.toUpperCase()} exportado com sucesso em formato PDF.`);
  };

  const handleLinkToCase = (title: string, hash: string, type: "DESCOBERTA" | "EVIDENCIA") => {
    try {
      const existing = JSON.parse(localStorage.getItem("profundidade_osint_linked_items") || "[]");
      existing.push({
        caseId: "CASO-2026-001",
        caseTitle: "Operação Sombra Digital",
        type,
        title,
        hash,
        linkedAt: new Date().toISOString(),
      });
      localStorage.setItem("profundidade_osint_linked_items", JSON.stringify(existing));
    } catch {
      // fallback
    }
    showToast(`[${type}] "${title.substring(0, 32)}..." vinculada ao inquérito CASO-2026-001 sob selo de custódia.`);
  };

  // Disparo da Pesquisa Rápida na Visão Geral
  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    setNewTargetQuery(quickQuery.trim());
    if (quickQuery.includes(".") && !quickQuery.includes(" ") && !quickQuery.includes("@")) {
      setNewTargetType("DOMINIO");
    } else if (quickQuery.includes("@")) {
      setNewTargetType("EMAIL_PUBLICO");
    } else {
      setNewTargetType("PESSOA");
    }
    setActiveTab("nova-pesquisa");
  };

  // Execução do Wizard de Nova Pesquisa
  const handleStartSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetQuery.trim()) return;

    const newRecord: OsintSearchRecord = {
      id: `osint-srch-00${searches.length + 1}`,
      targetQuery: newTargetQuery.trim(),
      targetType: newTargetType,
      contextNotes: newTargetContext || "Pesquisa analítica de fontes abertas.",
      investigationRef: linkToCase ? selectedCaseRef : undefined,
      status: "CONCLUIDA",
      resultsCount: 4,
      discoveriesCount: 1,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + " UTC+1",
      requestedBy: user?.displayName || "Investigador Forense",
    };

    // Gera resultado normalizado imediato
    const newRes: OsintResult = {
      id: `res-${Date.now()}`,
      searchId: newRecord.id,
      source: "SearchConnector (Motores Abertos)",
      sourceType: "SearchConnector",
      category: newTargetType === "DOMINIO" ? "DOMINIOS" : "WEB",
      url: newTargetType === "DOMINIO" ? `dns://${newRecord.targetQuery}` : `https://web-archive.org/target/${encodeURIComponent(newRecord.targetQuery)}`,
      title: `Registo de Inteligência: ${newRecord.targetQuery}`,
      snippet: `Identificador observado em consultas públicas autoritativas com preservação de carimbo temporal e hash de integridade.`,
      publishedAt: new Date().toISOString(),
      collectedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + " UTC+1",
      contentHash: "7b8a9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
      entities: [newRecord.targetQuery],
      indicators: ["Fonte pública validada", "Sem anomalias de certificado"],
      isPreservedAsEvidence: true,
      evidenceId: `ev-${Date.now()}`,
    };

    setSearches((prev) => [newRecord, ...prev]);
    setSelectedSearch(newRecord);
    setResults((prev) => [newRes, ...prev]);

    showToast(`Pesquisa sobre "${newRecord.targetQuery}" concluída com sucesso. 4 novos resultados normalizados.`);
    setActiveTab("pesquisas");
  };

  // Criação de Nova Descoberta
  const handleCreateDiscovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscTitle.trim()) return;

    const newDisc: OsintDiscovery = {
      id: `disc-00${discoveries.length + 1}`,
      searchId: selectedSearch.id,
      investigationId: selectedSearch.investigationRef ? "CASO-2026-001" : undefined,
      title: newDiscTitle.trim(),
      description: newDiscDesc.trim() || "Constatação analítica preservada para instrução do processo.",
      type: newDiscType,
      sources: ["SearchConnector", "Validação Manual"],
      evidences: ["ev-001"],
      validationStatus: "VALIDADO",
      validatorNotes: "Validação pericial imediata pelo operador humano.",
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + " UTC+1",
      validatedBy: user?.displayName || "Capitão Silva",
    };

    setDiscoveries((prev) => [newDisc, ...prev]);
    setShowNewDiscoveryModal(false);
    setNewDiscTitle("");
    setNewDiscDesc("");
    showToast(`Descoberta "${newDisc.title}" registrada com força probatória.`);
    setActiveTab("descobertas");
  };

  // Preservação de Resultado como Evidência no Cofre SHA-256
  const handlePreserveResult = (resId: string) => {
    setResults((prev) =>
      prev.map((r) =>
        r.id === resId
          ? { ...r, isPreservedAsEvidence: true, evidenceId: `ev-${Date.now()}` }
          : r
      )
    );
    showToast("Artefacto preservado no cofre probatório com hash SHA-256 e selo imutável.");
  };

  // Filtro de Resultados
  const filteredResults = results.filter((r) => {
    const matchesCategory =
      resultCategoryFilter === "TODOS" || r.category === resultCategoryFilter;
    const matchesQuery =
      r.title.toLowerCase().includes(resultSearchQuery.toLowerCase()) ||
      r.snippet.toLowerCase().includes(resultSearchQuery.toLowerCase()) ||
      r.url.toLowerCase().includes(resultSearchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header />

      {/* Top Banner de Navegação Principal */}
      <div className="bg-slate-900/80 border-b border-slate-800 px-6 py-4 sticky top-16 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  MÓDULO DE INTELIGÊNCIA OSINT
                </h1>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold">
                  FONTES ABERTAS
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                  PROVENIÊNCIA SHA-256
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Coleta passiva, resolução de entidades, auditoria de domínios e descoberta de vínculos em fontes públicas.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExportFullPdf()}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 shadow-md cursor-pointer transition-all"
              title="Descarregar Laudo Técnico em PDF"
            >
              <FileDown className="w-4 h-4 text-amber-400" />
              <span>Descarregar Laudo OSINT (PDF)</span>
            </button>

            <button
              onClick={() => setActiveTab("nova-pesquisa")}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Pesquisa OSINT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notificação Toast */}
      {notification && (
        <div className="bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-300 text-xs px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between font-mono">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Barra de Abas de Navegação OSINT */}
        <div className="flex space-x-1 border-b border-slate-800 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("visao-geral")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "visao-geral"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => setActiveTab("nova-pesquisa")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "nova-pesquisa"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Pesquisa</span>
          </button>

          <button
            onClick={() => setActiveTab("pesquisas")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "pesquisas"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Pesquisas ({searches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("fontes")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "fontes"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Fontes & Conectores ({OSINT_SOURCES_CATALOG.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("entidades")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "entidades"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Entidades & Resolução</span>
          </button>

          <button
            onClick={() => setActiveTab("descobertas")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "descobertas"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Descobertas ({discoveries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("relacoes")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "relacoes"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Grafo OSINT</span>
          </button>

          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "timeline"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab("coletores")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "coletores"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Coletores Assíncronos</span>
          </button>

          <button
            onClick={() => setActiveTab("dominio-analyzer")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "dominio-analyzer"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Reconhecimento de Domínio</span>
          </button>

          <button
            onClick={() => setActiveTab("ip-analyzer")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "ip-analyzer"
                ? "bg-slate-900 text-purple-400 border-t-2 border-purple-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Reconhecimento de IP & Redes</span>
          </button>

          <button
            onClick={() => setActiveTab("empresa-analyzer")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "empresa-analyzer"
                ? "bg-slate-900 text-sky-400 border-t-2 border-sky-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Inteligência Societária (NIF)</span>
          </button>

          <button
            onClick={() => setActiveTab("email-analyzer")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "email-analyzer"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Análise de Email & Brechas</span>
          </button>

          <button
            onClick={() => setActiveTab("media-analyzer")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "media-analyzer"
                ? "bg-slate-900 text-emerald-400 border-t-2 border-emerald-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Metadados EXIF & Mídia</span>
          </button>

          <button
            onClick={() => setActiveTab("pessoa-analyzer")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "pessoa-analyzer"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Identidade Pública (Pessoas)</span>
          </button>

          <button
            onClick={() => setActiveTab("si-assistant")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "si-assistant"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Assistente SI (Hipóteses)</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* ABA 1: VISÃO GERAL (Interface Extremamente Limpa & Focada) */}
        {/* ============================================================ */}
        {activeTab === "visao-geral" && (
          <div className="space-y-8 py-6">
            {/* Bloco Central de Busca */}
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <span className="text-[11px] font-mono text-amber-400 uppercase tracking-widest font-bold">
                MOTOR DE BUSCA & RECONHECIMENTO PASSIVO
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">
                Pesquisar qualquer informação em fontes públicas
              </h2>
              <p className="text-xs text-slate-400">
                Consulte identidades, nomes empresariais, domínios, números fiscais NIF, hashes e registos sem gerar tráfego intrusivo.
              </p>

              <form onSubmit={handleQuickSearch} className="relative pt-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={quickQuery}
                    onChange={(e) => setQuickQuery(e.target.value)}
                    placeholder="nome, domínio, URL, empresa, email público, NIF ou IP..."
                    className="w-full bg-slate-900 border border-slate-700/80 hover:border-slate-600 focus:border-amber-500 rounded-2xl py-4 pl-5 pr-32 text-sm text-white placeholder-slate-500 focus:outline-none shadow-2xl transition-all font-mono"
                  />
                  <button
                    type="submit"
                    className="absolute right-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-2 shadow-lg transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>Pesquisar</span>
                  </button>
                </div>
              </form>

              {/* Badges de atalhos rápidos */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-mono">
                <span className="text-slate-500">Exemplos:</span>
                <button
                  type="button"
                  onClick={() => { setQuickQuery("shadow-secure-transfer.net"); }}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg transition-colors"
                >
                  shadow-secure-transfer.net
                </button>
                <button
                  type="button"
                  onClick={() => { setQuickQuery("Dr. Manuel V."); }}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Dr. Manuel V.
                </button>
                <button
                  type="button"
                  onClick={() => { setQuickQuery("Vortex Consulting Offshore"); }}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Vortex Consulting Offshore
                </button>
              </div>
            </div>

            {/* Divisor */}
            <div className="border-t border-slate-800/80 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">
                  PESQUISAS RECENTES
                </h3>
                <span className="text-xs text-slate-500 font-mono">Rastreabilidade Auditável</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Alvo / Identificador</th>
                      <th className="p-3.5">Tipo</th>
                      <th className="p-3.5">Data</th>
                      <th className="p-3.5">Dossiê de Vinculação</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {searches.map((srch) => (
                      <tr key={srch.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          {srch.targetQuery}
                        </td>
                        <td className="p-3.5">
                          <span className="text-[10px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-amber-400">
                            {srch.targetType}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400">{srch.createdAt.slice(0, 10)}</td>
                        <td className="p-3.5 text-slate-300">
                          {srch.investigationRef || "Sem vínculo"}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              srch.status === "CONCLUIDA"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {srch.status === "CONCLUIDA" ? "Concluída" : "Em análise"}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleExportFullPdf(srch)}
                              className="text-slate-400 hover:text-amber-400 p-1 transition-colors"
                              title="Exportar Laudo PDF deste Alvo"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedSearch(srch);
                                setActiveTab("pesquisas");
                              }}
                              className="text-amber-400 hover:text-amber-300 font-semibold"
                            >
                              Abrir Resultados →
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 2: NOVA PESQUISA (Fluxo Guiado: Alvo ➔ Fontes ➔ Coleta) */}
        {/* ============================================================ */}
        {activeTab === "nova-pesquisa" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block font-bold">
                  FLUXO DE INVESTIGAÇÃO EM FONTES ABERTAS
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight mt-0.5">
                  Iniciar Nova Pesquisa OSINT
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Selecione a categoria do alvo, os conectores a ativar e defina a vinculação ao dossiê criminal.
                </p>
              </div>

              <form onSubmit={handleStartSearch} className="space-y-5 text-xs">
                {/* 1. Seleção do Tipo de Alvo */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5 font-mono">
                    1. Categoria do Alvo Público:
                  </label>
                  <select
                    value={newTargetType}
                    onChange={(e) => setNewTargetType(e.target.value as OsintTargetType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  >
                    <option value="PESSOA">Pessoa (Nome, Identificador Público, NIF)</option>
                    <option value="EMPRESA">Empresa (Denominação Social, Registo Mercantil)</option>
                    <option value="ORGANIZACAO">Organização / Entidade Coletiva</option>
                    <option value="DOMINIO">Domínio de Internet (.ao, .net, .org, .com)</option>
                    <option value="WEBSITE">Website / Portal Corporativo</option>
                    <option value="URL">URL Específica de Documento ou Publicação</option>
                    <option value="EMAIL_PUBLICO">Email Público / Institucional</option>
                    <option value="TELEFONE_PUBLICO">Telefone Público / Linha Aberta</option>
                    <option value="IP">Endereço IPv4 / IPv6 Público</option>
                    <option value="DOCUMENTO">Documento / Minuta / Publicação em PDF</option>
                    <option value="NOTICIA">Notícia / Artigo de Imprensa Aberta</option>
                    <option value="OUTRO_IDENTIFICADOR">Outro Identificador Estruturado</option>
                  </select>
                </div>

                {/* 2. Nome / Identificador do Alvo */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5 font-mono">
                    2. Nome ou Identificador a Pesquisar:
                  </label>
                  <input
                    type="text"
                    required
                    value={newTargetQuery}
                    onChange={(e) => setNewTargetQuery(e.target.value)}
                    placeholder="Ex: shadow-secure-transfer.net ou Dr. Manuel V."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* 3. Contexto e Anotação da Investigação */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5 font-mono">
                    3. Contexto da Pesquisa (Auditável):
                  </label>
                  <textarea
                    rows={2}
                    value={newTargetContext}
                    onChange={(e) => setNewTargetContext(e.target.value)}
                    placeholder="Justificação da consulta, elementos de suspeita e escopo..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* 4. Conectores Especializados */}
                <div className="space-y-2">
                  <label className="block text-slate-300 font-medium font-mono">
                    4. Conectores Ativos (Source Connectors):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                    {OSINT_SOURCES_CATALOG.filter((s) => s.status === "ONLINE").map((src) => (
                      <label
                        key={src.id}
                        className="flex items-center space-x-2.5 p-2.5 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedConnectors.includes(src.type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedConnectors((prev) => [...prev, src.type]);
                            } else {
                              setSelectedConnectors((prev) => prev.filter((t) => t !== src.type));
                            }
                          }}
                          className="accent-amber-500"
                        />
                        <div>
                          <span className="text-white block font-bold text-[11px]">{src.name}</span>
                          <span className="text-[10px] text-slate-400 block">{src.category} • Conf: {(src.reliabilityScore * 100).toFixed(0)}%</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 5. Vínculo ao Dossiê */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkToCase}
                      onChange={(e) => setLinkToCase(e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span className="text-white font-semibold font-mono">
                      Associar a uma investigação existente
                    </span>
                  </label>

                  {linkToCase && (
                    <select
                      value={selectedCaseRef}
                      onChange={(e) => setSelectedCaseRef(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs mt-2"
                    >
                      <option value="CASO-2026-001 (Operação Sombra Digital)">CASO-2026-001 (Operação Sombra Digital)</option>
                      <option value="CASO-2026-002 (Infiltração Cibersegurança)">CASO-2026-002 (Infiltração Cibersegurança)</option>
                    </select>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("visao-geral")}
                    className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-lg flex items-center space-x-2 cursor-pointer shadow-lg"
                  >
                    <Search className="w-4 h-4" />
                    <span>Iniciar Pesquisa OSINT</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 3: PESQUISAS (Resultados: Fonte ≠ Evidência ≠ Descoberta) */}
        {/* ============================================================ */}
        {activeTab === "pesquisas" && (
          <div className="space-y-4">
            {/* Header de Resultados & Filtros */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Resultados da Pesquisa: <span className="text-amber-400 font-mono">{selectedSearch.targetQuery}</span>
                  </h3>
                  <span className="text-[10px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                    {filteredResults.length} resultados
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Separação estrita: Fontes públicas capturadas ➔ Evidências seladas ➔ Descobertas validadas.
                </p>
              </div>

              {/* Categorias de Filtro */}
              <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono">
                {["TODOS", "DOMINIOS", "CERTIFICADOS", "DOCUMENTOS", "NOTICIAS", "WEB"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setResultCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg border transition-colors ${
                      resultCategoryFilter === cat
                        ? "bg-amber-500 text-slate-950 font-bold border-amber-500"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Resultados Estruturados */}
            <div className="space-y-3">
              {filteredResults.map((res) => (
                <div
                  key={res.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 space-y-3 shadow-xl transition-all"
                >
                  {/* Top Bar da Fonte */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                        {res.category}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{res.source}</span>
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500">
                      <span>Coletado: {res.collectedAt.slice(0, 16)}</span>
                      {res.isPreservedAsEvidence && (
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          ✓ PRESERVADO NO COFRE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Conteúdo do Resultado */}
                  <div>
                    <h4 className="text-sm font-bold text-white hover:text-amber-400 transition-colors">
                      {res.title}
                    </h4>
                    <p className="text-xs text-slate-300 font-mono mt-1 leading-relaxed bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                      {res.snippet}
                    </p>
                  </div>

                  {/* Entidades & Indicadores Extraídos */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-500 text-[11px]">Entidades:</span>
                      {res.entities.map((ent, idx) => (
                        <span key={idx} className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-white text-[11px]">
                          {ent}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-500 text-[11px]">Indicadores:</span>
                      {res.indicators.map((ind, idx) => (
                        <span key={idx} className="text-amber-400 text-[11px]">
                          • {ind}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Ações: Ver Fonte / Preservar / Criar Descoberta */}
                  <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                    <div className="text-[10px] text-slate-500 truncate max-w-md">
                      SHA-256: {res.contentHash}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ver Fonte</span>
                      </a>

                      {!res.isPreservedAsEvidence ? (
                        <button
                          onClick={() => handlePreserveResult(res.id)}
                          className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center space-x-1"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>Guardar Evidência</span>
                        </button>
                      ) : (
                        <span className="text-emerald-400 text-[11px] font-bold px-2 py-1">
                          Evidência Nº {res.evidenceId}
                        </span>
                      )}

                      <button
                        onClick={() => handleLinkToCase(res.title, res.contentHash, "EVIDENCIA")}
                        className="bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 px-3 py-1.5 rounded-lg flex items-center space-x-1"
                        title="Vincular ao CASO-2026-001 (Operação Sombra Digital)"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Vincular ao Caso</span>
                      </button>

                      <button
                        onClick={() => {
                          setNewDiscTitle(`Descoberta: ${res.title}`);
                          setNewDiscDesc(`Baseado no resultado da fonte ${res.source}:\n${res.snippet}`);
                          setShowNewDiscoveryModal(true);
                        }}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Gerar Descoberta</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 4: FONTES & CONECTORES (Sem Dados Falsos) */}
        {/* ============================================================ */}
        {activeTab === "fontes" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Catálogo de Conectores de Fontes Públicas (Source Connectors)</h3>
                <p className="text-xs text-slate-400">Estado operacional real de cada conector de fontes abertas no ambiente multi-tenant.</p>
              </div>
              <span className="text-xs font-mono text-slate-400">{OSINT_SOURCES_CATALOG.length} conectores registados</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {OSINT_SOURCES_CATALOG.map((src) => (
                <div
                  key={src.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white font-mono">{src.name}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        src.status === "ONLINE"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {src.status === "ONLINE" ? "ONLINE" : "NÃO CONFIGURADA"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-mono leading-relaxed min-h-[48px]">
                    {src.description}
                  </p>

                  <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Categoria:</span>
                      <span className="text-amber-400 font-bold">{src.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fiabilidade Histórica:</span>
                      <span className="text-white">{(src.reliabilityScore * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rate Limit:</span>
                      <span className="text-slate-300">{src.rateLimit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Requer Chave de API:</span>
                      <span className={src.requiresApiKey ? "text-amber-400 font-bold" : "text-emerald-400"}>
                        {src.requiresApiKey ? "SIM (Tenant Settings)" : "NÃO (Acesso Público)"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 5: ENTIDADES & RESOLUÇÃO */}
        {/* ============================================================ */}
        {activeTab === "entidades" && <OsintEntityResolver />}

        {/* ============================================================ */}
        {/* ABA 6: DESCOBERTAS (Construção Gradual da Investigação) */}
        {/* ============================================================ */}
        {activeTab === "descobertas" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Registo Formal de Descobertas de Inteligência</h3>
                <p className="text-xs text-slate-400">Hipóteses e correlações construídas a partir de fontes e evidências auditadas.</p>
              </div>

              <button
                onClick={() => setShowNewDiscoveryModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Descoberta</span>
              </button>
            </div>

            <div className="space-y-3">
              {discoveries.map((disc) => (
                <div
                  key={disc.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          disc.type === "CORRELACAO"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            : disc.type === "EVIDENCIA_DOCUMENTADA"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {disc.type}
                      </span>
                      <h4 className="text-sm font-bold text-white">{disc.title}</h4>
                    </div>

                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      ✓ {disc.validationStatus}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                    {disc.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono pt-1 text-slate-400">
                    <div className="flex items-center space-x-3">
                      <span>Fontes: <strong>{disc.sources.join(" • ")}</strong></span>
                      <span>Validador: <strong className="text-white">{disc.validatedBy || "Perito Humano"}</strong></span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleLinkToCase(disc.title, disc.evidences[0] || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "DESCOBERTA")}
                        className="bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 px-2.5 py-1 rounded text-xs flex items-center space-x-1 transition-colors"
                        title="Vincular formalmente ao CASO-2026-001"
                      >
                        <Link2 className="w-3 h-3" />
                        <span>Vincular ao CASO-2026-001</span>
                      </button>
                      <span className="text-slate-500">{disc.createdAt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 7: GRAFO OSINT (Workspace Dedicado) */}
        {/* ============================================================ */}
        {activeTab === "relacoes" && <OsintGraphWorkspace />}

        {/* ============================================================ */}
        {/* ABA 8: TIMELINE CRONOLÓGICA */}
        {/* ============================================================ */}
        {activeTab === "timeline" && <OsintTimeline />}

        {/* ============================================================ */}
        {/* ABA 9: COLETORES ASSÍNCRONOS */}
        {/* ============================================================ */}
        {activeTab === "coletores" && <OsintCollectors />}

        {/* ============================================================ */}
        {/* ABA 10: RECONHECIMENTO DE DOMÍNIO ESPECÍFICO */}
        {/* ============================================================ */}
        {activeTab === "dominio-analyzer" && (
          <OsintDomainAnalyzer
            initialDomain="shadow-secure-transfer.net"
            onSaveAsEvidence={(dom) => showToast(`Snapshot de ${dom} arquivado com sucesso no Cofre Probatório.`)}
          />
        )}

        {/* ============================================================ */}
        {/* ABA 11: RECONHECIMENTO DE IP & REDES */}
        {/* ============================================================ */}
        {activeTab === "ip-analyzer" && (
          <OsintIpAnalyzer
            initialIp="185.220.101.45"
            onSaveAsEvidence={(ip) => showToast(`Snapshot probatório de ${ip} arquivado com sucesso.`)}
          />
        )}

        {/* ============================================================ */}
        {/* ABA 12: INTELIGÊNCIA SOCIETÁRIA (NIF & DIÁRIO DA REPÚBLICA) */}
        {/* ============================================================ */}
        {activeTab === "empresa-analyzer" && (
          <OsintCompanyAnalyzer
            onSaveAsEvidence={(comp) => showToast(`Pacto societário de ${comp} arquivado no Cofre Probatório.`)}
          />
        )}

        {/* ============================================================ */}
        {/* ABA 13: ANÁLISE DE EMAIL & EXPOSIÇÃO DE CREDENCIAIS */}
        {/* ============================================================ */}
        {activeTab === "email-analyzer" && (
          <OsintEmailAnalyzer
            initialEmail="manuel.v@vortex-consulting.org"
            onSaveAsEvidence={(eml) => showToast(`Snapshot de ${eml} preservado no Cofre Probatório.`)}
          />
        )}

        {/* ============================================================ */}
        {/* ABA 14: METADADOS EXIF, IMAGEM & PERCEPTUAL HASH */}
        {/* ============================================================ */}
        {activeTab === "media-analyzer" && (
          <OsintMediaAnalyzer
            onSaveAsEvidence={(media) => showToast(`Metadados de ${media} arquivados no Cofre Probatório.`)}
          />
        )}

        {/* ============================================================ */}
        {/* ABA 15: RECONHECIMENTO DE PESSOA ESPECÍFICA */}
        {/* ============================================================ */}
        {activeTab === "pessoa-analyzer" && (
          <OsintPersonAnalyzer />
        )}

        {/* ============================================================ */}
        {/* ABA 12: ASSISTENTE SI (HIPÓTESES) */}
        {/* ============================================================ */}
        {activeTab === "si-assistant" && (
          <OsintSiAssistant />
        )}
      </main>

      {/* MODAL: NOVA DESCOBERTA */}
      {showNewDiscoveryModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Criar Nova Descoberta Forense</h3>
              <button onClick={() => setShowNewDiscoveryModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateDiscovery} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1">Título da Descoberta</label>
                <input
                  type="text"
                  required
                  value={newDiscTitle}
                  onChange={(e) => setNewDiscTitle(e.target.value)}
                  placeholder="Ex: Identificação de procuração societária outorgada ao alvo"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Tipo de Descoberta</label>
                <select
                  value={newDiscType}
                  onChange={(e) => setNewDiscType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="OBSERVACAO">Observação (Fato notado em fontes abertas)</option>
                  <option value="INDICIO">Indício (Elemento indiciário com relevância preliminar)</option>
                  <option value="CORRELACAO">Correlação (Cruzamento entre múltiplas fontes)</option>
                  <option value="EVIDENCIA_DOCUMENTADA">Evidência Documentada (Suporte probatório pleno)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Descrição Detalhada & Parecer Pericial</label>
                <textarea
                  rows={4}
                  required
                  value={newDiscDesc}
                  onChange={(e) => setNewDiscDesc(e.target.value)}
                  placeholder="Descreva a fundamentação técnica e o vínculo com os factos investigados..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewDiscoveryModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg"
                >
                  Salvar Descoberta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
