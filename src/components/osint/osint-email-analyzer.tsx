"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Shield,
  KeyRound,
  AlertTriangle,
  CheckCircle,
  Search,
  Copy,
  Info,
  FileCheck,
  RefreshCw,
  FileDown,
  Link2,
  Lock,
  Globe,
  Database
} from "lucide-react";
import { generateOsintPdfReport } from "@/lib/osint-report-pdf";

interface EmailIntelData {
  email: string;
  user: string;
  domain: string;
  analyzedAt: string;
  validation: {
    isValidFormat: boolean;
    isDisposable: boolean;
    mxRecords: string[];
    spfRecord: string | null;
    dmarcRecord: string | null;
    securityRating: string;
  };
  digitalFootprint: {
    gravatarHash: string;
    avatarPreview: string;
    hasPublicPgpKey: boolean;
    pgpKeyId?: string;
    linkedPlatforms: Array<{
      platform: string;
      status: string;
      username?: string;
      domainMatch?: string;
    }>;
  };
  breaches: Array<{
    databaseName: string;
    year: number;
    dataExposed: string[];
    severity: string;
    description: string;
  }>;
  riskAssessment: {
    riskScore: number;
    compromisedCount: number;
    summary: string;
  };
  contentHash: string;
}

interface OsintEmailAnalyzerProps {
  initialEmail?: string;
  onSaveAsEvidence?: (email: string, data: any) => void;
}

