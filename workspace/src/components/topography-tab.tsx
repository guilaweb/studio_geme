
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import type { UserRole } from '@/app/projects/[id]/page';

const LoadingComponent = () => <div className="flex h-64 w-full items-center justify-center bg-secondary"><Loader2 className="h-8 w-8 animate-spin" /></div>;

// Dynamically import heavy components
const PointsCloudTab = dynamic(() => import('@/components/points-cloud-tab').then(mod => mod.PointsCloudTab), { loading: LoadingComponent });
const IrradiationsTab = dynamic(() => import('@/components/irradiations-tab'), { loading: LoadingComponent });
const TraverseCalculationTab = dynamic(() => import('@/components/traverse-calculation-tab'), { loading: LoadingComponent });
const AxesManagementTab = dynamic(() => import('@/components/axes-management-tab'), { loading: LoadingComponent });
const LongitudinalProfileTab = dynamic(() => import('@/components/longitudinal-profile-tab'), { loading: LoadingComponent });
const ContourLinesTab = dynamic(() => import('@/components/contour-lines-tab'), { loading: LoadingComponent });
const VolumeCalculationTab = dynamic(() => import('@/components/volume-calculation-tab').then(mod => mod.VolumeCalculationTab), { loading: LoadingComponent });
const IntersectionTab = dynamic(() => import('@/components/intersection-tab'), { loading: LoadingComponent });
const CrossSectionTab = dynamic(() => import('@/components/cross-section-tab'), { loading: LoadingComponent });


interface TopographyTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function TopographyTab({ projectId, userRole }: TopographyTabProps) {

    return (
        <div className="p-4 space-y-6">
            <Tabs defaultValue="points-cloud">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="points-cloud">Nuvem de Pontos & MDT</TabsTrigger>
                    <TabsTrigger value="field-calcs">Cálculos de Campo</TabsTrigger>
                    <TabsTrigger value="modeling">Modelação</TabsTrigger>
                    <TabsTrigger value="volumes">Volumes</TabsTrigger>
                </TabsList>

                <TabsContent value="points-cloud">
                    <PointsCloudTab projectId={projectId} userRole={userRole} />
                </TabsContent>

                <TabsContent value="field-calcs">
                     <Tabs defaultValue="irradiations" className="mt-4">
                        <TabsList className="grid w-full grid-cols-3">
                           <TabsTrigger value="irradiations">Irradiações</TabsTrigger>
                           <TabsTrigger value="traverse">Poligonal</TabsTrigger>
                           <TabsTrigger value="intersection">Interseção</TabsTrigger>
                        </TabsList>
                        <TabsContent value="irradiations">
                            <IrradiationsTab projectId={projectId} userRole={userRole} />
                        </TabsContent>
                        <TabsContent value="traverse">
                            <TraverseCalculationTab projectId={projectId} userRole={userRole} />
                        </TabsContent>
                         <TabsContent value="intersection">
                            <IntersectionTab projectId={projectId} userRole={userRole} />
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                <TabsContent value="modeling">
                    <Tabs defaultValue="axes" className="mt-4">
                        <TabsList className="grid w-full grid-cols-4">
                           <TabsTrigger value="axes">Eixos</TabsTrigger>
                           <TabsTrigger value="longitudinal-profiles">Perfis Longitudinais</TabsTrigger>
                           <TabsTrigger value="cross-sections">Perfis Transversais</TabsTrigger>
                           <TabsTrigger value="contours">Curvas de Nível</TabsTrigger>
                        </TabsList>
                        <TabsContent value="axes">
                            <AxesManagementTab projectId={projectId} userRole={userRole} />
                        </TabsContent>
                        <TabsContent value="longitudinal-profiles">
                            <LongitudinalProfileTab projectId={projectId} userRole={userRole} />
                        </TabsContent>
                        <TabsContent value="cross-sections">
                            <CrossSectionTab projectId={projectId} userRole={userRole} />
                        </TabsContent>
                        <TabsContent value="contours">
                            <ContourLinesTab projectId={projectId} userRole={userRole} />
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                <TabsContent value="volumes">
                    <VolumeCalculationTab projectId={projectId} userRole={userRole} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
