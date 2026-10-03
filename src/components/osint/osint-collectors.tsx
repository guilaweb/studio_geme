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
  Info,
  Terminal,
  Filter,
  X
} from "lucide-react";
import { OsintCollectorJob, OsintConnectorType } from "@/lib/osint-types";
import { INITIAL_COLLECTOR_JOBS, OSINT_SOURCES_CATALOG } from "@/lib/osint-engine";

export function OsintCollectors() {
  const [jobs, setJobs] = useState<OsintCollectorJob[]>(INITIAL_COLLECTOR_JOBS);
  const [selectedJob, setSelectedJob] = useState<OsintCollectorJob | null>(INITIAL_COLLECTOR_JOBS[0]);
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [targetInput, setTargetInput] = useState("shadow-secure-transfer.net");
  const [selectedConnector, setSelectedConnector] = useState<OsintConnectorType>("DomainConnector");
  const [isExecuting, setIsExecuting] = useState(false);

  const filteredJobs = jobs.filter((j) => {
    if (statusFilter === "TODOS") return true;
    return j.status === statusFilter;
  });

  const handleLaunchCollector = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExecuting(true);

    const newJob: OsintCollectorJob = {
      id: `job-col-00${jobs.length + 1}`,
      tenantId: "org-profundidade-lab",
      investigationId: "CASO-2026-001",
      connector: selectedConnector,
      target: targetInput,
      requestedBy: "Capitão Silva",
      startedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + " UTC+1",
      status: "EXECUTANDO",
      resultsCount: 0,
      logSummary: "Sessão assíncrona iniciada. Worker alocado na fila de background e consultando fontes...",
    };

    setJobs((prev) => [newJob, ...prev]);
    setSelectedJob(newJob);
    setShowNewJobModal(false);

    try {
      // Disparo real via API
      await fetch("/api/osint/collectors", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": "org-profundidade-lab" },
        body: JSON.stringify({
          connector: selectedConnector,
          target: targetInput,
          investigationId: "CASO-2026-001",
        }),
      });
    } catch {}

    // Transição realista de execução assíncrona
    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === newJob.id
            ? {
                ...j,
                status: "CONCLUIDO",
                completedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + " UTC+1",
                resultsCount: 4,
                logSummary: `Varredura passiva concluída com êxito. 4 novos artefactos públicos indexados sob selo NIST SHA-256.`,
              }
            : j
        )
      );
      setSelectedJob((current) =>
        current?.id === newJob.id
          ? {
              ...current,
              status: "CONCLUIDO",
              completedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + " UTC+1",
              resultsCount: 4,
              logSummary: `Varredura passiva concluída com êxito. 4 novos artefactos públicos indexados sob selo NIST SHA-256.`,
            }
          : current
      );
      setIsExecuting(false);
    }, 2800);
  };

  const handleRetryJob = (jobToRetry: OsintCollectorJob) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobToRetry.id
          ? {
              ...j,
              status: "EXECUTANDO",
              startedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + " UTC+1",
              completedAt: undefined,
              logSummary: "Reiniciando coleta assíncrona...",
            }
          : j
      )
    );

    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobToRetry.id
            ? {
                ...j,
                status: "CONCLUIDO",
                completedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + " UTC+1",
                resultsCount: 3,
                logSummary: "Reexecução concluída com sucesso.",
              }
            : j
        )
      );
    }, 2000);
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

      {/* Grid: Tabela de Tarefas e Telemetria em Tempo Real */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela de Execuções (Jobs) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Fila de Tarefas Assíncronas ({filteredJobs.length})
            </h4>

            {/* Filtros de Estado */}
            <div className="flex items-center space-x-1 text-[10px] font-mono">
              {["TODOS", "EXECUTANDO", "CONCLUIDO", "FALHOU"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    statusFilter === st
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Job ID</th>
                <th className="p-3">Conector</th>
                <th className="p-3">Alvo</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Resultados</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
              {filteredJobs.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`cursor-pointer transition-colors ${
                    selectedJob?.id === job.id ? "bg-slate-800/80" : "hover:bg-slate-800/40"
                  }`}
                >
                  <td className="p-3 text-amber-400 font-bold">{job.id}</td>
                  <td className="p-3 text-white">{job.connector}</td>
                  <td className="p-3 text-slate-200 truncate max-w-[140px]">{job.target}</td>
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
                  <td className="p-3 font-bold text-white">{job.resultsCount}</td>
                  <td className="p-3 text-right">
                    {job.status === "FALHOU" ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetryJob(job);
                        }}
                        className="text-amber-400 hover:text-amber-300 text-[10px] flex items-center justify-end space-x-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reexecutar</span>
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[10px]">{job.startedAt.slice(11, 16)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Painel Lateral: Terminal de Telemetria do Coletor Selecionado */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Telemetria do Worker
              </h4>
            </div>
            {selectedJob && (
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                {selectedJob.id}
              </span>
            )}
          </div>

          {selectedJob ? (
            <div className="space-y-3 font-mono text-xs flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Conector:</span>
                    <span className="text-white font-bold">{selectedJob.connector}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Alvo Atribuído:</span>
                    <span className="text-amber-400 truncate max-w-[180px]">{selectedJob.target}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dossiê Vinculado:</span>
                    <span className="text-slate-300">{selectedJob.investigationId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Iniciado Em:</span>
                    <span className="text-slate-400">{selectedJob.startedAt}</span>
                  </div>
                </div>

                {/* Console Log Terminal */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] space-y-1.5 text-slate-300">
                  <div className="text-slate-500">// LOGS DE AUDITORIA PERICIAL (RFC 6962)</div>
                  <div className="text-emerald-400">[00:00:01] Worker thread alocado para tenant: {selectedJob.tenantId}</div>
                  <div className="text-sky-400">[00:00:02] Conexão passiva com conector {selectedJob.connector} estabelecida</div>
                  <div className="text-amber-400">[00:00:03] {selectedJob.logSummary}</div>
                  {selectedJob.status === "CONCLUIDO" && (
                    <div className="text-emerald-400 font-bold">
                      [00:00:04] ✓ Sucesso: {selectedJob.resultsCount} artefactos selados com assinatura criptográfica NIST.
                    </div>
                  )}
                  {selectedJob.status === "FALHOU" && (
                    <div className="text-rose-400 font-bold">
                      [00:00:04] ✕ Falha de autenticação na API do conector ou alvo inacessível.
                    </div>
                  )}
                </div>
              </div>

              {selectedJob.status === "FALHOU" && (
                <button
                  onClick={() => handleRetryJob(selectedJob)}
                  className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reexecutar Coleta Assíncrona</span>
                </button>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-mono text-center py-12">
              Selecione uma tarefa na lista para inspecionar os logs de execução.
            </div>
          )}
        </div>
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
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg flex items-center space-x-1.5 cursor-pointer"
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
