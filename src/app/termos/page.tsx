'use client';

import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Scale, CheckCircle2, AlertCircle, FileText, ShieldAlert, Cpu, Wrench, Building2, HardHat } from 'lucide-react';
import Link from 'next/link';

export default function TermosDeUsoPage() {
  const lastUpdated = '11 de Setembro de 2026';

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 border-b bg-muted/20 relative overflow-hidden">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Scale className="h-3.5 w-3.5" /> Condições Gerais de Contratação & Utilização
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-headline">
              Termos e Condições de Uso da Plataforma
            </h1>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              Consulte as condições contratuais, responsabilidades técnicas, níveis de serviço e regras que regem a subscrição e utilização da plataforma Profundidade para operações de engenharia e indústria.
            </p>
            <div className="pt-2 text-xs font-mono text-muted-foreground">
              Vigência: A partir de {lastUpdated} • Edição Profissional & Enterprise
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12 md:py-16 container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="space-y-10 text-sm leading-relaxed">

            {/* 1. Aceitação e Definições */}
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2.5">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-mono">01</span>
                Aceitação dos Termos e Definições
              </h2>
              <p className="text-muted-foreground">
                Ao criar uma conta, subscrever um plano, agendar uma demonstração ou utilizar de qualquer forma a plataforma <strong>Profundidade</strong> (&quot;Serviço&quot;), o Utilizador ou a entidade jurídica em nome da qual este atua (&quot;Cliente&quot;) manifesta a sua plena concordância e adesão sem reservas a estes Termos de Uso.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3.5 rounded-xl bg-card border">
                  <span className="font-bold text-foreground">Plataforma:</span> Conjunto de aplicações web, motores de cálculo, módulos de campo e APIs desenvolvidos e operados pela Profundidade.
                </div>
                <div className="p-3.5 rounded-xl bg-card border">
                  <span className="font-bold text-foreground">Dados do Cliente:</span> Todas as informações orçamentais, medições, fotos, coordenadas e registos técnicos inseridos na plataforma.
                </div>
              </div>
            </div>

            <Separator />

            {/* 2. Licenciamento e Acesso */}
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2.5">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-mono">02</span>
                Licença de Utilização e Controlo de Acessos
              </h2>
              <p className="text-muted-foreground">
                A Profundidade concede ao Cliente uma licença não exclusiva, intransmissível, mundial (para a operação da organização) e limitada durante a vigência do contrato para aceder e usufruir da plataforma na gestão dos seus casos, investigações e custódia probatória.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Gestão de Credenciais:</strong> O Cliente é integralmente responsável por salvaguardar a confidencialidade dos logins de acesso, certificados e fatores de autenticação multifator (MFA) de todos os utilizadores registados sob o seu domínio corporativo.</li>
                <li><strong>Perfis de Permissão:</strong> A atribuição de permissões (Administrador Geral, Investigador Principal, Perito Forense, Analista de Inteligência, Oficial de Custódia, Auditor) deve observar o princípio do menor privilégio para evitar acessos inadvertidos a matérias classificadas.</li>
                <li><strong>Proibições Explícitas:</strong> É expressamente vedado realizar engenharia reversa, descompilação, exploração não autorizada de vulnerabilidades, tentativas de bypass de segregação multi-tenant ou sublicenciamento a terceiros sem acordo prévio formal.</li>
              </ul>
            </div>

            <Separator />

            {/* 3. Propriedade Intelectual */}
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2.5">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-mono">03</span>
                Propriedade Intelectual e Titularidade dos Dados
              </h2>
              <div className="space-y-3">
                <Card className="p-5 border bg-card rounded-xl">
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Os Dados da Investigação Pertencem 100% ao Cliente
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O Cliente mantém todos os direitos de propriedade e titularidade total e exclusiva sobre os dossiês de caso, entidades, evidências, registos de custódia e relatórios inseridos na plataforma. A Profundidade não reivindica qualquer direito de propriedade sobre tais conteúdos.
                  </p>
                </Card>

                <Card className="p-5 border bg-card rounded-xl">
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-2">
                    <Cpu className="h-4 w-4 text-primary" /> Propriedade Intelectual da Plataforma
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Todos os códigos-fonte, algoritmos de cálculo de hash criptográfico, grafos de relacionamentos, motores analíticos de SI, interfaces de utilizador e documentação técnica são propriedade exclusiva da Profundidade e protegidos pela legislação de propriedade intelectual.
                  </p>
                </Card>
              </div>
            </div>

            <Separator />

            {/* 4. Níveis de Serviço (SLA) e Disponibilidade */}
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2.5">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-mono">04</span>
                Acordo de Nível de Serviço (SLA) e Suporte Técnico
              </h2>
              <p className="text-muted-foreground">
                Reconhecemos que as operações de inteligência, segurança e investigação pericial exigem alta disponibilidade e resiliência:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Disponibilidade Contratual de 99.7%:</strong> Garantia de disponibilidade mensal dos serviços na nuvem GCP, excluindo manutenções preventivas programadas comunicadas com antecedência.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Garantia de Integridade Probatória:</strong> O armazenamento de evidências no Google Cloud Storage conta com cálculo de SHA-256 e replicação redundante para preservação absoluta de ficheiros periciais.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Canais de Suporte Especializado:</strong> Apoio técnico confidencial disponível por canais criptografados com tempo de resposta inicial inferior a 2 horas para incidentes críticos.</span>
                </li>
              </ul>
            </div>

            <Separator />

            {/* 5. Responsabilidade Técnica e Validação Humana */}
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2.5">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-mono">05</span>
                Responsabilidade Pericial e Validação Humana Obrigatória (Human-in-the-Loop)
              </h2>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>AVISO FORENSE & DEONTOLÓGICO OBRIGATÓRIO</span>
                </div>
                <p className="leading-relaxed">
                  A plataforma Profundidade constitui um Sistema Operacional Digital de Inteligência, Investigação e Evidências. As análises automatizadas e inferências probabilísticas geradas pela camada de inteligência (SI) constituem exclusivamente assistência investigativa preliminar, sujeitas obrigatoriamente a validação por peritos, analistas ou investigadores humanos habilitados. Os resultados gerados por algoritmos não substituem o juízo técnico pericial ou a autoridade legal competente.
                </p>
              </div>
            </div>

            <Separator />

            {/* 6. Faturação, Pagamentos e Moeda */}
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2.5">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-mono">06</span>
                Subscrição, Faturação e Condições Financeiras
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Moeda de Faturação:</strong> As subscrições em Angola são faturadas em Kwanzas (AOA) com emissão de fatura/recibo certificada pela AGT (Administração Geral Tributária), ou em USD/EUR para operações internacionais.</li>
                <li><strong>Ciclos de Pagamento:</strong> Mensal ou anual pré-pago, conforme formalizado na proposta comercial executiva adjudicada.</li>
                <li><strong>Suspensão por Inadimplemento:</strong> O não pagamento das faturas após notificação formal com prazo de regularização poderá acarretar a suspensão temporária do acesso à plataforma, sem prejuízo da guarda e exportação dos dados da entidade.</li>
              </ul>
            </div>

            <Separator />

            {/* 7. Lei Aplicável e Jurisdição */}
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2.5">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-mono">07</span>
                Lei Aplicável e Foro Competente
              </h2>
              <p className="text-muted-foreground">
                Os presentes Termos de Uso são regidos e interpretados em conformidade com as leis da <strong>República de Angola</strong>. Qualquer litígio emergente da interpretação, validade ou execução deste contrato que não seja dirimido por mútuo acordo entre as partes será submetido à jurisdição exclusiva dos Tribunais da Comarca de Luanda, com expressa renúncia a qualquer outro foro.
              </p>
            </div>

            <Separator />

            {/* 8. Contactos Jurídicos */}
            <div className="p-6 rounded-2xl bg-muted/40 border space-y-3">
              <h3 className="text-base font-bold font-headline text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Esclarecimento de Dúvidas Jurídicas e Contratuais
              </h3>
              <p className="text-xs text-muted-foreground">
                Para solicitar esclarecimentos sobre acordos de nível de serviço específicos, aditamentos contratuais empresariais ou termos de parceria, contacte a nossa equipa:
              </p>
              <div className="text-xs space-y-1 font-mono text-foreground">
                <div><strong>Departamento Jurídico & Compliance:</strong> legal@profundidade.ao</div>
                <div><strong>Apoio ao Cliente:</strong> suporte@profundidade.ao</div>
                <div><strong>Sede Operacional:</strong> Luanda, República de Angola</div>
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
