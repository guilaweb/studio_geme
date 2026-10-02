// Type definitions for Organization & Agency Operating System (Sistema Operacional da Organização de Inteligência e Investigação)

export type CompanyCategory = 
  | 'Inteligência Estratégica & Investigação'
  | 'Perícia Forense Digital & Auditoria'
  | 'Segurança Corporativa & Prevenção à Fraude'
  | 'Compliance & Diligência Prévia (Due Diligence)'
  | 'Órgão de Estado / Força de Aplicação da Lei'
  | 'Gabinete Jurídico & Peritagem';

export type CredentialLevel = 'Nível 1 - Básico' | 'Nível 2 - Confidencial' | 'Nível 3 - Secreto' | 'Nível 4 - Muito Secreto' | 'Perito Certificado';

export interface CompanyProfile {
  id: string;
  organizationId?: string;
  legalName: string; // Razão Social / Denominação
  commercialName: string; // Nome Operacional
  nif: string; // NIF Angolano (10 dígitos)
  registoComercial: string; // Conservatória do Registo Comercial
  licencaNumero: string; // Licença Operacional / Alvará de Peritagem
  credencialNivel: CredentialLevel;
  licencaValidade: string;
  entidadeEmissora: string; // Ex: MININT / Gabinete Nacional de Cibersegurança / Ordem
  categoria: CompanyCategory;
  provincia: string;
  municipio: string;
  endereco: string;
  telefone: string;
  email: string;
  website?: string;
  diretorGeral: string;
  diretorOperacoes: string;
  cedulaPericial: string; // Cédula de Perito Forense / Investigador
  bancoPrincipal?: string;
  ibanPrincipal?: string;
  logoUrl?: string;
  updatedAt?: string;
}

export interface CompanyClient {
  id: string;
  organizationId?: string;
  name: string;
  nif: string;
  tipoEntidade: 'Pública (Estado/Governo)' | 'Empresa Privada' | 'Organismo Internacional' | 'Tribunal / Ministério Público';
  contactoPrincipal: string;
  cargo: string;
  email: string;
  telefone: string;
  provincia: string;
  casosAtribuidos: number;
  valorTotalContratado: number;
  status: 'Ativo' | 'Inativo';
  createdAt: string;
}

export interface CompanyContract {
  id: string;
  organizationId?: string;
  codigoContrato: string; // Ex: CTR-2026/014
  titulo: string;
  clienteId: string;
  clienteNome: string;
  projectId?: string;
  projectName?: string;
  tipo: 'Investigação Especial' | 'Perícia Forense Digital' | 'Auditoria de Fraude' | 'Consultoria de Segurança & OSINT' | 'Prestação de Serviços Periciais';
  valorTotal: number;
  moeda: 'AOA' | 'USD' | 'EUR';
  dataAssinatura: string;
  dataInicio: string;
  dataConclusaoPrevista: string;
  garantiaBancaria?: boolean;
  retencaoGarantiaPct?: number; // Ex: 5% ou 10%
  status: 'Vigente' | 'Concluído' | 'Em Negociação' | 'Suspenso';
  createdAt: string;
}
