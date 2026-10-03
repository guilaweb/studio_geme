"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  FileText,
  Globe,
  Lock,
  Copy,
  CheckCircle,
  Filter
} from "lucide-react";
import { OsintTimelineEvent } from "@/lib/osint-types";
import { INITIAL_OSINT_TIMELINE } from "@/lib/osint-engine";

export function OsintTimeline() {
  const [timeline, setTimeline] = useState<OsintTimelineEvent[]>(INITIAL_OSINT_TIMELINE);
  const [selectedYear, setSelectedYear] = useState<string>("TODOS");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const years = Array.from(new Set(timeline.map((e) => e.year))).sort((a, b) => b - a);

  const filteredEvents = timeline.filter((e) => {
    if (selectedYear === "TODOS") return true;
    return e.year === Number(selectedYear);
  });

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header com Filtro de Ano */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Linha do Tempo Cronológica OSINT
            </h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
              RASTREABILIDADE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Reconstituição cronológica de publicações, certificados, registros de domínios e atas públicas com proveniência criptográfica.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono">Ano:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
          >
            <option value="TODOS">Todos os Anos ({timeline.length} eventos)</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista Cronológica */}
      <div className="relative border-l border-slate-800 ml-4 space-y-6 py-2">
        {filteredEvents.map((evt) => (
          <div key={evt.id} className="relative pl-6 group">
            {/* Dot indicador */}
            <div className="absolute -left-2 top-2 w-4 h-4 rounded-full border-2 bg-amber-500 border-slate-950 group-hover:scale-125 transition-transform" />

            <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-5 space-y-3 transition-all shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {evt.date}
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs font-mono text-slate-300">{evt.sourceType}</span>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    evt.reliability === "CONFIRMADO"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-sky-500/10 text-sky-400 border-sky-500/30"
                  }`}
                >
                  {evt.reliability}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                  {evt.title}
                </h4>
                <p className="text-xs text-slate-300 font-mono mt-1 leading-relaxed">
                  {evt.description}
                </p>
              </div>

              {/* Origem e Hash */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[11px]">
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <span className="text-slate-500">Fonte Original:</span>
                  <span className="text-white font-semibold">{evt.sourceOrigin}</span>
                </div>

                <div className="flex items-center space-x-2 text-slate-500">
                  <span>SHA-256: {evt.contentHash.slice(0, 16)}...</span>
                  <button
                    onClick={() => handleCopy(evt.contentHash)}
                    className="hover:text-amber-400"
                    title="Copiar Hash"
                  >
                    {copiedHash === evt.contentHash ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
