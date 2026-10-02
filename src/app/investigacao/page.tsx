"use client";

import React, { useState, useEffect } from "react";
import {
  profundidadeApi,
  CaseItem,
  CaseStats,
  EntityItem,
  GraphData,
  EvidenceItem,
  SiInference,
  ReportItem,
  AuditLogItem,
  OrgSummary,
} from "@/lib/profundidade-api";
import {
  Shield,
  FolderOpen,
  Users,
  Search,
  Plus,
  FileText,
  Activity,
  Layers,
  CheckCircle,
  AlertTriangle,
  Upload,
  RefreshCw,
  LogOut,
  Building2,
  Lock,
  Eye,
  FileCheck,
  Cpu,
} from "lucide-react";

export default function InvestigacaoWorkspace() {
  // Session & Tenant State
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>("");

  // Auth form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // App Navigation Tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "cases" | "case_detail" | "audit">("dashboard");

  // Operational Data
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [caseTab, setCaseTab] = useState<"entities" | "graph" | "evidence" | "si" | "reports">("entities");

  // Case details data
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [inferences, setInferences] = useState<SiInference[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Modals & Forms
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseDesc, setNewCaseDesc] = useState("");
  const [newCasePriority, setNewCasePriority] = useState("MEDIUM");

  const [showNewEntityModal, setShowNewEntityModal] = useState(false);
  const [entName, setEntName] = useState("");
  const [entType, setEntType] = useState("INDIVIDUAL");
  const [entIdentifier, setEntIdentifier] = useState("");
  const [entRisk, setEntRisk] = useState(0.2);

  const [showNewRelModal, setShowNewRelModal] = useState(false);
  const [relSourceId, setRelSourceId] = useState("");
  const [relTargetId, setRelTargetId] = useState("");
  const [relType, setRelType] = useState("ASSOCIATE_OF");

  const [showUploadEvidenceModal, setShowUploadEvidenceModal] = useState(false);
  const [evTitle, setEvTitle] = useState("");
  const [evSource, setEvSource] = useState("");
  const [evFile, setEvFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Init auth from localStorage
  useEffect(() => {
    const t = localStorage.getItem("profundidade_token");
    const org = localStorage.getItem("profundidade_org_id");
    if (t) {
      setToken(t);
      if (org) setActiveOrgId(org);
      loadSession();
    }
  }, []);

  const loadSession = async () => {
    try {
      setLoading(true);
      const me = await profundidadeApi.getMe();
      setCurrentUser(me.user);
      const userOrgs = await profundidadeApi.listOrganizations();
      setOrgs(userOrgs);
      if (userOrgs.length > 0 && !activeOrgId) {
        setActiveOrgId(userOrgs[0].id);
        localStorage.setItem("profundidade_org_id", userOrgs[0].id);
      }
      refreshDashboard();
    } catch (err: any) {
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await profundidadeApi.login(email, password);
      setToken(res.access_token);
      setCurrentUser(res.user);
      setOrgs(res.organizations);
      if (res.active_organization_id) {
        setActiveOrgId(res.active_organization_id);
      }
      refreshDashboard();
    } catch (err: any) {
      setAuthError(err.message || "Erro de autenticação.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("profundidade_token");
    localStorage.removeItem("profundidade_org_id");
    setToken(null);
    setCurrentUser(null);
    setSelectedCase(null);
    setActiveTab("dashboard");
  };

  const handleSelectOrg = async (orgId: string) => {
    try {
      setLoading(true);
      await profundidadeApi.selectTenant(orgId);
      setActiveOrgId(orgId);
      setSelectedCase(null);
      refreshDashboard();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboard = async () => {
    try {
      const [s, c] = await Promise.all([
        profundidadeApi.getCaseStats(),
        profundidadeApi.listCases(),
      ]);
      setStats(s);
      setCases(c);
    } catch (err: any) {
      console.error(err);
    }
  };

  const selectCase = async (c: CaseItem) => {
    setSelectedCase(c);
    setActiveTab("case_detail");
    loadCaseDetails(c.id);
  };

  const loadCaseDetails = async (caseId: string) => {
    try {
      setLoading(true);
      const [ents, graph, evs, infs, reps] = await Promise.all([
        profundidadeApi.listEntities(caseId),
        profundidadeApi.getGraphData(caseId),
        profundidadeApi.listEvidence(caseId),
        profundidadeApi.listInferences(caseId),
        profundidadeApi.listReports(caseId),
      ]);
      setEntities(ents);
      setGraphData(graph);
      setEvidenceList(evs);
      setInferences(infs);
      setReports(reps);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Case Actions
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const newCase = await profundidadeApi.createCase(newCaseTitle, newCaseDesc, newCasePriority);
      setShowNewCaseModal(false);
      setNewCaseTitle("");
      setNewCaseDesc("");
      setActionSuccess(`Caso ${newCase.case_number} registado com sucesso.`);
      refreshDashboard();
      selectCase(newCase);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Entity Actions
  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      setLoading(true);
      await profundidadeApi.createEntity({
        case_id: selectedCase.id,
        type: entType,
        name: entName,
        identifier: entIdentifier,
        risk_score: Number(entRisk),
      });
      setShowNewEntityModal(false);
      setEntName("");
      setEntIdentifier("");
      setActionSuccess("Entidade vinculada com sucesso.");
      loadCaseDetails(selectedCase.id);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Relationship Actions
  const handleCreateRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      setLoading(true);
      await profundidadeApi.createRelationship({
        case_id: selectedCase.id,
        source_entity_id: relSourceId,
        target_entity_id: relTargetId,
        relation_type: relType,
      });
      setShowNewRelModal(false);
      setActionSuccess("Relacionamento mapeado no grafo.");
      loadCaseDetails(selectedCase.id);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Evidence Actions
  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !evFile) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("case_id", selectedCase.id);
      formData.append("title", evTitle);
      formData.append("source", evSource);
      formData.append("file", evFile);

      const ev = await profundidadeApi.uploadEvidence(formData);
      setShowUploadEvidenceModal(false);
      setEvTitle("");
      setEvSource("");
      setEvFile(null);
      setActionSuccess(`Evidência registada sob hash SHA-256: ${ev.sha256_hash.slice(0, 16)}...`);
      loadCaseDetails(selectedCase.id);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEvidence = async (evId: string) => {
    try {
      setLoading(true);
      const res = await profundidadeApi.verifyEvidence(evId);
      if (res.is_valid) {
        setActionSuccess(`Integridade confirmada! Hash verificado: ${res.computed_hash.slice(0, 16)}...`);
      } else {
        setActionError(`ALERTA: Integridade violada! ${res.message}`);
      }
      if (selectedCase) loadCaseDetails(selectedCase.id);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // SI Actions
  const handleTriggerSi = async () => {
    if (!selectedCase) return;
    try {
      setLoading(true);
      const results = await profundidadeApi.generateSi(selectedCase.id);
      setActionSuccess(`${results.length} inferências analíticas automatizadas foram geradas para validação humana.`);
      loadCaseDetails(selectedCase.id);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateSi = async (infId: string, status: "CONFIRMED" | "REJECTED") => {
    const rationale = prompt(`Insira o parecer/justificativa para ${status === "CONFIRMED" ? "CONFIRMAR" : "REJEITAR"}:`);
    if (!rationale) return;
    try {
      setLoading(true);
      await profundidadeApi.validateSi(infId, status, rationale);
      setActionSuccess(`Inferência SI classificada como ${status}. Auditoria registada.`);
      if (selectedCase) loadCaseDetails(selectedCase.id);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Report Actions
  const handleGenerateReport = async () => {
    if (!selectedCase) return;
    try {
      setLoading(true);
      const rep = await profundidadeApi.generateReport(
        selectedCase.id,
        `Dossier Pericial - Caso ${selectedCase.case_number}`
      );
      setActionSuccess("Relatório operacional consolidado a partir do banco de dados.");
      loadCaseDetails(selectedCase.id);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSealReport = async (repId: string) => {
    if (!confirm("Deseja selar criptograficamente este relatório? Após a selagem, o registo será imutável.")) return;
    try {
      setLoading(true);
      const sealed = await profundidadeApi.sealReport(repId);
      setActionSuccess(`Relatório selado com sucesso! Selo SHA-256: ${sealed.cryptographic_seal_hash?.slice(0, 16)}...`);
      if (selectedCase) loadCaseDetails(selectedCase.id);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadAudit = async () => {
    setActiveTab("audit");
    try {
      setLoading(true);
      const logs = await profundidadeApi.listAuditLogs();
      setAuditLogs(logs);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // LOGIN SCREEN
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">PROFUNDIDADE</h1>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Sistema Operacional de Inteligência</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Profissional</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="investigador@organizacao.ao"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Palavra-passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Autenticar no Sistema</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              Ambiente restrito com isolamento multi-tenant e cadeia de custódia ininterrupta.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // MAIN INVESTIGATIVE WORKSPACE
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-bold tracking-tight text-white text-base">PROFUNDIDADE</span>
          </div>

          <div className="h-5 w-px bg-slate-800" />

          {/* Tenant Selector */}
          <div className="flex items-center space-x-2 text-xs">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">Organização:</span>
            <select
              value={activeOrgId}
              onChange={(e) => handleSelectOrg(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500 font-medium"
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Navigation Tabs & User */}
        <div className="flex items-center space-x-4">
          <nav className="flex space-x-1">
            <button
              onClick={() => { setActiveTab("dashboard"); setSelectedCase(null); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "dashboard" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Painel Operacional
            </button>
            <button
              onClick={() => { setActiveTab("cases"); setSelectedCase(null); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "cases" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Casos ({cases.length})
            </button>
            <button
              onClick={handleLoadAudit}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "audit" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Auditoria
            </button>
          </nav>

          <div className="h-5 w-px bg-slate-800" />

          <div className="flex items-center space-x-3 text-xs">
            <div className="text-right">
              <p className="font-medium text-white">{currentUser?.full_name}</p>
              <p className="text-[10px] text-slate-400">{currentUser?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Terminar Sessão"
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Notifications / Alerts banner */}
      {actionSuccess && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/30 text-emerald-300 text-xs px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="hover:text-white">✕</button>
        </div>
      )}
      {actionError && (
        <div className="bg-rose-950/80 border-b border-rose-500/30 text-rose-300 text-xs px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="hover:text-white">✕</button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {/* VIEW 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Centro de Comando Analítico</h2>
                <p className="text-xs text-slate-400">Métricas operacionais consolidadas em tempo real a partir da base de dados.</p>
              </div>
              <button
                onClick={() => setShowNewCaseModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Abrir Novo Caso</span>
              </button>
            </div>

            {/* Real Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Casos Totais</span>
                  <FolderOpen className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-white">{stats?.total_cases ?? 0}</p>
                <span className="text-[10px] text-slate-500">Sob isolamento de tenant</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Em Investigação Activa</span>
                  <Activity className="w-4 h-4 text-sky-400" />
                </div>
                <p className="text-2xl font-bold text-white">{(stats?.open_cases ?? 0) + (stats?.active_cases ?? 0)}</p>
                <span className="text-[10px] text-sky-400">Diligências em curso</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Alta Prioridade</span>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-2xl font-bold text-white">{stats?.high_priority ?? 0}</p>
                <span className="text-[10px] text-rose-400">Exige intervenção imediata</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Concluídos / Arquivados</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-white">{stats?.closed_cases ?? 0}</p>
                <span className="text-[10px] text-emerald-400">Dossiers finalizados</span>
              </div>
            </div>

            {/* Recent Cases Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Casos Recentes</h3>
                <span className="text-xs text-slate-400">{cases.length} registados</span>
              </div>

              {cases.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Nenhum caso investigativo criado nesta organização. Clique em &quot;Abrir Novo Caso&quot; para iniciar.
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {cases.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => selectCase(c)}
                      className="p-4 hover:bg-slate-800/50 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-xs text-amber-400 font-medium">{c.case_number}</span>
                        <div>
                          <p className="text-sm font-medium text-white">{c.title}</p>
                          <p className="text-xs text-slate-400 truncate max-w-lg">{c.description || "Sem descrição arquivada."}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          c.priority === "CRITICAL" ? "bg-rose-500/20 text-rose-300" :
                          c.priority === "HIGH" ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-300"
                        }`}>
                          {c.priority}
                        </span>
                        <span className="text-xs text-slate-400">{c.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: CASES LIST */}
        {activeTab === "cases" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Dossiers e Casos Investigativos</h2>
                <p className="text-xs text-slate-400">Todos os processos registados sob a alçada da sua organização.</p>
              </div>
              <button
                onClick={() => setShowNewCaseModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Caso</span>
              </button>
            </div>

            <div className="grid gap-3">
              {cases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectCase(c)}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs text-amber-400 font-semibold">{c.case_number}</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString("pt-AO")}</span>
                    </div>
                    <h3 className="text-base font-semibold text-white">{c.title}</h3>
                    <p className="text-xs text-slate-400 max-w-2xl">{c.description || "Sem descrição operacional arquivada."}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded">{c.status}</span>
                    <button className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 rounded text-xs font-medium">
                      Abrir Workspace →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: CASE DETAIL WORKSPACE */}
        {activeTab === "case_detail" && selectedCase && (
          <div className="space-y-6">
            {/* Case Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-sm font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded">
                    {selectedCase.case_number}
                  </span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">{selectedCase.priority}</span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">{selectedCase.status}</span>
                </div>
                <button
                  onClick={() => handleGenerateReport()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3.5 py-1.5 rounded-lg text-xs flex items-center space-x-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Gerar Relatório Pericial</span>
                </button>
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">{selectedCase.title}</h1>
              <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">{selectedCase.description}</p>
            </div>

            {/* Case Operational Sub-Tabs */}
            <div className="flex border-b border-slate-800 space-x-2">
              <button
                onClick={() => setCaseTab("entities")}
                className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                  caseTab === "entities" ? "border-amber-400 text-amber-400" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Entidades ({entities.length})</span>
              </button>

              <button
                onClick={() => setCaseTab("graph")}
                className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                  caseTab === "graph" ? "border-amber-400 text-amber-400" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Grafo de Relacionamentos</span>
              </button>

              <button
                onClick={() => setCaseTab("evidence")}
                className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                  caseTab === "evidence" ? "border-amber-400 text-amber-400" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Evidências & Custódia ({evidenceList.length})</span>
              </button>

              <button
                onClick={() => setCaseTab("si")}
                className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                  caseTab === "si" ? "border-amber-400 text-amber-400" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>SI - Inteligência ({inferences.length})</span>
              </button>

              <button
                onClick={() => setCaseTab("reports")}
                className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                  caseTab === "reports" ? "border-amber-400 text-amber-400" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>Relatórios & Dossiers ({reports.length})</span>
              </button>
            </div>

            {/* TAB: ENTITIES */}
            {caseTab === "entities" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-400">Pessoas, empresas, veículos e activos vinculados a este processo.</p>
                  <button
                    onClick={() => setShowNewEntityModal(true)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Entidade</span>
                  </button>
                </div>

                {entities.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                    Nenhuma entidade registada neste caso investigativo.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {entities.map((e) => (
                      <div key={e.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-medium">
                            {e.type}
                          </span>
                          <span className={`text-[10px] font-semibold ${
                            e.risk_score >= 0.7 ? "text-rose-400" : e.risk_score >= 0.4 ? "text-amber-400" : "text-emerald-400"
                          }`}>
                            Risco: {(e.risk_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <h4 className="font-semibold text-white text-sm">{e.name}</h4>
                        <p className="text-xs text-slate-400 font-mono">
                          ID/NIF: {e.identifier || "Não especificado"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: GRAPH & RELATIONSHIPS */}
            {caseTab === "graph" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-400">Visualização de vínculos operacionais e nós da rede investigada.</p>
                  <button
                    onClick={() => setShowNewRelModal(true)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Mapear Relacionamento</span>
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[350px] flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Conexões Mapeadas ({graphData?.edges.length ?? 0})</h4>
                    {graphData?.edges.length === 0 ? (
                      <p className="text-xs text-slate-500 py-6 text-center">Nenhum relacionamento documentado entre as entidades registadas.</p>
                    ) : (
                      <div className="grid gap-2">
                        {graphData?.edges.map((edge) => {
                          const srcNode = graphData.nodes.find((n) => n.id === edge.source);
                          const tgtNode = graphData.nodes.find((n) => n.id === edge.target);
                          return (
                            <div key={edge.id} className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between text-xs">
                              <span className="font-medium text-white">{srcNode?.label || "Entidade"}</span>
                              <div className="flex items-center space-x-2 text-slate-400 font-mono text-[11px]">
                                <span>───</span>
                                <span className="bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-sans">{edge.label}</span>
                                <span>───►</span>
                              </div>
                              <span className="font-medium text-white">{tgtNode?.label || "Entidade"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: EVIDENCE & CUSTODY */}
            {caseTab === "evidence" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-400">Repositório de provas com cálculo de hash SHA-256 e cadeia de custódia auditada.</p>
                  <button
                    onClick={() => setShowUploadEvidenceModal(true)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Adquirir Evidência</span>
                  </button>
                </div>

                {evidenceList.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                    Nenhuma evidência registada sob custódia formal neste caso.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {evidenceList.map((ev) => (
                      <div key={ev.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-white">{ev.title}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                              v{ev.version}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              ev.status === "VERIFIED" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                            }`}>
                              {ev.status}
                            </span>
                          </div>
                          <button
                            onClick={() => handleVerifyEvidence(ev.id)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs flex items-center space-x-1 transition-colors"
                          >
                            <Shield className="w-3 h-3 text-amber-400" />
                            <span>Verificar Integridade SHA-256</span>
                          </button>
                        </div>

                        <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80 font-mono text-[11px] text-slate-400 flex items-center justify-between">
                          <span className="truncate">SHA-256: <strong className="text-emerald-400">{ev.sha256_hash}</strong></span>
                          <span className="text-slate-500 ml-2">{(ev.file_size / 1024).toFixed(1)} KB</span>
                        </div>

                        {/* Custody events */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cadeia de Custódia ({ev.custody_events.length} registos)</span>
                          <div className="space-y-1 text-[11px] text-slate-400">
                            {ev.custody_events.map((ce) => (
                              <div key={ce.id} className="flex items-center space-x-2">
                                <span className="text-slate-500">{new Date(ce.created_at).toLocaleTimeString("pt-AO")}:</span>
                                <span className="font-semibold text-slate-300">{ce.action}</span>
                                <span>- {ce.notes}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: SI (INTELLIGENCE) */}
            {caseTab === "si" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Sistema de Inteligência (SI)</h3>
                    <p className="text-xs text-slate-400">
                      Resultados automatizados sujeitos a validação humana obrigatória (Regras 16 &amp; 17).
                    </p>
                  </div>
                  <button
                    onClick={handleTriggerSi}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Executar Inferência SI</span>
                  </button>
                </div>

                {inferences.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                    Nenhuma hipótese gerada por SI. Clique em &quot;Executar Inferência SI&quot; para analisar correlações no caso.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inferences.map((inf) => (
                      <div key={inf.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-amber-300">{inf.title}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            inf.human_validation_status === "CONFIRMED" ? "bg-emerald-500/20 text-emerald-300" :
                            inf.human_validation_status === "REJECTED" ? "bg-rose-500/20 text-rose-300" : "bg-amber-500/20 text-amber-300"
                          }`}>
                            Validação: {inf.human_validation_status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{inf.explanation}</p>

                        <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded text-[11px] text-amber-400/90 italic">
                          {inf.legal_disclaimer}
                        </div>

                        {inf.human_validation_status === "PENDING" && (
                          <div className="flex items-center space-x-2 pt-2">
                            <button
                              onClick={() => handleValidateSi(inf.id, "CONFIRMED")}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1 rounded text-xs"
                            >
                              Confirmar Hipótese
                            </button>
                            <button
                              onClick={() => handleValidateSi(inf.id, "REJECTED")}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-3 py-1 rounded text-xs"
                            >
                              Rejeitar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: REPORTS */}
            {caseTab === "reports" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-400">Dossiers operacionais e certidões periciais autenticadas.</p>
                  <button
                    onClick={handleGenerateReport}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Gerar Novo Relatório</span>
                  </button>
                </div>

                {reports.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                    Nenhum relatório formal gerado para este caso.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((rep) => (
                      <div key={rep.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-base font-bold text-white">{rep.title}</h4>
                            <p className="text-xs text-slate-400">{rep.report_type} • {new Date(rep.created_at).toLocaleDateString("pt-AO")}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2.5 py-1 rounded font-semibold ${
                              rep.status === "SEALED" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                            }`}>
                              {rep.status}
                            </span>
                            {rep.status !== "SEALED" && (
                              <button
                                onClick={() => handleSealReport(rep.id)}
                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1 rounded text-xs"
                              >
                                Selar Criptograficamente
                              </button>
                            )}
                          </div>
                        </div>

                        {rep.cryptographic_seal_hash && (
                          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded text-xs font-mono text-emerald-300 flex items-center justify-between">
                            <span>Selo SHA-256: {rep.cryptographic_seal_hash}</span>
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          </div>
                        )}

                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 text-xs text-slate-300 max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">
                          {rep.content_markdown}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Trilha de Auditoria e Conformidade</h2>
              <p className="text-xs text-slate-400">Registo cronológico imutável de todas as acções operacionais e sensíveis nesta organização.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 text-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-amber-400">{log.action}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{log.user_email || "Sistema"}</span>
                      {log.ip_address && <span className="text-slate-500">({log.ip_address})</span>}
                    </div>
                    <p className="text-slate-400 font-mono text-[11px] truncate max-w-xl">
                      {JSON.stringify(log.details)}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {new Date(log.created_at).toLocaleString("pt-AO")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: NEW CASE */}
      {showNewCaseModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Criar Novo Caso Investigativo</h3>
            <form onSubmit={handleCreateCase} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Título do Caso</label>
                <input
                  type="text"
                  required
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  placeholder="Ex: Operação Diamante Oculto"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Descrição e Âmbito</label>
                <textarea
                  rows={3}
                  value={newCaseDesc}
                  onChange={(e) => setNewCaseDesc(e.target.value)}
                  placeholder="Resumo dos fatos, enquadramento jurídico e suspeitas preliminares..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Prioridade Operacional</label>
                <select
                  value={newCasePriority}
                  onChange={(e) => setNewCasePriority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewCaseModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs"
                >
                  {loading ? "A criar..." : "Registar Caso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW ENTITY */}
      {showNewEntityModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Adicionar Entidade</h3>
            <form onSubmit={handleCreateEntity} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome / Designação</label>
                <input
                  type="text"
                  required
                  value={entName}
                  onChange={(e) => setEntName(e.target.value)}
                  placeholder="Ex: Manuel António Domingos"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Entidade</label>
                <select
                  value={entType}
                  onChange={(e) => setEntType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="INDIVIDUAL">Pessoa Singular</option>
                  <option value="ORGANIZATION">Empresa / Entidade Colectiva</option>
                  <option value="BANK_ACCOUNT">Conta Bancária / IBAN</option>
                  <option value="VEHICLE">Veículo / Embarcação</option>
                  <option value="PHONE">Contacto Telefónico</option>
                  <option value="DOCUMENT">Documento / Escritura</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Identificador Formal (NIF, IBAN, BI)</label>
                <input
                  type="text"
                  value={entIdentifier}
                  onChange={(e) => setEntIdentifier(e.target.value)}
                  placeholder="Ex: 5400998877"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewEntityModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs"
                >
                  Salvar Entidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW RELATIONSHIP */}
      {showNewRelModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Mapear Conexão no Grafo</h3>
            <form onSubmit={handleCreateRelationship} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Entidade de Origem</label>
                <select
                  required
                  value={relSourceId}
                  onChange={(e) => setRelSourceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Seleccione a origem...</option>
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Vínculo</label>
                <select
                  value={relType}
                  onChange={(e) => setRelType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="DIRECTOR_OF">Director / Administrador de</option>
                  <option value="OWNER_OF">Sócio / Proprietário de</option>
                  <option value="TRANSACTED_WITH">Transaccionou com</option>
                  <option value="ASSOCIATE_OF">Associado / Contacto de</option>
                  <option value="LOCATED_AT">Localizado em</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Entidade de Destino</label>
                <select
                  required
                  value={relTargetId}
                  onChange={(e) => setRelTargetId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Seleccione o destino...</option>
                  {entities.filter((e) => e.id !== relSourceId).map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewRelModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs"
                >
                  Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD EVIDENCE */}
      {showUploadEvidenceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Adquirir Evidência Digital</h3>
            <form onSubmit={handleUploadEvidence} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Designação da Prova</label>
                <input
                  type="text"
                  required
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  placeholder="Ex: Extracto Bancário BFA - Conta Corrente"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Origem da Apreensão / Fonte</label>
                <input
                  type="text"
                  value={evSource}
                  onChange={(e) => setEvSource(e.target.value)}
                  placeholder="Ex: Mandado de Busca e Apreensão nº 12/2026"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Ficheiro (PDF, Imagem, Binário)</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setEvFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-amber-500 file:text-slate-950 file:font-semibold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadEvidenceModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs"
                >
                  {loading ? "A calcular SHA-256..." : "Armazenar Evidência"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
