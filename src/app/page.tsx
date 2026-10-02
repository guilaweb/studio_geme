'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import {
  Search,
  Shield,
  Network,
  Eye,
  Lock,
  Cpu,
  FileCheck,
  Share2,
  MapPin,
  Globe,
  Database,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Layers,
  BrainCircuit,
  ExternalLink,
  Sparkles,
  Fingerprint,
  FolderKanban,
  Activity,
  Menu,
  X,
  Mail,
  Check,
  FileText,
  Image as ImageIcon,
  Video,
  Newspaper,
  UserCheck,
  Building,
  Terminal,
  Compass,
  BookOpen,
  Send,
  Loader2,
  CheckSquare,
  ShieldAlert,
  Server,
  KeyRound,
  Workflow,
  Crosshair,
  Radar
} from 'lucide-react';

import { createLeadFromLandingDemo } from '@/actions/crm';
import { FaqJsonLd } from '@/components/seo/json-ld';
import { DEFAULT_BLOG_POSTS } from '@/lib/blog-data';

// FAQs Estruturados para SEO e Google Rich Snippets
const landingFaqs = [
  {
    question: 'O que é a Profundidade?',
    answer: 'A Profundidade é a Plataforma de Inteligência Digital, Investigação, Cibersegurança, Verificação de Informação e Gestão de Evidências. Foi concebida para equipas de auditoria forense, cibersegurança e inteligência que necessitam de transformar sinais dispersos em investigações estruturadas sob rigorosa cadeia de custódia SHA-256 e isolamento multi-tenant.',
  },
  {
    question: 'Como a Profundidade difere de ferramentas genéricas de OSINT?',
    answer: 'Ao contrário de ferramentas superficiais de busca pública, a Profundidade funciona como um centro de operações integrado: preserva a integridade probatória de cada dado com hash criptográfico SHA-256 imediato, modela relações em grafos multidimensionais, conta com Super Inteligência (SI) orientada por validação humana soberana (Human-in-the-Loop) e gera laudos periciais auditáveis.',
  },
  {
    question: 'Qual é a política de geointeligência da plataforma?',
    answer: 'A geointeligência da Profundidade baseia-se exclusivamente na organização e correlação contextual de dados geográficos e metadados legitimamente disponíveis nas fontes públicas analisadas. A plataforma não comercializa e não realiza rastreamento invasivo ou arbitrário de pessoas.',
  },
  {
    question: 'Como funciona o apoio a equipas de Pentest e Cibersegurança?',
    answer: 'A Profundidade organiza a superfície de ataque, vetores de reconhecimento, indicadores de comprometimento (IOCs) e relatórios periciais de testes de segurança, com a exigência estrita de conformidade legal e autorização formal prévia para qualquer ação de auditoria ofensiva.',
  },
  {
    question: 'Como a Super Inteligência (SI) apoia os investigadores?',
    answer: 'A SI processa grandes volumes de informação, sintetiza documentos, sugere correlações de grafos e formula hipóteses analíticas. Toda hipótese gerada pela IA permanece estritamente sugestiva até que o perito humano valide e assine o dossiê.',
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Estados de Interação
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  // Dialog State: Solicitar Demonstração
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoForm, setDemoForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    industry: 'Inteligência & Investigação',
  });

  // Submissão da Barra Rápida de Pesquisa/Investigação
  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      toast({
        title: 'Indique um alvo ou fonte',
        description: 'Digite uma URL, perfil, domínio, notícia ou identificador.',
        variant: 'destructive',
      });
      return;
    }
    // Redireciona diretamente para o workspace de investigação com a consulta
    router.push(`/investigacao?target=${encodeURIComponent(query)}`);
  };

  // Submissão da Demonstração Executiva
  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoForm.name || !demoForm.email) {
      toast({
        title: 'Campos Obrigatórios',
        description: 'Por favor, indique o seu nome e e-mail institucional.',
        variant: 'destructive',
      });
      return;
    }

    setDemoLoading(true);
    try {
      const res = await createLeadFromLandingDemo({
        name: demoForm.name,
        email: demoForm.email,
        company: demoForm.company,
        phone: demoForm.phone,
        industry: demoForm.industry,
      });

      if (res.success) {
        toast({
          title: 'Demonstração Solicitada!',
          description: 'A equipa técnica entrará em contacto para agendar a sessão.',
        });
        setDemoOpen(false);
        setDemoForm({
          name: '',
          email: '',
          company: '',
          phone: '',
          industry: 'Inteligência & Investigação',
        });
      } else {
        toast({
          title: 'Erro',
          description: res.message,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro no envio',
        description: 'Não foi possível enviar a solicitação. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setDemoLoading(false);
    }
  };

  // Submissão da Newsletter
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!email || !email.includes('@')) {
      toast({
        title: 'E-mail inválido',
        description: 'Insira um e-mail válido para subscrever a publicação técnica.',
        variant: 'destructive',
      });
      return;
    }

    setNewsletterLoading(true);
    try {
      const res = await fetch('/api/blog/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'Landing Page Newsletter' }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewsletterSuccess(true);
        toast({
          title: 'Subscrição confirmada',
          description: data.message || 'Receberá as próximas edições do Profundidade Intelligence.',
        });
        setNewsletterEmail('');
      } else {
        toast({
          title: 'Erro na subscrição',
          description: data.error || 'Não foi possível registar o e-mail.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro de conexão',
        description: 'Verifique a sua ligação e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <FaqJsonLd faqs={landingFaqs} />

      {/* ========================================================================= */}
      {/* 2. HEADER DA LANDING PAGE                                                 */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#070b12]/90 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Marca / Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black font-headline text-lg sm:text-xl shadow-[0_0_15px_rgba(6,182,212,0.35)] group-hover:scale-105 transition-transform">
              P
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-black text-lg sm:text-xl tracking-tight text-white leading-none">
                PROFUNDIDADE
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-cyan-400/80 mt-0.5">
                Inteligência & Investigação
              </span>
            </div>
          </Link>

          {/* Links Centrais (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="#inteligencia-digital" className="hover:text-cyan-400 transition-colors">
              Inteligência
            </a>
            <Link href="/investigacao" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
              <span>Investigações</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </Link>
            <a href="#verificacao" className="hover:text-cyan-400 transition-colors">
              Verificação
            </a>
            <a href="#ciberseguranca" className="hover:text-cyan-400 transition-colors">
              Cibersegurança
            </a>
            <a href="#laboratorio" className="hover:text-cyan-400 transition-colors">
              Laboratório
            </a>
            <a href="#si" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
              <span>SI</span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-cyan-500/40 text-cyan-300 bg-cyan-950/40">
                Super IA
              </Badge>
            </a>
            <Link href="/blog" className="hover:text-cyan-400 transition-colors">
              Blog
            </Link>
          </nav>

          {/* Ações (Desktop) */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <Button asChild size="sm" className="font-semibold text-xs h-9 px-4 bg-cyan-600 hover:bg-cyan-500 text-white shadow-md">
                <Link href="/investigacao" className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Workspace Ativo</span>
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="font-medium text-xs sm:text-sm h-9 text-slate-300 hover:text-white hover:bg-slate-800/60">
                  <Link href="/login">Entrar</Link>
                </Button>
                <Button asChild size="sm" className="font-semibold text-xs sm:text-sm h-9 px-4 bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
                  <Link href="/signup">Criar conta</Link>
                </Button>
              </>
            )}
          </div>

          {/* Menu Mobile Hamburger */}
          <div className="flex lg:hidden items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-800">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Abrir Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[#0a0f1d] border-slate-800 text-slate-200 w-[85vw] max-w-sm">
                <SheetHeader className="text-left border-b border-slate-800/80 pb-4 mb-4">
                  <SheetTitle className="font-headline font-black text-xl text-white flex items-center gap-2">
                    <span className="h-7 w-7 rounded-lg bg-cyan-500 flex items-center justify-center text-xs text-white">P</span>
                    PROFUNDIDADE
                  </SheetTitle>
                  <p className="text-xs text-slate-400">Sistema Operacional de Inteligência Digital</p>
                </SheetHeader>
                <div className="flex flex-col gap-3 py-2 text-sm font-medium">
                  <a
                    href="#inteligencia-digital"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg hover:bg-slate-800/60 text-slate-200"
                  >
                    Inteligência
                  </a>
                  <Link
                    href="/investigacao"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg hover:bg-slate-800/60 text-cyan-400 flex items-center justify-between"
                  >
                    <span>Investigações</span>
                    <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-300">Workspace</Badge>
                  </Link>
                  <a
                    href="#verificacao"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg hover:bg-slate-800/60 text-slate-200"
                  >
                    Verificação
                  </a>
                  <a
                    href="#ciberseguranca"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg hover:bg-slate-800/60 text-slate-200"
                  >
                    Cibersegurança
                  </a>
                  <a
                    href="#laboratorio"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg hover:bg-slate-800/60 text-slate-200"
                  >
                    Laboratório
                  </a>
                  <a
                    href="#si"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg hover:bg-slate-800/60 text-slate-200"
                  >
                    Super Inteligência (SI)
                  </a>
                  <Link
                    href="/blog"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg hover:bg-slate-800/60 text-slate-200"
                  >
                    Profundidade Intelligence (Blog)
                  </Link>
                </div>
                <div className="pt-6 border-t border-slate-800/80 flex flex-col gap-2.5">
                  {user ? (
                    <Button asChild className="w-full bg-cyan-600 hover:bg-cyan-500 text-white">
                      <Link href="/investigacao">Aceder ao Workspace</Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild variant="outline" className="w-full border-slate-700 text-slate-200 hover:bg-slate-800">
                        <Link href="/login">Entrar</Link>
                      </Button>
                      <Button asChild className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold">
                        <Link href="/signup">Criar conta</Link>
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. HERO & 4. BARRA DE PESQUISA INTERATIVA                                */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-slate-800/80 bg-radial-at-t from-[#0e172a] via-[#070b12] to-[#05080f]">
        {/* Constelação de Fundo / Rede de Entidades Discreta */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-nodes" width="80" height="80" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1.5" fill="#38bdf8" opacity="0.6" />
                <circle cx="50" cy="50" r="1.2" fill="#818cf8" opacity="0.4" />
                <line x1="10" y1="10" x2="50" y2="50" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.25" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-nodes)" />
          </svg>
        </div>

        <div className="container relative mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">
            {/* Tag Institucional */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 backdrop-blur-md text-xs font-semibold text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Plataforma de Inteligência, Investigação Digital, Cibersegurança e Verificação</span>
            </div>

            {/* Headline Principal */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-headline tracking-tight text-white leading-[1.12]">
              Veja além da informação.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
                Descubra as conexões.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-xl text-slate-300 max-w-3xl leading-relaxed">
              A Profundidade reúne Inteligência Digital, OSINT, análise de evidências, investigação, cibersegurança e verificação de informação numa única plataforma.
            </p>

            {/* 4. Barra de Pesquisa Direta no Hero */}
            <div className="w-full max-w-2xl pt-2">
              <form
                onSubmit={handleHeroSearch}
                className="relative rounded-2xl border border-cyan-500/40 bg-slate-900/90 backdrop-blur-md p-2 shadow-[0_0_30px_rgba(6,182,212,0.15)] focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/30 transition-all text-left"
              >
                <div className="px-3 pt-2 pb-1 flex items-center justify-between text-xs font-medium text-cyan-400/90 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5" />
                    O que pretende investigar?
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">OSINT & Entidades</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="URL, perfil, domínio, notícia, imagem ou entidade..."
                    className="border-0 bg-transparent text-white placeholder:text-slate-500 text-sm sm:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-11"
                  />
                  <Button
                    type="submit"
                    className="h-10 px-5 sm:px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shrink-0 flex items-center gap-1.5"
                  >
                    <span>Analisar</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-2 text-center">
                Exemplo: cole uma URL, domínio corporativo ou identificador social para iniciar uma análise imediata.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
              <Button asChild size="lg" className="w-full sm:w-auto font-bold text-sm sm:text-base h-12 px-8 bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                <Link href="/investigacao" className="flex items-center gap-2">
                  <span>Começar uma análise</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto font-semibold text-sm sm:text-base h-12 px-7 border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200">
                <a href="#dimensoes">Explorar a plataforma</a>
              </Button>
            </div>

            {/* Badges de Confiança e Capacidade */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs font-medium text-slate-300 pt-3">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-cyan-400" />
                Investigação
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-cyan-400" />
                OSINT
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-cyan-400" />
                Evidências
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-cyan-400" />
                Verificação
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-cyan-400" />
                Cibersegurança
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-cyan-400" />
                Análise com SI
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SEÇÃO: UMA PLATAFORMA. VÁRIAS DIMENSÕES                                */}
      {/* ========================================================================= */}
      <section id="dimensoes" className="py-20 sm:py-28 border-b border-slate-800/80 bg-[#090e1a]">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Uma plataforma. Várias dimensões.
            </span>
            <h2 className="text-2xl sm:text-4xl font-black font-headline text-white tracking-tight">
              Do dado à evidência. Da evidência à compreensão.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              A Profundidade unifica métodos investigativos, protocolos probatórios e ferramentas analíticas num ecossistema integrado para responder às perguntas mais complexas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Inteligência Digital */}
            <Card className="bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all p-6 rounded-2xl group">
              <div className="h-12 w-12 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-105 transition-transform">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                Inteligência Digital
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Analise perfis, páginas, domínios, conteúdos e relações digitais em profundidade, decodificando narrativas e dinâmicas públicas.
              </p>
            </Card>

            {/* Card 2: OSINT */}
            <Card className="bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all p-6 rounded-2xl group">
              <div className="h-12 w-12 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-105 transition-transform">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                OSINT
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Organize e analise informações provenientes de fontes abertas e autorizadas, eliminando o ruído e extraindo fatos verificáveis.
              </p>
            </Card>

            {/* Card 3: Análise de Relacionamentos */}
            <Card className="bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all p-6 rounded-2xl group">
              <div className="h-12 w-12 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5 group-hover:scale-105 transition-transform">
                <Network className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                Análise de Relacionamentos
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Descubra conexões ocultas entre pessoas, organizações, domínios, contas bancárias declaradas e documentos probatórios.
              </p>
            </Card>

            {/* Card 4: Cibersegurança */}
            <Card className="bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all p-6 rounded-2xl group">
              <div className="h-12 w-12 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 mb-5 group-hover:scale-105 transition-transform">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                Cibersegurança
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Investigue indicadores de comprometimento (IOCs), incidentes de segurança, exposições na internet e eventos anômalos.
              </p>
            </Card>

            {/* Card 5: Laboratório Forense */}
            <Card className="bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all p-6 rounded-2xl group">
              <div className="h-12 w-12 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
                <Fingerprint className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                Laboratório Forense
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Preserve, analise e correlacione evidências digitais com cadeia de custódia inquebrável protegida por hash SHA-256 e trilha de auditoria.
              </p>
            </Card>

            {/* Card 6: Verificação */}
            <Card className="bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all p-6 rounded-2xl group">
              <div className="h-12 w-12 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-105 transition-transform">
                <Eye className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                Verificação
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Analise notícias, imagens, vídeos e afirmações controversas com base nas evidências documentais e técnicas disponíveis.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. DEMONSTRAÇÃO VISUAL DO PRODUTO (MOCKUP SOC / CENTRO DE OPERAÇÕES)      */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-28 border-b border-slate-800/80 bg-[#070b12]">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Ambiente Integrado de Análise
            </span>
            <h2 className="text-2xl sm:text-4xl font-black font-headline text-white tracking-tight">
              Transforme informação dispersa em inteligência estruturada.
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Visão unificada inspirada em centros de operações de segurança e inteligência de estado, desenhada para clareza probatória.
            </p>
          </div>

          {/* Moldura do Cockpit / SOC Real */}
          <div className="rounded-2xl border border-slate-800 bg-[#0b1220] shadow-[0_0_50px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Top Bar da Janela */}
            <div className="bg-[#0e172a] px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="font-mono text-slate-300 ml-2 text-[11px]">
                  profundidade.app // workspace // investigacao-caso-402
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  CUSTÓDIA ATIVA
                </span>
                <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-300 bg-cyan-950/30">
                  TENANT ISOLATED
                </Badge>
              </div>
            </div>

            {/* Corpo do Workspace */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
              {/* Sidebar de Navegação de Investigação */}
              <div className="md:col-span-3 bg-[#0a0f1d] border-r border-slate-800 p-4 space-y-4">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 px-2">
                  INVESTIGAÇÃO
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 text-xs font-semibold">
                    <FolderKanban className="h-4 w-4" />
                    <span>Casos</span>
                    <Badge variant="secondary" className="ml-auto text-[10px] bg-cyan-900/60 text-cyan-200">12</Badge>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/50 text-xs font-medium cursor-pointer">
                    <Network className="h-4 w-4 text-purple-400" />
                    <span>Entidades</span>
                    <span className="ml-auto text-[10px] font-mono text-slate-400">37</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/50 text-xs font-medium cursor-pointer">
                    <Fingerprint className="h-4 w-4 text-emerald-400" />
                    <span>Evidências</span>
                    <span className="ml-auto text-[10px] font-mono text-slate-400">148</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/50 text-xs font-medium cursor-pointer">
                    <Globe className="h-4 w-4 text-blue-400" />
                    <span>OSINT Feeds</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/50 text-xs font-medium cursor-pointer">
                    <FileText className="h-4 w-4 text-amber-400" />
                    <span>Relatórios</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="text-[10px] uppercase font-mono text-slate-400">Integridade Criptográfica</div>
                    <div className="text-xs font-mono text-emerald-400 font-bold truncate">
                      SHA-256: 7f83b165...9481
                    </div>
                    <div className="text-[10px] text-slate-400">148 de 148 evidências validadas sem colisão.</div>
                  </div>
                </div>
              </div>

              {/* Área Central — Grafo de Inteligência Digital */}
              <div className="md:col-span-9 p-6 flex flex-col justify-between bg-gradient-to-br from-[#0c1424] via-[#090e1a] to-[#060a12] relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <h4 className="font-bold text-white text-base flex items-center gap-2">
                      <span>Dossiê Digital: Alvo & Correlações Societárias</span>
                      <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px]">Grafo Ativo</Badge>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Visão relacional multi-camadas entre empresas, contas, IPs e evidências.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs border-slate-700 bg-slate-800 text-slate-200">
                      Exportar Laudo
                    </Button>
                  </div>
                </div>

                {/* Visualizador de Grafo */}
                <div className="my-8 relative min-h-[220px] flex items-center justify-center">
                  {/* Linhas de Conexão SVG */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="25%" y1="50%" x2="50%" y2="25%" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
                    <line x1="50%" y1="25%" x2="75%" y2="50%" stroke="#818cf8" strokeWidth="1.5" opacity="0.6" />
                    <line x1="25%" y1="50%" x2="50%" y2="75%" stroke="#34d399" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />
                    <line x1="50%" y1="75%" x2="75%" y2="50%" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
                    <line x1="50%" y1="25%" x2="50%" y2="75%" stroke="#f43f5e" strokeWidth="1" opacity="0.3" />
                  </svg>

                  {/* Nós Interativos */}
                  <div className="w-full flex items-center justify-between px-6 sm:px-16 relative z-10">
                    {/* Nó 1: Entidade Alvo */}
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 rounded-2xl bg-cyan-900/80 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                        <UserCheck className="h-6 w-6 text-cyan-300" />
                      </div>
                      <span className="text-[11px] font-bold text-white mt-2">Identidade Alvo</span>
                      <span className="text-[10px] text-cyan-400 font-mono">@target_alpha</span>
                    </div>

                    {/* Nó Central: Empresa / Domínio */}
                    <div className="flex flex-col items-center">
                      <div className="h-14 w-14 rounded-2xl bg-purple-900/80 border-2 border-purple-400 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.4)]">
                        <Building className="h-7 w-7 text-purple-200" />
                      </div>
                      <span className="text-[11px] font-bold text-white mt-2">Empresa Vinculada</span>
                      <span className="text-[10px] text-purple-300 font-mono">NIF 5410982390</span>
                    </div>

                    {/* Nó 3: Evidência Pericial */}
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-900/80 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.4)]">
                        <FileCheck className="h-6 w-6 text-emerald-300" />
                      </div>
                      <span className="text-[11px] font-bold text-white mt-2">Dossiê Probatório</span>
                      <span className="text-[10px] text-emerald-400 font-mono">148 Evidências</span>
                    </div>
                  </div>
                </div>

                {/* Rodapé do Cockpit: Métricas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Evidências Seladas</span>
                    <span className="text-white font-mono font-bold text-sm">148</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Entidades Mapeadas</span>
                    <span className="text-white font-mono font-bold text-sm">37</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Grau de Incerteza</span>
                    <span className="text-cyan-400 font-mono font-bold text-sm">0.03% (Rigoroso)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Validação Humana</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">Confirmada</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. INVESTIGUE UMA PRESENÇA DIGITAL (ESTEIRA / RASTROS)                    */}
      {/* ========================================================================= */}
      <section id="inteligencia-digital" className="py-20 sm:py-28 border-b border-slate-800/80 bg-[#090e1a]">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Rastreamento de Sinais Digitais
            </span>
            <h2 className="text-2xl sm:text-4xl font-black font-headline text-white tracking-tight">
              Uma identidade digital deixa rastros.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              A Profundidade permite organizar sinais públicos e evidências disponíveis numa visão investigativa única, preservando a origem de cada informação.
            </p>
          </div>

          {/* Esteira Visual do Fluxo */}
          <div className="relative">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
              {[
                { step: '01', title: 'Perfil', desc: 'Identificadores e nomes de usuário', icon: UserCheck },
                { step: '02', title: 'Publicações', desc: 'Textos, declarações e interações', icon: MessageSquareIcon },
                { step: '03', title: 'Imagens', desc: 'Fotografias e verificação ELA', icon: ImageIcon },
                { step: '04', title: 'Domínios', desc: 'Registos DNS e WHOIS histórico', icon: Globe },
                { step: '05', title: 'Metadados', desc: 'Headers técnicos e estruturas', icon: Cpu },
                { step: '06', title: 'Entidades', desc: 'Organizações e pessoas citadas', icon: Building },
                { step: '07', title: 'Localizações', desc: 'Informações contextuais públicas', icon: MapPin },
                { step: '08', title: 'Timeline', desc: 'Cronologia reconstituída', icon: Activity },
                { step: '09', title: 'Grafo', desc: 'Conectividade e vínculos', icon: Network },
              ].map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 mb-2">
                        <span>{item.step}</span>
                        <IconComponent className="h-4 w-4 opacity-70" />
                      </div>
                      <div className="font-bold text-white text-sm mb-1">{item.title}</div>
                      <div className="text-[11px] text-slate-400 leading-tight">{item.desc}</div>
                    </div>
                    {idx < 8 && (
                      <div className="hidden lg:block text-right mt-3 text-slate-600">
                        <ChevronRight className="h-3.5 w-3.5 ml-auto text-cyan-500/60" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. GEOINTELIGÊNCIA                                                        */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-28 border-b border-slate-800/80 bg-[#070b12]">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Texto Explicativo */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                Geointeligência Ética
              </span>
              <h2 className="text-2xl sm:text-4xl font-black font-headline text-white tracking-tight leading-tight">
                Transforme publicações em contexto geográfico.
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Quando informações geográficas estão legitimamente disponíveis nas fontes analisadas, a Profundidade pode organizá-las numa timeline geoespacial.
              </p>

              {/* Disclaimer Obrigatório */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Princípio de Conformidade e Ética</span>
                </div>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  A geointeligência da Profundidade baseia-se exclusivamente em divulgações públicas e metadados contextuais legítimos. A plataforma não realiza rastreamento individual invasivo de dispositivos nem vigilância arbitrária.
                </p>
              </div>

              <div className="pt-2">
                <Button asChild variant="outline" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40">
                  <Link href="/investigacao" className="flex items-center gap-2">
                    <Compass className="h-4 w-4" />
                    <span>Ver Timeline Geoespacial no Workspace</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Demonstração de Nós Georreferenciados */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-800 bg-[#0c1424] p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                  <span className="font-mono text-cyan-400 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    CORRELAÇÃO ESPACIAL DE FONTES
                  </span>
                  <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
                    FONTES ABERTAS
                  </Badge>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  {/* Luanda */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/40 transition-colors">
                    <div className="flex items-center justify-between text-cyan-300 font-bold">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                        Luanda
                      </span>
                      <span className="text-[10px] text-slate-400">Publicação 01</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 pl-4.5 border-l border-slate-700 ml-1">
                      Relatório oficial emitido com geolocalização declarada • 14:22 UTC
                    </div>
                  </div>

                  {/* Benguela */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/40 transition-colors">
                    <div className="flex items-center justify-between text-blue-300 font-bold">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
                        Benguela
                      </span>
                      <span className="text-[10px] text-slate-400">Publicação 02</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 pl-4.5 border-l border-slate-700 ml-1">
                      Anúncio institucional de filial e registro comercial • 17:05 UTC
                    </div>
                  </div>

                  {/* Lubango */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/40 transition-colors">
                    <div className="flex items-center justify-between text-purple-300 font-bold">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                        Lubango
                      </span>
                      <span className="text-[10px] text-slate-400">Publicação 03</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 pl-4.5 border-l border-slate-700 ml-1">
                      Notícia pública de inauguração e contratos regionais • 09:40 UTC
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Projeção cartográfica: EPSG:4326</span>
                  <span className="text-cyan-400 font-medium">Correlação Temporal 100% Auditável</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. VERIFICAÇÃO DE CONTEÚDO                                                */}
      {/* ========================================================================= */}
      <section id="verificacao" className="py-20 sm:py-28 border-b border-slate-800/80 bg-[#090e1a]">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Laboratório de Verificação
            </span>
            <h2 className="text-2xl sm:text-4xl font-black font-headline text-white tracking-tight">
              Antes de acreditar. Verifique.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Audite mídias, narrativas e fontes com análises científicas e técnicas desenvolvidas para expor adulterações e deepfakes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {/* Card: Imagem */}
            <Card className="bg-slate-900/70 border-slate-800 hover:border-cyan-500/50 p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="h-10 w-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-105 transition-transform">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white text-base mb-2 group-hover:text-cyan-300 transition-colors">
                  Imagem
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Analise origem, metadados disponíveis, versões anteriores e sinais de manipulação através de Error Level Analysis (ELA).
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-800/60 text-[11px] font-mono text-cyan-400">
                EXIF & ELA Lab →
              </div>
            </Card>

            {/* Card: Vídeo */}
            <Card className="bg-slate-900/70 border-slate-800 hover:border-cyan-500/50 p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="h-10 w-10 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-105 transition-transform">
                  <Video className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white text-base mb-2 group-hover:text-cyan-300 transition-colors">
                  Vídeo
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Compare contexto, temporalidade, keyframes e informações disponíveis para diagnosticar sincronia labial e cortes anômalos.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-800/60 text-[11px] font-mono text-blue-400">
                Keyframe Forensics →
              </div>
            </Card>

            {/* Card: Notícia */}
            <Card className="bg-slate-900/70 border-slate-800 hover:border-cyan-500/50 p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="h-10 w-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform">
                  <Newspaper className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white text-base mb-2 group-hover:text-cyan-300 transition-colors">
                  Notícia
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Separe afirmações, fontes primárias e evidências documentais reais para identificar campanhas coordenadas de desinformação.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-800/60 text-[11px] font-mono text-purple-400">
                Fact-Check Engine →
              </div>
            </Card>

            {/* Card: Perfil */}
            <Card className="bg-slate-900/70 border-slate-800 hover:border-cyan-500/50 p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="h-10 w-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white text-base mb-2 group-hover:text-cyan-300 transition-colors">
                  Perfil
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Identifique inconsistências cronológicas, contas orquestradas e sinais de possível inautenticidade ou automação por botnet.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-800/60 text-[11px] font-mono text-emerald-400">
                Inauthenticity Check →
              </div>
            </Card>

            {/* Card: Página */}
            <Card className="bg-slate-900/70 border-slate-800 hover:border-cyan-500/50 p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="h-10 w-10 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-105 transition-transform">
                  <Globe className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white text-base mb-2 group-hover:text-cyan-300 transition-colors">
                  Página
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Analise possíveis sinais de impersonação, clonagem de websites institucionais e typosquatting de marcas corporativas.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-800/60 text-[11px] font-mono text-amber-400">
                Brand Impersonation →
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. CIBERSEGURANÇA & LABORATÓRIO                                          */}
      {/* ========================================================================= */}
      <section id="ciberseguranca" className="py-20 sm:py-28 border-b border-slate-800/80 bg-[#070b12]">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Operações de Segurança
            </span>
            <h2 className="text-2xl sm:text-4xl font-black font-headline text-white tracking-tight">
              Da superfície de ataque aos indicadores.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Mapeamento de ativos externos, análise de ameaças persistentes e catalogação rigorosa de evidências de incidentes.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-10">
            {[
              { title: 'Threat Intelligence', icon: Radar },
              { title: 'OSINT Técnico', icon: Globe },
              { title: 'Reconhecimento Autorizado', icon: Crosshair },
              { title: 'IOC Analysis', icon: Cpu },
              { title: 'Domain Intelligence', icon: Server },
              { title: 'Incident Analysis', icon: Activity },
              { title: 'Digital Forensics', icon: Fingerprint },
            ].map((cap, i) => {
              const IconC = cap.icon;
              return (
                <div key={i} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2 hover:border-cyan-500/40 transition-colors">
                  <IconC className="h-6 w-6 text-cyan-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-200">{cap.title}</div>
                </div>
              );
            })}
          </div>

          <div className="text-center" id="laboratorio">
            <Button asChild size="lg" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm h-12 px-8 shadow-md">
              <Link href="/investigacao#ciberseguranca" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Explorar o Laboratório de Cibersegurança</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. PENTEST (SEGURANÇA OFENSIVA ÉTICA)                                    */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-24 border-b border-slate-800/80 bg-[#090e1a]">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-[#0b1324] to-slate-900 p-8 sm:p-12 relative overflow-hidden shadow-2xl">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/30 bg-red-950/30 text-xs font-mono text-red-300">
                <Terminal className="h-3.5 w-3.5" />
                <span>MÓDULO DE SEGURANÇA OFENSIVA & AUDITORIA</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black font-headline text-white tracking-tight">
                Segurança começa antes do incidente.
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                A Profundidade apoia equipas autorizadas na organização de informações de reconhecimento, evidências, achados e relatórios de testes de segurança.
              </p>

              {/* Aviso explícito de autorização mandatório */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-red-500/40 text-xs text-red-200/90 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-0.5">Aviso de Conformidade Legal</span>
                  Utilize ferramentas de segurança apenas em sistemas próprios ou sob contrato com expressa autorização prévia. A Profundidade apoia a segurança defensiva e a auditoria ética.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 12. SI — SUPER INTELIGÊNCIA (HUMAN IN THE LOOP)                           */}
      {/* ========================================================================= */}
      <section id="si" className="py-20 sm:py-28 border-b border-slate-800/80 bg-[#070b12]">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Super Inteligência Assistiva
            </span>
            <h2 className="text-2xl sm:text-4xl font-black font-headline text-white tracking-tight leading-tight">
              A inteligência humana continua no centro.{' '}
              <span className="text-cyan-400">A SI amplia a capacidade de análise.</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              A SI auxilia na análise de grandes volumes de informação, identifica padrões, resume documentos, extrai entidades e ajuda a estruturar investigações complexas.
            </p>
          </div>

          {/* Fluxo Visual: Dados -> Evidências -> Correlação -> SI -> Insights -> Analista -> Validação */}
          <div className="max-w-5xl mx-auto mb-12">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
              {[
                { title: 'Dados', sub: 'Fontes dispersas', color: 'border-slate-700 text-slate-300' },
                { title: 'Evidências', sub: 'Hash SHA-256', color: 'border-cyan-500/50 text-cyan-300' },
                { title: 'Correlação', sub: 'Mapeamento', color: 'border-blue-500/50 text-blue-300' },
                { title: 'SI', sub: 'Modelos neurais', color: 'border-purple-500 text-purple-300 bg-purple-950/20' },
                { title: 'Insights', sub: 'Hipóteses', color: 'border-amber-500/50 text-amber-300' },
                { title: 'Analista', sub: 'Juízo crítico', color: 'border-emerald-500/50 text-emerald-300' },
                { title: 'Validação', sub: 'Laudo assinado', color: 'border-emerald-400 text-white bg-emerald-950/30' },
              ].map((step, idx) => (
                <div key={idx} className={`p-4 rounded-xl bg-slate-900/80 border ${step.color} flex flex-col justify-center`}>
                  <span className="text-xs font-mono text-slate-400 mb-1">{`0${idx + 1}`}</span>
                  <span className="font-bold text-sm">{step.title}</span>
                  <span className="text-[10px] text-slate-400 mt-1">{step.sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Princípio de Governança Analítica */}
          <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-[#0e172a] border border-cyan-500/30 text-center shadow-lg">
            <p className="text-sm sm:text-base font-medium text-slate-200 leading-relaxed italic">
              &ldquo;A SI apresenta hipóteses e evidências relacionadas. A decisão analítica e a assinatura técnica permanecem com o investigador.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 13. PARA QUEM É A PROFUNDIDADE?                                           */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-28 border-b border-slate-800/80 bg-[#090e1a]">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Público & Casos de Aplicação
            </span>
            <h2 className="text-2xl sm:text-4xl font-black font-headline text-white tracking-tight">
              Para quem é a Profundidade?
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Desenvolvida para responder às exigências de rigor técnico e confidencialidade dos mais diversos setores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {/* Empresas */}
            <Card className="bg-slate-900/60 border-slate-800 hover:border-cyan-500/40 p-5 rounded-2xl space-y-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Building className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Empresas</h3>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-center gap-1.5">• Due diligence societária</li>
                <li className="flex items-center gap-1.5">• Combate à fraude corporativa</li>
                <li className="flex items-center gap-1.5">• Gestão de compliance e risco</li>
                <li className="flex items-center gap-1.5">• Proteção de marca institucional</li>
              </ul>
            </Card>

            {/* Jornalistas e Investigadores */}
            <Card className="bg-slate-900/60 border-slate-800 hover:border-cyan-500/40 p-5 rounded-2xl space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Newspaper className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Jornalistas & Analistas</h3>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-center gap-1.5">• Verificação de fontes públicas</li>
                <li className="flex items-center gap-1.5">• Investigação documental aprofundada</li>
                <li className="flex items-center gap-1.5">• Análise de dados em fontes abertas</li>
                <li className="flex items-center gap-1.5">• Fact-checking rigoroso</li>
              </ul>
            </Card>

            {/* Equipas de Cibersegurança */}
            <Card className="bg-slate-900/60 border-slate-800 hover:border-cyan-500/40 p-5 rounded-2xl space-y-3">
              <div className="h-10 w-10 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Cibersegurança & SOC</h3>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-center gap-1.5">• Threat intelligence acionável</li>
                <li className="flex items-center gap-1.5">• Resposta a incidentes (IR)</li>
                <li className="flex items-center gap-1.5">• Análise de indicadores (IOCs)</li>
                <li className="flex items-center gap-1.5">• Investigação digital forense</li>
              </ul>
            </Card>

            {/* Consultores */}
            <Card className="bg-slate-900/60 border-slate-800 hover:border-cyan-500/40 p-5 rounded-2xl space-y-3">
              <div className="h-10 w-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Consultores</h3>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-center gap-1.5">• Inteligência empresarial estratégica</li>
                <li className="flex items-center gap-1.5">• Análise de risco geopolítico</li>
                <li className="flex items-center gap-1.5">• Investigação corporativa e M&A</li>
                <li className="flex items-center gap-1.5">• Mapeamento de concorrência</li>
              </ul>
            </Card>

            {/* Instituições */}
            <Card className="bg-slate-900/60 border-slate-800 hover:border-cyan-500/40 p-5 rounded-2xl space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Fingerprint className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-base">Instituições</h3>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-center gap-1.5">• Auditoria forense e peritagem</li>
                <li className="flex items-center gap-1.5">• Investigação institucional</li>
                <li className="flex items-center gap-1.5">• Segurança pública e regulatória</li>
                <li className="flex items-center gap-1.5">• Análise probatória certificada</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 14. CASOS DE UTILIZAÇÃO PRÁTICOS                                          */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-28 border-b border-slate-800/80 bg-[#070b12]">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Cenários do Mundo Real
            </span>
            <h2 className="text-2xl sm:text-4xl font-black font-headline text-white tracking-tight">
              Casos de utilização
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Desafios reais investigativos com soluções de resposta imediata na plataforma.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Caso 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
              <div className="text-sm font-semibold text-white">
                &ldquo;Esta página representa realmente a organização?&rdquo;
              </div>
              <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Verificação de Identidade Digital</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Audite datas de criação, certificados TLS, histórico de nomes e correlação de administradores para atestar autenticidade.
              </p>
            </div>

            {/* Caso 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
              <div className="text-sm font-semibold text-white">
                &ldquo;Esta imagem é original?&rdquo;
              </div>
              <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Image Verification Lab</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Analise níveis de compressão ELA e metadados EXIF para diagnosticar recortes, montagens e inserções artificiais.
              </p>
            </div>

            {/* Caso 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
              <div className="text-sm font-semibold text-white">
                &ldquo;Onde esta informação apareceu anteriormente?&rdquo;
              </div>
              <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Source & Content Intelligence</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Rastreie a primeira menção e a propagação temporal da notícia em arquivos históricos web e plataformas abertas.
              </p>
            </div>

            {/* Caso 4 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
              <div className="text-sm font-semibold text-white">
                &ldquo;Que entidades estão relacionadas?&rdquo;
              </div>
              <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Relationship Graph</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mapeie vínculos societários cruzados, endereços compartilhados e testas-de-ferro num grafo interativo com arestas qualificadas.
              </p>
            </div>

            {/* Caso 5 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
              <div className="text-sm font-semibold text-white">
                &ldquo;Existem padrões entre estas contas?&rdquo;
              </div>
              <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Network Analysis</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Detecte comportamento inautêntico coordenado (CIB), replicação automática de mensagens e fazendas de sockpuppets.
              </p>
            </div>

            {/* Caso 6 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
              <div className="text-sm font-semibold text-white">
                &ldquo;Quais documentos suportam esta conclusão?&rdquo;
              </div>
              <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Evidence Management & Custódia SHA-256</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Exiba cada prova com carimbo temporal e hash imutável pronto para inclusão em relatórios técnicos periciais.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 20. ARQUITETURA COMERCIAL DE 3 VIAS (EXPLORAR | INVESTIGAR | APRENDER)    */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-24 border-b border-slate-800/80 bg-[#090e1a]">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Arquitetura de Operação
            </span>
            <h2 className="text-2xl sm:text-4xl font-black font-headline text-white tracking-tight">
              Três vias para aceder à inteligência.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Via 1: Explorar */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 hover:border-cyan-500/40 transition-colors">
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">01 // FERRAMENTAS PÚBLICAS</div>
              <h3 className="text-xl font-bold text-white">Explorar</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Consultas rápidas e gratuitas de domínios, verificação preliminar de metadados e checagem de consistência de presenças digitais.
              </p>
              <Button asChild variant="outline" className="w-full border-slate-700 text-slate-200 hover:bg-slate-800">
                <a href="#hero">Iniciar Consulta Pública</a>
              </Button>
            </div>

            {/* Via 2: Investigar (SaaS Enterprise) */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0f1d35] to-slate-900 border-2 border-cyan-500/60 space-y-4 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative">
              <Badge className="absolute -top-3 right-6 bg-cyan-500 text-slate-950 font-bold text-[10px]">
                ENTERPRISE
              </Badge>
              <div className="text-xs font-mono text-cyan-300 uppercase tracking-wider">02 // PLATAFORMA INTEGRADA</div>
              <h3 className="text-xl font-bold text-white">Investigar</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Workspace com gestão de dossiês, cadeia de custódia SHA-256, Super Inteligência (SI), grafos relacionais e isolamento multi-tenant restrito.
              </p>
              <Button asChild className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md">
                <Link href="/investigacao">Aceder ao Workspace</Link>
              </Button>
            </div>

            {/* Via 3: Aprender (Profundidade Intelligence) */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 hover:border-cyan-500/40 transition-colors">
              <div className="text-xs font-mono text-purple-400 uppercase tracking-wider">03 // CENTRO EDITORIAL</div>
              <h3 className="text-xl font-bold text-white">Aprender</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Profundidade Intelligence: revista técnica com metodologias periciais, estudos de caso, análises de vulnerabilidades e guias de OSINT.
              </p>
              <Button asChild variant="outline" className="w-full border-slate-700 text-slate-200 hover:bg-slate-800">
                <Link href="/blog">Ler Publicação Técnica</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 15 & 16. PROFUNDIDADE INTELLIGENCE (BLOG / REVISTA TÉCNICA)               */}
      {/* ========================================================================= */}
      <section id="blog" className="py-20 sm:py-28 border-b border-slate-800/80 bg-[#070b12]">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/30 text-xs font-mono text-cyan-300 mb-3">
                <BookOpen className="h-3.5 w-3.5" />
                <span>REVISTA TÉCNICA & PUBLICAÇÃO ESPECIALIZADA</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black font-headline text-white tracking-tight">
                PROFUNDIDADE INTELLIGENCE
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Conhecimento de ponta para quem investiga o mundo digital.
              </p>
            </div>
            <Button asChild variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800 shrink-0">
              <Link href="/blog" className="flex items-center gap-2">
                <span>Ver todas as 20 publicações</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* 6 Categorias Temáticas */}
          <div className="flex flex-wrap items-center gap-2.5 mb-10 pb-6 border-b border-slate-800/80">
            {[
              { label: '🧠 Inteligência', cat: 'Inteligência' },
              { label: '🛡️ Cibersegurança', cat: 'Cibersegurança' },
              { label: '🔐 Pentest', cat: 'Pentest' },
              { label: '🔎 Investigação', cat: 'Investigação' },
              { label: '🤖 SI', cat: 'SI' },
              { label: '🌍 Geointeligência', cat: 'Geointeligência' },
            ].map((catItem, idx) => (
              <Link
                key={idx}
                href={`/blog?category=${encodeURIComponent(catItem.cat)}`}
                className="px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors"
              >
                {catItem.label}
              </Link>
            ))}
          </div>

          {/* 16. ARTIGO EM DESTAQUE (FEATURED ARTICLE) */}
          {DEFAULT_BLOG_POSTS.length > 0 && (
            <div className="mb-10">
              <Link href={`/blog/${DEFAULT_BLOG_POSTS[0].slug}`} className="block group">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden group-hover:border-cyan-500/50 transition-all grid grid-cols-1 md:grid-cols-12 shadow-xl">
                  <div className="md:col-span-5 relative aspect-[16/10] md:aspect-auto min-h-[260px] bg-slate-950">
                    {DEFAULT_BLOG_POSTS[0].featureImageUrl ? (
                      <Image
                        src={DEFAULT_BLOG_POSTS[0].featureImageUrl}
                        alt={DEFAULT_BLOG_POSTS[0].title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        priority
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700">
                        <BookOpen className="h-12 w-12" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider">
                        ARTIGO EM DESTAQUE
                      </Badge>
                    </div>
                  </div>

                  <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-3 text-xs font-mono text-cyan-400 mb-2">
                        <span>{DEFAULT_BLOG_POSTS[0].category}</span>
                        <span>•</span>
                        <span>{DEFAULT_BLOG_POSTS[0].readTimeMinutes} min de leitura técnica</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold font-headline text-white group-hover:text-cyan-300 transition-colors leading-snug">
                        {DEFAULT_BLOG_POSTS[0].title}
                      </h3>
                      <p className="text-sm text-slate-300 mt-3 line-clamp-3 leading-relaxed">
                        {DEFAULT_BLOG_POSTS[0].excerpt}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-medium text-slate-300">
                        {DEFAULT_BLOG_POSTS[0].author.displayName}
                      </span>
                      <span className="text-cyan-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Ler artigo completo →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Grid de Outros Artigos de Destaque */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DEFAULT_BLOG_POSTS.slice(1, 4).map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="block group">
                <Card className="h-full bg-slate-900/60 border-slate-800 group-hover:border-cyan-500/40 p-5 rounded-2xl flex flex-col justify-between transition-all">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-3">
                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-300 text-[10px]">
                        {post.category}
                      </Badge>
                      <span className="text-slate-500">{post.readTimeMinutes} min</span>
                    </div>
                    <h4 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors line-clamp-2 mb-2">
                      {post.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">{post.author.displayName}</span>
                    <span className="text-cyan-400 font-medium group-hover:translate-x-1 transition-transform">
                      Ler →
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 18. NEWSLETTER TÉCNICA                                                    */}
      {/* ========================================================================= */}
      <section className="py-20 border-b border-slate-800/80 bg-[#090e1a]">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/30 text-xs font-mono text-cyan-300">
            <Mail className="h-3.5 w-3.5" />
            <span>DISSEMINAÇÃO DE INTELIGÊNCIA</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black font-headline text-white tracking-tight">
            Receba inteligência diretamente na sua caixa de entrada.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Estudos de caso periciais, análises de novas superfícies de ataque e avanços metodológicos em OSINT sem ruído de marketing.
          </p>

          <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-2 pt-2">
            <Input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="seu.email@organizacao.ao"
              disabled={newsletterLoading || newsletterSuccess}
              required
              className="h-12 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 rounded-xl"
            />
            <Button
              type="submit"
              disabled={newsletterLoading || newsletterSuccess}
              className="h-12 px-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shrink-0 shadow-md"
            >
              {newsletterLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : newsletterSuccess ? (
                'Subscrito!'
              ) : (
                'Subscrever'
              )}
            </Button>
          </form>

          <p className="text-[11px] text-slate-400">
            Respeitamos a privacidade dos analistas. Cancele a subscrição a qualquer momento com 1 clique.
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 19. CTA FINAL                                                             */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-[#070b12] to-[#04070d]">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 text-center space-y-6">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 mx-auto">
            <Sparkles className="h-6 w-6" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-headline text-white tracking-tight max-w-3xl mx-auto leading-tight">
            Há informação. Há evidência. E há o que está entre elas.{' '}
            <span className="text-cyan-400">Descubra as conexões.</span>
          </h2>

          <p className="text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Inicie uma investigação estruturada hoje com a plataforma de inteligência digital, cadeia de custódia e verificação de informação.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button asChild size="lg" className="w-full sm:w-auto font-bold text-sm sm:text-base h-12 px-8 bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.3)]">
              <Link href="/signup">Criar conta gratuita</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto font-semibold text-sm sm:text-base h-12 px-7 border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200">
              <Link href="/investigacao">Explorar a plataforma</Link>
            </Button>
            <Button
              onClick={() => setDemoOpen(true)}
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto font-semibold text-sm sm:text-base h-12 px-6 text-cyan-400 hover:bg-cyan-950/40"
            >
              Solicitar Demonstração
            </Button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 20. FOOTER INSTITUCIONAL                                                  */}
      {/* ========================================================================= */}
      <footer className="py-14 sm:py-16 bg-[#04070d] text-slate-300 border-t border-slate-800/80">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-slate-800/80">
            {/* Coluna Marca & Posicionamento */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white font-black text-base shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                  P
                </div>
                <span className="font-headline font-black text-lg text-white">PROFUNDIDADE</span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Plataforma profissional de Inteligência Digital, Investigação, Cibersegurança, Verificação de Informação e Gestão de Evidências.
              </p>
              <div className="text-[11px] font-mono text-cyan-400/80 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Cadeia de Custódia SHA-256 • Tenant Isolated
              </div>
            </div>

            {/* Plataforma */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Plataforma</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/investigacao" className="hover:text-cyan-400 transition-colors">Workspace de Investigação</Link></li>
                <li><a href="#inteligencia-digital" className="hover:text-cyan-400 transition-colors">Inteligência Digital</a></li>
                <li><a href="#verificacao" className="hover:text-cyan-400 transition-colors">Laboratório de Verificação</a></li>
                <li><a href="#ciberseguranca" className="hover:text-cyan-400 transition-colors">Cibersegurança & SOC</a></li>
                <li><a href="#si" className="hover:text-cyan-400 transition-colors">Super Inteligência (SI)</a></li>
              </ul>
            </div>

            {/* Publicação & Recursos */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Recursos</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/blog" className="hover:text-cyan-400 transition-colors font-medium text-slate-300">Profundidade Intelligence</Link></li>
                <li><Link href="/manual" className="hover:text-cyan-400 transition-colors">Manual de Operação</Link></li>
                <li><Link href="/ajuda" className="hover:text-cyan-400 transition-colors">Central de Apoio & FAQ</Link></li>
                <li><Link href="/precos" className="hover:text-cyan-400 transition-colors">Planos & Subscrições</Link></li>
              </ul>
            </div>

            {/* Governança & Legal */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Governança & Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/termos" className="hover:text-cyan-400 transition-colors">Termos de Serviço</Link></li>
                <li><Link href="/privacidade" className="hover:text-cyan-400 transition-colors">Política de Privacidade</Link></li>
                <li><a href="#pentest" className="hover:text-cyan-400 transition-colors">Diretrizes de Auditoria</a></li>
                <li><Link href="/sobre" className="hover:text-cyan-400 transition-colors">Sobre a Profundidade</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Profundidade © 2026. Todos os direitos reservados.
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              Sistema Operacional Digital de Inteligência, Investigação e Evidências
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* MODAL: SOLICITAR DEMONSTRAÇÃO EXECUTIVA                                   */}
      {/* ========================================================================= */}
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="max-w-md w-[95vw] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-headline text-white">
              Solicitar Demonstração da Profundidade
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Agende uma apresentação técnica de como organizar dossiês, cadeia de custódia com hash SHA-256 e análises de inteligência na sua instituição.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDemoSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">Nome Completo *</Label>
              <Input
                placeholder="Ex: Dr. Manuel dos Santos"
                value={demoForm.name}
                onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                required
                className="h-10 text-xs bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">E-mail Institucional *</Label>
              <Input
                type="email"
                placeholder="manuel.santos@organizacao.ao"
                value={demoForm.email}
                onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                required
                className="h-10 text-xs bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Organização</Label>
                <Input
                  placeholder="Nome da entidade"
                  value={demoForm.company}
                  onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                  className="h-10 text-xs bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Contacto Telefónico</Label>
                <Input
                  placeholder="+244 9..."
                  value={demoForm.phone}
                  onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                  className="h-10 text-xs bg-slate-950 border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">Área de Atuação</Label>
              <Select
                value={demoForm.industry}
                onValueChange={(val) => setDemoForm({ ...demoForm, industry: val })}
              >
                <SelectTrigger className="h-10 text-xs bg-slate-950 border-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="Inteligência & Investigação">Inteligência & Investigação Digital</SelectItem>
                  <SelectItem value="Cibersegurança & SOC">Cibersegurança & SOC</SelectItem>
                  <SelectItem value="Auditoria & Perícia Forense">Auditoria Forense & Evidências</SelectItem>
                  <SelectItem value="Compliance & Antifraude">Compliance, Risco & Antifraude</SelectItem>
                  <SelectItem value="Gabinete Jurídico">Gabinete Jurídico & Contencioso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={demoLoading}
                className="w-full h-11 font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-md"
              >
                {demoLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A submeter pedido...
                  </>
                ) : (
                  'Agendar Apresentação Técnica'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Ícone auxiliar para o fluxo de publicações
function MessageSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
