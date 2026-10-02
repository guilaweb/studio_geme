import type { Timestamp } from 'firebase/firestore';
import { WbsItem } from './wbs';
import { Transaction } from './finance';
import { Incident } from './hseq';
import { Opportunity } from './crm';
import type { WorkforceMember } from './workforce';
import type { Project } from './project';
import type { Equipment, EquipmentUsageLog } from './equipment';
import type { Risk } from './risk';

export type DataSource = 'wbs_finance' | 'hseq' | 'crm' | 'rh';
export type VisualizationType = 'table' | 'bar_chart' | 'line_chart' | 'pie_chart';

export type ReportData = (WbsItem | Incident | Opportunity | Transaction | WorkforceMember) & { projectId?: string };

export interface ReportConfiguration {
  id: string;
  name: string;
  dataSource: DataSource | '';
  filters: {
    projectIds?: string[];
    dateRange?: {
      from?: string;
      to?: string;
    };
    contentFilters?: Record<string, string>;
  };
  columns: string[];
  visualization: {
    type: VisualizationType;
    xAxis?: string;
    yAxis?: string[];
    dateGrouping?: 'day' | 'week' | 'month';
  };
  author: {
    uid: string;
    displayName: string;
  };
  createdAt: Timestamp;
}

// ============================================================================
// ENTERPRISE REPORTING ENGINE TYPES (MOTOR DE RELATÓRIOS PROFISSIONAIS)
// ============================================================================

export type ReportType =
  | 'executive'        // Dossiê Executivo de Alta Direção
  | 'progress_monthly' // Relatório Mensal de Progresso Físico-Financeiro
  | 'supervision'      // Relatório de Fiscalização & Dono da Obra
  | 'measurement'      // Relatório de Auto de Medição & Faturamento
  | 'daily_rdo'        // Relatório Consolidado de Diário de Obra (RDO)
  | 'cost_financial'   // Relatório de Engenharia de Custos, CPU & Compras
  | 'planning_wbs'     // Relatório de Planeamento, EAP & Caminho Crítico
  | 'hseq'             // Relatório de Segurança, Ambiente e Qualidade
  | 'fleet_equipment'  // Relatório de Eficiência de Frotas & Equipamentos
  | 'technical_full'   // Relatório Técnico Integral (Multidisciplinar)
  | 'custom';          // Relatório Personalizado

export type ReportSectionId =
  | 'summary'          // 1. Sumário Executivo & Diagnóstico Causal
  | 'identification'   // 2. Identificação do Projeto & Partes Envolvidas
  | 'kpis'             // 3. Painel de Indicadores Chave (Físico, Financeiro, Prazos)
  | 'curva_s'          // 4. Curva S Integrada (Planeado vs Valor Ganho vs Real)
  | 'eva'              // 5. Análise de Valor Ganho (SPI, CPI, EAC)
  | 'wbs'              // 6. Estrutura Analítica do Projeto (EAP / WBS)
  | 'costs'            // 7. Engenharia de Custos, Compras & Faturas
  | 'measurements'     // 8. Autos de Medição & Faturamento Contratual
  | 'rdo'              // 9. Diário de Campo / RDO & Condições de Estaleiro
  | 'equipment'        // 10. Frotas, Equipamentos & Horímetros
  | 'risks_hseq'       // 11. Riscos, Incidentes & Conformidade HSEQ
  | 'photos'           // 12. Registo Fotográfico com Georreferenciação
  | 'recommendations'  // 13. Recomendações Técnicas & Conclusão
  | 'signatures';      // 14. Termo de Responsabilidade & Assinaturas Formais

export type ReportOrientation = 'portrait' | 'landscape';
export type ReportLanguage = 'pt' | 'en';
export type ReportCurrency = 'AOA' | 'EUR' | 'USD';
export type ReportDocumentStatus = 'Rascunho' | 'Para Revisão' | 'Aprovado' | 'Emitido';

export interface ReportDocumentMetadata {
  title: string;
  subtitle?: string;
  docCode: string;
  revision: string;
  status: ReportDocumentStatus;
  referencePeriod: string;
  emissionDate: Date | string;
  authorName: string;
  authorRole?: string;
  reviewerName?: string;
  reviewerRole?: string;
  approverName?: string;
  approverRole?: string;
  classification?: string; // e.g. "CONFIDENCIAL / PROBATÓRIO"
  companyName?: string;
  clientName?: string;
  contractorName?: string;
  supervisionName?: string;
  location?: string;
  includeCover: boolean;
  includeToc: boolean;
}

export interface ReportGenerationOptions {
  project: Project;
  metadata: ReportDocumentMetadata;
  sections: ReportSectionId[];
  orientation: ReportOrientation;
  language: ReportLanguage;
  currency: ReportCurrency;
  wbsItems?: WbsItem[];
  transactions?: Transaction[];
  equipments?: Equipment[];
  usageLogs?: EquipmentUsageLog[];
  incidents?: Incident[];
  risks?: Risk[];
  dailyReports?: any[];
  measurements?: any[];
  photos?: Array<{
    title: string;
    description?: string;
    timestamp?: string;
    coordinates?: string;
    imageUrl?: string;
    wbsRef?: string;
  }>;
  supplierInvoices?: any[];
}

export interface GeneratedReportRecord {
  id: string;
  projectId: string;
  title: string;
  fileName: string;
  reportType: ReportType;
  docCode: string;
  revision: string;
  status: ReportDocumentStatus;
  createdAt: string;
  createdBy: string;
  hashSha256: string;
  pageCount: number;
  sections: ReportSectionId[];
  referencePeriod: string;
  fileSizeBytes?: number;
}
