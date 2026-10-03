"use client";

import React, { useState } from "react";
import {
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  ArrowRight,
  Info,
  Layers,
  Sparkles,
  Eye,
  FileCheck
} from "lucide-react";
import { OsintEntityResolutionMatch } from "@/lib/osint-types";
import { INITIAL_ENTITY_MATCHES } from "@/lib/osint-engine";

export function OsintEntityResolver() {
  const [matches, setMatches] = useState<OsintEntityResolutionMatch[]>(INITIAL_ENTITY_MATCHES);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleValidate = (id: string, newStatus: "VALIDADO" | "REJEITADO") => {
    setMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
    );
    setFeedback(`Correspondência ${id} classificada como ${newStatus}. Registo de auditoria gerado.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Motor de Resolução de Entidades (Entity Resolution)
            </h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
              DESAMBIGUAÇÃO
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Deteção analítica de possíveis correspondências entre alvos distintos sem afirmar identificação antecipada.
          </p>
        </div>

        <div className="text-right font-mono text-xs text-slate-400">
          <span>{matches.filter((m) => m.status === "VALIDADO").length} de {matches.length} validados</span>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between font-mono">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="hover:text-white">✕</button>
        </div>
      )}

      {/* Alerta de Salvaguarda Jurídica */}
      <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-amber-200">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Proteção Ético-Forense:</strong> O sistema calcula similaridades estatísticas e referências cruzadas, indicando <em>&ldquo;Relação não confirmada&rdquo;</em> até que o perito humano examine as evidências e emita validação expressa.
        </p>
      </div>

      {/* Lista de Correspondências */}
      <div className="space-y-4">
        {matches.map((match) => (
          <div
            key={match.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl"
          >
            {/* Top Bar: Entidade A vs Entidade B */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                {/* Entidade Primária */}
                <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Origem</span>
                  <span className="text-xs font-bold text-white block">{match.primaryEntity.name}</span>
                  <span className="text-[10px] font-mono text-amber-400 block">
                    {match.primaryEntity.identifiers[0]}
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />

                {/* Entidade Correspondente */}
                <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Correspondência</span>
                  <span className="text-xs font-bold text-white block">{match.matchedEntity.name}</span>
                  <span className="text-[10px] font-mono text-amber-400 block">
                    {match.matchedEntity.identifiers[0]}
                  </span>
                </div>
              </div>

              {/* Score de Confiança */}
              <div className="flex items-center space-x-3">
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-500 block uppercase">Confiança Analítica</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {(match.confidenceScore * 100).toFixed(0)}%
                  </span>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${
                    match.status === "VALIDADO"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : match.status === "REJEITADO"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {match.status}
                </span>
              </div>
            </div>

            {/* Checklist de Indicadores de Correspondência */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                Indicadores de Verificação Cruzada:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {match.indicators.map((ind, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-lg flex items-center space-x-2 text-slate-300"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[11px]">{ind.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações de Validação Humana */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 text-[11px]">
                {match.evidencesCount} evidências preservadas que sustentam esta hipótese.
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleValidate(match.id, "REJEITADO")}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Rejeitar Relação
                </button>
                <button
                  onClick={() => handleValidate(match.id, "VALIDADO")}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                >
                  ✓ Validar Relação
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
