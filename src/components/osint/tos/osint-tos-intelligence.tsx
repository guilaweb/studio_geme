"use client";

import React, { useState } from "react";
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Scale,
  ExternalLink,
  Sliders,
  FileCheck,
  RefreshCw,
  Info,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  INITIAL_ROBOTS_ANALYSIS,
  INITIAL_TOS_POLICY,
  evaluateComplianceGate,
} from "@/lib/osint-advanced-engine";
import {
  RobotsTxtAnalysis,
  TosPolicyMatrix,
  ComplianceCheckResult,
} from "@/lib/osint-advanced-types";

export function OsintTosIntelligence() {
  const [subTab, setSubTab] = useState<"analysis" | "tos" | "robots" | "compliance">("tos");

  const [inputUrl, setInputUrl] = useState("https://vortex-consulting.org/terms");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Estados com dados do motor
  const [tosData, setTosData] = useState<TosPolicyMatrix>(INITIAL_TOS_POLICY);
  const [robotsData, setRobotsData] = useState<RobotsTxtAnalysis>(INITIAL_ROBOTS_ANALYSIS);

  // Parâmetros do Compliance Gate
  const [complianceUrl, setComplianceUrl] = useState("https://vortex-consulting.org");
  const [respectRobots, setRespectRobots] = useState(true);
  const [verifyTos, setVerifyTos] = useState(true);
  const [rateLimitSafe, setRateLimitSafe] = useState(true);

  const [complianceResult, setComplianceResult] = useState<ComplianceCheckResult>(() =>
    evaluateComplianceGate("https://vortex-consulting.org", true, true, true)
  );

  const handleAnalyzeUrl = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setSubTab("tos");
    }, 800);
  };

  const handleEvaluateCompliance = () => {
    const res = evaluateComplianceGate(complianceUrl, respectRobots, verifyTos, rateLimitSafe);
    setComplianceResult(res);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PERMITIDO":
      case "PASSED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/80">
            <CheckCircle2 className="w-3 h-3" />
            Permitido / Conforme
          </span>
        );
      case "RESTRITO":
      case "CONDICIONADO":
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/70 text-amber-400 border border-amber-800/80">
            <AlertTriangle className="w-3 h-3" />
            Restrito / Condicionado
          </span>
        );
      case "PROIBIDO":
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950/70 text-rose-400 border border-rose-800/80">
            <XCircle className="w-3 h-3" />
            Proibido / Violação
          </span>
        );
      case "PROTEGIDO_RGPD":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950/70 text-blue-400 border border-blue-800/80">
            <Scale className="w-3 h-3" />
            Protegido (RGPD / LPDP)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-800 text-neutral-400">
            <HelpCircle className="w-3 h-3" />
            Não Especificado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Principal com Aviso Legal Epistémico: Robots.txt != Autorização Jurídica */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Scale className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white">
                ToS Intelligence & Matriz de Conformidade Jurídica
              </h2>
            </div>
            <p className="text-xs text-neutral-400">
              Análise forense e estruturada de Termos de Serviço, Robots.txt, políticas de uso e salvaguarda probatória.
            </p>
          </div>

          {/* Triangulação de Risco */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
              <span className="text-neutral-500 block text-[10px] uppercase font-mono">
                Nível de Risco da Coleta
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                BAIXO (Uso Passivo Probatório)
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
              <span className="text-neutral-500 block text-[10px] uppercase font-mono">
                Abordagem Recomendada
              </span>
              <span className="text-neutral-200 font-semibold">
                Coleta Passiva Autorizada + Hash
              </span>
            </div>
          </div>
        </div>

        {/* Alerta de Diferenciação Jurídica */}
        <div className="mt-4 p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200 text-xs flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="text-amber-300">
              REGRA DE GOVERNANÇA: Robots.txt ≠ Autorização Jurídica
            </strong>
            <p className="text-neutral-300 leading-relaxed text-[11px]">
              O facto de um ficheiro <code>robots.txt</code> não bloquear um determinado caminho não constitui, por si só, autorização contratual para recolha ou redistribuição. O PROFUNDIDADE triangula: <strong>Robots.txt + ToS + Legislação Processual e Proteção de Dados (Art. 212º CPP / Lei 22/11 de Angola)</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Navegação entre Sub-abas */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          onClick={() => setSubTab("tos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subTab === "tos"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Termos de Serviço (Matriz)
        </button>

        <button
          onClick={() => setSubTab("robots")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subTab === "robots"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Robots.txt Parser
        </button>

        <button
          onClick={() => setSubTab("compliance")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subTab === "compliance"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Compliance Gate Central
          <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
            ALLOW
          </span>
        </button>

        <button
          onClick={() => setSubTab("analysis")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subTab === "analysis"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          Analisar Nova URL
        </button>
      </div>

      {/* ABA: ANALISAR NOVA URL */}
      {subTab === "analysis" && (
        <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800 max-w-3xl space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            Extração Automatizada de Termos de Serviço
          </h3>
          <p className="text-xs text-neutral-400">
            Insira o link direto para a página de Termos e Condições, Política de Privacidade ou o domínio principal para descoberta passiva.
          </p>

          <div className="space-y-3 pt-2">
            <label className="block text-xs font-medium text-neutral-400">
              URL dos Termos / Domínio
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://example.com/terms"
                className="flex-1 px-4 py-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={handleAnalyzeUrl}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-emerald-950/40"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analisar ToS
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA: TERMOS DE SERVIÇO (MATRIZ DE DIREITOS) */}
      {subTab === "tos" && (
        <div className="space-y-6">
          {/* Cartão de Resumo do ToS */}
          <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase">
                  Alvo Analisado
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {tosData.domain}
                  <a
                    href={tosData.tosUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-400 hover:text-emerald-400"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </h3>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-neutral-500 block text-[10px]">Jurisdição</span>
                  <span className="text-neutral-300 font-semibold">{tosData.jurisdiction}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Última Análise</span>
                  <span className="text-neutral-300 font-mono">{tosData.lastAnalyzed}</span>
                </div>
              </div>
            </div>

            {/* Matriz de Permissões / Direitos */}
            <div>
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                Matriz de Conformidade de Uso
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-500 font-semibold block uppercase">
                    Scraping
                  </span>
                  <div>{getStatusBadge(tosData.matrix.scraping)}</div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-500 font-semibold block uppercase">
                    Automação
                  </span>
                  <div>{getStatusBadge(tosData.matrix.automation)}</div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-500 font-semibold block uppercase">
                    API Oficial
                  </span>
                  <div>{getStatusBadge(tosData.matrix.api)}</div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-500 font-semibold block uppercase">
                    Dados Pessoais
                  </span>
                  <div>{getStatusBadge(tosData.matrix.personalData)}</div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-500 font-semibold block uppercase">
                    Uso Comercial
                  </span>
                  <div>{getStatusBadge(tosData.matrix.commercialUse)}</div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-500 font-semibold block uppercase">
                    Redistribuição
                  </span>
                  <div>{getStatusBadge(tosData.matrix.redistribution)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Cláusulas Estruturadas & Anotação Técnica vs Texto Literal */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Cláusulas Extraídas & Exegese Técnica
              </h4>
              <span className="text-[11px] text-neutral-500">
                Distinção entre texto do termo e parecer técnico
              </span>
            </div>

            <div className="space-y-3">
              {tosData.clauses.map((clause, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      {clause.area}
                    </span>
                    {getStatusBadge(clause.status)}
                  </div>

                  {/* Texto Literal Encontrado */}
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">
                      Texto Literal dos Termos:
                    </span>
                    <p className="text-xs text-neutral-300 italic leading-relaxed">
                      &quot;{clause.textSnippet}&quot;
                    </p>
                  </div>

                  {/* Anotação Técnica / Interpretação do Sistema */}
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/30">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase block mb-1">
                      Anotação Técnica & Salvaguarda Probatória (PROFUNDIDADE):
                    </span>
                    <p className="text-xs text-neutral-200 leading-relaxed">
                      {clause.analysisNote}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA: ROBOTS.TXT PARSER */}
      {subTab === "robots" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase">
                  Ficheiro Analisado
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {robotsData.url}
                  <a
                    href={robotsData.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-400 hover:text-emerald-400"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </h3>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-neutral-500 block text-[10px]">Crawl-Delay</span>
                  <span className="text-emerald-400 font-mono font-semibold">
                    {robotsData.crawlDelay} segundos
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Estado do Acesso</span>
                  <span className="text-emerald-400 font-semibold">Autorizado para /</span>
                </div>
              </div>
            </div>

            {/* Visualizador de Caminhos Permitidos vs Proibidos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Caminhos Permitidos (Allow)
                </span>
                <ul className="space-y-1">
                  {robotsData.allowedPaths.map((p, i) => (
                    <li
                      key={i}
                      className="text-xs font-mono text-neutral-300 bg-neutral-900/60 px-2 py-1 rounded"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  Caminhos Proibidos aos Crawlers (Disallow)
                </span>
                <ul className="space-y-1">
                  {robotsData.disallowedPaths.map((p, i) => (
                    <li
                      key={i}
                      className="text-xs font-mono text-neutral-400 bg-neutral-900/60 px-2 py-1 rounded line-through"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Raw Text */}
            <div className="pt-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                Conteúdo Bruto (robots.txt)
              </span>
              <pre className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300 overflow-x-auto">
                {robotsData.rawText}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ABA: COMPLIANCE GATE CENTRAL */}
      {subTab === "compliance" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase">
                  OSINT Collection Policy
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Compliance Gate de Autorização Técnica
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${
                    complianceResult.decision === "ALLOW"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : complianceResult.decision === "BLOCK"
                      ? "bg-rose-950 text-rose-400 border border-rose-800"
                      : "bg-amber-950 text-amber-400 border border-amber-800"
                  }`}
                >
                  PARECER: {complianceResult.decision}
                </span>
              </div>
            </div>

            {/* Sumário do Parecer */}
            <div
              className={`p-4 rounded-xl text-xs leading-relaxed ${
                complianceResult.decision === "ALLOW"
                  ? "bg-emerald-950/30 border border-emerald-800/40 text-emerald-300"
                  : complianceResult.decision === "BLOCK"
                  ? "bg-rose-950/30 border border-rose-800/40 text-rose-300"
                  : "bg-amber-950/30 border border-amber-800/40 text-amber-300"
              }`}
            >
              <strong>{complianceResult.decisionSummary}</strong>
            </div>

            {/* Lista dos 6 Controles de Governança */}
            <div className="space-y-2.5 pt-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                Verificação de Salvaguardas Forenses & Legais
              </span>

              {complianceResult.checks.map((chk) => (
                <div
                  key={chk.id}
                  className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-white block">
                      {chk.label}
                    </span>
                    <p className="text-[11px] text-neutral-400">{chk.detail}</p>
                  </div>

                  <div>{getStatusBadge(chk.status)}</div>
                </div>
              ))}
            </div>

            {/* Controles de Simulação Interativa */}
            <div className="pt-4 border-t border-neutral-800">
              <h4 className="text-xs font-semibold text-neutral-400 mb-3">
                Simulação de Parâmetros de Coleta:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <input
                    type="checkbox"
                    checked={respectRobots}
                    onChange={(e) => setRespectRobots(e.target.checked)}
                    className="rounded bg-neutral-900 border-neutral-700 text-emerald-500 focus:ring-0"
                  />
                  Respeitar robots.txt
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <input
                    type="checkbox"
                    checked={verifyTos}
                    onChange={(e) => setVerifyTos(e.target.checked)}
                    className="rounded bg-neutral-900 border-neutral-700 text-emerald-500 focus:ring-0"
                  />
                  Verificar ToS Antes
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <input
                    type="checkbox"
                    checked={rateLimitSafe}
                    onChange={(e) => setRateLimitSafe(e.target.checked)}
                    className="rounded bg-neutral-900 border-neutral-700 text-emerald-500 focus:ring-0"
                  />
                  Limitar Taxa (&gt;= 1.2s)
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end">
                <button
                  onClick={handleEvaluateCompliance}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reavaliar Gate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
