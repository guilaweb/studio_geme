'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  FolderKanban,
  Briefcase,
  Users2,
  Shield,
  User,
  LogOut,
  Moon,
  Sun,
  Compass,
  FileText,
  DollarSign,
  Truck,
  BookOpen,
  Ruler,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Building2,
  Search,
  Bell,
  CheckSquare,
  ClipboardCheck,
  Layers,
  Settings,
  Home,
  HardHat,
  FileCheck2,
  Fingerprint,
  Share2,
  BrainCircuit,
  ShieldAlert
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from 'next-themes';
import { ExperienceModeSelector } from './experience-mode-selector';

interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenHelp?: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  onOpenReports?: () => void;
}

export function MobileNavDrawer({
  open,
  onOpenChange,
  onOpenHelp,
  onOpenSearch,
  onOpenNotifications,
  onOpenReports
}: MobileNavDrawerProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const isInsideProject = pathname.startsWith('/projects/') && pathname !== '/projects';

  const handleSwitchTab = (tab: string) => {
    onOpenChange(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('profundidade_switch_project_tab', { detail: { tab } }));
    }
  };

  const handleLogout = async () => {
    onOpenChange(false);
    await logout();
    router.push('/');
  };

  const navItem = (
    href: string,
    icon: React.ElementType,
    title: string,
    subtitle?: string,
    badge?: string
  ) => {
    const Icon = icon;
    return (
      <SheetClose asChild key={href}>
        <Link
          href={href}
          className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/70 active:bg-muted transition-colors touch-target-44"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{title}</p>
              {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {badge && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {badge}
              </Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </div>
        </Link>
      </SheetClose>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[85vw] sm:w-[380px] p-0 flex flex-col">
        {/* Profile Card Header */}
        <div className="p-5 border-b bg-gradient-to-br from-card via-card to-primary/5">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-xs">
              <AvatarImage src={user?.photoURL || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {(user?.displayName || user?.email || 'U').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-foreground truncate">
                {user?.displayName || 'Utilizador'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              {user?.role && (
                <Badge variant="outline" className="text-[10px] mt-1 border-primary/30 text-primary">
                  {user.role}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Quick Hub: Pesquisa, Notificações e Relatórios */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                if (onOpenSearch) onOpenSearch();
              }}
              className="flex items-center gap-2.5 p-3 rounded-xl border bg-card hover:bg-muted/60 active:bg-muted transition-colors text-left touch-target-44"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Search className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">Pesquisar</p>
                <p className="text-[10px] text-muted-foreground truncate">Global</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                if (onOpenNotifications) onOpenNotifications();
              }}
              className="flex items-center gap-2.5 p-3 rounded-xl border bg-card hover:bg-muted/60 active:bg-muted transition-colors text-left touch-target-44"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">Notificações</p>
                <p className="text-[10px] text-muted-foreground truncate">Alertas</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                if (onOpenReports) onOpenReports();
              }}
              className="flex items-center gap-2.5 p-3 rounded-xl border bg-card hover:bg-muted/60 active:bg-muted transition-colors text-left touch-target-44 col-span-2"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">Gerador de Relatórios Mobile</p>
                  <Badge variant="outline" className="text-[10px] py-0 text-emerald-600 border-emerald-500/30">PDF</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">Dossiês, RDO Diário e autos em 4 passos</p>
              </div>
            </button>
          </div>

          <Separator />

          {/* Secção Contextual do Caso se estiver dentro de um Dossiê */}
          {isInsideProject && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary px-3 mb-1">
                Módulos Deste Caso
              </p>
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleSwitchTab('wbs')}
                  className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/70 active:bg-muted transition-colors touch-target-44 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">Dossiê & Notas</p>
                      <p className="text-[11px] text-muted-foreground truncate">Diligências e notas do caso</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchTab('fiscalizacao')}
                  className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/70 active:bg-muted transition-colors touch-target-44 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Fingerprint className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">Cadeia de Custódia SHA-256</p>
                      <p className="text-[11px] text-muted-foreground truncate">Integridade probatória de ficheiros</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchTab('measurement-certificates')}
                  className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/70 active:bg-muted transition-colors touch-target-44 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                      <Share2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">Grafos & Vínculos</p>
                      <p className="text-[11px] text-muted-foreground truncate">Rede de ligações e alvos</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchTab('equipa')}
                  className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/70 active:bg-muted transition-colors touch-target-44 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <Users2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">Equipa de Investigação</p>
                      <p className="text-[11px] text-muted-foreground truncate">Investigadores e peritos</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchTab('relatorios-hub')}
                  className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/70 active:bg-muted transition-colors touch-target-44 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">Relatório Pericial (PDF)</p>
                      <p className="text-[11px] text-muted-foreground truncate">Laudos e relatórios formais</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                </button>
              </div>
              <Separator className="my-4" />
            </div>
          )}

          {/* 1. INVESTIGAÇÃO & INTELIGÊNCIA */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1">
              Investigação & Inteligência
            </p>
            <div className="space-y-0.5">
              {navItem('/investigacao', FolderKanban, 'Casos & Dossiês', 'Dossiês ativos e histórico de casos')}
              {navItem('/investigacao#custodia', Fingerprint, 'Cadeia de Custódia SHA-256', 'Evidências com preservação no GCS')}
              {navItem('/investigacao#grafo', Share2, 'Grafos & Relacionamentos', 'Mapeamento de alvos e vínculos')}
              {navItem('/investigacao#si', BrainCircuit, 'Sistema de Inteligência (SI)', 'Modelos assistivos Human-in-the-Loop')}
              {navItem('/investigacao#relatorios', FileText, 'Relatórios Periciais PDF', 'Laudos e dísticos forenses')}
            </div>
          </div>

          <Separator />

          {/* 2. ORGANIZAÇÃO & EQUIPA */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1">
              Organização & Acessos
            </p>
            <div className="space-y-0.5">
              {navItem('/team', Users2, 'Investigadores & RBAC', 'Membros, alçadas e permissões')}
              {navItem('/empresa', Building2, 'Organização & Tenancy', 'Isolamento de tenant e dados corporativos')}
              {navItem('/manual', BookOpen, 'Manual do Utilizador', 'Documentação oficial e procedimentos')}
            </div>
          </div>

          <Separator />

          {((user?.role as string) === 'super-admin' || (user?.role as string) === 'admin' || (user?.role as string) === 'Gestor de Financeiro' || (user?.role as string) === 'Gestor de RH') && (
            <>
              {/* 3. ADMINISTRAÇÃO & AUDITORIA */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1">
                  Administração & Segurança
                </p>
                <div className="space-y-0.5">
                  {navItem('/admin/roles', Shield, 'Perfis & Matriz RBAC', 'Controle rigoroso de alçadas')}
                  {navItem('/admin', Settings, 'Configurações de Segurança', 'Parâmetros institucionais e MFA')}
                  {navItem('/admin?tab=audit', FileCheck2, 'Trilha de Auditoria & Logs', 'Rastreabilidade imutável de ações')}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Section 3: Definições e Conta */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1">
              A Minha Conta
            </p>
            <div className="space-y-0.5">
              {navItem('/profile', User, 'O Meu Perfil', 'Dados pessoais e segurança')}
            </div>
          </div>

          {/* Experience Mode Selector for Mobile */}
          <div className="px-3 py-2 bg-muted/40 rounded-xl border">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
              Nível de Experiência:
            </p>
            <ExperienceModeSelector />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-card/60 flex items-center justify-between gap-2 pb-safe">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="gap-2 text-xs touch-target-44"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 text-xs touch-target-44"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
