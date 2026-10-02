
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Waypoints, HelpCircle } from 'lucide-react';
import { type TopoPoint } from '@/types/topography';
import { Delaunay } from 'd3-delaunay';
import { ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ContourLinesTabProps {
    projectId: string;
    userRole: string | null;
}

interface ContourLine {
    level: number;
    path: string;
    isMajor: boolean;
}

export default function ContourLinesTab({ projectId, userRole }: ContourLinesTabProps) {
    const { toast } = useToast();
    const [points, setPoints] = useState<TopoPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [interval, setInterval] = useState(1.0);
    const [majorInterval, setMajorInterval] = useState(5.0);
    const [contourLines, setContourLines] = useState<ContourLine[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const pointsQuery = query(collection(db, 'projects', projectId, 'topoPoints'));
        const unsubPoints = onSnapshot(pointsQuery, (snapshot) => {
            setPoints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopoPoint)));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching topo points:", error);
            toast({ title: 'Erro ao carregar pontos', variant: 'destructive' });
            setLoading(false);
        });
        return () => unsubPoints();
    }, [projectId, toast]);
    
    const delaunay = useMemo(() => {
        if (points.length < 3) return null;
        return Delaunay.from(points, p => p.east, p => p.north);
    }, [points]);

    const handleCalculateContours = () => {
        if (!delaunay || points.length < 3) {
            toast({ title: "Dados insuficientes", description: "São necessários pelo menos 3 pontos para gerar curvas de nível.", variant: "destructive" });
            return;
        }
        setIsCalculating(true);
        
        // Simulate async calculation
        setTimeout(() => {
            const newContourLines: ContourLine[] = [];
            const { min, max } = points.reduce((acc, p) => ({
                min: Math.min(acc.min, p.elevation),
                max: Math.max(acc.max, p.elevation)
            }), { min: Infinity, max: -Infinity });

            const startLevel = Math.ceil(min / interval) * interval;

            for (let level = startLevel; level <= max; level += interval) {
                const isMajor = Math.round(level * 100) % Math.round(majorInterval * 100) === 0;
                
                for (let i = 0; i < delaunay.triangles.length; i += 3) {
                    const t0 = points[delaunay.triangles[i]];
                    const t1 = points[delaunay.triangles[i+1]];
                    const t2 = points[delaunay.triangles[i+2]];
                    
                    const pointsAbove = [t0, t1, t2].filter(p => p.elevation >= level);
                    
                    if (pointsAbove.length === 1 || pointsAbove.length === 2) {
                        const pointsBelow = [t0, t1, t2].filter(p => p.elevation < level);
                        const intersections: {x: number, y: number}[] = [];

                        pointsAbove.forEach(p_above => {
                            pointsBelow.forEach(p_below => {
                                const t = (level - p_below.elevation) / (p_above.elevation - p_below.elevation);
                                const x = p_below.east + t * (p_above.east - p_below.east);
                                const y = p_below.north + t * (p_above.north - p_below.north);
                                intersections.push({x, y});
                            });
                        });
                        
                        if (intersections.length === 2) {
                            const path = `M ${intersections[0].x} ${intersections[0].y} L ${intersections[1].x} ${intersections[1].y}`;
                            newContourLines.push({ level, path, isMajor });
                        }
                    }
                }
            }
            setContourLines(newContourLines);
            setIsCalculating(false);
             toast({ title: "Cálculo Concluído", description: `${newContourLines.length} segmentos de curvas de nível gerados.`});
        }, 500);
    };

    return (
        <div className="pt-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><Waypoints className="h-5 w-5 text-primary"/> Geração de Curvas de Nível</span>
                        <TooltipProvider>
                            <UiTooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">Gere um mapa de curvas de nível a partir da nuvem de pontos. Pode definir a equidistância entre as curvas principais e secundárias.</p>
                                </TooltipContent>
                            </UiTooltip>
                        </TooltipProvider>
                    </CardTitle>
                    <CardDescription>Defina os intervalos e gere as curvas de nível a partir da nuvem de pontos do projeto.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg">
                        <div className="space-y-2">
                            <Label htmlFor="interval">Equidistância (m)</Label>
                            <Input id="interval" type="number" value={interval} onChange={e => setInterval(parseFloat(e.target.value) || 1)} className="w-28" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="major-interval">Curvas Mestras a cada (m)</Label>
                            <Input id="major-interval" type="number" value={majorInterval} onChange={e => setMajorInterval(parseFloat(e.target.value) || 5)} className="w-28" />
                        </div>
                        <Button onClick={handleCalculateContours} disabled={isCalculating || loading || points.length < 3}>
                            {isCalculating ? <Loader2 className="animate-spin mr-2"/> : null}
                            Gerar Curvas de Nível
                        </Button>
                    </div>

                    {loading ? <div className="flex justify-center h-96 items-center"><Loader2 className="animate-spin"/></div> :
                    points.length === 0 ? <p className="text-muted-foreground text-center py-8">Nenhum ponto topográfico para gerar curvas.</p> :
                    (
                         <ChartContainer config={{}} className="h-[500px] w-full">
                             <ResponsiveContainer>
                                <svg width="100%" height="100%">
                                    <defs>
                                        <clipPath id="chart-clip-path">
                                            <rect x="50" y="20" width="calc(100% - 70px)" height="calc(100% - 70px)" />
                                        </clipPath>
                                    </defs>
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 50, left: 50 }}>
                                        <CartesianGrid strokeDasharray="3 3"/>
                                        <XAxis type="number" dataKey="east" name="Este" domain={['dataMin', 'dataMax']} tickFormatter={(v) => v.toFixed(0)} />
                                        <YAxis type="number" dataKey="north" name="Norte" domain={['dataMin', 'dataMax']} tickFormatter={(v) => v.toFixed(0)} />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent formatter={(value, name) => `${(value as number).toFixed(3)}m`}/>} />
                                        <Scatter name="Pontos" data={points} fill="hsl(var(--muted-foreground))" shape="cross" />
                                        <g clipPath="url(#chart-clip-path)">
                                            {contourLines.map((line, index) => (
                                                <path 
                                                    key={index}
                                                    d={line.path}
                                                    stroke={line.isMajor ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                                                    strokeWidth={line.isMajor ? 1.5 : 0.8}
                                                    fill="none"
                                                />
                                            ))}
                                        </g>
                                    </ScatterChart>
                                </svg>
                            </ResponsiveContainer>
                         </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
