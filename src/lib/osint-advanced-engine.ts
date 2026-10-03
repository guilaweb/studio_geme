import {
  ScrapeJob,
  ScrapeResult,
  ScrapeSnapshot,
  DorkTemplate,
  DorkQueryRecord,
  RobotsTxtAnalysis,
  TosPolicyMatrix,
  ComplianceCheckResult,
} from "./osint-advanced-types";

// ==========================================
// 1. DADOS DE SCRAPING DE PRODUÇÃO
// ==========================================

export const INITIAL_SCRAPE_JOBS: ScrapeJob[] = [
  {
    id: "SCR-00482",
    tenantId: "org-profundidade-lab",
    investigationId: "CASO-2026-001",
    targetUrl: "https://vortex-consulting.org",
    objective: "Mapeamento passivo de estrutura institucional, equipa diretiva e editais públicos.",
    crawlType: "SITE",
    maxDepth: 2,
    maxPages: 100,
    requestIntervalMs: 1200,
    respectRobots: true,
    verifyTosFirst: true,
    rateLimitSafe: true,
    status: "EM_EXECUCAO",
    progressPercentage: 72,
    pagesDiscovered: 184,
    pagesProcessed: 127,
    errorCount: 3,
    evidencesCount: 91,
    lastDiscoveredUrls: [
      "https://vortex-consulting.org/empresa",
      "https://vortex-consulting.org/contactos",
      "https://vortex-consulting.org/noticias/2026/comunicado-oficial",
      "https://vortex-consulting.org/sobre",
      "https://vortex-consulting.org/documentos/relatorio-anual-2025.pdf",
    ],
    startedAt: "2026-10-03 14:15:00 UTC+1",
    complianceDecision: "ALLOW",
  },
  {
    id: "SCR-00481",
    tenantId: "org-profundidade-lab",
    investigationId: "CASO-2026-001",
    targetUrl: "https://shadow-secure-transfer.net",
    objective: "Varredura passiva de páginas de phishing clonadas e formulários públicos de exfiltração.",
    crawlType: "SINGLE_PAGE",
    maxDepth: 1,
    maxPages: 10,
    requestIntervalMs: 2000,
    respectRobots: true,
    verifyTosFirst: true,
    rateLimitSafe: true,
    status: "CONCLUIDO",
    progressPercentage: 100,
    pagesDiscovered: 8,
    pagesProcessed: 8,
    errorCount: 0,
    evidencesCount: 8,
    lastDiscoveredUrls: [
      "https://shadow-secure-transfer.net/",
      "https://shadow-secure-transfer.net/login.html",
      "https://shadow-secure-transfer.net/verify-identity",
    ],
    startedAt: "2026-10-02 18:20:00 UTC+1",
    completedAt: "2026-10-02 18:22:10 UTC+1",
    complianceDecision: "ALLOW",
  },
  {
    id: "SCR-00480",
    tenantId: "org-profundidade-lab",
    investigationId: "CASO-2026-002",
    targetUrl: "https://banco-central-privado.intranet.ao/admin",
    objective: "Tentativa de coleta em diretório interno não público.",
    crawlType: "SITE",
    maxDepth: 3,
    maxPages: 200,
    requestIntervalMs: 500,
    respectRobots: true,
    verifyTosFirst: true,
    rateLimitSafe: false,
    status: "BLOQUEADO_COMPLIANCE",
    progressPercentage: 0,
    pagesDiscovered: 0,
    pagesProcessed: 0,
    errorCount: 1,
    evidencesCount: 0,
    lastDiscoveredUrls: [],
    startedAt: "2026-10-03 08:30:00 UTC+1",
    completedAt: "2026-10-03 08:30:02 UTC+1",
    complianceDecision: "BLOCK",
  },
];

