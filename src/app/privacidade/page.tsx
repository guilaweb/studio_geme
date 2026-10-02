'use client';

import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Lock, Eye, Database, FileText, Globe, CheckCircle2, Building2, UserCheck } from 'lucide-react';
import Link from 'next/link';

export default function PoliticaPrivacidadePage() {
  const lastUpdated = '11 de Setembro de 2026';

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 border-b bg-muted/20 relative overflow-hidden">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Proteção de Dados & Soberania Operacional
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-headline">
              Política de Privacidade e Proteção de Dados
            </h1>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              Saiba como a plataforma Profundidade recolhe, processa, protege e armazena os dados operacionais, de engenharia e corporativos da sua organização em conformidade com a legislação da República de Angola e os mais elevados padrões internacionais.
            </p>
            <div className="pt-2 text-xs font-mono text-muted-foreground">
              Última atualização: {lastUpdated} • Versão 2.4 (Enterprise)
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12 md:py-16 container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="space-y-10 text-sm leading-relaxed">

            {/* 1. Introdução e Enquadramento */}
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2.5">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-mono">01</span>
                Introdução e Âmbito de Aplicação
              </h2>
              <p className="text-muted-foreground">
                A <strong>Profundidade</strong> (doravante designada por &quot;Plataforma&quot;, &quot;nós&quot; ou &quot;nosso&quot;), com sede de operações em Luanda, Angola, disponibiliza soluções de software especializadas para gestão de operações, obras civis, mineração, energia, infraestruturas e telecomunicações.
              </p>
              <p className="text-muted-foreground">
                Reconhecemos o valor crítico e a confidencialidade dos dados de engenharia, custos unitários (CPU), coordenadas geográficas de concessões e dados de colaboradores geridos através da nossa plataforma. Esta Política estabelece o nosso compromisso inabalável com a privacidade, confidencialidade e segurança desses ativos.
              </p>
            </div>

            <Separator />

            {/* 2. Princípios de Conformidade Legal */}
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2.5">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-mono">02</span>
                Conformidade Legal e Soberania dos Dados
              </h2>
              <p className="text-muted-foreground">
                O tratamento de dados pessoais e corporativos na Profundidade rege-se pelos princípios da legalidade, lealdade, transparência e minimização, em estrito cumprimento da:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Lei nº 22/11 (Lei da Proteção de Dados Pessoais de Angola - LPDP):</strong> Garantia de tratamento lícito de dados de cidadãos e trabalhadores em território angolano.</li>
                <li><strong>Regulamentações da APD (Agência de Proteção de Dados de Angola):</strong> Aplicação de salvaguardas técnicas e organizativas exigidas para sistemas informáticos.</li>
                <li><strong>Boas Práticas Internacionais (ISO/IEC 27001 e GDPR):</strong> Referenciais de segurança da informação e gestão de privacidade em ambientes na nuvem.</li>
              </ul>
            </div>

            <Separator />

            {/* 3. Dados que Recolhemos e Processamos */}
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2.5">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-mono">03</span>
                Tipologias de Dados Tratados
              </h2>
              <p className="text-muted-foreground">
                A Profundidade atua prioritariamente como <em>Subcontratante / Operador</em> relativamente aos dados operacionais inseridos pelas entidades clientes, e como <em>Responsável pelo Tratamento</em> relativamente aos dados cadastrais da subscrição:
              </p>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <Card className="p-5 border bg-card rounded-xl">
                  <div className="flex items-center gap-2 font-semibold text-foreground mb-2 text-xs uppercase tracking-wider">
                    <UserCheck className="h-4 w-4 text-primary" /> Dados de Utilizadores & RH
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                    <li>Nome, e-mail corporativo, número de telefone funcional.</li>
                    <li>Cargo, departamento, número de mecanografia.</li>
                    <li>Registo de presenças, ponto biométrico e ausências em estaleiro.</li>
                    <li>Registos de segurança no trabalho (HSEQ) e fichas de formação.</li>
                  </ul>
                </Card>

                <Card className="p-5 border bg-card rounded-xl">
                  <div className="flex items-center gap-2 font-semibold text-foreground mb-2 text-xs uppercase tracking-wider">
                    <Database className="h-4 w-4 text-primary" /> Dados Técnicos & Operacionais
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                    <li>Dossiês de caso, entidades, relacionamentos e notas de investigação.</li>
                    <li>Metadados de ficheiros, coordenadas de apreensão e cadeia de custódia.</li>
                    <li>Evidências digitais com hash SHA-256 e versões documentais imutáveis.</li>
                    <li>Registos de fontes OSINT com URLs e identificadores de proveniência.</li>
                  </ul>
                </Card>
              </div>
            </div>

            <Separator />

            {/* 4. Finalidades do Tratamento */}
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2.5">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-mono">04</span>
                Finalidades do Tratamento dos Dados
              </h2>
              <p className="text-muted-foreground">
                Os dados são tratados exclusivamente para os seguintes fins legítimos:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Execução dos Serviços Contratados:</strong> Disponibilização das ferramentas de gestão de casos, análise de grafos de relacionamentos, preservação de cadeia de custódia e emissão de relatórios periciais.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Sincronização Segura e Isolamento de Tenant:</strong> Armazenamento local seguro temporário em navegadores com garantia estrita de segregação multi-tenant entre organizações.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Sistema de Inteligência (SI Assistiva):</strong> Processamento automatizado de documentos para sumarização e extração de entidades sob validação humana obrigatória (Human-in-the-Loop).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Auditoria e Segurança da Informação:</strong> Rastreabilidade de ações sensíveis (visualização de casos, download de evidências, alterações cadastrais) mediante logs de auditoria imutáveis.</span>
                </li>
              </ul>
            </div>

            <Separator />

            {/* 5. Segurança e Medidas Técnicas */}
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2.5">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-mono">05</span>
                Segurança, Criptografia e Armazenamento
              </h2>
              <p className="text-muted-foreground">
                A segurança dos dados corporativos é um pilar estrutural da arquitetura da Profundidade:
              </p>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-card border flex items-start gap-3">
                  <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Criptografia Avançada</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Todos os dados transmitidos utilizam protocolos TLS 1.3 com cifras fortes. Os dados armazenados em bases de dados e Cloud Storage são cifrados em repouso com algoritmo padrão AES-256.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-card border flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Controlo Granular Baseado em Funções (RBAC)</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Acesso estritamente segregado por permissões de perfil (Super Admin, Investigador Principal, Perito Forense, Analista de Inteligência, Oficial de Custódia, Auditor).
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-card border flex items-start gap-3">
                  <Globe className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Backups Redundantes e Recuperação de Desastres</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cópias de segurança diárias geodistribuídas com tolerância a falhas e objetivos de tempo de recuperação (RTO) inferiores a 4 horas.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* 6. Direitos dos Titulares dos Dados */}
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2.5">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-mono">06</span>
                Direitos dos Titulares dos Dados
              </h2>
              <p className="text-muted-foreground">
                Em harmonia com a legislação angolana e internacional, qualquer titular de dados possui os seguintes direitos:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
                <li><strong>Direito de Acesso:</strong> Confirmar e aceder aos dados pessoais sob tratamento.</li>
                <li><strong>Direito de Retificação:</strong> Solicitar a correção imediata de informações inexatas ou incompletas.</li>
                <li><strong>Direito ao Apagamento:</strong> Pedir a eliminação definitiva de dados, ressalvadas as obrigações legais de conservação fiscal e técnica.</li>
                <li><strong>Direito à Portabilidade:</strong> Exportar dados de projetos e cadastros em formatos abertos e estruturados (JSON, CSV, PDF).</li>
              </ul>
            </div>

            <Separator />

            {/* 7. Contacto do Encarregado de Proteção de Dados (DPO) */}
            <div className="p-6 rounded-2xl bg-muted/40 border space-y-3">
              <h3 className="text-base font-bold font-headline text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Contacto para Questões de Privacidade
              </h3>
              <p className="text-xs text-muted-foreground">
                Para exercer os seus direitos, colocar dúvidas sobre o tratamento de dados ou reportar qualquer incidente de segurança, contacte o nosso gabinete de conformidade e segurança:
              </p>
              <div className="text-xs space-y-1 font-mono text-foreground">
                <div><strong>Encarregado de Proteção de Dados (DPO):</strong> dpo@profundidade.ao</div>
                <div><strong>Suporte Técnico & Privacidade:</strong> privacidade@profundidade.ao</div>
                <div><strong>Localização:</strong> Luanda, República de Angola</div>
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
