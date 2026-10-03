'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Menu,
  Plus,
  Bell,
  BarChart3,
  BookOpen,
  Ruler,
  Fingerprint,
  Share2,
  Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useNotificationsCount } from '@/hooks/use-notifications-count';
import { MobileQuickActionsSheet } from './mobile-quick-actions-sheet';
import { MobileNavDrawer } from './mobile-nav-drawer';
import { MobileNotificationsDrawer } from './mobile-notifications-drawer';
import { MobileSearchModal } from './mobile-search-modal';
import { MobileReportWizard } from '@/components/reports/mobile-report-wizard';

export function MobileBottomNav() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const { unreadCount: liveUnreadCount } = useNotificationsCount();

  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [projectActiveTab, setProjectActiveTab] = useState<string>('dashboard');

  const isInsideProject = pathname.startsWith('/projects/') && pathname !== '/projects';

  // Custom event listeners for global mobile triggers
  useEffect(() => {
    const handleOpenSearch = () => setIsSearchOpen(true);
    const handleOpenNotifs = () => setIsNotificationsOpen(true);
    const handleOpenReports = () => setIsReportsOpen(true);
    const handleTabChanged = (e: Event) => {
      const custom = e as CustomEvent<{ tab: string }>;
      if (custom.detail?.tab) {
        setProjectActiveTab(custom.detail.tab);
      }
    };

    window.addEventListener('profundidade_open_mobile_search', handleOpenSearch);
    window.addEventListener('profundidade_open_mobile_notifications', handleOpenNotifs);
    window.addEventListener('profundidade_open_mobile_reports', handleOpenReports);
    window.addEventListener('profundidade_project_tab_changed', handleTabChanged);

    return () => {
      window.removeEventListener('profundidade_open_mobile_search', handleOpenSearch);
      window.removeEventListener('profundidade_open_mobile_notifications', handleOpenNotifs);
      window.removeEventListener('profundidade_open_mobile_reports', handleOpenReports);
      window.removeEventListener('profundidade_project_tab_changed', handleTabChanged);
    };
  }, []);

  const handleProjectTabChange = (tab: string) => {
    setProjectActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('profundidade_switch_project_tab', { detail: { tab } }));
    }
  };

  // Exibir a navegação inferior apenas para utilizadores autenticados em ecrãs móveis
  if (loading || !user) {
    return null;
  }

  // Não exibir nas rotas públicas como landing page, login, blog, etc.
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/solucoes') ||
    pathname.startsWith('/precos') ||
    pathname.startsWith('/sobre') ||
    pathname.startsWith('/termos') ||
    pathname.startsWith('/privacidade') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/extranet');

  if (isPublicRoute) {
    return null;
  }

  const isHomeActive = pathname === '/dashboard' || pathname === '/';
  const isProjectsActive = pathname === '/dashboard?tab=projects' || (pathname.startsWith('/projects') && !isInsideProject);

  return (
    <>
      <nav aria-label="Navegação móvel principal" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-2xl pb-safe transition-all">
        <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto relative">
          {isInsideProject ? (
            /* ============================================================ */
            /* NAVEGAÇÃO CONTEXTUAL DE PROJETO: Visão Geral | Diário | (+) | Medições | Mais */
            /* ============================================================ */
            <>
              {/* 1. Visão Geral */}
              <button
                type="button"
                onClick={() => handleProjectTabChange('dashboard')}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors touch-target-44 active:scale-95',
                  projectActiveTab === 'dashboard'
                    ? 'text-primary font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className={cn('p-1 rounded-xl transition-all', projectActiveTab === 'dashboard' && 'bg-primary/10')}>
                  <BarChart3 className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">Visão Geral</span>
              </button>

              {/* 2. Custódia SHA-256 */}
              <button
                type="button"
                onClick={() => handleProjectTabChange('fiscalizacao')}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors touch-target-44 active:scale-95',
                  projectActiveTab === 'fiscalizacao'
                    ? 'text-primary font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className={cn('p-1 rounded-xl transition-all', projectActiveTab === 'fiscalizacao' && 'bg-primary/10')}>
                  <Fingerprint className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">Custódia</span>
              </button>

              {/* 3. Central FAB Button (+) Ação */}
              <div className="flex items-center justify-center flex-1 -mt-5">
                <button
                  type="button"
                  onClick={() => setIsQuickActionOpen(true)}
                  aria-label="Ação Rápida de Campo"
                  className="h-13 w-13 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform border-4 border-background focus:outline-hidden touch-target-44"
                >
                  <Plus className="h-6 w-6 stroke-[2.5]" />
                </button>
              </div>

              {/* 4. Grafos & Vínculos */}
              <button
                type="button"
                onClick={() => handleProjectTabChange('measurement-certificates')}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors touch-target-44 active:scale-95',
                  projectActiveTab === 'measurement-certificates'
                    ? 'text-primary font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className={cn('p-1 rounded-xl transition-all', projectActiveTab === 'measurement-certificates' && 'bg-primary/10')}>
                  <Share2 className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">Grafos</span>
              </button>

              {/* 5. Mais */}
              <button
                type="button"
                onClick={() => setIsNavDrawerOpen(true)}
                className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-muted-foreground hover:text-foreground transition-colors touch-target-44 active:scale-95"
              >
                <div className="p-1 rounded-xl">
                  <Menu className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">Mais</span>
              </button>
            </>
          ) : (
            /* ============================================================ */
            /* NAVEGAÇÃO GERAL FORA DO PROJETO: Início | Projetos | (+) | Alertas | Mais */
            /* ============================================================ */
            <>
              {/* 1. Casos & Dossiês */}
              <Link
                href="/investigacao"
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors touch-target-44 active:scale-95',
                  pathname === '/investigacao' || isProjectsActive
                    ? 'text-primary font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className={cn('p-1 rounded-xl transition-all', (pathname === '/investigacao' || isProjectsActive) && 'bg-primary/10')}>
                  <FolderKanban className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">Casos</span>
              </Link>

              {/* 2. Perícia Móvel */}
              <Link
                href="/pericia-movel"
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors touch-target-44 active:scale-95',
                  pathname === '/pericia-movel'
                    ? 'text-amber-400 font-bold'
                    : 'text-muted-foreground hover:text-amber-300'
                )}
              >
                <div className={cn('p-1 rounded-xl transition-all', pathname === '/pericia-movel' && 'bg-amber-500/10 text-amber-400')}>
                  <Smartphone className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">Perícia</span>
              </Link>

              {/* 3. Central FAB Button (+) */}
              <div className="flex items-center justify-center flex-1 -mt-5">
                <button
                  type="button"
                  onClick={() => setIsQuickActionOpen(true)}
                  aria-label="Ação Rápida de Campo"
                  className="h-13 w-13 rounded-full bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 flex items-center justify-center active:scale-90 transition-transform border-4 border-background focus:outline-hidden touch-target-44 font-bold"
                >
                  <Plus className="h-6 w-6 stroke-[2.5]" />
                </button>
              </div>

              {/* 4. Custódia SHA-256 */}
              <Link
                href="/investigacao#custodia"
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors touch-target-44 active:scale-95',
                  pathname.includes('#custodia')
                    ? 'text-emerald-400 font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className={cn('p-1 rounded-xl transition-all', pathname.includes('#custodia') && 'bg-emerald-500/10 text-emerald-400')}>
                  <Fingerprint className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">Custódia</span>
              </Link>

              {/* 5. Mais (Drawer) */}
              <button
                type="button"
                onClick={() => setIsNavDrawerOpen(true)}
                className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-muted-foreground hover:text-foreground transition-colors touch-target-44 active:scale-95"
              >
                <div className="p-1 rounded-xl">
                  <Menu className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">Mais</span>
              </button>

              {/* 5. Mais (Drawer) */}
              <button
                type="button"
                onClick={() => setIsNavDrawerOpen(true)}
                className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-muted-foreground hover:text-foreground transition-colors touch-target-44 active:scale-95"
              >
                <div className="p-1 rounded-xl">
                  <Menu className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">Mais</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Sheets & Modais integrados */}
      <MobileQuickActionsSheet
        open={isQuickActionOpen}
        onOpenChange={setIsQuickActionOpen}
      />

      <MobileNavDrawer
        open={isNavDrawerOpen}
        onOpenChange={setIsNavDrawerOpen}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenReports={() => setIsReportsOpen(true)}
      />

      <MobileNotificationsDrawer
        open={isNotificationsOpen}
        onOpenChange={setIsNotificationsOpen}
      />

      <MobileSearchModal
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />

      <MobileReportWizard
        open={isReportsOpen}
        onOpenChange={setIsReportsOpen}
      />
    </>
  );
}
