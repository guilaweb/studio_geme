
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
import { collection, writeBatch, serverTimestamp, doc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserRole } from '@/app/projects/[id]/page';

interface IrradiationsTabProps {
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
  pointName: string;
  angle: string;
  distance: string;
  dz: string;
}

interface CalculatedPoint {
  pointName: string;
  x: number;
  y: number;
  z: number;
}

export default function IrradiationsTab({ projectId, userRole }: IrradiationsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = userRole === 'Editor' || userRole === 'Gestor';

  const [station, setStation] = useState<Station>({ pointName: '', x: 0, y: 0, z: 0 });
  const [readings, setReadings] = useState<Reading[]>([]);
  const [calculatedPoints, setCalculatedPoints] = useState<CalculatedPoint[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStation({ ...station, [e.target.name]: e.target.value });
  };

  const handleReadingChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const newReadings = [...readings];
    newReadings[index] = { ...newReadings[index], [e.target.name]: e.target.value };
    setReadings(newReadings);
  };
  
  const addReadingRow = () => {
    setReadings([...readings, { id: Date.now(), pointName: '', angle: '', distance: '', dz: '' }]);
  };
  
  const removeReadingRow = (index: number) => {
    setReadings(readings.filter((_, i) => i !== index));
  };
  
  const calculateCoordinates = () => {
    const stationX = parseFloat(String(station.x));
    const stationY = parseFloat(String(station.y));
    const stationZ = parseFloat(String(station.z));
  
    if (isNaN(stationX) || isNaN(stationY) || isNaN(stationZ)) {
      toast({ title: 'Coordenadas da Estação Inválidas', variant: 'destructive' });
      return;
    }
  
    const newCalculatedPoints: CalculatedPoint[] = [];
    let hasError = false;
  
    readings.forEach((reading) => {
      const angleRad = (parseFloat(reading.angle) * Math.PI) / 180;
      const distance = parseFloat(reading.distance);
      const dz = parseFloat(reading.dz);
  
      if (isNaN(angleRad) || isNaN(distance) || isNaN(dz) || !reading.pointName) {
        if (!hasError) { // Show toast only once
          toast({ title: 'Dados de Leitura Inválidos', description: `Verifique os dados para o ponto ${reading.pointName || 'sem nome'}.`, variant: 'destructive' });
          hasError = true;
        }
        return;
      }
  
      const pointX = stationX + distance * Math.sin(angleRad);
      const pointY = stationY + distance * Math.cos(angleRad);
      const pointZ = stationZ + dz;
  
      newCalculatedPoints.push({
        pointName: reading.pointName,
        x: pointX,
        y: pointY,
        z: pointZ,
      });
    });
  
    if (!hasError) {
      setCalculatedPoints(newCalculatedPoints);
      toast({ title: 'Cálculo Concluído', description: `${newCalculatedPoints.length} pontos foram calculados.` });
    }
  };

  const handleSaveToCloud = async () => {
    if (!user || calculatedPoints.length === 0) {
      toast({ title: 'Nenhum ponto para salvar', description: 'Calcule as coordenadas antes de salvar.', variant: 'destructive' });
      return;
    }
  
    setIsSubmitting(true);
    const batch = writeBatch(db);
    const pointsCollectionRef = collection(db, 'projects', projectId, 'topoPoints');
  
    calculatedPoints.forEach(point => {
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
      toast({ title: 'Sucesso!', description: `${calculatedPoints.length} pontos foram salvos na Nuvem de Pontos.` });
      // Clear forms
      setStation({ pointName: '', x: 0, y: 0, z: 0 });
      setReadings([]);
      setCalculatedPoints([]);
    } catch (error) {
      console.error("Error saving points:", error);
      toast({ title: 'Erro ao Salvar', description: 'Não foi possível salvar os pontos na base de dados.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="pt-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary"/> Cálculo de Irradiações</CardTitle>
          <CardDescription>Insira os dados da sua estação e as leituras de campo (ângulo e distância) para calcular as coordenadas dos pontos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <fieldset className="p-4 border rounded-lg">
                <legend className="font-semibold px-1 text-lg">Dados da Estação</legend>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="station-x">Coordenada Este (X)</Label>
                        <Input id="station-x" name="x" type="number" placeholder="12345.678" value={station.x} onChange={handleStationChange} disabled={!canEdit}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="station-y">Coordenada Norte (Y)</Label>
                        <Input id="station-y" name="y" type="number" placeholder="98765.432" value={station.y} onChange={handleStationChange} disabled={!canEdit}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="station-z">Cota (Z)</Label>
                        <Input id="station-z" name="z" type="number" placeholder="100.000" value={station.z} onChange={handleStationChange} disabled={!canEdit}/>
                    </div>
                </div>
            </fieldset>

             <fieldset className="p-4 border rounded-lg">
                <legend className="font-semibold px-1 text-lg">Leituras de Campo</legend>
                 <div className="mt-2">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/3">Nome do Ponto</TableHead>
                                <TableHead>Ângulo Horizontal (°)</TableHead>
                                <TableHead>Distância Horizontal (m)</TableHead>
                                <TableHead>Desnível (m)</TableHead>
                                {canEdit && <TableHead className="w-12"></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {readings.map((reading, index) => (
                                <TableRow key={reading.id}>
                                    <TableCell>
                                        <Input name="pointName" placeholder={`Ponto ${index + 1}`} value={reading.pointName} onChange={(e) => handleReadingChange(index, e)} disabled={!canEdit}/>
                                    </TableCell>
                                    <TableCell>
                                        <Input name="angle" type="number" placeholder="35.4567" value={reading.angle} onChange={(e) => handleReadingChange(index, e)} disabled={!canEdit}/>
                                    </TableCell>
                                    <TableCell>
                                        <Input name="distance" type="number" placeholder="50.123" value={reading.distance} onChange={(e) => handleReadingChange(index, e)} disabled={!canEdit}/>
                                    </TableCell>
                                    <TableCell>
                                        <Input name="dz" type="number" placeholder="1.234" value={reading.dz} onChange={(e) => handleReadingChange(index, e)} disabled={!canEdit}/>
                                    </TableCell>
                                    {canEdit && (
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => removeReadingRow(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive"/>
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {canEdit && <Button variant="outline" size="sm" className="mt-4" onClick={addReadingRow}><Plus className="mr-2 h-4 w-4"/>Adicionar Linha</Button>}
                </div>
                 {canEdit && <div className="flex justify-end mt-4"><Button onClick={calculateCoordinates}>Calcular Coordenadas</Button></div>}
             </fieldset>
            
            {calculatedPoints.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pontos Calculados</CardTitle>
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
                                {calculatedPoints.map((point) => (
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
