'use client';

import * as React from "react";
import {Button} from '@/components/ui/button';
import Link from 'next/link';
import {useAuth} from '@/hooks/use-auth';
import {auth} from '@/lib/firebase';
import {signOut} from 'firebase/auth';
import {useRouter, usePathname} from 'next/navigation';
import { 
  Shield, 
  Moon, 
  Sun, 
  User, 
  LayoutDashboard, 
  Briefcase, 
  Menu, 
  Users2, 
  ChevronDown, 
  Building2, 
  Diamond, 
  Zap, 
  Route, 
  Radio, 
  Cpu, 
  Layers, 
  Sparkles, 
  BookOpen, 
  FileText, 
  HelpCircle,
  Calendar,
  Compass,
  Search,
  LogOut,
  ArrowLeft,
  MoreVertical,
  Bell,
  Ruler,
  Settings,
  ClipboardCheck,
  Fingerprint,
  Share2,
  BrainCircuit,
  ShieldAlert,
  FolderKanban,
  FileCheck,
  Smartphone,
  Globe
} from 'lucide-react';
import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from './ui/separator';
import { Badge } from '@/components/ui/badge';
import { NotificationsDropdown } from "./notifications-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InteractiveHelpDrawer } from '@/components/onboarding/interactive-help-drawer';
import { UniversalCommandPalette } from '@/components/navigation/universal-command-palette';
import { ExperienceModeSelector } from '@/components/navigation/experience-mode-selector';
import { TenantSwitcher } from '@/components/navigation/tenant-switcher';
import { useNotificationsCount } from '@/hooks/use-notifications-count';
import { cn } from '@/lib/utils';

