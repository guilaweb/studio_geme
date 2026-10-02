'use client';

import dynamic from 'next/dynamic';
import type { User } from 'firebase/auth';
import type { Project } from '@/types/project';
import type { WbsItem } from '@/types/wbs';
import type { Transaction } from '@/types/finance';
import type { Annotation, TeamMember, UserRole } from '@/app/projects/[id]/page';
import type { ProjectFile } from '@/types/documents';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';

// All the dynamic imports from the original page file
const LoadingComponent = () => <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

const DailyDashboardTab = dynamic(() => import('@/components/daily-dashboard-tab'), { ssr: false, loading: LoadingComponent });
const FinanceTab = dynamic(() => import('@/components/finance-tab'), { ssr: false, loading: LoadingComponent });
const HseqTab = dynamic(() => import('@/components/hseq-tab'), { ssr: false, loading: LoadingComponent });
const FvsTab = dynamic(() => import('@/components/fvs-tab'), { ssr: false, loading: LoadingComponent });
const TeamManagement = dynamic(() => import('@/components/team-management'), { ssr: false, loading: LoadingComponent });
const WbsComponent = dynamic(() => import('@/components/wbs-component').then((mod) => mod.WbsComponent), { ssr: false, loading: LoadingComponent });
const DailyReportTab = dynamic(() => import('@/components/daily-report-tab'), { ssr: false, loading: LoadingComponent });
const ProcurementTab = dynamic(() => import('@/components/procurement-tab'), { ssr: false, loading: LoadingComponent });
const AnalysisTab = dynamic(() => import('@/components/analysis-tab'), { ssr: false, loading: LoadingComponent });
const PostConstructionTab = dynamic(() => import('@/components/post-construction-tab'), { ssr: false, loading: LoadingComponent });
const ScheduleTab = dynamic(() => import('@/components/schedule-tab'), { ssr: false, loading: LoadingComponent });
const FormalCommunicationTab = dynamic(() => import('@/components/formal-communication-tab'), { ssr: false, loading: LoadingComponent });
const LegalTab = dynamic(() => import('@/components/legal-tab'), { ssr: false, loading: LoadingComponent });
const RiskManagementTab = dynamic(() => import('@/components/risk-management-tab'), { ssr: false, loading: LoadingComponent });
const ChangeManagementTab = dynamic(() => import('@/components/change-management-tab'), { ssr: false, loading: LoadingComponent });
const RequirementsTab = dynamic(() => import('@/components/requirements-tab'), { ssr: false, loading: LoadingComponent });
const CapacityAnalysisTab = dynamic(() => import('@/components/capacity-analysis-tab'), { ssr: false, loading: LoadingComponent });
const ProjectDashboardTab = dynamic(() => import('@/components/project-dashboard-tab'), { ssr: false, loading: LoadingComponent });
const ProjectSettingsTab = dynamic(() => import('@/components/project-settings-tab'), { ssr: false, loading: LoadingComponent });
const EngineeringTab = dynamic(() => import('@/components/engineering-tab'), { ssr: false, loading: LoadingComponent });
const AnnotationList = dynamic(() => import('@/components/annotation-list').then(mod => mod.AnnotationList), { ssr: false, loading: LoadingComponent });
const MiningTab = dynamic(() => import('@/components/mining/mining-tab'), { ssr: false, loading: LoadingComponent });
const EnergyTab = dynamic(() => import('@/components/energy-tab'), { ssr: false, loading: LoadingComponent });
const ClientCommunicationTab = dynamic(() => import('@/components/client-communication-tab').then(mod => mod.ClientCommunicationTab), { ssr: false, loading: LoadingComponent });
const WorkforceManagementTab = dynamic(() => import('@/components/workforce-management-tab'), { ssr: false, loading: LoadingComponent });
const EquipmentMainTab = dynamic(() => import('@/components/equipment-main-tab'), { ssr: false, loading: LoadingComponent });
const SitesTab = dynamic(() => import('@/components/telecom/sites-tab'), { ssr: false, loading: LoadingComponent });
const ConcretePourTab = dynamic(() => import('@/components/concrete-pour-tab'), { ssr: false, loading: LoadingComponent });
const ReinforcementInspectionTab = dynamic(() => import('@/components/reinforcement-inspection-tab'), { ssr: false, loading: LoadingComponent });
const FormworkControlTab = dynamic(() => import('@/components/formwork-control-tab'), { ssr: false, loading: LoadingComponent });
const SubcontractorManagementTab = dynamic(() => import('@/components/subcontractor-management-tab'), { ssr: false, loading: LoadingComponent });
const MeasurementCertificatesTab = dynamic(() => import('@/components/measurement-certificates-tab'), { ssr: false, loading: LoadingComponent });
const MaterialsControlTab = dynamic(() => import('@/components/materials-control-tab'), { ssr: false, loading: LoadingComponent });
const QualityPlanTab = dynamic(() => import('@/components/quality-plan-tab'), { ssr: false, loading: LoadingComponent });
const RoadInfrastructureTab = dynamic(() => import('@/components/roads/road-infrastructure-tab'), { ssr: false, loading: LoadingComponent });
const EnginesOrchestratorTab = dynamic(() => import('@/components/engines/engines-orchestrator-tab').then(mod => mod.EnginesOrchestratorTab), { ssr: false, loading: LoadingComponent });
const ReportsHubTab = dynamic(() => import('@/components/reports/reports-hub-tab'), { ssr: false, loading: LoadingComponent });

