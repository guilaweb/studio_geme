'use client';

import React from 'react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { NODES_DATA, NODE_CATEGORIES } from './nodes-data';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableNodeProps {
  type: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const DraggableNode = ({ type, label, icon: Icon, description }: DraggableNodeProps) => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodeIconColors: {[key: string]: string} = {
    trigger: "text-green-500",
    action: "text-blue-500",
    if: "text-purple-500",
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="p-3 border bg-background rounded-lg cursor-grab flex items-center gap-2 hover:shadow-md transition-shadow"
            onDragStart={(event) => onDragStart(event, type)}
            draggable
          >
            <Icon className={cn("h-5 w-5", nodeIconColors[type])} />
            <span>{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};


export function Sidebar() {
  return (
    <aside className="border-r bg-secondary/50 p-4">
      <h3 className="font-semibold mb-4 text-center text-sm">Arraste um nó para o canvas</h3>
      <div className="space-y-4">
        {NODE_CATEGORIES.map(category => (
          <div key={category}>
            <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">{category}</h4>
            <div className="space-y-2">
                {NODES_DATA.filter(node => node.category === category).map(node => (
                    <DraggableNode 
                        key={node.type}
                        type={node.type}
                        label={node.label}
                        icon={node.icon}
                        description={node.description}
                    />
                ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
