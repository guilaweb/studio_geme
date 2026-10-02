
'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { collection, onSnapshot, query, where, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { format } from 'date-fns';

import type { Project } from '@/types/project';
import type { DailyReport } from '@/types/daily-reports';
import type { Transmittal, TransmittalStatus } from '@/types/collaboration';
import { ClientCommunicationTab } from '@/components/client-communication-tab';
import type { Contract, ContractAmendment, ClientInvoice } from '@/types/finance';
import ClientFinanceTab from '@/components/client/finance-tab';


const getStatusVariant = (status: TransmittalStatus) => {
    switch(status) {
        case 'Aprovado': return 'default';
        case 'Enviado': return 'secondary';
        case 'Em Revisão': return 'outline';
        case 'Rejeitado':
        case 'Aprovado com Comentários':
            return 'destructive';
        default: return 'outline';
    }
};

const DashboardView = ({ project, dailyReports, transmittals }: { project: Project, dailyReports: DailyReport[], transmittals: Transmittal[] }) => {
    const recentPhotos = dailyReports
        .flatMap(report => report.photoUrls || [])
        .slice(0, 5);
        
    const pendingTransmittals = transmittals.filter(t => t.status === 'Enviado' || t.status === 'Em Revisão');

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Progresso Geral do Projeto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Progress value={project.progress || 0} />
                    <p className="text-right text-lg font-bold">{Math.round(project.progress || 0)}%</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Galeria de Fotos Recentes</CardTitle>
                    <CardDescription>Uma visão rápida do progresso visual da obra.</CardDescription>
                </CardHeader>
                <CardContent>
                    {recentPhotos.length > 0 ? (
                        <Carousel className="w-full max-w-full">
                            <CarouselContent>
                                {recentPhotos.map((photo, index) => (
                                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                                    <div className="relative aspect-video w-full">
                                    <Image src={photo.url} alt={photo.name} fill className="object-cover rounded-lg" />
                                    </div>
                                </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious />
                            <CarouselNext />
                        </Carousel>
                    ) : (
                        <p className="text-center text-sm text-muted-foreground">Nenhuma foto recente encontrada nos diários de obra.</p>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                 <CardHeader>
                    <CardTitle>Documentos para Sua Revisão</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Assunto</TableHead>
                                <TableHead>Data de Envio</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingTransmittals.length > 0 ? pendingTransmittals.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell>{t.subject}</TableCell>
                                    <TableCell>{format(t.createdAt, 'dd/MM/yyyy')}</TableCell>
                                    <TableCell><Badge variant={getStatusVariant(t.status)}>{t.status}</Badge></TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">Nenhum documento pendente de revisão.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

const TransmittalsView = ({ transmittals }: { transmittals: Transmittal[] }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Submissões de Documentos</CardTitle>
                <CardDescription>Consulte e responda aos documentos enviados para a sua revisão e aprovação.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Assunto</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>De</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Ficheiros</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transmittals.length > 0 ? transmittals.map(t => (
                            <TableRow key={t.id}>
                                <TableCell className="font-medium">{t.subject}</TableCell>
                                <TableCell>{format(t.createdAt, 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{t.from.displayName}</TableCell>
                                <TableCell><Badge variant={getStatusVariant(t.status)}>{t.status}</Badge></TableCell>
                                <TableCell className="text-right">{t.items.length}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">Nenhuma submissão encontrada.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function ClientProjectPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
    const [transmittals, setTransmittals] = useState<Transmittal[]>([]);
    const [contract, setContract] = useState<Contract | null>(null);
    const [amendments, setAmendments] = useState<ContractAmendment[]>([]);
    const [clientInvoices, setClientInvoices] = useState<ClientInvoice[]>([]);
    const [loading, setLoading] = useState(true);

    const activeTab = pathname.split('/').pop() || 'dashboard';

    useEffect(() => {
        if (!projectId || !user?.uid) {
            // If we have no user, don't even try to load. The layout will redirect.
            if (!user) setLoading(false);
            return;
        };

        setLoading(true);
        const projectRef = doc(db, 'projects', projectId);

        const unsubscribes = [
            onSnapshot(projectRef, (docSnap) => {
                if (docSnap.exists()) {
                    setProject({ id: docSnap.id, ...docSnap.data() } as Project);
                } else {
                    toast({title: "Projeto não encontrado.", variant: "destructive"});
                    router.push('/portal/dashboard');
                }
            }),
            onSnapshot(query(collection(db, 'projects', projectId, 'daily-reports'), orderBy('date', 'desc'), where('photoUrls', '!=', [])), (snapshot) => {
                setDailyReports(snapshot.docs.map(d => ({ ...d.data(), date: (d.data().date as Timestamp).toDate() } as DailyReport)));
            }),
            onSnapshot(query(collection(db, 'projects', projectId, 'transmittals'), where('to', 'array-contains', { uid: user.uid, displayName: user.displayName, email: user.email, role: user.role }), orderBy('createdAt', 'desc')), (snapshot) => {
                 setTransmittals(snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: (doc.data().createdAt as Timestamp).toDate(),
                    history: (doc.data().history || []).map((h: any) => ({
                        ...h,
                        updatedAt: (h.updatedAt as Timestamp).toDate(),
                    }))
                } as Transmittal)));
            }),
            onSnapshot(doc(db, 'projects', projectId, 'contracts', 'main'), (docSnap) => {
                setContract(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Contract : null);
            }),
            onSnapshot(query(collection(db, 'projects', projectId, 'contractAmendments'), orderBy('effectiveDate', 'desc')), (snapshot) => {
                setAmendments(snapshot.docs.map(d => ({ ...d.data(), id: d.id, effectiveDate: (d.data().effectiveDate as Timestamp).toDate() } as unknown as ContractAmendment)));
            }),
            onSnapshot(query(collection(db, 'projects', projectId, 'clientInvoices'), orderBy('issueDate', 'desc')), (snapshot) => {
                setClientInvoices(snapshot.docs.map(d => ({ ...d.data(), id: d.id, issueDate: (d.data().issueDate as Timestamp).toDate(), dueDate: (d.data().dueDate as Timestamp).toDate() } as ClientInvoice)));
            })
        ];
        
        Promise.all([
            getDoc(projectRef)
        ]).finally(() => setLoading(false));

        return () => unsubscribes.forEach(unsub => unsub());

    }, [projectId, user, toast, router]);

    if (loading || !project) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <Loader2 className="animate-spin h-8 w-8" />
            </div>
        );
    }
    
    const renderContent = () => {
        switch(activeTab) {
            case 'financeiro':
                 return <ClientFinanceTab contract={contract} amendments={amendments} invoices={clientInvoices} />;
            case 'comunicacao':
                return <ClientCommunicationTab projectId={projectId} />;
            case 'transmittals':
                return <TransmittalsView transmittals={transmittals} />;
            case 'dashboard':
            case 'projects': // The root slug can sometimes be 'projects'
            default:
                return <DashboardView project={project} dailyReports={dailyReports} transmittals={transmittals}/>;
        }
    }

    return <div>{renderContent()}</div>;
}