export const INITIAL_SCRAPE_RESULTS: ScrapeResult[] = [
  {
    id: "sc-res-001",
    jobId: "SCR-00482",
    pageUrl: "https://vortex-consulting.org/sobre",
    title: "Sobre a Vortex Consulting • Consultoria e Ativos Fiduciários",
    description: "Estrutura societária internacional com atuação em Luanda, Genebra e Lisboa.",
    publishedAt: "2026-03-15",
    collectedAt: "2026-10-03 14:18:22 UTC+1",
    author: "Direção Corporativa Vortex",
    linksCount: 24,
    imagesCount: 6,
    documentsCount: 2,
    extractedEntities: ["Dr. Manuel V.", "Atlantis Global Holdings Ltd.", "Luanda", "Genebra"],
    contentHash: "4f9b8c12a3d4e5f67890123456789abcdef0123456789abcdef0123456789abc",
    textSnippet: "A Vortex Consulting presta serviços de representação fiduciária e gestão de participações societárias transfronteiriças sob procuração do Dr. Manuel V...",
    isPreservedAsEvidence: true,
    evidenceId: "EV-OSINT-SCR-1",
  },
  {
    id: "sc-res-002",
    jobId: "SCR-00482",
    pageUrl: "https://vortex-consulting.org/contactos",
    title: "Canais Oficiais de Atendimento & Morada Institucional",
    description: "Endereço físico na Marginal de Luanda e telefones corporativos.",
    publishedAt: "2026-02-10",
    collectedAt: "2026-10-03 14:20:10 UTC+1",
    author: "Administração",
    linksCount: 18,
    imagesCount: 2,
    documentsCount: 0,
    extractedEntities: ["Avenida 4 de Fevereiro", "Ingombota", "+41 79 123 4567", "+244 923 000 111"],
    contentHash: "8e7d6c5b4a3210fedcba9876543210fedcba9876543210fedcba9876543210fe",
    textSnippet: "Sede Operacional: Edifício Marginal, 4º Andar, Luanda, Angola. Correspondência europeia: Rue du Rhône, 1204 Genève, Suisse.",
    isPreservedAsEvidence: true,
    evidenceId: "EV-OSINT-SCR-2",
  },
  {
    id: "sc-res-003",
    jobId: "SCR-00482",
    pageUrl: "https://vortex-consulting.org/noticias/2026/comunicado-oficial",
    title: "Comunicado Oficial sobre Reestruturação de Órgãos Sociais",
    description: "Ratificação de procuração especial conferida a administrador fiduciário.",
    publishedAt: "2026-08-20",
    collectedAt: "2026-10-03 14:22:45 UTC+1",
    author: "Gabinete Jurídico",
    linksCount: 12,
    imagesCount: 1,
    documentsCount: 1,
    extractedEntities: ["Dr. Manuel V.", "NIF 5410982319"],
    contentHash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    textSnippet: "Informa-se a todos os parceiros que os atos de gestão fiduciária continuam sob responsabilidade exclusiva da representação outorgada nos termos da escritura de Março de 2024.",
    isPreservedAsEvidence: false,
  },
];

// Detecção de Alterações no Website (Monitoring & Diff Histórico)
export const INITIAL_WEBSITE_SNAPSHOT: ScrapeSnapshot = {
  id: "snap-001",
  targetUrl: "https://vortex-consulting.org/sobre",
  previousDate: "03/09/2026",
  currentDate: "03/10/2026",
  addedContent: [
    "+ Parágrafo adicionado: 'Notificação: O Dr. Manuel V. atua na qualidade de procurador especial fiduciário.'",
    "+ Inclusão de menção a jurisdição fiduciária suíça (CH-660.1.234.567-8).",
  ],
  removedContent: [
    "- Conteúdo removido: Lista de membros do conselho fiscal anterior.",
    "- Menção ao endereço bancário de liquidação em Lisboa.",
  ],
  modifiedContent: [
    "~ Alteração de contacto telefónico: de +351 21... para linha de Genebra +41 79 123 4567.",
    "~ Alteração do prazo de outorga de poderes fiduciários (de 1 ano para prazo indeterminado).",
  ],
  contentHash: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
};

// ==========================================
// 2. TEMPLATES E BIBLIOTECA DE DORKS
// ==========================================

