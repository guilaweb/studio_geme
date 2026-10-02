
'use client';

import { useOnlineStatus } from "@/hooks/use-online-status";
import { Wifi, WifiOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export function ConnectionStatusIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-auto px-2">
                    <Wifi className={cn("h-5 w-5 text-green-500", !isOnline && "hidden")} />
                    <WifiOff className={cn("h-5 w-5 text-destructive", isOnline && "hidden")} />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{isOnline ? 'Ligado à internet' : 'Sem ligação à internet'}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );
}
