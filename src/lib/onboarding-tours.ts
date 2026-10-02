import { OnboardingTour, OnboardingChecklistItem } from '@/types/onboarding';

export const ONBOARDING_TOURS: OnboardingTour[] = [
    {
        id: 'tour-platform-overview',
        title: 'Visão Geral da Plataforma',
        description: 'Conheça a interface principal, navegação sectorial, alternador de temas e notificações.',
        category: 'geral',
        estimatedMinutes: 2,
        steps: [
            {
                id: 'step-logo',
                targetSelector: '#header-logo',
                title: 'Bem-vindo ao PROFUNDIDADE OS',
                description: 'O Sistema Operacional de Decisão para Engenharia, Construção, Energia e Recursos Minerais em Angola. Clique sempre aqui para regressar à base.',
                placement: 'bottom',
                badgeText: 'Navegação'
            },
            {
                id: 'step-nav-projects',
                targetSelector: '#header-nav-projects',
                title: 'Gestão de Projetos & Obras',
                description: 'Aceda à carteira ativa de empreitadas, consulte status físico-financeiro global e crie novos empreendimentos.',
                placement: 'bottom',
                badgeText: 'Projetos'
            },
            {
                id: 'step-nav-sectors',
                targetSelector: '#header-nav-sectors',
                title: 'Módulos Especializados & Sectoriais',
                description: 'Navegue rapidamente entre os ecossistemas de Mineração (Kimberley/frotas), Energia (solar/hídrica), Estradas (terraplanagem/DMT) e Telecomunicações.',
                placement: 'bottom',
                badgeText: 'Sectores'
            },
            {
                id: 'step-theme-notifications',
                targetSelector: '#header-theme-toggle',
                title: 'Ambiente de Trabalho & Alertas',
                description: 'Alterne instantaneamente entre o modo claro e escuro de alta legibilidade para estaleiro, e receba notificações em tempo real de aprovações e incidentes.',
                placement: 'left',
                badgeText: 'Interface'
            }
        ]
    },
    {
        id: 'tour-project-workspace',
        title: 'Centro de Comando da Obra',
        description: 'Explore a barra de ferramentas do projeto, estrutura analítica (EAP), cronograma e controlo de frotas.',
        category: 'projetos',
        estimatedMinutes: 3,
        steps: [
            {
                id: 'step-project-menu',
                targetSelector: '#project-menu-bar',
                title: 'Menu Integrado de Gestão',
                description: 'Organizado por áreas de competência: Planeamento, Recursos, Suprimentos, Finanças, Execução, Comunicação e Controlo de Governação.',
                placement: 'bottom',
                badgeText: 'Controlo'
            },
            {
                id: 'step-wbs-gantt',
                targetSelector: '#menu-item-planeamento',
                title: 'EAP & Cronograma Gantt',
                description: 'Estruture pacotes de trabalho, defina o caminho crítico da obra e acompanhe marcos contratuais com tolerância zero para desvios.',
                placement: 'bottom',
                badgeText: 'Planeamento'
            },
            {
                id: 'step-resources',
                targetSelector: '#menu-item-recursos',
                title: 'Mão de Obra & Equipamentos',
                description: 'Aloque equipas aos pacotes da EAP, monitorize horímetros, consumo de gasóleo e certificados de aptidão profissional.',
                placement: 'bottom',
                badgeText: 'Recursos'
            },
            {
                id: 'step-finances',
                targetSelector: '#menu-item-financas',
                title: 'Gestão Financeira & Faturação',
                description: 'Confronte orçamento aprovado versus custos incorridos e gira autos de medição validados com as medições de campo.',
                placement: 'bottom',
                badgeText: 'Finanças'
            }
        ]
    },
    {
        id: 'tour-daily-report-rdo',
        title: 'Diário de Obra & Fecho Probatório (RDO)',
        description: 'Aprenda a lançar relatórios diários de ocorrências com selo criptográfico SHA-256 e evidências de campo.',
        category: 'execucao',
        estimatedMinutes: 3,
        steps: [
            {
                id: 'step-rdo-entry',
                targetSelector: '#rdo-new-entry-btn',
                title: 'Abertura do Turno / Dia de Trabalho',
                description: 'Inicie o registo diário indicando as condições meteorológicas (seca, chuva fraca, impeditiva), estado do solo e frentes ativas.',
                placement: 'bottom',
                badgeText: 'Diário'
            },
            {
                id: 'step-rdo-workforce',
                targetSelector: '#rdo-workforce-section',
                title: 'Efetivo em Campo & Horas Trabalhadas',
                description: 'Valide o número de encarregados, pedreiros, serventes e operadores pesados presentes nas diferentes frentes.',
                placement: 'top',
                badgeText: 'Efetivo'
            },
            {
                id: 'step-rdo-equipment',
                targetSelector: '#rdo-equipment-section',
                title: 'Telemetria & Produção de Equipamentos',
                description: 'Apontamento de horímetros iniciais e finais, litros de combustível abastecidos e paralisações para manutenção preventiva.',
                placement: 'top',
                badgeText: 'Frotas'
            },
            {
                id: 'step-rdo-lock',
                targetSelector: '#rdo-probative-seal',
                title: 'Trancamento Probatório SHA-256',
                description: 'Ao fechar o turno, o sistema gera uma assinatura digital imutável que garante integridade jurídica perante a Fiscalização e o Dono da Obra.',
                placement: 'top',
                badgeText: 'Blindagem'
            }
        ]
    },
    {
        id: 'tour-decision-engines',
        title: 'Os 5 Motores de Decisão em Tempo Real',
        description: 'Descubra como o sistema processa proativamente alertas, alçadas de compra, simulações cambiais e extranet.',
        category: 'motores',
        estimatedMinutes: 4,
        steps: [
            {
                id: 'step-engine-early-warning',
                targetSelector: '#engine-tab-early-warning',
                title: '1. Motor de Alertas Preditivos',
                description: 'Monitoriza desvios anormais de combustível (>25%), estrangulamentos de caminho crítico e prazos de licenças regulamentares.',
                placement: 'bottom',
                badgeText: 'Early Warning'
            },
            {
                id: 'step-engine-workflow',
                targetSelector: '#engine-tab-workflow',
                title: '2. Workflow & Governação de Alçadas',
                description: 'Esteiras automáticas de aprovação (Encarregado, Diretor, Diretoria/CFO) e cálculo preditivo do Ponto de Encomenda de materiais críticos.',
                placement: 'bottom',
                badgeText: 'Governação'
            },
            {
                id: 'step-engine-scenarios',
                targetSelector: '#engine-tab-scenario',
                title: '3. Simulador What-If & Otimizador DMT',
                description: 'Simule choques cambiais (USD/AOA), variações de cimento/aço e calcule a rota ótima de terraplanagem para minimizar distâncias de transporte.',
                placement: 'bottom',
                badgeText: 'What-If'
            },
            {
                id: 'step-engine-documents',
                targetSelector: '#engine-tab-documents',
                title: '4. Compilador de Cadernos em 1 Clique',
                description: 'Gera instantaneamente o Caderno de Medição com fotos georreferenciadas, Dossiê do Conselho de Administração (Curva S) e Livro As-Built.',
                placement: 'bottom',
                badgeText: 'Automação'
            },
            {
                id: 'step-engine-extranet',
                targetSelector: '#engine-tab-extranet',
                title: '5. Extranet Segura (Tokens de 7 Dias)',
                description: 'Convide fornecedores e fiscais através de links criptográficos temporários, sem exigir criação de palavras-passe complexas.',
                placement: 'bottom',
                badgeText: 'Extranet'
            }
        ]
    },
    {
        id: 'tour-reports-hub',
        title: 'Centro de Relatórios & Auditoria Probatória',
        description: 'Geração de dossiês técnicos oficiais, construtor de gráficos sob medida e rastreio probatório.',
        category: 'relatorios',
        estimatedMinutes: 2,
        steps: [
            {
                id: 'step-reports-catalog',
                targetSelector: '#reports-official-catalog',
                title: 'Catálogo Oficial de Relatórios',
                description: 'Emita Relatórios Diários Consolidados, Curva S Financeira, Balanços de Frota e Certificados de Segurança com logótipo corporativo.',
                placement: 'bottom',
                badgeText: 'Catálogo'
            },
            {
                id: 'step-reports-builder',
                targetSelector: '#reports-custom-builder',
                title: 'Construtor de Relatórios Dinâmico',
                description: 'Selecione fontes de dados do projeto, defina períodos e gere visualizações analíticas em tabela, barras, linhas ou circular.',
                placement: 'bottom',
                badgeText: 'Construtor'
            },
            {
                id: 'step-reports-history',
                targetSelector: '#reports-audit-history',
                title: 'Rastreio Probatório com Hash SHA-256',
                description: 'Todos os documentos emitidos ficam registados com data, autor e selo digital para auditorias externas.',
                placement: 'top',
                badgeText: 'Conformidade'
            }
        ]
    }
];

