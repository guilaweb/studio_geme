

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type TopoPoint } from '@/types/topography';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Label } from '@/components/ui/label';

interface LongitudinalProfileTabProps {
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
    station: number;
    elevation: number;
}

export default function LongitudinalProfileTab({ projectId, userRole }: LongitudinalProfileTabProps) {
    const { toast } = useToast();
    const [points, setPoints] = useState<TopoPoint[]>([]);
    const [axes, setAxes] = useState<Axis[]>([]);
    const [selectedAxisId, setSelectedAxisId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;

        let pointsLoaded = false;
        let axesLoaded = false;
        setLoading(true);

        const checkLoading = () => {
            if (pointsLoaded && axesLoaded) {
                setLoading(false);
            }
        };

        const pointsQuery = query(collection(db, 'projects', projectId, 'topoPoints'));
        const axesQuery = query(collection(db, 'projects', projectId, 'axes'), orderBy('name'));

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

    const profileData = useMemo((): ProfilePoint[] => {
        if (!selectedAxisId || points.length === 0) return [];
        
        const axis = axes.find(a => a.id === selectedAxisId);
        if (!axis) return [];

        const projectedPoints: ProfilePoint[] = [];
        const TOLERANCE = 5.0; // Max distance from axis line to consider a point (in meters)

        const axisLengthSq = (axis.endX - axis.startX) ** 2 + (axis.endY - axis.startY) ** 2;

        points.forEach(point => {
            const dx = axis.endX - axis.startX;
            const dy = axis.endY - axis.startY;

            if (axisLengthSq === 0) return;

            const t = ((point.east - axis.startX) * dx + (point.north - axis.startY) * dy) / axisLengthSq;
            
            const closestX = axis.startX + t * dx;
            const closestY = axis.startY + t * dy;

            const distSq = (point.east - closestX) ** 2 + (point.north - closestY) ** 2;

            if (distSq < TOLERANCE ** 2) {
                // Point is within tolerance, calculate station
                const station = Math.sqrt((closestX - axis.startX) ** 2 + (closestY - axis.startY) ** 2);
                projectedPoints.push({ station, elevation: point.elevation });
            }
        });
        
        return projectedPoints.sort((a, b) => a.station - b.station);
    }, [points, axes, selectedAxisId]);
    
    const chartConfig = {
        elevation: { label: "Cota", color: "hsl(var(--chart-1))" },
    };

    return (
        <div className="pt-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary"/> Perfil Longitudinal</CardTitle>
                    <CardDescription>Visualize o perfil do terreno ao longo de um eixo selecionado.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="w-full md:w-1/3">
                        <Label>Selecione um Eixo</Label>
                         <Select value={selectedAxisId} onValueChange={setSelectedAxisId} disabled={loading || axes.length === 0}>
                            <SelectTrigger>
                                <SelectValue placeholder="Escolha um eixo..." />
                            </SelectTrigger>
                            <SelectContent>
                                {axes.map(axis => (
                                    <SelectItem key={axis.id} value={axis.id}>{axis.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin"/></div>
                    ) : profileData.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground border rounded-lg">
                            <p>Nenhum ponto topográfico encontrado próximo do eixo selecionado para gerar o perfil.</p>
                            <p className="text-sm">Certifique-se de que a sua nuvem de pontos cobre a área do eixo.</p>
                        </div>
                    ) : (
                        <ChartContainer config={chartConfig} className="h-[400px] w-full">
                            <AreaChart data={profileData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    type="number" 
                                    dataKey="station" 
                                    name="Estaca"
                                    unit="m" 
                                    domain={['dataMin', 'dataMax']}
                                    tickFormatter={(val) => `0+${val.toFixed(2)}`}
                                />
                                <YAxis name="Cota" unit="m" domain={['dataMin - 1', 'dataMax + 1']} />
                                <Tooltip 
                                    content={<ChartTooltipContent 
                                        formatter={(value, name) => `${(value as number).toFixed(3)}m`}
                                        labelFormatter={(label) => typeof label === 'number' ? `Estaca: ${label.toFixed(3)}m` : String(label)}
                                    />}
                                />
                                <Area type="monotone" dataKey="elevation" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
                            </AreaChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
