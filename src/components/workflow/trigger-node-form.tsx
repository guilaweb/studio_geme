'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkflowStore } from '@/stores/workflow-store';

export function TriggerNodeForm() {
    const { selectedNode, updateNodeConfig } = useWorkflowStore();

    if (!selectedNode || selectedNode.type !== 'trigger') {
        return null;
    }

    const { id, data } = selectedNode;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeConfig(id, { [e.target.name]: e.target.value });
    };

    const handleSelectChange = (value: string) => {
        updateNodeConfig(id, { triggerType: value });
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
            <Label htmlFor="triggerType">Tipo de Gatilho</Label>
            <Select
            name="triggerType"
            value={data.triggerType || ''}
            onValueChange={handleSelectChange}
            >
            <SelectTrigger>
                <SelectValue placeholder="Selecione um tipo de gatilho..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="on_status_change">Mudança de Status</SelectItem>
                <SelectItem value="on_record_created">Novo Registro Criado</SelectItem>
                <SelectItem value="on_schedule">Agendamento</SelectItem>
            </SelectContent>
            </Select>
        </div>
        </div>
    );
}