export const DEFAULT_CHECKLIST_ITEMS: OnboardingChecklistItem[] = [
    {
        id: 'check-create-project',
        title: 'Criar ou Aceder à Primeira Obra',
        description: 'Cadastre os dados base do projeto (nome, cliente, orçamento inicial e localização).',
        linkUrl: '/dashboard',
        completed: false
    },
    {
        id: 'check-setup-wbs',
        title: 'Definir Estrutura Analítica (EAP)',
        description: 'Organize os pacotes de trabalho e tarefas fundamentais de execução.',
        actionTab: 'wbs',
        completed: false
    },
    {
        id: 'check-first-rdo',
        title: 'Lançar o Primeiro Diário de Obra (RDO)',
        description: 'Registe meteorologia, efetivo presente e atividades executadas no turno.',
        actionTab: 'daily-reports',
        completed: false
    },
    {
        id: 'check-explore-engines',
        title: 'Explorar os Motores de Decisão em Tempo Real',
        description: 'Consulte os alertas preditivos e simule a sensibilidade do projeto a variações de custo.',
        actionTab: 'motores-operacionais',
        completed: false
    },
    {
        id: 'check-generate-report',
        title: 'Emitir Primeiro Relatório com Selo Probatório',
        description: 'Gere um relatório executivo em PDF autenticado com hash SHA-256.',
        actionTab: 'relatorios',
        completed: false
    }
];
