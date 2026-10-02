import type { Timestamp } from "firebase/firestore";

export type ProjectStatus = 'Planeamento' | 'Em Execução' | 'Paralisada' | 'Concluída' | 'Encerrado';
export type ProjectLifecycleStage = 'conception' | 'planning' | 'budgeting' | 'execution' | 'control' | 'closing';
export type ProjectPriority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';

export type ProjectType = 'Residencial' | 'Estrada' | 'Edifício' | 'Infraestrutura' | 'Mineração' | 'Energia' | 'Telecomunicações' | 'Industrial' | 'Outro';

export type EnergySource = 'Solar' | 'Hídrica' | 'Térmica' | 'Eólica' | 'Outra';

export interface ProjectLocation {
  address?: string;
  country?: string;
  province?: string;
  municipality?: string;
  commune?: string;
  latitude?: number;
  longitude?: number;
}

export interface ProjectKeyRoles {
  director?: string;
  projectManager?: string;
  leadEngineer?: string;
  inspector?: string;
  coordinator?: string;
}

export interface ProjectFinancialSummary {
  contractValue?: number;
  approvedBudget?: number;
  committedCost?: number;
  actualCost?: number;
  availableBalance?: number;
}

export interface Project {
  id: string;
  code?: string;
  name: string;
  description?: string;
  category?: string;
  priority?: ProjectPriority;
  lifecycleStage?: ProjectLifecycleStage;
  
  location?: ProjectLocation;
  type?: ProjectType;
  budget?: number;
  startDate?: Date;
  endDate?: Date;
  status: ProjectStatus;
  lastAlert?: string;
  progress: number;
  ownerId: string;
  organizationId?: string;

  // Financial & Contractual
  contractValue?: number;
  approvedBudget?: number;
  committedCost?: number;
  actualCost?: number;
  availableBalance?: number;

  // Triple Progress
  physicalProgress?: number;
  financialProgress?: number;
  scheduleProgress?: number;

  // Client Details
  clientName?: string;
  clientEmail?: string;
  clientContact?: string;
  clientPhone?: string;
  clientRepresentative?: string;

  // Contractual & Actual Dates
  contractStartDate?: Date;
  contractEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  expectedEndDate?: Date;

  // Key Roles
  director?: string;
  projectManager?: string;
  leadEngineer?: string;
  inspector?: string;
  coordinator?: string;

  // Media & BIM
  imageUrl?: string;
  modelUrl?: string;
  metaModelUrl?: string;
  createdAt?: Date;

  // Closing & Archive
  closingChecklist?: { [key: string]: boolean };
  isArchived?: boolean;
  archiveNotes?: string;
  acceptanceDate?: Date;

  // Mining specific
  mineralType?: string;
  concessionName?: string;

  // Energy specific
  capacityMw?: number;
  energySource?: EnergySource;

  // Telecom specific
  numSites?: number;

  // Road/Infra specific
  lengthKm?: number;
}

export type UserRole = 'Gestor' | 'Editor' | 'Visualizador' | 'Leitor' | 'Mestre de Obra' | 'Fiel de Armazém';
export type AnnotationType = string;
export type AnnotationPriority = 'Baixa' | 'Média' | 'Alta';
export type AnnotationStatus = 'Aberta' | 'Resolvida';

export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: any;
  imageUrl?: string;
}

export interface TeamMember {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  joinedAt?: any;
  department?: string;
  phone?: string;
  responsibility?: string;
  assignedActivitiesCount?: number;
}

export interface Annotation {
  id: string;
  text: string;
  author: string;
  createdAt: any;
  status: AnnotationStatus;
  type: AnnotationType;
  priority: AnnotationPriority;
  assignee?: { uid: string; displayName: string; } | null;
  coords?: { x: number; y: number; z: number; };
  photoUrls?: { url: string; name: string; }[];
  comments?: Comment[];
}
