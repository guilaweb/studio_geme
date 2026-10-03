import {
  IdentityDetectedType,
  IdentityLinkState,
  PhoneIdentityRecord,
  SocialProfileRecord,
  IdentityGraphNode,
  IdentityGraphEdge,
  EntityResolutionCandidate,
  IdentitySourceRecord,
  IdentitySearchHistoryRecord,
} from "./identity-resolution-types";

// ========================================================
// 1. DETETOR AUTOMÁTICO DE IDENTIFICADORES
// ========================================================

export function detectIdentityInputType(input: string): IdentityDetectedType {
  const clean = input.trim();
  if (!clean) return "IDENTIFICADOR_GERAL";

  // Telefone (+244..., +351..., +41..., ou dígitos com separadores)
  if (/^\+?[0-9\s().-]{7,18}$/.test(clean) && clean.replace(/\D/g, "").length >= 7) {
    return "TELEFONE";
  }

  // Perfil Social (@handle ou URL de redes conhecidas)
  if (
    clean.startsWith("@") ||
    /https?:\/\/(www\.)?(linkedin|twitter|x|github|facebook|instagram|t\.me)\.com\/.+/i.test(clean)
  ) {
    return "PERFIL_SOCIAL";
  }

  // Email público
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return "EMAIL_PUBLICO";
  }

  // Domínio de internet
  if (/^[a-zA-Z0-9.-]+\.(com|ao|pt|org|net|io|co|gov|edu)(\/.*)?$/i.test(clean) && !clean.includes("@")) {
    return "DOMINIO";
  }

  // Empresa / Entidade Coletiva (Termos societários comuns)
  if (/\b(lda|sa|limitada|holdings|consulting|investimentos|banco|corp|inc|ltd)\b/i.test(clean)) {
    return "EMPRESA";
  }

  // Nome de Pessoa (2 ou mais palavras de texto comum)
  if (clean.split(/\s+/).length >= 2) {
    return "PESSOA_NOME";
  }

  return "IDENTIFICADOR_GERAL";
}

// ========================================================
// 2. REGISTOS DE TELEFONE (SEPARAÇÃO EPISTÉMICA)
// ========================================================

