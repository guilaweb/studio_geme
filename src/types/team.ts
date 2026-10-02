'use client';

export const USER_STATUSES = [
  'Activo',
  'Convidado',
  'Pendente',
  'Suspenso',
  'Inactivo',
] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const ACCESS_PROFILES = [
  { id: 'admin', label: 'Administrador da Organização', description: 'Acesso total a todos os módulos, configurações, equipa e auditoria.' },
  { id: 'director', label: 'Director Geral / Executivo', description: 'Visão executiva global de todas as obras, relatórios e indicadores.' },
  { id: 'project_manager', label: 'Gestor de Projecto', description: 'Gestão integral de planeamento, finanças, equipa e execução das obras atribuídas.' },
  { id: 'engineer', label: 'Engenheiro (Residente / Campo)', description: 'Acesso operacional, EAP, cronogramas, RDO e medições das obras atribuídas.' },
  { id: 'inspector', label: 'Fiscal de Obra', description: 'Fiscalização técnica, validação de autos de medição, ensaios e vistorias.' },
  { id: 'topographer', label: 'Topógrafo', description: 'Levantamentos topográficos, nuvens de pontos, perfis longitudinais e cotas.' },
  { id: 'hseq', label: 'Responsável HSEQ', description: 'Higiene, segurança no trabalho, ambiente, controlo de qualidade e incidentes.' },
  { id: 'commercial', label: 'Comercial / Vendas (CRM)', description: 'Gestão de funil de vendas, oportunidades, propostas comerciais e clientes.' },
  { id: 'financial', label: 'Gestor Financeiro', description: 'Orçamentação, controlo de custos, faturação de fornecedores e autos.' },
  { id: 'operational', label: 'Operacional / Mestre de Obra', description: 'Apontamento de campo diário, RDO, efetivo de mão de obra e equipamentos.' },
  { id: 'hr_manager', label: 'Gestor de Recursos Humanos (RH)', description: 'Gestão integral de colaboradores, departamentos, equipas, férias, ausências, avaliações e relatórios de RH.' },
  { id: 'collaborator', label: 'Colaborador (Geral)', description: 'Acesso pessoal aos seus dados (Meu RH), pedidos de férias, ausências e solicitações.' },
  { id: 'client', label: 'Cliente / Dono da Obra', description: 'Acesso exclusivo e restrito ao Portal do Cliente nos projetos autorizados.' },
] as const;

export type AccessProfileId = (typeof ACCESS_PROFILES)[number]['id'];

export const PROJECT_ROLES = [
  'Gestor',
  'Engenheiro Residente',
  'Engenheiro de Campo',
  'Fiscal',
  'Topógrafo',
  'Responsável HSEQ',
  'Mestre de Obra',
  'Fiel de Armazém',
  'Leitor',
  'Cliente',
] as const;

export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const PROJECT_RESPONSIBILITIES = [
  'Responsável pelo Projecto',
  'Responsável pelo Planeamento',
  'Responsável por Custos',
  'Responsável por HSEQ',
  'Responsável por Fiscalização',
  'Responsável por Topografia',
  'Responsável por Documentação',
  'Responsável por Equipamentos',
  'Membro Técnico',
] as const;

export type ProjectResponsibility = (typeof PROJECT_RESPONSIBILITIES)[number];

export const ORGANIZATION_DEPARTMENTS = [
  'Direcção',
  'Engenharia & Projetos',
  'Construção & Obras',
  'Topografia & Geotecnia',
  'HSEQ & Qualidade',
  'Financeiro & Controlo de Custos',
  'Comercial & Vendas',
  'Logística & Armazém',
  'Recursos Humanos',
  'Outro',
] as const;

export type OrganizationDepartment = (typeof ORGANIZATION_DEPARTMENTS)[number];

export type ModuleKey = 
  | 'projects'
  | 'crm'
  | 'finance'
  | 'reports'
  | 'team'
  | 'hseq'
  | 'equipment'
  | 'procurement'
  | 'hr'
  | 'admin';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
  manage: boolean;
}

export interface HrPermissions {
  // Colaboradores
  viewEmployees: boolean;
  createEmployee: boolean;
  editEmployee: boolean;
  archiveEmployee: boolean;
  // Férias
  viewLeaves: boolean;
  requestLeave: boolean;
  approveLeave: boolean;
  rejectLeave: boolean;
  manageLeaves: boolean;
  // Ausências
  viewAbsences: boolean;
  recordAbsence: boolean;
  approveAbsence: boolean;
  manageAbsences: boolean;
  // Documentos
  viewDocuments: boolean;
  addDocument: boolean;
  editDocument: boolean;
  deleteDocument: boolean;
  // Avaliações
  viewReviews: boolean;
  createReview: boolean;
  editReview: boolean;
  approveReview: boolean;
  // Relatórios
  viewReports: boolean;
  generateReports: boolean;
  exportReports: boolean;
}

