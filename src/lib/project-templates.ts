import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WbsItem } from '@/types/wbs';
import type { ProjectCpuItem } from '@/types/engine-scenarios';

export interface ProjectTemplate {
  id: string;
  name: string;
  category: 
    | 'Construção Civil' 
    | 'Estradas & Vias' 
    | 'Instalações & Infraestruturas' 
    | 'Pintura & Acabamentos'
    | 'Reabilitação'
    | 'Obras Especiais'
    | 'Mineração'
    | 'Topografia'
    | 'Geral';
  description: string;
  iconName: string;
  defaultBudgetAOA: number;
  durationDays: number;
  wbsItems: Array<{
    code: string;
    name: string;
    category: any;
    budgetSharePct: number;
    effortHours: number;
    unit: string;
    estimatedQty: number;
  }>;
  cpus: Array<{
    code: string;
    description: string;
    unit: string;
    basePriceAOA: number;
    dieselShare?: number;
    importUsdShare?: number;
    cementShare?: number;
    steelShare?: number;
    laborShare?: number;
  }>;
}

export const NATIVE_PROJECT_TEMPLATES: ProjectTemplate[] = [
  // 1. EDIFÍCIO / HABITAÇÃO
  {
    id: 'template-moradia-edificio',
    name: 'Construção de Edifício / Habitação',
    category: 'Construção Civil',
    description: 'Estrutura completa pronta com sapatas, pilares, vigas, alvenaria de blocos, cobertura e acabamentos de engenharia.',
    iconName: 'Building2',
    defaultBudgetAOA: 85000000, // 85M Kz
    durationDays: 180,
    wbsItems: [
      { code: '1.0', name: 'Trabalhos Preparatórios e Movimentação de Terras', category: 'Fundações', budgetSharePct: 8, effortHours: 120, unit: 'm³', estimatedQty: 250 },
      { code: '2.0', name: 'Fundações Diretas / Sapatas em Betão C25/30', category: 'Fundações', budgetSharePct: 18, effortHours: 240, unit: 'm³', estimatedQty: 65 },
      { code: '3.0', name: 'Estrutura de Betão Armado (Pilares, Vigas e Lajes)', category: 'Estrutura', budgetSharePct: 30, effortHours: 420, unit: 'm³', estimatedQty: 120 },
      { code: '4.0', name: 'Alvenaria de Elevação em Blocos de Cimento (15cm)', category: 'Alvenaria e Vedações', budgetSharePct: 14, effortHours: 280, unit: 'm²', estimatedQty: 850 },
      { code: '5.0', name: 'Cobertura em Estrutura Metálica e Chapa Sanduíche', category: 'Cobertura', budgetSharePct: 10, effortHours: 140, unit: 'm²', estimatedQty: 320 },
      { code: '6.0', name: 'Instalações Hidrossanitárias e Esgotos', category: 'Instalações Hidráulicas', budgetSharePct: 7, effortHours: 160, unit: 'vg', estimatedQty: 1 },
      { code: '7.0', name: 'Instalações Elétricas, Força e Iluminação', category: 'Instalações Elétricas', budgetSharePct: 8, effortHours: 180, unit: 'vg', estimatedQty: 1 },
      { code: '8.0', name: 'Revestimentos, Rebocos e Acabamentos Finais', category: 'Acabamentos', budgetSharePct: 5, effortHours: 220, unit: 'm²', estimatedQty: 1200 }
    ],
    cpus: [
      {
        code: 'CPU-EDIF-01',
        description: 'Betão Armado Estrutural C25/30 (inclui armaduras A500 e cofragem)',
        unit: 'm³',
        basePriceAOA: 215000,
        cementShare: 0.38,
        steelShare: 0.32,
        laborShare: 0.20,
        dieselShare: 0.10
      },
      {
        code: 'CPU-EDIF-02',
        description: 'Alvenaria de Vedação em Bloco de Betão 15x20x40cm com argamassa 1:4',
        unit: 'm²',
        basePriceAOA: 11500,
        cementShare: 0.45,
        laborShare: 0.40,
        importUsdShare: 0.15
      },
      {
        code: 'CPU-EDIF-03',
        description: 'Fornecimento e Aplicação de Aço A500 NR para Estruturas',
        unit: 'kg',
        basePriceAOA: 1350,
        steelShare: 0.70,
        importUsdShare: 0.20,
        laborShare: 0.10
      },
      {
        code: 'CPU-EDIF-04',
        description: 'Reboco Tradicional Interior e Exterior com Argamassa Hidráulica',
        unit: 'm²',
        basePriceAOA: 5800,
        cementShare: 0.50,
        laborShare: 0.50
      }
    ]
  },

  // 2. ESTRADA / TERRAPLANAGEM
  {
    id: 'template-estrada-terraplanagem',
    name: 'Construção de Estrada / Terraplanagem & Asfalto',
    category: 'Estradas & Vias',
    description: 'Modelo parametrizado para estradas e terraplanagem com estacas, escavação, transporte DMT, base de tout-venant e pavimento.',
    iconName: 'Route',
    defaultBudgetAOA: 340000000, // 340M Kz
    durationDays: 240,
    wbsItems: [
      { code: '1.0', name: 'Desmatação, Decapagem e Limpeza da Faixa de Rodagem', category: 'Planeamento e Licenciamento', budgetSharePct: 7, effortHours: 150, unit: 'm²', estimatedQty: 45000 },
      { code: '2.0', name: 'Movimento de Terras: Escavação em Rocha e Terraço (Corte)', category: 'Fundações', budgetSharePct: 22, effortHours: 360, unit: 'm³', estimatedQty: 28000 },
      { code: '3.0', name: 'Aterro Compactado com Agregados Selecionados (DMT 12km)', category: 'Fundações', budgetSharePct: 24, effortHours: 400, unit: 'm³', estimatedQty: 22000 },
      { code: '4.0', name: 'Drenagem Longitudinal: Valetas Revestidas e Manilhas Ø800', category: 'Instalações Hidráulicas', budgetSharePct: 15, effortHours: 260, unit: 'ml', estimatedQty: 3200 },
      { code: '5.0', name: 'Camada de Sub-base e Base em Tout-Venant Britado (esp. 20cm)', category: 'Estrutura', budgetSharePct: 18, effortHours: 320, unit: 'm³', estimatedQty: 8500 },
      { code: '6.0', name: 'Imprimação e Camada de Desgaste em Betão Betuminoso (BB)', category: 'Acabamentos', budgetSharePct: 10, effortHours: 200, unit: 'm²', estimatedQty: 18000 },
      { code: '7.0', name: 'Sinalização Horizontal, Vertical e Guardas Metálicas', category: 'Outros', budgetSharePct: 4, effortHours: 90, unit: 'km', estimatedQty: 5 }
    ],
    cpus: [
      {
        code: 'CPU-VIA-01',
        description: 'Escavação Mecânica e Carga em Terraplanagem com Escavadora 22t',
        unit: 'm³',
        basePriceAOA: 5200,
        dieselShare: 0.55,
        laborShare: 0.25,
        importUsdShare: 0.20
      },
      {
        code: 'CPU-VIA-02',
        description: 'Transporte Rodoviário de Terras e Inertes com Camião Basculante (DMT 12km)',
        unit: 'm³·km',
        basePriceAOA: 380,
        dieselShare: 0.65,
        laborShare: 0.20,
        importUsdShare: 0.15
      },
      {
        code: 'CPU-VIA-03',
        description: 'Espalhamento e Compactação de Tout-Venant para Camada de Base',
        unit: 'm³',
        basePriceAOA: 18500,
        dieselShare: 0.40,
        cementShare: 0.15,
        laborShare: 0.25,
        importUsdShare: 0.20
      },
      {
        code: 'CPU-VIA-04',
        description: 'Fornecimento e Aplicação de Betão Betuminoso a Quente (Camada de Desgaste)',
        unit: 't',
        basePriceAOA: 98000,
        importUsdShare: 0.45,
        dieselShare: 0.35,
        laborShare: 0.20
      }
    ]
  },

  // 3. OBRA DE PINTURA
  {
    id: 'template-pintura-acabamentos',
    name: 'Obra de Pintura & Revestimentos',
    category: 'Pintura & Acabamentos',
    description: 'Fluxo rápido para medição em m²: preparação de superfícies, lixamento, primário e demãos de pintura interior e exterior.',
    iconName: 'Paintbrush',
    defaultBudgetAOA: 18500000, // 18.5M Kz
    durationDays: 45,
    wbsItems: [
      { code: '1.0', name: 'Proteção de Caixilhos, Pisos e Limpeza Mecânica', category: 'Planeamento e Licenciamento', budgetSharePct: 10, effortHours: 60, unit: 'm²', estimatedQty: 1800 },
      { code: '2.0', name: 'Raspagem, Escovagem e Reparação de Fissuras com Betume', category: 'Alvenaria e Vedações', budgetSharePct: 22, effortHours: 120, unit: 'm²', estimatedQty: 1800 },
      { code: '3.0', name: 'Aplicação de Primário Fixador Aquoso de Alta Penetração', category: 'Acabamentos', budgetSharePct: 18, effortHours: 90, unit: 'm²', estimatedQty: 1800 },
      { code: '4.0', name: 'Pintura de Paredes e Tetos Interiores (2 Demãos Tinta Plástica)', category: 'Acabamentos', budgetSharePct: 26, effortHours: 160, unit: 'm²', estimatedQty: 1200 },
      { code: '5.0', name: 'Pintura de Fachadas Exteriores (Tinta Acrílica Anti-Fungos 100%)', category: 'Acabamentos', budgetSharePct: 24, effortHours: 140, unit: 'm²', estimatedQty: 600 }
    ],
    cpus: [
      {
        code: 'CPU-PINT-01',
        description: 'Pintura Plástica Interior Mate Lavável (inclui primário e 2 demãos)',
        unit: 'm²',
        basePriceAOA: 3400,
        laborShare: 0.55,
        importUsdShare: 0.40,
        dieselShare: 0.05
      },
      {
        code: 'CPU-PINT-02',
        description: 'Pintura Acrílica Exterior com Proteção UV e Anti-Fungos',
        unit: 'm²',
        basePriceAOA: 4800,
        laborShare: 0.50,
        importUsdShare: 0.45,
        dieselShare: 0.05
      },
      {
        code: 'CPU-PINT-03',
        description: 'Preparação, Betumagem e Lixamento de Paredes com Massa Fina',
        unit: 'm²',
        basePriceAOA: 2100,
        laborShare: 0.70,
        cementShare: 0.20,
        importUsdShare: 0.10
      }
    ]
  },

  // 4. REABILITAÇÃO DE IMÓVEIS
  {
    id: 'template-reabilitacao',
    name: 'Reabilitação & Recuperação de Imóveis',
    category: 'Reabilitação',
    description: 'Intervenção em edifícios existentes: demolições seletivas, consolidação estrutural, renovação de canalizações e novos acabamentos.',
    iconName: 'Home',
    defaultBudgetAOA: 45000000, // 45M Kz
    durationDays: 90,
    wbsItems: [
      { code: '1.0', name: 'Demolições Cuidadas de Paredes, Revestimentos e Remoção de Entulho', category: 'Fundações', budgetSharePct: 15, effortHours: 140, unit: 'm³', estimatedQty: 80 },
      { code: '2.0', name: 'Saneamento Estrutural e Reparação de Patologias em Betão', category: 'Estrutura', budgetSharePct: 22, effortHours: 180, unit: 'm²', estimatedQty: 350 },
      { code: '3.0', name: 'Substituição Integral das Redes de Águas e Esgotos Sanitários', category: 'Instalações Hidráulicas', budgetSharePct: 20, effortHours: 160, unit: 'vg', estimatedQty: 1 },
      { code: '4.0', name: 'Novo Quadro Elétrico, Cablagens e Aparelhagem Saliente/Embutida', category: 'Instalações Elétricas', budgetSharePct: 18, effortHours: 130, unit: 'un', estimatedQty: 45 },
      { code: '5.0', name: 'Aplicação de Pavimentos Cerâmicos e Rodapés', category: 'Acabamentos', budgetSharePct: 15, effortHours: 150, unit: 'm²', estimatedQty: 420 },
      { code: '6.0', name: 'Pintura Final e Limpeza Geral de Entrega', category: 'Acabamentos', budgetSharePct: 10, effortHours: 90, unit: 'm²', estimatedQty: 800 }
    ],
    cpus: [
      {
        code: 'CPU-REAB-01',
        description: 'Demolição e Despejo de Entulho em Vazadouro Autorizado',
        unit: 'm³',
        basePriceAOA: 9500,
        laborShare: 0.60,
        dieselShare: 0.40
      },
      {
        code: 'CPU-REAB-02',
        description: 'Assentamento de Pavimento Cerâmico Grés Porcelânico com Cimento Cola',
        unit: 'm²',
        basePriceAOA: 14200,
        laborShare: 0.45,
        cementShare: 0.20,
        importUsdShare: 0.35
      }
    ]
  },

  // 5. PONTE / OBRA DE ARTE
  {
    id: 'template-ponte-arte',
    name: 'Construção de Ponte / Obra de Arte Especial',
    category: 'Obras Especiais',
    description: 'Infraestrutura de travessia com estacas cravadas/moldadas, pilares em betão B40, vigas pré-esforçadas e laje de tabuleiro.',
    iconName: 'Waypoints',
    defaultBudgetAOA: 890000000, // 890M Kz
    durationDays: 320,
    wbsItems: [
      { code: '1.0', name: 'Fundações Profundas em Estacas Moldadas Ø1000mm', category: 'Fundações', budgetSharePct: 28, effortHours: 480, unit: 'ml', estimatedQty: 680 },
      { code: '2.0', name: 'Maciços de Encabeçamento, Encontros e Pilares Estruturais', category: 'Estrutura', budgetSharePct: 24, effortHours: 420, unit: 'm³', estimatedQty: 450 },
      { code: '3.0', name: 'Fabrico, Transporte e Lançamento de Vigas Pré-esforçadas', category: 'Estrutura', budgetSharePct: 25, effortHours: 350, unit: 'un', estimatedQty: 16 },
      { code: '4.0', name: 'Betonagem de Laje de Tabuleiro e Passeios de Serviço', category: 'Estrutura', budgetSharePct: 13, effortHours: 290, unit: 'm³', estimatedQty: 320 },
      { code: '5.0', name: 'Impermeabilização, Juntas de Dilatação e Guardas de Proteção', category: 'Acabamentos', budgetSharePct: 10, effortHours: 160, unit: 'ml', estimatedQty: 180 }
    ],
    cpus: [
      {
        code: 'CPU-PONTE-01',
        description: 'Execução de Estaca Moldada em Solo Ø1000mm com camisa recuperável',
        unit: 'ml',
        basePriceAOA: 295000,
        cementShare: 0.30,
        steelShare: 0.35,
        dieselShare: 0.20,
        laborShare: 0.15
      },
      {
        code: 'CPU-PONTE-02',
        description: 'Viga Pré-fabricada em Betão Pré-esforçado L=24m',
        unit: 'un',
        basePriceAOA: 18500000,
        cementShare: 0.25,
        steelShare: 0.45,
        importUsdShare: 0.20,
        laborShare: 0.10
      }
    ]
  },

  // 6. MINERAÇÃO & MOVIMENTO PESADO
  {
    id: 'template-mineracao',
    name: 'Operação de Mineração & Movimentação',
    category: 'Mineração',
    description: 'Gestão de frentes de lavra, decapagem de estéril, desmonte, carga em dumpers pesados e alimentação de britagem.',
    iconName: 'Pickaxe',
    defaultBudgetAOA: 620000000, // 620M Kz
    durationDays: 365,
    wbsItems: [
      { code: '1.0', name: 'Decapagem e Remoção de Cobertura Estéril para Depósito', category: 'Fundações', budgetSharePct: 25, effortHours: 520, unit: 'm³', estimatedQty: 180000 },
      { code: '2.0', name: 'Perfuração e Desmonte Mecânico / Fogo de Rocha Mineralizada', category: 'Estrutura', budgetSharePct: 28, effortHours: 460, unit: 'm³', estimatedQty: 95000 },
      { code: '3.0', name: 'Carregamento com Pás Mecânicas e Transporte em Dumpers 40t', category: 'Fundações', budgetSharePct: 30, effortHours: 640, unit: 't·km', estimatedQty: 250000 },
      { code: '4.0', name: 'Alimentação da Central de Britagem Primária e Crivagem', category: 'Acabamentos', budgetSharePct: 12, effortHours: 320, unit: 't', estimatedQty: 85000 },
      { code: '5.0', name: 'Manutenção de Pistas de Circulação Mineira e Supressão de Poeiras', category: 'Planeamento e Licenciamento', budgetSharePct: 5, effortHours: 200, unit: 'km', estimatedQty: 14 }
    ],
    cpus: [
      {
        code: 'CPU-MIN-01',
        description: 'Carga e Transporte de Estéril/Minério em Pista Mineira (DMT 3.5km)',
        unit: 't·km',
        basePriceAOA: 420,
        dieselShare: 0.65,
        laborShare: 0.20,
        importUsdShare: 0.15
      },
      {
        code: 'CPU-MIN-02',
        description: 'Perfuração DTH Ø115mm para Desmonte Controlado',
        unit: 'ml',
        basePriceAOA: 18500,
        dieselShare: 0.45,
        importUsdShare: 0.35,
        laborShare: 0.20
      }
    ]
  },

  // 7. LEVANTAMENTO TOPOGRÁFICO
  {
    id: 'template-topografia',
    name: 'Levantamento Topográfico & Cadastro',
    category: 'Topografia',
    description: 'Poligonais de precisão, apoio geodésico GNSS RTK, modelo digital de terreno (MDT) e cálculo de cubagens.',
    iconName: 'Ruler',
    defaultBudgetAOA: 12500000, // 12.5M Kz
    durationDays: 30,
    wbsItems: [
      { code: '1.0', name: 'Implantação e Rastreio de Vértices da Rede Geodésica (GNSS RTK)', category: 'Planeamento e Licenciamento', budgetSharePct: 20, effortHours: 60, unit: 'un', estimatedQty: 8 },
      { code: '2.0', name: 'Levantamento Planialtimétrico de Pormenor e Detalhes Construtivos', category: 'Planeamento e Licenciamento', budgetSharePct: 35, effortHours: 110, unit: 'ha', estimatedQty: 45 },
      { code: '3.0', name: 'Geração de Curvas de Nível e Modelo Digital de Elevação (MDE)', category: 'Planeamento e Licenciamento', budgetSharePct: 20, effortHours: 70, unit: 'ha', estimatedQty: 45 },
      { code: '4.0', name: 'Cálculo de Volumes de Corte e Aterro (Cubagem por Malha Triangular)', category: 'Planeamento e Licenciamento', budgetSharePct: 15, effortHours: 50, unit: 'm³', estimatedQty: 60000 },
      { code: '5.0', name: 'Elaboração do Relatório Técnico e Plantas Cadastrais em DWG/PDF', category: 'Planeamento e Licenciamento', budgetSharePct: 10, effortHours: 40, unit: 'vg', estimatedQty: 1 }
    ],
    cpus: [
      {
        code: 'CPU-TOPO-01',
        description: 'Levantamento Topográfico Cadastral de Pormenor com GNSS / Estação Total',
        unit: 'ha',
        basePriceAOA: 145000,
        laborShare: 0.70,
        dieselShare: 0.20,
        importUsdShare: 0.10
      },
      {
        code: 'CPU-TOPO-02',
        description: 'Cálculo e Certificação de Volumes de Movimentação de Terras',
        unit: 'estudo',
        basePriceAOA: 650000,
        laborShare: 0.85,
        importUsdShare: 0.15
      }
    ]
  },

  // 8. INSTALAÇÕES TÉCNICAS
  {
    id: 'template-instalacoes-tecnicas',
    name: 'Instalações Técnicas (Hidráulica, Eletricidade & AVAC)',
    category: 'Instalações & Infraestruturas',
    description: 'Modelo de infraestruturas técnicas com redes de água PEAD, combate a incêndio, quadros elétricos de potência, PT e AVAC.',
    iconName: 'Zap',
    defaultBudgetAOA: 145000000, // 145M Kz
    durationDays: 120,
    wbsItems: [
      { code: '1.0', name: 'Rede Principal de Distribuição de Água Potável em Tubagem PEAD', category: 'Instalações Hidráulicas', budgetSharePct: 20, effortHours: 190, unit: 'ml', estimatedQty: 1800 },
      { code: '2.0', name: 'Rede de Drenagem de Águas Residuais e Caixas de Retenção', category: 'Instalações Hidráulicas', budgetSharePct: 16, effortHours: 170, unit: 'ml', estimatedQty: 950 },
      { code: '3.0', name: 'Rede de Segurança e Combate a Incêndio (BIA e Hidrantes)', category: 'Instalações Hidráulicas', budgetSharePct: 15, effortHours: 140, unit: 'vg', estimatedQty: 1 },
      { code: '4.0', name: 'Posto de Transformação (PT 630 kVA) e Grupo Gerador de Emergência', category: 'Instalações Elétricas', budgetSharePct: 28, effortHours: 210, unit: 'vg', estimatedQty: 1 },
      { code: '5.0', name: 'Quadros Gerais de Distribuição Elétrica (QG) e Cablagem de Cobre', category: 'Instalações Elétricas', budgetSharePct: 14, effortHours: 160, unit: 'un', estimatedQty: 8 },
      { code: '6.0', name: 'Sistemas de AVAC, Ventilação Mecânica e Extração Forçada', category: 'Outros', budgetSharePct: 7, effortHours: 120, unit: 'vg', estimatedQty: 1 }
    ],
    cpus: [
      {
        code: 'CPU-INST-01',
        description: 'Assentamento de Tubagem PEAD 100 PN16 Ø110mm com soldadura topo a topo',
        unit: 'ml',
        basePriceAOA: 16500,
        importUsdShare: 0.55,
        dieselShare: 0.20,
        laborShare: 0.25
      },
      {
        code: 'CPU-INST-02',
        description: 'Fornecimento e Puxada de Cabo de Energia Cu 4x16mm² em vala técnica',
        unit: 'ml',
        basePriceAOA: 12800,
        importUsdShare: 0.70,
        laborShare: 0.30
      },
      {
        code: 'CPU-INST-03',
        description: 'Montagem de Quadro de Coluna / Distribuição com Proteções Diferenciais',
        unit: 'un',
        basePriceAOA: 1250000,
        importUsdShare: 0.65,
        laborShare: 0.35
      }
    ]
  }
];

