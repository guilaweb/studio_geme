
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Project } from '@/types/project';

interface AutomationRecipeCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    triggerOptions: string[];
    actionOptions: string[];
    onExecute: (config: any, projectId?: string) => Promise<void>;
    requiresProject?: boolean;
    projects?: Project[];
}

export function AutomationRecipeCard({ title, description, icon: Icon, triggerOptions, actionOptions, onExecute, requiresProject, projects = [] }: AutomationRecipeCardProps) {
    const [isActive, setIsActive] = useState(false);
    const [trigger, setTrigger] = useState(triggerOptions[0]);
    const [action, setAction] = useState(actionOptions[0]);
    const [destination, setDestination] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');


    const handleExecute = async () => {
        setIsRunning(true);
        await onExecute({ trigger, action, destination }, selectedProjectId);
        setIsRunning(false);
    };
    
    return (
        <Card className="flex flex-col">
            <CardHeader className="flex-row items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 {requiresProject && (
                    <div className="space-y-2">
                        <Label htmlFor={`project-${title}`}>Projeto</Label>
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={!isActive}>
                            <SelectTrigger id={`project-${title}`}>
                                <SelectValue placeholder="Selecione um projeto..." />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor={`trigger-${title}`}>Gatilho (Quando?)</Label>
                     <Select value={trigger} onValueChange={setTrigger} disabled={!isActive}>
                        <SelectTrigger id={`trigger-${title}`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {triggerOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`action-${title}`}>Ação (O Quê?)</Label>
                    <Select value={action} onValueChange={setAction} disabled={!isActive}>
                        <SelectTrigger id={`action-${title}`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {actionOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`destination-${title}`}>Destino (Onde?)</Label>
                    <Input id={`destination-${title}`} placeholder="URL da Planilha Google" value={destination} onChange={e => setDestination(e.target.value)} disabled={!isActive}/>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center mt-auto">
                 <div className="flex items-center space-x-2">
                    <Switch id={`active-${title}`} checked={isActive} onCheckedChange={setIsActive} />
                    <Label htmlFor={`active-${title}`}>{isActive ? 'Ativa' : 'Inativa'}</Label>
                </div>
                <Button onClick={handleExecute} disabled={!isActive || isRunning}>
                    {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    {isRunning ? 'A executar...' : 'Executar Agora'}
                </Button>
            </CardFooter>
        </Card>
    );
}
