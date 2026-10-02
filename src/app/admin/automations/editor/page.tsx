'use client';

import 'reactflow/dist/style.css';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  getConnectedEdges,
  getIncomers,
  getOutgoers,
} from 'reactflow';

import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Play, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { nodeTypes } from '@/components/workflow/node-types';
import { Sidebar } from '@/components/workflow/sidebar';
import { TriggerNodeForm } from '@/components/workflow/trigger-node-form';
import { ActionNodeForm } from '@/components/workflow/action-node-form';
import { IfNodeForm } from '@/components/workflow/if-node-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { runAutomationFlow } from '@/ai/flows/automation-flow';
import { useWorkflowStore } from '@/stores/workflow-store';

let id = 0;
const getId = () => `dnd-node_${id++}`;

const EditorCanvas = () => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { screenToFlowPosition } = useReactFlow();
    const { toast } = useToast();

    // Zustand store integration
    const {
        nodes,
        edges,
        selectedNode,
        onNodesChange,
        onEdgesChange,
        setNodes,
        setEdges,
        setSelectedNode,
    } = useWorkflowStore();

    // State for the top control bar
    const [workflowName, setWorkflowName] = useState('Novo Workflow de Automação');
    const [isWorkflowActive, setIsWorkflowActive] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        const handlePaneClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // Deselect node if clicking on the pane
            if (target.classList.contains('react-flow__pane')) {
                setSelectedNode(null);
            }
        };

        const pane = document.querySelector('.react-flow__pane');
        pane?.addEventListener('click', handlePaneClick as EventListener);
        
        return () => {
            pane?.removeEventListener('click', handlePaneClick as EventListener);
        };
    }, [setSelectedNode]);

    const onConnect = useCallback(
        (params: Edge | Connection) => setEdges(addEdge(params, edges)),
        [setEdges, edges],
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            if (!reactFlowWrapper.current) {
                return;
            }

            const type = event.dataTransfer.getData('application/reactflow');
            if (typeof type === 'undefined' || !type) {
                return;
            }
            
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
            
            let label = `Novo nó ${type}`;
            if (type === 'trigger') label = 'Novo Gatilho';
            if (type === 'action') label = 'Nova Ação';
            if (type === 'if') label = 'Nova Condição';

            const newNode: Node = {
                id: getId(),
                type,
                data: { label },
                position,
            };

            setNodes([...nodes, newNode]);
        },
        [screenToFlowPosition, setNodes, nodes]
    );

    const onNodeClick = (event: React.MouseEvent, node: Node) => {
        event.stopPropagation();
        setSelectedNode(node);
    };
    
    const onSave = () => {
        const flowData = {
            name: workflowName,
            isActive: isWorkflowActive,
            nodes: nodes,
            edges: edges,
        };
        console.log('Workflow Salvo (simulação):', JSON.stringify(flowData, null, 2));
        toast({
            title: 'Fluxo de Trabalho Salvo!',
            description: 'A configuração do seu workflow foi guardada com sucesso (simulação).',
        });
    };

    const onTest = async () => {
        setIsTesting(true);
        toast({ title: 'A testar o workflow...', description: 'A execução foi iniciada.' });
        
        const triggerNode = nodes.find(n => n.type === 'trigger');
        if (!triggerNode) {
            toast({ title: 'Erro de Validação', description: 'O workflow precisa de um nó de "Gatilho".', variant: 'destructive' });
            setIsTesting(false);
            return;
        }

        const connectedEdges = getConnectedEdges([triggerNode], edges);
        const actionNode = getOutgoers(triggerNode, nodes, edges)[0];

        if (!actionNode) {
            toast({ title: 'Erro de Validação', description: 'O nó de "Gatilho" precisa de estar conectado a uma "Ação".', variant: 'destructive' });
            setIsTesting(false);
            return;
        }

        const config = {
            trigger: triggerNode.data.triggerType || 'N/A',
            action: actionNode.data.actionType || 'N/A',
            destination: actionNode.data.destinationUrl || 'https://docs.google.com/spreadsheets/d/example',
        };
        
        try {
            // This is a placeholder for projectId. In a multi-project app, you'd get this from context.
            const result = await runAutomationFlow({ config, projectId: 'default-project-id' });
            if (result.success) {
                toast({ title: 'Teste Concluído com Sucesso!', description: result.message });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: 'Falha no Teste do Workflow', description: error.message, variant: 'destructive' });
        } finally {
            setIsTesting(false);
        }
    };

    const ConfigPanelHeader = () => {
        if (!selectedNode) return null;
        let title = 'Configuração do Nó';
        if (selectedNode.type === 'trigger') title = 'Configuração do Gatilho';
        if (selectedNode.type === 'action') title = 'Configuração da Ação';
        if (selectedNode.type === 'if') title = 'Configuração da Condição';
        return <h3 className="font-semibold p-4 border-b bg-background">{title}</h3>;
    };


    const renderConfigPanel = () => {
        if (!selectedNode) {
            return (
                <div className="p-4 text-center text-muted-foreground">
                    <p>Selecione um nó para o configurar.</p>
                </div>
            );
        }

        switch (selectedNode.type) {
            case 'trigger':
                return <TriggerNodeForm />;
            case 'action':
                return <ActionNodeForm />;
            case 'if':
                return <IfNodeForm />;
            default:
                return <div className="p-4">Tipo de nó desconhecido.</div>;
        }
    }


    return (
        <div className="flex flex-col h-full">
            {/* Top Control Bar */}
            <div className="p-4 border-b bg-background z-10 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/admin/automations">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Input 
                        value={workflowName} 
                        onChange={(e) => setWorkflowName(e.target.value)} 
                        className="text-lg font-semibold border-none shadow-none focus-visible:ring-0"
                    />
                 </div>
                 <div className="flex items-center gap-4">
                     <div className="flex items-center space-x-2">
                        <Switch id="workflow-active" checked={isWorkflowActive} onCheckedChange={setIsWorkflowActive} />
                        <Label htmlFor="workflow-active">{isWorkflowActive ? 'Ativo' : 'Inativo'}</Label>
                    </div>
                    <Button variant="outline" size="sm" onClick={onTest} disabled={isTesting}>
                        {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Play className="mr-2 h-4 w-4" />}
                        {isTesting ? 'A testar...' : 'Testar'}
                    </Button>
                    <Button onClick={onSave} size="sm">
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Workflow
                    </Button>
                 </div>
            </div>

            <div className="flex-1 grid grid-cols-[250px_1fr_350px]">
                <Sidebar />
                <div className="h-full w-full" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onNodeClick={onNodeClick}
                        nodeTypes={nodeTypes}
                        fitView
                    >
                        <Controls />
                        <MiniMap />
                        <Background variant={"dots" as any} gap={12} size={1} />
                    </ReactFlow>
                </div>
                <aside className="border-l bg-secondary/50">
                    <ConfigPanelHeader />
                    <div className="p-4">
                        {renderConfigPanel()}
                    </div>
                </aside>
            </div>
        </div>
    );
}


export default function WorkflowEditorPage() {
    return (
        <div className="flex flex-col h-screen w-full">
            <Header />
            <ReactFlowProvider>
                <EditorCanvas />
            </ReactFlowProvider>
        </div>
    );
}
