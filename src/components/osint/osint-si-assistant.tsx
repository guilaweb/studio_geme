"use client";

import React, { useState } from "react";
import {
  Cpu,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
  Shield,
  FileCheck,
  Eye,
  RefreshCw
} from "lucide-react";

export interface SiHypothesis {
  id: string;
  title: string;
  explanation: string;
  confidenceScore: number; // ex: 0.78 (78%)
  indicatorsCount: number;
  sourcesCount: number;
  indicators: string[];
  sources: string[];
  evidenceIds: string[];
  status: "PENDENTE" | "RELEVANTE" | "REJEITADO";
  legalDisclaimer: string;
}

export function OsintSiAssistant() {
  const [hypotheses, setHypotheses] = useState<SiHypothesis[]>([
    {
      id: "si-hypo-001",
      title: "Possível Relação Identificada: Dr. Manuel V. e Operação de Caixa Offshore",
      explanation:
        "O cruzamento analítico entre a ata de nomeação no Diário da República e o registo RDAP do domínio vortex-consulting.org sugere que o mesmo mandante fiduciário opera os canais de liquidação financeira identificados no dossiê.",
      confidenceScore: 0.78, // 78%
      indicatorsCount: 3,
      sourcesCount: 4,
      indicators: [
        "1. Identificador fiscal (NIF 5410982319) idêntico nos registos societários",
        "2. Referência cruzada entre Diário da República e registo RDAP suíço (+41 79 123 4567)",
        "3. Coincidência temporal estrita entre constituição da empresa e emissão do certificado TLS",
      ],
      sources: [
        "Boletim Oficial de Angola (Edital 12/2024)",
        "ICANN RDAP Service (vortex-consulting.org)",
        "Certificate Transparency Logs (crt.sh)",
        "Resolução DNS Autoritativa (AS9009)",
      ],
      evidenceIds: ["ev-001", "ev-002", "ev-003"],
      status: "RELEVANTE",
      legalDisclaimer:
        "Inferência analítica probabilística de suporte investigativo. Requer validação soberana por perito forense.",
    },
    {
      id: "si-hypo-002",
      title: "Padrão de Ofuscação de Rota C2 via Infraestrutura Tor (AS9009)",
      explanation:
        "O domínio shadow-secure-transfer.net utiliza servidores DNS no TLD .is e aponta para nó de saída Tor, padrão coincidente com campanhas de evasão de monitorização perimetral.",
      confidenceScore: 0.86, // 86%
      indicatorsCount: 3,
      sourcesCount: 3,
      indicators: [
        "1. Endereço IP 185.220.101.45 catalogado em consenso público do Tor Project",
        "2. Nameservers configurados com serviço de ocultação de ASN",
        "3. Emissão automatizada de múltiplos SANs em curto intervalo temporal",
      ],
      sources: [
        "DNSConnector (Resolução A/NS)",
        "Diretório Público Tor Project",
        "Certificate Transparency (crt.sh)",
      ],
      evidenceIds: ["ev-001", "ev-002"],
      status: "PENDENTE",
      legalDisclaimer:
        "Hipótese assistida por inteligência artificial para priorização de investigação.",
    }
  ]);

  const [toast, setToast] = useState<string | null>(null);

  const handleUpdateStatus = (id: string, newStatus: "RELEVANTE" | "REJEITADO") => {
    setHypotheses((prev) =>
      prev.map((h) => (h.id === id ? { ...h, status: newStatus } : h))
    );
    setToast(`Hipótese ${id} classificada como ${newStatus}. Parecer pericial arquivado.`);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Super Inteligência (SI) Assistiva dentro do OSINT
            </h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
              HUMAN-IN-THE-LOOP
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            O SI opera após a coleta e normalização das fontes, gerando hipóteses probabilísticas para decisão do investigador.
          </p>
        </div>

        <span className="text-xs font-mono text-slate-400">
          {hypotheses.length} hipóteses geradas
        </span>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between font-mono">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="hover:text-white">✕</button>
        </div>
      )}

      {/* Pipeline Visual Explicativo */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
        <span className="text-slate-500">Pipeline OSINT:</span>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">FONTES</span>
          <span className="text-slate-600">➔</span>
          <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">NORMALIZAÇÃO</span>
          <span className="text-slate-600">➔</span>
          <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">ENTIDADES</span>
          <span className="text-slate-600">➔</span>
          <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">CORRELAÇÃO</span>
          <span className="text-slate-600">➔</span>
          <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30 font-bold">SI (HIPÓTESES)</span>
          <span className="text-slate-600">➔</span>
          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">INVESTIGADOR (VALIDAÇÃO)</span>
        </div>
      </div>

      {/* Lista de Hipóteses SI */}
      <div className="space-y-4">
        {hypotheses.map((hypo) => (
          <div
            key={hypo.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl"
          >
            {/* Top Bar da Hipótese */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <h4 className="text-sm font-bold text-white tracking-tight">{hypo.title}</h4>
              </div>

              <div className="flex items-center space-x-3 font-mono">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase">Confiança Analítica</span>
                  <span className="text-base font-bold text-emerald-400">
                    {(hypo.confidenceScore * 100).toFixed(0)}%
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded border ${
                    hypo.status === "RELEVANTE"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : hypo.status === "REJEITADO"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {hypo.status}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
              {hypo.explanation}
            </p>

            {/* Checklist de 3 Indicadores Obrigatórios */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
                {hypo.indicatorsCount} Indicadores Correlacionados pelo SI:
              </span>
              <div className="space-y-1 font-mono text-xs">
                {hypo.indicators.map((ind, idx) => (
                  <div key={idx} className="p-2 bg-slate-950 border border-slate-800 rounded flex items-center space-x-2 text-slate-200">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{ind}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fontes Envolvidas */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="text-slate-500">Fontes Auditadas ({hypo.sourcesCount}):</span>
                <span className="text-slate-300">{hypo.sources.join(" • ")}</span>
              </div>
              <span className="text-[10px] italic text-slate-500">{hypo.legalDisclaimer}</span>
            </div>

            {/* Ações do Investigador Humano */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-end space-x-2 text-xs font-mono">
              <button
                onClick={() => handleUpdateStatus(hypo.id, "REJEITADO")}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
              >
                Rejeitar Hipótese
              </button>
              <button
                onClick={() => handleUpdateStatus(hypo.id, "RELEVANTE")}
                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3.5 py-1.5 rounded-lg font-bold cursor-pointer flex items-center space-x-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Marcar como Relevante (Humano)</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
