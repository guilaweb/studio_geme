"use client";

import React, { useState } from "react";
import {
  Layers,
  Play,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Server,
  FileText,
  Lock,
  Globe,
  Plus,
  RefreshCw,
  Info
} from "lucide-react";
import { OsintCollectorJob, OsintConnectorType } from "@/lib/osint-types";
import { INITIAL_COLLECTOR_JOBS, OSINT_SOURCES_CATALOG } from "@/lib/osint-engine";

export function OsintCollectors() {
  const [jobs, setJobs] = useState<OsintCollectorJob[]>(INITIAL_COLLECTOR_JOBS);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [targetInput, setTargetInput] = useState("shadow-secure-transfer.net");
  const [selectedConnector, setSelectedConnector] = useState<OsintConnectorType>("DomainConnector");
  const [isExecuting, setIsExecuting] = useState(false);

  const handleLaunchCollector = (e: React.FormEvent) => {
    e.preventDefault();
    setIsExecuting(true);

    const newJob: OsintCollectorJob = {
      id: `job-col-00${jobs.length + 1}`,
      tenantId: "org-profundidade-lab",
      investigationId: "CASO-2026-001",
      connector: selectedConnector,
      target: targetInput,
      requestedBy: "Perito Activo",
      startedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + " UTC+1",
      status: "EXECUTANDO",
      resultsCount: 0,
      logSummary: "Sessão assíncrona iniciada. A consultar repositórios públicos autoritativos...",
    };

    setJobs((prev) => [newJob, ...prev]);
    setShowNewJobModal(false);

    // Simulação assíncrona realista (conclusão após 2.5s)
    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === newJob.id
            ? {
                ...j,
                status: "CONCLUIDO",
                completedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + " UTC+1",
                resultsCount: 4,
                logSummary: `Varredura concluída. 4 artefactos públicos identificados e normalizados sob hash SHA-256.`,
              }
            : j
        )
      );
      setIsExecuting(false);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Coletores Assíncronos & Ingestão Contínua (Collectors)
            </h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
              BACKGROUND WORKERS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Execução de tarefas demoradas em background com isolamento por Tenant, rate-limiting e deduplicação automática.
          </p>
        </div>

        <button
          onClick={() => setShowNewJobModal(true)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 shadow-md cursor-pointer transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Novo Coletor Assíncrono</span>
        </button>
      </div>

      {/* Cards de Coletores Pré-Configurados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Globe className="w-4 h-4 text-sky-400" />
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">ONLINE</span>
          </div>
          <h4 className="text-xs font-bold text-white">Coletor Web</h4>
          <p className="text-[11px] text-slate-400">Coleta e crawling passivo de páginas públicas com proteção anti-SSRF.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Server className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">ONLINE</span>
          </div>
          <h4 className="text-xs font-bold text-white">Coletor Domínio & DNS</h4>
          <p className="text-[11px] text-slate-400">Resolução autoritativa de nameservers, registos A, MX e WHOIS RDAP.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">ONLINE</span>
          </div>
          <h4 className="text-xs font-bold text-white">Coletor Documentos</h4>
          <p className="text-[11px] text-slate-400">Parsing de diários oficiais, editais públicos e registos mercantis.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Lock className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">ONLINE</span>
          </div>
          <h4 className="text-xs font-bold text-white">Coletor Certificados (CT)</h4>
          <p className="text-[11px] text-slate-400">Auditoria de Certificate Transparency logs para identificação de SANs.</p>
        </div>
      </div>

      {/* Tabela de Execuções (Jobs) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Histórico de Execuções de Coletores (Collector Jobs)
          </h4>
          <span className="text-[10px] font-mono text-slate-400">{jobs.length} tarefas registadas</span>
        </div>

        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th className="p-3">Job ID</th>
              <th className="p-3">Conector</th>
              <th className="p-3">Alvo</th>
              <th className="p-3">Início</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Resultados</th>
              <th className="p-3">Sumário da Operação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="p-3 text-amber-400 font-bold">{job.id}</td>
                <td className="p-3 text-white">{job.connector}</td>
                <td className="p-3 text-slate-200">{job.target}</td>
                <td className="p-3 text-slate-400">{job.startedAt.slice(11, 19)}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      job.status === "CONCLUIDO"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : job.status === "EXECUTANDO"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {job.status}
                  </span>
                </td>
                <td className="p-3 text-center font-bold text-white">{job.resultsCount}</td>
                <td className="p-3 text-slate-400 text-[10px] max-w-xs truncate">{job.logSummary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Novo Coletor */}
      {showNewJobModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Disparar Coletor Assíncrono</h3>
              <button onClick={() => setShowNewJobModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleLaunchCollector} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Conector Especializado</label>
                <select
                  value={selectedConnector}
                  onChange={(e) => setSelectedConnector(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                >
                  <option value="DomainConnector">DomainConnector (WHOIS / RDAP)</option>
                  <option value="DNSConnector">DNSConnector (Resolução Autoritativa)</option>
                  <option value="CertificateConnector">CertificateConnector (CT Logs crt.sh)</option>
                  <option value="PublicDocumentConnector">PublicDocumentConnector (Boletins Oficiais)</option>
                  <option value="PublicNewsConnector">PublicNewsConnector (Notícias Abertas)</option>
                  <option value="SearchConnector">SearchConnector (Motores Abertos)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Alvo Público (Domínio, Nome, NIF ou IP)</label>
                <input
                  type="text"
                  required
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  placeholder="Ex: shadow-secure-transfer.net"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-400 space-y-1">
                <span className="text-amber-400 font-bold block">Auditoria e Rate-Limit:</span>
                <p>
                  A execução gera um ID de trabalho imutável registrado nos logs de auditoria do Tenant com timestamp criptográfico.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewJobModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg flex items-center space-x-1.5"
                >
                  {isExecuting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Executar Coletor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
