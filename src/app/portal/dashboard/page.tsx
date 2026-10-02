'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, MessageSquare, Send, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useRequireAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project } from '@/types/project'; // Using a simplified project type for client view


// A simplified header for the client portal
function PortalHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <Link href="/portal/dashboard" className="flex items-center space-x-2">
           <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="hsl(var(--primary))"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <span className="font-headline text-lg font-bold">Portal do Cliente</span>
        </Link>
        <div className="flex items-center space-x-2">
            <Button variant="outline" asChild>
                <Link href="/portal">Sair</Link>
            </Button>
        </div>
      </div>
    </header>
  );
}


export default function ClientDashboardPage() {
    const { user, loading: authLoading } = useRequireAuth('/portal');
    const [projects, setProjects] = useState<Project[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);

    useEffect(() => {
        if (!user || user.role !== 'cliente') {
            if (!authLoading) setLoadingProjects(false);
            return;
        }

        setLoadingProjects(true);
        const projectsQuery = query(
            collection(db, 'projects'),
            where('clientEmail', '==', user.email)
        );

        const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
            const userProjects = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Project));
            setProjects(userProjects);
            setLoadingProjects(false);
        }, (error) => {
            console.error("Error fetching client projects:", error);
            setLoadingProjects(false);
        });

        return () => unsubscribe();
    }, [user, authLoading]);

    if (authLoading || loadingProjects) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-secondary/50">
                <PortalHeader />
                <main className="flex flex-1 items-center justify-center">
                    <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                    A carregar os seus projetos...
                </main>
            </div>
        );
    }
    
    if (user?.role !== 'cliente') {
         return (
            <div className="flex min-h-screen w-full flex-col bg-secondary/50">
                <PortalHeader />
                <main className="flex-1 container mx-auto py-8 space-y-8 text-center">
                     <h1 className="text-3xl font-bold font-headline">Acesso Negado</h1>
                     <p className="text-muted-foreground">Esta área é reservada para clientes.</p>
                </main>
            </div>
        );
    }
    
    if (projects.length === 0) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-secondary/50">
                <PortalHeader />
                <main className="flex-1 container mx-auto py-8 space-y-8 text-center">
                     <h1 className="text-3xl font-bold font-headline">Bem-vindo(a), {user.displayName || user.email}!</h1>
                     <p className="text-muted-foreground">Não foram encontrados projetos associados ao seu utilizador.</p>
                     <p className="text-sm text-muted-foreground">Se acredita que isto é um erro, por favor, entre em contacto com o gestor do seu projeto.</p>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-secondary/50">
            <PortalHeader />
            <main className="flex-1 container mx-auto py-8 space-y-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Os Seus Projetos</h1>
                    <p className="text-muted-foreground">Selecione um projeto para ver os detalhes.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(project => (
                        <Link href={`/portal/projects/${project.id}`} key={project.id}>
                            <Card className="hover:border-primary transition-colors h-full flex flex-col">
                                <CardHeader>
                                    <CardTitle>{project.name}</CardTitle>
                                    <CardDescription>
                                        Status: <span className="capitalize font-medium text-foreground">{project.status}</span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                     <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm text-muted-foreground">Progresso Geral</label>
                                            <span className="text-xs font-semibold">{Math.round(project.progress || 0)}%</span>
                                        </div>
                                        <Progress value={project.progress || 0} />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}