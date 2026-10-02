const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface UserSummary {
  id: string;
  email: string;
  full_name: string;
  is_superuser: boolean;
}

export interface OrgSummary {
  id: string;
  name: string;
  role_name: string;
  status: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserSummary;
  organizations: OrgSummary[];
  active_organization_id?: string;
}

export interface CaseItem {
  id: string;
  organization_id: string;
  case_number: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  tags: string[];
  created_at: string;
}

export interface CaseStats {
  total_cases: number;
  open_cases: number;
  active_cases: number;
  pending_review: number;
  closed_cases: number;
  high_priority: number;
}

export interface EntityItem {
  id: string;
  organization_id: string;
  case_id?: string;
  type: string;
  name: string;
  identifier?: string;
  risk_score: number;
  status: string;
  attributes: Record<string, any>;
  created_at: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  risk_score: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  confidence: number;
  is_inferred_by_si: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface EvidenceCustodyEvent {
  id: string;
  action: string;
  recorded_hash: string;
  notes?: string;
  created_at: string;
}

export interface EvidenceItem {
  id: string;
  organization_id: string;
  case_id: string;
  title: string;
  description?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  sha256_hash: string;
  source?: string;
  version: number;
  status: string;
  collected_at: string;
  custody_events: EvidenceCustodyEvent[];
}

export interface SiInference {
  id: string;
  case_id: string;
  inference_type: string;
  title: string;
  explanation: string;
  confidence_score: number;
  is_automated: boolean;
  legal_disclaimer: string;
  human_validation_status: "PENDING" | "CONFIRMED" | "REJECTED";
  created_at: string;
}

export interface ReportItem {
  id: string;
  case_id: string;
  title: string;
  report_type: string;
  content_markdown: string;
  status: string;
  cryptographic_seal_hash?: string;
  approved_at?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  user_email?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  severity: string;
  ip_address?: string;
  details: Record<string, any>;
  created_at: string;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("profundidade_token");
  }

  private getOrgId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("profundidade_org_id");
  }

  private getHeaders(isFormData = false): HeadersInit {
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const orgId = this.getOrgId();
    if (orgId) {
      headers["X-Organization-ID"] = orgId;
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isFormData = options.body instanceof FormData;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(isFormData),
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Erro na API: ${res.status}`);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("profundidade_token", data.access_token);
      if (data.active_organization_id) {
        localStorage.setItem("profundidade_org_id", data.active_organization_id);
      }
    }
    return data;
  }

  async selectTenant(orgId: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>("/auth/select-tenant", {
      method: "POST",
      body: JSON.stringify({ organization_id: orgId }),
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("profundidade_token", data.access_token);
      localStorage.setItem("profundidade_org_id", orgId);
    }
    return data;
  }

  async getMe() {
    return this.request<any>("/auth/me");
  }

  // Organizations
  async listOrganizations(): Promise<any[]> {
    return this.request<any[]>("/organizations");
  }

  async createOrganization(name: string, nif?: string, province?: string): Promise<any> {
    return this.request<any>("/organizations", {
      method: "POST",
      body: JSON.stringify({ name, nif, province }),
    });
  }

  async listMembers(orgId: string): Promise<any[]> {
    return this.request<any[]>(`/organizations/${orgId}/members`);
  }

  async addMember(orgId: string, email: string, fullName: string, roleName: string): Promise<any> {
    return this.request<any>(`/organizations/${orgId}/members`, {
      method: "POST",
      body: JSON.stringify({ email, full_name: fullName, role_name: roleName }),
    });
  }

  // Cases
  async listCases(search?: string, status?: string): Promise<CaseItem[]> {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    return this.request<CaseItem[]>(`/cases?${params.toString()}`);
  }

  async getCaseStats(): Promise<CaseStats> {
    return this.request<CaseStats>("/cases/stats");
  }

  async getCase(id: string): Promise<CaseItem> {
    return this.request<CaseItem>(`/cases/${id}`);
  }

  async createCase(title: string, description?: string, priority = "MEDIUM", tags: string[] = []): Promise<CaseItem> {
    return this.request<CaseItem>("/cases", {
      method: "POST",
      body: JSON.stringify({ title, description, priority, tags }),
    });
  }

  // Entities
  async listEntities(caseId?: string): Promise<EntityItem[]> {
    const q = caseId ? `?case_id=${encodeURIComponent(caseId)}` : "";
    return this.request<EntityItem[]>(`/entities${q}`);
  }

  async createEntity(payload: { case_id: string; type: string; name: string; identifier?: string; risk_score?: number }): Promise<EntityItem> {
    return this.request<EntityItem>("/entities", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Relationships & Graph
  async getGraphData(caseId: string): Promise<GraphData> {
    return this.request<GraphData>(`/relationships/graph/${caseId}`);
  }

  async createRelationship(payload: { case_id: string; source_entity_id: string; target_entity_id: string; relation_type: string; notes?: string }): Promise<any> {
    return this.request<any>("/relationships", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Evidence
  async listEvidence(caseId: string): Promise<EvidenceItem[]> {
    return this.request<EvidenceItem[]>(`/evidence?case_id=${encodeURIComponent(caseId)}`);
  }

  async uploadEvidence(formData: FormData): Promise<EvidenceItem> {
    return this.request<EvidenceItem>("/evidence/upload", {
      method: "POST",
      body: formData,
    });
  }

  async verifyEvidence(evidenceId: string): Promise<{ is_valid: boolean; message: string; computed_hash: string }> {
    return this.request<any>(`/evidence/${evidenceId}/verify`, {
      method: "POST",
    });
  }

  // Analysis & SI
  async runAnalysis(caseId: string, analysisType: string): Promise<any> {
    return this.request<any>("/analysis/run", {
      method: "POST",
      body: JSON.stringify({ case_id: caseId, analysis_type: analysisType }),
    });
  }

  async generateSi(caseId: string, focusArea = "ENTITY_DISCOVERY"): Promise<SiInference[]> {
    return this.request<SiInference[]>("/si/generate", {
      method: "POST",
      body: JSON.stringify({ case_id: caseId, focus_area: focusArea }),
    });
  }

  async listInferences(caseId: string): Promise<SiInference[]> {
    return this.request<SiInference[]>(`/si/inferences?case_id=${encodeURIComponent(caseId)}`);
  }

  async validateSi(inferenceId: string, status: "CONFIRMED" | "REJECTED", rationale: string): Promise<SiInference> {
    return this.request<SiInference>(`/si/inferences/${inferenceId}/validate`, {
      method: "POST",
      body: JSON.stringify({ validation_status: status, rationale }),
    });
  }

  // Reports
  async listReports(caseId: string): Promise<ReportItem[]> {
    return this.request<ReportItem[]>(`/reports?case_id=${encodeURIComponent(caseId)}`);
  }

  async generateReport(caseId: string, title: string, reportType = "INVESTIGATION_DOSSIER"): Promise<ReportItem> {
    return this.request<ReportItem>("/reports/generate", {
      method: "POST",
      body: JSON.stringify({ case_id: caseId, title, report_type: reportType }),
    });
  }

  async sealReport(reportId: string): Promise<ReportItem> {
    return this.request<ReportItem>(`/reports/${reportId}/seal`, {
      method: "POST",
    });
  }

  // Audit
  async listAuditLogs(): Promise<AuditLogItem[]> {
    return this.request<AuditLogItem[]>("/audit?limit=50");
  }
}

export const profundidadeApi = new ApiClient();
