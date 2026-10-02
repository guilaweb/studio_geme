import { ManualChapter } from './types';

export const PART_1_CHAPTERS: ManualChapter[] = [
  {
    id: 'p1-sobre',
    number: 1,
    partId: 'part-1',
    title: 'Sobre a Plataforma PROFUNDIDADE',
    iconName: 'BookOpen',
    category: 'Introdução',
    description: 'Compreenda a visão, os objetivos de negócio, os setores de atuação e a estrutura geral da plataforma Profundidade OS.',
    relevantProfiles: ['Todos'],
    subsections: [
      {
        title: '1.1 O que é o Profundidade OS',
        objective: 'Apresentar a missão e o valor estratégico da plataforma no ecossistema de infraestruturas.',
        targetAudience: 'Todos os utilizadores, diretores, engenheiros e parceiros.',
        whenToUse: 'Na integração institucional de novos colaboradores ou na apresentação a clientes.',
        content: `A **PROFUNDIDADE OS** é a primeira plataforma integrada de engenharia de estaleiro, gestão de infraestruturas pesadas, controlo financeiro e inteligência preditiva projetada especificamente para o contexto angolano e internacional.

Ao contrário de softwares de faturação passiva ou tabelas de cálculo isoladas, o Profundidade opera como um **sistema ativo de tomada de decisão**:
1. Conecta o estaleiro físico ao conselho de administração em tempo real.
2. Relaciona dados de produção e horímetros de frotas com consumos reais de combustível (emitindo alertas quando os desvios superam 25%).
3. Blinda a empresa contra contestações e litígios contratuais através de assinaturas digitais criptográficas e trancamento probatório de diários com **SHA-256**.
4. Automatiza a emissão de cadernos de medição, faturas, folhas de pagamento e dossiês executivos.`,
        tips: 'O Profundidade foi desenvolvido em Luanda, respeitando as normas jurídicas da contratação pública em Angola (Lei das Empreitadas de Obras Públicas), práticas fiscais da AGT e especificações do INEA/MIREMPET.'
      },
      {
        title: '1.2 Objetivos da Plataforma',
        content: `Os pilares estratégicos do Profundidade são:
- **Tolerância Zero a Desvios Invisíveis:** Identificar derrapagens de custo e atrasos de prazo no próprio dia em que ocorrem, através do cálculo contínuo de EVA (Earned Value Analysis) e alertas antecipados.
- **Rigor Operacional em Estaleiro:** Apontamentos simplificados mesmo em áreas remotas através de funcionamento offline e sincronização automática.
- **Transparência Contratual:** Relatórios de medição com fotografias georreferenciadas, relatórios laboratoriais de betão ($f_{ck}$) e solos (CBR/Proctor) que garantem a aprovação rápida pelos donos de obra e fiscalizações.
- **Eficiência de Capital:** Otimização da distância média de transporte (DMT) em terraplenagens e controlo estrito de ponto de encomenda (Smart Stock) para evitar rutura de cimento, gasóleo e armaduras.`
      },
      {
        title: '1.3 Principais Áreas de Atuação e Setores',
        content: `A plataforma adapta dinamicamente os seus menus e módulos à tipologia da operação:
- **Construção Civil & Edificações:** Estruturas de betão armado, acabamentos, ensaios de provetes e gestão de subempreiteiros.
- **Vias de Comunicação & Estradas:** Estaqueamento a cada 20 metros, terraplenagem com solos tropicais lateríticos, ensaios Proctor/CBR, drenagem e pavimentação betuminosa.
- **Mineração & Exploração Mineral:** Frentes de lavra, transporte de estéril e minério ROM, alimentação fabril, balanço de massas, teores e conformidade com o Processo de Kimberley (KPCS).
- **Energia & Redes:** Monitorização de subestações, produção em kWh/MWh, taxas de disponibilidade e contratos O&M.
- **Topografia & Geotecnia:** Levantamentos GNSS e estação total, malhas triangulares TIN, modelos digitais de terreno (MDT) e cálculo de corte e aterro.`
      },
      {
        title: '1.4 Estrutura Geral e Arquitetura de Navegação',
        content: `A interface do Profundidade é dividida em 4 níveis hierárquicos:
1. **Menu Global (Topo):** Acesso ao seletor de projetos, notificações proativas, pesquisa global instantânea e perfil do utilizador.
2. **Dashboard do Projeto:** Visão panorâmica de indicadores executivos, alertas de risco e curva de avanço.
3. **Módulos Operacionais (Barra Lateral):** Organizados em Planeamento (EAP, Cronograma), Execução (RDO, Equipamentos, FVS), Custos (Orçamento, Faturação, Compras) e Especialidades (Vias, Mineração, Energia).
4. **Motores de Decisão (Fundo):** Os 5 motores inteligentes que processam os dados continuamente sem intervenção humana.`
      }
    ]
  },
  {
    id: 'p1-passos',
    number: 2,
    partId: 'part-1',
    title: 'Primeiros Passos & Navegação',
    iconName: 'Compass',
    category: 'Introdução',
    description: 'Guia prático de acesso, autenticação de dois fatores, recuperação de credenciais e parametrização do perfil.',
    relevantProfiles: ['Todos'],
    subsections: [
      {
        title: '2.1 Requisitos de Acesso e Compatibilidade',
        content: `O Profundidade OS é uma aplicação moderna baseada na web (PWA - Progressive Web App), não exigindo a instalação de servidores locais pesados.

**Requisitos recomendados:**
- **Navegadores suportados:** Google Chrome (versão 100+), Microsoft Edge, Mozilla Firefox, Apple Safari.
- **Dispositivos móveis:** Android 10+ ou iOS 14+ com suporte a geolocalização e câmara para registo de fotos de obra.
- **Conectividade:** Opera perfeitamente em redes 3G, 4G, 5G, Wi-Fi e ligações por satélite (Starlink). Possui modo offline completo com sincronização automática em segundo plano.`
      },
      {
        title: '2.2 Primeiro Acesso e Autenticação',
        steps: [
          'Abra o navegador e aceda ao endereço oficial da sua organização (ex: https://profundidade.app/login).',
          'Introduza o seu e-mail institucional corporativo.',
          'Insira a palavra-passe provisória enviada pelo Administrador do Sistema.',
          'Clique em "Iniciar Sessão".',
          'No primeiro acesso, ser-lhe-á solicitado que defina uma nova palavra-passe segura (mínimo de 8 caracteres, contendo maiúsculas, números e um caractere especial).'
        ],
        content: 'A segurança da plataforma conta com verificação de integridade de sessão e tokens criptográficos JWT com renovação automática.'
      },
      {
        title: '2.3 Recuperação de Palavra-passe',
        content: 'Caso se tenha esquecido da sua senha, clique em "Esqueceu-se da palavra-passe?" no ecrã de início de sessão. Introduza o seu e-mail corporativo. Receberá imediatamente uma mensagem com um link de redefinição com validade estrita de 60 minutos.',
        warning: 'Por motivos de auditoria e segurança, os administradores não têm acesso à sua palavra-passe em texto limpo.'
      },
      {
        title: '2.4 Configuração do Perfil e Assinatura Digital',
        content: 'Aceda a Perfil (canto superior direito). Atualize o seu Nome Completo, Número de Ordem Profissional (OEA - Ordem dos Engenheiros de Angola ou equivalente), Cargo/Função e Telefone de Contacto. Pode ainda carregar a sua assinatura digital para homologação de autos e relatórios em PDF.',
        tips: 'A assinatura digital carregada com fundo transparente será automaticamente estampada nos Autos de Medição e Relatórios Diários de Obra que você aprovar.'
      },
      {
        title: '2.5 Pesquisa Global e Atalhos de Teclado',
        content: 'Pressione **Ctrl + K** (ou Cmd + K no Mac) a partir de qualquer ecrã para abrir a Pesquisa Global Instantânea. Digite o nome de uma tarefa da EAP, número de fatura, matrícula de máquina ou nome de colaborador para navegar diretamente sem múltiplos cliques.'
      }
    ]
  },
  {
    id: 'p1-conceitos',
    number: 3,
    partId: 'part-1',
    title: '15 Conceitos Fundamentais da Plataforma',
    iconName: 'Cpu',
    category: 'Conceitos',
    description: 'Definições normativas e semântica de engenharia aplicadas em todos os módulos do sistema.',
    relevantProfiles: ['Todos'],
    subsections: [
      {
        title: '3.1 Organização e Empresa',
        content: 'A **Organização** é a entidade jurídica de topo (ex: Grupo Construtor). Sob a mesma organização podem coexistir múltiplas **Empresas** (ex: Construtora, Pedreira, Imobiliária, Empresa de Mineração), partilhando catálogo de materiais ou operando com centros de custo independentes.'
      },
      {
        title: '3.2 Projeto e Obra',
        content: 'O **Projeto** é o contentor global de gestão contratual. A **Obra** (ou Empreitada) é a execução física no terreno, podendo um único projeto conter múltiplos lotes ou sub-obras.'
      },
      {
        title: '3.3 Contrato e Termos Aditivos',
        content: 'O instrumento jurídico que formaliza o escopo, o valor original em Kwanzas ou Moeda Forte, prazos contratuais e retenções de garantia (ex: 5% a 10%). Quaisquer alterações de valor ou prazo devem ser formalizadas via Termo Aditivo.'
      },
      {
        title: '3.4 EAP (Estrutura Analítica do Projeto / WBS)',
        content: 'A decomposição hierárquica orientada a entregáveis tangíveis de 100% do escopo do projeto. No Profundidade, a EAP estrutura-se em: Nível 1 (Obra), Nível 2 (Fases), Nível 3 (Subfases) e Nível 4 (Pacotes de Trabalho executáveis).'
      },
      {
        title: '3.5 Atividade e Pacote de Trabalho',
        content: 'O elemento mais granular da EAP onde são alocados recursos, atribuídas durações em dias úteis, orçadas quantidades unitárias e lançadas medições físicas.'
      },
      {
        title: '3.6 Recurso (Mão de Obra, Material e Equipamento)',
        content: 'Insumos necessários para executar uma atividade. Classificam-se em Mão de Obra (homem-hora), Material (sacos, m³, kg) e Equipamento (hora-máquina).'
      },
      {
        title: '3.7 Centro de Custo',
        content: 'Unidade contábil para onde convergem todas as despesas e receitas de uma fase específica, frente de trabalho ou departamento da empresa.'
      },
      {
        title: '3.8 Orçamento e Composição de Preço Unitário (CPU)',
        content: 'O cálculo antecipado do custo total da obra. Cada CPU discrimina o coeficiente de consumo de materiais, rendimento de oficiais/serventes e custo horário de equipamentos.'
      },
      {
        title: '3.9 Medição e Auto de Medição',
        content: 'O levantamento físico quantitativo do trabalho realizado num determinado período (normalmente mensal) para efeitos de faturação ao Dono da Obra.'
      },
      {
        title: '3.10 Progresso Físico vs. Progresso Financeiro',
        content: 'O **Progresso Físico** mede o trabalho físico concluído ponderado pelo peso orçamental (% Físico = Somatório (Qtd Executada × Preço Unitário) / Orçamento Total). O **Progresso Financeiro** mede os pagamentos efetivamente recebidos do cliente.'
      },
      {
        title: '3.11 Custo Realizado (Actual Cost - AC)',
        content: 'O somatório financeiro de todas as faturas, custos de mão de obra e combustíveis imputados à obra até à data de medição.'
      },
      {
        title: '3.12 Cronograma e Caminho Crítico (CPM)',
        content: 'A sequência temporal de atividades vinculadas por predecessoras (Fim-a-Início). O Caminho Crítico é a sequência de atividades com folga zero que determina a data final de entrega da empreitada.'
      },
      {
        title: '3.13 Equipamento e Horímetro',
        content: 'Máquinas pesadas (escavadoras, pás carregadoras, camiões dumper) cujo controlo operacional é medido por horas de funcionamento contadas pelo horímetro mecânico ou telemetria.'
      },
      {
        title: '3.14 Frente de Trabalho',
        content: 'Localização física específica no estaleiro ou no troço da estrada (ex: "Frente de Terraplenagem PK 12+000 a PK 15+000" ou "Frente de Estruturas Bloco B").'
      },
      {
        title: '3.15 Linha de Base (Baseline)',
        content: 'O plano original aprovado (escopo, custo e prazo). Todos os desvios de desempenho calculados pela plataforma são comparados contra esta linha de base fixada.'
      }
    ]
  }
];
