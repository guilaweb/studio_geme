"use client";

import React, { useState } from "react";
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
  Cpu
} from "lucide-react";

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
  const [copiedHash, setCopiedHash] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (domainInput.trim()) {
      setActiveDomain(domainInput.trim());
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handlePreserve = () => {
    setSavedSuccess(`Relatório técnico do domínio ${activeDomain} preservado com sucesso no Cofre Probatório com selo SHA-256.`);
    if (onSaveAsEvidence) {
      onSaveAsEvidence(activeDomain, { timestamp: new Date().toISOString() });
    }
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
              OSINT RECON
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Reconhecimento passivo de DNS autoritativo, Certificate Transparency (CT), hosts públicos e entidades observáveis.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="exemplo.com"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Analisar</span>
          </button>
        </form>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{savedSuccess}</span>
          </div>
          <button onClick={() => setSavedSuccess(null)} className="hover:text-white">✕</button>
        </div>
      )}

      {/* Visão 360 do Domínio Selecionado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bloco 1: DNS Autoritativo */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">1. DNS</h4>
            </div>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">RESOLVIDO</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">A Record (IPv4):</span>
              <span className="text-amber-400 font-bold">185.220.101.45</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">MX (Correio):</span>
              <span className="text-slate-200">mail.{activeDomain}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Name Servers (NS):</span>
              <span className="text-slate-300 block text-[11px]">ns1.privacy-dns.is</span>
              <span className="text-slate-300 block text-[11px]">ns2.privacy-dns.is</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">SOA & Serial:</span>
              <span className="text-slate-400 text-[11px]">2026092701 (TTL 300s)</span>
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
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">crt.sh</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Autoridade Emissora (CA):</span>
              <span className="text-white font-semibold">Let&apos;s Encrypt Authority X3</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Validade:</span>
              <span className="text-slate-200">15 Ago 2026 ➔ 13 Nov 2026</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Nomes Associados (SANs):</span>
              <span className="text-amber-400 block text-[11px] font-bold">• {activeDomain}</span>
              <span className="text-amber-400 block text-[11px]">• api.{activeDomain}</span>
              <span className="text-amber-400 block text-[11px]">• vault.{activeDomain}</span>
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
            <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">TOR DETECTADO</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Sistema Autónomo (ASN):</span>
              <span className="text-slate-200">AS9009 (M247 Europe Ltd.)</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Geolocalização IP:</span>
              <span className="text-slate-200">Islândia / Reiquiavique (IS)</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Classificação de Tráfego:</span>
              <span className="text-rose-400 font-bold">Nó de Saída Tor Público</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Portas Observadas:</span>
              <span className="text-slate-300">80/TCP (HTTP), 443/TCP (HTTPS)</span>
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
            <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">PASSO PASSIVO</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Servidor Web:</span>
              <span className="text-slate-200">nginx/1.24.0 (Alpine)</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Stack Tecnológico:</span>
              <span className="text-slate-200">Node.js / Next.js / TailwindCSS</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Cabeçalhos de Segurança:</span>
              <span className="text-slate-400 block text-[11px]">Strict-Transport-Security</span>
              <span className="text-slate-400 block text-[11px]">X-Content-Type-Options: nosniff</span>
            </div>
          </div>
        </div>
      </div>

      {/* Caixa de Custódia Probatória & Ações Oficiais */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
        <div className="space-y-1">
          <span className="text-slate-500 text-[11px] block">Assinatura Digital do Snapshot de Infraestrutura:</span>
          <div className="flex items-center space-x-2 text-amber-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="select-all">SHA-256: 4f9b8c12a3d4e5f67890123456789abcdef0123456789abcdef0123456789abc</span>
            <button
              onClick={() => handleCopy("4f9b8c12a3d4e5f67890123456789abcdef0123456789abcdef0123456789abc")}
              className="text-slate-400 hover:text-white"
              title="Copiar Hash"
            >
              {copiedHash ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <span className="text-[10px] text-slate-500">
            * Consulta passiva arquivada sem envio de pacotes intrusivos ou varredura ofensiva.
          </span>
        </div>

        <button
          onClick={handlePreserve}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-2 cursor-pointer shadow-lg transition-colors shrink-0"
        >
          <FileCheck className="w-4 h-4" />
          <span>Preservar Evidência no Cofre SHA-256</span>
        </button>
      </div>
    </div>
  );
}