// New Project Command Center Tabs
const ProjectGeneralDataTab = dynamic(() => import('@/components/project/project-general-data-tab').then(mod => mod.ProjectGeneralDataTab), { ssr: false, loading: LoadingComponent });
const ProjectCostControlTab = dynamic(() => import('@/components/project/project-cost-control-tab').then(mod => mod.ProjectCostControlTab), { ssr: false, loading: LoadingComponent });
const ProjectMultiLevelPlanning = dynamic(() => import('@/components/project/project-multi-level-planning').then(mod => mod.ProjectMultiLevelPlanning), { ssr: false, loading: LoadingComponent });
const ProjectClosingTab = dynamic(() => import('@/components/project/project-closing-tab').then(mod => mod.ProjectClosingTab), { ssr: false, loading: LoadingComponent });
const ProjectFiscalizacaoTab = dynamic(() => import('@/components/project/project-fiscalizacao-tab').then(mod => mod.ProjectFiscalizacaoTab), { ssr: false, loading: LoadingComponent });

interface ProjectTabContentProps {
    activeTab: string;
    projectId: string;
    project: Project;
    wbsItems: WbsItem[];
    transactions: Transaction[];
    team: TeamMember[];
    userRole: UserRole | null;
    onFvsSelect: (file: ProjectFile) => void;
    user: User | null;
    viewerCoords: { x: number; y: number; z: number } | null;
    onCoordsClear: () => void;
    selectedAnnotationId: string | null;
    onAnnotationSelect: (id: string) => void;
    loadingFvs: boolean;
    selectedFvsContent: string | null;
    selectedFvsFile: ProjectFile | null;
    onTabChange: (tabId: string) => void;
}

