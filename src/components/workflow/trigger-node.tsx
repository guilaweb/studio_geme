'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const TriggerNode = ({ data, selected }: NodeProps) => {
  return (
    <Card className={cn(
        "w-64 shadow-lg transition-all", 
        selected && "ring-2 ring-green-500 shadow-xl"
    )}>
      <CardHeader className="flex-row items-center gap-4 p-3">
        <div className="p-2 bg-green-100 rounded-md">
            <Zap className="h-5 w-5 text-green-600"/>
        </div>
        <div>
            <CardTitle className="text-sm">Gatilho</CardTitle>
            <CardDescription className="text-xs">{data.label}</CardDescription>
        </div>
      </CardHeader>
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-gray-500" />
    </Card>
  );
};

export default memo(TriggerNode);
