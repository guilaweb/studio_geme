# Profundidade - Plataforma de Gestão de Obras e Mineração

## 1️⃣ Visão da Plataforma

**Objetivo:** A nossa missão é ajudar empresas a **reduzir custos, controlar projetos e evitar perdas**. Criamos uma plataforma digital completa que permite planear, controlar e acompanhar projetos de construção civil e mineração em tempo real, com foco total na otimização de custos, eliminação de desperdícios e prevenção de atrasos.

**Público-alvo:**
*   **Empresas de Construção Civil:** De pequeno a grande porte.
*   **Empresas de Mineração:** Operações de exploração e processamento.
*   **Engenheiros (Civis e de Minas) e Gestores de Projeto:** Ferramenta diária para controlo e tomada de decisão.
*   **Arquitetos:** Para acompanhamento da execução e conformidade do projeto.
*   **Equipas de Fiscalização:** Para validação de etapas e garantia de qualidade.
*   **Donos de Obras / Investidores:** Para uma visão clara e transparente do andamento dos seus investimentos.
*   **Órgãos Públicos:** (Versão Enterprise) Para gestão de obras públicas e infraestruturas.

## 2️⃣ Principais Módulos para Construção Civil

A plataforma está a ser construída sobre uma arquitetura modular para garantir escalabilidade e flexibilidade.

### 🔐 1. Autenticação & Perfis
-   **Login/Registo:** Autenticação segura por e-mail, telemóvel e Google.
-   **Perfis de Utilizador (RBAC):** Sistema de permissões baseado em papéis para garantir que cada utilizador acede apenas à informação relevante para a sua função.
    -   **Administrador:** Acesso total.
    -   **Gestor de Projeto / Engenheiro:** Gestão técnica e financeira da obra.
    -   **Mestre de Obras:** Foco na execução diária e gestão do estaleiro.
    -   **Fiel de Armazém:** Controlo de entradas e saídas de materiais.
    -   **Fiscal de Obra:** Aprovação e verificação de etapas.
    -   **Cliente (Visualização):** Acesso limitado ao progresso e relatórios.

### 🏗️ 2. Gestão de Obras
-   **Criação Centralizada de Obras:** Registo de todos os projetos (Construção e Mineração) num único local.
-   **Dados da Obra:** Informações detalhadas como nome, localização, tipo, orçamento, datas e status (Planeamento, Em Execução, Concluída, etc.).

### 📅 3. Planeamento & Cronograma
-   **Estrutura Analítica do Projeto (EAP):** Decomposição do projeto em fases e atividades macro.
-   **Linha do Tempo (Gráfico de Gantt):** Visualização de durações, dependências entre tarefas e caminho crítico do projeto.
-   **Controlo de Progresso:** Atualização do percentual de execução físico e financeiro por atividade.

### 👷 4. Gestão de Recursos
-   **Mão de Obra:** Base de dados de trabalhadores, com controlo de presenças, horas trabalhadas e análise de produtividade.
-   **Equipamentos:** Gestão do parque de máquinas, controlo de horas de uso (horímetro) e planeamento de manutenções preventivas.

### 📦 5. Suprimentos & Stocks (Procurement)
-   **Requisição de Materiais:** Pedidos de compra baseados nas necessidades da obra.
-   **Mapa de Cotações:** Ferramenta para comparar propostas de diferentes fornecedores.
-   **Ordens de Compra:** Geração e envio de ordens de compra.
-   **Gestão de Stocks:** Controlo de entradas e saídas de materiais em estaleiro, com alertas de stock mínimo.

### 💰 6. Orçamento & Financeiro
-   **Orçamento Detalhado:** Alocação de custos por cada atividade da EAP.
-   **Controlo de Custos Reais:** Lançamento de despesas (materiais, mão de obra, equipamentos) e comparação com o previsto.
-   **Fluxo de Caixa:** Previsão de entradas e saídas financeiras.
-   **Medições e Faturação:** Geração de autos de medição e faturas para o cliente.

### 📸 7. Relatórios & Diário de Obra
-   **Diário de Obra Digital:** Registo diário de atividades, mão de obra, condições climatéricas e ocorrências, com suporte para fotos e ditado por voz.
-   **Relatórios Automáticos:** Geração de relatórios em PDF para partilha com stakeholders.

