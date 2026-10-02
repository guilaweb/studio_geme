import { CompanyCategory, CredentialLevel } from './company';

export type OrganizationPlan = 'starter' | 'professional' | 'business' | 'enterprise';

export type OrganizationStatus = 'active' | 'suspended' | 'trial' | 'inactive';

export type OrganizationRole = 
  | 'super-admin'
  | 'admin'
  | 'director'
  | 'chief_investigator'
  | 'investigator'
  | 'forensic_expert'
  | 'intelligence_analyst'
  | 'auditor'
  | 'project_manager'
  | 'engineer'
  | 'supervisor'
  | 'fiscal'
  | 'warehouse_clerk'
  | 'viewer';

export interface OrganizationSettings {
  measurementPrefix?: string;
  costDeviationThresholdPct?: number;
  requireFiscalValidation?: boolean;
  autoLockApprovedMeasurements?: boolean;
  defaultCurrency?: 'AOA' | 'USD' | 'EUR';
  allowCrossProjectEquipment?: boolean;
  strictCustodyCheck?: boolean;
  autoComputeSha256?: boolean;
  [key: string]: any;
}

export interface Organization {
  id: string;
  legalName: string;
  commercialName: string;
  nif: string;
  registoComercial?: string;
  licencaNumero?: string;
  credencialNivel?: CredentialLevel;
  licencaValidade?: string;
  entidadeEmissora?: string;
  categoria?: CompanyCategory;
  email: string;
  phone: string;
  address: string;
  province: string;
  municipality: string;
  logoUrl?: string;
  currency: 'AOA' | 'USD' | 'EUR';
  timezone: string;
  language: string;
  status: OrganizationStatus;
  plan: OrganizationPlan;
  diretorGeral?: string;
  diretorOperacoes?: string;
  cedulaPericial?: string;
  bancoPrincipal?: string;
  ibanPrincipal?: string;
  website?: string;
  settings?: OrganizationSettings;
  // Backwards compatibility aliases
  alvaraNumero?: string;
  alvaraClasse?: any;
  alvaraValidade?: string;
  alvaraEmissor?: string;
  diretorTecnico?: string;
  cedulaOEA?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface OrganizationMember {
  id: string; // `${organizationId}_${userId}`
  organizationId: string;
  userId: string;
  email: string;
  displayName: string;
  role: OrganizationRole;
  projectAccessType: 'all' | 'assigned';
  assignedProjectIds?: string[];
  status: 'active' | 'invited' | 'suspended';
  department?: string;
  jobTitle?: string;
  joinedAt?: any;
  updatedAt?: any;
}

export const DEFAULT_ORGANIZATION_ID = 'org_default_profundidade';

export const DEFAULT_ORGANIZATION: Organization = {
  id: DEFAULT_ORGANIZATION_ID,
  legalName: 'Direcção de Inteligência e Perícia Forense PROFUNDIDADE',
  commercialName: 'PROFUNDIDADE Investigação',
  nif: '5417089921',
  registoComercial: 'Conservatória do Registo Comercial de Luanda n.º 1248/20',
  licencaNumero: 'LIC-2026/0981-SEC',
  credencialNivel: 'Nível 3 - Secreto',
  licencaValidade: '2028-12-31',
  entidadeEmissora: 'Ministério do Interior / Gabinete Nacional de Cibersegurança',
  categoria: 'Inteligência Estratégica & Investigação',
  email: 'operacoes@profundidade.ao',
  phone: '+244 923 456 789',
  address: 'Edifício Kilamba, 4.º Andar, Av. 4 de Fevereiro',
  province: 'Luanda',
  municipality: 'Luanda',
  currency: 'AOA',
  timezone: 'Africa/Luanda',
  language: 'pt-AO',
  status: 'active',
  plan: 'enterprise',
  diretorGeral: 'Dr. Manuel Domingos',
  diretorOperacoes: 'Capitão António Kiala',
  cedulaPericial: 'PER-AO-6542/2026',
  bancoPrincipal: 'Banco Angolano de Investimentos (BAI)',
  ibanPrincipal: 'AO06.0040.0000.1234.5678.9012.3',
  website: 'https://profundidade.ao',
  settings: {
    defaultCurrency: 'AOA',
    strictCustodyCheck: true,
    autoComputeSha256: true,
  },
};
