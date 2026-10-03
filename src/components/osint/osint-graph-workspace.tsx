"use client";

import React, { useState } from "react";
import {
  Share2,
  Users,
  Building2,
  Globe,
  Phone,
  Server,
  FileText,
  Lock,
  Plus,
  Filter,
  CheckCircle,
  Eye,
  Info,
  Shield,
  Layers,
  Sparkles,
  Link2,
  FileDown,
  Search,
  Copy
} from "lucide-react";
import {
  OsintGraphNode,
  OsintGraphEdge,
} from "@/lib/osint-types";
import {
  INITIAL_OSINT_GRAPH_NODES,
  INITIAL_OSINT_GRAPH_EDGES,
} from "@/lib/osint-engine";

export function OsintGraphWorkspace() {
  const [nodes, setNodes] = useState<OsintGraphNode[]>(INITIAL_OSINT_GRAPH_NODES);
  const [edges, setEdges] = useState<OsintGraphEdge[]>(INITIAL_OSINT_GRAPH_EDGES);
  const [selectedNode, setSelectedNode] = useState<OsintGraphNode | null>(INITIAL_OSINT_GRAPH_NODES[0]);
  const [selectedEdge, setSelectedEdge] = useState<OsintGraphEdge | null>(null);
  const [filterType, setFilterType] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewRelModal, setShowNewRelModal] = useState(false);
  const [showNewNodeModal, setShowNewNodeModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Formulário de nova relação
  const [newRelSource, setNewRelSource] = useState(nodes[0]?.id || "");
  const [newRelTarget, setNewRelTarget] = useState(nodes[1]?.id || "");
  const [newRelType, setNewRelType] = useState<OsintGraphEdge["relation"]>("ASSOCIATED_WITH");
  const [newRelEvidence, setNewRelEvidence] = useState("Fonte Pública Auditada");

  // Formulário de novo nó
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [newNodeType, setNewNodeType] = useState<OsintGraphNode["type"]>("PESSOA");
  const [newNodeIdentifier, setNewNodeIdentifier] = useState("");
  const [newNodeRisk, setNewNodeRisk] = useState("0.50");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const filteredNodes = nodes.filter((n) => {
    const matchesType = filterType === "TODOS" || n.type === filterType;
    const matchesSearch =
      n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.identifier && n.identifier.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const handleAddRelationship = (e: React.FormEvent) => {
    e.preventDefault();
    const newEdge: OsintGraphEdge = {
      id: `edge-${Date.now()}`,
      source: newRelSource,
      target: newRelTarget,
      relation: newRelType,
      confidence: 0.90,
      sourceName: "Investigador / Validação Manual",
      evidenceRef: newRelEvidence,
      createdAt: new Date().toISOString().slice(0, 10),
      validatedBy: "Perito Humano",
    };
    setEdges((prev) => [newEdge, ...prev]);
    setShowNewRelModal(false);
    showToast("Vínculo relacional adicionado ao grafo com sucesso.");
  };

  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeLabel.trim()) return;

    const newNode: OsintGraphNode = {
      id: `node-${Date.now()}`,
      label: newNodeLabel.trim(),
      type: newNodeType,
      identifier: newNodeIdentifier.trim() || undefined,
      riskScore: parseFloat(newNodeRisk) || 0.5,
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
    setShowNewNodeModal(false);
    setNewNodeLabel("");
    setNewNodeIdentifier("");
    showToast(`Entidade [${newNode.label}] adicionada ao grafo.`);
  };

  const handleLinkNodeToCase = (node: OsintGraphNode) => {
    try {
      const existing = JSON.parse(localStorage.getItem("profundidade_osint_linked_items") || "[]");
      const hash = "7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c";
      existing.push({
        caseId: "CASO-2026-001",
        caseTitle: "Operação Sombra Digital",
        type: "ENTIDADE_GRAFO",
        title: `Nó de Inteligência: ${node.label} (${node.type})`,
        hash,
        linkedAt: new Date().toISOString(),
      });
      localStorage.setItem("profundidade_osint_linked_items", JSON.stringify(existing));
    } catch {}
    showToast(`Entidade [${node.label}] vinculada com sucesso ao CASO-2026-001.`);
  };

  const handleExportGraphJson = () => {
    const data = {
      exportDate: new Date().toISOString(),
      investigationCase: "CASO-2026-001",
      nodesCount: nodes.length,
      edgesCount: edges.length,
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GRAFO_INTELIGENCIA_OSINT_${Date.now()}.json`;
    a.click();
    showToast("Grafo relacional exportado em formato JSON.");
  };

  const getNodeIcon = (type: OsintGraphNode["type"]) => {
    switch (type) {
      case "PESSOA":
        return <Users className="w-4 h-4 text-emerald-400" />;
      case "EMPRESA":
      case "ORGANIZACAO":
        return <Building2 className="w-4 h-4 text-sky-400" />;
      case "DOMINIO":
      case "WEBSITE":
        return <Globe className="w-4 h-4 text-amber-400" />;
      case "TELEFONE_PUBLICO":
        return <Phone className="w-4 h-4 text-rose-400" />;
      case "IP":
        return <Server className="w-4 h-4 text-purple-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toastMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="hover:text-white">✕</button>
        </div>
      )}

      {/* Header do Workspace do Grafo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div>
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Grafo de Inteligência OSINT & Vínculos Multidimensionais
            </h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
              GRAPH WORKSPACE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Mapeamento analítico de entidades, infraestruturas, publicações e relações observáveis em fontes abertas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Busca rápida */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar nós..."
              className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500 font-mono w-32 sm:w-40"
            />
          </div>

          {/* Filtro por tipo de nó */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          >
            <option value="TODOS">Todos os Nós ({nodes.length})</option>
            <option value="PESSOA">Pessoas</option>
            <option value="EMPRESA">Empresas</option>
            <option value="DOMINIO">Domínios</option>
            <option value="TELEFONE_PUBLICO">Telefones</option>
            <option value="IP">Endereços IP</option>
            <option value="DOCUMENTO">Documentos</option>
          </select>

          <button
            onClick={handleExportGraphJson}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
            title="Exportar dados do grafo em JSON"
          >
            <FileDown className="w-3.5 h-3.5 text-amber-400" />
            <span>Exportar JSON</span>
          </button>

          <button
            onClick={() => setShowNewNodeModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Entidade</span>
          </button>

          <button
            onClick={() => setShowNewRelModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 shadow-md cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Vincular</span>
          </button>
        </div>
      </div>

      {/* Grid: Canvas do Grafo + Inspector de Nós/Arestas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Canvas de Nós e Vínculos (2 Colunas) */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-6 min-h-[460px] relative overflow-hidden flex flex-col justify-between shadow-2xl">
          {/* Grade de fundo */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:20px_20px]"></div>

          {/* Nós em Grid Interativo */}
          <div className="z-10 space-y-4">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
              Entidades no Grafo ({filteredNodes.length}):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {filteredNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => {
                      setSelectedNode(node);
                      setSelectedEdge(null);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer shadow-lg ${
                      isSelected
                        ? "bg-slate-900 border-amber-500 shadow-amber-500/20"
                        : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1.5">
                      {getNodeIcon(node.type)}
                      <span className="text-[10px] font-mono text-amber-400 truncate">{node.type}</span>
                    </div>
                    <span className="text-xs font-bold text-white block truncate">{node.label}</span>
                    {node.identifier && (
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">
                        {node.identifier}
                      </span>
                    )}
                    {node.riskScore !== undefined && (
                      <span className="text-[10px] font-mono text-rose-400 block mt-1">
                        Risco: {(node.riskScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Relações Mapeadas (Arestas) */}
          <div className="z-10 pt-4 border-t border-slate-800/80 space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
              Arestas & Correlações ({edges.length}):
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {edges.map((edge) => {
                const srcNode = nodes.find((n) => n.id === edge.source);
                const tgtNode = nodes.find((n) => n.id === edge.target);
                const isSelected = selectedEdge?.id === edge.id;

                return (
                  <div
                    key={edge.id}
                    onClick={() => {
                      setSelectedEdge(edge);
                      setSelectedNode(null);
                    }}
                    className={`p-2 rounded-lg text-xs font-mono border flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-slate-900 border-amber-500"
                        : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-white font-bold">{srcNode?.label || edge.source}</span>
                      <span className="text-amber-400 text-[10px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {edge.relation}
                      </span>
                      <span className="text-white font-bold">{tgtNode?.label || edge.target}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 shrink-0">
                      <span>Conf: {(edge.confidence * 100).toFixed(0)}%</span>
                      <span className="text-emerald-400">✓</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Painel Lateral: Inspector de Nó / Aresta */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Info className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Inspector de Inteligência
            </h4>
          </div>

          {selectedNode && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2">
                  {getNodeIcon(selectedNode.type)}
                  <span className="text-white font-bold text-sm">{selectedNode.label}</span>
                </div>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 inline-block">
                  CATEGORIA: {selectedNode.type}
                </span>
                {selectedNode.identifier && (
                  <div className="text-[11px] text-slate-300">
                    <span className="text-slate-500 block text-[10px]">Identificador Cadastral:</span>
                    {selectedNode.identifier}
                  </div>
                )}
                {selectedNode.riskScore !== undefined && (
                  <div className="text-[11px] text-slate-300">
                    <span className="text-slate-500 block text-[10px]">Score de Risco Analítico:</span>
                    <span className="text-rose-400 font-bold">{(selectedNode.riskScore * 100).toFixed(0)} / 100</span>
                  </div>
                )}
              </div>

              {/* Conexões do Nó */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block">
                  Vínculos Desta Entidade:
                </span>
                {edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).map((e) => {
                  const otherNode = nodes.find((n) => n.id === (e.source === selectedNode.id ? e.target : e.source));
                  return (
                    <div key={e.id} className="p-2 bg-slate-950 rounded border border-slate-800 text-[11px] space-y-0.5">
                      <div className="flex justify-between text-amber-400 font-bold">
                        <span>{e.relation}</span>
                        <span className="text-slate-400 text-[10px]">{(e.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <span className="text-white block">{otherNode?.label}</span>
                      <span className="text-[10px] text-slate-500 block">Fonte: {e.sourceName}</span>
                    </div>
                  );
                })}
              </div>

              {/* Ação de Vinculação Direta ao Caso */}
              <button
                onClick={() => handleLinkNodeToCase(selectedNode)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 py-2 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Vincular Entidade ao CASO-2026-001</span>
              </button>
            </div>
          )}

          {selectedEdge && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="text-white font-bold block">Vínculo: {selectedEdge.relation}</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                  CONFIANÇA: {(selectedEdge.confidence * 100).toFixed(0)}%
                </span>

                <div className="pt-2 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-500 text-[10px] block">Fonte de Origem:</span>
                  <span className="text-white">{selectedEdge.sourceName}</span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block">Referência de Evidência:</span>
                  <span className="text-slate-300 bg-slate-950 p-1.5 rounded border border-slate-800 block text-[11px]">
                    {selectedEdge.evidenceRef}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Data de Registro:</span>
                    <span className="text-slate-300">{selectedEdge.createdAt}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Validado Por:</span>
                    <span className="text-emerald-400 font-bold">{selectedEdge.validatedBy || "Perito Humano"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Nova Entidade */}
      {showNewNodeModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Adicionar Entidade ao Grafo</h3>
              <button onClick={() => setShowNewNodeModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateNode} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Nome / Rótulo da Entidade</label>
                <input
                  type="text"
                  required
                  value={newNodeLabel}
                  onChange={(e) => setNewNodeLabel(e.target.value)}
                  placeholder="Ex: Dr. Manuel V. ou 185.220.101.45"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Tipo de Entidade</label>
                <select
                  value={newNodeType}
                  onChange={(e) => setNewNodeType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                >
                  <option value="PESSOA">Pessoa</option>
                  <option value="EMPRESA">Empresa</option>
                  <option value="ORGANIZACAO">Organização</option>
                  <option value="DOMINIO">Domínio</option>
                  <option value="IP">Endereço IP</option>
                  <option value="TELEFONE_PUBLICO">Telefone</option>
                  <option value="DOCUMENTO">Documento</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Identificador Público (NIF, IMEI, BGP, etc.)</label>
                <input
                  type="text"
                  value={newNodeIdentifier}
                  onChange={(e) => setNewNodeIdentifier(e.target.value)}
                  placeholder="Ex: NIF 002918239LA041 ou AS9009"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Score de Risco Preliminar (0.0 a 1.0)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={newNodeRisk}
                  onChange={(e) => setNewNodeRisk(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewNodeModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg"
                >
                  Criar Entidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Vincular Entidades Manualmente */}
      {showNewRelModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Criar Novo Vínculo de Inteligência</h3>
              <button onClick={() => setShowNewRelModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddRelationship} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Entidade de Origem</label>
                <select
                  value={newRelSource}
                  onChange={(e) => setNewRelSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.label} ({n.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Tipo de Relação</label>
                <select
                  value={newRelType}
                  onChange={(e) => setNewRelType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                >
                  <option value="ASSOCIATED_WITH">ASSOCIATED_WITH (Associado a)</option>
                  <option value="REGISTERED_TO">REGISTERED_TO (Registado em nome de)</option>
                  <option value="HOSTED_ON">HOSTED_ON (Hospedado em)</option>
                  <option value="USES">USES (Utiliza)</option>
                  <option value="REFERENCES">REFERENCES (Referencia)</option>
                  <option value="MENTIONS">MENTIONS (Menciona)</option>
                  <option value="SIMILAR_TO">SIMILAR_TO (Similar a)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Entidade de Destino</label>
                <select
                  value={newRelTarget}
                  onChange={(e) => setNewRelTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.label} ({n.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Evidência / Fonte Probatória</label>
                <input
                  type="text"
                  required
                  value={newRelEvidence}
                  onChange={(e) => setNewRelEvidence(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewRelModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg cursor-pointer"
                >
                  Salvar Relação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