export const INITIAL_PHONE_RECORDS: PhoneIdentityRecord[] = [
  {
    phoneNumber: "+244 923 000 111",
    rawInput: "+244 923 000 111",
    country: "Angola",
    countryCode: "AO (+244)",
    carrierPrefix: "Unitel (Gama 923)",
    lineType: "Móvel",
    publicSourcesCount: 4,
    observedInstances: [
      {
        url: "https://vortex-consulting.org/contactos",
        sourceTitle: "Página Oficial de Contactos • Vortex Consulting",
        snippet: "Sede Operacional: Edifício Marginal, 4º Andar, Luanda. Linha Corporativa Direta: +244 923 000 111.",
        dateObserved: "2026-10-03",
        sourceType: "PUBLICO",
        contentHash: "8e7d6c5b4a3210fedcba9876543210fedcba9876543210fedcba9876543210fe",
      },
      {
        url: "https://imprensa.gov.ao/diario/edital-sociedades-2024.pdf",
        sourceTitle: "Diário da República de Angola • Registo de Sociedades",
        snippet: "A sociedade outorga procuração fiduciária e indica para notificações urgentes o número +244 923 000 111.",
        dateObserved: "2024-03-22",
        sourceType: "REGISTO_OFICIAL",
        contentHash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
      },
      {
        url: "https://conferenciabancaria.ao/oradores/2025",
        sourceTitle: "Programa da Conferência Internacional de Ativos Financeiros",
        snippet: "Secretariado do Dr. Manuel V.: contacto provisório +244 923 000 111 para credenciação.",
        dateObserved: "2025-11-14",
        sourceType: "PUBLICO",
        contentHash: "3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
      },
      {
        url: "https://directoriocomercial.ao/vortex-consulting",
        sourceTitle: "Diretório Comercial de Empresas de Luanda",
        snippet: "Vortex Consulting Lda - Prestação de Serviços Financeiros - Tel: +244 923 000 111.",
        dateObserved: "2025-06-10",
        sourceType: "PUBLICO",
        contentHash: "5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c",
      },
    ],
    associatedEntities: [
      {
        id: "assoc-ent-1",
        entityName: "Vortex Consulting Lda",
        entityType: "EMPRESA",
        relationship: "Contacto Corporativo Divulgado",
        confidence: 82,
        isConfirmed: false,
        statusText: "Possível correspondência",
        sourceName: "Website público da empresa",
        sourceUrl: "https://vortex-consulting.org/contactos",
        indicators: [
          "Mencionado como canal oficial em página institucional",
          "Correspondência com endereço físico em Luanda",
          "Citado em anúncio societário do Diário da República",
        ],
      },
      {
        id: "assoc-ent-2",
        entityName: "Dr. Manuel V.",
        entityType: "PESSOA",
        relationship: "Contacto Observado em Evento",
        confidence: 54,
        isConfirmed: false,
        statusText: "Não confirmado",
        sourceName: "Perfil público de conferência",
        sourceUrl: "https://conferenciabancaria.ao/oradores/2025",
        indicators: [
          "Aparece associado ao secretariado do orador num evento pontual",
          "Não constitui titularidade pessoal comprovada",
        ],
      },
    ],
    confirmedHolder: {
      hasConfirmedHolder: false,
      verificationStatus: "NAO_CONFIRMADO",
      disclaimer:
        "REGRA DE GOVERNANÇA: A titularidade jurídica de um número telefónico só é registada no PROFUNDIDADE mediante requisição judicial, ofício de operadora de telecomunicações ou consentimento formal do titular em inquérito. O sistema não utiliza nem indexa vazamentos de dados clandestinos ou plataformas de intrusão.",
    },
  },
  {
    phoneNumber: "+41 79 123 4567",
    rawInput: "+41 79 123 4567",
    country: "Suíça",
    countryCode: "CH (+41)",
    carrierPrefix: "Swisscom Mobile",
    lineType: "Móvel",
    publicSourcesCount: 2,
    observedInstances: [
      {
        url: "https://vortex-consulting.org/contactos",
        sourceTitle: "Correspondência Europeia • Vortex Consulting",
        snippet: "Gabinete de Genebra: Rue du Rhône, 1204 Genève. Linha direta: +41 79 123 4567.",
        dateObserved: "2026-10-03",
        sourceType: "PUBLICO",
        contentHash: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
      },
    ],
    associatedEntities: [
      {
        id: "assoc-ent-3",
        entityName: "Vortex Consulting (Sucursal Genebra)",
        entityType: "EMPRESA",
        relationship: "Contacto Internacional",
        confidence: 78,
        isConfirmed: false,
        statusText: "Possível correspondência",
        sourceName: "Website da empresa",
        sourceUrl: "https://vortex-consulting.org/contactos",
        indicators: ["Listado como terminal direto em Genebra", "Prefixo móvel corporativo suíço"],
      },
    ],
    confirmedHolder: {
      hasConfirmedHolder: false,
      verificationStatus: "NAO_CONFIRMADO",
      disclaimer: "Titularidade não confirmada perante autoridade de telecomunicações suíça (OFCOM).",
    },
  },
];

// ========================================================
// 3. REGISTOS DE PERFIS SOCIAIS
// ========================================================