export function ProjectTabContent({ 
    activeTab, 
    projectId,
    project,
    wbsItems,
    transactions,
    team,
    userRole,
    onFvsSelect,
    user,
    viewerCoords,
    onCoordsClear,
    selectedAnnotationId,
    onAnnotationSelect,
    loadingFvs,
    selectedFvsContent,
    selectedFvsFile,
    onTabChange,
}: ProjectTabContentProps) {

    const renderContent = () => {
      switch (activeTab) {
            case 'dashboard':
              return <ProjectDashboardTab 
                        projectId={projectId}
                        projectName={project.name} 
                        projectProgress={project.progress || 0}
                        wbsItems={wbsItems}
                        transactions={transactions}
                        project={project}
                        onNavigateTab={onTabChange}
                     />;
            case 'dados-gerais':
              return <ProjectGeneralDataTab
                        projectId={projectId}
                        project={project}
                        userRole={userRole}
                     />;
            case 'controle-custos':
              return <ProjectCostControlTab
                        projectId={projectId}
                        project={project}
                        wbsItems={wbsItems}
                        transactions={transactions}
                        onNavigateTab={onTabChange}
                     />;
            case 'planeamento-multinivel':
              return <ProjectMultiLevelPlanning
                        projectId={projectId}
                        project={project}
                        wbsItems={wbsItems}
                        onNavigateTab={onTabChange}
                     />;
            case 'encerramento':
              return <ProjectClosingTab
                        projectId={projectId}
                        project={project}
                        onNavigateTab={onTabChange}
                     />;
            case 'fiscalizacao':
              return <div className="p-4"><ProjectFiscalizacaoTab projectId={projectId} project={project} onNavigateTab={onTabChange} /></div>;
            case 'energia':
              return <EnergyTab projectId={projectId} userRole={userRole} />;
            case 'daily-dashboard':
                return <DailyDashboardTab 
                    projectId={projectId}
                    onTabChange={onTabChange}
                />;
            case 'engineering':
                return <EngineeringTab projectId={projectId} userRole={userRole} onFvsSelect={onFvsSelect} teamMembers={team} />;
            case 'mineração':
                return <MiningTab projectId={projectId} userRole={userRole} project={project} />;
            case 'estrada':
                return <div className="p-4"><RoadInfrastructureTab projectId={projectId} userRole={userRole} project={project} /></div>;
            case 'sites':
                return <div className="p-4"><SitesTab projectId={projectId} userRole={userRole} /></div>;
            case 'analysis':
              return <AnalysisTab projectId={projectId} />;
            case 'pendencias':
              return <AnnotationList
                  projectId={projectId}
                  team={team}
                  selectedAnnotationId={selectedAnnotationId}
                  onAnnotationSelect={onAnnotationSelect}
                  initialCoords={viewerCoords}
                  onCoordsClear={onCoordsClear}
              />;
            case 'daily-reports':
              return <DailyReportTab projectId={projectId} userRole={userRole}/>;
            case 'hseq':
              return <HseqTab projectId={projectId} userRole={userRole} teamMembers={team} />;
            case 'risks':
              return <div className="p-4"><RiskManagementTab projectId={projectId} userRole={userRole} teamMembers={team} /></div>;
            case 'comunicacao':
              return <FormalCommunicationTab projectId={projectId} teamMembers={team} userRole={userRole} />;
            case 'fvs-checklists':
              return <div className="p-4"><FvsTab content={selectedFvsContent} /></div>;
            case 'legal':
              return <LegalTab projectId={projectId} userRole={userRole} />;
            case 'change-requests':
                return <div className="p-4"><ChangeManagementTab projectId={projectId} userRole={userRole} /></div>;
            case 'requirements':
              return <div className="p-4"><RequirementsTab projectId={projectId} userRole={userRole} onFvsSelect={onFvsSelect}/></div>;
            case 'wbs':
              return <div className="p-4"><WbsComponent projectId={projectId} project={project} userRole={userRole} /></div>;
            case 'cronograma':
              return <ScheduleTab projectId={projectId} userRole={userRole} />;
            case 'finance':
                return <div className="p-4"><FinanceTab projectId={projectId} userRole={userRole} /></div>;
            case 'compras':
                return <ProcurementTab projectId={projectId} userRole={userRole} />;
            case 'post-construction':
              return <PostConstructionTab projectId={projectId} project={project} userRole={userRole} teamMembers={team} />;
            case 'concrete-pour':
              return <div className="p-4"><ConcretePourTab projectId={projectId} /></div>;
            case 'reinforcement-inspection':
              return <div className="p-4"><ReinforcementInspectionTab projectId={projectId} /></div>;
            case 'formwork-control':
              return <div className="p-4"><FormworkControlTab projectId={projectId} /></div>;
            case 'subcontractor-management':
              return <div className="p-4"><SubcontractorManagementTab projectId={projectId} /></div>;
            case 'measurement-certificates':
              return <div className="p-4"><MeasurementCertificatesTab projectId={projectId} project={project} /></div>;
            case 'materials-control':
              return <div className="p-4"><MaterialsControlTab projectId={projectId} /></div>;
            case 'quality-plan':
              return <div className="p-4"><QualityPlanTab projectId={projectId} /></div>;
            case 'workforce':
                return <div className="p-4"><WorkforceManagementTab projectId={projectId} userRole={userRole} /></div>;
            case 'equipment':
                return <div className="p-4"><EquipmentMainTab projectId={projectId} userRole={userRole} /></div>;
            case 'capacity-analysis':
              return <div className="p-4"><CapacityAnalysisTab projectId={projectId} /></div>;
            case 'team':
              return <div className="p-4"><TeamManagement projectId={projectId} userRole={userRole} /></div>;
            case 'settings':
              return <div className="p-4"><ProjectSettingsTab projectId={projectId} userRole={userRole}/></div>;
            case 'motores-operacionais':
              return <div className="p-4"><EnginesOrchestratorTab projectId={projectId} project={project} wbsItems={wbsItems} transactions={transactions} userRole={userRole || undefined} /></div>;
            case 'relatorios':
              return <div className="p-4"><ReportsHubTab projectId={projectId} project={project} wbsItems={wbsItems} transactions={transactions} userRole={userRole || undefined} /></div>;
            default:
              return <ProjectDashboardTab 
                        projectId={projectId}
                        projectName={project.name} 
                        projectProgress={project.progress || 0}
                        wbsItems={wbsItems}
                        transactions={transactions}
                        project={project}
                        onNavigateTab={onTabChange}
                    />;
      }
    };

    return <TooltipProvider>{renderContent()}</TooltipProvider>;
}