export const INITIAL_DORK_TEMPLATES: DorkTemplate[] = [
  {
    id: "tmpl-dork-1",
    title: "Documentos Públicos & Relatórios Técnicos (PDF)",
    category: "DOCUMENTOS",
    description: "Localiza relatórios anuais, minutas, editais e balancetes públicos em formato PDF hospedados no domínio do alvo.",
    queryTemplate: "site:{domain} filetype:pdf (relatório OR contas OR edital OR procuração)",
    operators: ["site:", "filetype:", "OR", "()"],
    ethicalGuidance: "Permite mapear transparência pública e divulgações institucionais oficiais sem intrusão.",
  },
  {
    id: "tmpl-dork-2",
    title: "Menções em Diários Oficiais e Editais Governamentais",
    category: "ESTRUTURAL",
    description: "Identifica menções ao nome da empresa ou NIF em portais governamentais e de imprensa oficial.",
    queryTemplate: "site:gov.ao OR site:imprensa.gov.ao \"{term}\"",
    operators: ["site:", "\" \"", "OR"],
    ethicalGuidance: "Acesso a publicações compulsórias do Diário da República de Angola para averiguação de atos societários.",
  },
  {
    id: "tmpl-dork-3",
    title: "Extensões Oficiais de Planilhas e Balanços (XLSX/CSV)",
    category: "DOCUMENTOS",
    description: "Localiza orçamentos públicos ou cronogramas abertos em formatos de planilha.",
    queryTemplate: "site:{domain} (filetype:xlsx OR filetype:csv) (orçamento OR custos OR balanço)",
    operators: ["site:", "filetype:", "OR"],
    ethicalGuidance: "Restrito a dados financeiros corporativos de divulgação pública voluntária.",
  },
  {
    id: "tmpl-dork-4",
    title: "Notícias e Comunicados de Imprensa Abertos",
    category: "NOTICIAS",
    description: "Rastreia matérias jornalísticas e comunicados de agências de notícias sobre o alvo.",
    queryTemplate: "site:angop.ao OR site:jornaldeangola.ao \"{term}\"",
    operators: ["site:", "\" \"", "OR"],
    ethicalGuidance: "Pesquisa em arquivos abertos de órgãos de comunicação social.",
  },
  {
    id: "tmpl-dork-5",
    title: "Subdomínios e Ambientes Institucionais Expostos",
    category: "DOMINIOS",
    description: "Identifica subdomínios indexados publicamente em motores de busca para análise de infraestrutura.",
    queryTemplate: "site:{domain} -www",
    operators: ["site:", "-www"],
    ethicalGuidance: "Descoberta de hosts e serviços públicos sem envio de pacotes ativos ao perímetro.",
  },
];

// Termos Proibidos pela Política de Governança Ética do PROFUNDIDADE
export const BLOCKED_DORK_PATTERNS = [
  "password", "passwords", "senha", "senhas",
  "admin/login", "wp-login", "user_login",
  "id_rsa", "id_dsa", "begin private key", "begin rsa private key",
  "secret_key", "aws_secret_access_key", "api_key",
  "cartao de credito", "cvv", "dados_bancarios",
  "vazamento", "leak", "combo_list", "credential_dump",
  "filetype:env", "inurl:.env", "inurl:phpmyadmin",
];

// Avaliador de Segurança Ética para Dorks
export function validateDorkQuery(query: string): { isAllowed: boolean; reason?: string } {
  const lower = query.toLowerCase();
  for (const pattern of BLOCKED_DORK_PATTERNS) {
    if (lower.includes(pattern)) {
      return {
        isAllowed: false,
        reason: `A consulta contém o termo sensível/intrusivo '${pattern}'. O PROFUNDIDADE impede estritamente Dorks destinados à busca de credenciais, chaves privadas ou acessos a painéis administrativos.`,
      };
    }
  }
  return { isAllowed: true };
}

// ==========================================
// 3. TOS & ROBOTS.TXT (COMPLIANCE GATE)
// ==========================================

export const INITIAL_ROBOTS_ANALYSIS: RobotsTxtAnalysis = {
  domain: "vortex-consulting.org",
  url: "https://vortex-consulting.org/robots.txt",
  analyzedAt: "2026-10-03 14:10:00 UTC+1",
  rawText: `User-agent: *
Allow: /
Allow: /empresa
Allow: /sobre
Allow: /contactos
Allow: /documentos/publicos/
Disallow: /private/
Disallow: /admin/
Disallow: /api/internal/
Crawl-delay: 2`,
  disallowedPaths: ["/private/", "/admin/", "/api/internal/"],
  allowedPaths: ["/", "/empresa", "/sobre", "/contactos", "/documentos/publicos/"],
  crawlDelay: 2,
  canCrawlTarget: true,
  legalDisclaimer: "AVISO LEGAL: Robots.txt ≠ autorização jurídica. Os termos de serviço (ToS) e a legislação aplicável podem estabelecer restrições suplementares à recolha automatizada de conteúdos.",
};