export const INITIAL_SOCIAL_PROFILES: SocialProfileRecord[] = [
  {
    id: "soc-001",
    handle: "@manuel_v_fiduciario",
    platform: "LinkedIn",
    profileUrl: "https://linkedin.com/in/manuel-v-fiduciario",
    publicName: "Dr. Manuel V.",
    bio: "Gestão fiduciária internacional, direito societário e estruturação de veículos de investimento transfronteiriços. Luanda • Genebra • Lisboa.",
    website: "https://vortex-consulting.org",
    observedAt: "2026-10-03 12:10 UTC+1",
    publicIdentifiers: ["NIF 5410982319 (declarado)", "OAA 14.892 (Angola)"],
    relatedProfiles: [
      {
        platform: "Twitter/X",
        handle: "@manuelv_finance",
        url: "https://x.com/manuelv_finance",
        relationType: "Mesmo identificador visual e bio correlata",
      },
      {
        platform: "GitHub",
        handle: "@manuel-vortex",
        url: "https://github.com/manuel-vortex",
        relationType: "Contribuidor em repositório de minutas legais",
      },
    ],
    mentionedEntities: ["Vortex Consulting Lda", "Atlantis Global Holdings Ltd.", "Banco Central Privado"],
    publicImages: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    ],
    crossReferences: [
      "Mencionado como Administrador Fiduciário em Diário da República 2024",
      "Listado como orador na Conferência Bancária de Luanda 2025",
    ],
    possibleMatches: [
      {
        targetName: "Dr. Manuel V. (Alvo Principal CASO-2026-001)",
        confidence: 86,
        indicators: [
          "Mesmo nome público e patronímico verificado",
          "Mesmo website público declarado (vortex-consulting.org)",
          "Mesmo identificador profissional (Ordem dos Advogados)",
          "Referência cruzada documental em publicação oficial",
        ],
        evidenceCount: 5,
        evidenceIds: ["EV-OSINT-DRK-1", "EV-OSINT-SCR-1", "EV-OSINT-COMP-1"],
      },
    ],
  },
];

// ========================================================
// 4. GRAFO DE IDENTIDADE (NÓS & LIGAÇÕES COM VALIDAÇÃO)
// ========================================================

export const INITIAL_IDENTITY_GRAPH_NODES: IdentityGraphNode[] = [
  {
    id: "node-p1",
    label: "Pessoa A (Dr. Manuel V.)",
    type: "PESSOA",
    identifier: "Dr. Manuel V.",
    primaryDetails: "Alvo Sob Investigação • Advogado & Fiduciário",
  },
  {
    id: "node-t1",
    label: "Telefone (+244 923 000 111)",
    type: "TELEFONE",
    identifier: "+244 923 000 111",
    primaryDetails: "Linha Móvel Unitel (Angola)",
  },
  {
    id: "node-p_soc",
    label: "Perfil (@manuel_v_fiduciario)",
    type: "PERFIL",
    identifier: "@manuel_v_fiduciario",
    primaryDetails: "LinkedIn Executivo Público",
  },
  {
    id: "node-emp1",
    label: "Empresa (Vortex Consulting Lda)",
    type: "EMPRESA",
    identifier: "Vortex Consulting Lda",
    primaryDetails: "NIF 5410982319 • Sede em Luanda",
  },
  {
    id: "node-web1",
    label: "Website (vortex-consulting.org/sobre)",
    type: "WEBSITE",
    identifier: "https://vortex-consulting.org/sobre",
    primaryDetails: "Página Institucional Pública",
  },
  {
    id: "node-dom1",
    label: "Domínio (vortex-consulting.org)",
    type: "DOMINIO",
    identifier: "vortex-consulting.org",
    primaryDetails: "Registado em 2021 via Cloudflare DNS",
  },
  {
    id: "node-eml1",
    label: "Email (manuel.v@vortex-consulting.org)",
    type: "EMAIL",
    identifier: "manuel.v@vortex-consulting.org",
    primaryDetails: "SPF & DMARC Válidos",
  },
];

