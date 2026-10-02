
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, collectionGroup, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Square } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { addDays, eachDayOfInterval, format, startOfWeek, isWithinInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type LeaveRequest, type WorkforceMember } from '@/types/workforce';
import { WbsItem } from '@/types/wbs';
import { Project } from '@/types/project';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const DAILY_CAPACITY = 8; // hours

interface ProjectWorkforceLink {
    id: string; // doc id from projects/.../workforce
    workforceId: string; // id from global workforce collection
    projectId: string;
}

interface DailyAllocation {
    project: Project;
    hours: number;
}

interface EnrichedLeaveRequest extends LeaveRequest {
    workforceId: string;
}

export default function PlannerView({ projectId }: { projectId?: string } = {}) {
    const { user: authUser, loading: authLoading } = useRequireAuth();
    const [workforce, setWorkforce] = useState<WorkforceMember[]>([]);
    const [wbsItems, setWbsItems] = useState<(WbsItem & { projectId: string })[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectWorkforceLinks, setProjectWorkforceLinks] = useState<ProjectWorkforceLink[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<EnrichedLeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: addDays(new Date(), 30),
    });
    
    const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    useEffect(() => {
        if (authLoading || !authUser) return;
        setLoading(true);

        const unsubWorkforce = onSnapshot(query(collection(db, 'workforce'), where('author.uid', '==', authUser.uid)), (snapshot) => {
            setWorkforce(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkforceMember)));
        });

        const unsubWbs = onSnapshot(collectionGroup(db, 'wbs'), (snapshot) => {
            const items = snapshot.docs.map(doc => {
                 const data = doc.data();
                 return {
                    ...data,
                    id: doc.id,
                    projectId: doc.ref.parent.parent?.id,
                    startDate: data.startDate?.toDate(),
                    endDate: data.endDate?.toDate(),
                } as WbsItem & { projectId: string }
            });
            setWbsItems(items);
        });

        const unsubProjectWorkforce = onSnapshot(collectionGroup(db, 'workforce'), (snapshot) => {
            const links = snapshot.docs
                .filter(doc => !!doc.ref.parent.parent)
                .map(doc => ({
                    id: doc.id,
                    workforceId: doc.data().workforceId,
                    projectId: doc.ref.parent.parent!.id,
                } as ProjectWorkforceLink));
            setProjectWorkforceLinks(links);
        });

        const unsubProjects = onSnapshot(query(collection(db, 'projects'), where('ownerId', '==', authUser.uid)), (snapshot) => {
            setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
        });
        
        const unsubLeave = onSnapshot(query(collectionGroup(db, 'leaveRequests')), (snapshot) => {
            const leaves = snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        id: doc.id,
                        workforceId: doc.ref.parent.parent?.id,
                        startDate: (data.startDate as Timestamp).toDate(),
                        endDate: (data.endDate as Timestamp).toDate(),
                    } as EnrichedLeaveRequest;
                })
                .filter(l => (l as any).status === 'Aprovada'); // filter client-side to avoid composite index
            setLeaveRequests(leaves);
        });


        const timer = setTimeout(() => setLoading(false), 2500);

        return () => {
            unsubWorkforce();
            unsubWbs();
            unsubProjectWorkforce();
            unsubProjects();
            unsubLeave();
            clearTimeout(timer);
        };
    }, [authLoading, authUser]);
    
    const timeline = useMemo(() => {
        if (!dateRange.from || !dateRange.to) return [];
        return eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    }, [dateRange]);
    
    const projectColors = useMemo(() => {
        const colors = [
            '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF80A2',
            '#A280FF', '#D88488', '#CA82D8', '#82D8CA'
        ];
        const colorMap = new Map<string, string>();
        projects.forEach((p, i) => {
            colorMap.set(p.id, colors[i % colors.length]);
        });
        return colorMap;
    }, [projects]);


    const allocationData = useMemo(() => {
        return workforce.map(member => {
            const dailyAllocations: DailyAllocation[][] = timeline.map(() => []);
            const memberApprovedLeaves = leaveRequests.filter(l => l.workforceId === member.id);

            wbsItems.forEach(task => {
                if (task.assignedWorkforce && task.startDate && task.endDate) {
                    const assignedGlobalIds = task.assignedWorkforce.map(projectWorkforceId => {
                        return projectWorkforceLinks.find(link => link.id === projectWorkforceId)?.workforceId;
                     }).filter(Boolean);

                    if (assignedGlobalIds.includes(member.id)) {
                        const durationDays = differenceInDays(task.endDate!, task.startDate!) + 1;
                        const dailyEffortPerTask = durationDays > 0 ? (task.effortHours || 0) / durationDays : 0;
                        const effortPerMember = assignedGlobalIds.length > 0 ? dailyEffortPerTask / assignedGlobalIds.length : 0;
                        const project = projects.find(p => p.id === task.projectId);

                        if (project && effortPerMember > 0) {
                            const taskDays = eachDayOfInterval({ start: task.startDate!, end: task.endDate! });
                            taskDays.forEach(day => {
                                const dayIndex = timeline.findIndex(d => d.getTime() === day.getTime());
                                if (dayIndex !== -1) {
                                    const existingAllocation = dailyAllocations[dayIndex].find(a => a.project.id === project.id);
                                    if (existingAllocation) {
                                        existingAllocation.hours += effortPerMember;
                                    } else {
                                        dailyAllocations[dayIndex].push({ project, hours: effortPerMember });
                                    }
                                }
                            });
                        }
                    }
                }
            });

            const dailyLeaveStatus: { isOnLeave: boolean; type: string | null }[] = timeline.map(day => {
                const leave = memberApprovedLeaves.find(l => isWithinInterval(day, { start: l.startDate, end: l.endDate }));
                const isOnLeave = !!leave;
    
                if (isOnLeave) {
                    const dayIndex = timeline.findIndex(d => d.getTime() === day.getTime());
                    if (dayIndex !== -1) {
                        dailyAllocations[dayIndex] = [];
                    }
                }
    
                return { isOnLeave, type: isOnLeave ? leave.type : null };
            });

            return {
                member,
                dailyAllocations,
                dailyLeaveStatus
            };
        });
    }, [workforce, wbsItems, projectWorkforceLinks, projects, timeline, leaveRequests]);
    
    if (authLoading || !authUser) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                 <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold">Período:</p>
                        <DatePicker date={dateRange.from} setDate={(d) => setDateRange(prev => ({...prev, from: d || prev.from}))}/>
                        <span>até</span>
                        <DatePicker date={dateRange.to} setDate={(d) => setDateRange(prev => ({...prev, to: d || prev.to}))}/>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                        {projects.map(p => (
                            <div key={p.id} className="flex items-center gap-2">
                                <Square className="h-3 w-3" style={{ color: projectColors.get(p.id), fill: projectColors.get(p.id) }} />
                                <span>{p.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> :
                    <ScrollArea className="w-full whitespace-nowrap">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-background z-10 w-[250px]">Funcionário</TableHead>
                                    {timeline.map((day, index) => (
                                        <TableHead key={index} className="text-center min-w-[60px]">
                                            <div className="text-xs">{dayLabels[day.getDay()]}</div>
                                            <div>{format(day, 'd')}</div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allocationData.map(({ member, dailyAllocations, dailyLeaveStatus }) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="sticky left-0 bg-background z-10 font-medium w-[250px]">
                                            {member.name}
                                            <p className="text-xs text-muted-foreground">{member.role}</p>
                                        </TableCell>
                                        {timeline.map((day, index) => {
                                            const { isOnLeave, type: leaveType } = dailyLeaveStatus[index];
                                            const allocationsForDay = dailyAllocations[index];
                                            const totalHours = allocationsForDay.reduce((sum, alloc) => sum + alloc.hours, 0);
                                            const isOverloaded = totalHours > DAILY_CAPACITY;
                                            return (
                                                <TableCell 
                                                    key={index} 
                                                    className={cn(
                                                        "p-0 h-16 border-r relative",
                                                        isOverloaded && !isOnLeave && "ring-2 ring-destructive z-10",
                                                        isOnLeave && "bg-muted-foreground/10"
                                                    )}
                                                >
                                                    <TooltipProvider delayDuration={100}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="h-full w-full flex flex-col justify-end">
                                                                     {isOnLeave && (
                                                                        <div className="absolute inset-0 bg-repeat bg-center opacity-50" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'8\' height=\'8\' viewBox=\'0 0 8 8\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M-1 1l2-2M0 8l8-8M7 9l2-2\' stroke=\'%23a1a1aa\' stroke-width=\'0.5\'/%3E%3C/svg%3E")'}}></div>
                                                                    )}
                                                                    {!isOnLeave && allocationsForDay.map((alloc) => (
                                                                        <div
                                                                            key={alloc.project.id}
                                                                            className="w-full"
                                                                            style={{
                                                                                height: `${Math.min((alloc.hours / DAILY_CAPACITY) * 100, 100)}%`,
                                                                                backgroundColor: projectColors.get(alloc.project.id) || '#cccccc'
                                                                            }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                {isOnLeave ? (
                                                                     <p className="font-bold">{leaveType}</p>
                                                                ) : allocationsForDay.length > 0 ? (
                                                                    allocationsForDay.map(alloc => (
                                                                        <p key={alloc.project.id}>{alloc.project.name}: {alloc.hours.toFixed(1)}h</p>
                                                                    ))
                                                                ) : (
                                                                    <p>Nenhuma alocação</p>
                                                                )}
                                                                <p className="font-bold border-t mt-1 pt-1">Total: {isOnLeave ? 'Ausente' : `${totalHours.toFixed(1)}h`}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                }
            </CardContent>
        </Card>
    );
}
