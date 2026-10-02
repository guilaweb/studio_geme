

'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ArrowRight, Trash2, Pencil, HelpCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Axis {
    id: string;
    name: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    createdAt: any;
}

interface AxesManagementTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function AxesManagementTab({ projectId, userRole }: AxesManagementTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    const [axes, setAxes] = useState<Axis[]>([]);
    const [loading, setLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form and Edit state
    const [editingAxis, setEditingAxis] = useState<Axis | null>(null);
    const [name, setName] = useState('');
    const [startX, setStartX] = useState('');
    const [startY, setStartY] = useState('');
    const [endX, setEndX] = useState('');
    const [endY, setEndY] = useState('');

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'axes'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedAxes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Axis));
            setAxes(fetchedAxes);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching axes: ", error);
            toast({ title: 'Erro ao carregar eixos', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, toast]);

    const resetForm = () => {
        setName('');
        setStartX('');
        setStartY('');
        setEndX('');
        setEndY('');
        setEditingAxis(null);
        setIsDialogOpen(false);
    };
    
    const handleOpenDialog = (axis: Axis | null = null) => {
        if (axis) {
            setEditingAxis(axis);
            setName(axis.name);
            setStartX(String(axis.startX));
            setStartY(String(axis.startY));
            setEndX(String(axis.endX));
            setEndY(String(axis.endY));
        } else {
            // Ensure form is clear for new entry
            setName('');
            setStartX('');
            setStartY('');
            setEndX('');
            setEndY('');
            setEditingAxis(null);
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!canEdit || !user) return;
        if (!name.trim() || !startX || !startY || !endX || !endY) {
            toast({ title: 'Campos obrigatórios em falta', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        const axisData = {
            name,
            startX: parseFloat(startX),
            startY: parseFloat(startY),
            endX: parseFloat(endX),
            endY: parseFloat(endY),
        };
        
        try {
            if (editingAxis) {
                // Update logic
                const response = await fetch(`/api/projects/${projectId}/axes/${editingAxis.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                    body: JSON.stringify(axisData),
                });
                 if (!response.ok) throw new Error('Falha ao atualizar o eixo.');
                 toast({ title: 'Eixo atualizado com sucesso!' });
            } else {
                // Create logic
                 await addDoc(collection(db, 'projects', projectId, 'axes'), {
                    ...axisData,
                    author: { uid: user.uid, displayName: user.displayName || user.email },
                    createdAt: serverTimestamp(),
                });
                toast({ title: 'Eixo criado com sucesso!' });
            }
             resetForm();
        } catch (error: any) {
            toast({ title: `Erro ao ${editingAxis ? 'atualizar' : 'criar'} eixo`, description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteAxis = async (axisId: string) => {
        if (!canEdit || !idToken) return;
        try {
            const response = await fetch(`/api/projects/${projectId}/axes/${axisId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao eliminar o eixo.');
            }
            toast({ title: 'Eixo eliminado com sucesso.' });
        } catch (error: any) {
            console.error("Error deleting axis: ", error);
            toast({ title: 'Erro ao eliminar eixo.', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
                resetForm();
            }
        }}>
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2"><ArrowRight className="h-5 w-5 text-primary"/> Gestão de Eixos</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">Crie e gira os eixos de referência do seu projeto, definidos por coordenadas de início e fim. Estes eixos são usados para gerar perfis.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardTitle>
                        <CardDescription>Defina os eixos principais para o seu projeto, que servirão de base para perfis e seccionamentos.</CardDescription>
                    </div>
                    {canEdit && (
                        <Button onClick={() => handleOpenDialog()}><Plus className="mr-2"/>Criar Novo Eixo</Button>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome do Eixo</TableHead>
                                    <TableHead>Início (Este, Norte)</TableHead>
                                    <TableHead>Fim (Este, Norte)</TableHead>
                                    {canEdit && <TableHead className="text-right">Ações</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {axes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={canEdit ? 4 : 3} className="h-24 text-center">Nenhum eixo definido para este projeto.</TableCell>
                                    </TableRow>
                                ) : (
                                    axes.map(axis => (
                                        <TableRow key={axis.id}>
                                            <TableCell className="font-medium">{axis.name}</TableCell>
                                            <TableCell className="font-mono text-xs">{`${axis.startX.toFixed(3)}, ${axis.startY.toFixed(3)}`}</TableCell>
                                            <TableCell className="font-mono text-xs">{`${axis.endX.toFixed(3)}, ${axis.endY.toFixed(3)}`}</TableCell>
                                            {canEdit && (
                                                <TableCell className="text-right">
                                                     <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(axis)}><Pencil className="h-4 w-4" /></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                                                                <AlertDialogDescription>Esta ação irá eliminar o eixo "{axis.name}" permanentemente.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteAxis(axis.id)}>Eliminar</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingAxis ? 'Editar Eixo' : 'Criar Novo Eixo'}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="axis-name">Nome do Eixo</Label>
                        <Input id="axis-name" placeholder="Ex: Eixo da Estrada Principal" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <fieldset className="p-4 border rounded-lg space-y-2">
                            <legend className="font-medium px-1 text-sm">Ponto de Início</legend>
                             <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="start-x">Este (X)</Label>
                                    <Input id="start-x" type="number" value={startX} onChange={e => setStartX(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="start-y">Norte (Y)</Label>
                                    <Input id="start-y" type="number" value={startY} onChange={e => setStartY(e.target.value)} />
                                </div>
                            </div>
                        </fieldset>
                        <fieldset className="p-4 border rounded-lg space-y-2">
                             <legend className="font-medium px-1 text-sm">Ponto de Fim</legend>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="end-x">Este (X)</Label>
                                    <Input id="end-x" type="number" value={endX} onChange={e => setEndX(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="end-y">Norte (Y)</Label>
                                    <Input id="end-y" type="number" value={endY} onChange={e => setEndY(e.target.value)} />
                                </div>
                            </div>
                        </fieldset>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : editingAxis ? <Pencil className="mr-2 h-4 w-4"/> : <Plus className="mr-2" />}
                         {editingAxis ? 'Guardar Alterações' : 'Criar Eixo'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
