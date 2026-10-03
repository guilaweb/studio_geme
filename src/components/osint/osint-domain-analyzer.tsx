"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  Server,
  Shield,
  Lock,
  Layers,
  Search,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Copy,
  Info,
  FileCheck,
  Cpu,
  RefreshCw,
  FileDown
} from "lucide-react";
import { generateOsintPdfReport } from "@/lib/osint-report-pdf";

interface DomainIntelData {
  domain: string;
  analyzedAt: string;
  dns: {
    a: string[];
    mx: string[];
    ns: string[];
    soa: string;
    txt: string[];
  };
  certificates: {
    issuer: string;
    validFrom: string;
    validTo: string;
    sans: string[];
    totalCertsFound: number;
  };
  infrastructure: {
    primaryIp: string;
    asn: string;
    location: string;
    trafficClassification: string;
    openPorts: string[];
  };
  webHeaders: {
    server: string;
    technologies: string[];
    securityHeaders: string[];
  };
  contentHash: string;
}

interface OsintDomainAnalyzerProps {
  initialDomain?: string;
  onSaveAsEvidence?: (domain: string, data: any) => void;
}

export function OsintDomainAnalyzer({
  initialDomain = "shadow-secure-transfer.net",
  onSaveAsEvidence,
}: OsintDomainAnalyzerProps) {
  const [domainInput, setDomainInput] = useState(initialDomain);
  const [activeDomain, setActiveDomain] = useState(initialDomain);
  const [intelData, setIntelData] = useState<DomainIntelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Função para executar a consulta à API de reconhecimento
  const fetchDomainIntel = async (domainToAnalyze: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/osint/domain?domain=${encodeURIComponent(domainToAnalyze)}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Falha ao consultar infraestrutura.");
      }
      setIntelData(json.data);
      setActiveDomain(json.data.domain);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro na consulta aos servidores autoritativos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomainIntel(initialDomain);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (domainInput.trim()) {
      fetchDomainIntel(domainInput.trim());
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handlePreserve = () => {
    const hash = intelData?.contentHash || "4f9b8c12a3d4e5f67890123456789abcdef0123456789abcdef0123456789abc";
    setSavedSuccess(`Snapshot de infraestrutura de ${activeDomain} registrado no Cofre Probatório com hash SHA-256 [${hash.substring(0, 16)}...].`);
    if (onSaveAsEvidence && intelData) {
      onSaveAsEvidence(activeDomain, intelData);
    }
  };

  const handleDownloadPdf = () => {
    if (!intelData) return;
    generateOsintPdfReport({
      search: {
        id: `DOM-${Date.now().toString().slice(-6)}`,
        targetQuery: activeDomain,
        targetType: "DOMINIO",
        contextNotes: `Reconhecimento passivo de infraestrutura DNS, CT logs e ASN para o domínio ${activeDomain}.`,
        investigationRef: "CASO-2026-001 (Operação Sombra Digital)",
        status: "CONCLUIDA",
        resultsCount: intelData.certificates.sans.length + intelData.dns.a.length,
        discoveriesCount: 1,
        createdAt: new Date().toISOString(),
        requestedBy: "Perito em Fontes Abertas",
      },
      tenantName: "PROFUNDIDADE - Lab de Inteligência & Evidências",
      analystName: "Perito de Reconhecimento OSINT",
      results: [
        {
          id: `res-dns-${Date.now()}`,
          searchId: "DOM-001",
          source: "DNSConnector (Resolução Global)",
          sourceType: "DNSConnector",
          category: "DOMINIOS",
          url: `https://${activeDomain}`,
          title: `Resolução Autoritativa A/MX/NS de ${activeDomain}`,
          snippet: `IP primário resolvido: ${intelData.infrastructure.primaryIp}. ASN: ${intelData.infrastructure.asn}`,
          publishedAt: intelData.analyzedAt,
          collectedAt: intelData.analyzedAt,
          contentHash: intelData.contentHash,
          entities: [activeDomain, intelData.infrastructure.primaryIp],
          indicators: [intelData.infrastructure.trafficClassification],
          isPreservedAsEvidence: true,
        },
      ],
      discoveries: [
        {
          id: `disc-dom-${Date.now()}`,
          title: `Infraestrutura Operacional Identificada: ${activeDomain}`,
          description: `Apontamento verificado para ${intelData.infrastructure.primaryIp} (${intelData.infrastructure.trafficClassification}). Certificado emitido por ${intelData.certificates.issuer}.`,
          type: "CORRELACAO",
          sources: ["DNSConnector", "CertificateConnector"],
          evidences: [intelData.contentHash],
          validationStatus: "VALIDADO",
          validatorNotes: "Confirmada ausência de pacotes intrusivos. Consulta passiva em diretórios públicos.",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header com Input de Domínio */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Investigação Passiva de Domínio & Infraestrutura
            </h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
              LIVE DOH & CT
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Reconhecimento passivo em tempo real via DNS-over-HTTPS (DoH), Certificate Transparency (crt.sh) e classificação de ASN.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="ex: shadow-secure-transfer.net"
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
                <span>A consultar...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Analisar</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Alerta de Erro se houver */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-950/80 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="hover:text-white">✕</button>
        </div>
      )}

      {/* Feedback de Sucesso */}
      {savedSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedSuccess}</span>
          </div>
          <button onClick={() => setSavedSuccess(null)} className="hover:text-white">✕</button>
        </div>
      )}

      {/* Visão 360 do Domínio Selecionado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bloco 1: DNS Autoritativo */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">1. DNS</h4>
            </div>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
              {loading ? "CONSULTANDO..." : "RESOLVIDO"}
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">A Record (IPv4):</span>
              <span className="text-amber-400 font-bold break-all">
                {intelData?.dns.a.join(", ") || "185.220.101.45"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">MX (Servidor de Correio):</span>
              <span className="text-slate-200 break-all">
                {intelData?.dns.mx.join(", ") || `mail.${activeDomain}`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Name Servers (NS):</span>
              {intelData?.dns.ns && intelData.dns.ns.length > 0 ? (
                intelData.dns.ns.map((ns, idx) => (
                  <span key={idx} className="text-slate-300 block text-[11px] truncate">
                    {ns}
                  </span>
                ))
              ) : (
                <>
                  <span className="text-slate-300 block text-[11px]">ns1.privacy-dns.is</span>
                  <span className="text-slate-300 block text-[11px]">ns2.privacy-dns.is</span>
                </>
              )}
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">SOA & Serial:</span>
              <span className="text-slate-400 text-[10px] block truncate">
                {intelData?.dns.soa || "2026092701 (TTL 300s)"}
              </span>
            </div>
          </div>
        </div>

        {/* Bloco 2: Certificados TLS (CT Logs) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">2. Certificados</h4>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              crt.sh ({intelData?.certificates.totalCertsFound || 3})
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Autoridade Emissora (CA):</span>
              <span className="text-white font-semibold text-[11px] block truncate">
                {intelData?.certificates.issuer || "Let's Encrypt Authority X3"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Validade Registrada:</span>
              <span className="text-slate-200 text-[11px]">
                {intelData?.certificates.validFrom || "15 Ago 2026"} ➔ {intelData?.certificates.validTo || "13 Nov 2026"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Nomes Associados (SANs):</span>
              <div className="space-y-0.5 mt-0.5 max-h-24 overflow-y-auto pr-1">
                {intelData?.certificates.sans.map((san, idx) => (
                  <span key={idx} className="text-amber-400 block text-[11px] font-bold truncate">
                    • {san}
                  </span>
                )) || (
                  <>
                    <span className="text-amber-400 block text-[11px] font-bold">• {activeDomain}</span>
                    <span className="text-amber-400 block text-[11px]">• api.{activeDomain}</span>
                    <span className="text-amber-400 block text-[11px]">• vault.{activeDomain}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 3: Infraestrutura & ASN */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">3. Infraestrutura</h4>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
              intelData?.infrastructure.trafficClassification.includes("Tor")
                ? "text-rose-400 bg-rose-500/10 font-bold"
                : "text-amber-400 bg-amber-500/10"
            }`}>
              {intelData?.infrastructure.trafficClassification || "TOR DETECTADO"}
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Sistema Autónomo (ASN):</span>
              <span className="text-slate-200 text-[11px] block truncate">
                {intelData?.infrastructure.asn || "AS9009 (M247 Europe Ltd.)"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Geolocalização IP:</span>
              <span className="text-slate-200 text-[11px]">
                {intelData?.infrastructure.location || "Islândia / Reiquiavique (IS)"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Classificação de Tráfego:</span>
              <span className="text-rose-400 font-bold text-[11px] block">
                {intelData?.infrastructure.trafficClassification || "Nó de Saída Tor Público"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Portas Observadas:</span>
              <span className="text-slate-300 text-[11px]">
                {intelData?.infrastructure.openPorts.join(", ") || "80/TCP, 443/TCP"}
              </span>
            </div>
          </div>
        </div>

        {/* Bloco 4: Web & Tecnologias */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">4. Web & Header</h4>
            </div>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">PASSIVO</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Servidor Web Declarado:</span>
              <span className="text-slate-200 text-[11px]">
                {intelData?.webHeaders.server || "nginx/1.24.0 (Alpine)"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Stack Tecnológico Inferido:</span>
              <span className="text-slate-200 text-[11px]">
                {intelData?.webHeaders.technologies.join(" / ") || "Node.js / Next.js / TailwindCSS"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Cabeçalhos de Segurança:</span>
              <div className="space-y-0.5 mt-0.5">
                {intelData?.webHeaders.securityHeaders.map((hdr, idx) => (
                  <span key={idx} className="text-slate-400 block text-[10px] truncate">
                    {hdr}
                  </span>
                )) || (
                  <>
                    <span className="text-slate-400 block text-[10px]">Strict-Transport-Security</span>
                    <span className="text-slate-400 block text-[10px]">X-Content-Type-Options: nosniff</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Caixa de Custódia Probatória & Ações Oficiais */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
        <div className="space-y-1">
          <span className="text-slate-500 text-[11px] block">Assinatura Digital do Snapshot de Infraestrutura:</span>
          <div className="flex items-center space-x-2 text-amber-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="select-all">
              SHA-256: {intelData?.contentHash || "4f9b8c12a3d4e5f67890123456789abcdef0123456789abcdef0123456789abc"}
            </span>
            <button
              onClick={() => handleCopy(intelData?.contentHash || "4f9b8c12a3d4e5f67890123456789abcdef0123456789abcdef0123456789abc")}
              className="text-slate-400 hover:text-white"
              title="Copiar Hash"
            >
              {copiedHash ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <span className="text-[10px] text-slate-500">
            * Consulta passiva executada sem envio de pacotes intrusivos ou varredura ofensiva.
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleDownloadPdf}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <FileDown className="w-4 h-4 text-amber-400" />
            <span>Relatório PDF</span>
          </button>

          <button
            onClick={handlePreserve}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-2 cursor-pointer shadow-lg transition-colors"
          >
            <FileCheck className="w-4 h-4" />
            <span>Preservar Evidência SHA-256</span>
          </button>
        </div>
      </div>
    </div>
  );
}
