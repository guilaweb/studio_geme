'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CommandDialog, 
  CommandInput, 
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem, 
  CommandSeparator,
  CommandShortcut 
} from '@/components/ui/command';
import { 
  Search, 
  FileText, 
  Briefcase, 
  BrainCircuit, 
  BarChart3, 
  ShieldAlert,
  Fingerprint,
  Share2,
  FolderKanban,
  PlusCircle,
  ShieldCheck,
  FileCheck,
  Building2,
  Lock
} from 'lucide-react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project } from '@/types/project';

interface UniversalCommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  currentProjectId?: string;
  onSelectAction?: (action: string) => void;
}

export function UniversalCommandPalette({
  open: externalOpen,
  onOpenChange: setExternalOpen,
  currentProjectId,
  onSelectAction,
}: UniversalCommandPaletteProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = setExternalOpen || setInternalOpen;

  const [projects, setProjects] = useState<Project[]>([]);

  // Carregar lista de casos / investigações do utilizador
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'projects'), limit(15));
    const unsub = onSnapshot(q, snap => {
      const projs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      setProjects(projs);
    }, err => {
      console.warn('Erro ao carregar casos na command palette:', err);
    });
    return () => unsub();
  }, [user]);

  // Listener Global de Teclado (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  // Listener para disparar abertura via CustomEvent
  useEffect(() => {
    const handleCustomOpen = () => setOpen(true);
    window.addEventListener('profundidade_open_command_palette', handleCustomOpen);
    return () => window.removeEventListener('profundidade_open_command_palette', handleCustomOpen);
  }, [setOpen]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandInput placeholder="Pesquisar casos, evidências, entidades, dossiês, grafos..." />
      <CommandList className="max-h-[380px]">
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        {/* 1. CASOS & INVESTIGAÇÕES RECENTES */}
        <CommandGroup heading="Casos & Dossiês de Investigação">
          {projects.map((proj) => (
            <CommandItem
              key={proj.id}
              value={`caso dossie ${proj.name} ${proj.code || ''}`}
              onSelect={() => runCommand(() => router.push('/investigacao'))}
              className="cursor-pointer py-2"
            >
              <FolderKanban className="mr-2 h-4 w-4 text-primary" />
              <div className="flex flex-col flex-1 truncate">
                <span className="font-semibold text-xs text-foreground truncate">{proj.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  Classificação: Confidencial • Custódia Ativa
                </span>
              </div>
              <CommandShortcut className="text-[10px]">Abrir</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* 2. MÓDULOS NUCLEARES DO SISTEMA OPERACIONAL */}
        <CommandGroup heading="Módulos Centrais do Sistema Operacional">
          <CommandItem
            value="workspace investigacao casos dossies alvos diligencias"
            onSelect={() => runCommand(() => router.push('/investigacao'))}
            className="cursor-pointer py-2.5"
          >
            <FolderKanban className="mr-2.5 h-4 w-4 text-blue-500" />
            <div className="flex flex-col flex-1">
              <span className="font-semibold text-xs text-foreground">Workspace de Investigação & Dossiês</span>
              <span className="text-[10px] text-muted-foreground">Gestão de casos, equipas de investigação e alvos</span>
            </div>
            <CommandShortcut className="text-blue-600 font-bold">Abrir</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="custodia sha-256 evidencias cadeia gcs forense integridade"
            onSelect={() => runCommand(() => router.push('/investigacao#custodia'))}
            className="cursor-pointer py-2.5"
          >
            <Fingerprint className="mr-2.5 h-4 w-4 text-emerald-500" />
            <div className="flex flex-col flex-1">
              <span className="font-semibold text-xs text-foreground">Cadeia de Custódia SHA-256 (GCP)</span>
              <span className="text-[10px] text-muted-foreground">Hashing criptográfico imediato e integridade probatória</span>
            </div>
            <CommandShortcut className="text-emerald-600 font-bold">Custódia</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="grafos relacionamentos vinculos entidades pessoas empresas contas"
            onSelect={() => runCommand(() => router.push('/investigacao#grafo'))}
            className="cursor-pointer py-2.5"
          >
            <Share2 className="mr-2.5 h-4 w-4 text-purple-500" />
            <div className="flex flex-col flex-1">
              <span className="font-semibold text-xs text-foreground">Grafos & Análise de Vínculos</span>
              <span className="text-[10px] text-muted-foreground">Rede de ligações entre suspeitos, empresas e contas bancárias</span>
            </div>
            <CommandShortcut className="text-purple-600 font-bold">Grafos</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="inteligencia si human-in-the-loop modelos analise ia padroes"
            onSelect={() => runCommand(() => router.push('/investigacao#si'))}
            className="cursor-pointer py-2.5"
          >
            <BrainCircuit className="mr-2.5 h-4 w-4 text-violet-500" />
            <div className="flex flex-col flex-1">
              <span className="font-semibold text-xs text-foreground">Sistema de Inteligência (SI) Assistiva</span>
              <span className="text-[10px] text-muted-foreground">Extração de entidades e sumarização com validação humana</span>
            </div>
            <CommandShortcut className="text-violet-600 font-bold">SI</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="relatorios periciais laudos autos pdf custodia conclusoes"
            onSelect={() => runCommand(() => router.push('/investigacao#relatorios'))}
            className="cursor-pointer py-2.5"
          >
            <FileText className="mr-2.5 h-4 w-4 text-amber-500" />
            <div className="flex flex-col flex-1">
              <span className="font-semibold text-xs text-foreground">Centro de Relatórios & Laudos Periciais</span>
              <span className="text-[10px] text-muted-foreground">Exportação de dossiês em PDF com cadeia de custódia e evidências</span>
            </div>
            <CommandShortcut className="text-amber-600 font-bold">Emitir</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="auditoria trilha logs imutaveis login evidencias rbac tenancia"
            onSelect={() => runCommand(() => router.push('/admin'))}
            className="cursor-pointer py-2.5"
          >
            <ShieldCheck className="mr-2.5 h-4 w-4 text-rose-500" />
            <div className="flex flex-col flex-1">
              <span className="font-semibold text-xs text-foreground">Trilha de Auditoria & Segurança Multi-Tenant</span>
              <span className="text-[10px] text-muted-foreground">Registo imutável de acessos, downloads e integridade de tenant</span>
            </div>
            <CommandShortcut className="text-rose-600 font-bold">Auditoria</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* 3. AÇÕES RÁPIDAS DE INVESTIGAÇÃO */}
        <CommandGroup heading="Ações Rápidas de Investigação">
          <CommandItem
            value="novo caso abrir dossie investigacao"
            onSelect={() => runCommand(() => router.push('/investigacao?action=novo_caso'))}
            className="cursor-pointer py-2.5"
          >
            <PlusCircle className="mr-2.5 h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold">Criar Novo Caso / Dossiê</span>
          </CommandItem>

          <CommandItem
            value="ingerir evidencia upload sha-256 arquivo prova"
            onSelect={() => runCommand(() => router.push('/investigacao?action=upload_evidencia'))}
            className="cursor-pointer py-2.5"
          >
            <Fingerprint className="mr-2.5 h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold">Ingerir Evidência Digital (Cálculo SHA-256)</span>
          </CommandItem>

          <CommandItem
            value="adicionar entidade alvo suspeito empresa conta"
            onSelect={() => runCommand(() => router.push('/investigacao?action=nova_entidade'))}
            className="cursor-pointer py-2.5"
          >
            <Building2 className="mr-2.5 h-4 w-4 text-purple-500" />
            <span className="text-xs font-semibold">Adicionar Entidade (Pessoa, Empresa ou Conta)</span>
          </CommandItem>

          <CommandItem
            value="executar analise si assistente relatorio"
            onSelect={() => runCommand(() => router.push('/investigacao?action=executar_si'))}
            className="cursor-pointer py-2.5"
          >
            <BrainCircuit className="mr-2.5 h-4 w-4 text-violet-500" />
            <span className="text-xs font-semibold">Executar Análise de Inteligência SI (Human-in-the-Loop)</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
