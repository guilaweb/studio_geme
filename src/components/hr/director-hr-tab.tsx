'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users,
  Building2,
  Calendar,
  AlertTriangle,
  TrendingUp,
  HardHat,
  FileCheck2,
  Download,
  Briefcase,
  PieChart as PieIcon,
  Clock
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { type WorkforceMember } from '@/types/workforce';
import { type HrRequest, type HrDepartment } from '@/types/hr';
import { differenceInDays } from 'date-fns';

interface DirectorHrTabProps {
  workforce: WorkforceMember[];
  requests: HrRequest[];
  departments: HrDepartment[];
}

const COLORS = ['#0f766e', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#059669', '#4b5563'];

export default function DirectorHrTab({ workforce, requests, departments }: DirectorHrTabProps) {
  // 1. Headcount & Métricas Executivas
  const totalEmployees = workforce.length;
  const activeEmployees = workforce.filter(m => m.status === 'Ativo').length;
  const onLeaveEmployees = workforce.filter(m => m.status === 'De Férias').length;

  // 2. Distribuição por Vínculo Contratual
  const employmentDistribution = useMemo(() => {
    const counts: Record<string, number> = { Efetivo: 0, Temporário: 0, Subcontratado: 0 };
    workforce.forEach(m => {
      const type = m.employmentType || 'Efetivo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [workforce]);

  // 3. Distribuição por Departamento
  const departmentDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    workforce.forEach(m => {
      const dept = (m as any).department || 'Engenharia & Obras';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [workforce]);

  // 4. Alocação em Obras vs. Estrutura Central
  const allocationDistribution = useMemo(() => {
    const onProject = workforce.filter(m => !!m.currentProjectId).length;
    const centralOffice = totalEmployees - onProject;
    return [
      { name: 'Em Obra / Produção', value: onProject },
      { name: 'Sede / Escritório Central', value: centralOffice },
    ];
  }, [workforce, totalEmployees]);

  // 5. Ausências no Mês e Taxa de Absenteísmo
  const monthlyLeaves = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return requests.filter(r => {
      if (r.status !== 'Aprovado') return false;
      const start = new Date(r.startDate);
      return start.getMonth() === currentMonth && start.getFullYear() === currentYear;
    });
  }, [requests]);

  const totalAbsenceDaysThisMonth = monthlyLeaves
    .filter(r => r.type !== 'Férias')
    .reduce((sum, r) => sum + (Number(r.daysCount) || 0), 0);

  const potentialWorkDaysInMonth = Math.max(1, totalEmployees * 22);
  const absenteeismRate = ((totalAbsenceDaysThisMonth / potentialWorkDaysInMonth) * 100).toFixed(1);

  // 6. Alertas de Documentação e Contratos a Expirar (Próximos 30 dias)
  const expiringDocuments = useMemo(() => {
    const list: Array<{ memberName: string; docName: string; daysLeft: number }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    workforce.forEach(m => {
      (m.documents || []).forEach(doc => {
        if (doc.expiryDate) {
          const exp = (doc.expiryDate as any).toDate ? (doc.expiryDate as any).toDate() : new Date(doc.expiryDate as any);
          const days = differenceInDays(exp, today);
          if (days >= 0 && days <= 45) {
            list.push({ memberName: m.name, docName: doc.name, daysLeft: days });
          }
        }
      });
    });
    return list.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
  }, [workforce]);

  return (
    <div className="space-y-6">
      {/* 1. CARDS DE KPIS EXECUTIVOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              <span>Efetivo Global (Headcount)</span>
              <Users className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{totalEmployees}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0">
            <span className="font-semibold text-emerald-600">{activeEmployees} ativos</span>
            <span>•</span>
            <span className="text-amber-600">{onLeaveEmployees} de férias</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              <span>Alocação Operacional</span>
              <HardHat className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {totalEmployees > 0 ? Math.round(((allocationDistribution[0].value) / totalEmployees) * 100) : 0}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            {allocationDistribution[0].value} em frentes de obra ativas
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              <span>Taxa de Absenteísmo</span>
              <Clock className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{absenteeismRate}%</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            {totalAbsenceDaysThisMonth} dias de baixa/falta este mês
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              <span>Alertas de Conformidade</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{expiringDocuments.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            Atestados/Certificados a expirar em &lt;45d
          </CardContent>
        </Card>
      </div>

      {/* 2. GRÁFICOS EXECUTIVOS DE DISTRIBUIÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Departamento */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Distribuição do Efetivo por Departamento
            </CardTitle>
            <CardDescription className="text-xs">
              Alocação dos colaboradores pela estrutura organizacional
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <XAxis type="number" allowDecimals={false} stroke="#888888" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#888888" fontSize={11} width={130} />
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Bar dataKey="value" fill="#0f766e" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tipo de Vínculo Contratual */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />
              Composição Contratual da Força de Trabalho
            </CardTitle>
            <CardDescription className="text-xs">
              Efetivos vs. Temporários e Prestadores Subcontratados
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={employmentDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {employmentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 3. QUADRO DE CONFORMIDADE E ALERTAS DOCUMENTAIS */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-primary" />
              Vigilância de Conformidade Técnica & Legal
            </CardTitle>
            <CardDescription className="text-xs">
              Fichas de aptidão médica, alvarás individuais e certificados técnicos em janela de renovação
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            Padrão OIT / LGT Angola
          </Badge>
        </CardHeader>
        <CardContent>
          {expiringDocuments.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-xs">
              Todos os documentos e certificações estão plenamente vigentes.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Documento / Certificação</TableHead>
                  <TableHead className="text-right">Prazo Restante</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringDocuments.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-semibold text-xs">{item.memberName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.docName}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{item.daysLeft} dia(s)</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px]">
                        Renovação Necessária
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
