'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  HardHat, 
  Calculator, 
  Briefcase, 
  Layers, 
  Sparkles,
  ChevronDown,
  BookmarkCheck,
  CheckCircle2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export type ActiveViewMode = 'field_operation' | 'cost_engineer' | 'executive_cockpit' | 'full_engineering';

interface RoleViewSwitcherProps {
  currentMode: ActiveViewMode;
  onModeChange: (mode: ActiveViewMode) => void;
  userRoleName?: string | null;
}

const VIEW_MODES_CONFIG: Record<ActiveViewMode, { label: string; shortLabel: string; icon: React.ElementType; badge: string; color: string }> = {
  field_operation: {
    label: 'Modo Campo / Apontador (3 Botões)',
    shortLabel: 'Modo Campo',
    icon: HardHat,
    badge: 'Operação',
    color: 'text-amber-500'
  },
  cost_engineer: {
    label: 'Modo Engenharia de Custos & CPUs',
    shortLabel: 'Modo Custos',
    icon: Calculator,
    badge: 'Orçamentista',
    color: 'text-blue-500'
  },
  executive_cockpit: {
    label: 'Modo Cockpit Executivo (SPI/CPI & Alertas)',
    shortLabel: 'Cockpit Direção',
    icon: Briefcase,
    badge: 'CFO / Direção',
    color: 'text-purple-500'
  },
  full_engineering: {
    label: 'Visão Completa (Engenharia & Menus)',
    shortLabel: 'Visão Completa',
    icon: Layers,
    badge: 'Engenheiro Chefe',
    color: 'text-slate-500'
  },
};

export function RoleViewSwitcher({ currentMode, onModeChange, userRoleName }: RoleViewSwitcherProps) {
  const currentConfig = VIEW_MODES_CONFIG[currentMode];
  const IconComponent = currentConfig.icon;
  const { user, idToken } = useAuth();
  const { toast } = useToast();
  const [isSavingDefault, setIsSavingDefault] = useState(false);

  const handleSetDefaultProfileMode = async () => {
    setIsSavingDefault(true);
    try {
      if (user?.uid === 'demo-user-master-id' && typeof window !== 'undefined') {
        const cached = localStorage.getItem('profundidade_demo_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          localStorage.setItem('profundidade_demo_user', JSON.stringify({ ...parsed, defaultViewMode: currentMode }));
        }
      }

      const res = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken || 'demo-token'}`,
        },
        body: JSON.stringify({ defaultViewMode: currentMode }),
      });

      if (!res.ok) throw new Error('Falha ao guardar preferência');

      toast({
        title: 'Modo Padrão Atualizado!',
        description: `"${currentConfig.shortLabel}" agora é o seu modo padrão ao abrir qualquer projeto.`,
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao guardar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingDefault(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs font-semibold px-2.5 gap-1.5 hover:bg-white dark:hover:bg-slate-900 transition-colors shadow-none"
          >
            <IconComponent className={`h-3.5 w-3.5 ${currentConfig.color}`} />
            <span className="hidden sm:inline">{currentConfig.shortLabel}</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-slate-300 dark:border-slate-600">
              {currentConfig.badge}
            </Badge>
            <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 text-xs">
          <DropdownMenuLabel className="text-[11px] text-muted-foreground flex items-center justify-between">
            <span>PERSPETIVAS OPERACIONAIS</span>
            {userRoleName && <span className="font-mono text-[10px]">Papel: {userRoleName}</span>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={() => onModeChange('field_operation')}
            className={`cursor-pointer ${currentMode === 'field_operation' ? 'bg-primary/10 font-semibold text-primary' : ''}`}
          >
            <HardHat className="h-4 w-4 mr-2 text-amber-500" />
            <div className="flex flex-col">
              <span>Modo Campo (Apontador)</span>
              <span className="text-[10px] text-muted-foreground font-normal">3 botões móveis, 60s & offline</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => onModeChange('cost_engineer')}
            className={`cursor-pointer ${currentMode === 'cost_engineer' ? 'bg-primary/10 font-semibold text-primary' : ''}`}
          >
            <Calculator className="h-4 w-4 mr-2 text-blue-500" />
            <div className="flex flex-col">
              <span>Modo Custos & Orçamento</span>
              <span className="text-[10px] text-muted-foreground font-normal">Árvore de CPUs e sensibilidade</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => onModeChange('executive_cockpit')}
            className={`cursor-pointer ${currentMode === 'executive_cockpit' ? 'bg-primary/10 font-semibold text-primary' : ''}`}
          >
            <Briefcase className="h-4 w-4 mr-2 text-purple-500" />
            <div className="flex flex-col">
              <span>Modo Cockpit Executivo</span>
              <span className="text-[10px] text-muted-foreground font-normal">SPI, CPI, Margem e aprovações</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={() => onModeChange('full_engineering')}
            className={`cursor-pointer ${currentMode === 'full_engineering' ? 'bg-primary/10 font-semibold text-primary' : ''}`}
          >
            <Layers className="h-4 w-4 mr-2 text-slate-500" />
            <div className="flex flex-col">
              <span>Visão Completa de Engenharia</span>
              <span className="text-[10px] text-muted-foreground font-normal">Todos os menus e ferramentas</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleSetDefaultProfileMode}
            disabled={isSavingDefault}
            className="cursor-pointer text-[11px] text-primary font-medium focus:text-primary focus:bg-primary/10 py-2"
          >
            <BookmarkCheck className="h-3.5 w-3.5 mr-2 text-primary" />
            <span>Definir &quot;{currentConfig.shortLabel}&quot; como meu padrão</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
