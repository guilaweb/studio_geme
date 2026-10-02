'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { type ProductionLog } from '@/types/mining';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Truck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DatePicker } from './ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { format } from 'date-fns';

interface ProductionControlTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function ProductionControlTab({ projectId, userRole }: ProductionControlTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Editor' || userRole === 'Gestor' || userRole === 'Mestre de Obra';

    const [logs, setLogs] = useState<ProductionLog[]>([]);
    const [loading, setLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [shift, setShift] = useState<'Dia' | 'Noite'>('Dia');
    const [material, setMaterial] = useState('');
    const [tonnage, setTonnage] = useState('');
    const [grade, setGrade] = useState('');
    const [sourceLocation, setSourceLocation] = useState('');
    const [destination, setDestination] = useState('');

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'production-logs'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as any).toDate(),
            } as ProductionLog));
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching production logs:", error);
            toast({ title: 'Erro ao carregar registos de produção', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, toast]);

    const resetForm = () => {
        setDate(new Date());
        setShift('Dia');
        setMaterial('');
        setTonnage('');
        setGrade('');
        setSourceLocation('');
        setDestination('');
        setIsDialogOpen(false);
    };

    const handleSubmit = async () => {
        if (!canEdit || !user) return;
        if (!date || !material.trim() || !tonnage || !sourceLocation.trim() || !destination.trim()) {
            toast({ title: 'Campos obrigatórios em falta', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'projects', projectId, 'production-logs'), {
                date,
                shift,
                material,
                tonnage: parseFloat(tonnage),
                grade: grade ? parseFloat(grade) : null,
                sourceLocation,
                destination,
                author: {
                    uid: user.uid,
                    displayName: user.displayName || user.email,
                },
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Registo de produção adicionado!' });
            resetForm();
        } catch (error) {
            console.error("Error adding production log:", error);
            toast({ title: 'Erro ao adicionar registo', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Card>
                <CardHeader className="flex-row items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary"/> Controlo de Produção Mineira</CardTitle>
                        <CardDescription>Registe e acompanhe a produção diária da mina, incluindo material, tonelagem e teor.</CardDescription>
                    </div>
                    {canEdit && (
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2"/>Novo Registo</Button>
                        </DialogTrigger>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Turno</TableHead>
                                    <TableHead>Material</TableHead>
                                    <TableHead>Origem</TableHead>
                                    <TableHead>Destino</TableHead>
                                    <TableHead className="text-right">Tonelagem</TableHead>
                                    <TableHead className="text-right">Teor (%)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">Nenhum registo de produção encontrado.</TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell>{format(log.date, 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>{log.shift}</TableCell>
                                            <TableCell>{log.material}</TableCell>
                                            <TableCell>{log.sourceLocation}</TableCell>
                                            <TableCell>{log.destination}</TableCell>
                                            <TableCell className="text-right font-medium">{log.tonnage.toLocaleString('pt-AO')} t</TableCell>
                                            <TableCell className="text-right">{log.grade?.toFixed(2) || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Novo Registo de Produção</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Data</Label>
                            <DatePicker date={date} setDate={setDate} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="shift">Turno</Label>
                            <Select value={shift} onValueChange={(v) => setShift(v as 'Dia' | 'Noite')}>
                                <SelectTrigger id="shift"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Dia">Dia</SelectItem>
                                    <SelectItem value="Noite">Noite</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="material">Material</Label>
                            <Input id="material" value={material} onChange={e => setMaterial(e.target.value)} placeholder="Ex: Minério de Ferro, Estéril"/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="tonnage">Tonelagem</Label>
                            <Input id="tonnage" type="number" value={tonnage} onChange={e => setTonnage(e.target.value)} placeholder="1500"/>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="grade">Teor (%) (Opcional)</Label>
                        <Input id="grade" type="number" value={grade} onChange={e => setGrade(e.target.value)} placeholder="Ex: 62.5"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="source">Origem</Label>
                            <Input id="source" value={sourceLocation} onChange={e => setSourceLocation(e.target.value)} placeholder="Ex: Frente de Lavra B2"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="destination">Destino</Label>
                            <Input id="destination" value={destination} onChange={e => setDestination(e.target.value)} placeholder="Ex: Stockpile ROM"/>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                        Adicionar Registo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
