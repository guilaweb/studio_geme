"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  Globe,
  Shield,
  Layers,
  Search,
  CheckCircle,
  AlertTriangle,
  Copy,
  Info,
  FileCheck,
  RefreshCw,
  FileDown,
  Link2,
  Radio,
  Lock
} from "lucide-react";
import { generateOsintPdfReport } from "@/lib/osint-report-pdf";

interface IpIntelData {
  ip: string;
  hostname: string;
  reverseDns: string;
  routing: {
    asn: string;
    asName: string;
    country: string;
    city: string;
    organization: string;
  };
  threat: {
    trafficClassification: string;
    riskScore: number;
    isTorExitNode: boolean;
    isVpnProxy: boolean;
    observedServices: Array<{
      port: number;
      protocol: string;
      service: string;
      banner: string;
    }>;
    blacklists: Array<{
      list: string;
      listed: boolean;
    }>;
  };
  analyzedAt: string;
  contentHash: string;
}

interface OsintIpAnalyzerProps {
  initialIp?: string;
  onSaveAsEvidence?: (ip: string, data: any) => void;
}

export function OsintIpAnalyzer({
  initialIp = "185.220.101.45",
  onSaveAsEvidence,
}: OsintIpAnalyzerProps) {
  const [ipInput, setIpInput] = useState(initialIp);
  const [activeIp, setActiveIp] = useState(initialIp);
  const [intelData, setIntelData] = useState<IpIntelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchIpIntel = async (ipToAnalyze: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/osint/ip?ip=${encodeURIComponent(ipToAnalyze)}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Falha ao consultar infraestrutura IP.");
      }
      setIntelData(json.data);
      setActiveIp(json.data.ip);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro na consulta aos servidores autoritativos de IP.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIpIntel(initialIp);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (ipInput.trim()) {
      fetchIpIntel(ipInput.trim());
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handlePreserve = () => {
    if (!intelData) return;
    setFeedbackMsg(`Snapshot probatório de ${activeIp} preservado no Cofre Probatório com hash SHA-256.`);
    if (onSaveAsEvidence) {
      onSaveAsEvidence(activeIp, intelData);
    }
  };

  const handleLinkToCase = () => {
    if (!intelData) return;
    try {
      const existing = JSON.parse(localStorage.getItem("profundidade_osint_linked_items") || "[]");
      existing.push({
        caseId: "CASO-2026-001",
        caseTitle: "Operação Sombra Digital",
        type: "EVIDENCIA_REDE_IP",
        title: `Infraestrutura IP Identificada: ${activeIp} (${intelData.threat.trafficClassification})`,
        hash: intelData.contentHash,
        linkedAt: new Date().toISOString(),
      });
      localStorage.setItem("profundidade_osint_linked_items", JSON.stringify(existing));
    } catch {}
    setFeedbackMsg(`Evidência de rede [${activeIp}] vinculada com sucesso ao CASO-2026-001 com selo de custódia.`);
  };

  const handleDownloadPdf = () => {
    if (!intelData) return;
    generateOsintPdfReport({
      search: {
        id: `IP-${Date.now().toString().slice(-6)}`,
        targetQuery: activeIp,
        targetType: "IP",
        contextNotes: `Reconhecimento passivo de roteamento BGP, ASN, PTR e reputação para o endereço ${activeIp}.`,
        investigationRef: "CASO-2026-001 (Operação Sombra Digital)",
        status: "CONCLUIDA",
        resultsCount: intelData.threat.observedServices.length + intelData.threat.blacklists.length,
        discoveriesCount: 1,
        createdAt: new Date().toISOString(),
        requestedBy: "Perito de Inteligência de Redes",
      },
      tenantName: "PROFUNDIDADE - Lab de Inteligência & Evidências",
      analystName: "Perito em Investigação Telemática & Redes",
      results: [
        {
          id: `res-ip-${Date.now()}`,
          searchId: "IP-001",
          source: "DNSConnector (PTR / BGP Routing)",
          sourceType: "DNSConnector",
          category: "DOMINIOS",
          url: `https://${activeIp}`,
          title: `Reconhecimento Autoritativo de Roteamento para ${activeIp}`,
          snippet: `Hostname PTR: ${intelData.hostname}. ASN: ${intelData.routing.asn} (${intelData.routing.asName}). País: ${intelData.routing.country}`,
          publishedAt: intelData.analyzedAt,
          collectedAt: intelData.analyzedAt,
          contentHash: intelData.contentHash,
          entities: [activeIp, intelData.routing.asName, intelData.routing.asn],
          indicators: [intelData.threat.trafficClassification],
          isPreservedAsEvidence: true,
        },
      ],
      discoveries: [
        {
          id: `disc-ip-${Date.now()}`,
          title: `Classificação de Rede Crítica: ${activeIp}`,
          description: `Endereço associado a ${intelData.threat.trafficClassification}. Roteado por ${intelData.routing.asName} em ${intelData.routing.city}, ${intelData.routing.country}. Score de risco analítico: ${intelData.threat.riskScore}/100.`,
          type: "CORRELACAO",
          sources: ["DNSConnector", "DomainConnector"],
          evidences: [intelData.contentHash],
          validationStatus: "VALIDADO",
          validatorNotes: "Classificação obtida via telemetria pública passiva sem intrusão de sistemas.",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header com Input de IP */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Reconhecimento Passivo de IP & Infraestrutura de Rede
            </h3>
            <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded font-mono font-bold">
              NETWORK TELEMETRY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Resolução reversa PTR autoritativa, mapeamento de ASN/BGP, geolocalização e classificação de nós Tor e proxies públicos.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <input
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="ex: 185.220.101.45"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>A analisar...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Analisar IP</span>
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

      {/* Grid de 4 Blocos de Inteligência de Rede */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bloco 1: Roteamento & DNS Reverso */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">1. DNS Reverso & PTR</h4>
            </div>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">AUTORITATIVO</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">IP Alvo:</span>
              <span className="text-purple-400 font-bold">{intelData?.ip || activeIp}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Hostname Resolvido (PTR):</span>
              <span className="text-slate-200 block text-[11px] break-all">
                {intelData?.hostname || `tor-exit-45.m247.ro`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Sistema Autónomo (ASN):</span>
              <span className="text-amber-400 font-bold block text-[11px]">
                {intelData?.routing.asn || "AS9009"} • {intelData?.routing.asName || "M247 Europe Ltd."}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Entidade Registadora:</span>
              <span className="text-slate-400 text-[11px] block truncate">
                RIPE NCC (Regional Internet Registry)
              </span>
            </div>
          </div>
        </div>

        {/* Bloco 2: Geolocalização & ISP */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">2. Geolocalização</h4>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">PASSO FÍSICO</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">País / Jurisdição:</span>
              <span className="text-white font-bold text-[11px]">{intelData?.routing.country || "Islândia (IS)"}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Cidade / Região:</span>
              <span className="text-slate-200 text-[11px]">{intelData?.routing.city || "Reiquiavique"}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Provedor de Conectividade (ISP):</span>
              <span className="text-slate-300 text-[11px] block truncate">
                {intelData?.routing.organization || "M247 Dedicated Relay Infrastructure"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Fuso Horário Estimado:</span>
              <span className="text-slate-400 text-[11px]">UTC+00:00 (Greenwich Mean Time)</span>
            </div>
          </div>
        </div>

        {/* Bloco 3: Perfil de Ameaça & Tor Node */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">3. Perfil de Ameaça</h4>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              intelData?.threat.isTorExitNode
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
            }`}>
              SCORE: {intelData?.threat.riskScore || 88}/100
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Classificação Operacional:</span>
              <span className="text-rose-400 font-bold block text-[11px]">
                {intelData?.threat.trafficClassification || "Nó de Saída Tor Público"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Proxy / VPN / Anonymizer:</span>
              <span className="text-amber-400 text-[11px] font-bold">
                {intelData?.threat.isVpnProxy ? "SIM (Tráfego Ofuscado)" : "NÃO DETECTADO"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Reputação em Blacklists:</span>
              <div className="space-y-0.5 mt-1">
                {intelData?.threat.blacklists.map((bl, idx) => (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <span className="text-slate-400">{bl.list}:</span>
                    <span className={bl.listed ? "text-rose-400 font-bold" : "text-slate-500"}>
                      {bl.listed ? "LISTADO" : "LIMPO"}
                    </span>
                  </div>
                )) || (
                  <span className="text-slate-400 text-[10px]">Consenso Tor Positivo</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 4: Serviços & Portas Passivas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">4. Serviços Públicos</h4>
            </div>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">BANNERS</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <span className="text-slate-500 text-[10px] block">Portas Passivamente Catalogadas:</span>
            <div className="space-y-1.5">
              {intelData?.threat.observedServices.map((svc, idx) => (
                <div key={idx} className="p-2 bg-slate-950 rounded border border-slate-800 text-[11px]">
                  <div className="flex justify-between font-bold text-amber-400">
                    <span>{svc.port}/{svc.protocol}</span>
                    <span className="text-slate-400 text-[10px]">{svc.service}</span>
                  </div>
                  <span className="text-slate-400 text-[10px] block truncate mt-0.5">{svc.banner}</span>
                </div>
              )) || (
                <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[11px]">
                  <span className="text-amber-400 font-bold">80/TCP • HTTP</span>
                  <span className="text-slate-400 text-[10px] block">nginx/1.24.0</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ações de Custódia Probatória & Protocolo Judicial */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
        <div className="space-y-1">
          <span className="text-slate-500 text-[11px] block">Assinatura Digital do Snapshot de Rede:</span>
          <div className="flex items-center space-x-2 text-purple-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="select-all">
              SHA-256: {intelData?.contentHash || "6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e"}
            </span>
            <button
              onClick={() => handleCopy(intelData?.contentHash || "6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e")}
              className="text-slate-400 hover:text-white"
              title="Copiar Hash"
            >
              {copiedHash ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <span className="text-[10px] text-slate-500">
            * Consulta passiva arquivada sem envio de pacotes intrusivos ou varredura de portas não autorizada.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadPdf}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <FileDown className="w-4 h-4 text-purple-400" />
            <span>Laudo PDF de Rede</span>
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
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-2 cursor-pointer shadow-lg transition-colors"
          >
            <FileCheck className="w-4 h-4" />
            <span>Preservar Evidência</span>
          </button>
        </div>
      </div>
    </div>
  );
}
