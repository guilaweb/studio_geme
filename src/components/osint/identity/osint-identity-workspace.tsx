"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Users,
  Phone,
  Share2,
  Globe,
  Building2,
  Mail,
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
  Scale,
  Eye,
  FileText,
  Briefcase,
  HelpCircle,
  UserCheck,
  Link2,
  Sliders,
  Filter,
} from "lucide-react";
import {
  detectIdentityInputType,
  INITIAL_PHONE_RECORDS,
  INITIAL_SOCIAL_PROFILES,
  INITIAL_IDENTITY_GRAPH_NODES,
  INITIAL_IDENTITY_GRAPH_EDGES,
  INITIAL_ENTITY_CANDIDATES,
  INITIAL_IDENTITY_SOURCES,
  INITIAL_IDENTITY_SEARCH_HISTORY,
} from "@/lib/identity-resolution-engine";
import {
  IdentityDetectedType,
  IdentityLinkState,
  PhoneIdentityRecord,
  SocialProfileRecord,
  IdentityGraphNode,
  IdentityGraphEdge,
  EntityResolutionCandidate,
  IdentitySourceRecord,
  IdentitySearchHistoryRecord,
} from "@/lib/identity-resolution-types";

export function OsintIdentityWorkspace() {
  // Sub-abas do módulo de Identidade
  const [activeSubTab, setActiveSubTab] = useState<
    | "pesquisa"
    | "telefones"
    | "redes-sociais"
    | "correspondencias"
    | "grafo"
    | "fontes"
    | "historico"
  >("pesquisa");

  // Barra de Pesquisa Universal
  const [searchQuery, setSearchQuery] = useState("+244 923 000 111");
  const [detectedType, setDetectedType] = useState<IdentityDetectedType>("TELEFONE");
  const [isSearching, setIsSearching] = useState(false);

  // Estados dos Dados Analíticos
  const [phoneRecords, setPhoneRecords] = useState<PhoneIdentityRecord[]>(INITIAL_PHONE_RECORDS);
  const [selectedPhone, setSelectedPhone] = useState<PhoneIdentityRecord>(INITIAL_PHONE_RECORDS[0]);
  const [socialProfiles, setSocialProfiles] = useState<SocialProfileRecord[]>(INITIAL_SOCIAL_PROFILES);
  const [selectedProfile, setSelectedProfile] = useState<SocialProfileRecord>(INITIAL_SOCIAL_PROFILES[0]);
  const [graphNodes] = useState<IdentityGraphNode[]>(INITIAL_IDENTITY_GRAPH_NODES);
  const [graphEdges, setGraphEdges] = useState<IdentityGraphEdge[]>(INITIAL_IDENTITY_GRAPH_EDGES);
  const [selectedEdge, setSelectedEdge] = useState<IdentityGraphEdge | null>(INITIAL_IDENTITY_GRAPH_EDGES[0]);
  const [candidates, setCandidates] = useState<EntityResolutionCandidate[]>(INITIAL_ENTITY_CANDIDATES);
  const [sources, setSources] = useState<IdentitySourceRecord[]>(INITIAL_IDENTITY_SOURCES);
  const [history, setHistory] = useState<IdentitySearchHistoryRecord[]>(INITIAL_IDENTITY_SEARCH_HISTORY);

  // Notificação Toast
  const [notification, setNotification] = useState<string | null>(null);

  // Modal de Evidências
  const [evidenceModalData, setEvidenceModalData] = useState<{
    title: string;
    hash: string;
    source: string;
    details: string;
  } | null>(null);

  // Atualiza deteção automática ao digitar
  useEffect(() => {
    const det = detectIdentityInputType(searchQuery);
    setDetectedType(det);
  }, [searchQuery]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const getDetectedTypeLabel = (type: IdentityDetectedType) => {
    switch (type) {
      case "TELEFONE":
        return { label: "Número de Telefone", icon: Phone, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
      case "PERFIL_SOCIAL":
        return { label: "Perfil Social / Handle", icon: Share2, color: "text-sky-400 bg-sky-500/10 border-sky-500/30" };
      case "EMAIL_PUBLICO":
        return { label: "Email Público", icon: Mail, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
      case "DOMINIO":
        return { label: "Domínio / Website", icon: Globe, color: "text-purple-400 bg-purple-500/10 border-purple-500/30" };
      case "EMPRESA":
        return { label: "Entidade Coletiva / Empresa", icon: Building2, color: "text-blue-400 bg-blue-500/10 border-blue-500/30" };
      case "PESSOA_NOME":
        return { label: "Nome de Pessoa", icon: Users, color: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
      default:
        return { label: "Identificador Geral", icon: Fingerprint, color: "text-neutral-400 bg-neutral-800 border-neutral-700" };
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      // Direciona para a aba correspondente ao tipo detetado
      if (detectedType === "TELEFONE") {
        setActiveSubTab("telefones");
      } else if (detectedType === "PERFIL_SOCIAL") {
        setActiveSubTab("redes-sociais");
      } else {
        setActiveSubTab("correspondencias");
      }

      // Adiciona ao histórico
      const newHist: IdentitySearchHistoryRecord = {
        id: `hist-${Date.now().toString().slice(-4)}`,
        query: searchQuery,
        detectedType,
        executedAt: new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        resultsCount: 3,
        matchedEntitySummary: "Correlação efetuada em fontes abertas.",
      };
      setHistory([newHist, ...history]);
      showToast(`Pesquisa de identidade para "${searchQuery}" processada com sucesso.`);
    }, 500);
  };

  const handleEdgeStateChange = (edgeId: string, newState: IdentityLinkState) => {
    setGraphEdges((prev) =>
      prev.map((e) =>
        e.id === edgeId
          ? { ...e, state: newState, validatorName: "Perito Responsável (Auditado)" }
          : e
      )
    );
    if (selectedEdge && selectedEdge.id === edgeId) {
      setSelectedEdge({
        ...selectedEdge,
        state: newState,
        validatorName: "Perito Responsável (Auditado)",
      });
    }
    showToast(`Ligação ${edgeId} reclassificada para "${newState}".`);
  };

  const getLinkStateBadge = (state: IdentityLinkState) => {
    switch (state) {
      case "VALIDADO":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            VALIDADO
          </span>
        );
      case "CORROBORADO":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 text-blue-400 border border-blue-800">
            <Sparkles className="w-3 h-3" />
            CORROBORADO
          </span>
        );
      case "POSSIVEL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800">
            <AlertTriangle className="w-3 h-3" />
            POSSÍVEL
          </span>
        );
      case "REJEITADO":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-400 border border-rose-800">
            <XCircle className="w-3 h-3" />
            REJEITADO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
            <HelpCircle className="w-3 h-3" />
            NÃO VERIFICADO
          </span>
        );
    }
  };

  const typeConfig = getDetectedTypeLabel(detectedType);
  const TypeIcon = typeConfig.icon;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-neutral-900 border border-emerald-500/40 text-emerald-300 text-xs shadow-2xl flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Institucional com Salvaguarda Ética */}
      <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Identidade Digital & Resolução de Entidades
              </h2>
            </div>
            <p className="text-xs text-neutral-400">
              Correlação probatória de identificadores públicos e desambiguação analítica. Distinção estrita entre <em>hipótese</em> e <em>confirmação jurídica</em>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-neutral-500 block text-[9px] uppercase font-mono">
                  Princípio Metodológico
                </span>
                <span className="text-neutral-200 font-semibold">
                  Sem Asserção Automática de Titularidade
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer Metodológico / Fronteira Legal */}
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200 text-xs flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-[11px]">
            <strong className="text-amber-300">
              SALVAGUARDA DE CUSTÓDIA: O PROFUNDIDADE não é um &quot;localizador de titulares privados&quot;
            </strong>
            <p className="text-neutral-300 leading-relaxed">
              O sistema não consulta bases de dados clandestinas, listas vazadas ou técnicas de intrusão que violariam a cadeia de custódia e o Art. 212º do CPP. O módulo responde tecnicamente: <em>&quot;Qual entidade pode ser associada a este identificador com base nas evidências públicas ou autorizadas disponíveis?&quot;</em>
            </p>
          </div>
        </div>
      </div>

      {/* Subnavegação do Módulo de Identidade */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("pesquisa")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === "pesquisa"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          Pesquisar Identidade
        </button>

        <button
          onClick={() => setActiveSubTab("telefones")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === "telefones"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          Números de Telefone ({phoneRecords.length})
        </button>

        <button
          onClick={() => setActiveSubTab("redes-sociais")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === "redes-sociais"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          Perfis Sociais ({socialProfiles.length})
        </button>

        <button
          onClick={() => setActiveSubTab("correspondencias")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === "correspondencias"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Correspondências ({candidates.length})
        </button>

        <button
          onClick={() => setActiveSubTab("grafo")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === "grafo"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          Grafo de Identidade ({graphEdges.length} ligações)
        </button>

        <button
          onClick={() => setActiveSubTab("fontes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === "fontes"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Fontes ({sources.length})
        </button>

        <button
          onClick={() => setActiveSubTab("historico")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === "historico"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Histórico ({history.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. ABA DE PESQUISA UNIVERSAL */}
      {/* ======================================================== */}
      {activeSubTab === "pesquisa" && (
        <div className="space-y-6 max-w-4xl mx-auto py-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-white">
              Quem ou qual entidade está associada a...
            </h3>
            <p className="text-xs text-neutral-400">
              Insira qualquer identificador para análise passiva de fontes abertas e correlação probatória.
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Insira telefone (+244...), @utilizador, email, domínio, empresa ou nome..."
                className="w-full px-5 py-4 pl-12 pr-32 text-sm bg-neutral-900/90 border border-neutral-700/80 rounded-2xl text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 shadow-2xl transition-all"
              />
              <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />

              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-emerald-950/40"
              >
                {isSearching ? "A correlacionar..." : "Pesquisar"}
              </button>
            </div>

            {/* Deteção Dinâmica de Tipo */}
            <div className="flex items-center justify-between px-2 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Tipo detectado:</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${typeConfig.color}`}>
                  <TypeIcon className="w-3.5 h-3.5" />
                  {typeConfig.label}
                </span>
              </div>
              <span className="text-[11px] text-neutral-500">
                Resolução em fontes públicas & autorizadas
              </span>
            </div>
          </form>

          {/* Chips de Exemplos Rápidos */}
          <div className="pt-4 border-t border-neutral-800">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2.5">
              Exemplos de Identificadores Suportados:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSearchQuery("+244 923 000 111");
                  setActiveSubTab("telefones");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 font-mono transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                +244 923 000 111 (Telefone AO)
              </button>

              <button
                onClick={() => {
                  setSearchQuery("@manuel_v_fiduciario");
                  setActiveSubTab("redes-sociais");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 font-mono transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                @manuel_v_fiduciario (Rede Social)
              </button>

              <button
                onClick={() => {
                  setSearchQuery("manuel.v@vortex-consulting.org");
                  handleSearch();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 font-mono transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                manuel.v@vortex-consulting.org
              </button>

              <button
                onClick={() => {
                  setSearchQuery("vortex-consulting.org");
                  handleSearch();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 font-mono transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                vortex-consulting.org
              </button>

              <button
                onClick={() => {
                  setSearchQuery("Vortex Consulting Lda");
                  handleSearch();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                Vortex Consulting Lda (Empresa)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ABA DE NÚMEROS DE TELEFONE (3 NÍVEIS SEPARADOS) */}
      {/* ======================================================== */}
      {activeSubTab === "telefones" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Números Analisados */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                Números no Inquérito
              </span>
              {phoneRecords.map((rec) => (
                <button
                  key={rec.phoneNumber}
                  onClick={() => setSelectedPhone(rec)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedPhone.phoneNumber === rec.phoneNumber
                      ? "bg-neutral-900 border-emerald-500/50 shadow-lg shadow-emerald-950/20"
                      : "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white font-mono flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      {rec.phoneNumber}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded">
                      {rec.country}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    {rec.carrierPrefix} • {rec.lineType}
                  </p>
                  <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {rec.publicSourcesCount} fontes públicas encontradas
                  </div>
                </button>
              ))}
            </div>

            {/* Dossiê Forense do Número (3 Níveis Rigorosos) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header do Número Selecionado */}
              <div className="p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">
                    Terminal Telefónico Observado
                  </span>
                  <h3 className="text-xl font-bold text-white font-mono flex items-center gap-2">
                    {selectedPhone.phoneNumber}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    País: <strong className="text-neutral-200">{selectedPhone.countryCode}</strong> • Operador: <strong className="text-neutral-200">{selectedPhone.carrierPrefix}</strong>
                  </p>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-right">
                  <span className="text-neutral-500 block text-[10px] uppercase font-mono">
                    Fontes Públicas
                  </span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {selectedPhone.publicSourcesCount} Ocorrências
                  </span>
                </div>
              </div>

              {/* 1º NÍVEL: ONDE O NÚMERO APARECE PUBLICAMENTE */}
              <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    1. Número Observado (Fontes Públicas Preservadas)
                  </h4>
                  <span className="text-[10px] font-mono text-neutral-500">
                    Ocorrências em fontes abertas
                  </span>
                </div>

                <div className="space-y-2.5">
                  {selectedPhone.observedInstances.map((inst, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          {inst.sourceTitle}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {inst.dateObserved}
                        </span>
                      </div>

                      <a
                        href={inst.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-emerald-400 font-mono hover:underline flex items-center gap-1"
                      >
                        {inst.url}
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <p className="text-xs text-neutral-300 italic">
                        &quot;{inst.snippet}&quot;
                      </p>

                      <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                        <span>SHA-256: {inst.contentHash.slice(0, 20)}...</span>
                        <button
                          onClick={() => {
                            setEvidenceModalData({
                              title: inst.sourceTitle,
                              hash: inst.contentHash,
                              source: inst.url,
                              details: inst.snippet,
                            });
                          }}
                          className="text-emerald-400 hover:underline"
                        >
                          [Ver Evidência]
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2º NÍVEL: ENTIDADE ASSOCIADA (CORRELAÇÕES) */}
              <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    2. Entidades Associadas (Correspondências Analíticas)
                  </h4>
                  <span className="text-[10px] font-mono text-neutral-500">
                    Pessoas e empresas correlacionadas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedPhone.associatedEntities.map((ent) => (
                    <div
                      key={ent.id}
                      className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            {ent.entityName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              ent.confidence >= 80
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : "bg-amber-950 text-amber-400 border border-amber-800"
                            }`}
                          >
                            {ent.statusText} • {ent.confidence}%
                          </span>
                        </div>

                        <span className="text-[11px] text-neutral-400 block">
                          Vínculo: <strong className="text-neutral-300">{ent.relationship}</strong>
                        </span>

                        <span className="text-[10px] text-neutral-500 block">
                          Fonte primária: {ent.sourceName}
                        </span>

                        <ul className="text-[11px] text-neutral-400 space-y-1 pt-1.5 border-t border-neutral-900">
                          {ent.indicators.map((ind, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-emerald-400 font-bold">✓</span>
                              <span>{ind}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3º NÍVEL: TITULAR CONFIRMADO (REGRA DE CUSTÓDIA) */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <Scale className="w-4 h-4 text-purple-400" />
                    3. Titular Confirmado
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-400">
                    NÃO CONFIRMADO (Sem Asserção Arbitrária)
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-neutral-300 text-xs leading-relaxed">
                  <p>{selectedPhone.confirmedHolder.disclaimer}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ABA DE PERFIS DE REDES SOCIAIS */}
      {/* ======================================================== */}
      {activeSubTab === "redes-sociais" && (
        <div className="space-y-6">
          {selectedProfile && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cartão do Perfil Social */}
              <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {selectedProfile.publicName[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {selectedProfile.publicName}
                    </h3>
                    <span className="text-xs text-sky-400 font-mono">
                      {selectedProfile.handle}
                    </span>
                    <span className="text-[10px] text-neutral-500 block">
                      {selectedProfile.platform}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 italic leading-relaxed">
                  &quot;{selectedProfile.bio}&quot;
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block font-mono">Website Declarado:</span>
                    <a
                      href={selectedProfile.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 font-mono hover:underline flex items-center gap-1"
                    >
                      {selectedProfile.website}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block font-mono">Data de Observação:</span>
                    <span className="text-neutral-300 font-mono">{selectedProfile.observedAt}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block font-mono">Identificadores Públicos:</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedProfile.publicIdentifiers.map((id, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-300">
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Perfis Relacionados */}
                <div className="pt-2 border-t border-neutral-800 space-y-2">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Perfis Cruzados em Outras Plataformas
                  </span>
                  {selectedProfile.relatedProfiles.map((rel, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-white block">{rel.handle}</span>
                        <span className="text-[10px] text-neutral-500">{rel.platform} • {rel.relationType}</span>
                      </div>
                      <a href={rel.url} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-sky-400">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolução de Identidade: Possíveis Correspondências */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        Resolução de Identidade (Entity Resolution)
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Cruzamento algorítmico de sinais públicos entre o perfil social e os alvos do inquérito.
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Confiança: 86%
                    </span>
                  </div>

                  {selectedProfile.possibleMatches.map((m, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h5 className="text-sm font-bold text-white">
                          Candidato: {m.targetName}
                        </h5>
                        <span className="text-xs text-emerald-400 font-semibold">
                          {m.indicators.length} Indicadores Concordantes
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {m.indicators.map((ind, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-neutral-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{ind}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-neutral-900 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span className="text-neutral-500 font-mono text-[11px]">
                          {m.evidenceCount} artefactos comprobatórios preservados
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              showToast(`3 evidências de correlação para "${m.targetName}" abertas.`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors"
                          >
                            Ver Evidências
                          </button>

                          <button
                            onClick={() => {
                              showToast(`Vínculo de "${m.targetName}" associado à Operação Sombra Digital (CASO-2026-001).`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                          >
                            Associar ao Caso
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ABA DE CORRESPONDÊNCIAS (ENTITY RESOLUTION CANDIDATES) */}
      {/* ======================================================== */}
      {activeSubTab === "correspondencias" && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Candidatos de Resolução de Entidade (Entity Resolution Engine)
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Avaliação multifatorial de concordância entre identidades observadas sem fusão arbitrária.
              </p>
            </div>
            <span className="text-xs text-neutral-400">
              {candidates.length} hipóteses abertas
            </span>
          </div>

          <div className="space-y-4">
            {candidates.map((cand) => (
              <div
                key={cand.id}
                className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-4 hover:border-neutral-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300">
                        {cand.candidateType}
                      </span>
                      <h4 className="text-base font-bold text-white">
                        {cand.targetEntityName}
                      </h4>
                    </div>
                    <span className="text-xs text-neutral-400 mt-1 block">
                      Fontes: {cand.sources.join(" • ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      Confiança: {cand.confidencePercentage}%
                    </span>
                    {getLinkStateBadge(cand.state)}
                  </div>
                </div>

                {/* Lista de Indicadores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cand.indicators.map((ind, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs flex items-start gap-2.5"
                    >
                      {ind.matched ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <strong className="text-neutral-200 block">{ind.name}</strong>
                        <span className="text-neutral-400 text-[11px]">{ind.description}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Aviso Metodológico */}
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 italic">
                  {cand.hypothesisDisclaimer}
                </div>

                {/* Ações Forenses */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800/80">
                  <button
                    onClick={() => {
                      setCandidates((prev) =>
                        prev.map((c) => (c.id === cand.id ? { ...c, state: "VALIDADO" } : c))
                      );
                      showToast(`Hipótese ${cand.targetEntityName} validada formalmente pelo perito.`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors"
                  >
                    Validar Correspondência
                  </button>

                  <button
                    onClick={() => {
                      setCandidates((prev) =>
                        prev.map((c) => (c.id === cand.id ? { ...c, state: "REJEITADO" } : c))
                      );
                      showToast(`Hipótese ${cand.targetEntityName} rejeitada.`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors"
                  >
                    Rejeitar Vínculo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. ABA DO GRAFO DE IDENTIDADE (NÓS, LIGAÇÕES E ESTADOS) */}
      {/* ======================================================== */}
      {activeSubTab === "grafo" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visualizador de Ligações do Grafo */}
            <div className="lg:col-span-2 space-y-4 p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-emerald-400" />
                  Topologia de Vínculos da Identidade
                </h3>
                <span className="text-xs text-neutral-400 font-mono">
                  {graphNodes.length} Nós • {graphEdges.length} Ligações
                </span>
              </div>

              {/* Lista Interativa de Ligações com Metadados */}
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {graphEdges.map((edge) => {
                  const srcNode = graphNodes.find((n) => n.id === edge.sourceNodeId);
                  const tgtNode = graphNodes.find((n) => n.id === edge.targetNodeId);
                  const isSelected = selectedEdge?.id === edge.id;

                  return (
                    <div
                      key={edge.id}
                      onClick={() => setSelectedEdge(edge)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-neutral-900 border-emerald-500/60 shadow-md shadow-emerald-950/20"
                          : "bg-neutral-950/70 border-neutral-800/80 hover:border-neutral-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {srcNode?.label || edge.sourceNodeId}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                          <span className="text-xs font-bold text-emerald-400">
                            {tgtNode?.label || edge.targetNodeId}
                          </span>
                        </div>
                        {getLinkStateBadge(edge.state)}
                      </div>

                      <div className="text-xs text-neutral-300 mt-1.5 flex items-center justify-between">
                        <span>Relação: <strong className="text-neutral-200">{edge.relationshipType}</strong></span>
                        <span className="text-neutral-400 font-mono text-[11px]">{edge.confidence}% Confiança</span>
                      </div>

                      <div className="text-[10px] text-neutral-500 font-mono mt-1 flex items-center justify-between">
                        <span>Fonte: {edge.sourceTitle}</span>
                        <span>{edge.dateObserved}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Painel Lateral: Inspector de Ligação & Validador Forense */}
            <div className="space-y-4">
              {selectedEdge ? (
                <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Ficha da Ligação #{selectedEdge.id}
                    </h4>
                    {getLinkStateBadge(selectedEdge.state)}
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase font-mono block">Tipo de Vínculo:</span>
                      <strong className="text-white text-sm">{selectedEdge.relationshipType}</strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase font-mono block">Fonte Comprobatória:</span>
                      <span className="text-neutral-300">{selectedEdge.sourceTitle}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase font-mono block">Hash SHA-256 da Evidência:</span>
                      <code className="text-[10px] font-mono text-emerald-400 bg-neutral-950 p-1 rounded border border-neutral-800 block break-all">
                        {selectedEdge.evidenceHash}
                      </code>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase font-mono block">Data da Observação:</span>
                        <span className="text-neutral-300 font-mono">{selectedEdge.dateObserved}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase font-mono block">Confiança Analítica:</span>
                        <span className="text-emerald-400 font-mono font-bold">{selectedEdge.confidence}%</span>
                      </div>
                    </div>

                    {selectedEdge.validatorName && (
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase font-mono block">Validador Responsável:</span>
                        <span className="text-neutral-300 font-medium">{selectedEdge.validatorName}</span>
                      </div>
                    )}

                    {selectedEdge.notes && (
                      <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300">
                        {selectedEdge.notes}
                      </div>
                    )}
                  </div>

                  {/* Ações de Classificação do Estado */}
                  <div className="pt-3 border-t border-neutral-800 space-y-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Classificar Estado da Relação:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleEdgeStateChange(selectedEdge.id, "VALIDADO")}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors"
                      >
                        ✓ Validar
                      </button>
                      <button
                        onClick={() => handleEdgeStateChange(selectedEdge.id, "CORROBORADO")}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-colors"
                      >
                        Corroborar
                      </button>
                      <button
                        onClick={() => handleEdgeStateChange(selectedEdge.id, "POSSIVEL")}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-colors"
                      >
                        Possível
                      </button>
                      <button
                        onClick={() => handleEdgeStateChange(selectedEdge.id, "REJEITADO")}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors"
                      >
                        ✗ Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-900/30 border border-neutral-800 rounded-2xl">
                  Selecione uma ligação no grafo para inspecionar os metadados.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. ABA DE FONTES DA IDENTIDADE (CATÁLOGO RASTREÁVEL) */}
      {/* ======================================================== */}
      {activeSubTab === "fontes" && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Fontes da Identidade & Cadeia de Rastreabilidade
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Registo contínuo de proveniência com carimbo temporal e hash de integridade de custódia.
              </p>
            </div>
            <span className="text-xs text-neutral-400 font-mono">
              {sources.length} fontes ativas
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/30">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 text-neutral-400 font-mono uppercase text-[10px] border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Fonte / Origem</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Última Checagem</th>
                  <th className="py-3 px-4">SHA-256</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {sources.map((src) => (
                  <tr key={src.id} className="hover:bg-neutral-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{src.name}</div>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-emerald-400 font-mono hover:underline flex items-center gap-1"
                      >
                        {src.url.slice(0, 38)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300">
                        {src.sourceType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        {src.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-400">
                      {src.lastChecked}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-neutral-400">
                      {src.evidenceHash.slice(0, 16)}...
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEvidenceModalData({
                            title: src.name,
                            hash: src.evidenceHash,
                            source: src.url,
                            details: `Artefacto preservado em ${src.lastChecked} sob cadeia de custódia CASO-2026-001.`,
                          });
                        }}
                        className="text-xs text-neutral-300 hover:text-white font-semibold"
                      >
                        Ver Evidência
                      </button>
                      <button
                        onClick={() => {
                          showToast(`Fonte "${src.name}" vinculada ao dossiê de inquérito.`);
                        }}
                        className="text-xs text-emerald-400 hover:underline font-semibold"
                      >
                        Associar ao Caso
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. ABA DE HISTÓRICO DE AUDITORIA */}
      {/* ======================================================== */}
      {activeSubTab === "historico" && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800">
            <h3 className="text-sm font-semibold text-white">
              Histórico & Auditoria de Pesquisas de Identidade
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Registo imutável de todas as desambiguações e consultas efetuadas pela equipa.
            </p>
          </div>

          <div className="space-y-2.5">
            {history.map((hist) => (
              <div
                key={hist.id}
                className="p-4 rounded-xl bg-neutral-900/30 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-neutral-500">[{hist.executedAt}]</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300">
                      {hist.detectedType}
                    </span>
                  </div>
                  <code className="text-xs text-emerald-400 font-mono font-bold block">
                    {hist.query}
                  </code>
                  {hist.matchedEntitySummary && (
                    <span className="text-xs text-neutral-400 block">
                      {hist.matchedEntitySummary}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSearchQuery(hist.query);
                      handleSearch();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors"
                  >
                    Repetir Consulta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE EVIDÊNCIA */}
      {evidenceModalData && (
        <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Artefacto de Evidência Probatória
              </h3>
              <button
                onClick={() => setEvidenceModalData(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase font-mono block">Título do Artefacto:</span>
                <strong className="text-white text-sm">{evidenceModalData.title}</strong>
              </div>

              <div>
                <span className="text-[10px] text-neutral-500 uppercase font-mono block">Fonte:</span>
                <span className="text-emerald-400 font-mono break-all">{evidenceModalData.source}</span>
              </div>

              <div>
                <span className="text-[10px] text-neutral-500 uppercase font-mono block">Extrato Preservado:</span>
                <p className="text-neutral-300 italic p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  &quot;{evidenceModalData.details}&quot;
                </p>
              </div>

              <div>
                <span className="text-[10px] text-neutral-500 uppercase font-mono block">Assinatura SHA-256:</span>
                <code className="text-[10px] font-mono text-emerald-400 bg-neutral-950 p-2 rounded-lg border border-neutral-800 block break-all">
                  {evidenceModalData.hash}
                </code>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                onClick={() => setEvidenceModalData(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
