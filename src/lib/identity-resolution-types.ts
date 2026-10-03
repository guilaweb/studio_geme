export type IdentityDetectedType =
  | "TELEFONE"
  | "PERFIL_SOCIAL"
  | "EMAIL_PUBLICO"
  | "DOMINIO"
  | "EMPRESA"
  | "PESSOA_NOME"
  | "IDENTIFICADOR_GERAL";

export type IdentityLinkState =
  | "NAO_VERIFICADO"
  | "POSSIVEL"
  | "CORROBORADO"
  | "VALIDADO"
  | "REJEITADO";

export type IdentitySourceType = "PUBLICO" | "AUTORIZADO" | "REGISTO_OFICIAL";

// 1. Número de Telefone (Separando Observado vs Associado vs Titular Confirmado)
export interface PhoneObservedInstance {
  url: string;
  sourceTitle: string;
  snippet: string;
  dateObserved: string;
  sourceType: IdentitySourceType;
  contentHash: string;
}

export interface PhoneAssociatedEntity {
  id: string;
  entityName: string;
  entityType: "PESSOA" | "EMPRESA" | "ORGANIZACAO";
  relationship: string;
  confidence: number; // ex: 82%
  isConfirmed: boolean;
  statusText: "Possível correspondência" | "Não confirmado" | "Corroborado documentalmente";
  sourceName: string;
  sourceUrl: string;
  indicators: string[];
}

export interface PhoneIdentityRecord {
  phoneNumber: string; // E.164 ex: "+244 923 000 111"
  rawInput: string;
  country: string;
  countryCode: string;
  carrierPrefix?: string;
  lineType: "Móvel" | "Fixo" | "VoIP Corporativo" | "Desconhecido";
  publicSourcesCount: number;
  observedInstances: PhoneObservedInstance[];
  associatedEntities: PhoneAssociatedEntity[];
  confirmedHolder: {
    hasConfirmedHolder: boolean;
    holderName?: string;
    legalBasis?: string;
    authoritySource?: string;
    verificationStatus: "NAO_CONFIRMADO" | "CONFIRMADO_OFICIAL" | "FORNECIDO_AUTORIZADO";
    disclaimer: string;
  };
}

// 2. Perfil de Rede Social
export interface SocialProfileRecord {
  id: string;
  handle: string; // ex: "@joaomanuel"
  platform: "LinkedIn" | "Twitter/X" | "GitHub" | "Facebook" | "Instagram" | "Web Aberta";
  profileUrl: string;
  publicName: string;
  bio: string;
  website?: string;
  observedAt: string;
  publicIdentifiers: string[];
  relatedProfiles: Array<{
    platform: string;
    handle: string;
    url: string;
    relationType: string;
  }>;
  mentionedEntities: string[];
  publicImages: string[];
  crossReferences: string[];
  possibleMatches: Array<{
    targetName: string;
    confidence: number;
    indicators: string[];
    evidenceCount: number;
    evidenceIds: string[];
  }>;
}

// 3. Grafo de Identidade (Nós e Ligações com Metadados Probatórios)
export interface IdentityGraphNode {
  id: string;
  label: string;
  type: "PESSOA" | "TELEFONE" | "PERFIL" | "EMPRESA" | "WEBSITE" | "DOMINIO" | "EMAIL";
  identifier: string;
  primaryDetails?: string;
  avatarUrl?: string;
}

export interface IdentityGraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string; // ex: "Contacto divulgado em", "Administrador societário de", "Mesmo handle de"
  sourceTitle: string;
  evidenceHash: string; // SHA-256
  dateObserved: string;
  confidence: number; // 0 a 100%
  state: IdentityLinkState;
  validatorName?: string;
  notes?: string;
}

// 4. Correspondência de Resolução de Entidade (Entity Resolution Match)
export interface EntityResolutionCandidate {
  id: string;
  targetEntityName: string;
  candidateType: "PESSOA" | "EMPRESA";
  confidencePercentage: number;
  indicators: Array<{
    name: string;
    matched: boolean;
    description: string;
  }>;
  sources: string[];
  state: IdentityLinkState;
  hypothesisDisclaimer: string;
}

// 5. Fonte de Identidade (Tabela Rastreável)
export interface IdentitySourceRecord {
  id: string;
  name: string;
  url: string;
  sourceType: IdentitySourceType;
  status: "ATIVO" | "VERIFICADO" | "DESATUALIZADO";
  lastChecked: string;
  evidenceHash: string;
  associatedCaseId: string;
}

// 6. Histórico de Pesquisas de Identidade
export interface IdentitySearchHistoryRecord {
  id: string;
  query: string;
  detectedType: IdentityDetectedType;
  executedAt: string;
  resultsCount: number;
  matchedEntitySummary?: string;
}
