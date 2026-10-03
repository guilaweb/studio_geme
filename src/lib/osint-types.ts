export type OsintTargetType =
  | "PESSOA"
  | "EMPRESA"
  | "ORGANIZACAO"
  | "PERFIL_PUBLICO"
  | "PAGINA_PUBLICA"
  | "DOMINIO"
  | "WEBSITE"
  | "URL"
  | "EMAIL_PUBLICO"
  | "TELEFONE_PUBLICO"
  | "IP"
  | "IMAGEM"
  | "DOCUMENTO"
  | "NOTICIA"
  | "OUTRO_IDENTIFICADOR";

export type OsintConnectorType =
  | "SearchConnector"
  | "WebConnector"
  | "DomainConnector"
  | "DNSConnector"
  | "CertificateConnector"
  | "PublicDocumentConnector"
  | "PublicNewsConnector"
  | "SocialPublicConnector"
  | "ImageConnector"
  | "CustomConnector";

export interface OsintSource {
  id: string;
  name: string;
  type: OsintConnectorType;
  category: "WEB" | "DNS" | "DOMINIOS" | "CERTIFICADOS" | "DOCUMENTOS" | "NOTICIAS" | "SOCIAL" | "IMAGEM";
  status: "ONLINE" | "CONFIGURADA" | "NAO_CONFIGURADA" | "INDISPONIVEL";
  description: string;
  reliabilityScore: number; // 0.0 a 1.0
  rateLimit: string;
  requiresApiKey: boolean;
}

export interface OsintResult {
  id: string;
  searchId: string;
  source: string;
  sourceType: OsintConnectorType;
  category: "WEB" | "NOTICIAS" | "DOMINIOS" | "CERTIFICADOS" | "DOCUMENTOS" | "IMAGENS" | "PERFIS" | "EMPRESAS";
  url: string;
  title: string;
  snippet: string;
  publishedAt: string;
  collectedAt: string;
  contentHash: string; // SHA-256
  entities: string[];
  indicators: string[];
  rawReference?: string;
  isPreservedAsEvidence?: boolean;
  evidenceId?: string;
}

export interface OsintDiscovery {
  id: string;
  searchId?: string;
  investigationId?: string;
  title: string;
  description: string;
  type: "OBSERVACAO" | "INDICIO" | "CORRELACAO" | "EVIDENCIA_DOCUMENTADA";
  sources: string[];
  evidences: string[];
  validationStatus: "VALIDADO" | "REJEITADO" | "EM_ANALISE";
  validatorNotes?: string;
  createdAt: string;
  validatedBy?: string;
}

export interface OsintEntity {
  id: string;
  name: string;
  type: "PESSOA" | "EMPRESA" | "ORGANIZACAO" | "DOMINIO" | "EMAIL" | "TELEFONE" | "IP" | "CARTEIRA";
  identifiers: string[];
  riskScore: number;
  sourcesCount: number;
  lastObserved: string;
  associatedDomain?: string;
}

export interface OsintEntityResolutionMatch {
  id: string;
  primaryEntity: OsintEntity;
  matchedEntity: OsintEntity;
  confidenceScore: number; // ex: 0.82 (82%)
  indicators: {
    label: string;
    verified: boolean;
  }[];
  evidencesCount: number;
  status: "PENDENTE" | "VALIDADO" | "REJEITADO";
}

export interface OsintGraphNode {
  id: string;
  label: string;
  type:
    | "PESSOA"
    | "EMPRESA"
    | "ORGANIZACAO"
    | "PERFIL"
    | "PAGINA"
    | "WEBSITE"
    | "DOMINIO"
    | "EMAIL_PUBLICO"
    | "TELEFONE_PUBLICO"
    | "IP"
    | "IMAGEM"
    | "DOCUMENTO"
    | "NOTICIA"
    | "EVENTO"
    | "LOCALIZACAO_PUBLICA";
  riskScore?: number;
  identifier?: string;
}

export interface OsintGraphEdge {
  id: string;
  source: string;
  target: string;
  relation:
    | "MENTIONS"
    | "LINKS_TO"
    | "REFERENCES"
    | "PUBLISHED"
    | "ASSOCIATED_WITH"
    | "USES"
    | "REPOSTS"
    | "SIMILAR_TO"
    | "REGISTERED_TO"
    | "HOSTED_ON";
  confidence: number;
  sourceName: string;
  evidenceRef: string;
  createdAt: string;
  validatedBy?: string;
}

export interface OsintTimelineEvent {
  id: string;
  date: string;
  year: number;
  month: string;
  title: string;
  description: string;
  sourceOrigin: string;
  sourceType: string;
  contentHash: string;
  reliability: "CONFIRMADO" | "OBSERVADO_PUBLICAMENTE" | "CORRELACIONADO";
}

export interface OsintCollectorJob {
  id: string;
  tenantId: string;
  investigationId: string;
  connector: OsintConnectorType;
  target: string;
  requestedBy: string;
  startedAt: string;
  completedAt?: string;
  status: "EXECUTANDO" | "CONCLUIDO" | "FALHOU" | "AGUARDANDO";
  resultsCount: number;
  logSummary: string;
}

export interface OsintSearchRecord {
  id: string;
  targetQuery: string;
  targetType: OsintTargetType;
  contextNotes: string;
  investigationRef?: string;
  status: "CONCLUIDA" | "EM_ANALISE" | "AGUARDANDO_FONTES";
  resultsCount: number;
  discoveriesCount: number;
  createdAt: string;
  requestedBy: string;
}
