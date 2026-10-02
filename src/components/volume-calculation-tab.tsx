
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';
import { type TopoPoint } from '@/types/topography';
import { useToast } from '@/hooks/use-toast';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

export type VolumeTopoPoint = {
    id: string;
    code: string;
    north: number;
    east: number;
    elevation: number;
};

interface VolumeCalculationTabProps {
    projectId: string;
    userRole: string | null;
}

export function VolumeCalculationTab({ projectId, userRole }: VolumeCalculationTabProps) {
    const { toast } = useToast();
    const [originalPoints, setOriginalPoints] = useState<VolumeTopoPoint[]>([]);
    const [modifiedPoints, setModifiedPoints] = useState<VolumeTopoPoint[]>([]);
    const [originalFileName, setOriginalFileName] = useState<string>('');
    const [modifiedFileName, setModifiedFileName] = useState<string>('');
    const [volumeResult, setVolumeResult] = useState<{ cut: number, fill: number, net: number } | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [gridSize, setGridSize] = useState(5); // Default grid size in meters

    const handleFileUpload = (file: File | null, type: 'original' | 'modified') => {
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const points = (results.data as any[]).map(row => ({
                    id: row.code || row.Code || row.Ponto,
                    code: row.code || row.Code || row.Ponto,
                    north: parseFloat(row.north || row.North || row.N),
                    east: parseFloat(row.east || row.East || row.E),
                    elevation: parseFloat(row.elevation || row.Elevation || row.Z),
                })).filter(p => p.code && !isNaN(p.north) && !isNaN(p.east) && !isNaN(p.elevation));

                if (type === 'original') {
                    setOriginalPoints(points);
                    setOriginalFileName(file.name);
                } else {
                    setModifiedPoints(points);
                    setModifiedFileName(file.name);
                }
                toast({ title: 'Ficheiro carregado!', description: `${points.length} pontos lidos de ${file.name}` });
            },
            error: (error) => {
                toast({ title: 'Erro ao ler ficheiro CSV', description: error.message, variant: 'destructive' });
            }
        });
    };

    const handleCalculateVolume = () => {
        if (originalPoints.length === 0 || modifiedPoints.length === 0) {
            toast({ title: 'Ficheiros em falta', description: 'Carregue os ficheiros do terreno primitivo e modificado.', variant: 'destructive' });
            return;
        }

        setIsCalculating(true);
        setVolumeResult(null);

        // Grid Method Calculation
        setTimeout(() => { // Simulate async calculation
            const allX = [...originalPoints.map(p => p.east), ...modifiedPoints.map(p => p.east)];
            const allY = [...originalPoints.map(p => p.north), ...modifiedPoints.map(p => p.north)];
            const minX = Math.min(...allX);
            const maxX = Math.max(...allX);
            const minY = Math.min(...allY);
            const maxY = Math.max(...allY);

            let totalCut = 0;
            let totalFill = 0;
            const cellArea = gridSize * gridSize;

            for (let x = minX; x < maxX; x += gridSize) {
                for (let y = minY; y < maxY; y += gridSize) {
                    const cellOriginalPoints = originalPoints.filter(p => p.east >= x && p.east < x + gridSize && p.north >= y && p.north < y + gridSize);
                    const cellModifiedPoints = modifiedPoints.filter(p => p.east >= x && p.east < x + gridSize && p.north >= y && p.north < y + gridSize);

                    if (cellOriginalPoints.length === 0 || cellModifiedPoints.length === 0) {
                        continue;
                    }

                    const avgOriginalZ = cellOriginalPoints.reduce((sum, p) => sum + p.elevation, 0) / cellOriginalPoints.length;
                    const avgModifiedZ = cellModifiedPoints.reduce((sum, p) => sum + p.elevation, 0) / cellModifiedPoints.length;

                    const heightDiff = avgModifiedZ - avgOriginalZ;
                    const volumeChange = cellArea * heightDiff;

                    if (volumeChange > 0) {
                        totalFill += volumeChange;
                    } else {
                        totalCut += Math.abs(volumeChange);
                    }
                }
            }

            setVolumeResult({
                cut: totalCut,
                fill: totalFill,
                net: totalFill - totalCut,
            });
            setIsCalculating(false);
        }, 500); // Delay to allow UI update
    };


    const chartData = useMemo(() => {
        return [
            ...originalPoints.map(p => ({ ...p, type: 'Primitivo' })),
            ...modifiedPoints.map(p => ({ ...p, type: 'Modificado' })),
        ];
    }, [originalPoints, modifiedPoints]);

    const chartConfig = {
        Primitivo: { label: "Primitivo", color: "hsl(var(--chart-1))" },
        Modificado: { label: "Modificado", color: "hsl(var(--chart-2))" },
    };

    return (
        <div className="pt-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Cálculo de Volumes de Terraplanagem</CardTitle>
                    <CardDescription>Carregue os ficheiros CSV dos levantamentos primitivo e modificado para calcular os volumes de corte e aterro.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-semibold">1. Levantamento Primitivo</h3>
                            <Input type="file" accept=".csv" onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'original')} />
                            {originalFileName && <p className="text-xs text-muted-foreground">Ficheiro: {originalFileName} ({originalPoints.length} pontos)</p>}
                        </div>
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-semibold">2. Levantamento Modificado</h3>
                            <Input type="file" accept=".csv" onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'modified')} />
                            {modifiedFileName && <p className="text-xs text-muted-foreground">Ficheiro: {modifiedFileName} ({modifiedPoints.length} pontos)</p>}
                        </div>
                    </div>
                     <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <div className="flex items-center gap-2">
                             <Label htmlFor="grid-size">Tamanho da Grelha (m)</Label>
                            <Input id="grid-size" type="number" value={gridSize} onChange={e => setGridSize(Number(e.target.value))} className="w-24"/>
                        </div>
                        <Button onClick={handleCalculateVolume} disabled={isCalculating || originalPoints.length === 0 || modifiedPoints.length === 0}>
                            {isCalculating ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                            Calcular Volume
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isCalculating && (
                <div className="flex justify-center items-center h-64 border-2 border-dashed rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4 text-lg font-semibold">A processar os dados...</p>
                </div>
            )}
            
            {volumeResult && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Resultados do Cálculo (Método da Grelha)</CardTitle>
                        <CardDescription>Volumes estimados com base numa grelha de {gridSize}x{gridSize}m.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">Volume de Corte</h4>
                            <p className="text-2xl font-bold">{volumeResult.cut.toFixed(2)} m³</p>
                        </div>
                         <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <h4 className="text-sm font-semibold text-green-700 dark:text-green-300">Volume de Aterro</h4>
                            <p className="text-2xl font-bold">{volumeResult.fill.toFixed(2)} m³</p>
                        </div>
                         <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Balanço Líquido</h4>
                            <p className="text-2xl font-bold">{volumeResult.net.toFixed(2)} m³</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {chartData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Visualização Combinada dos Levantamentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[400px] w-full">
                             <ResponsiveContainer>
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid />
                                    <XAxis type="number" dataKey="east" name="Este" unit="m" domain={['dataMin', 'dataMax']} tickFormatter={(val) => val.toFixed(0)}/>
                                    <YAxis type="number" dataKey="north" name="Norte" unit="m" domain={['dataMin', 'dataMax']} tickFormatter={(val) => val.toFixed(0)}/>
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent 
                                        labelKey='code' 
                                        formatter={(value, name) => {
                                             const formattedValue = typeof value === 'number' ? `${value.toFixed(3)}m` : value;
                                             const nameStr = String(name || '');
                                             const capitalizedName = nameStr.charAt(0).toUpperCase() + nameStr.slice(1);
                                             return [formattedValue, capitalizedName];
                                        }}
                                    />}/>
                                    <Legend />
                                    <Scatter name="Primitivo" data={originalPoints} fill="hsl(var(--chart-1))" />
                                    <Scatter name="Modificado" data={modifiedPoints} fill="hsl(var(--chart-2))" />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
