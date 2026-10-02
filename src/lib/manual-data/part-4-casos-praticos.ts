import { ManualChapter } from './types';

export const PART_4_CHAPTERS: ManualChapter[] = [
  {
    id: 'p4-caso-pintura',
    number: 24,
    partId: 'part-4',
    title: 'Caso Prático 1 — Obra de Pintura em 16 Passos Completos',
    iconName: 'Paintbrush',
    category: 'Casos Práticos',
    description: 'Acompanhamento exaustivo de ponta a ponta: da abertura da obra ao encerramento financeiro.',
    relevantProfiles: ['Gestor de Obra', 'Orçamentista', 'Engenheiro de Planeamento'],
    subsections: [
      {
        title: '24.1 Os 16 Passos Operacionais da Obra de Pintura',
        objective: 'Executar com perfeição o fluxo completo de uma empreitada de pintura de fachadas e interiores.',
        content: `Abaixo apresentamos o fluxo detalhado de 16 passos no Profundidade OS:

### Passo 1: Criar Projeto
Aceda ao Dashboard (/dashboard), prima "+ Novo Projeto". Preencha:
- Nome: "Pintura Geral do Edifício Kilamba Bloco D"
- Tipologia: "Construção Civil / Acabamentos"
- Cliente / Dono da Obra: "Administração do Condomínio Kilamba"
- Valor Base Contratual: "18.500.000 AOA"

### Passo 2: Criar Orçamento
No menu do projeto, aceda a **Custos > Orçamento**. Defina as premissas gerais de BDI (22%) e encargos sociais da mão de obra (18%).

### Passo 3: Definir a EAP (WBS)
Crie a estrutura hierárquica em 3 fases:
- 1.0 Trabalhos Preparatórios e Andaimes
- 2.0 Pintura de Fachadas Exteriores
- 3.0 Pintura de Paredes e Tetos Interiores

### Passo 4: Criar Atividades
Dentro de cada fase, desdobre em pacotes executáveis:
- 1.1 Montagem e certificação de andaimes tubulares fachadeiros
- 2.1 Lavagem com hidrolimpeza a alta pressão
- 2.2 Reparação de fissuras com mástique acrílico
- 2.3 Aplicação de 1 demão de primário fixador
- 2.4 Aplicação de 2 demãos de tinta 100% acrílica impermeabilizante

### Passo 5: Definir Quantidades em m²
Introduza as medições geométricas do projeto:
- Lavagem e preparação: 3.450 m²
- Pintura exterior: 3.450 m²
- Pintura interior: 5.200 m²

### Passo 6: Criar Composição de Custos (CPU)
Para o item *Pintura de Fachada (m²)*:
- Tinta Acrílica: 0.35 litros/m² a 2.800 AOA/litro = 980 AOA
- Primário: 0.12 litros/m² a 2.100 AOA/litro = 252 AOA
- Pintor Oficial: 0.40 h/m² a 1.200 AOA/h = 480 AOA
- Servente: 0.30 h/m² a 800 AOA/h = 240 AOA
- Andaimes e consumíveis: 150 AOA/m²
- **Custo Unitário Direto:** 2.102 AOA/m²

### Passo 7: Definir Cronograma
No módulo **Planeamento > Cronograma**, estabeleça as datas e predecessoras:
- Lavagem precede Primário (Folga de 2 dias para secagem).
- Duração total da empreitada: 45 dias úteis.

### Passo 8: Alocar Trabalhadores
No módulo **Equipa & Recursos**, atribua a equipa operacional:
- 1 Encarregado de Pintura
- 6 Pintores Oficiais
- 4 Serventes

### Passo 9: Registar Materiais no Armazém
Dê entrada no módulo **Armazém** das guias de remessa do fornecedor:
- 65 baldes de tinta exterior de 18 litros
- 25 baldes de primário acrílico
- 50 rolos de fita crepe e lixas de grão 120 e 180

### Passo 10: Executar Serviços no Terreno
Diariamente, no **Diário de Obra (RDO)**, aponte:
- Metros quadrados executados no turno
- Clima (Sem chuva, temperatura favorável à secagem)
- Fotografias das superfícies preparadas antes da tinta

### Passo 11: Registar Medições no Auto Mensal
No separador **Autos de Medição**, lance o boletim do primeiro mês:
- Quantidade executada: 1.850 m² de fachada exterior
- Valor bruto medido: 4.810.000 AOA
- Retenção contratual de garantia (5%): -240.500 AOA
- Valor líquido faturável: 4.569.500 AOA

### Passo 12: Atualizar Progresso Físico
O sistema recalcula automaticamente o progresso global da obra:
- Progresso Físico Atual: 42.8%
- Progresso Previsto no Cronograma Baseline: 40.0%
- Status: **Obra Adiantada (SPI = 1.07)**

### Passo 13: Registar Custos Reais (AC)
No módulo **Finanças**, lance os pagamentos semanais de mão de obra e faturas de tintas quitadas.

### Passo 14: Comparar Previsto × Realizado (Análise EVA)
Consulte a aba **Análise de Valor Ganho**:
- Custo Real (AC): 3.950.000 AOA
- Valor Ganho (EV): 4.220.000 AOA
- Índice CPI = EV / AC = 1.068 (Obra a economizar 6.8% em relação ao orçamento!)

### Passo 15: Emitir Relatório Executivo
Gere com 1 clique o **Caderno de Medição com Fotos e Memória Descritiva** em PDF, pronto para entrega e homologação pelo Dono da Obra.

### Passo 16: Encerrar Obra
Após vistoria final com o cliente e assinatura do Auto de Receção Provisória:
- Registe o fecho das atividades na EAP.
- Libere as retenções conforme termos de garantia.
- Guarde o **Livro Digital da Obra As-Built** no repositório institucional do Profundidade.`
      }
    ]
  },
  {
    id: 'p4-caso-edificio',
    number: 25,
    partId: 'part-4',
    title: 'Casos Práticos 2 a 5 — Edifícios, Estradas, Mineração e Topografia',
    iconName: 'FolderCheck',
    category: 'Casos Práticos',
    description: 'Resumo dos fluxos ponta a ponta para infraestruturas pesadas, obras lineares e extração mineral.',
    relevantProfiles: ['Diretor de Projeto', 'Engenheiro de Minas', 'Topógrafo'],
    subsections: [
      {
        title: '25.1 Caso 2: Construção de Edifício Residencial',
        content: `Controlo em 5 ciclos:
1. Terraplenagem e contenção periférica (Muro de Berlim).
2. Fundação em estacas moldadas e maciços de encabeçamento.
3. Estrutura em betão armado laje a laje (ensaios de compressão aos 7 e 28 dias).
4. Redes técnicas embutidas com testes de estanquidade antes do reboco.
5. Acabamentos finos e emissão do Livro Digital do Edifício.`
      },
      {
        title: '25.2 Caso 3: Construção de Troço Rodoviário',
        content: `Controlo linear com geotecnia:
1. Desmatação e decapagem de terra vegetal (PK 0+000 a PK 20+000).
2. Terraplenagem em solos selecionados com densificação por rolos pé-de-carneiro (CBR > 20%).
3. Obras de arte correntes (Passagens Hidráulicas Tubulares e Box-Culverts).
4. Imprimação betuminosa e camada de desgaste em betão asfáltico (CBUQ).
5. Sinalização horizontal e vertical e balizamento rodoviário.`
      },
      {
        title: '25.3 Caso 4: Operação de Lavra Aluvionar de Diamantes',
        content: `Ciclo mineral com governação Kimberley:
1. Levantamento topográfico inicial do jazigo e cálculo do primitivo.
2. Decapagem de estéril arenoso e argiloso com escavadoras hidráulicas.
3. Extração e transporte do cascalho diamantífero (ROM) em camiões basculantes.
4. Lavagem e concentração densa na fábrica DMS com recuperação de quilates.
5. Emissão de guia de transporte oficial rastreada por QR Code do MIREMPET.`
      },
      {
        title: '25.4 Caso 5: Levantamento Topográfico Cadastral e MDT',
        content: `Ciclo geoespacial:
1. Implantação de marcos geodésicos com recetores GNSS pós-processados.
2. Varrimento de pontos irradiados com Estação Total ou drone RTK.
3. Importação do ficheiro ASCII (P, X, Y, Z, D) para o Profundidade.
4. Geração automática do Modelo Digital de Terreno (MDT) e curvas de nível a cada 1 metro.
5. Exportação de perfis longitudinais e secções para cálculo de volumes.`
      }
    ]
  }
];
