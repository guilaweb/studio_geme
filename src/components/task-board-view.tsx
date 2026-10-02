

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Diamond } from 'lucide-react';
import { type WbsItem } from '@/types/wbs';
import { DragDropContext, Droppable, Draggable, type OnDragEndResponder } from '@hello-pangea/dnd';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/app/projects/[id]/page';

interface TaskBoardViewProps {
    projectId: string;
    userRole: UserRole | null;
}

type TaskStatus = 'A Fazer' | 'Em Andamento' | 'Concluído';

const statusColumns: TaskStatus[] = ['A Fazer', 'Em Andamento', 'Concluído'];

export default function TaskBoardView({ projectId, userRole }: TaskBoardViewProps) {
    const [tasks, setTasks] = useState<WbsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'wbs'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as WbsItem)).filter(task => !task.isMilestone); // Exclude milestones from board
            setTasks(fetchedTasks);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [projectId]);

    const columns = useMemo(() => {
        const boardColumns = new Map<TaskStatus, { id: TaskStatus; title: TaskStatus; tasks: WbsItem[] }>();
        statusColumns.forEach(status => {
            boardColumns.set(status, { id: status, title: status, tasks: [] });
        });

        tasks.forEach(task => {
            const progress = task.progress || 0;
            if (progress === 0) {
                boardColumns.get('A Fazer')?.tasks.push(task);
            } else if (progress === 100) {
                boardColumns.get('Concluído')?.tasks.push(task);
            } else {
                boardColumns.get('Em Andamento')?.tasks.push(task);
            }
        });
        return boardColumns;
    }, [tasks]);

    const handleDragEnd: OnDragEndResponder = async (result) => {
        const { destination, source, draggableId } = result;
        if (!destination || !canEdit) return;

        const sourceStatus = source.droppableId as TaskStatus;
        const destStatus = destination.droppableId as TaskStatus;

        if (sourceStatus === destStatus && source.index === destination.index) {
            return;
        }

        const task = tasks.find(t => t.id === draggableId);
        if (!task) return;
        
        let newProgress: number;
        switch (destStatus) {
            case 'A Fazer':
                newProgress = 0;
                break;
            case 'Em Andamento':
                // If moving from done or to-do, set to 10% to signify start
                newProgress = task.progress === 0 || task.progress === 100 ? 10 : (task.progress || 10);
                break;
            case 'Concluído':
                newProgress = 100;
                break;
            default:
                return;
        }
        
        // Optimistic UI update
        const updatedTasks = tasks.map(t => 
            t.id === draggableId ? { ...t, progress: newProgress } : t
        );
        setTasks(updatedTasks);

        try {
            const taskRef = doc(db, 'projects', projectId, 'wbs', draggableId);
            await updateDoc(taskRef, { progress: newProgress });
            toast({ title: 'Progresso da tarefa atualizado!' });
        } catch (error) {
            toast({ title: 'Erro ao atualizar tarefa', variant: 'destructive' });
            // Revert UI on failure
            setTasks(tasks);
        }
    };
    
    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /> Carregando quadro...</div>;
    }
    
    return (
         <Card>
            <CardHeader>
                <CardTitle>Quadro de Tarefas</CardTitle>
                <CardDescription>Visualize e atualize o progresso das tarefas arrastando-as entre as colunas.</CardDescription>
            </CardHeader>
            <CardContent>
                 <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Array.from(columns.entries()).map(([status, column]) => (
                            <Droppable key={status} droppableId={status} isDropDisabled={!canEdit}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`p-4 rounded-lg bg-secondary ${snapshot.isDraggingOver ? 'bg-primary/10' : ''}`}
                                    >
                                        <h3 className="font-semibold mb-4 text-center">{column.title} ({column.tasks.length})</h3>
                                        <div className="space-y-4 min-h-[300px]">
                                            {column.tasks.map((task, index) => (
                                                <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!canEdit}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`p-3 bg-card rounded-md shadow-sm border ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''} ${canEdit ? 'cursor-grab' : 'cursor-default'}`}
                                                        >
                                                            <p className="font-medium text-sm">{task.name}</p>
                                                            {task.progress != null && task.progress > 0 && task.progress < 100 && (
                                                                <div className="mt-2">
                                                                     <Progress value={task.progress} className="h-2"/>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        ))}
                    </div>
                </DragDropContext>
            </CardContent>
         </Card>
    );
}
