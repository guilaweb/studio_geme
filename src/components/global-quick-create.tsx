'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  X,
  FolderPlus,
  ClipboardList,
  BookOpen,
  AlertTriangle,
  FileText,
  Activity,
  ShoppingCart,
  Truck,
  CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickCreateProps {
  onNewProject?: () => void;
  projectId?: string; // if inside a project page
}

interface ActionDef {
  icon: React.ReactNode;
  label: string;
  colorClass: string;
  onClick: () => void;
}

function dispatchPlatformEvent(detail: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('profundidade_run_action', { detail })
    );
  }
}

export function GlobalQuickCreate({ onNewProject, projectId }: QuickCreateProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click (handled via backdrop)
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const actions: ActionDef[] = [
    {
      icon: <FolderPlus className="h-4 w-4" />,
      label: 'Novo Projeto',
      colorClass: 'text-blue-600 dark:text-blue-400',
      onClick: () => {
        setOpen(false);
        onNewProject?.();
      },
    },
    {
      icon: <CheckSquare className="h-4 w-4" />,
      label: 'Nova Atividade',
      colorClass: 'text-sky-600 dark:text-sky-400',
      onClick: () => {
        setOpen(false);
        dispatchPlatformEvent('open_wbs_add_task');
      },
    },
    {
      icon: <ClipboardList className="h-4 w-4" />,
      label: 'Nova Medição',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      onClick: () => {
        setOpen(false);
        dispatchPlatformEvent('open_measurement_wizard');
      },
    },
    {
      icon: <BookOpen className="h-4 w-4" />,
      label: 'Diário de Obra',
      colorClass: 'text-amber-600 dark:text-amber-400',
      onClick: () => {
        setOpen(false);
        dispatchPlatformEvent('open_daily_report');
      },
    },
    {
      icon: <AlertTriangle className="h-4 w-4" />,
      label: 'Registar Ocorrência',
      colorClass: 'text-orange-600 dark:text-orange-400',
      onClick: () => {
        setOpen(false);
        dispatchPlatformEvent('open_photo_incident');
      },
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: 'Novo Documento',
      colorClass: 'text-violet-600 dark:text-violet-400',
      onClick: () => {
        setOpen(false);
        dispatchPlatformEvent('open_document_upload');
      },
    },
    {
      icon: <ShoppingCart className="h-4 w-4" />,
      label: 'Nova Compra / Pedido',
      colorClass: 'text-indigo-600 dark:text-indigo-400',
      onClick: () => {
        setOpen(false);
        dispatchPlatformEvent('open_purchase_order');
      },
    },
    {
      icon: <Truck className="h-4 w-4" />,
      label: 'Novo Equipamento',
      colorClass: 'text-cyan-600 dark:text-cyan-400',
      onClick: () => {
        setOpen(false);
        dispatchPlatformEvent('open_equipment_allocation');
      },
    },
  ];

  // Reverse so index 0 (Novo Projeto) appears closest to FAB at the bottom
  const displayActions = [...actions].reverse();

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* FAB + action pills container */}
      <div
        ref={containerRef}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 flex flex-col items-end gap-0"
      >
        {/* Action pills — rendered above the FAB */}
        <div className="flex flex-col-reverse items-end gap-2 mb-3">
          {displayActions.map((action, idx) => {
            // displayActions[0] is the last item (Novo Documento), appearing highest
            // We want the bottommost pill to animate first → invert stagger index
            const staggerIdx = displayActions.length - 1 - idx;
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                style={{
                  transitionDelay: open ? `${staggerIdx * 50}ms` : `${(displayActions.length - 1 - staggerIdx) * 30}ms`,
                  transform: open ? 'translateY(0)' : 'translateY(16px)',
                  opacity: open ? 1 : 0,
                  pointerEvents: open ? 'auto' : 'none',
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium',
                  'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
                  'shadow-lg hover:shadow-xl',
                  'transition-all duration-150 ease-out',
                  'whitespace-nowrap'
                )}
                aria-label={action.label}
              >
                <span className={action.colorClass}>{action.icon}</span>
                <span className="text-slate-700 dark:text-slate-200">{action.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main FAB */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? 'Fechar menu de criação rápida' : 'Abrir menu de criação rápida'}
          aria-expanded={open}
          className={cn(
            'relative flex items-center justify-center',
            'h-14 w-14 rounded-full',
            'bg-primary text-primary-foreground',
            'shadow-lg hover:shadow-xl',
            'transition-all duration-200 ease-out',
            'hover:ring-2 hover:ring-primary/30 hover:ring-offset-2',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2'
          )}
        >
          <span
            className="transition-transform duration-300 ease-out"
            style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
          >
            {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </span>
        </button>
      </div>
    </>
  );
}
