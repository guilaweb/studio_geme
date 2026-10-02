'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWorkflowStore } from '@/stores/workflow-store';

export function IfNodeForm() {
    const { selectedNode, updateNodeConfig } = useWorkflowStore();

    if (!selectedNode || selectedNode.type !== 'if') {
        return null;
    }
    
    const { id, data } = selectedNode;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeConfig(id, { [e.target.name]: e.target.value });
    };

    return (
        <div className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="label">Rótulo do Nó</Label>
            <Input
            id="label"
            name="label"
            value={data.label || ''}
            onChange={handleInputChange}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="condition">Condição</Label>
            <Input
            id="condition"
            name="condition"
            value={data.condition || ''}
            onChange={handleInputChange}
            placeholder="Ex: {{data.valor}} > 5000"
            />
            <p className="text-xs text-muted-foreground">Use a sintaxe de Handlebars para aceder a dados de nós anteriores.</p>
        </div>
        </div>
    );
}
