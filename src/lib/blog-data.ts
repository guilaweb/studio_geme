import { type Post } from '@/types/blog';

export const DEFAULT_BLOG_AUTHOR = {
    uid: 'active-user',
    displayName: 'Laboratório Profundidade Intelligence',
    role: 'Equipa de Investigação & Análise Forense',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
};

export function withActiveAuthor(
    post: Post,
    activeUser?: { uid?: string; displayName?: string | null; role?: string | null; email?: string | null; photoURL?: string | null; jobTitle?: string | null } | null
): Post {
    if (!activeUser) return post;
    const authorName = activeUser.displayName || (activeUser.email ? activeUser.email.split('@')[0] : null) || post.author?.displayName || 'Investigador Principal';
    const authorRole = activeUser.jobTitle || activeUser.role || post.author?.role || 'Perito de Inteligência Digital';
    return {
        ...post,
        author: {
            uid: activeUser.uid || post.author?.uid || 'active-user',
            displayName: authorName,
            role: authorRole,
            avatarUrl: activeUser.photoURL || post.author?.avatarUrl,
        }
    };
}

export const DEFAULT_BLOG_POSTS: Post[] = [
    // 1. ARTIGO EM DESTAQUE (FEATURED) — INVESTIGAÇÃO
    {
        id: 'seed-identidade-digital-autenticidade',
        title: 'Como Investigar a Autenticidade de uma Identidade Digital: Da Presença Superficial às Evidências Forenses',
        slug: 'como-investigar-autenticidade-identidade-digital',
        category: 'Investigação',
        excerpt: 'Metodologia passo a passo para analisar perfis em redes sociais, detectar sinais de manipulação, cruzar pegadas digitais, examinar metadados e estruturar um dossiê probatório verificável.',
        isPublished: true,
        isFeatured: true,
        readTimeMinutes: 14,
        views: 3420,
        tags: ['Identidade Digital', 'OSINT', 'Forense Digital', 'Verificação', 'Sociais', 'Metadados'],
        featureImageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-03-20T10:00:00Z'),
        updatedAt: new Date('2026-03-25T16:00:00Z'),
        content: `
# Como Investigar a Autenticidade de uma Identidade Digital

Uma identidade digital deixa rastros acumulados ao longo do tempo. Quando uma pessoa, organização ou ator malicioso cria uma presença online — seja para representação legítima ou para campanhas de engenharia social e desinformação —, essa presença gera indicadores técnicos e comportamentais verificáveis.

Neste artigo, a equipa do **Profundidade Intelligence** detalha a metodologia sistemática utilizada por analistas forenses e investigadores digitais para auditar a autenticidade de identidades digitais.

---

## 1. O Princípio da Continuidade Digital

Identidades humanas autênticas apresentam uma **curva de maturação temporal orgânica**:
1. Criação de identificadores primários (e-mails, handles, domínios);
2. Expansão de rede relacional assimétrica e multidirecional;
3. Padrões de atividade condizentes com fusos horários e hábitos reais;
4. Pegada residual em motores de busca, arquivos web (*Wayback Machine*) e plataformas secundárias.

Em contrapartida, identidades sintéticas (sockpuppets, bots ou perfis de spear-phishing) costumam exibir:
- **Ausência de passado digital:** Perfis com meses de existência, mas sem histórico público anterior;
- **Sincronismo artificial:** Publicações em rajada com conteúdo gerado por IA sem desvios linguísticos naturais;
- **Imagens de perfil geradas por GANs (*StyleGAN*):** Simetrias anômalas nos olhos, texturas de cabelo fundidas com o fundo ou dentes com iluminação inconsistente.

---

## 2. Roteiro Prático de Investigação

### Passo 1: Análise Cadastral e Identificadores Únicos
Nunca confie apenas no nome exibido (*display name*). O elemento central é o identificador imutável:
- **User IDs numéricos** (que não mudam mesmo se o @handle for alterado);
- Padrões de nomenclatura (reutilização de prefixos em GitHub, fóruns, Telegram ou LinkedIn);
- Análise de recuperação de conta (verificação ofuscada de domínio de e-mail e terminação de telefone através dos fluxos legítimos de login).

### Passo 2: Verificação Criptográfica de Mídias
Toda imagem ou vídeo compartilhado pelo perfil deve passar pelo **Laboratório de Verificação**:
- **Cálculo de Hash SHA-256 imediato** para garantir integridade probatória;
- Análise de Nível de Erro (ELA - *Error Level Analysis*) para identificar clonagem e inserções;
- Extração de metadados EXIF se o arquivo original puder ser obtido fora das redes que comprimem headers.

### Passo 3: Mapeamento de Grafo Relacional
As conexões de uma entidade revelam mais do que a sua própria biografia declarada:
\`\`\`
[Perfil Sob Suspeita]
   ├── Segue ➔ Contas recém-criadas em bloco (Rede Coordenada)
   ├── Interações ➔ Retweets automáticos e réplicas imediatas
   └── Backlinks ➔ Domínios recém-registados com WHOIS protegido
\`\`\`

---

## 3. Preservação de Cadeia de Custódia

Um erro comum em investigações digitais é a perda da admissibilidade legal das evidências recolhidas. Ao identificar um perfil sob suspeita na plataforma **Profundidade**:
- Cada captura de tela e arquivo bruto recebe um carimbo de tempo (*timestamp*) e hash criptográfico SHA-256;
- O caminho de coleta (*source URL*, headers HTTP, IP de origem) é registrado em trilha de auditoria imutável;
- O dossiê final é assinado digitalmente, permitindo apresentação pericial a gabinetes jurídicos, órgãos reguladores e equipas de resposta a incidentes.
        `
    },

    // 2. INTELIGÊNCIA — OSINT
    {
        id: 'seed-osint-recolha-passiva-estruturacao',
        title: 'Metodologia OSINT: Da Recolha Passiva à Estruturação Probatória',
        slug: 'metodologia-osint-recolha-passiva-estruturacao-probatoria',
        category: 'Inteligência',
        excerpt: 'Como coletar dados abertos sem deixar pegadas digitais, filtrar ruído de desinformação e transformar sinais dispersos em grafos relacionais auditáveis.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 11,
        views: 2890,
        tags: ['OSINT', 'Inteligência', 'Metodologia', 'Grafo', 'Fontes Abertas'],
        featureImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-03-18T14:00:00Z'),
        updatedAt: new Date('2026-03-22T11:00:00Z'),
        content: `
# Metodologia OSINT: Da Recolha Passiva à Estruturação Probatória

O Open Source Intelligence (OSINT) moderno transcende a mera busca no Google. Em cenários corporativos e de inteligência de estado, o desafio não é a escassez de dados, mas o volume avassalador de ruído e a necessidade imperativa de estruturação técnica.

## 1. O Ciclo de Inteligência em Fontes Abertas

O ciclo clássico de inteligência compreende:
1. **Direcionamento e Planeamento:** Qual é a pergunta de inteligência a responder?
2. **Coleta Passiva:** Obtenção de registros sem interagir diretamente com a infraestrutura do alvo;
3. **Processamento e Normalização:** Conversão de formatos não estruturados (textos, tabelas, imagens) em entidades e nós relacionais;
4. **Análise e Correlação:** Identificação de anomalias e ligações ocultas;
5. **Disseminação:** Relatório pericial acionável com cadeia de custódia intacta.

## 2. Estruturação em Grafos
A informação dispersa só se torna inteligência quando ganha estrutura topológica. No Profundidade, cada entidade (indivíduo, empresa, IP, domínio) é conectada com arestas qualificadas (societário, transacional, geográfico, comunicacional).
        `
    },

    // 3. INVESTIGAÇÃO — CUSTÓDIA
    {
        id: 'seed-cadeia-custodia-sha256-evidencias',
        title: 'Cadeia de Custódia Digital: Garantindo a Validade Jurídica de Evidências com SHA-256',
        slug: 'cadeia-custodia-digital-validade-juridica-sha256',
        category: 'Investigação',
        excerpt: 'Princípios da ISO/IEC 27037 e conformidade processual: por que o carimbo de integridade SHA-256 e o isolamento de provas são indispensáveis em relatórios periciais.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 10,
        views: 2150,
        tags: ['Cadeia de Custódia', 'Forense Digital', 'SHA-256', 'Compliance', 'Evidências'],
        featureImageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-03-15T09:00:00Z'),
        updatedAt: new Date('2026-03-16T12:00:00Z'),
        content: `
# Cadeia de Custódia Digital: Garantindo a Validade Jurídica de Evidências

No direito processual e nas auditorias regulatórias, uma evidência digital sem cadeia de custódia documentada é considerada juridicamente nula. A facilidade com que arquivos digitais podem ser alterados, com metadados falsificados em segundos, exige rigor criptográfico inegociável.

## A Norma ISO/IEC 27037 e o Padrão SHA-256

A norma internacional estabelece quatro diretrizes essenciais para identificação, coleta, aquisição e preservação de evidência digital:
- **Integridade:** Prova incontestável de que o dado não sofreu adulteração desde o instante da apreensão/coleta;
- **Reprodutibilidade:** Capacidade de terceiros peritos independentes recalcularem os mesmos valores criptográficos;
- **Auditabilidade:** Registo cronológico de quem teve acesso, visualizou ou transferiu a prova;
- **Não-repúdio:** Impossibilidade de negação da autenticidade da fonte.

No Profundidade, qualquer arquivo submetido gera de imediato uma assinatura SHA-256 gravada em bloco de metadados imutável.
        `
    },

    // 4. GEOINTELIGÊNCIA
    {
        id: 'seed-geointeligencia-coordenadas-timelines',
        title: 'Geointeligência Aplicada: Como Transformar Coordenadas e Metadados Públicos em Timelines Investigativas',
        slug: 'geointeligencia-aplicada-coordenadas-metadados-timelines',
        category: 'Geointeligência',
        excerpt: 'Análise geoespacial de fontes abertas: como correlacionar postagens públicas, sombras solares, relevo geográfico e infraestruturas sem violar a privacidade individual.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 13,
        views: 3100,
        tags: ['Geointeligência', 'GEOINT', 'Metadados', 'Análise Espacial', 'Timeline'],
        featureImageUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-03-12T11:00:00Z'),
        updatedAt: new Date('2026-03-14T08:30:00Z'),
        content: `
# Geointeligência Aplicada: Do Sinal Espacial à Reconstrução Cronológica

A geointeligência (GEOINT) em ambientes corporativos e de verificação documental combina dados cartográficos públicos, sensoriamento remoto por satélite e metadados contextuais legitimamente disponíveis.

## Ética e Diferencial da Geointeligência Profundidade

Ao contrário de softwares de vigilância invasiva, a geointeligência do Profundidade organiza informações públicas disponibilizadas conscientemente nas fontes analisadas:
- Padrões de movimentação logística declarada em despachos aduaneiros;
- Localizações e carimbos de data/hora em relatórios de impacto socioambiental;
- Correlação de imagens com sombras (*chronolocation*) e relevo topográfico digital.
        `
    },

    // 5. SI — SUPER INTELIGÊNCIA
    {
        id: 'seed-si-modelos-neurais-human-in-the-loop',
        title: 'Super Inteligência (SI) na Análise Forense: Modelos Neurais com Validação Humana Contínua',
        slug: 'super-inteligencia-si-analise-forense-human-in-the-loop',
        category: 'SI',
        excerpt: 'Por que a inteligência artificial deve atuar como amplificadora analítica e nunca como tomadora final de decisão em investigações críticas.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 12,
        views: 2670,
        tags: ['SI', 'Inteligência Artificial', 'Forense', 'Human in the Loop', 'Automação'],
        featureImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-03-10T16:00:00Z'),
        updatedAt: new Date('2026-03-11T19:00:00Z'),
        content: `
# Super Inteligência (SI) na Análise Forense: O Princípio Human-in-the-Loop

Grandes modelos de linguagem e redes neurais de visão computacional são capazes de ler centenas de gigabytes de documentos, notas fiscais e registros públicos em frações de segundo. Contudo, em matéria de investigação e perícia judicial, **alucinações ou falsos positivos geram danos irreparáveis**.

## O Papel da SI no Profundidade
1. **Extração de Entidades Nomeadas (NER):** Detectar NIFs, CNPJs, nomes de diretores e valores financeiros;
2. **Correlação de Padrões:** Sugerir potenciais conexões entre empresas que compartilham o mesmo procurador ou endereço;
3. **Formulação de Hipóteses:** Apresentar caminhos investigativos com indicação expressa dos documentos comprobatórios.

> **Princípio Soberano:** Toda hipótese gerada pela SI permanece rotulada como preliminar até que um perito humano analise, valide e assine o achado.
        `
    },

    // 6. CIBERSEGURANÇA — THREAT INTELLIGENCE
    {
        id: 'seed-threat-intelligence-superficie-ataque',
        title: 'Threat Intelligence Corporativo: Monitorização de Superfícies de Ataque e Fugas de Credenciais',
        slug: 'threat-intelligence-corporativo-superficie-ataque-credenciais',
        category: 'Cibersegurança',
        excerpt: 'Estratégias proativas para identificar ativos expostos na internet, certificados expirados e credenciais comprometidas em fóruns especializados antes de invasões.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 11,
        views: 1980,
        tags: ['Cibersegurança', 'Threat Intelligence', 'Superfície de Ataque', 'Vazamentos', 'SOC'],
        featureImageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-03-08T13:00:00Z'),
        updatedAt: new Date('2026-03-09T14:30:00Z'),
        content: `
# Threat Intelligence Corporativo: Monitorização de Superfícies de Ataque

Organizações modernas possuem ecossistemas digitais dispersos: servidores na nuvem, portais de parceiros, VPNs legadas e subdomínios desativados que continuam respondendo a requisições.

A Inteligência de Ameaças foca-se em mapear esses vetores externos antes que atores de ameaça os explorem. A identificação contínua de IOCs (*Indicators of Compromise*) protege a reputação e a integridade operacional da infraestrutura.
        `
    },

    // 7. PENTEST — WEB & APIS
    {
        id: 'seed-pentest-web-apis-seguranca-ofensiva',
        title: 'Pentest Web & APIs: Identificação e Mitigação de Vulnerabilidades Críticas em Ambientes Sensíveis',
        slug: 'pentest-web-apis-seguranca-ofensiva-vulnerabilidades',
        category: 'Pentest',
        excerpt: 'Como equipes autorizadas estruturam baterias de testes de intrusão, documentam achados periciais e diferenciam reconhecimento ético de invasões ilícitas.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 13,
        views: 2450,
        tags: ['Pentest', 'APIs', 'Vulnerabilidades', 'Segurança Ofensiva', 'OWASP'],
        featureImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-03-05T09:30:00Z'),
        updatedAt: new Date('2026-03-06T15:20:00Z'),
        content: `
# Pentest Web & APIs: Segurança Começa Antes do Incidente

Testes de penetração (Pentest) representam o teste de fogo de qualquer perímetro tecnológico. A plataforma Profundidade apoia equipas de segurança defensiva e ofensiva autorizadas a catalogar vetores de ataque e manter a cadeia de custódia dos achados.

> **Aviso de Conformidade:** Todas as atividades de auditoria de intrusão devem ser estritamente executadas sobre infraestruturas próprias ou munidas de Termo de Consentimento Informado (Rules of Engagement) assinado.
        `
    },

    // 8. INTELIGÊNCIA — DESINFORMAÇÃO & IMPERSONAÇÃO
    {
        id: 'seed-desinformacao-impersonacao-grafos',
        title: 'Detecção de Campanhas de Desinformação e Impersonação com Grafos de Conectividade',
        slug: 'deteccao-campanhas-desinformacao-impersonacao-grafos',
        category: 'Inteligência',
        excerpt: 'Mapeamento de redes inautênticas coordenadas (CIB), fazendas de perfis e campanhas de clonagem de marcas institucionais no ecossistema digital.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 12,
        views: 2190,
        tags: ['Desinformação', 'Impersonação', 'Grafos', 'Inteligência', 'Proteção de Marca'],
        featureImageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-03-03T11:00:00Z'),
        updatedAt: new Date('2026-03-04T17:00:00Z'),
        content: `
# Detecção de Campanhas de Desinformação com Grafos de Conectividade

Campanhas coordenadas de impersonação buscam enganar clientes, investidores ou o público geral através de réplicas quase perfeitas de páginas e perfis legítimos.

A análise topológica em grafo permite expor quando dezenas de páginas recém-criadas compartilham o mesmo identificador de administrador, mesmos números de rastreamento de anúncios ou servidores DNS comuns.
        `
    },

    // 9. INVESTIGAÇÃO — FORENSE DE IMAGENS E VÍDEOS
    {
        id: 'seed-forense-imagens-videos-ela-metadados',
        title: 'Análise Forense de Imagens e Vídeos: Verificação de ELA e Metadados EXIF Contra Manipulações',
        slug: 'analise-forense-imagens-videos-ela-metadados-exif',
        category: 'Investigação',
        excerpt: 'Como peritos identificam montagens, clonagens de elementos e imagens sintéticas utilizando técnicas de Error Level Analysis, quantização JPEG e metadados estruturais.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 14,
        views: 2800,
        tags: ['Forense de Imagem', 'ELA', 'EXIF', 'Verificação', 'Deepfakes'],
        featureImageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-03-01T14:00:00Z'),
        updatedAt: new Date('2026-03-02T10:00:00Z'),
        content: `
# Análise Forense de Imagens e Vídeos: Antes de Acreditar, Verifique

Imagens manipuladas por softwares de edição ou geradores de difusão latente frequentemente conservam discrepâncias físicas indetectáveis a olho nu, mas evidentes na análise de compressão e histograma.

## Técnicas Forenses Fundamentais
- **Error Level Analysis (ELA):** Detecta diferenças de taxa de compressão entre regiões de uma mesma imagem JPEG;
- **Inspeção de quantization tables:** Avalia o compressor de origem para verificar se a imagem foi salva no Photoshop ou exportada direto da câmera;
- **Análise de Keyframes em Vídeo:** Comparação temporal de quadros para identificar descontinuidades de iluminação e cortes ocultos.
        `
    },

    // 10. PENTEST — RECONHECIMENTO ÉTICO
    {
        id: 'seed-reconhecimento-ativo-passivo-pentest',
        title: 'Reconhecimento Ativo vs. Passivo: Princípios Éticos e Operacionais em Auditorias de Segurança',
        slug: 'reconhecimento-ativo-passivo-principios-eticos-operacionais',
        category: 'Pentest',
        excerpt: 'A fronteira técnica entre recolha pública de inteligência e sondagem direta de portas: limites legais, protocolos de engajamento e relatórios de conformidade.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 10,
        views: 1840,
        tags: ['Reconhecimento', 'OSINT Técnico', 'Pentest', 'Compliance', 'Auditoria'],
        featureImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-02-27T10:00:00Z'),
        updatedAt: new Date('2026-02-28T16:00:00Z'),
        content: `
# Reconhecimento Ativo vs. Passivo: Limites Técnicos e Legais

No primeiro estágio de qualquer avaliação de postura de segurança corporativa, o reconhecimento fornece o mapa da superfície. O reconhecimento passivo baseia-se em fontes públicas (DNS passivo, certificados CT, arquivos públicos). Já o ativo envia pacotes aos alvos e exige mandato expresso de auditoria.
        `
    },

    // 11. INTELIGÊNCIA — DUE DILIGENCE SOCIETÁRIA
    {
        id: 'seed-due-diligence-societaria-nif-beneficiario',
        title: 'Due Diligence Societária: Cruzamento de Registos Comerciais, Beneficiários Efetivos e NIFs',
        slug: 'due-diligence-societaria-registos-comerciais-nif-beneficiarios',
        category: 'Inteligência',
        excerpt: 'Como desenredar cadeias de participações cruzadas, identificar testas-de-ferro e documentar riscos de conformidade e PEPs em aquisições e contratações.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 12,
        views: 2310,
        tags: ['Due Diligence', 'Compliance', 'NIF', 'Beneficiário Efetivo', 'Risco Societário'],
        featureImageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-02-25T11:00:00Z'),
        updatedAt: new Date('2026-02-26T14:00:00Z'),
        content: `
# Due Diligence Societária: Rastreando o Beneficiário Efetivo

Fraudes corporativas e esquemas de blindagem patrimonial frequentemente interpõem múltiplas camadas de empresas fictícias para mascarar o verdadeiro decisor econômico. O Profundidade simplifica a reconstrução de redes societárias e vínculos contratuais.
        `
    },

    // 12. CIBERSEGURANÇA — SOC & RESPOSTA A INCIDENTES
    {
        id: 'seed-soc-resposta-incidentes-apt-contencao',
        title: 'SOC Moderno: Resposta a Incidentes e Contenção Rápida de Ameaças Avançadas (APT)',
        slug: 'soc-moderno-resposta-incidentes-apt-contencao-rapida',
        category: 'Cibersegurança',
        excerpt: 'Fluxos de triagem de alertas, isolamento de hosts comprometidos e preservação de memória volátil para perícia forense pós-incidente.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 11,
        views: 1950,
        tags: ['SOC', 'Incident Response', 'APT', 'Cibersegurança', 'Forense'],
        featureImageUrl: 'https://images.unsplash.com/photo-1551808525-51a94da548ce?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-02-22T08:00:00Z'),
        updatedAt: new Date('2026-02-23T13:00:00Z'),
        content: `
# SOC Moderno: Triagem, Contenção e Preservação

Quando um incidente de segurança atinge a rede de uma organização, cada minuto perdido na contenção amplifica o prejuízo financeiro e regulatório. O segredo de uma resposta eficaz reside na catalogação minuciosa de evidências para laudos conclusivos.
        `
    },

    // 13. GEOINTELIGÊNCIA — CORREDORES LOGÍSTICOS
    {
        id: 'seed-mapeamento-geoespacial-fontes-abertas-logistica',
        title: 'Mapeamento Geoespacial de Fontes Abertas: Análise em Corredores Logísticos e Infraestruturas',
        slug: 'mapeamento-geoespacial-fontes-abertas-corredores-logisticos',
        category: 'Geointeligência',
        excerpt: 'Utilização de imagens de satélite públicas, dados AIS marítimos e dados ADS-B aeronáuticos para auditar fluxos de transporte e conformidade de cadeias de suprimento.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 13,
        views: 2100,
        tags: ['Geointeligência', 'Logística', 'AIS', 'ADS-B', 'Infraestruturas'],
        featureImageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-02-19T10:00:00Z'),
        updatedAt: new Date('2026-02-20T12:00:00Z'),
        content: `
# Mapeamento Geoespacial de Fontes Abertas em Infraestruturas Críticas

Grandes cadeias de fornecimento internacionais dependem de rotas marítimas e corredores ferroviários. O monitoramento legítimo de dados abertos de telemetria fornece uma camada de inteligência indispensável para gestores de risco corporativo.
        `
    },

    // 14. SI — RAG & MINERAÇÃO DE DOCUMENTOS
    {
        id: 'seed-si-engenharia-rag-mineracao-documental',
        title: 'Engenharia de Prompts e RAG para Analistas de Inteligência: Mineração de Dossiês Volumosos',
        slug: 'engenharia-prompts-rag-analistas-inteligencia-documentos',
        category: 'SI',
        excerpt: 'Como construir índices semânticos e pipelines de Retrieval-Augmented Generation para interrogar milhares de PDFs sem risco de alucinação factual.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 11,
        views: 2280,
        tags: ['SI', 'RAG', 'LLMs', 'Mineração de Texto', 'Inteligência'],
        featureImageUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-02-16T15:00:00Z'),
        updatedAt: new Date('2026-02-17T18:00:00Z'),
        content: `
# Engenharia de RAG para Investigadores: Mineração Documental Precisa

A inteligência de documentos requer que cada resposta fornecida pelo modelo aponte o parágrafo exato, a página e o hash do arquivo original. A arquitetura de RAG no Profundidade garante rastreabilidade semântica integral.
        `
    },

    // 15. CIBERSEGURANÇA — DNS & PHISHING
    {
        id: 'seed-dns-intelligence-prevencao-phishing',
        title: 'Análise de Domínios e Infraestruturas DNS: Identificando Vetores de Phishing Antes do Ataque',
        slug: 'analise-dominios-infraestruturas-dns-prevencao-phishing',
        category: 'Cibersegurança',
        excerpt: 'Monitoramento de typosquatting, novos registros em TLDs suspeitos e alterações anômalas em registros MX e TXT para blindagem de marcas corporativas.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 10,
        views: 1870,
        tags: ['DNS', 'Phishing', 'Domain Intelligence', 'Cibersegurança', 'WHOIS'],
        featureImageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-02-13T11:00:00Z'),
        updatedAt: new Date('2026-02-14T09:30:00Z'),
        content: `
# Análise de Domínios e DNS: Neutralizando Phishing Antecipadamente

Criminosos virtuais costumam registrar domínios semelhantes (*typosquatting*) semanas antes de disparar campanhas de fraude por e-mail. A monitorização contínua dos feeds de Certificate Transparency expõe essas ameaças em estágio embrionário.
        `
    },

    // 16. PENTEST — REDES CORPORATIVAS
    {
        id: 'seed-auditoria-redes-corporativas-pentest',
        title: 'Auditoria de Segurança em Redes Corporativas: Metodologias de Avaliação e Testes de Intrusão',
        slug: 'auditoria-seguranca-redes-corporativas-metodologias-pentest',
        category: 'Pentest',
        excerpt: 'Do perímetro externo à movimentação lateral interna: como diagnosticar vulnerabilidades em Active Directory, segmentação de VLANs e acessos remotos.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 12,
        views: 1760,
        tags: ['Pentest', 'Redes', 'Active Directory', 'Segurança da Informação', 'Auditoria'],
        featureImageUrl: 'https://images.unsplash.com/photo-1548092372-0d1bd40894a3?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-02-10T14:00:00Z'),
        updatedAt: new Date('2026-02-11T16:00:00Z'),
        content: `
# Auditoria de Redes Corporativas: Do Perímetro ao Núcleo

A segurança de uma rede institucional mede-se pela sua capacidade de resistir à movimentação lateral caso uma máquina de ponta seja comprometida. Documentar essas vulnerabilidades capacita os administradores de rede a aplicar patches de forma prioritária.
        `
    },

    // 17. INVESTIGAÇÃO — JORNALISMO & FACT-CHECKING
    {
        id: 'seed-verificacao-fontes-jornalismo-investigativo',
        title: 'Verificação de Fontes em Ambientes Hostis: Protocolos de Integridade Documental e Fact-Checking',
        slug: 'verificacao-fontes-jornalismo-investigativo-fact-checking',
        category: 'Investigação',
        excerpt: 'Métodos rigorosos de verificação documental para repórteres investigativos, pesquisadores acadêmicos e analistas que operam sob ameaça de desinformação estatal.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 11,
        views: 2040,
        tags: ['Fact-checking', 'Jornalismo Investigativo', 'Fontes', 'Verificação', 'Ética'],
        featureImageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-02-07T09:00:00Z'),
        updatedAt: new Date('2026-02-08T12:00:00Z'),
        content: `
# Verificação de Fontes em Ambientes Complexos: Protocolos Essenciais

O jornalismo investigativo moderno exige uma abordagem pericial na triagem de vazamentos documentais (*leaks*). Confirmar a autenticidade de cabeçalhos de e-mail e assinaturas criptográficas é a única salvaguarda contra fraudes forjadas.
        `
    },

    // 18. CIBERSEGURANÇA — IOCS E FEEDS DE AMEAÇAS
    {
        id: 'seed-correlacao-automatizada-iocs-threat-intel',
        title: 'Correlação Automatizada de IOCs: Integrando Feeds de Inteligência de Ameaças com Alta Precisão',
        slug: 'correlacao-automatizada-iocs-feeds-inteligencia-ameacas',
        category: 'Cibersegurança',
        excerpt: 'Como normalizar hashes, IPs e URLs maliciosas eliminando falsos positivos e enriquecendo alertas de segurança com contexto situacional.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 10,
        views: 1690,
        tags: ['IOC', 'Threat Feeds', 'Cibersegurança', 'Automação', 'SOC'],
        featureImageUrl: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-02-04T13:00:00Z'),
        updatedAt: new Date('2026-02-05T15:00:00Z'),
        content: `
# Correlação de IOCs: Qualidade Sobre Quantidade

Receber milhões de indicadores de comprometimento sem contexto satura os analistas de segurança. A correlação inteligente correlaciona dados técnicos com os ativos mais sensíveis da organização.
        `
    },

    // 19. SI — LIMITES ÉTICOS E VALIDAÇÃO PERICIAL
    {
        id: 'seed-si-limites-eticos-decisao-pericial',
        title: 'Limites Éticos e Legais da SI: Por Que a IA Não Deve Substituir o Parecer do Perito Humano',
        slug: 'limites-eticos-legais-si-ia-parecer-perito-humano',
        category: 'SI',
        excerpt: 'Análise epistemológica e jurídica sobre a indispensabilidade do juízo humano e da responsabilidade profissional em laudos forenses digitais.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 12,
        views: 2510,
        tags: ['SI', 'Ética na IA', 'Perícia Forense', 'Responsabilidade Legal', 'Direito Digital'],
        featureImageUrl: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-02-01T10:00:00Z'),
        updatedAt: new Date('2026-02-02T11:30:00Z'),
        content: `
# Limites Éticos da SI: A Decisão Analítica Permanece com o Investigador

A Super Inteligência tem a capacidade de processar volumes inimagináveis de informação, apontar anomalias e correlacionar fontes diversas. Contudo, **a assinatura pericial de um caso exige responsabilidade civil, ética e técnica que somente um profissional habilitado pode assumir**.
        `
    },

    // 20. INVESTIGAÇÃO — RECONSTRUÇÃO CRONOLÓGICA DE LOGS
    {
        id: 'seed-reconstrucao-cronologica-logs-timelines',
        title: 'Cronologia Investigativa: Como Reconstruir Eventos Digitais a Partir de Logs Dispersos',
        slug: 'cronologia-investigativa-reconstruir-eventos-logs-dispersos',
        category: 'Investigação',
        excerpt: 'Alinhamento de fusos horários, normalização de timestamps UNIX e estruturação de linhas do tempo para desvendar fraudes e vazamentos corporativos.',
        isPublished: true,
        isFeatured: false,
        readTimeMinutes: 11,
        views: 1820,
        tags: ['Timeline', 'Logs', 'Forense Digital', 'Investigação', 'Auditoria'],
        featureImageUrl: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?auto=format&fit=crop&w=1200&q=80',
        author: DEFAULT_BLOG_AUTHOR,
        createdAt: new Date('2026-01-28T16:00:00Z'),
        updatedAt: new Date('2026-01-29T18:00:00Z'),
        content: `
# Cronologia Investigativa: Reconstruindo a Linha Temporal

Em investigações de fraudes internas e vazamentos, o evento quase nunca ocorre num único sistema. A correlação de registros de servidores web, autenticações VPN, catracas de acesso físico e mensagens corporativas revela a sequência inequívoca dos acontecimentos.
        `
    },
];
