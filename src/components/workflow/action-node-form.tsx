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

export function ActionNodeForm() {
    const { selectedNode, updateNodeConfig } = useWorkflowStore();

    if (!selectedNode || selectedNode.type !== 'action') {
        return null;
    }

    const { id, data } = selectedNode;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeConfig(id, { [e.target.name]: e.target.value });
    };

    const handleSelectChange = (value: string) => {
        updateNodeConfig(id, { actionType: value });
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
            <Label htmlFor="actionType">Tipo de Ação</Label>
            <Select
            name="actionType"
            value={data.actionType || ''}
            onValueChange={handleSelectChange}
            >
            <SelectTrigger>
                <SelectValue placeholder="Selecione um tipo de ação..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="send_email">Enviar Email (em breve)</SelectItem>
                <SelectItem value="update_task">Atualizar Tarefa (em breve)</SelectItem>
                <SelectItem value="add_to_sheet">Adicionar a Planilha</SelectItem>
                 <SelectItem value="send_notification">Enviar Notificação</SelectItem>
            </SelectContent>
            </Select>
        </div>
        {data.actionType === 'add_to_sheet' && (
             <div className="space-y-2">
                <Label htmlFor="destinationUrl">URL da Planilha Google</Label>
                <Input
                    id="destinationUrl"
                    name="destinationUrl"
                    value={data.destinationUrl || ''}
                    onChange={handleInputChange}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                />
            </div>
        )}
        </div>
    );
}
