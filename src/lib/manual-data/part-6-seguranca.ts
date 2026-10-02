import { ManualChapter } from './types';

export const PART_6_CHAPTERS: ManualChapter[] = [
  {
    id: 'p6-seguranca',
    number: 27,
    partId: 'part-6',
    title: 'Administração, Governação & Segurança Cibernética',
    iconName: 'Lock',
    category: 'Segurança',
    description: 'Protocolos de segurança, auditoria imutável com hash SHA-256, RBAC e salvaguarda de dados.',
    relevantProfiles: ['super-admin', 'admin', 'Diretor de Projeto'],
    subsections: [
      {
        title: '27.1 Matriz de Controlo de Acessos Baseada em Funções (RBAC)',
        content: `A plataforma aplica o princípio do menor privilégio (PoLP - Principle of Least Privilege):
- **Super-Admin / Admin:** Parametrização global, gestão de empresas e utilizadores.
- **Diretores e Gestores de Obra:** Criação e alteração de orçamentos, aprovação de medições e gestão operacional.
- **Encarregados e Fiscais de Campo:** Lançamento de apontamentos diários e inspeções FVS sem acesso a custos financeiros ou margens de lucro.
- **Clientes e Parceiros:** Acesso exclusivo ao portal extranet com visualização de relatórios homologados.`
      },
      {
        title: '27.2 Trancamento Probatório Criptográfico SHA-256',
        content: `Para garantir valor probatório em caso de litígio ou arbitragem judicial, o encerramento do Diário de Obra (RDO) e dos Autos de Medição calcula um resumo criptográfico **SHA-256 (256 bits)**.

Qualquer tentativa posterior de alterar datas, quantitativos de trabalhadores ou condições meteorológicas invalida a assinatura digital e acusa fraude documental de forma imediata.`
      },
      {
        title: '27.3 Políticas de Backup, Redundância e Proteção de Dados',
        content: `Os dados da plataforma são salvaguardados com:
- **Replicação Geográfica em Tempo Real:** Bases de dados redundantes de alta disponibilidade.
- **Cópias de Segurança Diárias Automatizadas:** Retenção contínua de backups completos durante 10 anos, cumprindo a legislação de responsabilidade civil decenal de construtoras.
- **Encriptação Ponta a Ponta:** Tráfego protegido por TLS 1.3 (HTTPS) e encriptação em repouso AES-256.`
      }
    ]
  }
];