### 📊 8. Dashboard & Indicadores
-   **KPIs em Tempo Real:** Visualização clara do progresso físico vs. financeiro, desvio orçamental e estado dos prazos.
-   **Análise de Valor Agregado (EVA):** Gráficos de Curva S (PV, AC, EV) e cálculo de índices como CPI e SPI.

### 📄 9. Documentos & Engenharia
-   **Gestor de Documentos:** Repositório central para plantas, licenças, contratos e outros documentos, com controlo de versões.
-   **Visualizador BIM:** Capacidade de carregar e visualizar modelos 3D (IFC, XKT) para análise e identificação de conflitos.
-   **Topografia:** Ferramentas para cálculo de poligonais, irradiações, perfis e volumes de terraplanagem.

### 📱 10. Acesso Móvel
-   **Design Responsivo (PWA):** A plataforma é desenhada para ser totalmente funcional em telemóveis e tablets.
-   **Capacidades Offline (Roadmap):** Funcionalidades essenciais, como o Diário de Obra, serão capazes de operar sem ligação à internet, com sincronização automática.

## 3️⃣ [NOVO] Módulos para Mineração

Para além das funcionalidades partilhadas, os projetos de mineração terão acesso a módulos especializados:

### ⛓️ 3.1 Gestão de Concessões
-   **Registo Centralizado:** Cadastro de todas as concessões mineiras, com informações como tipo de minério, localização, área, titular e prazos de validade.
-   **Estado Legal:** Acompanhe o estado de cada concessão (Ativa, Expirada, Em Renovação) para garantir a conformidade.
-   **Gestão de Documentos:** (Roadmap) Associação de documentos legais como licenças, contratos e mapas.

### 📊 3.2 Dashboard de Mineração
-   **Visão Geral:** Um painel central com os KPIs mais importantes, como produção mensal, estado das concessões e tendências de produção.
-   **Acompanhamento Rápido:** Visualize os últimos registos de produção e o estado geral da operação num único local.

### 🚚 3.3 Controlo de Produção
-   **Registo Diário de Produção:** Lançamento de dados por turno, incluindo material lavrado (minério, estéril), tonelagem, teor, frentes de lavra, destinos (stockpiles, britador) e tempo de operação.
-   **Dashboards de Produção:** Visualização do desempenho diário, semanal e mensal para acompanhamento das metas.

### 📈 3.4 Análise de Produtividade (MVP)
- **Análise de Desempenho:** Acompanhe KPIs essenciais como custo por tonelada, produção por hora, produção por tipo de material e tendências mensais, com dashboards visuais.

### 🌍 3.5 Geologia e Modelação de Blocos (Roadmap)
-   **Importação de Modelos de Blocos:** Carregamento de modelos geológicos para visualização 3D das reservas.
-   **Planeamento de Lavra:** Definição de sequências de extração e reconciliação entre o planeado e o executado.

### 🚜 3.6 Gestão de Frota (Roadmap)
-   **Controlo de Disponibilidade:** Monitorização do estado operacional de camiões, escavadoras e outros equipamentos pesados.
-   **Análise de Desempenho:** KPIs de utilização, consumo de combustível e custos operacionais por equipamento.

## 4️⃣ Diferencial Competitivo

-   **✅ Interface Simples e Intuitiva:** Desenhada a pensar em todos os níveis de literacia digital, do Mestre de Obras ao Gestor de Projeto.
-   **✅ Funciona com Internet Fraca:** Otimizada para operar de forma eficiente mesmo em estaleiros de obra com conectividade limitada.
-   **✅ Relatórios Automáticos em PDF:** Geração de relatórios profissionais com um clique para partilha rápida com stakeholders.
-   **✅ Multi-Obra e Multi-Empresa:** Estrutura pensada para escalar e gerir múltiplos projetos e equipas em simultâneo.
-   **✅ Adaptado à Realidade Africana:** Foco em funcionalidades que funcionam bem no contexto local, incluindo consideração de moedas como o Kwanza (AOA).
-   **✅ Integração de Módulos:** Os dados fluem entre os módulos (ex: o uso de um material no diário de obra dá baixa no stock, que por sua vez afeta o custo real na EAP).
-   **✅ IA como Assistente:** Uso de Inteligência Artificial como uma ferramenta prática para análise de riscos e otimização de processos, e não como um "gadget".
-   **✅ Transparência para o Cliente:** O Portal do Cliente é um diferencial que aumenta a confiança e melhora a comunicação com o dono da obra.
