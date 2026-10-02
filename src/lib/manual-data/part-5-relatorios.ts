import { ManualChapter } from './types';

export const PART_5_CHAPTERS: ManualChapter[] = [
  {
    id: 'p5-indicadores',
    number: 26,
    partId: 'part-5',
    title: 'Relatórios, Dashboards & Indicadores Executivos',
    iconName: 'BarChart3',
    category: 'Inteligência & Relatórios',
    description: 'Guia de métricas matemáticas, Análise de Valor Ganho (EVA), Curvas S, produtividade e dossiês.',
    relevantProfiles: ['Diretor de Projeto', 'Gestor Financeiro', 'Engenheiro de Planeamento'],
    subsections: [
      {
        title: '26.1 A Matemática da Análise de Valor Ganho (EVA / EVM)',
        content: `O Profundidade calcula os indicadores de desempenho segundo a norma ANSI/EIA-748:

$$CPI = \\frac{EV}{AC} \\quad (\\text{Índice de Desempenho de Custos})$$
$$SPI = \\frac{EV}{PV} \\quad (\\text{Índice de Desempenho de Prazo})$$

**Interpretação dos Resultados:**
- **$CPI > 1.0$:** Obra com economia orçamental (custando menos do que o previsto).
- **$CPI < 1.0$:** Obra com sobrecusto (custando mais do que o trabalho entregue).
- **$SPI > 1.0$:** Obra adiantada em relação ao cronograma baseline.
- **$SPI < 1.0$:** Obra com atraso temporal físico no caminho crítico.

**Estimativa no Término (EAC):**
$$EAC = \\frac{BAC}{CPI}$$
Projeta o custo final provável da empreitada se a eficiência de custos atual se mantiver constante até ao fim.`
      },
      {
        title: '26.2 Curvas S Física e Financeira',
        content: 'O gráfico de Curva S cruza o planeamento cumulativo com a medição física acumulada e o desembolso financeiro, permitindo antecipar necessidades de liquidez e tesouraria com 60 dias de antecedência.'
      },
      {
        title: '26.3 Exportação de Cadernos e Dossiês Oficiais',
        content: `A plataforma dispõe de 3 motores de geração documental instantânea em PDF:
1. **Caderno de Medição Mensal:** Inclui capa institucional, folha de resumo por capítulo da EAP, memória de cálculo com fórmulas e galeria de fotografias de campo georreferenciadas.
2. **Dossiê do Conselho de Administração:** Resumo executivo em 2 páginas com indicadores de margem líquida, índice CPI/SPI, riscos ativos e fotos aéreas.
3. **Livro Digital da Obra (As-Built Handover):** Compilação exaustiva de todos os RDOs, fichas FVS, ensaios de betão e certificados de garantia na conclusão da obra.`
      }
    ]
  }
];
