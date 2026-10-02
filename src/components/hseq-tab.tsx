'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UserRole, TeamMember } from '@/app/projects/[id]/page';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Loader2 } from 'lucide-react';

const LoadingComponent = () => <div className="flex h-64 w-full items-center justify-center bg-secondary"><Loader2 className="h-8 w-8 animate-spin" /></div>;

const HseqIncidentsTab = dynamic(() => import('./hseq-incidents-tab'), { loading: LoadingComponent });
const HseqAuditsTab = dynamic(() => import('./hseq-audits-tab'), { loading: LoadingComponent });
const HseqQualityTab = dynamic(() => import('./hseq-quality-tab'), { loading: LoadingComponent });
const HseqSafetyAnalysisTab = dynamic(() => import('./hseq-safety-analysis-tab'), { loading: LoadingComponent });

interface HseqTabProps {
    projectId: string;
    userRole: UserRole | null;
    teamMembers: TeamMember[];
}

export default function HseqTab({ projectId, userRole, teamMembers }: HseqTabProps) {
    return (
        <div className="p-4">
            <Tabs defaultValue="incidents">
                <ScrollArea className="w-full whitespace-nowrap">
                    <TabsList>
                        <TabsTrigger value="incidents">Incidentes</TabsTrigger>
                        <TabsTrigger value="audits">Auditorias</TabsTrigger>
                        <TabsTrigger value="quality">Controlo de Qualidade</TabsTrigger>
                        <TabsTrigger value="safety-analysis">Análise de Segurança IA</TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <TabsContent value="incidents">
                    <HseqIncidentsTab projectId={projectId} userRole={userRole} teamMembers={teamMembers} />
                </TabsContent>
                <TabsContent value="audits">
                    <HseqAuditsTab projectId={projectId} userRole={userRole} />
                </TabsContent>
                <TabsContent value="quality">
                    <HseqQualityTab projectId={projectId} userRole={userRole} />
                </TabsContent>
                 <TabsContent value="safety-analysis">
                    <HseqSafetyAnalysisTab projectId={projectId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
