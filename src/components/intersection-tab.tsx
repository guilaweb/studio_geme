
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

interface IntersectionTabProps {
  projectId: string;
  userRole: UserRole | null;
}

interface Point {
  x: string;
  y: string;
}

interface CalculatedPoint {
  pointName: string;
  x: number;
  y: number;
  z: number;
}

export default function IntersectionTab({ projectId, userRole }: IntersectionTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = userRole === 'Editor' || userRole === 'Gestor';

  const [line1, setLine1] = useState<{ p1: Point; p2: Point }>({
    p1: { x: '', y: '' },
    p2: { x: '', y: '' },
  });
  const [line2, setLine2] = useState<{ p3: Point; p4: Point }>({
    p3: { x: '', y: '' },
    p4: { x: '', y: '' },
  });
  const [intersectionPoint, setIntersectionPoint] = useState<CalculatedPoint | null>(null);
  const [pointName, setPointName] = useState('I1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLineChange = (line: 'line1' | 'line2', point: 'p1' | 'p2' | 'p3' | 'p4', axis: 'x' | 'y', value: string) => {
    if (line === 'line1') {
      setLine1(prev => ({ ...prev, [point]: { ...prev[point as 'p1' | 'p2'], [axis]: value } }));
    } else {
      setLine2(prev => ({ ...prev, [point]: { ...prev[point as 'p3' | 'p4'], [axis]: value } }));
    }
  };

  const calculateIntersection = () => {
    const { p1, p2 } = line1;
    const { p3, p4 } = line2;

    const x1 = parseFloat(p1.x), y1 = parseFloat(p1.y);
    const x2 = parseFloat(p2.x), y2 = parseFloat(p2.y);
    const x3 = parseFloat(p3.x), y3 = parseFloat(p3.y);
    const x4 = parseFloat(p4.x), y4 = parseFloat(p4.y);

    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2) || isNaN(x3) || isNaN(y3) || isNaN(x4) || isNaN(y4)) {
      toast({ title: 'Dados Inválidos', description: 'Por favor, preencha todas as coordenadas com números válidos.', variant: 'destructive' });
      return;
    }

    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    if (den === 0) {
      toast({ title: 'As retas são paralelas', description: 'Não há ponto de interseção.', variant: 'destructive' });
      setIntersectionPoint(null);
      return;
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    
      const intersectX = x1 + t * (x2 - x1);
      const intersectY = y1 + t * (y2 - y1);
      
      setIntersectionPoint({
        pointName,
        x: intersectX,
        y: intersectY,
        z: 0 // Z is not calculated in this 2D intersection
      });
      toast({ title: 'Cálculo Concluído', description: `Ponto de interseção ${pointName} calculado.` });
  };
  
   const handleSaveToCloud = async () => {
    if (!user || !intersectionPoint) {
      toast({ title: 'Nenhum ponto para salvar', description: 'Calcule as coordenadas antes de salvar.', variant: 'destructive' });
      return;
    }
  
    setIsSubmitting(true);
    try {
        await addDoc(collection(db, 'projects', projectId, 'topoPoints'), {
            code: intersectionPoint.pointName,
            east: intersectionPoint.x,
            north: intersectionPoint.y,
            elevation: intersectionPoint.z, 
            author: { uid: user.uid, displayName: user.displayName || user.email },
            createdAt: serverTimestamp(),
      });
      toast({ title: 'Sucesso!', description: `Ponto ${intersectionPoint.pointName} foi salvo na Nuvem de Pontos.` });
    } catch (error) {
      console.error("Error saving point:", error);
      toast({ title: 'Erro ao Salvar', description: 'Não foi possível salvar o ponto na base de dados.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="pt-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Cálculo por Interseção de Retas
          </CardTitle>
          <CardDescription>Defina duas retas (cada uma por dois pontos) para encontrar as coordenadas do seu ponto de interseção.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <fieldset className="p-4 border rounded-lg space-y-4">
              <legend className="font-semibold px-1 text-lg">Reta 1</legend>
              <div className="space-y-2">
                <Label>Ponto 1</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Este (X)" value={line1.p1.x} onChange={(e) => handleLineChange('line1', 'p1', 'x', e.target.value)} />
                  <Input type="number" placeholder="Norte (Y)" value={line1.p1.y} onChange={(e) => handleLineChange('line1', 'p1', 'y', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ponto 2</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Este (X)" value={line1.p2.x} onChange={(e) => handleLineChange('line1', 'p2', 'x', e.target.value)} />
                  <Input type="number" placeholder="Norte (Y)" value={line1.p2.y} onChange={(e) => handleLineChange('line1', 'p2', 'y', e.target.value)} />
                </div>
              </div>
            </fieldset>
            <fieldset className="p-4 border rounded-lg space-y-4">
              <legend className="font-semibold px-1 text-lg">Reta 2</legend>
              <div className="space-y-2">
                <Label>Ponto 3</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Este (X)" value={line2.p3.x} onChange={(e) => handleLineChange('line2', 'p3', 'x', e.target.value)} />
                  <Input type="number" placeholder="Norte (Y)" value={line2.p3.y} onChange={(e) => handleLineChange('line2', 'p3', 'y', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ponto 4</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Este (X)" value={line2.p4.x} onChange={(e) => handleLineChange('line2', 'p4', 'x', e.target.value)} />
                  <Input type="number" placeholder="Norte (Y)" value={line2.p4.y} onChange={(e) => handleLineChange('line2', 'p4', 'y', e.target.value)} />
                </div>
              </div>
            </fieldset>
          </div>
          <div className="flex justify-center mt-4">
            <Button onClick={calculateIntersection}>Calcular Interseção</Button>
          </div>

          {intersectionPoint && (
            <Card>
              <CardHeader>
                <CardTitle>Ponto de Interseção Calculado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <Label>Nome do Ponto</Label>
                            <Input value={pointName} onChange={(e) => setPointName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Este (X)</Label>
                            <Input value={intersectionPoint.x.toFixed(3)} readOnly />
                        </div>
                        <div className="space-y-1">
                            <Label>Norte (Y)</Label>
                            <Input value={intersectionPoint.y.toFixed(3)} readOnly />
                        </div>
                         <div className="space-y-1">
                            <Label>Cota (Z)</Label>
                            <Input value="N/A" readOnly />
                        </div>
                    </div>
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
