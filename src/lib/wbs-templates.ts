import type { WbsItemCategory } from '@/types/wbs';

export interface WbsTemplateItem {
  name: string;
  category: WbsItemCategory;
  description?: string;
  deliverable?: string;
  acceptanceCriteria?: string;
  effortHours?: number;
  budgetRatio?: number; // percentual aproximado do orçamento
  durationDays?: number;
  isMilestone?: boolean;
  children?: WbsTemplateItem[];
}

export interface WbsTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  estimatedPhases: number;
  items: WbsTemplateItem[];
}

export const WBS_TEMPLATES: WbsTemplate[] = [
  {
    id: 'residential-building',
    title: 'Edifício Habitacional / Comercial Multifamiliar',
    category: 'Edificação Vertical',
    description: 'Decomposição completa para construção de edifícios em betão armado, desde a conceção e fundações até aos acabamentos e telas finais.',
    estimatedPhases: 7,
    items: [
      {
        name: '1.0 Planeamento, Licenciamento e Estaleiro',
        category: 'Planeamento e Licenciamento',
        description: 'Coordenação preliminar, obtenção de licenças municipais, topografia e instalação do estaleiro de apoio à obra.',
        children: [
          {
            name: '1.1 Aprovação de Projetos & Licença de Construção',
            category: 'Planeamento e Licenciamento',
            description: 'Validação de especialidades e emissão do alvará de construção.',
            isMilestone: true,
            deliverable: 'Alvará de Construção emitido e afixado no estaleiro.',
            acceptanceCriteria: 'Conformidade com o Regulamento Geral das Edificações Urbanas (RGEU).'
          },
          {
            name: '1.2 Implantação e Montagem do Estaleiro de Obra',
            category: 'Planeamento e Licenciamento',
            description: 'Montagem de tapumes, contentores de apoio, refeitório, sanitários, água e energia provisória.',
            effortHours: 120,
            deliverable: 'Estaleiro operacional devidamente vedado e sinalizado.',
            acceptanceCriteria: 'Aprovação pelo Coordenador de Segurança e Saúde em Obra.'
          },
          {
            name: '1.3 Levantamento Topográfico e Marcação de Eixos',
            category: 'Planeamento e Licenciamento',
            description: 'Implantação precisa dos eixos estruturais e cotas de nível de referência.',
            effortHours: 60,
            deliverable: 'Auto de implantação topográfica com cotas de soleira.',
            acceptanceCriteria: 'Erro de implantação inferior a ±2mm em relação ao projeto.'
          }
        ]
      },
      {
        name: '2.0 Movimento de Terras e Fundações',
        category: 'Fundações',
        description: 'Desaterro geral, contenção de terras periférica e execução de fundações diretas ou profundas.',
        children: [
          {
            name: '2.1 Escavação Geral e Nivelamento do Terreno',
            category: 'Fundações',
            description: 'Escavação mecânica para níveis de cave e fundações.',
            effortHours: 180,
            deliverable: 'Fundo de escavação limpo e compactado com cota aprovada.',
            acceptanceCriteria: 'Capacidade de carga geotécnica confirmada pelo laboratório de solos.'
          },
          {
            name: '2.2 Execução de Muros de Suporte e Contenção',
            category: 'Fundações',
            description: 'Armaduras, cofragens e betonagem dos muros de contenção periférica.',
            effortHours: 240,
            deliverable: 'Muro de suporte concluído com drenagem perimetral.',
            acceptanceCriteria: 'Impermeabilização contínua e ensaio de compressão do betão aprovado.'
          },
          {
            name: '2.3 Sapatas, Maciços e Ensoleiramento Geral',
            category: 'Fundações',
            description: 'Armação de ferro, cofragem e betonagem das sapatas e vigas de fundação.',
            effortHours: 320,
            deliverable: 'Fundações betonadas com armaduras de espera para pilares.',
            acceptanceCriteria: 'Ensaio aos 28 dias do betão classe C30/37 conforme NP EN 206.'
          }
        ]
      },
      {
        name: '3.0 Estrutura de Betão Armado',
        category: 'Estrutura',
        description: 'Execução do esqueleto portante do edifício: pilares, vigas, núcleos de escada/elevador e lajes.',
        children: [
          {
            name: '3.1 Pilares e Paredes Portantes dos Pisos',
            category: 'Estrutura',
            description: 'Montagem de armaduras, cofragens metálicas/madeira e betonagem vibrada.',
            effortHours: 400,
            deliverable: 'Pilares prumados e desmoldados.',
            acceptanceCriteria: 'Tolerância de verticalidade < 3mm por piso.'
          },
          {
            name: '3.2 Vigas e Lajes Maciças / Fungiformes',
            category: 'Estrutura',
            description: 'Montagem de escoramentos, fundos de vigas, armadura inferior/superior e betonagem.',
            effortHours: 500,
            deliverable: 'Lajes betonadas e curadas.',
            acceptanceCriteria: 'Nivelamento de face superior com tolerância de ±5mm e desmoldagem após prazo normativo.'
          },
          {
            name: '3.3 Conclusão da Estrutura do Edifício',
            category: 'Estrutura',
            isMilestone: true,
            deliverable: 'Laje de cobertura betonada e estrutura resistente 100% concluída.',
            acceptanceCriteria: 'Auto de receção da estrutura emitido pelo Engenheiro Estrutural.'
          }
        ]
      },
      {
        name: '4.0 Alvenarias, Vedações e Cobertura',
        category: 'Alvenaria e Vedações',
        description: 'Elevação de alvenarias exteriores duplas, divisórias interiores e impermeabilização da cobertura.',
        children: [
          {
            name: '4.1 Alvenarias Exteriores com Isolamento Térmico',
            category: 'Alvenaria e Vedações',
            description: 'Paredes exteriores com bloco de cimento/tijolo e tela ou lã de rocha.',
            effortHours: 300,
            deliverable: 'Fachadas erguidas com caixas de estore e vãos esquadriados.',
            acceptanceCriteria: 'Alinhamento com fio-de-prumo e juntas de argamassa regulares de 1.5cm.'
          },
          {
            name: '4.2 Divisórias Interiores de Compartimentação',
            category: 'Alvenaria e Vedações',
            description: 'Distribuição dos compartimentos internos dos apartamentos/escritórios.',
            effortHours: 260,
            deliverable: 'Paredes divisórias levantadas com roços para tubagens.',
            acceptanceCriteria: 'Esquadria dos cantos a 90° e amarração à estrutura.'
          },
          {
            name: '4.3 Impermeabilização e Isolamento da Cobertura',
            category: 'Cobertura',
            description: 'Aplicação de pendentes em betão leve, telas asfálticas/cruzadas e isolamento XPS.',
            effortHours: 160,
            deliverable: 'Cobertura impermeabilizada e protegida termicamente.',
            acceptanceCriteria: 'Ensaio de estanquidade por inundação (72 horas sem qualquer infiltração).'
          }
        ]
      },
      {
        name: '5.0 Instalações Especiais e Redes Técnicas',
        category: 'Instalações Elétricas',
        description: 'Redes embutidas de eletricidade, ITED, canalizações de águas, esgotos, AVAC e proteção contra incêndio.',
        children: [
          {
            name: '5.1 Redes Elétricas, Iluminação e Posto de Transformação',
            category: 'Instalações Elétricas',
            description: 'Passagem de cabos, quadros parciais e geral, tomadas e rede de terras.',
            effortHours: 380,
            deliverable: 'Instalação elétrica testada com continuidade e resistência de isolamento.',
            acceptanceCriteria: 'Certificação pelas regras técnicas de segurança e rede de terras < 10 Ohms.'
          },
          {
            name: '5.2 Redes Hidráulicas (Águas Limpas e Residuais)',
            category: 'Instalações Hidráulicas',
            description: 'Tubagem multicamada para abastecimento e PVC rígido para esgotos e ventilação primária.',
            effortHours: 320,
            deliverable: 'Redes de água e drenagem prontas para receber aparelhos.',
            acceptanceCriteria: 'Ensaio de pressão hidrostática a 10 bar durante 2 horas sem perdas.'
          },
          {
            name: '5.3 AVAC e Desenfuamamento Mecânico',
            category: 'Instalações Elétricas',
            description: 'Condutas de climatização, unidades exteriores e sistemas de renovação de ar.',
            effortHours: 220,
            deliverable: 'Equipamentos de AVAC montados e ligados à rede frigorífica.',
            acceptanceCriteria: 'Teste de vácuo, carga de refrigerante e caudal de ar aferido.'
          }
        ]
      },
      {
        name: '6.0 Revestimentos e Acabamentos',
        category: 'Acabamentos',
        description: 'Execução de rebocos, betonilhas, cerâmicos, pinturas, caixilharias, portas e louças sanitárias.',
        children: [
          {
            name: '6.1 Rebocos Projetados e Betonilhas de Pavimento',
            category: 'Acabamentos',
            description: 'Camada de regularização para paredes e pavimentos.',
            effortHours: 350,
            deliverable: 'Superfícies desempenadas prontas para revestimento final.',
            acceptanceCriteria: 'Planeza com régua de 2m: tolerância máxima de 3mm.'
          },
          {
            name: '6.2 Assentamento de Cerâmicas e Pavimentos Flutuantes',
            category: 'Acabamentos',
            description: 'Colocação de mosaicos em zonas húmidas e pavimento nos quartos e salas.',
            effortHours: 380,
            deliverable: 'Pavimentos e paredes revestidos e betumados.',
            acceptanceCriteria: 'Juntas retas, uniformes e sem ressaltos entre peças.'
          },
          {
            name: '6.3 Caixilharias de Alumínio com Vidro Duplo',
            category: 'Acabamentos',
            description: 'Montagem de janelas e portas exteriores com rutura térmica.',
            effortHours: 180,
            deliverable: 'Edifício completamente fechado ao vento e água.',
            acceptanceCriteria: 'Estanquidade à água, permeabilidade ao ar e funcionamento suave das ferragens.'
          },
          {
            name: '6.4 Pinturas Interiores e Exteriores',
            category: 'Acabamentos',
            description: 'Lixagem, primário e aplicação de demãos de tinta aquosa lavável.',
            effortHours: 300,
            deliverable: 'Paredes e tetos pintados com acabamento acetinado/mate homogéneo.',
            acceptanceCriteria: 'Ausência de sombras, escorridos ou falhas de cobertura.'
          }
        ]
      },
      {
        name: '7.0 Vistorias, Telas Finais e Entrega',
        category: 'Planeamento e Licenciamento',
        description: 'Limpeza geral da obra, ensaios funcionais, documentação técnica "As-Built" e entrega ao cliente.',
        children: [
          {
            name: '7.1 Limpeza Fina de Fim de Obra e Desmobilização',
            category: 'Outros',
            description: 'Remoção de entulhos, lavagem de vidros e desmonte das instalações do estaleiro.',
            effortHours: 120,
            deliverable: 'Instalações prontas e limpas para ocupação.',
            acceptanceCriteria: 'Vistoria visual sem vestígios de argamassas ou tintas.'
          },
          {
            name: '7.2 Telas Finais (As-Built) e Licença de Utilização',
            category: 'Planeamento e Licenciamento',
            description: 'Compilação técnica das plantas finais com as alterações executadas e vistoria camarária.',
            isMilestone: true,
            deliverable: 'Alvará de Utilização e Dossier Técnico de Manutenção do Edifício.',
            acceptanceCriteria: 'Aprovação unânime em vistoria da Fiscalização e Proteção Civil.'
          }
        ]
      }
    ]
  },
  {
    id: 'residential-villa',
    title: 'Moradia Unifamiliar / Vivenda T3-T4',
    category: 'Construção Residencial',
    description: 'Estrutura otimizada para habitação unifamiliar com foco em arranjos exteriores, piscina e acabamentos de qualidade.',
    estimatedPhases: 6,
    items: [
      {
        name: '1.0 Trabalhos Preparatórios e Movimentação de Terras',
        category: 'Planeamento e Licenciamento',
        description: 'Limpeza do lote, desmatação, implantação topográfica e abertura de valas para fundações.',
        children: [
          { name: '1.1 Implantação e Desaterro Geral', category: 'Fundações', effortHours: 80, deliverable: 'Terreno modelado nas cotas do projeto de arquitetura.' },
          { name: '1.2 Rede Enterrada de Drenagem e Saneamento', category: 'Instalações Hidráulicas', effortHours: 60, deliverable: 'Tubagem subterrânea com caixas de visita executadas.' }
        ]
      },
      {
        name: '2.0 Estrutura Resistente e Envolvente',
        category: 'Estrutura',
        description: 'Sapatas isoladas, vigas de baldrame, laje térrea ventilada e estrutura portante.',
        children: [
          { name: '2.1 Fundações e Ensoleiramento Térreo', category: 'Fundações', effortHours: 140, deliverable: 'Laje térrea com barreira anti-humidade.' },
          { name: '2.2 Pilares, Vigas e Laje de Cobertura', category: 'Estrutura', effortHours: 200, deliverable: 'Estrutura de betão armado concluída.' },
          { name: '2.3 Alvenaria Exterior Dupla e Platibandas', category: 'Alvenaria e Vedações', effortHours: 160, deliverable: 'Paredes exteriores prontas para reboco.' }
        ]
      },
      {
        name: '3.0 Redes Prediais Embutidas',
        category: 'Instalações Elétricas',
        description: 'Redes técnicas de água, esgoto, eletricidade, ITED e pré-instalação de painéis solares.',
        children: [
          { name: '3.1 Instalações Hidráulicas e Gás', category: 'Instalações Hidráulicas', effortHours: 110, deliverable: 'Tubagens ensaiadas sob pressão.' },
          { name: '3.2 Eletricidade, Domótica e Iluminação', category: 'Instalações Elétricas', effortHours: 130, deliverable: 'Tubagens e caixas de aparelhagem fixadas.' }
        ]
      },
      {
        name: '4.0 Acabamentos de Arquitetura Interior',
        category: 'Acabamentos',
        description: 'Betonilhas, cerâmicas, sanitários suspensos, móveis de cozinha e pintura.',
        children: [
          { name: '4.1 Pavimentos, Azulejos e Carpintarias', category: 'Acabamentos', effortHours: 220, deliverable: 'Portas interiores, rodapés e pisos aplicados.' },
          { name: '4.2 Cozinha Equipada e Instalações Sanitárias', category: 'Acabamentos', effortHours: 150, deliverable: 'Bancadas, torneiras e eletrodomésticos instalados.' },
          { name: '4.3 Pintura Geral Interior', category: 'Acabamentos', effortHours: 120, deliverable: 'Demãos de acabamento finalizadas.' }
        ]
      },
      {
        name: '5.0 Arranjos Exteriores, Muros e Piscina',
        category: 'Áreas Exteriores',
        description: 'Construção da piscina, pavê/calçada de acesso, muros de vedação e relvado.',
        children: [
          { name: '5.1 Muros de Vedação e Portão Automático', category: 'Áreas Exteriores', effortHours: 130, deliverable: 'Lote perimetralmente fechado e seguro.' },
          { name: '5.2 Estrutura da Piscina e Sistema de Filtragem', category: 'Áreas Exteriores', effortHours: 160, deliverable: 'Piscina impermeabilizada e casa de máquinas instalada.' },
          { name: '5.3 Pavimentação Exterior e Paisagismo', category: 'Áreas Exteriores', effortHours: 110, deliverable: 'Jardim com sistema de rega automática funcional.' }
        ]
      },
      {
        name: '6.0 Conclusão e Entrega de Chaves',
        category: 'Planeamento e Licenciamento',
        description: 'Verificação detalhada de anomalias (punch-list) e entrega das chaves ao proprietário.',
        isMilestone: true,
        children: [
          { name: '6.1 Vistoria de Entrega e Termo de Receção', category: 'Planeamento e Licenciamento', isMilestone: true, deliverable: 'Auto de Entrega da Moradia assinado pelo cliente.' }
        ]
      }
    ]
  },
  {
    id: 'road-infrastructure',
    title: 'Infraestrutura Rodoviária & Pavimentação Asfáltica',
    category: 'Vias de Comunicação',
    description: 'EAP para estradas, vias urbanas ou acessos industriais com terraplenagem, obras de arte e sinalização.',
    estimatedPhases: 5,
    items: [
      {
        name: '1.0 Trabalhos Preliminares e Desmatação',
        category: 'Planeamento e Licenciamento',
        description: 'Levantamento de eixos com GPS/estação total, corte de vegetação e remoção de terra vegetal.',
        children: [
          { name: '1.1 Piquetagem e Marcação dos Eixos Rodoviários', category: 'Planeamento e Licenciamento', effortHours: 80, deliverable: 'Estacas de crista e pé de talude implantadas.' },
          { name: '1.2 Desmatação e Decapagem de Terra Vegetal', category: 'Fundações', effortHours: 150, deliverable: 'Faixa de rodagem livre de matéria orgânica.' }
        ]
      },
      {
        name: '2.0 Terraplenagem e Regularização do Leito',
        category: 'Fundações',
        description: 'Cortes mecânicos, aterros compensados em camadas de 30cm e ensaios de compactação.',
        children: [
          { name: '2.1 Escavação em Desaterro e Transporte a Vazadouro', category: 'Fundações', effortHours: 240, deliverable: 'Plataforma escavada com inclinação de projeto.' },
          { name: '2.2 Execução e Compactação de Aterros Rodoviários', category: 'Fundações', effortHours: 320, deliverable: 'Aterro compactado.', acceptanceCriteria: 'Grau de compactação > 95% do Proctor Modificado.' }
        ]
      },
      {
        name: '3.0 Drenagem Longitudinal e Obras de Arte Correntes',
        category: 'Instalações Hidráulicas',
        description: 'Construção de valetas em betão, aquedutos de transposição, caixas de retenção e passagens hidráulicas.',
        children: [
          { name: '3.1 Valetas Revestidas a Betão e Descidas de Água', category: 'Instalações Hidráulicas', effortHours: 200, deliverable: 'Sistema de escoamento superficial concluído.' },
          { name: '3.2 Aquedutos e Manilhas Armadas de Passagem', category: 'Instalações Hidráulicas', effortHours: 180, deliverable: 'Passagens de água transversais operacionais.' }
        ]
      },
      {
        name: '4.0 Camadas de Pavimento (Sub-Base, Base e Desgaste)',
        category: 'Estrutura',
        description: 'Espalhamento de agregado britado (tout-venant), imprimação betuminosa e camada de asfalto quente.',
        children: [
          { name: '4.1 Camada de Sub-base e Base em Agregado Graduado (ABGE)', category: 'Estrutura', effortHours: 260, deliverable: 'Base nivelada com tolerância de nivelamento inferior a 1cm.' },
          { name: '4.2 Rega de Imprimação e Ligação Asfáltica', category: 'Estrutura', effortHours: 90, deliverable: 'Emulsão asfáltica uniformemente aplicada sem falhas.' },
          { name: '4.3 Aplicação e Cilindragem do Tapete Betuminoso (CBO)', category: 'Estrutura', effortHours: 280, deliverable: 'Pavimento asfáltico executado a quente.', acceptanceCriteria: 'Espessura média de projeto e índice de regularidade (IRI) conforme caderno de encargos.' }
        ]
      },
      {
        name: '5.0 Sinalização e Equipamentos de Segurança',
        category: 'Áreas Exteriores',
        description: 'Pintura de faixas termoplásticas, marcos quilométricos, placas verticais e barreiras metálicas bico-de-pato.',
        children: [
          { name: '5.1 Sinalização Horizontal e Vertical', category: 'Áreas Exteriores', effortHours: 110, deliverable: 'Linhas contínuas/descontínuas e placas montadas.' },
          { name: '5.2 Guardas de Segurança Metálicas (Rails)', category: 'Áreas Exteriores', effortHours: 140, deliverable: 'Guardas de segurança cravadas nos taludes perigosos.' },
          { name: '5.3 Liberação ao Tráfego Rodoviário', category: 'Planeamento e Licenciamento', isMilestone: true, deliverable: 'Auto de vistoria e abertura oficial da via.' }
        ]
      }
    ]
  },
  {
    id: 'building-rehab',
    title: 'Reabilitação e Remodelação Integral de Edifícios',
    category: 'Reabilitação',
    description: 'EAP focada em obras de renovação de património construído, diagnósticos estruturais e modernização técnica.',
    estimatedPhases: 5,
    items: [
      {
        name: '1.0 Inspeção Diagnóstica e Escoramentos Provisórios',
        category: 'Planeamento e Licenciamento',
        description: 'Vistoria detalhada de fissuras, humidades e colocação de escoras nas zonas instáveis.',
        children: [
          { name: '1.1 Mapeamento de Danos e Parecer Estrutural', category: 'Planeamento e Licenciamento', effortHours: 70, deliverable: 'Relatório patológico com plano de reforço.' },
          { name: '1.2 Escoramento Metálico e Estabilização de Fachadas', category: 'Estrutura', effortHours: 110, deliverable: 'Fachada e pisos escorados com segurança garantida.' }
        ]
      },
      {
        name: '2.0 Demolições Seletivas e Gestão de RCD',
        category: 'Fundações',
        description: 'Desmonte de tabiques degradados, revestimentos antigos e transporte seguro dos resíduos de construção.',
        children: [
          { name: '2.1 Demolições Manuais e Picagem de Rebocos', category: 'Fundações', effortHours: 160, deliverable: 'Alvenarias originais a descoberto para tratamento.' },
          { name: '2.2 Triagem e Encaminhamento de Entulhos para Vazadouro', category: 'Outros', effortHours: 80, deliverable: 'Guias de transporte de resíduos (RCD) carimbadas.' }
        ]
      },
      {
        name: '3.0 Reforço Estrutural e Tratamento de Humidades',
        category: 'Estrutura',
        description: 'Consolidação de alvenarias com cal hidráulica, injeção de resinas e reforço de vigas com perfis metálicos.',
        children: [
          { name: '3.1 Injeção de Resinas e Barreiras Químicas Anti-Ascensional', category: 'Estrutura', effortHours: 130, deliverable: 'Paredes tratadas contra humidade capilar.' },
          { name: '3.2 Reforço de Vigas e Pilares com Perfis de Aço Laminado', category: 'Estrutura', effortHours: 190, deliverable: 'Estrutura reforçada de acordo com os novos cálculos.' }
        ]
      },
      {
        name: '4.0 Substituição Total de Instalações e Caixilharia',
        category: 'Instalações Elétricas',
        description: 'Passagem de novas prumadas técnicas, eletricidade moderna e janelas eficientes.',
        children: [
          { name: '4.1 Novas Redes de Eletricidade, Dados e Climatização', category: 'Instalações Elétricas', effortHours: 210, deliverable: 'Redes técnicas completamente modernizadas.' },
          { name: '4.2 Janelas de Madeira Maciça / Alumínio de Corte Térmico', category: 'Acabamentos', effortHours: 120, deliverable: 'Caixilharia restaurada ou substituída respeitando a traça arquitetónica.' }
        ]
      },
      {
        name: '5.0 Acabamentos Interiores e Restauro de Elementos Históricos',
        category: 'Acabamentos',
        description: 'Recuperação de tetos trabalhados, afagamento de soalhos em madeira e pinturas nobres.',
        children: [
          { name: '5.1 Restauro de Soalhos Antigos e Carpintarias Nobres', category: 'Acabamentos', effortHours: 180, deliverable: 'Madeiras originais afagadas e envernizadas.' },
          { name: '5.2 Pintura com Tintas Minerais de Silicato', category: 'Acabamentos', effortHours: 140, deliverable: 'Paredes respiráveis com acabamento histórico.' },
          { name: '5.3 Receção Definitiva da Obra Remodelada', category: 'Planeamento e Licenciamento', isMilestone: true, deliverable: 'Imóvel pronto para habitação ou exploração turística.' }
        ]
      }
    ]
  }
];