export type ProfilePermissionsMap = Record<ModuleKey, ModulePermissions>;

export const DEFAULT_PROFILE_PERMISSIONS: Record<AccessProfileId, ProfilePermissionsMap> = {
  admin: {
    projects: { view: true, create: true, edit: true, delete: true, approve: true, export: true, manage: true },
    crm: { view: true, create: true, edit: true, delete: true, approve: true, export: true, manage: true },
    finance: { view: true, create: true, edit: true, delete: true, approve: true, export: true, manage: true },
    reports: { view: true, create: true, edit: true, delete: true, approve: true, export: true, manage: true },
    team: { view: true, create: true, edit: true, delete: true, approve: true, export: true, manage: true },
    hseq: { view: true, create: true, edit: true, delete: true, approve: true, export: true, manage: true },
    equipment: { view: true, create: true, edit: true, delete: true, approve: true, export: true, manage: true },
    procurement: { view: true, create: true, edit: true, delete: true, approve: true, export: true, manage: true },
    hr: { view: true, create: true, edit: true, delete: true, approve: true, export: true, manage: true },
    admin: { view: true, create: true, edit: true, delete: true, approve: true, export: true, manage: true },
  },
  director: {
    projects: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: true },
    crm: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: true },
    finance: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: true },
    reports: { view: true, create: true, edit: true, delete: true, approve: true, export: true, manage: true },
    team: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: false },
    hseq: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: false },
    equipment: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: false },
    procurement: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: false },
    hr: { view: true, create: false, edit: false, delete: false, approve: true, export: true, manage: false },
    admin: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
  },
  project_manager: {
    projects: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: true },
    crm: { view: true, create: true, edit: true, delete: false, approve: false, export: true, manage: false },
    finance: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: false },
    reports: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: true },
    team: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hseq: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: false },
    equipment: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: false },
    procurement: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: false },
    hr: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: false },
    admin: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
  },
  engineer: {
    projects: { view: true, create: false, edit: true, delete: false, approve: false, export: true, manage: false },
    crm: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    finance: { view: true, create: true, edit: false, delete: false, approve: false, export: false, manage: false },
    reports: { view: true, create: true, edit: true, delete: false, approve: false, export: true, manage: false },
    team: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hseq: { view: true, create: true, edit: true, delete: false, approve: false, export: true, manage: false },
    equipment: { view: true, create: true, edit: true, delete: false, approve: false, export: false, manage: false },
    procurement: { view: true, create: true, edit: false, delete: false, approve: false, export: false, manage: false },
    hr: { view: true, create: true, edit: false, delete: false, approve: false, export: false, manage: false },
    admin: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
  },
  inspector: {
    projects: { view: true, create: false, edit: false, delete: false, approve: true, export: true, manage: false },
    crm: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    finance: { view: true, create: false, edit: false, delete: false, approve: true, export: true, manage: false },
    reports: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: false },
    team: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hseq: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: false },
    equipment: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    procurement: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hr: { view: true, create: true, edit: false, delete: false, approve: false, export: false, manage: false },
    admin: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
  },
  topographer: {
    projects: { view: true, create: false, edit: true, delete: false, approve: false, export: true, manage: false },
    crm: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    reports: { view: true, create: true, edit: true, delete: false, approve: false, export: true, manage: false },
    team: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hseq: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    equipment: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    procurement: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hr: { view: true, create: true, edit: false, delete: false, approve: false, export: false, manage: false },
    admin: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
  },
  hseq: {
    projects: { view: true, create: false, edit: false, delete: false, approve: false, export: true, manage: false },
    crm: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    reports: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: false },
    team: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hseq: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: true },
    equipment: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    procurement: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hr: { view: true, create: true, edit: false, delete: false, approve: false, export: false, manage: false },
    admin: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
  },
  commercial: {
    projects: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    crm: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: true },
    finance: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    reports: { view: true, create: true, edit: true, delete: false, approve: false, export: true, manage: false },
    team: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hseq: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    equipment: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    procurement: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hr: { view: true, create: true, edit: false, delete: false, approve: false, export: false, manage: false },
    admin: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
  },
  financial: {
    projects: { view: true, create: false, edit: false, delete: false, approve: false, export: true, manage: false },
    crm: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    finance: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: true },
    reports: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: false },
    team: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hseq: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    equipment: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    procurement: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: false },
    hr: { view: true, create: true, edit: false, delete: false, approve: false, export: true, manage: false },
    admin: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
  },
  operational: {
    projects: { view: true, create: false, edit: true, delete: false, approve: false, export: false, manage: false },
    crm: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    reports: { view: true, create: true, edit: false, delete: false, approve: false, export: false, manage: false },
    team: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hseq: { view: true, create: true, edit: false, delete: false, approve: false, export: false, manage: false },
    equipment: { view: true, create: true, edit: true, delete: false, approve: false, export: false, manage: false },
    procurement: { view: true, create: true, edit: false, delete: false, approve: false, export: false, manage: false },
    hr: { view: true, create: true, edit: false, delete: false, approve: false, export: false, manage: false },
    admin: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
  },
  hr_manager: {
    projects: { view: true, create: false, edit: false, delete: false, approve: false, export: true, manage: false },
    crm: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    finance: { view: true, create: false, edit: false, delete: false, approve: false, export: true, manage: false },
    reports: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: true },
    team: { view: true, create: true, edit: true, delete: false, approve: true, export: true, manage: true },
    hseq: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    equipment: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    procurement: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hr: { view: true, create: true, edit: true, delete: true, approve: true, export: true, manage: true },
    admin: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
  },
  collaborator: {
    projects: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    crm: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    reports: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    team: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hseq: { view: true, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    equipment: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    procurement: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hr: { view: true, create: true, edit: false, delete: false, approve: false, export: false, manage: false },
    admin: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
  },
  client: {
    projects: { view: true, create: false, edit: false, delete: false, approve: false, export: true, manage: false },
    crm: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    reports: { view: true, create: false, edit: false, delete: false, approve: false, export: true, manage: false },
    team: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hseq: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    equipment: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    procurement: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    hr: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
    admin: { view: false, create: false, edit: false, delete: false, approve: false, export: false, manage: false },
  },
};

