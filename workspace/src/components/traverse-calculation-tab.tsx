

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Target, Plus, Trash2, Loader2, Send, Footprints } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { collection, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserRole } from '@/app/projects/[id]/page';

interface TraverseCalculationTabProps {
  projectId: string;
  userRole: UserRole | null;
}

interface Station {
  pointName: string;
  x: number;
  y: number;
  z: number;
}

interface Reading {
  id: number;
  toPoint: string;
  angle: string;
  distance: string;
}

interface TraverseStation {
    id: string; // Use string for unique ID
    pointName: string; 
    readings: Reading[];
    backsightAngle?: string;
}

export default function TraverseCalculationTab({ projectId, userRole }: TraverseCalculationTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = userRole === 'Editor' || userRole === 'Gestor';

  const [startPoint, setStartPoint] = useState({ name: 'E1', x: '1000', y: '1000', z: '100' });
  const [startAzimuth, setStartAzimuth] = useState('0');
  const [stations, setStations] = useState<TraverseStation[]>([]);
  const [calculatedStations, setCalculatedStations] = useState<Station[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartPointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartPoint({ ...startPoint, [e.target.name]: e.target.value });
  };
  
  const addStationRow = () => {
    const lastStationName = stations.length > 0 ? stations[stations.length-1].pointName : startPoint.name;
    const nextStationNumMatch = lastStationName.match(/\d+$/);
    const nextStationNum = nextStationNumMatch ? parseInt(nextStationNumMatch[0], 10) + 1 : 1;
    const prefix = lastStationName.replace(/\d+$/, '') || 'E';


    setStations([...stations, { 
        id: `ST${Date.now()}`,
        pointName: `${prefix}${nextStationNum}`, 
        readings: [{id: Date.now(), toPoint: '', angle: '', distance: ''}],
    }]);
  };

  const handleStationNameChange = (index: number, newName: string) => {
    const newStations = [...stations];
    newStations[index].pointName = newName;
    setStations(newStations);
  };
  
  const handleReadingChange = (stationIndex: number, readingIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const newStations = [...stations];
    const newReadings = [...newStations[stationIndex].readings];
    newReadings[readingIndex] = { ...newReadings[readingIndex], [e.target.name]: e.target.value };
    newStations[stationIndex].readings = newReadings;
    setStations(newStations);
  };
  
  const removeStationRow = (index: number) => {
    setStations(stations.filter((_, i) => i !== index));
  };
  
  const calculateTraverse = () => {
    const startX = parseFloat(startPoint.x);
    const startY = parseFloat(startPoint.y);
    const initialAzimuth = parseFloat(startAzimuth);

    if (isNaN(startX) || isNaN(startY) || isNaN(initialAzimuth)) {
        toast({title: "Dados de Partida Inválidos", variant: "destructive"});
        return;
    }
    
    const results: Station[] = [{...startPoint, x: startX, y: startY, z: parseFloat(startPoint.z) || 0}];
    let currentX = startX;
    let currentY = startY;
    let lastAzimuth = initialAzimuth;

    for (const station of stations) {
        if (!station.readings[0] || !station.readings[0].angle || !station.readings[0].distance) {
             toast({title: "Dados Incompletos", description: `Faltam dados de leitura para a estação ${station.pointName}`, variant: "destructive"});
             return;
        }

        const angle = parseFloat(station.readings[0].angle);
        const distance = parseFloat(station.readings[0].distance);

        const newAzimuth = (lastAzimuth + angle) % 360;
        const newAzimuthRad = (newAzimuth * Math.PI) / 180;

        const deltaX = distance * Math.sin(newAzimuthRad);
        const deltaY = distance * Math.cos(newAzimuthRad);

        currentX += deltaX;
        currentY += deltaY;
        
        results.push({
            pointName: station.pointName,
            x: currentX,
            y: currentY,
            z: 0 // Z coordinate is not calculated in this simple model
        });
        
        lastAzimuth = newAzimuth;
    }

    setCalculatedStations(results);
    toast({title: 'Cálculo Concluído', description: `${results.length - 1} novas estações foram calculadas.`});
  };

  const handleSaveToCloud = async () => {
      if (!user || calculatedStations.length <= 1) {
        toast({ title: 'Nenhum ponto para salvar', description: 'Calcule as coordenadas da poligonal antes de salvar.', variant: 'destructive' });
        return;
      }
      setIsSubmitting(true);
      const batch = writeBatch(db);
      const pointsCollectionRef = collection(db, 'projects', projectId, 'topoPoints');
      
      const pointsToSave = calculatedStations.slice(1);

      pointsToSave.forEach(point => {
          const pointRef = doc(pointsCollectionRef);
          batch.set(pointRef, {
              code: point.pointName,
              east: point.x,
              north: point.y,
              elevation: point.z,
              author: { uid: user.uid, displayName: user.displayName || user.email },
              createdAt: serverTimestamp(),
          });
      });

      try {
          await batch.commit();
          toast({ title: 'Sucesso!', description: `${pointsToSave.length} estações foram salvas na Nuvem de Pontos.` });
          setCalculatedStations([]);
          setStations([]);
      } catch (error) {
          console.error("Error saving points:", error);
          toast({ title: 'Erro ao Salvar', description: 'Não foi possível salvar os pontos.', variant: 'destructive' });
      } finally {
          setIsSubmitting(false);
      }
  };


  return (
    <div className="pt-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Footprints className="h-5 w-5 text-primary"/> Cálculo de Poligonal</CardTitle>
          <CardDescription>Insira os dados de campo da sua poligonal para calcular as coordenadas provisórias das estações.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <fieldset className="p-4 border rounded-lg">
                <legend className="font-semibold px-1 text-lg">Ponto e Azimute de Partida</legend>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                    <div className="space-y-2">
                        <Label>Ponto de Partida</Label>
                        <Input name="name" value={startPoint.name} onChange={handleStartPointChange} disabled={!canEdit}/>
                    </div>
                     <div className="space-y-2">
                        <Label>Coordenada Este (X)</Label>
                        <Input name="x" type="number" value={startPoint.x} onChange={handleStartPointChange} disabled={!canEdit}/>
                    </div>
                    <div className="space-y-2">
                        <Label>Coordenada Norte (Y)</Label>
                        <Input name="y" type="number" value={startPoint.y} onChange={handleStartPointChange} disabled={!canEdit}/>
                    </div>
                     <div className="space-y-2">
                        <Label>Azimute de Partida (°)</Label>
                        <Input type="number" value={startAzimuth} onChange={(e) => setStartAzimuth(e.target.value)} disabled={!canEdit}/>
                    </div>
                </div>
            </fieldset>

             <fieldset className="p-4 border rounded-lg">
                <legend className="font-semibold px-1 text-lg">Estações e Leituras</legend>
                 <div className="mt-2 space-y-4">
                    {stations.map((station, stationIndex) => (
                            <div key={station.id} className="p-4 border bg-secondary/50 rounded-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <Label className="font-bold text-base">
                                        Estação: <Input value={station.pointName} onChange={(e) => handleStationNameChange(stationIndex, e.target.value)} className="inline-block w-24 h-9 ml-2" />
                                    </Label>
                                    <Button variant="ghost" size="icon" onClick={() => removeStationRow(stationIndex)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Ponto Visado</Label>
                                        <Input value={stations[stationIndex + 1]?.pointName || 'Fim'} disabled/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Ângulo Horizontal (°)</Label>
                                        <Input name="angle" type="number" value={station.readings[0]?.angle || ''} onChange={(e) => handleReadingChange(stationIndex, 0, e)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Distância (m)</Label>
                                        <Input name="distance" type="number" value={station.readings[0]?.distance || ''} onChange={(e) => handleReadingChange(stationIndex, 0, e)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    {canEdit && <Button variant="outline" size="sm" className="mt-4" onClick={addStationRow}><Plus className="mr-2 h-4 w-4"/>Adicionar Estação</Button>}
                </div>
                 {canEdit && stations.length > 0 && <div className="flex justify-end mt-4"><Button onClick={calculateTraverse}>Calcular Poligonal</Button></div>}
             </fieldset>
            
            {calculatedStations.length > 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Coordenadas Calculadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Ponto</TableHead>
                                    <TableHead>Este (X)</TableHead>
                                    <TableHead>Norte (Y)</TableHead>
                                    <TableHead>Cota (Z)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {calculatedStations.map((point) => (
                                    <TableRow key={point.pointName}>
                                        <TableCell className="font-medium">{point.pointName}</TableCell>
                                        <TableCell>{point.x.toFixed(3)}</TableCell>
                                        <TableCell>{point.y.toFixed(3)}</TableCell>
                                        <TableCell>{point.z.toFixed(3)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <div className="flex justify-end mt-4">
                            <Button onClick={handleSaveToCloud} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Adicionar à Nuvem de Pontos
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

    