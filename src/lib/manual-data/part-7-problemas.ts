import { ManualChapter, TroubleshootingItem } from './types';

export const TROUBLESHOOTING_ITEMS: TroubleshootingItem[] = [
  {
    id: 'tb-01',
    category: 'Autenticação & Acesso',
    problem: 'O utilizador introduz o e-mail e a palavra-passe mas surge a mensagem "Credenciais Inválidas".',
    cause: 'Palavra-passe incorreta, conta ainda não ativada pelo Administrador ou bloqueio temporário por tentativas falhadas.',
    solution: 'Recuperar a palavra-passe por e-mail ou solicitar a reativação da conta ao Administrador da Organização.',
    procedure: [
      'Clique no link "Esqueceu-se da palavra-passe?" no ecrã de login.',
      'Introduza o seu e-mail corporativo e clique em "Enviar Link de Recuperação".',
      'Abra o seu e-mail e clique no link recebido dentro do prazo de 60 minutos.',
      'Defina uma nova palavra-passe com pelo menos 8 caracteres.'
    ],
    expectedResult: 'Acesso imediato ao Dashboard da plataforma com as novas credenciais.'
  },
  {
    id: 'tb-02',
    category: 'Medições & Autos',
    problem: 'Bloqueio na submissão do Auto de Medição: "Faltam evidências fotográficas ou laboratoriais obrigatórias".',
    cause: 'O Motor de Governação Contratual exige um mínimo de 3 fotografias de campo georreferenciadas e registo de ensaios laboratoriais para itens críticos de betão ou aterro.',
    solution: 'Adicionar as fotografias de obra e associar os relatórios de ensaio de betão ($f_{ck}$) ou solos (CBR) à medição.',
    procedure: [
      'No separador Autos de Medição, clique em "Editar Auto".',
      'Aceda ao separador "Evidências e Fotos".',
      'Carregue pelo menos 3 fotografias nítidas capturadas no estaleiro durante o período de execução.',
      'Se o auto incluir serviços de betão, anexe a Ficha de Verificação de Serviço (FVS) com os resultados dos provetes.',
      'Clique novamente em "Submeter para Homologação".'
    ],
    expectedResult: 'O botão de submissão desbloqueia e o Auto de Medição é enviado ao Fiscal com sucesso.'
  },
  {
    id: 'tb-03',
    category: 'Suprimentos & Compras',
    problem: 'A requisição de compra surge com o estado "Bloqueada por Alçada Superior".',
    cause: 'O montante da requisição ultrapassa o limite autorizado para o perfil do utilizador (ex: compra > 1.500.000 AOA tentada por Encarregado, ou > 15.000.000 AOA sem 3 cotações para o Conselho de Administração).',
    solution: 'Submeter o pedido na esteira de aprovação da alçada competente e anexar as 3 cotações de fornecedores exigidas.',
    procedure: [
      'Abra a requisição no módulo Compras.',
      'Anexe os 3 mapas comparativos de cotação em PDF.',
      'Clique em "Encaminhar para Alçada Nível 2 / Nível 3".',
      'O Diretor Financeiro ou Conselho de Administração receberá uma notificação para aprovação em 1 clique.'
    ],
    expectedResult: 'A requisição é despachada para a alçada superior e o estado passa para "Aguardando Parecer".'
  },
  {
    id: 'tb-04',
    category: 'Frotas & Equipamentos',
    problem: 'Alarme sonoro e visual: "Desvio crítico de combustível no equipamento dumper CAT 777".',
    cause: 'A média de consumo por hora trabalhada nos últimos 3 dias excedeu em mais de 25% o padrão histórico nominal do fabricante.',
    solution: 'Inspecionar a máquina para despiste de fugas mecânicas no sistema de injeção ou investigar desvio não autorizado de gasóleo no estaleiro.',
    procedure: [
      'Aceda a Frotas > Alertas de Combustível.',
      'Verifique as horas registadas no horímetro mecânico versus os litros de gasóleo abastecidos na bomba do estaleiro.',
      'Abra uma Ordem de Serviço Preventiva de Inspeção Mecânica para o Chefe de Oficina.',
      'Confirme se o horímetro foi apontado incorretamente por lapso de digitação do operador.'
    ],
    expectedResult: 'Identificação imediata da causa do sobreconsumo e encerramento do alerta de segurança.'
  },
  {
    id: 'tb-05',
    category: 'Sincronização Offline',
    problem: 'O Encarregado registou o Diário de Obra no telemóvel na frente de trabalho sem rede e os dados não aparecem no escritório.',
    cause: 'O dispositivo móvel ainda está a operar em cache local offline e não restabeleceu ligação à internet.',
    solution: 'Aproximar o dispositivo móvel de uma zona com cobertura de rede 3G/4G ou Wi-Fi do estaleiro para acionar a sincronização.',
    procedure: [
      'Mantenha a aplicação aberta no telemóvel.',
      'Ao entrar no estaleiro central com ligação à internet (ou Starlink), o indicador mudará de "Offline (3 registos pendentes)" para "Sincronizado".',
      'Os dados são automaticamente integrados no servidor central sem perda de informação.'
    ],
    expectedResult: 'Todos os apontamentos diários, horas e fotos aparecem instantaneamente no Dashboard do Gestor de Obra.'
  }
];

export const PART_7_CHAPTERS: ManualChapter[] = [
  {
    id: 'p7-troubleshooting',
    number: 28,
    partId: 'part-7',
    title: 'Resolução de Problemas & Diagnóstico (Troubleshooting)',
    iconName: 'Wrench',
    category: 'Suporte',
    description: 'Matriz padronizada de resolução: Problema → Causa → Solução → Procedimento → Resultado esperado.',
    relevantProfiles: ['Todos'],
    subsections: TROUBLESHOOTING_ITEMS.map((item, idx) => ({
      title: `${idx + 1}. ${item.problem}`,
      content: `**Categoria:** ${item.category}\n\n**Possível Causa:** ${item.cause}\n\n**Solução:** ${item.solution}\n\n**Resultado Esperado:** ${item.expectedResult}`,
      steps: item.procedure
    }))
  }
];