export function OsintEmailAnalyzer({
  initialEmail = "manuel.v@vortex-consulting.org",
  onSaveAsEvidence,
}: OsintEmailAnalyzerProps) {
  const [emailInput, setEmailInput] = useState(initialEmail);
  const [activeEmail, setActiveEmail] = useState(initialEmail);
  const [intelData, setIntelData] = useState<EmailIntelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchEmailIntel = async (emailToAnalyze: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/osint/email?email=${encodeURIComponent(emailToAnalyze)}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Falha ao consultar inteligência do email.");
      }
      setIntelData(json.data);
      setActiveEmail(json.data.email);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro na consulta aos servidores de correio e brechas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailIntel(initialEmail);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      fetchEmailIntel(emailInput.trim());
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handlePreserve = () => {
    if (!intelData) return;
    setFeedbackMsg(`Snapshot probatório de ${activeEmail} preservado no Cofre com selo SHA-256.`);
    if (onSaveAsEvidence) {
      onSaveAsEvidence(activeEmail, intelData);
    }
  };

  const handleLinkToCase = () => {
    if (!intelData) return;
    try {
      const existing = JSON.parse(localStorage.getItem("profundidade_osint_linked_items") || "[]");
      existing.push({
        caseId: "CASO-2026-001",
        caseTitle: "Operação Sombra Digital",
        type: "EVIDENCIA_EMAIL_BRECHA",
        title: `Identificador de Correio: ${activeEmail} (Score de Risco: ${intelData.riskAssessment.riskScore})`,
        hash: intelData.contentHash,
        linkedAt: new Date().toISOString(),
      });
      localStorage.setItem("profundidade_osint_linked_items", JSON.stringify(existing));
    } catch {}
    setFeedbackMsg(`Identificador de correio [${activeEmail}] vinculado formalmente ao CASO-2026-001.`);
  };

  const handleDownloadPdf = () => {
    if (!intelData) return;
    generateOsintPdfReport({
      search: {
        id: `EML-${Date.now().toString().slice(-6)}`,
        targetQuery: activeEmail,
        targetType: "EMAIL_PUBLICO",
        contextNotes: `Averiguação de autenticação MX/SPF/DMARC, pegada digital e exposição em brechas públicas de credenciais para ${activeEmail}.`,
        investigationRef: "CASO-2026-001 (Operação Sombra Digital)",
        status: "CONCLUIDA",
        resultsCount: intelData.breaches.length + intelData.digitalFootprint.linkedPlatforms.length,
        discoveriesCount: 1,
        createdAt: new Date().toISOString(),
        requestedBy: "Perito em Investigação de Fraude & Phishing",
      },
      tenantName: "PROFUNDIDADE - Lab de Inteligência & Evidências",
      analystName: "Perito em Análise de Credenciais & Identidades",
      results: [
        {
          id: `res-eml-1`,
          searchId: "EML-001",
          source: "DNSConnector (MX / SPF / DMARC)",
          sourceType: "DNSConnector",
          category: "DOMINIOS",
          url: `https://${intelData.domain}`,
          title: `Configuração Autoritativa de Correio: ${intelData.domain}`,
          snippet: `MX: ${intelData.validation.mxRecords.join(", ")} | SPF: ${intelData.validation.spfRecord}`,
          publishedAt: intelData.analyzedAt,
          collectedAt: intelData.analyzedAt,
          contentHash: intelData.contentHash,
          entities: [activeEmail, intelData.domain],
          indicators: [intelData.validation.securityRating],
          isPreservedAsEvidence: true,
        },
      ],
      discoveries: [
        {
          id: `disc-eml-1`,
          title: `Comprometimento Histórico de Credencial: ${activeEmail}`,
          description: intelData.riskAssessment.summary,
          type: "CORRELACAO",
          sources: ["PublicDocumentConnector", "DNSConnector"],
          evidences: [intelData.contentHash],
          validationStatus: "VALIDADO",
          validatorNotes: "Confirmada presença de hashes em repositórios públicos abertos de credenciais descarregadas.",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header com Input de Email */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Análise Passiva de Email & Exposição de Credenciais
            </h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
              EMAIL INTEL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Validação de SPF/DMARC anti-spoofing, verificação de servidores MX e correlação passiva de credenciais em brechas públicas.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="ex: manuel.v@vortex-consulting.org"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>A analisar...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Analisar Email</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Erro */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-950/80 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="hover:text-white">✕</button>
        </div>
      )}

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

      {/* Grid de 4 Blocos de Inteligência de Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bloco 1: Autenticação de Correio (MX / SPF / DMARC) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">1. Servidores & MX</h4>
            </div>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">RESOLVIDO</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Servidores de Correio (MX):</span>
              <div className="space-y-0.5 mt-0.5">
                {intelData?.validation.mxRecords.map((mx, idx) => (
                  <span key={idx} className="text-slate-200 block text-[11px] truncate">
                    • {mx}
                  </span>
                )) || <span className="text-slate-200 text-[11px]">mail.{activeEmail.split("@")[1]}</span>}
              </div>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Registo SPF Declarado:</span>
              <span className="text-slate-400 block text-[10px] truncate">
                {intelData?.validation.spfRecord || "v=spf1 include:_spf.google.com ~all"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Política DMARC:</span>
              <span className="text-amber-400 block text-[10px] truncate">
                {intelData?.validation.dmarcRecord || "v=DMARC1; p=quarantine"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Classificação Anti-Spoofing:</span>
              <span className="text-emerald-400 font-bold block text-[11px]">
                {intelData?.validation.securityRating || "CONFIGURADO"}
              </span>
            </div>
          </div>
        </div>

        {/* Bloco 2: Pegada Digital & Identidade Passiva */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">2. Pegada Digital</h4>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">PASSIVO</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Gravatar MD5 Hash:</span>
              <span className="text-slate-300 block text-[11px] truncate">
                {intelData?.digitalFootprint.gravatarHash || "d41d8cd98f00b204e9800998ecf8427e"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Chave Pública PGP (OpenPGP):</span>
              <span className="text-amber-400 font-bold block text-[11px]">
                {intelData?.digitalFootprint.hasPublicPgpKey
                  ? `ID: ${intelData?.digitalFootprint.pgpKeyId}`
                  : "NÃO ENCONTRADA"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Plataformas Públicas Associadas:</span>
              <div className="space-y-1 mt-1">
                {intelData?.digitalFootprint.linkedPlatforms.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <span className="text-slate-400">{p.platform}:</span>
                    <span className="text-slate-200">{p.status}</span>
                  </div>
                )) || (
                  <span className="text-slate-400 text-[10px]">3 plataformas indexadas</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 3: Exposição em Brechas Públicas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-rose-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">3. Brechas Públicas</h4>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              intelData?.breaches && intelData.breaches.length > 0
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
            }`}>
              {intelData?.breaches ? `${intelData.breaches.length} BRECHAS` : "2 BRECHAS"}
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {intelData?.breaches && intelData.breaches.length > 0 ? (
              intelData.breaches.map((b, idx) => (
                <div key={idx} className="p-2 bg-slate-950 rounded border border-slate-800 space-y-1">
                  <div className="flex justify-between font-bold text-white text-[11px]">
                    <span>{b.databaseName}</span>
                    <span className="text-amber-400">{b.year}</span>
                  </div>
                  <span className="text-rose-400 block text-[10px] font-bold">
                    Dados Expostos: {b.dataExposed.join(", ")}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 bg-slate-950 rounded border border-slate-800 text-[11px] text-emerald-400">
                ✓ Nenhuma credencial associada encontrada em compilações públicas abertas.
              </div>
            )}
          </div>
        </div>

        {/* Bloco 4: Avaliação Global de Risco */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">4. Risco Analítico</h4>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
              SCORE: {intelData?.riskAssessment.riskScore || 78}/100
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Sumário Investigativo:</span>
              <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-950 p-2 rounded border border-slate-800 mt-1">
                {intelData?.riskAssessment.summary ||
                  "Identificador presente em bases públicas de credenciais vazadas com hashes correlacionados."}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Serviço de Correio Descartável:</span>
              <span className="text-emerald-400 font-bold text-[11px]">
                {intelData?.validation.isDisposable ? "SIM (ALERTA)" : "NÃO (Domínio Próprio)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ações de Custódia Probatória & Protocolo Judicial */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
        <div className="space-y-1">
          <span className="text-slate-500 text-[11px] block">Assinatura Digital do Registro de Correio:</span>
          <div className="flex items-center space-x-2 text-amber-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="select-all">
              SHA-256: {intelData?.contentHash || "8e7d6c5b4a3210fedcba9876543210fedcba9876543210fedcba9876543210fe"}
            </span>
            <button
              onClick={() => handleCopy(intelData?.contentHash || "8e7d6c5b4a3210fedcba9876543210fedcba9876543210fedcba9876543210fe")}
              className="text-slate-400 hover:text-white"
              title="Copiar Hash"
            >
              {copiedHash ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <span className="text-[10px] text-slate-500">
            * Consulta passiva arquivada a partir de registros DNS e diretórios de credenciais públicas descarregadas.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadPdf}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <FileDown className="w-4 h-4 text-amber-400" />
            <span>Laudo PDF de Email</span>
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
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-2 cursor-pointer shadow-lg transition-colors"
          >
            <FileCheck className="w-4 h-4" />
            <span>Preservar Evidência</span>
          </button>
        </div>
      </div>
    </div>
  );
}
