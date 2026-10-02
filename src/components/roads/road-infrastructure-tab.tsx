'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Route, Shovel, FlaskConical, Waves, Layers, CalendarRange, Map } from 'lucide-react';
import type { UserRole } from '@/app/projects/[id]/page';
import type { Project } from '@/types/project';

const LoadingComponent = () => (
  <div className="flex h-64 w-full items-center justify-center bg-secondary/30 rounded-xl">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Dynamic imports for sub-tabs
const RoadSectionsTab = dynamic(() => import('./road-sections-tab'), { loading: LoadingComponent });
const LinearPlanningTab = dynamic(() => import('./linear-planning-tab'), { loading: LoadingComponent });
const EarthworkTab = dynamic(() => import('./earthwork-tab'), { loading: LoadingComponent });
const CompactionTestsTab = dynamic(() => import('./compaction-tests-tab'), { loading: LoadingComponent });
const DrainageStructuresTab = dynamic(() => import('./drainage-structures-tab'), { loading: LoadingComponent });
const PavingControlTab = dynamic(() => import('./paving-control-tab'), { loading: LoadingComponent });
const TopographyTab = dynamic(() => import('@/components/topography-tab'), { loading: LoadingComponent });

interface RoadInfrastructureTabProps {
  projectId: string;
  userRole: UserRole | null;
  project?: Project | null;
}

export default function RoadInfrastructureTab({ projectId, userRole }: RoadInfrastructureTabProps) {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider mb-1.5">
            <Route className="h-3 w-3" /> Engenharia Rodoviária & Infraestruturas Lineares
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-headline text-foreground">
            Gestão de Vias, Terraplanagem & Obras de Arte
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Acompanhe a estrada de ponta a ponta: do estaqueamento linear ($Km\ 0+000 \rightarrow Km\ X+XXX$) ao balanço de massas, ensaios Proctor, passagens hidráulicas e aplicação de betão asfáltico.
          </p>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="sections" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 h-auto p-1 bg-muted/60 border rounded-xl gap-1">
          <TabsTrigger value="sections" className="flex items-center gap-1.5 py-2.5 text-xs rounded-lg">
            <Route className="h-3.5 w-3.5" />
            <span>Estaqueamento</span>
          </TabsTrigger>
          <TabsTrigger value="linear-planning" className="flex items-center gap-1.5 py-2.5 text-xs rounded-lg">
            <CalendarRange className="h-3.5 w-3.5" />
            <span>Planeamento Linear</span>
          </TabsTrigger>
          <TabsTrigger value="earthwork" className="flex items-center gap-1.5 py-2.5 text-xs rounded-lg">
            <Shovel className="h-3.5 w-3.5" />
            <span>Terraplanagem</span>
          </TabsTrigger>
          <TabsTrigger value="topography" className="flex items-center gap-1.5 py-2.5 text-xs rounded-lg">
            <Map className="h-3.5 w-3.5" />
            <span>Topografia & MDT</span>
          </TabsTrigger>
          <TabsTrigger value="compaction" className="flex items-center gap-1.5 py-2.5 text-xs rounded-lg">
            <FlaskConical className="h-3.5 w-3.5" />
            <span>Ensaios</span>
          </TabsTrigger>
          <TabsTrigger value="drainage" className="flex items-center gap-1.5 py-2.5 text-xs rounded-lg">
            <Waves className="h-3.5 w-3.5" />
            <span>Obras de Arte</span>
          </TabsTrigger>
          <TabsTrigger value="paving" className="flex items-center gap-1.5 py-2.5 text-xs rounded-lg">
            <Layers className="h-3.5 w-3.5" />
            <span>Pavimentação</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="pt-4">
          <RoadSectionsTab projectId={projectId} userRole={userRole} />
        </TabsContent>

        <TabsContent value="linear-planning" className="pt-4">
          <LinearPlanningTab projectId={projectId} userRole={userRole} />
        </TabsContent>

        <TabsContent value="earthwork" className="pt-4">
          <EarthworkTab projectId={projectId} userRole={userRole} />
        </TabsContent>

        <TabsContent value="topography" className="pt-4">
          <div className="rounded-2xl border bg-card p-1">
            <TopographyTab projectId={projectId} userRole={userRole} />
          </div>
        </TabsContent>

        <TabsContent value="compaction" className="pt-4">
          <CompactionTestsTab projectId={projectId} userRole={userRole} />
        </TabsContent>

        <TabsContent value="drainage" className="pt-4">
          <DrainageStructuresTab projectId={projectId} userRole={userRole} />
        </TabsContent>

        <TabsContent value="paving" className="pt-4">
          <PavingControlTab projectId={projectId} userRole={userRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
