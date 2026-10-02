'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Shield,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  HardHat,
  Lock,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

export default function HrPermissionsTab() {
  const rolesSummary = [
    {
      role: 'Administrador da Organização',
      who: 'Diretor de TI / Administrador Global',
      access: 'Acesso pleno a toda a organização, parametrizações globais, auditoria e permissões.',
      permissions: ['Gestão Integral de RH', 'Configuração de Permissões', 'Aprovação Final Direta', 'Gestão Cadastral'],
      badge: 'Admin Global'
    },
    {
      role: 'Gestor de Recursos Humanos (RH)',
      who: 'Responsável e Técnicos de RH',
      access: 'Gestão integral de colaboradores, departamentos, equipas, férias, ausências, avaliações e relatórios sem acesso às definições técnicas da plataforma.',
      permissions: ['Gestão de Colaboradores', 'Homologação Final de Férias', 'Mapa de Ausências', 'Avaliações de Desempenho', 'Departamentos & Equipas', 'Relatórios & Mapas'],
      badge: 'Especialista RH'
    },
    {
      role: 'Director Executivo / Geral',
      who: 'Direção Executiva / Gerência',
      access: 'Visão agregada e estratégica: headcount, taxas de absenteísmo, conformidade e necessidades de pessoal por obra, sem exposição desnecessária de dados privados.',
      permissions: ['Cockpit Executivo de RH', 'Visão por Departamentos', 'Indicadores Globais', 'Aprovação de Quadros'],
      badge: 'Visão Estratégica'
    },
    {
      role: 'Gestor / Chefe de Equipa',
      who: 'Gestor de Projeto / Encarregado',
      access: 'Consulta restrita aos colaboradores alocados às suas obras/equipas. Emissão de parecer prévio de férias e ausências para compatibilidade de escalas.',
      permissions: ['Acesso à Minha Equipa', 'Parecer de Férias da Equipa', 'Escala de Ausências', 'Avaliação de Membros Diretos'],
      badge: 'Gestão de Equipa'
    },
    {
      role: 'Colaborador (Geral)',
      who: 'Todos os Colaboradores da Organização',
      access: 'Espaço individual "Meu RH". Acesso exclusivo aos seus dados pessoais, saldo de férias, submissão de pedidos, documentos autorizados e avaliações homologadas.',
      permissions: ['Meu Perfil', 'Marcar Minhas Férias', 'Registar Minhas Ausências', 'Meus Documentos', 'Acompanhamento de Pedidos'],
      badge: 'Self-Service'
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. PRINCÍPIO FUNDAMENTAL DOS 4 PILARES */}
      <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Arquitetura de Controlo por Permissões & Responsabilidades
          </CardTitle>
          <CardDescription className="text-xs">
            O módulo de Recursos Humanos do Profundidade responde a quatro perguntas fundamentais:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <div className="p-3.5 rounded-xl border bg-card/80 space-y-1">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">1. Identidade</span>
              <p className="text-xs font-bold text-foreground">Quem é esta pessoa?</p>
              <p className="text-[11px] text-muted-foreground">Autenticação única vinculada ao colaborador.</p>
            </div>
            <div className="p-3.5 rounded-xl border bg-card/80 space-y-1">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">2. Função</span>
              <p className="text-xs font-bold text-foreground">Qual é a sua função?</p>
              <p className="text-[11px] text-muted-foreground">Cargo, departamento e equipa atribuída.</p>
            </div>
            <div className="p-3.5 rounded-xl border bg-card/80 space-y-1">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">3. Visibilidade</span>
              <p className="text-xs font-bold text-foreground">A que informação pode aceder?</p>
              <p className="text-[11px] text-muted-foreground">Próprio colaborador, membros da equipa ou organização.</p>
            </div>
            <div className="p-3.5 rounded-xl border bg-card/80 space-y-1">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">4. Autorização</span>
              <p className="text-xs font-bold text-foreground">O que pode fazer com ela?</p>
              <p className="text-[11px] text-muted-foreground">Consultar, solicitar, emitir parecer, aprovar ou gerir.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. MATRIZ DE PERFIS DE RH */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Matriz de Níveis de Acesso ao RH
            </CardTitle>
            <CardDescription className="text-xs">
              Configuração dos privilégios por perfil de utilizador na organização
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs h-8">
            <Link href="/team">
              Gerir Utilizadores & Perfis
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Destinatários Típicos</TableHead>
                  <TableHead>Escopo de Visibilidade</TableHead>
                  <TableHead>Competências Autorizadas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesSummary.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-semibold text-xs whitespace-nowrap">
                      <div className="space-y-1">
                        <p className="text-foreground">{r.role}</p>
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {r.badge}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.who}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">{r.access}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-wrap gap-1">
                        {r.permissions.map((p, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
