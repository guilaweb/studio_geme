
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileCheck2 } from 'lucide-react';
import { ChecklistItem, ChecklistItemStatus } from '@/types/post-construction';
import { MarkdownViewer } from './markdown-viewer';

interface FvsTabProps {
    content: string | null;
}

export default function FvsTab({ content }: FvsTabProps) {
    
    if (!content) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <p>Selecione um template de FVS ou Checklist no Gestor de Documentos para o visualizar aqui.</p>
                <p className="text-xs mt-2">Dica: Os templates devem ser ficheiros com a extensão '.md'.</p>
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Visualizador de Ficha de Verificação de Serviço (FVS)</CardTitle>
                <CardDescription>
                    Pré-visualize o seu template de checklist. O preenchimento é feito no separador de "Vistorias e Entregas".
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="p-4 border rounded-lg">
                    <MarkdownViewer markdownContent={content} />
               </div>
            </CardContent>
        </Card>
    );
}
