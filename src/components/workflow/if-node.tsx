'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

const IfNode = ({ data, selected }: NodeProps) => {
  return (
    <Card className={cn(
        "w-64 shadow-lg transition-all", 
        selected && "ring-2 ring-purple-500 shadow-xl"
    )}>
      <CardHeader className="flex-row items-center gap-4 p-3">
        <div className="p-2 bg-purple-100 rounded-md">
            <GitBranch className="h-5 w-5 text-purple-600"/>
        </div>
        <div>
            <CardTitle className="text-sm">Condição (IF)</CardTitle>
            <CardDescription className="text-xs">{data.label}</CardDescription>
        </div>
      </CardHeader>
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-gray-500" />
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-2 h-2 !bg-green-500"
        style={{ top: '33%' }}
      />
      <div className="absolute right-[-25px] top-[33%] -translate-y-1/2 text-xs text-green-600 font-semibold">
        Sim
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="w-2 h-2 !bg-red-500"
        style={{ top: '66%' }}
      />
      <div className="absolute right-[-25px] top-[66%] -translate-y-1/2 text-xs text-red-600 font-semibold">
        Não
      </div>
    </Card>
  );
};

export default memo(IfNode);