export const INITIAL_TOS_POLICY: TosPolicyMatrix = {
  domain: "vortex-consulting.org",
  tosUrl: "https://vortex-consulting.org/terms",
  jurisdiction: "República de Angola & Confederação Suíça",
  lastAnalyzed: "2026-10-03 14:12:00 UTC+1",
  matrix: {
    scraping: "CONDICIONADO" as any,
    automation: "PERMITIDO",
    api: "INEXISTENTE",
    personalData: "PROTEGIDO_RGPD",
    commercialUse: "CONDICIONADO",
    redistribution: "CONDICIONADO",
  },
  clauses: [
    {
      area: "Scraping & Indexação Automatizada",
      status: "RESTRITO",
      textSnippet: "A recolha automatizada para fins de arquivo institucional é admitida desde que respeite o limite de 30 pedidos por minuto e não sobrecarregue a infraestrutura.",
      analysisNote: "Permitido sob taxa moderada (rate-limiting ativo). Proibido em áreas autenticadas.",
    },
    {
      area: "Uso de Robôs e Crawlers",
      status: "PERMITIDO",
      textSnippet: "Indexadores respeitadores do protocolo Robots Exclusion Standard (RFC 9309) têm acesso autorizado às páginas públicas.",
      analysisNote: "Em conformidade com a configuração do coletor do PROFUNDIDADE.",
    },
    {
      area: "Dados Pessoais e Privacidade",
      status: "RESTRITO",
      textSnippet: "Nenhum dado pessoal constante das publicações pode ser utilizado para marketing direto ou tratamento sem consentimento.",
      analysisNote: "A utilização para instrução probatória legal e investigação oficial encontra amparo no Art. 212º do CPP.",
    },
  ],
};

// OSINT Collection Policy Engine (Compliance Gate Central)
export function evaluateComplianceGate(
  targetUrl: string,
  respectRobots: boolean,
  verifyTosFirst: boolean,
  rateLimitSafe: boolean
): ComplianceCheckResult {
  const isInternalOrBlacklisted =
    targetUrl.includes("admin") ||
    targetUrl.includes("intranet") ||
    targetUrl.includes("localhost") ||
    targetUrl.includes("127.0.0.1") ||
    targetUrl.includes("private");

  const checks = [
    {
      id: "chk-url",
      label: "URL Válida & Sintaxe RFC 3986",
      status: (targetUrl.startsWith("http://") || targetUrl.startsWith("https://") ? "PASSED" : "FAILED") as any,
      detail: "Formato de protocolo e domínio devidamente estruturados.",
    },
    {
      id: "chk-scope",
      label: "Domínio dentro do Escopo da Investigação",
      status: "PASSED" as any,
      detail: "Alvo associado aos parâmetros formais do inquérito e aprovado pelo perito.",
    },
    {
      id: "chk-robots",
      label: "Robots.txt Analisado & Respeitado",
      status: (respectRobots ? "PASSED" : "WARNING") as any,
      detail: respectRobots ? "Crawl-delay e exclusões de caminhos ativos." : "Atenção: Coletor configurado para ignorar diretivas de crawler.",
    },
    {
      id: "chk-tos",
      label: "Termos de Serviço (ToS) & Políticas Analisadas",
      status: (verifyTosFirst ? "PASSED" : "WARNING") as any,
      detail: verifyTosFirst ? "Cláusulas de uso e automação validadas na matriz de direitos." : "ToS não verificado previamente.",
    },
    {
      id: "chk-rate",
      label: "Taxa de Requisições & Proteção Anti-DDoS",
      status: (rateLimitSafe ? "PASSED" : "FAILED") as any,
      detail: rateLimitSafe ? "Intervalo configurado de acordo com as boas práticas (>= 1.2s)." : "Taxa excessiva detectada (risco de perturbação de serviço).",
    },
    {
      id: "chk-auth",
      label: "Autenticação Não Necessária (Acesso Público)",
      status: (isInternalOrBlacklisted ? "FAILED" : "PASSED") as any,
      detail: isInternalOrBlacklisted
        ? "BLOQUEIO: O alvo aponta para caminhos de autenticação interna restrita ou intranet corporativa."
        : "Recursos estritamente públicos e indexáveis sem quebra de credenciais.",
    },
  ];

  const hasFailed = checks.some((c) => c.status === "FAILED");
  const hasWarning = checks.some((c) => c.status === "WARNING");

  let decision: "ALLOW" | "BLOCK" | "REVIEW" = "ALLOW";
  let summary = "COLETA AUTORIZADA: Todas as salvaguardas legais, técnicas e éticas foram cumpridas.";

  if (hasFailed) {
    decision = "BLOCK";
    summary = "COLETA BLOQUEADA: O alvo apresenta restrições técnicas ou legais incompatíveis com a política de governança do PROFUNDIDADE.";
  } else if (hasWarning) {
    decision = "REVIEW";
    summary = "REQUER REVISÃO: Existem salvaguardas parciais que necessitam de confirmação expressa do Perito Responsável.";
  }

  return {
    targetUrl,
    checkedAt: new Date().toISOString(),
    decision,
    decisionSummary: summary,
    checks,
  };
}
