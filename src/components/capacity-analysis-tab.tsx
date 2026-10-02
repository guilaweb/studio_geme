
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AreaChart, User, HelpCircle } from 'lucide-react';
import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Line } from "recharts";
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { eachDayOfInterval, format, differenceInDays, isWithinInterval } from 'date-fns';
import type { WbsItem } from '@/types/wbs';
import type { ProjectWorkforceMember } from '@/types/workforce';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Label } from './ui/label';
import { TooltipProvider, Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';

interface CapacityAnalysisTabProps {
    projectId: string;
}

const DAILY_CAPACITY = 8; // Default capacity in hours per day per person

export default function CapacityAnalysisTab({ projectId }: CapacityAnalysisTabProps) {
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [projectWorkforce, setProjectWorkforce] = useState<ProjectWorkforceMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('all');


    useEffect(() => {
        if (!projectId) return;
        setLoading(true);

        const wbsQuery = query(collection(db, 'projects', projectId, 'wbs'));
        const workforceQuery = query(collection(db, 'projects', projectId, 'workforce'));

        const unsubWbs = onSnapshot(wbsQuery, (snapshot) => {
            setWbsItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, startDate: doc.data().startDate?.toDate(), endDate: doc.data().endDate?.toDate() } as WbsItem)));
        });

        const unsubWorkforce = onSnapshot(workforceQuery, (snapshot) => {
            setProjectWorkforce(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProjectWorkforceMember)));
            setLoading(false);
        });

        return () => {
            unsubWbs();
            unsubWorkforce();
        };
    }, [projectId]);

    const capacityTimelineData = useMemo(() => {
        if (wbsItems.length === 0 || projectWorkforce.length === 0) return [];

        const projectStartDates = wbsItems.map(t => t.startDate).filter(Boolean) as Date[];
        const projectEndDates = wbsItems.map(t => t.endDate).filter(Boolean) as Date[];

        if (projectStartDates.length === 0 || projectEndDates.length === 0) return [];

        const projectStart = new Date(Math.min.apply(null, projectStartDates.map(d => d.getTime())));
        const projectEnd = new Date(Math.max.apply(null, projectEndDates.map(d => d.getTime())));

        if (!isFinite(projectStart.getTime()) || !isFinite(projectEnd.getTime()) || projectStart > projectEnd) return [];

        const timeline = eachDayOfInterval({ start: projectStart, end: projectEnd });

        const membersInScope = selectedMemberId === 'all'
            ? projectWorkforce
            : projectWorkforce.filter(m => m.id === selectedMemberId);

        const data = timeline.map(day => {
            let dailyAllocatedHours = 0;

            membersInScope.forEach(member => {
                wbsItems.forEach(task => {
                    const assignedIds = task.assignedWorkforce || [];
                    if (assignedIds.includes(member.id) && task.startDate && task.endDate && task.effortHours && isWithinInterval(day, { start: task.startDate, end: task.endDate })) {
                        const durationDays = differenceInDays(task.endDate, task.startDate) + 1;
                        const dailyEffortPerTask = durationDays > 0 ? task.effortHours / durationDays : 0;
                        const effortPerMember = assignedIds.length > 0 ? dailyEffortPerTask / assignedIds.length : 0;
                        dailyAllocatedHours += effortPerMember;
                    }
                });
            });

            return {
                date: format(day, 'dd/MM/yy'),
                capacity: membersInScope.length * DAILY_CAPACITY,
                allocated: dailyAllocatedHours,
            };
        });

        return data;
    }, [wbsItems, projectWorkforce, selectedMemberId]);
    
    const chartConfig = {
      capacity: { label: "Capacidade (horas)", color: "hsl(var(--primary))" },
      allocated: { label: "Alocado (horas)", color: "hsl(var(--chart-2))" },
    };


    if (loading) {
        return (
            <div className="p-4 space-y-6 flex justify-center items-center h-full">
                <Loader2 className="animate-spin h-8 w-8" />
            </div>
        );
    }

    return (
        <Card className="mt-4">
            <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between">
                <div>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <AreaChart className="h-5 w-5 text-primary" /> Análise de Capacidade da Equipa
                        </span>
                        <TooltipProvider>
                            <UiTooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">Visualize a alocação de recursos ao longo do tempo para identificar sobrecargas ou ociosidade da equipa.</p>
                                </TooltipContent>
                            </UiTooltip>
                        </TooltipProvider>
                    </CardTitle>
                    <CardDescription>
                        Compare as horas de trabalho alocadas com a capacidade total ao longo do tempo.
                    </CardDescription>
                </div>
                 <div className="w-full md:w-64 space-y-2">
                    <Label htmlFor="member-filter">Filtrar por Membro da Equipa</Label>
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                        <SelectTrigger id="member-filter">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Toda a Equipa</SelectItem>
                            {projectWorkforce.map(member => (
                                <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                {capacityTimelineData.length === 0 ? (
                     <div className="p-8 text-center text-muted-foreground border rounded-lg">
                        <p>Dados insuficientes para a análise.</p>
                        <p className="text-sm">Certifique-se de que tem itens na EAP com datas, horas de esforço e membros da equipa alocados.</p>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
                        <ComposedChart data={capacityTimelineData}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis unit="h" />
                            <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}h`} />} />
                            <Legend />
                            <Bar dataKey="allocated" fill="var(--color-allocated)" radius={4} name="Esforço Alocado" />
                            <Line type="monotone" dataKey="capacity" stroke="var(--color-capacity)" strokeWidth={2} dot={false} name="Capacidade" />
                        </ComposedChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
