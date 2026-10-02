import { ManualChapter, QuickReferenceShortcuts } from './types';

export const SHORTCUTS_LIST: QuickReferenceShortcuts[] = [
  { key: 'Ctrl + K (ou Cmd + K)', action: 'Abrir a barra de Pesquisa Global Instantânea', scope: 'Global' },
  { key: 'Alt + N', action: 'Criar novo projeto ou novo registo rápido', scope: 'Dashboard' },
  { key: 'Alt + R', action: 'Abrir novo Diário de Obra (RDO)', scope: 'Módulo Obra' },
  { key: 'Alt + M', action: 'Criar novo Auto de Medição', scope: 'Autos de Medição' },
  { key: 'Esc', action: 'Fechar modais, janelas suspensas e menus de contexto', scope: 'Global' },
  { key: 'Ctrl + P', action: 'Imprimir ecrã atual ou exportar PDF executivo formatado', scope: 'Relatórios / Manual' },
];

export const GLOSSARY_TERMS: { term: string; definition: string }[] = [
  { term: 'AC (Actual Cost)', definition: 'Custo Real: Custo acumulado total de todas as faturas e despesas diretas liquidadas até ao momento.' },
  { term: 'BDI', definition: 'Benefícios e Despesas Indiretas: Taxa percentual aplicada sobre os custos diretos para cobrir custos de sede, administração e lucro.' },
  { term: 'CBR (California Bearing Ratio)', definition: 'Índice de Suporte Califórnia: Ensaio geotécnico que afere a capacidade de suporte de solos compactados para pavimentação.' },
  { term: 'CPI (Cost Performance Index)', definition: 'Índice de Desempenho de Custo: Rácio EV / AC. Valores superiores a 1.0 indicam economia orçamental.' },
  { term: 'CPM (Critical Path Method)', definition: 'Método do Caminho Crítico: Algoritmo de planeamento que identifica a sequência de atividades que dita a duração mínima da empreitada.' },
  { term: 'DMS (Dense Medium Separation)', definition: 'Separação em Meio Denso: Central fabril de gravimetria para concentração e lavagem de cascalhos diamantíferos.' },
  { term: 'EAC (Estimate at Completion)', definition: 'Estimativa no Término: Projeção estatística do custo total final da obra baseada no rendimento atual.' },
  { term: 'EAP / WBS', definition: 'Estrutura Analítica do Projeto: Decomposição hierárquica orientada aos entregáveis de 100% do escopo do contrato.' },
  { term: 'EV (Earned Value)', definition: 'Valor Ganho / Agregado: Quantidade física medida multiplicada pelo preço unitário orçamentado baseline.' },
  { term: 'fck', definition: 'Resistência Característica à Compressão do Betão aos 28 dias expressa em Megapascals (MPa).' },
  { term: 'FVS', definition: 'Ficha de Verificação de Serviço: Checklist de controlo de qualidade executada antes de autorizar a etapa subsequente.' },
  { term: 'KPCS', definition: 'Kimberley Process Certification Scheme: Sistema internacional de certificação de origem de diamantes brutos.' },
  { term: 'PV (Planned Value)', definition: 'Valor Planeado: Custo orçado do trabalho que estava programado para estar concluído na data da análise.' },
  { term: 'RDO', definition: 'Relatório Diário de Obra: Registo diário oficial das ocorrências, clima, mão de obra e equipamentos no estaleiro.' },
  { term: 'ROM (Run-of-Mine)', definition: 'Minério bruto tal como sai da frente de lavra antes de qualquer triagem ou tratamento na fábrica.' },
  { term: 'SHA-256', definition: 'Algoritmo de resumo criptográfico de 256 bits utilizado no trancamento probatório de relatórios para impedir adulterações.' },
  { term: 'SPI (Schedule Performance Index)', definition: 'Índice de Desempenho de Prazo: Rácio EV / PV. Valores superiores a 1.0 indicam avanço físico superior ao previsto.' },
];

export const PART_8_CHAPTERS: ManualChapter[] = [
  {
    id: 'p8-atalhos-glossario',
    number: 29,
    partId: 'part-8',
    title: 'Referência Rápida: Atalhos, Glossário & Checklists',
    iconName: 'BookMarked',
    category: 'Referência',
    description: 'Guia de consulta veloz para atalhos de teclado, terminologia de engenharia e checklists operacionais por função.',
    relevantProfiles: ['Todos'],
    subsections: [
      {
        title: '29.1 Atalhos de Teclado Operacionais',
        content: SHORTCUTS_LIST.map(s => `- **${s.key}:** ${s.action} (${s.scope})`).join('\n')
      },
      {
        title: '29.2 Glossário de Engenharia & Gestão de Projetos',
        content: GLOSSARY_TERMS.map(g => `- **${g.term}:** ${g.definition}`).join('\n')
      },
      {
        title: '29.3 Checklist Diária Recomendada para o Estaleiro',
        content: `Rotina diária essencial:
1. **07:30:** Conferir o número de operários presentes por categoria profissional.
2. **08:00:** Lançar as leituras iniciais dos horímetros e verificar o nível de gasóleo das máquinas.
3. **11:30:** Registar as condições meteorológicas (Sol, Chuva Ligeira, Chuva Impeditiva).
4. **16:00:** Fotografar as frentes de trabalho com o telemóvel através da aplicação móvel do Profundidade.
5. **17:30:** Fechar o Diário de Obra e acionar o Trancamento SHA-256.`
      }
    ]
  }
];
