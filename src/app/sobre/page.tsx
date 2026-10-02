'use client';

import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, Compass, Target, Award, ArrowRight, Building2, HardHat, Cpu, Users } from 'lucide-react';
import Link from 'next/link';

export default function SobreNosPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-28 border-b bg-muted/20 relative overflow-hidden">
          <div className="container mx-auto px-4 md:px-6 max-w-5xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold tracking-wide uppercase text-primary">
              <Compass className="h-3.5 w-3.5" /> Inteligência Estratégica, Forense & Rigor Pericial
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground font-headline">
              Construímos a Infraestrutura Digital de Inteligência e Evidências.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
              A Profundidade foi concebida para garantir a integridade absoluta da prova, rastreabilidade ininterrupta da cadeia de custódia e correlação analítica avançada sobre Google Cloud Platform com isolamento multi-tenant rigoroso.
            </p>
          </div>
        </section>

        {/* Missão e Visão */}
        <section className="py-16 md:py-24 container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border shadow-sm p-6 bg-card space-y-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Target className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold font-headline">Nossa Missão</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Capacitar investigadores, analistas e peritos com ferramentas soberanas de custódia criptográfica, inteligência de fontes abertas (OSINT) e correlação de vínculos sem margem para contaminação probatória.
              </p>
            </Card>

            <Card className="border shadow-sm p-6 bg-card space-y-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Cpu className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold font-headline">Nossa Tecnologia</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Infraestrutura Google Cloud Platform (Cloud Run, Cloud SQL, Secret Manager, Cloud Storage) com hashing SHA-256 imediato, grafos de relacionamento e modelos de IA assistiva sob validação humana obrigatória (Human-in-the-Loop).
              </p>
            </Card>

            <Card className="border shadow-sm p-6 bg-card space-y-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Award className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold font-headline">Nossos Valores</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Inviolabilidade da cadeia de custódia, isolamento estrito entre organizações (multi-tenancy nativo), conformidade jurídica e transparência analítica com trilha de auditoria completa.
              </p>
            </Card>
          </div>
        </section>

        {/* Presença Operacional */}
        <section className="py-16 bg-muted/30 border-y">
          <div className="container mx-auto px-4 md:px-6 max-w-5xl">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl font-bold tracking-tight font-headline">Arquitetura de Alta Segurança em Nuvem</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Projetada para os cenários investigativos e periciais mais exigentes: de investigações de crimes cibernéticos e fraudes financeiras complexas a perícias judiciais de alta sensibilidade.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="p-6 bg-background rounded-xl border">
                <div className="text-3xl font-extrabold text-primary font-mono">SHA-256</div>
                <div className="text-xs text-muted-foreground uppercase font-semibold mt-1">Hashing Criptográfico de Evidências</div>
              </div>
              <div className="p-6 bg-background rounded-xl border">
                <div className="text-3xl font-extrabold text-primary font-mono">100%</div>
                <div className="text-xs text-muted-foreground uppercase font-semibold mt-1">Isolamento Multi-Tenant</div>
              </div>
              <div className="p-6 bg-background rounded-xl border">
                <div className="text-3xl font-extrabold text-primary font-mono">12 Módulos</div>
                <div className="text-xs text-muted-foreground uppercase font-semibold mt-1">Especializados de Investigação</div>
              </div>
              <div className="p-6 bg-background rounded-xl border">
                <div className="text-3xl font-extrabold text-primary font-mono">GCP</div>
                <div className="text-xs text-muted-foreground uppercase font-semibold mt-1">Google Cloud Platform Nativo</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center container mx-auto px-4">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold font-headline">Pronto para elevar o padrão das suas investigações?</h2>
            <p className="text-muted-foreground">
              Agende uma demonstração técnica confidencial com os nossos especialistas em inteligência e perícia forense.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild size="lg" className="rounded-xl px-8">
                <Link href="/contact">Fale Connosco <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl">
                <Link href="/solucoes">Conhecer Módulos</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
