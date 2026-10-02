'use client';

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  Plus,
  FileDown,
  Library,
  Undo,
  Redo,
  Scissors,
  RotateCcw,
  MoreVertical,
  PanelRightOpen,
  PanelRightClose
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';


interface ProjectToolbarProps {
  onAddAnnotation: () => void;
  onGenerateReport: () => void;
  onSaveBaseline: () => void;
  isReportGenerating: boolean;
  isSectionPlaneActive: boolean;
  activeSectionAxis: 'x' | 'y' | 'z' | null;
  onToggleSectionPlane: () => void;
  onSetSectionAxis: (axis: 'x' | 'y' | 'z') => void;
  onFlipSectionPlane: () => void;
  onToggleViewer: () => void;
  isViewerCollapsed: boolean;
}


const DesktopToolbar = ({
  onAddAnnotation,
  onGenerateReport,
  onSaveBaseline,
  isReportGenerating,
  isSectionPlaneActive,
  activeSectionAxis,
  onToggleSectionPlane,
  onSetSectionAxis,
  onFlipSectionPlane,
  onToggleViewer,
  isViewerCollapsed,
}: Omit<ProjectToolbarProps, 'isMobile'>) => {
    return (
        <TooltipProvider delayDuration={100}>
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center flex-wrap gap-1">
                    {/* General Actions */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={onAddAnnotation}>
                            <Plus className="h-4 w-4" />
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p>Adicionar Nova Pendência</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onGenerateReport}
                            disabled={isReportGenerating}
                        >
                            <FileDown className="h-4 w-4" />
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p>Gerar Relatório PDF</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={onSaveBaseline}>
                            <Library className="h-4 w-4" />
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p>Salvar Linha de Base do Cronograma</p>
                        </TooltipContent>
                    </Tooltip>

                    <Separator orientation="vertical" className="h-6 mx-2" />

                    {/* Edit Actions */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" disabled>
                            <Undo className="h-4 w-4" />
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p>Desfazer (em breve)</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" disabled>
                            <Redo className="h-4 w-4" />
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p>Refazer (em breve)</p>
                        </TooltipContent>
                    </Tooltip>
                    
                    <Separator orientation="vertical" className="h-6 mx-2" />

                    {/* 3D Sectioning Tools */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={onToggleSectionPlane} className={cn(isSectionPlaneActive && 'bg-accent text-accent-foreground')}>
                                <Scissors className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p>{isSectionPlaneActive ? 'Desativar' : 'Ativar'} Plano de Corte</p>
                        </TooltipContent>
                    </Tooltip>

                    {isSectionPlaneActive && (
                        <>
                            <div className="flex items-center gap-1 rounded-md bg-secondary p-0.5">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size="sm" variant={activeSectionAxis === 'x' ? 'default' : 'ghost'} onClick={() => onSetSectionAxis('x')} className="h-7 px-2">X</Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Cortar no Eixo X</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size="sm" variant={activeSectionAxis === 'y' ? 'default' : 'ghost'} onClick={() => onSetSectionAxis('y')} className="h-7 px-2">Y</Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Cortar no Eixo Y</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size="sm" variant={activeSectionAxis === 'z' ? 'default' : 'ghost'} onClick={() => onSetSectionAxis('z')} className="h-7 px-2">Z</Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Cortar no Eixo Z</p></TooltipContent>
                                </Tooltip>
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={onFlipSectionPlane}>
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Inverter Direção do Corte</p></TooltipContent>
                            </Tooltip>
                        </>
                    )}
                </div>
                 <Tooltip>
                    <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onToggleViewer}>
                        {isViewerCollapsed ? <PanelRightOpen /> : <PanelRightClose />}
                    </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isViewerCollapsed ? 'Mostrar Visualizador 3D' : 'Ocultar Visualizador 3D'}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
};

const MobileToolbar = ({
  onAddAnnotation,
  onGenerateReport,
  onSaveBaseline,
  isReportGenerating,
  isSectionPlaneActive,
  activeSectionAxis,
  onToggleSectionPlane,
  onSetSectionAxis,
  onFlipSectionPlane,
  onToggleViewer,
  isViewerCollapsed,
}: Omit<ProjectToolbarProps, 'isMobile'>) => {
  return (
     <TooltipProvider delayDuration={100}>
        <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
                {/* Main mobile actions */}
                <Tooltip>
                    <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onAddAnnotation}><Plus className="h-4 w-4" /></Button></TooltipTrigger>
                    <TooltipContent><p>Adicionar Pendência</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={onToggleSectionPlane} className={cn(isSectionPlaneActive && 'bg-accent text-accent-foreground')}>
                            <Scissors className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{isSectionPlaneActive ? 'Desativar' : 'Ativar'} Plano de Corte</p></TooltipContent>
                </Tooltip>
                
                 {isSectionPlaneActive && (
                    <div className="flex items-center gap-1 rounded-md bg-secondary p-0.5">
                        <Button size="sm" variant={activeSectionAxis === 'x' ? 'default' : 'ghost'} onClick={() => onSetSectionAxis('x')} className="h-7 px-2">X</Button>
                        <Button size="sm" variant={activeSectionAxis === 'y' ? 'default' : 'ghost'} onClick={() => onSetSectionAxis('y')} className="h-7 px-2">Y</Button>
                        <Button size="sm" variant={activeSectionAxis === 'z' ? 'default' : 'ghost'} onClick={() => onSetSectionAxis('z')} className="h-7 px-2">Z</Button>
                    </div>
                )}
            </div>
            
            <div className="flex items-center">
                 <Tooltip>
                    <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onToggleViewer}>
                        {isViewerCollapsed ? <PanelRightOpen /> : <PanelRightClose />}
                    </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isViewerCollapsed ? 'Mostrar Visualizador 3D' : 'Ocultar Visualizador 3D'}</p>
                    </TooltipContent>
                </Tooltip>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onGenerateReport} disabled={isReportGenerating}>
                            <FileDown className="mr-2 h-4 w-4" />
                            <span>Gerar Relatório PDF</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onSaveBaseline}>
                            <Library className="mr-2 h-4 w-4" />
                            <span>Salvar Linha de Base</span>
                        </DropdownMenuItem>
                        {isSectionPlaneActive && (
                            <DropdownMenuItem onClick={onFlipSectionPlane}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                <span>Inverter Corte</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled>
                            <Undo className="mr-2 h-4 w-4" />
                            <span>Desfazer (em breve)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                            <Redo className="mr-2 h-4 w-4" />
                            <span>Refazer (em breve)</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    </TooltipProvider>
  );
};


export function ProjectToolbar(props: ProjectToolbarProps) {
  const isMobile = useIsMobile();

  if (isMobile === undefined) {
    return <div className="h-12 p-1 border-b bg-background" />; // Placeholder for SSR
  }

  return (
    <div className="p-1 border-b bg-secondary sticky top-[65px] md:top-0 z-20">
      {isMobile ? <MobileToolbar {...props} /> : <DesktopToolbar {...props} />}
    </div>
  );
}