export interface AssignedProjectRef {
  projectId: string;
  projectName: string;
  projectCode?: string;
  projectRole: ProjectRole;
  responsibility?: ProjectResponsibility;
  assignedAt?: string | any;
}

export interface TeamMemberProfile {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  photoURL?: string | null;
  jobTitle: string;
  department: OrganizationDepartment;
  profileId: AccessProfileId;
  status: UserStatus;
  assignedProjects: AssignedProjectRef[];
  customPermissions?: Partial<Record<ModuleKey, Partial<ModulePermissions>>>;
  lastLoginAt?: string | any;
  createdAt?: string | any;
  invitedBy?: {
    uid: string;
    displayName: string;
  };
}

export interface Invitation {
  id: string;
  email: string;
  displayName: string;
  jobTitle: string;
  department: OrganizationDepartment;
  profileId: AccessProfileId;
  assignedProjects: AssignedProjectRef[];
  status: 'Pendente' | 'Aceite' | 'Cancelado' | 'Expirado';
  token?: string;
  invitedBy: {
    uid: string;
    displayName: string;
  };
  invitedAt: string | any;
  expiresAt: string | any;
  acceptedAt?: string | any;
}

export interface AuditLog {
  id: string;
  actor: {
    uid: string;
    displayName: string;
    email?: string;
  };
  action: 
    | 'CONVITE_ENVIADO'
    | 'CONVITE_REENVIADO'
    | 'CONVITE_CANCELADO'
    | 'CONVITE_ACEITE'
    | 'UTILIZADOR_CRIADO'
    | 'UTILIZADOR_ATIVADO'
    | 'UTILIZADOR_SUSPENSO'
    | 'UTILIZADOR_DESATIVADO'
    | 'PERFIL_ALTERADO'
    | 'PERMISSOES_ALTERADAS'
    | 'PROJETO_ATRIBUIDO'
    | 'PROJETO_REMOVIDO'
    | 'FUNCAO_PROJETO_ALTERADA'
    | 'RESPONSABILIDADE_ALTERADA';
  target: {
    type: 'user' | 'invitation' | 'project' | 'permissions';
    id: string;
    name: string;
  };
  details: string;
  context?: string;
  timestamp: string | any;
  metadata?: Record<string, any>;
}

/**
 * Verifica se um utilizador tem permissão para uma ação num módulo
 */
export function hasModulePermission(
  profileId?: AccessProfileId | string,
  module?: ModuleKey,
  action?: keyof ModulePermissions,
  customPermissions?: Partial<Record<ModuleKey, Partial<ModulePermissions>>>
): boolean {
  if (!profileId || !module || !action) return false;
  if (profileId === 'admin' || profileId === 'super-admin') return true;

  // Check custom override first
  if (customPermissions?.[module]?.[action] !== undefined) {
    return !!customPermissions[module]![action];
  }

  const basePermissions = DEFAULT_PROFILE_PERMISSIONS[profileId as AccessProfileId];
  if (!basePermissions || !basePermissions[module]) return false;

  return !!basePermissions[module][action];
}