export const INITIAL_IDENTITY_GRAPH_EDGES: IdentityGraphEdge[] = [
  {
    id: "edge-1",
    sourceNodeId: "node-p1",
    targetNodeId: "node-t1",
    relationshipType: "Contacto Observado em Evento",
    sourceTitle: "Conferência Internacional de Ativos Financeiros",
    evidenceHash: "3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
    dateObserved: "2025-11-14",
    confidence: 65,
    state: "POSSIVEL",
    validatorName: "Perito Silva",
    notes: "O número foi apontado como canal de secretariado do orador.",
  },
  {
    id: "edge-2",
    sourceNodeId: "node-p1",
    targetNodeId: "node-p_soc",
    relationshipType: "Mesmo Nome e Atividade Profissional",
    sourceTitle: "LinkedIn Perfil Público",
    evidenceHash: "4f9b8c12a3d4e5f67890123456789abcdef0123456789abcdef0123456789abc",
    dateObserved: "2026-10-03",
    confidence: 88,
    state: "CORROBORADO",
    validatorName: "Perito Silva",
    notes: "Corroboração cruzada com publicações oficiais da Ordem dos Advogados.",
  },
  {
    id: "edge-3",
    sourceNodeId: "node-p1",
    targetNodeId: "node-emp1",
    relationshipType: "Administrador / Procurador Fiduciário",
    sourceTitle: "Diário da República III Série Nº 45",
    evidenceHash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    dateObserved: "2024-03-22",
    confidence: 96,
    state: "VALIDADO",
    validatorName: "Procurador Responsável",
    notes: "Escritura pública registada em cartório notarial.",
  },
  {
    id: "edge-4",
    sourceNodeId: "node-t1",
    targetNodeId: "node-web1",
    relationshipType: "Contacto Exibido no Rodapé",
    sourceTitle: "Website Institucional da Empresa",
    evidenceHash: "8e7d6c5b4a3210fedcba9876543210fedcba9876543210fedcba9876543210fe",
    dateObserved: "2026-10-03",
    confidence: 92,
    state: "CORROBORADO",
    validatorName: "Analista Forense OSINT",
  },
  {
    id: "edge-5",
    sourceNodeId: "node-p_soc",
    targetNodeId: "node-web1",
    relationshipType: "Website Declarado na Biografia",
    sourceTitle: "LinkedIn Perfil Público",
    evidenceHash: "5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c",
    dateObserved: "2026-10-03",
    confidence: 90,
    state: "CORROBORADO",
    validatorName: "Perito Silva",
  },
  {
    id: "edge-6",
    sourceNodeId: "node-emp1",
    targetNodeId: "node-dom1",
    relationshipType: "Titularidade Institucional Declarada",
    sourceTitle: "Whois & Registo de Marca",
    evidenceHash: "7b8a9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    dateObserved: "2026-10-02",
    confidence: 85,
    state: "CORROBORADO",
    validatorName: "Analista Forense OSINT",
  },
  {
    id: "edge-7",
    sourceNodeId: "node-web1",
    targetNodeId: "node-dom1",
    relationshipType: "Host & Resolução DNS",
    sourceTitle: "Certificate Transparency Logs",
    evidenceHash: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
    dateObserved: "2026-10-03",
    confidence: 100,
    state: "VALIDADO",
    validatorName: "Sistema Automatizado",
  },
  {
    id: "edge-8",
    sourceNodeId: "node-p1",
    targetNodeId: "node-eml1",
    relationshipType: "Conta de Correio Corporativa",
    sourceTitle: "Publicações Técnicas e Cabeçalhos PGP",
    evidenceHash: "2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b",
    dateObserved: "2026-09-18",
    confidence: 84,
    state: "CORROBORADO",
    validatorName: "Perito Silva",
  },
];

// ========================================================
// 5. CANDIDATOS DE RESOLUÇÃO DE ENTIDADES (CORRESPONDÊNCIAS)
// ========================================================

export const INITIAL_ENTITY_CANDIDATES: EntityResolutionCandidate[] = [
  {
    id: "cand-001",
    targetEntityName: "Dr. Manuel V.",
    candidateType: "PESSOA",
    confidencePercentage: 86,
    indicators: [
      { name: "Mesmo nome público", matched: true, description: "Concordância fonética e ortográfica de 98% com os registos civis" },
      { name: "Mesmo website público", matched: true, description: "Apontamento direto para vortex-consulting.org" },
      { name: "Mesmo identificador profissional", matched: true, description: "Cédula de advogado e registo notarial coincidentes" },
      { name: "Referência cruzada documental", matched: true, description: "Publicação no Diário da República vincula sócio ao escritório" },
    ],
    sources: [
      "Website público da empresa",
      "Perfil público LinkedIn",
      "Diário da República III Série",
      "Certificado SSL/TLS",
    ],
    state: "CORROBORADO",
    hypothesisDisclaimer:
      "AVISO METODOLÓGICO: Trata-se de uma hipótese de correlação analítica com base em 4 sinais públicos concordantes. Não deve ser interpretada como asserção de identidade civil definitiva sem certidão judicial de prova plena.",
  },
  {
    id: "cand-002",
    targetEntityName: "Vortex Consulting Lda vs Atlantis Global Holdings Ltd.",
    candidateType: "EMPRESA",
    confidencePercentage: 74,
    indicators: [
      { name: "Mesma morada física", matched: true, description: "Edifício Marginal 4º Andar, Luanda" },
      { name: "Mesmo procurador especial", matched: true, description: "Ambas representadas por Dr. Manuel V." },
      { name: "Prefixo telefónico correlacionado", matched: false, description: "Uma utiliza linha de Luanda e a outra de Genebra" },
      { name: "Domínio partilhado", matched: true, description: "Servidores de correio hospedados no mesmo ASN 13335" },
    ],
    sources: ["Pactos societários", "Whois DNS", "Diários Oficiais"],
    state: "POSSIVEL",
    hypothesisDisclaimer:
      "Vínculo de interposição societária provável. Requer requisição formal de registo comercial transfronteiriço.",
  },
];

