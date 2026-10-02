'use client';

import { type AppUser } from '@/hooks/use-auth';
import { type WorkforceMember } from '@/types/workforce';
import { type HrTeam, type HrRequest } from '@/types/hr';

export interface HrUserAccess {
  isAdmin: boolean;
  isHrManager: boolean;
  isDirector: boolean;
  isManager: boolean;
  isCollaborator: boolean;
  canManageAllEmployees: boolean;
  canCreateEmployee: boolean;
  canEditEmployee: boolean;
  canArchiveEmployee: boolean;
  canApproveVacations: boolean;
  canApproveAbsences: boolean;
  canManageDepartments: boolean;
  canManageTeams: boolean;
  canViewExecutiveDashboard: boolean;
  canViewTeamTab: boolean;
  canViewCompanyWorkforce: boolean;
  canViewPrivateFinancials: boolean; // costPerHour, payslips
  canManageEvaluations: boolean;
  canGenerateReports: boolean;
  roleTitle: string;
}

/**
 * Resolve o nível de acesso do utilizador no módulo de Recursos Humanos (RH)
 */
export function resolveHrUserAccess(user: AppUser | null, userTeams?: HrTeam[]): HrUserAccess {
  if (!user) {
    return {
      isAdmin: false,
      isHrManager: false,
      isDirector: false,
      isManager: false,
      isCollaborator: false,
      canManageAllEmployees: false,
      canCreateEmployee: false,
      canEditEmployee: false,
      canArchiveEmployee: false,
      canApproveVacations: false,
      canApproveAbsences: false,
      canManageDepartments: false,
      canManageTeams: false,
      canViewExecutiveDashboard: false,
      canViewTeamTab: false,
      canViewCompanyWorkforce: false,
      canViewPrivateFinancials: false,
      canManageEvaluations: false,
      canGenerateReports: false,
      roleTitle: 'Visitante',
    };
  }

  const role = (user.role || '').toLowerCase();
  const profileId = (user.accessProfile || (user as any).profileId || '').toLowerCase();

  const isAdmin = 
    role === 'super-admin' || 
    role === 'admin' || 
    profileId === 'admin';

  const isHrManager = 
    isAdmin || 
    user.role === 'Gestor de RH' || 
    profileId === 'hr_manager' ||
    user.department === 'Recursos Humanos';

  const isDirector = 
    isAdmin || 
    profileId === 'director' || 
    role === 'diretor' || 
    role === 'director' || 
    user.department === 'Direcção';

  // Verifica se lidera equipas ou projetos
  const isTeamLeader = userTeams?.some(t => t.leaderUid === user.uid) ?? false;
  const hasAssignedProjectsAsManager = 
    (user.assignedProjects || []).some(p => p.projectRole === 'Gestor' || p.responsibility === 'Responsável pelo Projecto');

  const isManager = 
    isAdmin || 
    isHrManager || 
    isDirector || 
    profileId === 'project_manager' || 
    isTeamLeader || 
    hasAssignedProjectsAsManager;

  // Qualquer utilizador autenticado dentro da organização é no mínimo Colaborador
  const isCollaborator = true;

  let roleTitle = 'Colaborador';
  if (isAdmin) roleTitle = 'Administrador da Organização';
  else if (isHrManager) roleTitle = 'Gestor de Recursos Humanos';
  else if (isDirector) roleTitle = 'Director Executivo';
  else if (isManager) roleTitle = 'Gestor / Chefe de Equipa';

  return {
    isAdmin,
    isHrManager,
    isDirector,
    isManager,
    isCollaborator,
    canManageAllEmployees: isAdmin || isHrManager,
    canCreateEmployee: isAdmin || isHrManager,
    canEditEmployee: isAdmin || isHrManager,
    canArchiveEmployee: isAdmin || isHrManager,
    canApproveVacations: isAdmin || isHrManager || isManager,
    canApproveAbsences: isAdmin || isHrManager || isManager,
    canManageDepartments: isAdmin || isHrManager,
    canManageTeams: isAdmin || isHrManager,
    canViewExecutiveDashboard: isAdmin || isHrManager || isDirector,
    canViewTeamTab: isAdmin || isHrManager || isManager,
    canViewCompanyWorkforce: isAdmin || isHrManager || isDirector || isManager,
    canViewPrivateFinancials: isAdmin || isHrManager,
    canManageEvaluations: isAdmin || isHrManager || isManager,
    canGenerateReports: isAdmin || isHrManager || isDirector,
    roleTitle,
  };
}

/**
 * Sanitiza a lista de colaboradores respeitando as regras de privacidade da organização:
 * - Dados públicos: nome, cargo/função, departamento, equipa, contacto corporativo, foto, status
 * - Dados restritos: custo hora/unidade, documentos pessoais confidenciais, notas internas
 */
export function sanitizeWorkforceList(
  members: WorkforceMember[], 
  currentUser: AppUser | null, 
  access: HrUserAccess
): WorkforceMember[] {
  if (!currentUser) return [];

  // RH e Administrador têm acesso total
  if (access.canViewPrivateFinancials) {
    return members;
  }

  // Demais perfis (Directores, Gestores, Colaboradores):
  // Ocultam dados confidenciais de terceiros mantendo apenas os seus próprios
  return members.map(member => {
    const isOwnRecord = 
      member.id === currentUser.uid || 
      (member.contact && member.contact.toLowerCase() === (currentUser.email || '').toLowerCase()) ||
      (member.name && member.name.toLowerCase() === (currentUser.displayName || '').toLowerCase());

    if (isOwnRecord) {
      return member;
    }

    // Ocultar dados financeiros e pessoais confidenciais de outros colaboradores
    return {
      ...member,
      costPerHour: undefined,
      costPerUnit: undefined,
      documents: member.documents?.filter(d => (d as any).visibility === 'public'),
      emergencyContactName: undefined,
      emergencyContactPhone: undefined,
      emergencyContactRelationship: undefined,
      birthDate: undefined,
      notes: undefined,
    };
  });
}

/**
 * Determina se o utilizador pode aprovar ou rejeitar uma solicitação específica de RH
 */
export function canApproveRequest(request: HrRequest, user: AppUser | null, access: HrUserAccess): boolean {
  if (!user) return false;
  if (access.isAdmin || access.isHrManager) return true;

  // Próprio colaborador não pode aprovar os seus próprios pedidos
  if (request.employeeUid === user.uid || request.employeeEmail === user.email) {
    return false;
  }

  // Gestor direto da equipa pode aprovar no passo 1 (Pendente Gestor)
  if (access.isManager && request.status === 'Pendente Gestor') {
    if (request.managerUid === user.uid) return true;
  }

  return false;
}
