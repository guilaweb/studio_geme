export const ANGOLA_PROVINCES = [
  'Luanda',
  'Benguela',
  'Huambo',
  'Huíla',
  'Namibe',
  'Cabinda',
  'Cuanza Sul',
  'Cuanza Norte',
  'Uíge',
  'Zaire',
  'Malanje',
  'Lunda Norte',
  'Lunda Sul',
  'Moxico',
  'Bié',
  'Cunene',
  'Cuando Cubango',
  'Bengo',
] as const;

export type AngolaProvince = (typeof ANGOLA_PROVINCES)[number];

export const INVESTIGATION_ROLES = [
  'Director de Investigação',
  'Investigador Principal',
  'Perito Forense Digital',
  'Analista de Inteligência & OSINT',
  'Auditor de Fraude & Custódia',
  'Inspector de Integridade & Compliance',
  'Oficial de Ligação Institucional',
  'Especialista em Rastreio Financeiro',
  'Outro',
] as const;

export const ENGINEERING_ROLES = INVESTIGATION_ROLES; // backwards-compatible alias

export type InvestigationRole = (typeof INVESTIGATION_ROLES)[number];
export type EngineeringRole = InvestigationRole;

export interface UserNotificationPreferences {
  emailAlerts: boolean;
  evidenceTamperAlerts?: boolean;
  costDeviationAlerts?: boolean; // legacy alias
  hseqAlerts?: boolean;
  dailyReportReminders?: boolean;
  measurementApprovals?: boolean;
  caseStatusAlerts?: boolean;
  siInferenceAlerts?: boolean;
  reportSealingAlerts?: boolean;
  auditSecurityAlerts?: boolean;
}

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  phoneNumber?: string;
  jobTitle?: string;
  company?: string;
  professionalRegNumber?: string; // Nº Cédula OEA / OAA
  province?: AngolaProvince | string;
  digitalSignatureUrl?: string; // Rubrica em base64/PNG
  defaultViewMode?: 'field_operation' | 'cost_engineer' | 'executive_cockpit' | 'full_engineering';
  preferredTheme?: 'light' | 'dark' | 'system';
  notifications?: UserNotificationPreferences;
  role?: string;
  plan?: string;
  createdAt?: any;
  updatedAt?: any;
}
