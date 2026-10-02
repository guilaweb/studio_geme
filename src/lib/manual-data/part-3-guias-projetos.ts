import { ManualChapter } from './types';

export const PART_3_CHAPTERS: ManualChapter[] = [
  {
    id: 'p3-civil',
    number: 21,
    partId: 'part-3',
    title: 'Guia: Projetos de Construção Civil & Infraestruturas',
    iconName: 'Building2',
    category: 'Tipologias',
    description: 'Metodologia específica para edifícios, pontes, reabilitação, obras de pintura e instalações técnicas.',
    relevantProfiles: ['Gestor de Obra', 'Engenheiro de Planeamento', 'Fiscal de Obra'],
    subsections: [
      {
        title: '21.1 Edifícios e Estruturas de Betão Armado',
        content: `Na tipologia "Edifícios", o Profundidade ativa módulos específicos para o ciclo estrutural:
1. **Fundações:** Registo de ensaios de integridade de estacas (PIT) e cotas de assentamento de sapatas.
2. **Superestrutura:** Acompanhamento por piso (Pilares, Vigas, Lajes). O sistema exige o lançamento obrigatório do ensaio de abaixamento (*Slump Test*) de cada auto-betoneira antes de autorizar a medição de m³ betonados.
3. **Cura e $f_{ck}$ Estatístico:** O módulo de qualidade monitoriza a resistência à compressão simples aos 7 e 28 dias segundo a EN 206, emitindo sinal de alerta se $f_{ck,est} < f_{ck}$ de projeto.`
      },
      {
        title: '21.2 Obras de Reabilitação e Pintura',
        content: `Para obras de conservação e acabamentos, o sistema foca em medições quantitativas em m² e consumo de latas de tinta e primário por demão:
- Cadastro de áreas de fachada, paredes interiores e tetos.
- Registo diário de metros quadrados lixados, preparados e pintados.
- Controlo de espessura de película húmida (EPH) e seca (EPS) com equipamento de controlo não destrutivo.`
      },
      {
        title: '21.3 Instalações Técnicas Especiais (AVAC, Eletricidade, Hidráulica)',
        content: 'Rastreio de redes embutidas antes do fecho de paredes e betonagem de lajes. O sistema exige o envio de fotos do traçado de tubagens e ensaios de estanquidade e pressão hidrostática (bar).'
      }
    ]
  },
  {
    id: 'p3-vias',
    number: 22,
    partId: 'part-3',
    title: 'Guia: Estradas, Vias de Comunicação & Pavimentação',
    iconName: 'Route',
    category: 'Tipologias',
    description: 'Execução linear de estradas, terraplenagem com solos tropicais, ensaios Proctor/CBR e asfalto.',
    relevantProfiles: ['Engenheiro Residente', 'Topógrafo', 'Gestor de Obra'],
    subsections: [
      {
        title: '22.1 Estaqueamento Linear (PKs a cada 20 Metros)',
        content: 'Todas as atividades da EAP em obras rodoviárias são referenciadas pelo Piquete Quilométrico (PK). Exemplo: *Sub-base em solo selecionado do PK 12+020 ao PK 14+500*.'
      },
      {
        title: '22.2 Controlo Geotécnico de Solos Tropicais (Angola)',
        content: 'Registo de ensaios de massa volúmica seca máxima (Proctor Modificado) e Índice de Suporte Califórnia (CBR). As camadas de base exigem $CBR \ge 20\%$ e expansão $< 1\%$.'
      },
      {
        title: '22.3 Pavimentação Asfáltica (Macadame e Betão Betuminoso)',
        content: 'Registo da temperatura de espalhamento da mistura asfáltica (140°C a 160°C) e controlo do número de passagens dos rolos tandem e pneumáticos para garantia de densidade aparente.'
      }
    ]
  },
  {
    id: 'p3-mineracao',
    number: 23,
    partId: 'part-3',
    title: 'Guia: Exploração & Lavra Mineira',
    iconName: 'Pickaxe',
    category: 'Tipologias',
    description: 'Gestão de frentes de extração, transporte de estéril/minério, DMS, balanço de massas e Kimberley.',
    relevantProfiles: ['Engenheiro de Minas', 'Diretor de Mina'],
    subsections: [
      {
        title: '23.1 Frentes de Lavra e Desmatação de Estéril',
        content: 'Rastreio diário do rácio de decapagem (Stripping Ratio): metros cúbicos ou toneladas de estéril movimentadas por tonelada de minério ROM descoberto.'
      },
      {
        title: '23.2 Central de Tratamento e Separação em Meio Denso (DMS)',
        content: 'Registo de horas de moagem, alimentação de cascalho e recuperação de quilates (ct). O sistema calcula o rendimento da fábrica (ct/100t) e custo operacional por tonelada tratada.'
      }
    ]
  }
];
