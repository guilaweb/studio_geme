'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UserRole } from '@/app/projects/[id]/page';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Loader2 } from 'lucide-react';
import type { WorkforceMember } from '@/types/workforce';
import { Timestamp } from 'firebase/firestore';

const LoadingComponent = () => <div className="flex h-64 w-full items-center justify-center bg-secondary"><Loader2 className="h-8 w-8 animate-spin" /></div>;

const ProjectWorkforceTab = dynamic(() => import('./project-workforce-tab'), { loading: LoadingComponent });
const PayrollSummaryTab = dynamic(() => import('./payroll-summary-tab'), { loading: LoadingComponent });
const PerformanceTab = dynamic(() => import('./performance-tab'), { loading: LoadingComponent });
const CapacityAnalysisTab = dynamic(() => import('./capacity-analysis-tab'), { loading: LoadingComponent });
const PlannerView = dynamic(() => import('@/components/hr/planner-view'), { loading: LoadingComponent });
const TrainingMatrixTab = dynamic(() => import('@/components/hr/training-matrix-tab'), { loading: LoadingComponent });
const LeaveRequestsTab = dynamic(() => import('@/components/hr/leave-requests-tab'), { loading: LoadingComponent });

interface WorkforceManagementTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function WorkforceManagementTab({ projectId, userRole }: WorkforceManagementTabProps) {
    const isManagerOrAdmin = userRole ? (userRole === 'Gestor' || userRole === 'Editor' || (userRole as string) === 'super-admin') : true;

    const [workforce, setWorkforce] = useState<WorkforceMember[]>([]);
    const [loadingWorkforce, setLoadingWorkforce] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'workforce'), where('status', '==', 'Ativo'), orderBy('name', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
            if (!snap.empty) {
                setWorkforce(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkforceMember)));
            } else {
                setWorkforce([]);
            }
            setLoadingWorkforce(false);
        }, (err) => {
            console.error('Could not load global workforce:', err);
            setWorkforce([]);
            setLoadingWorkforce(false);
        });
        return () => unsub();
    }, []);

    return (
        <Tabs defaultValue="project-workforce" className="w-full">
            <ScrollArea className="w-full whitespace-nowrap">
                <TabsList>
                    <TabsTrigger value="project-workforce">Equipa do Projeto</TabsTrigger>
                     {isManagerOrAdmin && (
                      <>
                        <TabsTrigger value="planner">Escala &amp; Calendário</TabsTrigger>
                        <TabsTrigger value="training">Formação &amp; Cert.</TabsTrigger>
                        <TabsTrigger value="leaves">Ausências</TabsTrigger>
                        <TabsTrigger value="payroll">Processamento de Salários</TabsTrigger>
                        <TabsTrigger value="performance">Desempenho</TabsTrigger>
                        <TabsTrigger value="capacity-analysis">Capacidade</TabsTrigger>
                      </>
                    )}
                </TabsList>
                 <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <TabsContent value="project-workforce">
                <div className="pt-4">
                    <ProjectWorkforceTab projectId={projectId} userRole={userRole} />
                </div>
            </TabsContent>
            {isManagerOrAdmin && (
              <>
                <TabsContent value="planner">
                    <div className="pt-4">
                        <PlannerView />
                    </div>
                </TabsContent>
                <TabsContent value="training">
                    <div className="pt-4">
                        <TrainingMatrixTab workforce={workforce} loading={loadingWorkforce} />
                    </div>
                </TabsContent>
                <TabsContent value="leaves">
                    <div className="pt-4">
                        <LeaveRequestsTab userRole={userRole} />
                    </div>
                </TabsContent>
                <TabsContent value="payroll">
                    <div className="pt-4">
                        <PayrollSummaryTab projectId={projectId} userRole={userRole} />
                    </div>
                </TabsContent>
                <TabsContent value="performance">
                    <div className="pt-4">
                        <PerformanceTab projectId={projectId} />
                    </div>
                </TabsContent>
                <TabsContent value="capacity-analysis">
                    <div className="pt-4">
                        <CapacityAnalysisTab projectId={projectId} />
                    </div>
                </TabsContent>
              </>
            )}
        </Tabs>
    );
}
