export type ScrapeCrawlType = "SINGLE_PAGE" | "SITE" | "URL_LIST" | "SITEMAP";

export interface ScrapeJob {
  id: string;
  tenantId: string;
  investigationId: string;
  targetUrl: string;
  objective: string;
  crawlType: ScrapeCrawlType;
  maxDepth: number;
  maxPages: number;
  requestIntervalMs: number;
  respectRobots: boolean;
  verifyTosFirst: boolean;
  rateLimitSafe: boolean;
  status: "EM_EXECUCAO" | "CONCLUIDO" | "BLOQUEADO_COMPLIANCE" | "FALHOU" | "AGENDADO";
  progressPercentage: number;
  pagesDiscovered: number;
  pagesProcessed: number;
  errorCount: number;
  evidencesCount: number;
  lastDiscoveredUrls: string[];
  startedAt: string;
  completedAt?: string;
  complianceDecision?: "ALLOW" | "BLOCK" | "REVIEW";
}

export interface ScrapeResult {
  id: string;
  jobId: string;
  pageUrl: string;
  title: string;
  description: string;
  publishedAt: string;
  collectedAt: string;
  author?: string;
  linksCount: number;
  imagesCount: number;
  documentsCount: number;
  extractedEntities: string[];
  contentHash: string; // SHA-256
  textSnippet: string;
  isPreservedAsEvidence: boolean;
  evidenceId?: string;
}

export interface ScrapeSnapshot {
  id: string;
  targetUrl: string;
  previousDate: string;
  currentDate: string;
  addedContent: string[];
  removedContent: string[];
  modifiedContent: string[];
  contentHash: string;
}

export interface DorkTemplate {
  id: string;
  title: string;
  category: "DOCUMENTOS" | "DOMINIOS" | "NOTICIAS" | "ACADEMICO" | "ESTRUTURAL";
  description: string;
  queryTemplate: string;
  operators: string[];
  isBlockedEthical?: boolean;
  ethicalGuidance: string;
}

export interface DorkQueryRecord {
  id: string;
  queryText: string;
  engine: "Google" | "Bing" | "DuckDuckGo" | "MultiMotor";
  domain?: string;
  term?: string;
  inurl?: string;
  filetype?: string;
  dateRange?: string;
  executedAt: string;
  resultsCount: number;
  isEthicallyApproved: boolean;
  blockReason?: string;
}

export interface RobotsTxtAnalysis {
  domain: string;
  url: string;
  analyzedAt: string;
  rawText: string;
  disallowedPaths: string[];
  allowedPaths: string[];
  crawlDelay?: number;
  canCrawlTarget: boolean;
  legalDisclaimer: string;
}

export interface TosPolicyMatrix {
  domain: string;
  tosUrl: string;
  jurisdiction: string;
  lastAnalyzed: string;
  matrix: {
    scraping: "PERMITIDO" | "RESTRITO" | "PROIBIDO" | "NAO_ESPECIFICADO";
    automation: "PERMITIDO" | "RESTRITO" | "PROIBIDO" | "NAO_ESPECIFICADO";
    api: "DISPONIVEL" | "RESTRITA" | "INEXISTENTE" | "NAO_ESPECIFICADO";
    personalData: "PROTEGIDO_RGPD" | "NAO_RESTRITO" | "CONDICIONADO";
    commercialUse: "PERMITIDO" | "CONDICIONADO" | "PROIBIDO";
    redistribution: "PERMITIDO" | "PROIBIDO" | "CONDICIONADO";
  };
  clauses: Array<{
    area: string;
    status: "PERMITIDO" | "RESTRITO" | "PROIBIDO" | "NEUTRO";
    textSnippet: string;
    analysisNote: string;
  }>;
}

export interface ComplianceCheckResult {
  targetUrl: string;
  checkedAt: string;
  decision: "ALLOW" | "BLOCK" | "REVIEW";
  decisionSummary: string;
  checks: Array<{
    id: string;
    label: string;
    status: "PASSED" | "FAILED" | "WARNING";
    detail: string;
  }>;
}
