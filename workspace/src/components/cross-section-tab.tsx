
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, GitMerge, HelpCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type TopoPoint } from '@/types/topography';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Slider } from '@/components/ui/slider';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CrossSectionTabProps {
    projectId: string;
    userRole: string | null;
}

interface Axis {
    id: string;
    name: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

interface ProfilePoint {
    distance: number;
    elevation: number;
}

export default function CrossSectionTab({ projectId, userRole }: CrossSectionTabProps) {
    const { toast } = useToast();
    const [points, setPoints] = useState<TopoPoint[]>([]);
    const [axes, setAxes] = useState<Axis[]>([]);
    const [selectedAxisId, setSelectedAxisId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    
    // State for cross-section parameters
    const [station, setStation] = useState(0);
    const [profileWidth, setProfileWidth] = useState(20); // 10m to each side

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);

        let pointsLoaded = false;
        let axesLoaded = false;

        const checkLoading = () => {
            if (pointsLoaded && axesLoaded) {
                setLoading(false);
            }
        };

        const pointsQuery = query(collection(db, 'projects', projectId, 'topoPoints'));
        const unsubPoints = onSnapshot(pointsQuery, (snapshot) => {
            setPoints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopoPoint)));
            pointsLoaded = true;
            checkLoading();
        }, (error) => {
            console.error("Error fetching topo points:", error);
            toast({ title: 'Erro ao carregar pontos', variant: 'destructive' });
            pointsLoaded = true;
            checkLoading();
        });

        const axesQuery = query(collection(db, 'projects', projectId, 'axes'), orderBy('name'));
        const unsubAxes = onSnapshot(axesQuery, (snapshot) => {
            const fetchedAxes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Axis));
            setAxes(fetchedAxes);
            if (fetchedAxes.length > 0 && !selectedAxisId) {
                setSelectedAxisId(fetchedAxes[0].id);
            }
            axesLoaded = true;
            checkLoading();
        }, (error) => {
            console.error("Error fetching axes:", error);
            toast({ title: 'Erro ao carregar eixos', variant: 'destructive' });
            axesLoaded = true;
            checkLoading();
        });

        return () => {
            unsubPoints();
            unsubAxes();
        };
    }, [projectId, toast]);

    const selectedAxis = useMemo(() => axes.find(a => a.id === selectedAxisId), [axes, selectedAxisId]);
    
    const axisLength = useMemo(() => {
        if (!selectedAxis) return 0;
        return Math.sqrt((selectedAxis.endX - selectedAxis.startX) ** 2 + (selectedAxis.endY - selectedAxis.startY) ** 2);
    }, [selectedAxis]);

    useEffect(() => {
        setStation(0);
    }, [selectedAxisId]);

    const crossSectionData = useMemo((): ProfilePoint[] => {
        if (!selectedAxis || points.length === 0 || axisLength === 0) return [];
        
        // Axis vector
        const dx = selectedAxis.endX - selectedAxis.startX;
        const dy = selectedAxis.endY - selectedAxis.startY;
        
        // Point on axis for current station
        const stationPointX = selectedAxis.startX + (station / axisLength) * dx;
        const stationPointY = selectedAxis.startY + (station / axisLength) * dy;
        
        // Perpendicular vector (normalized)
        const perpX = -dy / axisLength;
        const perpY = dx / axisLength;
        
        const profilePoints: ProfilePoint[] = [];

        points.forEach(point => {
            // Vector from station point to topo point
            const vecX = point.east - stationPointX;
            const vecY = point.north - stationPointY;

            // Distance along the perpendicular vector (dot product)
            const distance = vecX * perpX + vecY * perpY;

            // Distance along the axis vector (dot product)
            const axisDist = vecX * (dx / axisLength) + vecY * (dy / axisLength);

            // Check if point is close to the station line and within width
            if (Math.abs(axisDist) < 1.0 && Math.abs(distance) <= profileWidth / 2) {
                 profilePoints.push({ distance, elevation: point.elevation });
            }
        });

        return profilePoints.sort((a, b) => a.distance - b.distance);

    }, [points, selectedAxis, station, profileWidth, axisLength]);

    const chartConfig = {
        elevation: { label: "Cota", color: "hsl(var(--chart-1))" },
    };

    return (
        <div className="pt-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><GitMerge className="h-5 w-5 text-primary"/> Perfis Transversais</span>
                         <TooltipProvider>
                            <UiTooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">Gere um perfil transversal em qualquer ponto (estaca) de um eixo. Arraste o seletor de estaca para visualizar a secção do terreno em tempo real.</p>
                                </TooltipContent>
                            </UiTooltip>
                        </TooltipProvider>
                    </CardTitle>
                    <CardDescription>Gere e visualize perfis transversais do terreno ao longo de um eixo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Selecione um Eixo</Label>
                            <Select value={selectedAxisId} onValueChange={setSelectedAxisId} disabled={loading || axes.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Escolha um eixo..." /></SelectTrigger>
                                <SelectContent>
                                    {axes.map(axis => <SelectItem key={axis.id} value={axis.id}>{axis.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="width">Largura do Perfil (m)</Label>
                            <Input id="width" type="number" value={profileWidth} onChange={e => setProfileWidth(Number(e.target.value))} />
                        </div>
                    </div>
                    {selectedAxis && (
                        <div className="space-y-4 pt-4 border-t">
                            <div className="space-y-2">
                                <Label>Estaca: {station.toFixed(2)}m</Label>
                                <Slider
                                    min={0}
                                    max={axisLength}
                                    step={axisLength / 1000}
                                    value={[station]}
                                    onValueChange={(val) => setStation(val[0])}
                                />
                            </div>
                            {loading ? <div className="flex justify-center h-96 items-center"><Loader2 className="animate-spin"/></div> :
                            crossSectionData.length < 2 ? (
                                <div className="p-8 text-center text-muted-foreground border rounded-lg">
                                    <p>Não foram encontrados pontos suficientes nesta estaca para gerar um perfil.</p>
                                    <p className="text-sm">Tente aumentar a largura do perfil ou verificar a sua nuvem de pontos.</p>
                                </div>
                            ) : (
                                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                                    <AreaChart data={crossSectionData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" dataKey="distance" name="Distância" unit="m" domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(1)} />
                                        <YAxis type="number" name="Cota" unit="m" domain={['dataMin - 1', 'dataMax + 1']} />
                                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(3)}m`} labelFormatter={(label) => `Distância: ${label.toFixed(2)}m`} />} />
                                        <ReferenceLine x={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: 'Eixo', position: 'insideTop' }} />
                                        <Area type="monotone" dataKey="elevation" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
                                    </AreaChart>
                                </ChartContainer>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
