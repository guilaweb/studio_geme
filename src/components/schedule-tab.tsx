
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from 'lucide-react';
import type { UserRole } from '@/app/projects/[id]/page';
import { ScrollArea, ScrollBar } from './ui/scroll-area';

const LoadingComponent = () => <div className="flex h-64 w-full items-center justify-center bg-secondary"><Loader2 className="h-8 w-8 animate-spin" /></div>;

const GanttChart = dynamic(() => import('./gantt-chart'), { loading: LoadingComponent });
const ScheduleCalendar = dynamic(() => import('./schedule-calendar'), { loading: LoadingComponent });
const TaskBoardView = dynamic(() => import('./task-board-view'), { loading: LoadingComponent });
const ResourceTimelineView = dynamic(() => import('./resource-timeline-view'), { loading: LoadingComponent });

interface ScheduleTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function ScheduleTab({ projectId, userRole }: ScheduleTabProps) {
    return (
        <div className="p-4">
            <Tabs defaultValue="gantt">
                 <ScrollArea className="w-full whitespace-nowrap">
                    <TabsList>
                        <TabsTrigger value="gantt">Gráfico de Gantt</TabsTrigger>
                        <TabsTrigger value="board">Quadro de Tarefas</TabsTrigger>
                        <TabsTrigger value="calendar">Calendário</TabsTrigger>
                        <TabsTrigger value="resources">Linha de Tempo de Recursos</TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <TabsContent value="gantt">
                    <GanttChart projectId={projectId} userRole={userRole} />
                </TabsContent>
                <TabsContent value="board">
                    <div className="pt-4">
                        <TaskBoardView projectId={projectId} userRole={userRole} />
                    </div>
                </TabsContent>
                <TabsContent value="calendar">
                    <div className="pt-4">
                        <ScheduleCalendar projectId={projectId} />
                    </div>
                </TabsContent>
                <TabsContent value="resources">
                    <div className="pt-4">
                        <ResourceTimelineView projectId={projectId} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