/**
 * Instancia as tarefas de EAP e os CPUs de um template no Firestore para o projeto recém-criado.
 */
export async function applyProjectTemplate(projectId: string, templateId: string, budgetTotalAOA: number): Promise<{ wbsCount: number; cpuCount: number }> {
  const template = NATIVE_PROJECT_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    throw new Error(`Template com ID "${templateId}" não foi encontrado.`);
  }

  const batch = writeBatch(db);
  const now = new Date();

  // 1. Criar itens de WBS
  let wbsCount = 0;
  for (let i = 0; i < template.wbsItems.length; i++) {
    const item = template.wbsItems[i];
    const wbsRef = doc(collection(db, 'projects', projectId, 'wbs'));
    const itemBudgetValue = (budgetTotalAOA * item.budgetSharePct) / 100;
    
    // Distribuir datas estimadas proporcionalmente
    const startOffset = Math.floor((i / template.wbsItems.length) * template.durationDays);
    const endOffset = Math.min(template.durationDays, startOffset + Math.max(15, Math.floor(template.durationDays / template.wbsItems.length) * 2));
    const itemStart = new Date(now.getTime() + startOffset * 86400000);
    const itemEnd = new Date(now.getTime() + endOffset * 86400000);

    const wbsData: Partial<WbsItem> = {
      name: `${item.code} - ${item.name}`,
      category: item.category,
      parentId: null,
      budget: itemBudgetValue,
      actualCost: 0,
      progress: 0,
      effortHours: item.effortHours,
      startDate: itemStart,
      endDate: itemEnd,
      baselineStartDate: itemStart,
      baselineEndDate: itemEnd,
      isMilestone: false,
      dependencies: []
    };

    batch.set(wbsRef, wbsData);
    wbsCount++;
  }

  // 2. Criar itens de CPU
  let cpuCount = 0;
  for (const cpu of template.cpus) {
    const cpuRef = doc(collection(db, 'projects', projectId, 'cpus'));
    const cpuData: ProjectCpuItem = {
      code: cpu.code,
      description: cpu.description,
      unit: cpu.unit,
      basePriceAOA: cpu.basePriceAOA,
      dieselShare: cpu.dieselShare || 0,
      importUsdShare: cpu.importUsdShare || 0,
      cementShare: cpu.cementShare || 0,
      steelShare: cpu.steelShare || 0,
      laborShare: cpu.laborShare || 0
    };
    batch.set(cpuRef, cpuData);
    cpuCount++;
  }

  await batch.commit();
  return { wbsCount, cpuCount };
}
