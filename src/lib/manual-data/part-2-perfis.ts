import { ManualChapter } from './types';

export const PART_2_CHAPTERS: ManualChapter[] = [
  {
    id: 'p2-super-admin',
    number: 4,
    partId: 'part-2',
    title: 'Perfil 1 — Super Administrador',
    iconName: 'ShieldAlert',
    category: 'Administração',
    description: 'Gestão da infraestrutura lógica global, multi-tenancy, subscrições, monitorização e auditoria técnica.',
    relevantProfiles: ['super-admin'],
    subsections: [
      {
        title: '4.1 Objetivo e Âmbito de Atuação',
        content: `O **Super Administrador** detém a autoridade máxima na plataforma. É responsável por assegurar a disponibilidade, segurança cibernética, parametrização global e governação de todas as organizações inscritas no ecossistema Profundidade OS.`
      },
      {
        title: '4.2 Funcionalidades e Ecrãs Autorizados',
        content: `- **Painel de Controlo Master (/admin):** Monitorização de organizações ativas, quotas de armazenamento e volume de transações.
- **Gestão de Organizações e Licenciamento:** Criação de novos inquilinos (*tenants*), alteração de planos (Starter, Pro, Enterprise) e atribuição de módulos.
- **Auditoria Global e Logs de Segurança:** Rastreio de acessos por IP, tentativas de intrusão e alterações a registos trancados.
- **Parametrização do Sistema:** Gestão de servidores de e-mail SMTP, chaves de API de IA e gateways de pagamento.`
      },
      {
        title: '4.3 Procedimento: Criação de Nova Organização',
        steps: [
          'Aceda a /admin > Organizações e clique em "+ Nova Organização".',
          'Preencha a Razão Social, NIF (Número de Identificação Fiscal) e Morada Sede.',
          'Defina o Administrador Principal (Nome e E-mail Corporativo).',
          'Selecione os módulos autorizados (Obras, Mineração, Frotas, Topografia, Extranet).',
          'Clique em "Criar e Enviar Convite". O Administrador receberá um e-mail de ativação imediata.'
        ],
        content: 'A criação da organização provisiona automaticamente a base de dados isolada para a empresa.'
      }
    ]
  },
  {
    id: 'p2-admin-org',
    number: 5,
    partId: 'part-2',
    title: 'Perfil 2 — Administrador da Organização',
    iconName: 'Building',
    category: 'Administração',
    description: 'Configuração da empresa, departamentos, utilizadores, perfis RBAC e parâmetros operacionais.',
    relevantProfiles: ['admin'],
    subsections: [
      {
        title: '5.1 Objetivo e Responsabilidades',
        content: `Gerir a estrutura corporativa da empresa dentro do Profundidade: cadastrar novos colaboradores, definir funções, configurar centros de custo e auditar a atividade dos utilizadores da organização.`
      },
      {
        title: '5.2 Gestão de Colaboradores e Perfis (RBAC)',
        content: `No separador **Administração > Utilizadores**, o Administrador pode:
- Convidar novos utilizadores através do e-mail.
- Atribuir perfis rigorosos (ex: *Diretor de Projeto*, *Encarregado*, *Topógrafo*).
- Desativar acessos de colaboradores desligados com efeito imediato, revogando todas as sessões ativas nos telemóveis e computadores.`
      },
      {
        title: '5.3 Centros de Custo e Departamentos',
        content: 'Configure os centros de custo da empresa (ex: CC-01 Administração Central, CC-02 Oficina Central, CC-10 Empreitada Talatona) para permitir imputação correta de despesas indiretas e overheads.'
      }
    ]
  },
  {
    id: 'p2-diretor-projetos',
    number: 6,
    partId: 'part-2',
    title: 'Perfil 3 — Diretor / Administrador de Projetos',
    iconName: 'Briefcase',
    category: 'Gestão Executiva',
    description: 'Acompanhamento do portfólio de empreitadas, indicadores EVA, Curvas S, previsões e mitigação de riscos.',
    relevantProfiles: ['super-admin', 'admin', 'Diretor de Projeto'],
    subsections: [
      {
        title: '6.1 Cockpit Executivo de Portfólio',
        content: `Visão consolidada de todas as obras em curso:
- **Semáforo de Desvio:** Verde (obra no prazo e orçamento), Amarelo (atenção, desvio < 5%), Vermelho (crítico, atraso ou sobrecusto > 5%).
- **Curva S Físico-Financeira:** Comparação gráfica do Valor Planeado (PV), Valor Ganho (EV) e Custo Real (AC).
- **Projeções no Término (EAC):** Projeção matemática do custo final estimado da obra com base no índice CPI atual.`
      },
      {
        title: '6.2 Matriz de Riscos e Tomada de Decisão',
        content: 'O Diretor acede à aba "Análise de Riscos" para visualizar ocorrências com impacto contratual, prazos de prorrogação decorrentes de chuvas fortes e pedidos de termo aditivo pendentes de negociação com o Dono da Obra.'
      }
    ]
  },
  {
    id: 'p2-gestor-obra',
    number: 7,
    partId: 'part-2',
    title: 'Perfil 4 — Gestor de Obra / Gerente de Projeto',
    iconName: 'HardHat',
    category: 'Operação de Obra',
    description: 'Gestão total da execução física, financeira, recursos, diários e homologação de medições no terreno.',
    relevantProfiles: ['Gestor de Obra', 'Diretor de Obra'],
    subsections: [
      {
        title: '7.1 Rotina Diária do Gestor de Obra',
        steps: [
          '07:30 - Verificação do efetivo no estaleiro e máquinas ativas.',
          '12:00 - Acompanhamento das frentes de betonagem, escavação ou alvenaria.',
          '17:00 - Validação e trancamento com hash SHA-256 do Relatório Diário de Obra (RDO).',
          '18:00 - Análise do consumo de gasóleo do dia vs. horas trabalhadas pela frota.'
        ],
        content: 'O Gestor de Obra é o responsável legal pela integridade técnica das informações registadas no estaleiro.'
      },
      {
        title: '7.2 Encerramento de Obra e As-Built Handover',
        content: 'Na conclusão do contrato, o Gestor de Obra utiliza o gerador "Livro Digital da Obra (As-Built Handover)", que reúne todos os RDOs assinados, ensaios de betão, plantas finais e termos de receção provisória prontos para entrega ao cliente.'
      }
    ]
  },
  {
    id: 'p2-planeamento',
    number: 8,
    partId: 'part-2',
    title: 'Perfil 5 — Engenheiro / Técnico de Planeamento',
    iconName: 'GanttChart',
    category: 'Planeamento',
    description: 'Estruturação da EAP, precedências lógicas, caminho crítico CPM, linhas de base e reprogramação.',
    relevantProfiles: ['Engenheiro de Planeamento'],
    subsections: [
      {
        title: '8.1 Criação da Estrutura Analítica do Projeto (EAP)',
        content: 'O Engenheiro de Planeamento estrutura a obra em fases e pacotes de trabalho tangíveis, atribuindo durações em dias úteis, coeficientes de produtividade diária e custos unitários orçamentados.'
      },
      {
        title: '8.2 Gestão de Precedências e Caminho Crítico',
        content: 'Vincula as tarefas através de relações lógicas (Fim-para-Início com folga). O algoritmo do Profundidade identifica automaticamente o Caminho Crítico e destaca a vermelho as atividades cuja dilação compromete o encerramento do contrato.'
      },
      {
        title: '8.3 Fixação da Linha de Base (Baseline)',
        content: 'Uma vez aprovado o cronograma pelo cliente, o técnico clica em "Fixar Linha de Base". Todas as medições e lançamentos futuros serão comparados contra este marco contratual imutável.'
      }
    ]
  },
  {
    id: 'p2-orcamentista',
    number: 9,
    partId: 'part-2',
    title: 'Perfil 6 — Orçamentista / Responsável de Custos',
    iconName: 'Calculator',
    category: 'Engenharia de Custos',
    description: 'Composições de preços unitários (CPU), orçamentos de venda, BDI, custos indiretos e margens.',
    relevantProfiles: ['Orçamentista', 'Engenheiro de Custos'],
    subsections: [
      {
        title: '9.1 Elaboração de Composições de Preço Unitário (CPU)',
        content: `Para cada serviço (ex: *M² de Alvenaria de Bloco de 15*), o orçamentista define os coeficientes exatos:
- **Materiais:** 12.5 blocos de cimento, 0.025 m³ de argamassa de assentamento.
- **Mão de Obra:** 0.85 horas de pedreiro oficial, 0.95 horas de servente.
- **Equipamento:** Betoneira 400L (0.12 horas).`
      },
      {
        title: '9.2 Aplicação do BDI e Formação do Preço de Venda',
        content: 'Parametrização das taxas de Benefícios e Despesas Indiretas (BDI), contemplando administração central, seguros de caução, encargos fiscais da AGT e margem líquida de lucro.'
      }
    ]
  },
  {
    id: 'p2-campo-fiscal',
    number: 10,
    partId: 'part-2',
    title: 'Perfil 7 — Engenheiro de Campo / Fiscal de Obra',
    iconName: 'ClipboardCheck',
    category: 'Fiscalização & Campo',
    description: 'Apontamento de serviços concluídos, ensaios de controlo de qualidade (FVS) e fiscalização técnica.',
    relevantProfiles: ['Fiscal de Obra', 'Engenheiro Residente'],
    subsections: [
      {
        title: '10.1 Inspeções e Fichas FVS no Telemóvel',
        content: 'Realize verificações de qualidade no local (ex: armaduras antes da betonagem, tolerância de espessura de camada em base de brita). Se houver não conformidade, adicione uma fotografia e rejeite o item até retificação.'
      },
      {
        title: '10.2 Homologação de Quantidades Medidas',
        content: 'O Fiscal confere as quantidades declaradas pela empreiteira no Auto de Medição mensal. Se aprovado, assina digitalmente no portal para libertação da respetiva fatura.'
      }
    ]
  },
  {
    id: 'p2-topografo',
    number: 11,
    partId: 'part-2',
    title: 'Perfil 8 — Topógrafo',
    iconName: 'MapPin',
    category: 'Topografia & Vias',
    description: 'Cadastro de pontos GNSS/Estação Total, modelos digitais MDT/TIN, corte e aterro e estaqueamento.',
    relevantProfiles: ['Topógrafo'],
    subsections: [
      {
        title: '11.1 Importação de Ficheiros de Pontos (CSV, TXT, DXF)',
        content: 'Importe listagens de pontos topográficos com Ponto, Coordenada Este (X), Coordenada Norte (Y), Cota (Z) e Descrição. O sistema gera a malha poligonal georreferenciada no sistema UTM WGS84.'
      },
      {
        title: '11.2 Cálculo de Volumes de Corte e Aterro',
        content: 'Cruze a malha de levantamento primitivo com a malha do projeto de terraplenagem executado para calcular volumes em metros cúbicos com precisão milimétrica, emitindo a memória de cálculo para o auto de medição.'
      }
    ]
  },
  {
    id: 'p2-mineracao',
    number: 12,
    partId: 'part-2',
    title: 'Perfil 9 — Responsável de Mineração',
    iconName: 'Gem',
    category: 'Mineração',
    description: 'Gestão de frentes de lavra, alimentação fabril, tonelagem ROM, teores recuperados e Kimberley.',
    relevantProfiles: ['Engenheiro de Minas', 'Diretor de Mina'],
    subsections: [
      {
        title: '12.1 Controlo de Turnos de Extração',
        content: 'Registo diário de viagens de dumper, tonelagem movimentada de estéril e minério ROM alimentado à central de tratamento denso (DMS) por turno de trabalho.'
      },
      {
        title: '12.2 Certificação Kimberley e Balanço de Massas',
        content: 'Controlo estrito de quilates por 100 toneladas (ct/100t) e geração de guias de transporte e custódia rastreadas para exportação segundo as normas do MIREMPET.'
      }
    ]
  },
  {
    id: 'p2-frotas',
    number: 13,
    partId: 'part-2',
    title: 'Perfil 10 — Gestor de Frotas / Equipamentos',
    iconName: 'Truck',
    category: 'Frotas & Equipamentos',
    description: 'Acompanhamento de horímetros, consumo específico de gasóleo, manutenção preventiva a 250h e custos operacionais.',
    relevantProfiles: ['Gestor de Frotas', 'Chefe de Oficina'],
    subsections: [
      {
        title: '13.1 Apontamento de Horímetro e Alerta de Combustível',
        content: 'Registe no fecho do dia a leitura do horímetro mecânico e os litros abastecidos. O sistema cruza os dados com a média padrão da máquina. Desvios superiores a 25% geram notificação imediata de suspeita de extravio de combustível.'
      },
      {
        title: '13.2 Ciclos de Revisão Preventiva (250h / 500h / 1000h)',
        content: 'O módulo monitoriza as horas restantes para troca de óleos, filtros e correias, abrindo ordens de serviço automáticas para a oficina mecânica.'
      }
    ]
  },
  {
    id: 'p2-compras',
    number: 14,
    partId: 'part-2',
    title: 'Perfil 11 — Responsável de Compras / Logística',
    iconName: 'ShoppingCart',
    category: 'Suprimentos',
    description: 'Requisições de compra, esteiras de 3 alçadas (1.5M, 15M, CA), mapas comparativos de cotação e emissão de ordens de compra.',
    relevantProfiles: ['Responsável de Compras', 'Gestor de Logística'],
    subsections: [
      {
        title: '14.1 A Esteira de 3 Alçadas de Governação',
        content: `- **Nível 1 (Até 1.500.000 Kz):** Aprovação direta do Diretor de Obra.
- **Nível 2 (1.5M a 15.000.000 Kz):** Aprovação conjunta do Diretor de Operações e Diretor Financeiro.
- **Nível 3 (Acima de 15.000.000 Kz):** Exige no mínimo 3 cotações comparativas anexadas e aprovação do Conselho de Administração.`
      },
      {
        title: '14.2 Emissão de Ordem de Compra e Follow-up',
        content: 'Uma vez aprovada a cotação vencedora, o sistema gera a Ordem de Compra oficial com termos de pagamento e prazo de entrega para envio ao fornecedor.'
      }
    ]
  },
  {
    id: 'p2-armazem',
    number: 15,
    partId: 'part-2',
    title: 'Perfil 12 — Almoxarife / Gestor de Stock',
    iconName: 'Package',
    category: 'Armazém',
    description: 'Recepção com guias de remessa, saída para frentes de trabalho, controlo de stock mínimo e inventários rotativos.',
    relevantProfiles: ['Almoxarife', 'Fiel de Armazém'],
    subsections: [
      {
        title: '15.1 Entrada de Mercadorias com Validação de Ordem',
        content: 'Ao descarregar materiais no estaleiro, o almoxarife valida as quantidades reais contra a Ordem de Compra aprovada, registando avarias ou faltas antes de assinar a guia de remessa.'
      },
      {
        title: '15.2 Ponto de Encomenda Inteligente (Smart Stock)',
        content: 'O sistema calcula o consumo diário médio de cimento, ferro e inertes e emite alerta automático para o departamento de compras quando o stock atinge o nível de segurança.'
      }
    ]
  },
  {
    id: 'p2-hseq',
    number: 16,
    partId: 'part-2',
    title: 'Perfil 13 — Responsável HSEQ',
    iconName: 'HeartPulse',
    category: 'Segurança & Ambiente',
    description: 'Inspeções de segurança, quase-acidentes, investigação de incidentes, matriz de risco e auditorias ambientais.',
    relevantProfiles: ['Técnico de Segurança', 'Responsável HSEQ'],
    subsections: [
      {
        title: '16.1 Registo e Notificação de Ocorrências',
        content: 'Registe acidentes ou quase-acidentes com classificação de gravidade (1 a 5). O sistema calcula os indicadores oficiais de sinistralidade (Taxa de Frequência e Taxa de Gravidade) e o contador de dias sem acidentes de trabalho com baixa médica.'
      }
    ]
  },
  {
    id: 'p2-financeiro',
    number: 17,
    partId: 'part-2',
    title: 'Perfil 14 — Responsável Financeiro',
    iconName: 'Wallet',
    category: 'Financeiro',
    description: 'Gestão de fluxo de caixa, pagamentos a subempreiteiros, controlo de garantias bancárias e reconciliação bancária.',
    relevantProfiles: ['Diretor Financeiro', 'Gestor Financeiro'],
    subsections: [
      {
        title: '17.1 Gestão de Tesouraria e Despesas por Nó da EAP',
        content: 'Toda a despesa liquidada é obrigatoriamente classificada contra um nó da EAP e centro de custo, alimentando diretamente o Custo Real (AC) da análise EVA.'
      }
    ]
  },
  {
    id: 'p2-documentacao',
    number: 18,
    partId: 'part-2',
    title: 'Perfil 15 — Responsável de Documentação',
    iconName: 'FolderArchive',
    category: 'Gestão Documental',
    description: 'Transmittals, controlo de revisões de projetos executivos (R0, R1), arquivo de contratos e plantas As-Built.',
    relevantProfiles: ['Gestor Documental', 'Secretário Técnico'],
    subsections: [
      {
        title: '18.1 Fluxo de Transmittals e Versionamento',
        content: 'Distribuição controlada de desenhos e telas finais aos encarregados. O sistema avisa se um trabalhador estiver a consultar uma versão obsoleta de uma planta estrutural.'
      }
    ]
  },
  {
    id: 'p2-operador-campo',
    number: 19,
    partId: 'part-2',
    title: 'Perfil 16 — Trabalhador / Operador de Campo',
    iconName: 'Smartphone',
    category: 'Campo Mobile',
    description: 'Interface simplificada para telemóveis: consulta de tarefas do dia, apontamento de produção e fotografias de progresso.',
    relevantProfiles: ['Operador de Máquina', 'Chefe de Equipa', 'Encarregado'],
    subsections: [
      {
        title: '19.1 Aplicação Mobile de Apontamento',
        content: 'Interface simplificada com botões de toque largo: o encarregado aponta metros lineares de vala aberta, metros cúbicos de betão espalhado e anexa fotografias de evidência.'
      }
    ]
  },
  {
    id: 'p2-cliente',
    number: 20,
    partId: 'part-2',
    title: 'Perfil 17 — Cliente / Dono da Obra',
    iconName: 'ExternalLink',
    category: 'Extranet Cliente',
    description: 'Portal de transparência externa para donos de obra, bancos financiadores e fiscalizações independentes.',
    relevantProfiles: ['cliente', 'Dono da Obra'],
    subsections: [
      {
        title: '20.1 Acesso Seguro à Extranet do Dono da Obra',
        content: 'O cliente acede a /portal/dashboard através de link encriptado para visualizar o progresso físico percentual, galeria de fotos de alta resolução, autos de medição submetidos e aprovações pendentes sem acesso aos custos internos ou margens da construtora.'
      }
    ]
  }
];
