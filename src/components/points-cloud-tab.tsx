
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, writeBatch, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { type TopoPoint } from '@/types/topography';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Upload, Map, Download, Pencil, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Papa from 'papaparse';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Legend, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import BimViewer from '@/components/BimViewer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Axis {
    id: string;
    name: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

interface PointsCloudTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export function PointsCloudTab({ projectId, userRole }: PointsCloudTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    const [points, setPoints] = useState<TopoPoint[]>([]);
    const [axes, setAxes] = useState<Axis[]>([]);
    const [selectedAxisId, setSelectedAxisId] = useState<string>('none');
    const [loading, setLoading] = useState(true);

    // Form State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [code, setCode] = useState('');
    const [north, setNorth] = useState('');
    const [east, setEast] = useState('');
    const [elevation, setElevation] = useState('');
    
    // Edit state
    const [editingPoint, setEditingPoint] = useState<TopoPoint | null>(null);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);

        const pointsQuery = query(collection(db, 'projects', projectId, 'topoPoints'), orderBy('code', 'asc'));
        const axesQuery = query(collection(db, 'projects', projectId, 'axes'), orderBy('name', 'asc'));

       
        const unsubPoints = onSnapshot(pointsQuery, (snapshot) => {
            const fetchedPoints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopoPoint));
            setPoints(fetchedPoints);
        }, (error) => {
            console.error("Error fetching topo points:", error);
            toast({ title: 'Erro ao carregar pontos topográficos', variant: 'destructive' });
        });
        
        const unsubAxes = onSnapshot(axesQuery, (snapshot) => {
            const fetchedAxes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Axis));
            setAxes(fetchedAxes);
        }, (error) => {
            console.error("Error fetching axes:", error);
            toast({ title: 'Erro ao carregar eixos', variant: 'destructive' });
        });

        Promise.all([
             new Promise(res => onSnapshot(pointsQuery, res)),
             new Promise(res => onSnapshot(axesQuery, res)),
        ]).finally(() => setLoading(false));

        return () => {
            unsubPoints();
            unsubAxes();
        };
    }, [projectId, toast]);
    
    const elevationData = useMemo(() => {
        if (points.length === 0) return { data: [], minZ: 0, maxZ: 0 };
        const elevations = points.map(p => p.elevation);
        return {
            data: points,
            minZ: Math.min(...elevations),
            maxZ: Math.max(...elevations),
        };
    }, [points]);

    const getElevationColor = (elevation: number, minZ: number, maxZ: number) => {
        if (minZ === maxZ) return 'hsl(210, 100%, 50%)'; // blue if all points have same elevation
        const ratio = (elevation - minZ) / (maxZ - minZ);
        // Gradient from blue (low, 240) to red (high, 0)
        const hue = (1 - ratio) * 240;
        return `hsl(${hue}, 80%, 50%)`;
    };

    const resetForms = () => {
        setCode('');
        setNorth('');
        setEast('');
        setElevation('');
        setIsAddDialogOpen(false);
        setEditingPoint(null);
    }

    const handleSubmit = async () => {
        if (!canEdit || !user) return;
        if (!code.trim() || !north || !east || !elevation) {
            toast({ title: 'Campos obrigatórios em falta', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        const pointData = {
            code,
            north: parseFloat(north),
            east: parseFloat(east),
            elevation: parseFloat(elevation),
        };

        try {
            if (editingPoint) {
                // Update
                const response = await fetch(`/api/projects/${projectId}/topo-points/${editingPoint.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                    body: JSON.stringify(pointData),
                });
                if (!response.ok) throw new Error('Falha ao atualizar o ponto.');
                toast({ title: 'Ponto atualizado com sucesso!' });
            } else {
                // Create
                await addDoc(collection(db, 'projects', projectId, 'topoPoints'), {
                    ...pointData,
                    author: { uid: user.uid, displayName: user.displayName || user.email },
                    createdAt: serverTimestamp(),
                });
                toast({ title: 'Ponto adicionado com sucesso!' });
            }
            resetForms();
        } catch (error: any) {
            toast({ title: `Erro ao ${editingPoint ? 'atualizar' : 'adicionar'} ponto`, description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (pointId: string) => {
        if (!canEdit || !idToken) return;
        try {
             const response = await fetch(`/api/projects/${projectId}/topo-points/${pointId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${idToken}` },
            });
             if (!response.ok) throw new Error((await response.json()).error || 'Falha ao eliminar o ponto.');
            toast({ title: 'Ponto eliminado com sucesso.' });
        } catch (error: any) {
            toast({ title: 'Erro ao eliminar ponto', description: error.message, variant: 'destructive' });
        }
    };
    
    const handleEditClick = (point: TopoPoint) => {
        setEditingPoint(point);
        setCode(point.code);
        setNorth(String(point.north));
        setEast(String(point.east));
        setElevation(String(point.elevation));
    }
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setIsSubmitting(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const batch = writeBatch(db);
                let count = 0;
                
                for (const row of results.data as any[]) {
                    const code = row.code || row.Code || row.Ponto;
                    const north = parseFloat(row.north || row.North || row.N);
                    const east = parseFloat(row.east || row.East || row.E);
                    const elevation = parseFloat(row.elevation || row.Elevation || row.Z);

                    if (code && !isNaN(north) && !isNaN(east) && !isNaN(elevation)) {
                        const pointRef = doc(collection(db, 'projects', projectId, 'topoPoints'));
                        batch.set(pointRef, {
                            code,
                            north,
                            east,
                            elevation,
                            author: { uid: user.uid, displayName: user.displayName || user.email },
                            createdAt: serverTimestamp(),
                        });
                        count++;
                    }
                }
                
                try {
                    await batch.commit();
                    toast({ title: 'Importação Concluída', description: `${count} pontos foram importados com sucesso.`});
                } catch (error) {
                    toast({ title: 'Erro na importação', description: 'Ocorreu um erro ao guardar os pontos.', variant: 'destructive' });
                } finally {
                    setIsSubmitting(false);
                }
            },
            error: (error) => {
                toast({ title: 'Erro ao ler ficheiro CSV', description: error.message, variant: 'destructive' });
                setIsSubmitting(false);
            }
        });
    }

    const handleExportCSV = () => {
        if (points.length === 0) {
            toast({ description: 'Não há pontos para exportar.'});
            return;
        }
        const csvData = Papa.unparse(points.map(p => ({
            code: p.code,
            north: p.north,
            east: p.east,
            elevation: p.elevation
        })));
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `pontos_topograficos_${projectId}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const selectedAxis = useMemo(() => {
        return axes.find(a => a.id === selectedAxisId) || null;
    }, [axes, selectedAxisId]);

    return (
        <Dialog open={isAddDialogOpen || !!editingPoint} onOpenChange={(open) => { if(!open) resetForms()}}>
             <div className="pt-4 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Map className="h-5 w-5 text-primary"/> Nuvem de Pontos e MDT</CardTitle>
                            <CardDescription>Gira os pontos topográficos e visualize o modelo digital do terreno.</CardDescription>
                        </div>
                        {canEdit && (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleExportCSV} disabled={points.length === 0}>
                                    <Download className="mr-2 h-4 w-4"/> Exportar CSV
                                </Button>
                                <Button variant="outline" asChild>
                                    <Label htmlFor="csv-upload" className="cursor-pointer flex items-center">
                                        <Upload className="mr-2 h-4 w-4"/> Importar CSV
                                    </Label>
                                </Button>
                                <Input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                                <Button onClick={() => setIsAddDialogOpen(true)}><Plus className="mr-2"/>Adicionar Ponto</Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="max-h-[500px] overflow-y-auto">
                            {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin"/></div> : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Código</TableHead>
                                            <TableHead>Norte (Y)</TableHead>
                                            <TableHead>Este (X)</TableHead>
                                            <TableHead>Cota (Z)</TableHead>
                                            {canEdit && <TableHead className="text-right">Ações</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {points.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={canEdit ? 5 : 4} className="h-24 text-center">Nenhum ponto topográfico registado.</TableCell>
                                            </TableRow>
                                        ) : (
                                            points.map(p => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">{p.code}</TableCell>
                                                    <TableCell>{p.north.toFixed(3)}</TableCell>
                                                    <TableCell>{p.east.toFixed(3)}</TableCell>
                                                    <TableCell>{p.elevation.toFixed(3)}</TableCell>
                                                    {canEdit && (
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(p)}><Pencil className="h-4 w-4" /></Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                                                                        <AlertDialogDescription>Esta ação irá eliminar o ponto "{p.code}" permanentemente.</AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDelete(p.id)}>Eliminar</AlertDialogAction>
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
                        </div>
                         <div className="h-[500px] border rounded-lg bg-secondary/30 relative">
                             <div className="absolute top-2 left-2 z-10 w-64">
                                <Select value={selectedAxisId} onValueChange={setSelectedAxisId} disabled={axes.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um eixo para exibir..."/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Nenhum</SelectItem>
                                        {axes.map(axis => <SelectItem key={axis.id} value={axis.id}>{axis.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {loading ? <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin"/></div> : 
                                <BimViewer dtmPoints={points} axisToDisplay={selectedAxis}/>
                            }
                        </div>
                    </CardContent>
                </Card>
                {points.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Mapa de Calor de Elevação (2D)</CardTitle>
                            <CardDescription>Vista de cima dos pontos, coloridos por cota (vermelho = alto, azul = baixo).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={{}} className="h-[400px] w-full">
                                <ResponsiveContainer>
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid />
                                        <XAxis type="number" dataKey="east" name="Este" unit="m" domain={['dataMin', 'dataMax']} tickFormatter={(v) => v.toFixed(0)} />
                                        <YAxis type="number" dataKey="north" name="Norte" unit="m" domain={['dataMin', 'dataMax']} tickFormatter={(v) => v.toFixed(0)} />
                                        <ZAxis type="number" dataKey="elevation" name="Cota" unit="m" range={[0, 100]} />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent formatter={(value, name) => `${(value as number).toFixed(3)}m`} labelKey='code'/>}/>
                                        <Scatter name="Pontos" data={points}>
                                            {points.map((p, index) => (
                                                <Cell key={`cell-${index}`} fill={getElevationColor(p.elevation, elevationData.minZ, elevationData.maxZ)} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                )}
            </div>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingPoint ? 'Editar Ponto Topográfico' : 'Adicionar Novo Ponto Topográfico'}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="p-code">Código do Ponto</Label>
                        <Input id="p-code" value={code} onChange={e => setCode(e.target.value)} placeholder="Ex: P1, Eixo-A1" />
                    </div>
                     <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="p-north">Norte (Y)</Label>
                            <Input id="p-north" type="number" value={north} onChange={e => setNorth(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="p-east">Este (X)</Label>
                            <Input id="p-east" type="number" value={east} onChange={e => setEast(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="p-elevation">Cota (Z)</Label>
                            <Input id="p-elevation" type="number" value={elevation} onChange={e => setElevation(e.target.value)} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={resetForms}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : editingPoint ? <Pencil className="mr-2 h-4 w-4"/> : <Plus className="mr-2"/>}
                        {editingPoint ? 'Guardar Alterações' : 'Adicionar Ponto'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
