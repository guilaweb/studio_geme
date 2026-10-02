export const USER_ROLES = [
  'user',
  'super-admin',
  'cliente',
  'Gestor de RH',
  'Gestor de Financeiro',
  'Gestor de Frota',
] as const;

export type UserRoleType = (typeof USER_ROLES)[number];