export function Header({ projectName }: { projectName?: string }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const isMobile = useIsMobile();
  const { unreadCount } = useNotificationsCount();
  const [open, setOpen] = React.useState(false);
  const [helpDrawerOpen, setHelpDrawerOpen] = React.useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  // Efeito para contrair ligeiramente o cabeçalho no scroll para libertar espaço visual no mobile
  React.useEffect(() => {
    const handleScroll = (e?: Event) => {
      const target = e?.target as HTMLElement | Document;
      let scrollTop = 0;
      if (target && 'scrollTop' in target && typeof (target as HTMLElement).scrollTop === 'number') {
        scrollTop = (target as HTMLElement).scrollTop;
      } else if (typeof window !== 'undefined') {
        scrollTop = window.scrollY || document.documentElement.scrollTop;
      }
      setIsScrolled(scrollTop > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true } as EventListenerOptions);
  }, []);

  const isInsideProject = Boolean(projectName) || (pathname.startsWith('/projects/') && pathname !== '/projects');

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  const dispatchTabSwitch = (tab: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('profundidade_switch_project_tab', { detail: { tab } }));
    }
  };

  const dispatchAction = (actionName: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(actionName));
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.push('/');
  };

  const renderNavLinks = (isMobileSheet = false) => {
    const Component = isMobileSheet ? SheetClose : React.Fragment;
    const props = isMobileSheet ? { asChild: true } : {};

    if (user) {
      if (isMobileSheet) {
        return (
          <div className="flex flex-col gap-1.5">
            <SheetClose asChild>
              <Button id="header-nav-projects" variant="ghost" className="justify-start w-full text-left font-semibold" asChild>
                <Link href="/investigacao"><FolderKanban className="mr-2 h-4 w-4 text-primary" />Casos & Dossiês</Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button variant="ghost" className="justify-start w-full text-left font-semibold text-amber-400" asChild>
                <Link href="/pericia-movel"><Smartphone className="mr-2 h-4 w-4 text-amber-400" />Perícia Móvel (Cellebrite)</Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button variant="ghost" className="justify-start w-full text-left" asChild>
                <Link href="/investigacao#custodia"><Fingerprint className="mr-2 h-4 w-4 text-emerald-500" />Custódia SHA-256</Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button variant="ghost" className="justify-start w-full text-left" asChild>
                <Link href="/investigacao#grafo"><Share2 className="mr-2 h-4 w-4 text-purple-500" />Grafos & Vínculos</Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button variant="ghost" className="justify-start w-full text-left" asChild>
                <Link href="/investigacao#si"><BrainCircuit className="mr-2 h-4 w-4 text-violet-500" />Inteligência SI (GCP)</Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button variant="ghost" className="justify-start w-full text-left" asChild>
                <Link href="/team"><Users2 className="mr-2 h-4 w-4" />Equipa & Acessos</Link>
              </Button>
            </SheetClose>
            {(user.role === 'super-admin' || user.role === 'Gestor de Financeiro' || (user.role as string) === 'Gestor Financeiro') && (
              <SheetClose asChild>
                <Button variant="ghost" className="justify-start w-full text-left" asChild>
                  <Link href="/admin"><Shield className="mr-2 h-4 w-4" />Administração & Auditoria</Link>
                </Button>
              </SheetClose>
            )}

            <div className="my-2"><Separator/></div>

            <SheetClose asChild>
              <Button variant="ghost" onClick={() => setHelpDrawerOpen(true)} className="justify-start w-full text-left text-primary gap-2">
                <Compass className="h-4 w-4" />Centro de Apoio & Guias
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button variant="ghost" className="justify-start w-full text-left" asChild>
                <Link href="/profile"><User className="mr-2 h-4 w-4" />O Meu Perfil</Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button variant="outline" onClick={handleSignOut} className="w-full justify-start text-destructive hover:text-destructive gap-2 mt-2">
                <LogOut className="h-4 w-4" />Terminar Sessão
              </Button>
            </SheetClose>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-1">
          <Button id="header-nav-projects" variant="ghost" size="sm" className="h-8 text-xs font-semibold gap-1.5" asChild>
            <Link href="/investigacao"><FolderKanban className="h-3.5 w-3.5 text-primary" />Casos & Dossiês</Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold gap-1.5 text-sky-400 hover:text-sky-300" asChild>
            <Link href="/osint"><Globe className="h-3.5 w-3.5 text-sky-400" />OSINT</Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold gap-1.5 text-amber-400 hover:text-amber-300" asChild>
            <Link href="/pericia-movel"><Smartphone className="h-3.5 w-3.5 text-amber-400" />Perícia Móvel</Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs font-medium gap-1.5" asChild>
            <Link href="/investigacao#custodia"><Fingerprint className="h-3.5 w-3.5 text-emerald-500" />Custódia SHA-256</Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs font-medium gap-1.5" asChild>
            <Link href="/investigacao#grafo"><Share2 className="h-3.5 w-3.5 text-purple-500" />Grafos & Vínculos</Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs font-medium gap-1.5" asChild>
            <Link href="/investigacao#si"><BrainCircuit className="h-3.5 w-3.5 text-violet-500" />Inteligência SI</Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs font-medium gap-1.5" asChild>
            <Link href="/team"><Users2 className="h-3.5 w-3.5" />Equipa</Link>
          </Button>
          {(user.role === 'super-admin' || user.role === 'Gestor de Financeiro' || (user.role as string) === 'Gestor Financeiro') && (
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium gap-1.5" asChild>
              <Link href="/admin"><Shield className="h-3.5 w-3.5" />Admin</Link>
            </Button>
          )}
        </div>
      );
    }

    if (isMobileSheet) {
      return (
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">Soluções</div>
          <Component {...props}><Button variant="ghost" className="justify-start w-full text-left" asChild><Link href="/solucoes#inteligencia-estado"><ShieldAlert className="mr-2 h-4 w-4 text-primary" />Inteligência Estratégica</Link></Button></Component>
          <Component {...props}><Button variant="ghost" className="justify-start w-full text-left" asChild><Link href="/solucoes#pericia-forense"><Fingerprint className="mr-2 h-4 w-4 text-emerald-500" />Perícia Forense Digital</Link></Button></Component>
          <Component {...props}><Button variant="ghost" className="justify-start w-full text-left" asChild><Link href="/solucoes#fraude-compliance"><Share2 className="mr-2 h-4 w-4 text-amber-500" />Fraude & Compliance</Link></Button></Component>
          <Component {...props}><Button variant="ghost" className="justify-start w-full text-left" asChild><Link href="/solucoes#osint-analise"><BrainCircuit className="mr-2 h-4 w-4 text-blue-500" />OSINT & Laboratório</Link></Button></Component>

          <Separator className="my-1" />
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">Plataforma</div>
          <Component {...props}><Button variant="ghost" className="justify-start w-full text-left" asChild><Link href="/investigacao"><FolderKanban className="mr-2 h-4 w-4 text-primary" />Gestão de Casos & Dossiês</Link></Button></Component>
          <Component {...props}><Button variant="ghost" className="justify-start w-full text-left text-sky-400" asChild><Link href="/osint"><Globe className="mr-2 h-4 w-4 text-sky-400" />Módulo OSINT (Fontes Abertas)</Link></Button></Component>
          <Component {...props}><Button variant="ghost" className="justify-start w-full text-left text-amber-400" asChild><Link href="/pericia-movel"><Smartphone className="mr-2 h-4 w-4 text-amber-400" />Laboratório de Perícia Móvel</Link></Button></Component>
          <Component {...props}><Button variant="ghost" className="justify-start w-full text-left" asChild><Link href="/investigacao#custodia"><Fingerprint className="mr-2 h-4 w-4 text-emerald-500" />Cadeia de Custódia GCP</Link></Button></Component>
          <Component {...props}><Button variant="ghost" className="justify-start w-full text-left" asChild><Link href="/investigacao#grafo"><Share2 className="mr-2 h-4 w-4 text-purple-500" />Grafos de Relacionamentos</Link></Button></Component>
          <Component {...props}><Button variant="ghost" className="justify-start w-full text-left" asChild><Link href="/investigacao#si"><BrainCircuit className="mr-2 h-4 w-4 text-violet-500" />Sistema de Inteligência (SI)</Link></Button></Component>

          <Separator className="my-1" />
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">Recursos & Documentação</div>
          <Component {...props}><Button variant="ghost" className="justify-start w-full text-left" asChild><Link href="/manual"><BookOpen className="mr-2 h-4 w-4 text-primary" />Manual do Utilizador</Link></Button></Component>
          <Component {...props}><Button variant="ghost" className="justify-start w-full text-left" asChild><Link href="/ajuda"><HelpCircle className="mr-2 h-4 w-4 text-primary" />Centro de Apoio & FAQ</Link></Button></Component>
          <Component {...props}><Button variant="ghost" className="justify-start w-full text-left" asChild><Link href="/sobre"><Compass className="mr-2 h-4 w-4 text-primary" />Sobre Nós</Link></Button></Component>
          <Component {...props}><Button variant="ghost" className="justify-start w-full text-left" asChild><Link href="/precos"><FileCheck className="mr-2 h-4 w-4 text-primary" />Planos & Preços</Link></Button></Component>

          <Separator className="my-2" />
          <Component {...props}><Button variant="ghost" className="justify-center w-full" asChild><Link href="/login">Entrar</Link></Button></Component>
          <Component {...props}><Button className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md font-medium" asChild><Link href="/#demo"><Calendar className="mr-2 h-4 w-4" />Agendar Demonstração Técnica</Link></Button></Component>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1 lg:space-x-2">
        {/* Menu: Soluções */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button id="header-nav-sectors" variant="ghost" className="text-sm font-medium gap-1 px-3">
              Soluções <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 p-2 bg-popover/95 backdrop-blur-md border shadow-xl rounded-xl">
            <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
              <Link href="/solucoes#inteligencia-estado" className="flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-xs">Inteligência Estratégica</div>
                  <p className="text-[11px] text-muted-foreground">Dossiês classificados e segurança pública</p>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
              <Link href="/solucoes#pericia-forense" className="flex items-start gap-2.5">
                <Fingerprint className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-xs">Perícia Forense Digital</div>
                  <p className="text-[11px] text-muted-foreground">Cadeia de custódia e hashing SHA-256</p>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
              <Link href="/solucoes#fraude-compliance" className="flex items-start gap-2.5">
                <Share2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-xs">Fraude & Compliance</div>
                  <p className="text-[11px] text-muted-foreground">Rastreio financeiro e PEPs/NIF</p>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
              <Link href="/solucoes#osint-analise" className="flex items-start gap-2.5">
                <BrainCircuit className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-xs">OSINT & Laboratório</div>
                  <p className="text-[11px] text-muted-foreground">Fontes abertas e dados heterogéneos</p>
                </div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Menu: Plataforma */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-sm font-medium gap-1 px-3">
              Plataforma <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 p-2 bg-popover/95 backdrop-blur-md border shadow-xl rounded-xl">
            <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
              <Link href="/investigacao" className="flex items-start gap-2.5">
                <FolderKanban className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-xs">Gestão de Casos & Dossiês</div>
                  <p className="text-[11px] text-muted-foreground">Investigação estruturada e membros</p>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
              <Link href="/osint" className="flex items-start gap-2.5">
                <Globe className="h-4 w-4 text-sky-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-xs text-sky-400 font-semibold">Módulo OSINT (Fontes Abertas)</div>
                  <p className="text-[11px] text-muted-foreground">Reconhecimento passivo, WHOIS, DNS e CT Logs</p>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
              <Link href="/pericia-movel" className="flex items-start gap-2.5">
                <Smartphone className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-xs text-amber-400 font-semibold">Laboratório de Perícia Móvel</div>
                  <p className="text-[11px] text-muted-foreground">Extração UFDR, WhatsApp, SQLite e EXIF</p>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
              <Link href="/investigacao#custodia" className="flex items-start gap-2.5">
                <Fingerprint className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-xs">Cadeia de Custódia SHA-256</div>
                  <p className="text-[11px] text-muted-foreground">Integridade probatória no GCS</p>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
              <Link href="/investigacao#grafo" className="flex items-start gap-2.5">
                <Share2 className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-xs">Grafos & Relacionamentos</div>
                  <p className="text-[11px] text-muted-foreground">Mapeamento de vínculos e alvos</p>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
              <Link href="/investigacao#si" className="flex items-start gap-2.5">
                <BrainCircuit className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-xs">Sistema de Inteligência (SI)</div>
                  <p className="text-[11px] text-muted-foreground">Modelos assistivos Human-in-the-Loop</p>
                </div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Menu: Recursos */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-sm font-medium gap-1 px-3">
              Recursos <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60 p-2 bg-popover/95 backdrop-blur-md border shadow-xl rounded-xl">
            <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
              <Link href="/manual" className="flex items-start gap-2.5">
                <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-xs">Manual do Utilizador</div>
                  <p className="text-[11px] text-muted-foreground">Guias operacionais e técnicos</p>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
              <Link href="/ajuda" className="flex items-start gap-2.5">
                <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-xs">Centro de Apoio & FAQ</div>
                  <p className="text-[11px] text-muted-foreground">Fluxos do sistema e dúvidas</p>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
              <Link href="/precos" className="flex items-start gap-2.5">
                <FileCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-xs">Planos & Preços</div>
                  <p className="text-[11px] text-muted-foreground">Subscrições transparentes</p>
                </div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sobre Nós */}
        <Button variant="ghost" className="text-sm font-medium px-3" asChild>
          <Link href="/sobre">Sobre Nós</Link>
        </Button>

        {/* Workspace SI Direto */}
        <Button variant="ghost" className="text-sm font-medium text-primary hover:text-primary px-3 hidden xl:flex" asChild>
          <Link href="/investigacao">Workspace SI</Link>
        </Button>

        {/* Ações (CTAs) */}
        <div className="flex items-center gap-3 pl-3">
          <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground px-3" asChild>
            <Link href="/login">Entrar</Link>
          </Button>

          {/* Botão de destaque escuro com efeito de vidro fosco / glassmorphism */}
          <Button
            asChild
            className="relative overflow-hidden font-medium text-xs lg:text-sm tracking-tight px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 border border-slate-700/40 dark:border-white/20 backdrop-blur-md shadow-[0_4px_14px_0_rgba(0,0,0,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Link href="/#demo">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary-foreground/80 dark:text-primary" />
                <span>Agendar Demonstração Executiva</span>
              </span>
            </Link>
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-md transition-all duration-200',
        isScrolled ? 'h-11 md:h-16' : 'h-14 md:h-16'
      )}
    >
      {/* 1. Mobile First Header (Ecrãs Móveis: Fixo, compacto e contextual) */}
      <div className="md:hidden flex items-center justify-between w-full h-full px-2.5">
        {isInsideProject ? (
          /* MODO CONTEXTUAL DO PROJETO: ← Projecto ABC ⋮ */
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-9 w-9 rounded-lg touch-target-44 shrink-0 text-foreground active:scale-95 transition-transform"
              title="Voltar aos Projetos"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex-1 min-w-0 px-2 flex items-center">
              <span className="font-headline font-bold text-sm sm:text-base text-foreground truncate block">
                {projectName || 'Projeto'}
              </span>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg touch-target-44 text-foreground active:scale-95 transition-transform"
                    title="Ações do Projeto"
                    aria-label="Opções"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl rounded-xl border bg-popover/95 backdrop-blur-md">
                  <DropdownMenuLabel className="px-2.5 py-1.5 text-xs text-muted-foreground font-semibold truncate">
                    {projectName || 'Projeto Atual'}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => dispatchTabSwitch('daily-report')}
                    className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    <span>Dossiê do Caso</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => dispatchTabSwitch('fiscalizacao')}
                    className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg"
                  >
                    <Fingerprint className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Cadeia de Custódia SHA-256</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => dispatchTabSwitch('measurement-certificates')}
                    className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg"
                  >
                    <Share2 className="h-3.5 w-3.5 text-purple-500" />
                    <span>Grafos & Vínculos</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => dispatchAction('profundidade_open_mobile_reports')}
                    className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg"
                  >
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span>Gerar Relatório Pericial PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => dispatchTabSwitch('wbs')}
                    className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg"
                  >
                    <BrainCircuit className="h-3.5 w-3.5 text-violet-500" />
                    <span>Laboratório & SI</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => dispatchTabSwitch('equipa')}
                    className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg"
                  >
                    <Users2 className="h-3.5 w-3.5 text-primary" />
                    <span>Equipa de Investigação</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => dispatchAction('profundidade_open_mobile_notifications')}
                    className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg"
                  >
                    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Notificações</span>
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-auto text-[9px] px-1.5 py-0">
                        {unreadCount}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => dispatchAction('profundidade_open_mobile_search')}
                    className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg"
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Pesquisa Global</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => dispatchTabSwitch('dados-gerais')}
                    className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Configurações do Caso</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        ) : (
          /* MODO GERAL FORA DO PROJETO: ☰ Profundidade 🔔 👤 */
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              className="h-9 w-9 rounded-lg touch-target-44 shrink-0 text-foreground active:scale-95 transition-transform"
              title="Menu Principal"
              aria-label="Abrir Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <Link href="/dashboard" id="header-logo-mobile" className="flex items-center gap-2 shrink-0">
              <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 fill-none stroke-current"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 21 7.5 21 16.5 12 22 3 16.5 3 7.5 12 2" className="stroke-primary" />
                  <line x1="12" y1="2" x2="12" y2="22" className="stroke-primary/70" strokeDasharray="1 1" />
                  <polyline points="3 7.5 12 12 21 7.5" className="stroke-primary" />
                  <circle cx="12" cy="12" r="1.5" className="fill-primary stroke-none" />
                </svg>
              </div>
              <span className="font-headline text-base font-bold tracking-tight text-foreground uppercase">
                PROFUNDIDADE
              </span>
            </Link>

            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('profundidade_open_mobile_search'));
                  }
                }}
                className="h-9 w-9 rounded-lg touch-target-44 text-muted-foreground hover:text-foreground"
                title="Pesquisa Global"
                aria-label="Pesquisa"
              >
                <Search className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('profundidade_open_mobile_notifications'));
                  }
                }}
                className="h-9 w-9 rounded-lg touch-target-44 text-muted-foreground hover:text-foreground relative"
                title="Notificações"
                aria-label="Notificações"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
                )}
              </Button>

              {user ? (
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-9 w-9 rounded-lg touch-target-44 p-0"
                  title="O Meu Perfil"
                  aria-label="O Meu Perfil"
                >
                  <Link href="/profile">
                    <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[11px] border border-primary/30">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  </Link>
                </Button>
              ) : (
                <Button variant="ghost" size="sm" asChild className="text-xs font-semibold px-2">
                  <Link href="/login">Entrar</Link>
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Sheet de navegação móvel lateral quando o utilizador clica em ☰ */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[85vw] sm:w-[400px] overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                  <polygon points="12 2 21 7.5 21 16.5 12 22 3 16.5 3 7.5 12 2" />
                  <polyline points="3 7.5 12 12 21 7.5" />
                </svg>
              </div>
              <SheetTitle className="font-headline font-bold text-base tracking-wider uppercase">PROFUNDIDADE</SheetTitle>
            </div>
            <SheetDescription className="text-xs">
              Sistema Operacional Digital de Inteligência, Investigação e Evidências
            </SheetDescription>
          </SheetHeader>
          {user && (
            <div className="py-3 border-b">
              <TenantSwitcher />
            </div>
          )}
          <nav className="mt-6">
            {renderNavLinks(true)}
          </nav>
        </SheetContent>
      </Sheet>

      {/* 2. Desktop Header (hidden md:flex) */}
      <div className="hidden md:flex container mx-auto h-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" id="header-logo" className="flex items-center space-x-2.5 group">
            {/* Ícone vetorial minimalista de prisma topográfico/dados */}
            <div className="h-8 w-8 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/30 flex items-center justify-center text-primary transition-transform group-hover:scale-105">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-none stroke-current"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Prisma topográfico isométrico / facetado de dados */}
                <polygon points="12 2 21 7.5 21 16.5 12 22 3 16.5 3 7.5 12 2" className="stroke-primary" />
                <line x1="12" y1="2" x2="12" y2="22" className="stroke-primary/70" strokeDasharray="1 1" />
                <polyline points="3 7.5 12 12 21 7.5" className="stroke-primary" />
                <circle cx="12" cy="12" r="1.5" className="fill-primary stroke-none" />
              </svg>
            </div>
            <span className="font-headline text-lg sm:text-xl font-bold tracking-tight text-foreground uppercase">
              PROFUNDIDADE
            </span>
          </Link>
          {user && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <TenantSwitcher />
            </>
          )}
          {projectName && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <span className="font-medium text-xs text-muted-foreground truncate max-w-[200px]" title={projectName}>
                {projectName}
              </span>
            </>
          )}
        </div>
        
        {loading ? null : (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandPaletteOpen(true)}
              className="h-8 text-xs text-muted-foreground gap-2 hidden md:flex items-center px-2.5 border-dashed hover:border-solid hover:text-foreground"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Pesquisa Rápida...</span>
              <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[9px] font-medium text-muted-foreground opacity-100">
                <span className="text-[10px]">Ctrl</span>K
              </kbd>
            </Button>
            {renderNavLinks(false)}
            {user && (
              <>
                <ExperienceModeSelector />
                <NotificationsDropdown />
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg text-primary hover:bg-primary/10"
                  onClick={() => setHelpDrawerOpen(true)}
                  title="Centro de Apoio & Visitas Guiadas"
                >
                  <Compass className="h-[1.15rem] w-[1.15rem]" />
                  <span className="sr-only">Centro de Apoio & Visitas Guiadas</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 text-xs font-medium rounded-full border border-border/60 hover:bg-muted/60">
                      <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                        {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="max-w-[90px] truncate hidden xl:inline font-semibold">{user.displayName || user.email?.split('@')[0]}</span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl rounded-xl border bg-popover/95 backdrop-blur-md">
                    <DropdownMenuLabel className="px-2.5 py-2 text-xs">
                      <p className="font-semibold truncate text-foreground">{user.displayName || 'Utilizador'}</p>
                      <p className="text-[10px] text-muted-foreground font-normal truncate">{user.email}</p>
                      {user.role && (
                        <Badge variant="secondary" className="mt-1 text-[9px] px-1.5 py-0 font-medium">
                          {user.role}
                        </Badge>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>O Meu Perfil</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHelpDrawerOpen(true)} className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg">
                      <Compass className="h-3.5 w-3.5 text-primary" />
                      <span>Guias do Sistema</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg text-destructive focus:text-destructive">
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Terminar Sessão</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            <Button
              id="header-theme-toggle"
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="rounded-lg ml-1"
            >
              <Sun className="h-[1.15rem] w-[1.15rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.15rem] w-[1.15rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        )}
      </div>

      <InteractiveHelpDrawer open={helpDrawerOpen} onOpenChange={setHelpDrawerOpen} />
      <UniversalCommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </header>
  );
}
