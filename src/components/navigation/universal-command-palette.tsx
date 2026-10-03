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
  Lock,
  Smartphone,
  Radio,
  Globe,
  Users,
  Server,
  Mail,
  Camera,
  Layers,
  Scale
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

        {/* 1. PERÍCIA MÓVEL & DISPOSITIVOS APREENDIDOS */}
        <CommandGroup heading="Perícia Móvel & Dispositivos (Cellebrite / UFDR)">
          <CommandItem
            value="pericia movel laboratorio dispositivos extracoes celular smartphone ufdr"
            onSelect={() => runCommand(() => router.push('/pericia-movel'))}
            className="cursor-pointer py-2.5"
          >
            <Smartphone className="mr-2.5 h-4 w-4 text-amber-400" />
            <div className="flex flex-col flex-1">
              <span className="font-semibold text-xs text-foreground">Laboratório de Perícia Móvel</span>
              <span className="text-[10px] text-muted-foreground">Aquisição forense, extrações físicas, SQLite WAL e laudos</span>
            </div>
            <CommandShortcut className="text-amber-500 font-mono text-[10px]">Móvel</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="dispositivo apple iphone 15 pro max a3106 359123450912384 dev-2026-001"
            onSelect={() => runCommand(() => router.push('/pericia-movel?device=DEV-2026-001'))}
            className="cursor-pointer py-2"
          >
            <Smartphone className="mr-2.5 h-4 w-4 text-sky-400" />
            <div className="flex flex-col flex-1 truncate">
              <span className="font-semibold text-xs text-foreground truncate">iPhone 15 Pro Max (DEV-2026-001)</span>
              <span className="text-[10px] text-muted-foreground font-mono truncate">
                IMEI: 359123450912384 • Sistema de Ficheiros Avançado
              </span>
            </div>
            <CommandShortcut className="text-[10px] font-mono">iOS 17</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="dispositivo samsung galaxy s24 ultra sm-s928b 358992019283741 dev-2026-002"
            onSelect={() => runCommand(() => router.push('/pericia-movel?device=DEV-2026-002'))}
            className="cursor-pointer py-2"
          >
            <Smartphone className="mr-2.5 h-4 w-4 text-emerald-400" />
            <div className="flex flex-col flex-1 truncate">
              <span className="font-semibold text-xs text-foreground truncate">Galaxy S24 Ultra (DEV-2026-002)</span>
              <span className="text-[10px] text-muted-foreground font-mono truncate">
                IMEI: 358992019283741 • Extração Física Full Bit-by-Bit
              </span>
            </div>
            <CommandShortcut className="text-[10px] font-mono">Android 14</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="mensagens apagadas sqlite wal whatsapp signal telegram recuperadas"
            onSelect={() => runCommand(() => router.push('/pericia-movel?tab=chats&filter=deleted'))}
            className="cursor-pointer py-2"
          >
            <FileText className="mr-2.5 h-4 w-4 text-rose-400" />
            <div className="flex flex-col flex-1 truncate">
              <span className="font-semibold text-xs text-foreground truncate">Artefactos Eliminados (SQLite WAL)</span>
              <span className="text-[10px] text-rose-400/90 font-mono truncate">
                47 mensagens recuperadas em áreas não alocadas
              </span>
            </div>
            <CommandShortcut className="text-rose-400 text-[10px] font-mono">WAL</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="chamadas erbs bts antenas triangulacao telecom registros torre"
            onSelect={() => runCommand(() => router.push('/pericia-movel?tab=calls'))}
            className="cursor-pointer py-2"
          >
            <Radio className="mr-2.5 h-4 w-4 text-amber-400" />
            <div className="flex flex-col flex-1 truncate">
              <span className="font-semibold text-xs text-foreground truncate">Registos de Chamadas & Antenas BTS</span>
              <span className="text-[10px] text-muted-foreground font-mono truncate">
                Triangulação de torres de telecomunicações
              </span>
            </div>
            <CommandShortcut className="text-[10px] font-mono">BTS</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* MÓDULO OSINT & FONTES ABERTAS */}
        <CommandGroup heading="Inteligência OSINT & Fontes Abertas">
          <CommandItem
            value="osint pesquisa fontes abertas investigacao recon passivo"
            onSelect={() => runCommand(() => router.push('/osint'))}
            className="cursor-pointer py-2.5"
          >
            <Globe className="mr-2.5 h-4 w-4 text-sky-400" />
            <div className="flex flex-col flex-1">
              <span className="font-semibold text-xs text-foreground">Módulo OSINT • Visão Geral & Pesquisa</span>
              <span className="text-[10px] text-muted-foreground">Motor passivo de busca em fontes públicas, pessoas e empresas</span>
            </div>
            <CommandShortcut className="text-sky-400 font-bold">OSINT</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="osint dominio dns certificados ct whois infraestrutura"
            onSelect={() => runCommand(() => router.push('/osint?tab=dominio-analyzer'))}
            className="cursor-pointer py-2"
          >
            <Globe className="mr-2.5 h-4 w-4 text-amber-400" />
            <div className="flex flex-col flex-1 truncate">
              <span className="font-semibold text-xs text-foreground truncate">Reconhecimento de Domínio & DNS</span>
              <span className="text-[10px] text-muted-foreground truncate">Registos A, MX, NS, SOA e Certificate Transparency crt.sh</span>
            </div>
            <CommandShortcut className="text-[10px] font-mono">DNS</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="osint identidade digital resolucao entidades telefones numeros perfis sociais correlacao grafo desambiguacao"
            onSelect={() => runCommand(() => router.push('/osint?tab=identidade'))}
            className="cursor-pointer py-2"
          >
            <Users className="mr-2.5 h-4 w-4 text-emerald-400" />
            <div className="flex flex-col flex-1 truncate">
              <span className="font-semibold text-xs text-foreground truncate">Identidade Digital & Resolução de Entidades</span>
              <span className="text-[10px] text-muted-foreground truncate">Correlação probatória de telefones, perfis sociais, emails e grafo analítico</span>
            </div>
            <CommandShortcut className="text-[10px] font-mono">IDENTIDADE</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="osint ip redes bgp asn roteamento tor reverse dns ptr"
            onSelect={() => runCommand(() => router.push('/osint?tab=ip-analyzer'))}
            className="cursor-pointer py-2"
          >
            <Server className="mr-2.5 h-4 w-4 text-purple-400" />
            <div className="flex flex-col flex-1 truncate">
              <span className="font-semibold text-xs text-foreground truncate">Reconhecimento de IP & Redes</span>
              <span className="text-[10px] text-muted-foreground truncate">Resolução reversa PTR, ASN/BGP, geolocalização e deteção de nós Tor</span>
            </div>
            <CommandShortcut className="text-[10px] font-mono">IP</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="osint empresa nif sociedade socios diario da republica ubo"
            onSelect={() => runCommand(() => router.push('/osint?tab=empresa-analyzer'))}
            className="cursor-pointer py-2"
          >
            <Building2 className="mr-2.5 h-4 w-4 text-sky-400" />
            <div className="flex flex-col flex-1 truncate">
              <span className="font-semibold text-xs text-foreground truncate">Inteligência Societária & NIF</span>
              <span className="text-[10px] text-muted-foreground truncate">Pactos sociais, extratos de Diários da República e red flags AML</span>
            </div>
            <CommandShortcut className="text-[10px] font-mono">NIF</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="osint email correio brechas spf dmarc pgp gravatar vazamentos"
            onSelect={() => runCommand(() => router.push('/osint?tab=email-analyzer'))}
            className="cursor-pointer py-2"
          >
            <Mail className="mr-2.5 h-4 w-4 text-amber-400" />
            <div className="flex flex-col flex-1 truncate">
              <span className="font-semibold text-xs text-foreground truncate">Análise de Email & Brechas Públicas</span>
              <span className="text-[10px] text-muted-foreground truncate">Validação SPF/DMARC anti-spoofing e correlação de credenciais vazadas</span>
            </div>
            <CommandShortcut className="text-[10px] font-mono">EMAIL</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="osint imagem foto exif gps coordenadas phash perceptual hash camera"
            onSelect={() => runCommand(() => router.push('/osint?tab=media-analyzer'))}
            className="cursor-pointer py-2"
          >
            <Camera className="mr-2.5 h-4 w-4 text-emerald-400" />
            <div className="flex flex-col flex-1 truncate">
              <span className="font-semibold text-xs text-foreground truncate">Metadados EXIF & Mídia Forense</span>
              <span className="text-[10px] text-muted-foreground truncate">Parâmetros ópticos, geolocalização por satélite e Perceptual Hash</span>
            </div>
            <CommandShortcut className="text-[10px] font-mono">EXIF</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="osint scraping coleta crawl spider website monitoring snapshots diff web"
            onSelect={() => runCommand(() => router.push('/osint?tab=scraping'))}
            className="cursor-pointer py-2"
          >
            <Layers className="mr-2.5 h-4 w-4 text-emerald-400" />
            <div className="flex flex-col flex-1 truncate">
              <span className="font-semibold text-xs text-foreground truncate">Scraping & Coleta Automatizada</span>
              <span className="text-[10px] text-muted-foreground truncate">Jobs assíncronos, monitoramento de websites e diff histórico</span>
            </div>
            <CommandShortcut className="text-[10px] font-mono">SCRAPE</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="osint dorks construtor busca google bing duckduckgo templates consultas avancadas"
            onSelect={() => runCommand(() => router.push('/osint?tab=dorks'))}
            className="cursor-pointer py-2"
          >
            <Search className="mr-2.5 h-4 w-4 text-emerald-400" />
            <div className="flex flex-col flex-1 truncate">
              <span className="font-semibold text-xs text-foreground truncate">Dork Builder & Descoberta Ética</span>
              <span className="text-[10px] text-muted-foreground truncate">Consultas estruturadas, templates forenses e salvaguarda contra intrusão</span>
            </div>
            <CommandShortcut className="text-[10px] font-mono">DORKS</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="osint tos termos servico robots txt compliance gate politicas conformidade legal"
            onSelect={() => runCommand(() => router.push('/osint?tab=tos'))}
            className="cursor-pointer py-2"
          >
            <Scale className="mr-2.5 h-4 w-4 text-emerald-400" />
            <div className="flex flex-col flex-1 truncate">
              <span className="font-semibold text-xs text-foreground truncate">ToS Intelligence & Compliance Gate</span>
              <span className="text-[10px] text-muted-foreground truncate">Matriz de direitos ToS, parser robots.txt e validação prévia de coleta</span>
            </div>
            <CommandShortcut className="text-[10px] font-mono">TOS</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* 2. CASOS & INVESTIGAÇÕES RECENTES */}
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
          <CommandItem
            value="caso sombra digital operacao 2026-001 exfiltracao"
            onSelect={() => runCommand(() => router.push('/investigacao?case=case-001'))}
            className="cursor-pointer py-2"
          >
            <FolderKanban className="mr-2.5 h-4 w-4 text-amber-500" />
            <div className="flex flex-col flex-1 truncate">
              <span className="font-semibold text-xs text-foreground truncate">CASO-2026-001 • Op. Sombra Digital</span>
              <span className="text-[10px] text-muted-foreground">
                Exfiltração de Identidade e Ativos • Crítico
              </span>
            </div>
            <CommandShortcut className="text-[10px]">Ativo</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* 3. MÓDULOS NUCLEARES DO SISTEMA OPERACIONAL */}
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
            <CommandShortcut className="text-blue-500 font-bold">Abrir</CommandShortcut>
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
            <CommandShortcut className="text-emerald-500 font-bold">Custódia</CommandShortcut>
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
            <CommandShortcut className="text-purple-500 font-bold">Grafos</CommandShortcut>
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
            <CommandShortcut className="text-violet-500 font-bold">SI</CommandShortcut>
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
            <CommandShortcut className="text-amber-500 font-bold">Emitir</CommandShortcut>
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
            <CommandShortcut className="text-rose-500 font-bold">Auditoria</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* 4. AÇÕES RÁPIDAS DE INVESTIGAÇÃO & FORENSE */}
        <CommandGroup heading="Ações Rápidas de Investigação & Perícia">
          <CommandItem
            value="nova aquisicao forense extrair celular ufdr smartphone"
            onSelect={() => runCommand(() => router.push('/pericia-movel?action=nova_extracao'))}
            className="cursor-pointer py-2.5"
          >
            <Smartphone className="mr-2.5 h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold">Nova Aquisição Forense Móvel (UFDR)</span>
          </CommandItem>

          <CommandItem
            value="novo caso abrir dossie investigacao wizard"
            onSelect={() => runCommand(() => router.push('/investigacao?action=novo_caso'))}
            className="cursor-pointer py-2.5"
          >
            <PlusCircle className="mr-2.5 h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold">Criar Novo Caso / Dossiê (Assistente Guiado)</span>
          </CommandItem>

          <CommandItem
            value="ingerir evidencia upload sha-256 arquivo prova"
            onSelect={() => runCommand(() => router.push('/investigacao?action=upload_evidencia'))}
            className="cursor-pointer py-2.5"
          >
            <Fingerprint className="mr-2.5 h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold">Ingerir Evidência Digital (Cálculo SHA-256 no Navegador)</span>
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
