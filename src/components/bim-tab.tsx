
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { ProjectFile } from '@/types/documents';
import type { Project } from '@/types/project';

const BimViewer = dynamic(() => import('./BimViewer'), { ssr: false, loading: () => <div className="flex h-full w-full items-center justify-center bg-secondary"><Loader2 className="h-8 w-8 animate-spin" /></div> });

interface BimTabProps {
    projectId: string;
}

export default function BimTab({ projectId }: BimTabProps) {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const projectRef = doc(db, 'projects', projectId);
        const unsubscribe = onSnapshot(projectRef, (docSnap) => {
            if (docSnap.exists()) {
                setProject({ id: docSnap.id, ...docSnap.data() } as Project);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId]);

    const modelUrl = project?.modelUrl;
    // Assume metaModelUrl has a predictable pattern based on modelUrl.
    const metaModelUrl = modelUrl ? `${modelUrl}.meta.json` : undefined;

    return (
        <div className="p-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Visualizador BIM</CardTitle>
                    <CardDescription>Carregue, visualize e inspecione os seus modelos 3D. Selecione o modelo a visualizar nas Definições do Projeto.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[70vh] border rounded-lg overflow-hidden bg-secondary">
                        <BimViewer 
                            modelUrl={modelUrl}
                            metaModelUrl={metaModelUrl}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
