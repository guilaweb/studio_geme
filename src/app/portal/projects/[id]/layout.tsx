
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-auth';
import type { Project } from '@/types/project';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TABS = [
  { id: 'dashboard', label: 'Visão Geral' },
  { id: 'transmittals', label: 'Submissões' },
  { id: 'comunicacao', label: 'Comunicação' },
  { id: 'financeiro', label: 'Financeiro' },
];

function PortalHeader({ project }: { project: Project | null }) {
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
          {project && (
            <>
              <span className="mx-2 text-muted-foreground">/</span>
              <span className="font-semibold text-muted-foreground">{project.name}</span>
            </>
          )}
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

export default function ClientProjectLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = React.use(params);
  const { user, loading: authLoading } = useRequireAuth('/portal');
  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const pathname = usePathname();
  
  const projectId = resolvedParams.id;

  useEffect(() => {
    if (!projectId) return;

    const projectRef = doc(db, 'projects', projectId);
    const unsubscribe = onSnapshot(projectRef, (docSnap) => {
        if (docSnap.exists()) {
            setProject({ id: docSnap.id, ...docSnap.data() } as Project);
        } else {
            setProject(null);
        }
        setLoadingProject(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  if (authLoading || loadingProject) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-secondary/50">
            <PortalHeader project={null} />
            <main className="flex flex-1 items-center justify-center">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                A carregar os detalhes do projeto...
            </main>
        </div>
    );
  }

  if (!project || (user && user.role === 'cliente' && user.email !== project.clientEmail)) {
      return (
         <div className="flex min-h-screen w-full flex-col bg-secondary/50">
            <PortalHeader project={null}/>
            <main className="flex-1 container mx-auto py-8 space-y-8 text-center">
                 <h1 className="text-3xl font-bold font-headline">Acesso Negado</h1>
                 <p className="text-muted-foreground">Não foi possível encontrar este projeto ou você não tem permissão para o visualizar.</p>
                  <Button asChild>
                    <Link href="/portal/dashboard">Voltar</Link>
                </Button>
            </main>
        </div>
      )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-secondary/50">
        <PortalHeader project={project} />
        <main className="flex-1 container mx-auto py-8">
             <div className="border-b mb-6">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {TABS.map(tab => (
                         <Link
                            key={tab.id}
                            href={`/portal/projects/${projectId}/${tab.id}`}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                pathname.includes(`/${tab.id}`) || (tab.id === 'dashboard' && !TABS.some(t => pathname.includes(`/${t.id}`)))
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                            }`}
                        >
                           {tab.label}
                        </Link>
                    ))}
                </nav>
            </div>
            {children}
        </main>
    </div>
  );
}
