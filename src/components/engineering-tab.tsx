
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, Box, Layers, Map, FlaskConical, MessageSquare, GitBranch } from 'lucide-react';
import type { ProjectFile } from '@/types/documents';
import type { UserRole, TeamMember } from '@/app/projects/[id]/page';

const LoadingComponent = () => <div className="flex h-64 w-full items-center justify-center bg-secondary"><Loader2 className="h-8 w-8 animate-spin" /></div>;

// Dynamic imports for each tab content
const DocumentsTab = dynamic(() => import('./documents-tab'), { loading: LoadingComponent });
const TopographyTab = dynamic(() => import('./topography-tab'), { loading: LoadingComponent });
const BimTab = dynamic(() => import('@/components/bim-tab'), { ssr: false, loading: LoadingComponent });
const ClashDetectionTab = dynamic(() => import('@/components/clash-detection-tab'), { ssr: false, loading: LoadingComponent });
const ConcretePourTab = dynamic(() => import('@/components/concrete-pour-tab'), { ssr: false, loading: LoadingComponent });
const DrawingRegisterTab = dynamic(() => import('@/components/drawing-register-tab'), { ssr: false, loading: LoadingComponent });
const RfiManagementTab = dynamic(() => import('@/components/rfi-management-tab'), { ssr: false, loading: LoadingComponent });

interface EngineeringTabProps {
    projectId: string;
    userRole: UserRole | null;
    onFvsSelect: (file: ProjectFile) => void;
    teamMembers: TeamMember[];
}

export default function EngineeringTab({ projectId, userRole, onFvsSelect, teamMembers }: EngineeringTabProps) {
    return (
        <div className="p-4">
            <Tabs defaultValue="documents">
                <TabsList className="grid w-full grid-cols-7 h-auto">
                    <TabsTrigger value="documents" className="flex items-center gap-1.5 text-xs py-2">
                        <FileText className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Documentos</span>
                        <span className="sm:hidden">Docs.</span>
                    </TabsTrigger>
                    <TabsTrigger value="drawings" className="flex items-center gap-1.5 text-xs py-2">
                        <GitBranch className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Peças Desenhadas</span>
                        <span className="sm:hidden">Peças</span>
                    </TabsTrigger>
                    <TabsTrigger value="rfis" className="flex items-center gap-1.5 text-xs py-2">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>RFIs</span>
                    </TabsTrigger>
                    <TabsTrigger value="bim" className="flex items-center gap-1.5 text-xs py-2">
                        <Box className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Visualizador BIM</span>
                        <span className="sm:hidden">BIM</span>
                    </TabsTrigger>
                    <TabsTrigger value="clash" className="flex items-center gap-1.5 text-xs py-2">
                        <Layers className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Compatibilização</span>
                        <span className="sm:hidden">Clash</span>
                    </TabsTrigger>
                    <TabsTrigger value="topography" className="flex items-center gap-1.5 text-xs py-2">
                        <Map className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Topografia</span>
                        <span className="sm:hidden">Topo.</span>
                    </TabsTrigger>
                    <TabsTrigger value="concrete" className="flex items-center gap-1.5 text-xs py-2">
                        <FlaskConical className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Betão & Ensaios</span>
                        <span className="sm:hidden">Betão</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="documents">
                    <DocumentsTab projectId={projectId} userRole={userRole} onFvsSelect={onFvsSelect} />
                </TabsContent>

                <TabsContent value="drawings">
                    <DrawingRegisterTab projectId={projectId} />
                </TabsContent>

                <TabsContent value="rfis">
                    <RfiManagementTab projectId={projectId} />
                </TabsContent>

                <TabsContent value="bim">
                    <BimTab projectId={projectId} />
                </TabsContent>

                <TabsContent value="clash">
                    <ClashDetectionTab projectId={projectId} teamMembers={teamMembers} />
                </TabsContent>

                <TabsContent value="topography">
                    <TopographyTab projectId={projectId} userRole={userRole} />
                </TabsContent>

                <TabsContent value="concrete">
                    <div className="pt-2">
                        <ConcretePourTab projectId={projectId} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
