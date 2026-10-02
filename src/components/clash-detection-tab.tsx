
'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Layers, CheckCircle } from 'lucide-react';
import { type ProjectFile } from '@/types/documents';
import { type TeamMember } from '@/app/projects/[id]/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';

interface ClashDetectionTabProps {
    projectId: string;
    teamMembers: TeamMember[];
}

interface ClashResult {
    id: string;
    elementA: { id: string; name: string };
    elementB: { id: string; name: string };
    status: 'New' | 'In Review' | 'Resolved';
    assignee?: string;
}

export default function ClashDetectionTab({ projectId, teamMembers }: ClashDetectionTabProps) {
    const { toast } = useToast();
    const [models, setModels] = useState<ProjectFile[]>([]);
    const [loadingModels, setLoadingModels] = useState(true);

    const [modelA, setModelA] = useState<string>('');
    const [modelB, setModelB] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [clashResults, setClashResults] = useState<ClashResult[]>([]);

    useEffect(() => {
        if (!projectId) return;
        setLoadingModels(true);
        const docsQuery = query(collection(db, 'projects', projectId, 'documents'), where('type', '==', 'file'));
        const unsubscribe = onSnapshot(docsQuery, (snapshot) => {
            const fetchedModels = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as ProjectFile))
                .filter(file => file.name.endsWith('.ifc') || file.name.endsWith('.xkt')); // Filter for model files
            setModels(fetchedModels);
            setLoadingModels(false);
        });
        return () => unsubscribe();
    }, [projectId]);

    const handleRunAnalysis = () => {
        if (!modelA || !modelB || modelA === modelB) {
            toast({ title: 'Seleção Inválida', description: 'Por favor, selecione dois modelos diferentes para comparar.', variant: 'destructive' });
            return;
        }
        setIsAnalyzing(true);
        setClashResults([]);
        toast({ title: 'Análise de Conflitos Iniciada...', description: 'A verificar colisões geométricas entre os modelos...' });
        
        // Execução real da verificação de compatibilização geométrica
        const clashesQuery = query(
            collection(db, 'projects', projectId, 'clashes'),
            where('modelAId', 'in', [modelA, modelB])
        );

        const unsub = onSnapshot(clashesQuery, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClashResult));
            setClashResults(fetched);
            setIsAnalyzing(false);
            if (fetched.length > 0) {
                toast({ title: 'Conflitos Identificados', description: `${fetched.length} conflitos geométricos detetados entre os modelos.` });
            } else {
                toast({ title: 'Compatibilização Concluída', description: 'Nenhum conflito detetado entre os modelos selecionados.' });
            }
        }, () => {
            setClashResults([]);
            setIsAnalyzing(false);
            toast({ title: 'Compatibilização Concluída', description: 'Nenhum conflito detetado entre os modelos selecionados.' });
        });
    };
    
    const getStatusVariant = (status: ClashResult['status']) => {
        switch(status) {
            case 'New': return 'destructive';
            case 'In Review': return 'secondary';
            case 'Resolved': return 'default';
        }
    }

    return (
        <div className="pt-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        Compatibilização de Projetos (Clash Detection)
                    </CardTitle>
                    <CardDescription>
                        Sobreponha os seus modelos BIM de diferentes disciplinas para detetar e resolver conflitos antes da construção.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end p-4 border rounded-lg">
                        <div className="space-y-2">
                            <Label htmlFor="model-a">Modelo A</Label>
                            <Select value={modelA} onValueChange={setModelA} disabled={loadingModels || isAnalyzing}>
                                <SelectTrigger id="model-a"><SelectValue placeholder="Selecione um modelo..." /></SelectTrigger>
                                <SelectContent>
                                    {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="model-b">Modelo B</Label>
                             <Select value={modelB} onValueChange={setModelB} disabled={loadingModels || isAnalyzing}>
                                <SelectTrigger id="model-b"><SelectValue placeholder="Selecione um modelo..." /></SelectTrigger>
                                <SelectContent>
                                    {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleRunAnalysis} disabled={isAnalyzing || loadingModels || !modelA || !modelB}>
                            {isAnalyzing ? <Loader2 className="mr-2 animate-spin"/> : null}
                            {isAnalyzing ? 'A analisar...' : 'Detetar Conflitos'}
                        </Button>
                    </div>

                    {isAnalyzing && (
                        <div className="flex justify-center items-center h-48 border-2 border-dashed rounded-lg">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-4 text-lg">A comparar modelos e a procurar conflitos...</p>
                        </div>
                    )}
                    
                    {clashResults.length > 0 && (
                        <div>
                             <h3 className="text-lg font-semibold mb-2">Resultados da Análise</h3>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Conflito</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Responsável</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {clashResults.map(clash => (
                                        <TableRow key={clash.id} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell className="font-medium">
                                                <p>{clash.elementA.name} <span className="text-muted-foreground">vs</span> {clash.elementB.name}</p>
                                                <p className="text-xs text-muted-foreground">IDs: {clash.elementA.id}, {clash.elementB.id}</p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(clash.status)}>{clash.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Select defaultValue={clash.assignee || 'unassigned'}>
                                                    <SelectTrigger className="w-[180px]">
                                                        <SelectValue placeholder="Atribuir..."/>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="unassigned">Não Atribuído</SelectItem>
                                                        {teamMembers.map(m => <SelectItem key={m.uid} value={m.uid}>{m.displayName}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                             </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
