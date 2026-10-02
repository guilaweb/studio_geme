

'use client';

import { useEffect, useState, useMemo, useRef, type ChangeEvent } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { collection, doc, onSnapshot, query, orderBy, getDocs, getDoc, type Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/hooks/use-auth';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bot, FileSignature, FileText } from 'lucide-react';
import { ProjectChatbot } from '@/components/project-chatbot';
import type { SectionPlane } from '@xeokit/xeokit-sdk';
import { ProjectMenu } from '@/components/project-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import dynamic from 'next/dynamic';

import type { Project, Annotation, Comment, TeamMember, UserRole, AnnotationType, AnnotationPriority } from '@/types/project';
import type { WbsItem } from '@/types/wbs';
import type { Transaction } from '@/types/finance';
import type { ProjectFile } from '@/types/documents';
import { OnboardingTourSpotlight } from '@/components/onboarding/onboarding-tour-spotlight';
import { ContextualHelpTrigger } from '@/components/onboarding/contextual-help-trigger';
import { RoleViewSwitcher, type ActiveViewMode } from '@/components/views/role-view-switcher';
import { FieldOperationView } from '@/components/views/field-operation-view';
import { CostEngineerView } from '@/components/views/cost-engineer-view';
import { ExecutiveCockpitView } from '@/components/views/executive-cockpit-view';
import { MeasurementWizardModal } from '@/components/wizards/measurement-wizard-modal';
import { ProjectCommandCenterHeader } from '@/components/project/project-command-center-header';
import { ProjectMobileHeader } from '@/components/project/project-mobile-header';
import { safeParseDate } from '@/lib/date-utils';

export type { Annotation, Comment, TeamMember, UserRole, AnnotationType, AnnotationPriority };

const ProjectTabContent = dynamic(() => import('@/components/project-tab-content').then(mod => mod.ProjectTabContent), {
    loading: () => <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>,
    ssr: false,
});


export default function ProjectDetailsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  
  const [viewerCoords, setViewerCoords] = useState<{x:number, y:number, z:number} | null>(null);

  const [selectedFvsContent, setSelectedFvsContent] = useState<string | null>(null);
  const [selectedFvsFile, setSelectedFvsFile] = useState<ProjectFile | null>(null);
  const [loadingFvs, setLoadingFvs] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "dashboard");
  
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ActiveViewMode>('full_engineering');
  const [isMeasurementWizardOpen, setIsMeasurementWizardOpen] = useState(false);

  // Carregar persistência do modo de visualização ou definir padrão por perfil / papel / nível de experiência
  useEffect(() => {
    if (typeof window === 'undefined' || !projectId) return;
    const saved = localStorage.getItem(`profundidade_view_mode_${projectId}`) as ActiveViewMode | null;
    const globalExpMode = localStorage.getItem('profundidade_experience_mode');

    if (saved) {
      setViewMode(saved);
    } else if (globalExpMode === 'basic') {
      setViewMode('field_operation');
    } else if (globalExpMode === 'advanced') {
      setViewMode('executive_cockpit');
    } else if (user?.defaultViewMode) {
      setViewMode(user.defaultViewMode as ActiveViewMode);
    } else if (userRole === 'Mestre de Obra' || (user?.role as string) === 'Apontador de Campo') {
      setViewMode('field_operation');
    }

    // Ouvir comandos rápidos da busca universal ou atalhos
    const handleGlobalAction = (e: Event) => {
      const custom = e as CustomEvent;
      const action = custom.detail;
      if (action === 'open_measurement_wizard') {
        setIsMeasurementWizardOpen(true);
      } else if (action === 'open_daily_report' || action === 'open_fuel_log' || action === 'open_photo_incident' || action === 'open_measurement' || action === 'open_measure' || action === 'open_field_measurement') {
        setViewMode('field_operation');
      } else if (action === 'open_wbs_add_task') {
        setViewMode('full_engineering');
        setActiveTab('wbs');
      } else if (action === 'open_purchase_order') {
        setViewMode('full_engineering');
        setActiveTab('compras');
      } else if (action === 'open_equipment_allocation') {
        setViewMode('full_engineering');
        setActiveTab('equipment');
      } else if (action === 'open_document_upload') {
        setViewMode('full_engineering');
        setActiveTab('relatorios');
      } else if (action === 'open_chatbot') {
        setIsChatbotOpen(true);
      }
    };

    // Ouvir alteração global do modo de complexidade (Básico / Profissional / Avançado)
    const handleExpModeChange = (e: Event) => {
      const custom = e as CustomEvent<{ mode: 'basic' | 'professional' | 'advanced' }>;
      if (custom.detail?.mode === 'basic') {
        setViewMode('field_operation');
      } else if (custom.detail?.mode === 'professional') {
        setViewMode('full_engineering');
      } else if (custom.detail?.mode === 'advanced') {
        setViewMode('executive_cockpit');
      }
    };

    // Ouvir comandos de troca de aba contextual vindos do cabeçalho móvel ou barra inferior
    const handleSwitchProjectTab = (e: Event) => {
      const custom = e as CustomEvent<{ tab: string; viewMode?: ActiveViewMode }>;
      if (custom.detail?.tab) {
        if (custom.detail.tab === 'field_action_wizard') {
          setIsMeasurementWizardOpen(true);
          return;
        }
        setViewMode(custom.detail.viewMode || 'full_engineering');
        setActiveTab(custom.detail.tab);
      }
    };

    window.addEventListener('profundidade_run_action', handleGlobalAction);
    window.addEventListener('profundidade_experience_mode_change', handleExpModeChange);
    window.addEventListener('profundidade_switch_project_tab', handleSwitchProjectTab);

    const paramAction = searchParams.get('action');
    if (paramAction) {
      setTimeout(() => {
        handleGlobalAction(new CustomEvent('profundidade_run_action', { detail: paramAction }));
      }, 200);
    }

    return () => {
      window.removeEventListener('profundidade_run_action', handleGlobalAction);
      window.removeEventListener('profundidade_experience_mode_change', handleExpModeChange);
      window.removeEventListener('profundidade_switch_project_tab', handleSwitchProjectTab);
    };
  }, [projectId, userRole, user?.defaultViewMode, user?.role, searchParams]);

  // Notificar a barra de navegação inferior quando a aba ativa mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('profundidade_project_tab_changed', { detail: { tab: activeTab } }));
    }
  }, [activeTab]);


  // Fetch project and core subcollections
  useEffect(() => {
    if (!projectId) return;

    setLoadingProject(true);

    const projectDocRef = doc(db, 'projects', projectId);
    const wbsQuery = query(collection(db, 'projects', projectId, 'wbs'));
    const transactionsQuery = query(collection(db, 'projects', projectId, 'transactions'));

    const unsubscribes: (() => void)[] = [];
    const loaders = {
      project: true,
      wbs: true,
      transactions: true,
    };

    const updateLoadingState = () => {
      if (Object.values(loaders).every(loaded => !loaded)) {
        setLoadingProject(false);
      }
    };
    
    unsubscribes.push(onSnapshot(projectDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const projectData = { 
            id: docSnapshot.id, 
            ...data,
            startDate: safeParseDate(data.startDate) || undefined,
            endDate: safeParseDate(data.endDate) || undefined,
            contractStartDate: safeParseDate(data.contractStartDate) || undefined,
            contractEndDate: safeParseDate(data.contractEndDate) || undefined,
            actualStartDate: safeParseDate(data.actualStartDate) || undefined,
            actualEndDate: safeParseDate(data.actualEndDate) || undefined,
        } as Project;
        setProject(projectData);
      } else {
        setProject(null);
      }
      loaders.project = false;
      updateLoadingState();
    }, (error) => {
      console.error('Erro ao carregar projeto:', error);
      setProject(null);
      loaders.project = false;
      updateLoadingState();
    }));

    unsubscribes.push(onSnapshot(wbsQuery, (snapshot) => {
      if (!snapshot.empty) {
        setWbsItems(snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              startDate: safeParseDate(data.startDate) || undefined,
              endDate: safeParseDate(data.endDate) || undefined,
              baselineStartDate: safeParseDate(data.baselineStartDate) || undefined,
              baselineEndDate: safeParseDate(data.baselineEndDate) || undefined,
            } as WbsItem;
        }));
      } else {
        setWbsItems([]);
      }
      loaders.wbs = false;
      updateLoadingState();
    }, (error) => {
        console.error('Erro ao carregar WBS:', error);
        setWbsItems([]);
        loaders.wbs = false;
        updateLoadingState();
    }));
    
    unsubscribes.push(onSnapshot(transactionsQuery, (snapshot) => {
      if (!snapshot.empty) {
        setTransactions(snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: data.date?.toDate(),
            } as Transaction;
        }));
      } else {
        setTransactions([]);
      }
      loaders.transactions = false;
      updateLoadingState();
    }, (error) => {
        console.error('Erro ao carregar transações:', error);
        setTransactions([]);
        loaders.transactions = false;
        updateLoadingState();
    }));

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [projectId, toast]);
  
  // Fetch team members
  useEffect(() => {
    if (!projectId || !project?.ownerId) return;

    const teamQuery = query(collection(db, 'projects', projectId, 'team'));
    const unsubscribeTeam = onSnapshot(teamQuery, (snapshot) => {
        const teamList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as TeamMember));
        
        getDoc(doc(db, 'users', project.ownerId)).then(ownerDoc => {
             if (ownerDoc.exists() && !teamList.some(member => member.uid === project.ownerId)) {
                  const ownerData = ownerDoc.data();
                  teamList.push({ 
                    uid: project.ownerId, 
                    displayName: ownerData.displayName,
                    email: ownerData.email,
                    role: 'Gestor'
                  });
             }
             setTeam(teamList);
        });
    });

    return () => {
        unsubscribeTeam();
    }
  }, [projectId, project?.ownerId]);
  
  // Fetch user role for the project
  useEffect(() => {
    if (!user || !project) return;
    
    if (user.uid === project.ownerId) {
        setUserRole('Gestor');
        return;
    }
    
    const teamMemberDocRef = doc(db, 'projects', projectId, 'team', user.uid);
    const unsubscribe = onSnapshot(teamMemberDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            setUserRole(docSnapshot.data().role as UserRole);
        } else {
            setUserRole('Leitor');
        }
    });

    return () => unsubscribe();
  }, [user, project, projectId]);

  const kpiSummary = useMemo(() => {
    if (!project) return { spi: 1.0, cpi: 1.0, physicalProgress: 0, financialProgress: 0, remainingDays: 0 };
    const approvedBudget = project.approvedBudget || project.budget || wbsItems.reduce((acc, i) => acc + (i.budget || 0), 0);
    const actualCost = transactions.filter(t => t.type === 'Despesa').reduce((acc, t) => acc + t.amount, 0);
    const totalWeight = wbsItems.filter(i => !i.parentId).reduce((acc, i) => acc + (i.weight || 1), 0) || 1;
    const weightedProgress = wbsItems.filter(i => !i.parentId).reduce((acc, i) => acc + ((i.progress || 0) * (i.weight || 1)), 0) / totalWeight;
    const physicalProgress = project.progress || Math.round(weightedProgress);
    const financialProgress = approvedBudget > 0 ? Math.min(100, Math.round((actualCost / approvedBudget) * 100)) : 0;
    
    const now = new Date();
    const start = project.contractStartDate || project.startDate || now;
    const end = project.contractEndDate || project.endDate || new Date(now.getTime() + 90 * 86400000);
    const totalDays = Math.max(1, (new Date(end).getTime() - new Date(start).getTime()) / 86400000);
    const elapsedDays = Math.max(0, (now.getTime() - new Date(start).getTime()) / 86400000);
    const remainingDays = Math.max(0, Math.round((new Date(end).getTime() - now.getTime()) / 86400000));
    const scheduleProgress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

    const plannedValue = approvedBudget * (scheduleProgress / 100);
    const earnedValue = approvedBudget * (physicalProgress / 100);
    const spi = plannedValue > 0 ? earnedValue / plannedValue : 1.0;
    const cpi = actualCost > 0 ? earnedValue / actualCost : 1.0;

    return { spi, cpi, physicalProgress, financialProgress, remainingDays };
  }, [project, wbsItems, transactions]);

  const onAnnotationSelect = (annotationId: string) => {
    setActiveTab('pendencias'); // Switch to annotation tab when a marker is selected from the viewer
    setSelectedAnnotationId(prevId => (prevId === annotationId ? null : annotationId));
  };
  
  const onFvsSelect = async (file: ProjectFile) => {
    setActiveTab("fvs-checklists");
    setLoadingFvs(true);
    setSelectedFvsContent(null);
    setSelectedFvsFile(null);
    try {
        const response = await fetch(file.versions.find(v => v.version === file.latestVersion)?.url || '');
        if (!response.ok) throw new Error('Failed to fetch file content');
        const text = await response.text();
        setSelectedFvsContent(text);
        setSelectedFvsFile(file);
        toast({ title: `Template "${file.name}" carregado!` });
    } catch (error) {
        console.error("Error loading FVS template:", error);
        toast({ title: 'Erro ao carregar template', variant: 'destructive' });
        setSelectedFvsContent('Erro ao carregar conteúdo.');
    } finally {
        setLoadingFvs(false);
    }
  };


  if (authLoading || loadingProject) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>A carregar projeto...</span>
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold">Projeto Não Encontrado</h2>
          <p className="text-muted-foreground mt-2">O projeto que você está procurando não existe ou você não tem permissão para acessá-lo.</p>
        </main>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-background">
      <Header projectName={project.name} />
      <main className="flex flex-1 flex-col overflow-hidden relative">
        <Sheet open={isChatbotOpen} onOpenChange={setIsChatbotOpen}>
            <SheetContent className="w-full max-w-lg p-0">
                <SheetHeader className="p-6 pb-2">
                    <SheetTitle>Assistente de Projeto IA</SheetTitle>
                    <SheetDescription>Faça perguntas sobre a EAP, finanças ou equipa deste projeto.</SheetDescription>
                </SheetHeader>
                <ProjectChatbot 
                  projectId={projectId} 
                  onOpenMeasurementWizard={() => {
                    setIsChatbotOpen(false);
                    setIsMeasurementWizardOpen(true);
                  }}
                  onNavigateTab={(t) => {
                    setIsChatbotOpen(false);
                    setViewMode('full_engineering');
                    setActiveTab(t);
                  }}
                />
            </SheetContent>
        </Sheet>
        
        {/* Barra Superior de Controlo Operacional & Seletor de Modo (Desktop/Tablet) */}
        <div className="hidden md:flex border-b flex-wrap justify-between items-center px-3 py-1.5 gap-2 bg-slate-50/50 dark:bg-slate-900/50">
            {viewMode === 'full_engineering' ? (
                <ProjectMenu onMenuSelect={setActiveTab} userRole={userRole} projectType={project.type} activeTab={activeTab} />
            ) : (
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground py-1">
                    <span className="text-muted-foreground">Obra:</span>
                    <span>{project.name}</span>
                </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMeasurementWizardOpen(true)}
                    className="h-7 text-xs gap-1.5 border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-medium"
                >
                    <FileSignature className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Auto de Medição</span> (Wizard)
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setViewMode('full_engineering');
                        setActiveTab('relatorios');
                    }}
                    className="h-7 text-xs gap-1.5 border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium"
                >
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                    <span>Gerar Relatório</span>
                </Button>

                <RoleViewSwitcher
                    currentMode={viewMode}
                    onModeChange={(mode) => {
                        setViewMode(mode);
                        if (typeof window !== 'undefined') {
                            localStorage.setItem(`profundidade_view_mode_${projectId}`, mode);
                        }
                    }}
                    userRoleName={userRole}
                />
            </div>
        </div>

        {/* Centro de Comando Executivo & Ciclo de Vida (Desktop/Tablet) */}
        {project && (
          <div className="hidden md:block">
            <ProjectCommandCenterHeader
              project={project}
              projectId={projectId}
              activeTab={activeTab}
              onNavigateTab={(tab) => {
                setViewMode('full_engineering');
                setActiveTab(tab);
              }}
              physicalProgress={kpiSummary.physicalProgress}
              financialProgress={kpiSummary.financialProgress}
              spi={kpiSummary.spi}
              cpi={kpiSummary.cpi}
              daysRemaining={kpiSummary.remainingDays}
              wbsItems={wbsItems}
            />
          </div>
        )}
        
        {/* Área Principal com Renderização Condicional por Perspetiva (com scroll vertical fluido e padding para MobileBottomNav) */}
        <div className="flex-1 overflow-y-auto pb-28 md:pb-6">
            {/* Cabeçalho de Métricas, Ações de Campo e Abas (Mobile First: agora móvel/scrollável com o conteúdo) */}
            {project && (
              <ProjectMobileHeader
                project={project}
                activeTab={activeTab}
                onTabChange={(tabId) => {
                  setViewMode('full_engineering');
                  setActiveTab(tabId);
                }}
                wbsItems={wbsItems}
                onOpenQuickFieldAction={(action) => {
                  if (action === 'daily') {
                    setViewMode('full_engineering');
                    setActiveTab('daily-report');
                  } else if (action === 'measure') {
                    setIsMeasurementWizardOpen(true);
                  } else if (action === 'incident') {
                    setViewMode('full_engineering');
                    setActiveTab('riscos');
                  } else if (action === 'photo') {
                    setViewMode('field_operation');
                  }
                }}
              />
            )}

            {viewMode === 'field_operation' && (
                <FieldOperationView
                    projectId={projectId}
                    projectName={project.name}
                    onSwitchToFullView={() => {
                        setViewMode('full_engineering');
                        if (typeof window !== 'undefined') {
                            localStorage.setItem(`profundidade_view_mode_${projectId}`, 'full_engineering');
                        }
                    }}
                />
            )}

            {viewMode === 'cost_engineer' && (
                <CostEngineerView
                    projectId={projectId}
                    project={project}
                    onNavigateToTab={(t) => {
                        setViewMode('full_engineering');
                        setActiveTab(t);
                    }}
                />
            )}

            {viewMode === 'executive_cockpit' && (
                <ExecutiveCockpitView
                    projectId={projectId}
                    project={project}
                    onNavigateToTab={(t) => {
                        setViewMode('full_engineering');
                        setActiveTab(t);
                    }}
                />
            )}

            {viewMode === 'full_engineering' && (
                <ProjectTabContent
                    activeTab={activeTab}
                    projectId={projectId}
                    project={project}
                    wbsItems={wbsItems}
                    transactions={transactions}
                    team={team}
                    userRole={userRole}
                    onFvsSelect={onFvsSelect}
                    user={user}
                    viewerCoords={viewerCoords}
                    onCoordsClear={() => setViewerCoords(null)}
                    selectedAnnotationId={selectedAnnotationId}
                    onAnnotationSelect={onAnnotationSelect}
                    loadingFvs={loadingFvs}
                    selectedFvsContent={selectedFvsContent}
                    selectedFvsFile={selectedFvsFile}
                    onTabChange={setActiveTab}
                />
            )}
        </div>

        {/* Wizard Modal de Medição */}
        <MeasurementWizardModal
            open={isMeasurementWizardOpen}
            onOpenChange={setIsMeasurementWizardOpen}
            projectId={projectId}
            project={project}
        />

        <div className="absolute bottom-6 right-6 z-30">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button onClick={() => setIsChatbotOpen(true)} size="icon" className="h-16 w-16 rounded-full shadow-lg">
                            <Bot className="h-8 w-8" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Assistente de Projeto IA</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>

        {/* Camada de Visitas Guiadas & Assistência Contextual */}
        <OnboardingTourSpotlight />
        <ContextualHelpTrigger className="bottom-24 right-6" />
      </main>
    </div>
  );
}