// ========================================================
// 6. FONTES DA IDENTIDADE (CATÁLOGO RASTREÁVEL)
// ========================================================

export const INITIAL_IDENTITY_SOURCES: IdentitySourceRecord[] = [
  {
    id: "src-id-01",
    name: "Website Oficial da Vortex Consulting",
    url: "https://vortex-consulting.org",
    sourceType: "PUBLICO",
    status: "ATIVO",
    lastChecked: "2026-10-03 14:20 UTC+1",
    evidenceHash: "8e7d6c5b4a3210fedcba9876543210fedcba9876543210fedcba9876543210fe",
    associatedCaseId: "CASO-2026-001",
  },
  {
    id: "src-id-02",
    name: "Perfil Executivo Profissional (LinkedIn)",
    url: "https://linkedin.com/in/manuel-v-fiduciario",
    sourceType: "PUBLICO",
    status: "VERIFICADO",
    lastChecked: "2026-10-03 12:10 UTC+1",
    evidenceHash: "4f9b8c12a3d4e5f67890123456789abcdef0123456789abcdef0123456789abc",
    associatedCaseId: "CASO-2026-001",
  },
  {
    id: "src-id-03",
    name: "Diário da República de Angola (Imprensa Oficial)",
    url: "https://imprensa.gov.ao",
    sourceType: "REGISTO_OFICIAL",
    status: "VERIFICADO",
    lastChecked: "2026-10-02 18:30 UTC+1",
    evidenceHash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    associatedCaseId: "CASO-2026-001",
  },
  {
    id: "src-id-04",
    name: "Documento Fornecido pelo Utente em Reclamação",
    url: "custodia://evidencias/doc-fornecido-recl-048.pdf",
    sourceType: "AUTORIZADO",
    status: "VERIFICADO",
    lastChecked: "2026-10-01 10:15 UTC+1",
    evidenceHash: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    associatedCaseId: "CASO-2026-001",
  },
];

// ========================================================
// 7. HISTÓRICO DE PESQUISAS DE IDENTIDADE
// ========================================================

export const INITIAL_IDENTITY_SEARCH_HISTORY: IdentitySearchHistoryRecord[] = [
  {
    id: "hist-id-01",
    query: "+244 923 000 111",
    detectedType: "TELEFONE",
    executedAt: "03 Out 2026 14:15",
    resultsCount: 4,
    matchedEntitySummary: "Vortex Consulting Lda (82%) • Dr. Manuel V. (54%)",
  },
  {
    id: "hist-id-02",
    query: "@manuel_v_fiduciario",
    detectedType: "PERFIL_SOCIAL",
    executedAt: "03 Out 2026 12:05",
    resultsCount: 3,
    matchedEntitySummary: "Dr. Manuel V. (86% correspondência)",
  },
  {
    id: "hist-id-03",
    query: "manuel.v@vortex-consulting.org",
    detectedType: "EMAIL_PUBLICO",
    executedAt: "02 Out 2026 19:40",
    resultsCount: 5,
    matchedEntitySummary: "Vortex Consulting • SPF/DMARC Válidos",
  },
];
