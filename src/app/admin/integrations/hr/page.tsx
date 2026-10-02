'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Download, FileSpreadsheet, Loader2, CheckCircle2, Building, DollarSign, Clock } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { collection, collectionGroup, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Papa from 'papaparse';
import type { Project } from '@/types/project';

interface HRWorkerExport {
  id: string;
  name: string;
  role: string;
  employmentType: string;
  totalHours: number;
  costPerHour: number;
  totalPay: number;
  project: string;
}

export default function HrIntegrationPage() {
  const { user: adminUser, loading: authLoading } = useRequireAuth(['super-admin', 'Gestor de RH', 'Gestor Financeiro', 'Gestor de Financeiro']);
  const router = useRouter();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [selectedFormat, setSelectedFormat] = useState<'primavera' | 'sap' | 'sage' | 'csv'>('primavera');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [workersData, setWorkersData] = useState<HRWorkerExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    }, (err) => {
      console.error("Could not load projects for HR export:", err);
      setProjects([]);
    });

    return () => unsubProjects();
  }, []);

  useEffect(() => {
    const loadHRData = async () => {
      setLoading(true);
      try {
        const wfSnap = await getDocs(collection(db, 'workforce'));
        const list: HRWorkerExport[] = wfSnap.docs.map(d => {
          const data = d.data();
          const costH = data.costPerHour || 4500;
          const hours = 176;
          return {
            id: d.id,
            name: data.name || 'Colaborador',
            role: data.role || 'Operário',
            employmentType: data.employmentType || 'Efetivo',
            totalHours: hours,
            costPerHour: costH,
            totalPay: hours * costH,
            project: data.currentProjectName || 'Projetos Globais',
          };
        });
        setWorkersData(list);
      } catch (err) {
        console.error("Error loading HR workforce dataset:", err);
        setWorkersData([]);
      } finally {
        setLoading(false);
      }
    };

    loadHRData();
  }, []);

  const filteredWorkers = useMemo(() => {
    if (selectedProjectId === 'all') return workersData;
    const proj = projects.find(p => p.id === selectedProjectId);
    if (!proj) return workersData;
    return workersData.filter(w => w.project.toLowerCase().includes(proj.name.toLowerCase()));
  }, [workersData, selectedProjectId, projects]);

  const totals = useMemo(() => {
    const count = filteredWorkers.length;
    const hours = filteredWorkers.reduce((acc, w) => acc + w.totalHours, 0);
    const pay = filteredWorkers.reduce((acc, w) => acc + w.totalPay, 0);
    return { count, hours, pay };
  }, [filteredWorkers]);

  const handleExportFile = () => {
    if (filteredWorkers.length === 0) {
      toast({ title: 'Sem dados para exportação', variant: 'destructive' });
      return;
    }

    setIsExporting(true);
    try {
      let exportRows: any[] = [];
      let filenamePrefix = 'export_rh';

      if (selectedFormat === 'primavera') {
        filenamePrefix = 'primavera_rh';
        exportRows = filteredWorkers.map(w => ({
          'CodFuncionario': w.id,
          'Nome': w.name,
          'Categoria': w.role,
          'TipoContrato': w.employmentType,
          'HorasNormais': w.totalHours,
          'HorasExtra': 0,
          'ValorHora': w.costPerHour.toFixed(2),
          'RemuneracaoBase': w.totalPay.toFixed(2),
          'CentroCusto': w.project,
          'Periodo': format(dateRange.from, 'yyyyMM'),
        }));
      } else if (selectedFormat === 'sap') {
        filenamePrefix = 'sap_hcm';
        exportRows = filteredWorkers.map(w => ({
          'PERNR': w.id,
          'ENAME': w.name,
          'PLANS_TXT': w.role,
          'STDAZ': w.totalHours,
          'BETRG': w.totalPay.toFixed(2),
          'WAERS': 'AOA',
          'KOSTL': w.project,
          'BEGDA': format(dateRange.from, 'yyyyMMdd'),
          'ENDDA': format(dateRange.to, 'yyyyMMdd'),
        }));
      } else if (selectedFormat === 'sage') {
        filenamePrefix = 'sage_rh';
        exportRows = filteredWorkers.map(w => ({
          'NumeroEmpregado': w.id,
          'NomeEmpregado': w.name,
          'Funcao': w.role,
          'HorasTrabalho': w.totalHours,
          'VencimentoBruto': w.totalPay.toFixed(2),
          'Moeda': 'Kz',
          'Obra': w.project,
        }));
      } else {
        filenamePrefix = 'folha_ponto_consolidada';
        exportRows = filteredWorkers.map(w => ({
          'ID': w.id,
          'Colaborador': w.name,
          'Função': w.role,
          'Tipo': w.employmentType,
          'Total Horas': w.totalHours,
          'Custo Horário (Kz)': w.costPerHour,
          'Valor Total (Kz)': w.totalPay,
          'Obra / Projeto': w.project,
        }));
      }

      const csv = Papa.unparse(exportRows);
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filenamePrefix}_${format(dateRange.from, 'yyyyMMdd')}_a_${format(dateRange.to, 'yyyyMMdd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Exportação Concluída ✅',
        description: `Ficheiro gerado no formato ${selectedFormat.toUpperCase()} com ${filteredWorkers.length} registos.`,
      });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar ficheiro', description: err.message, variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(val);
  };

  if (authLoading || !adminUser) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>A carregar módulo de integração RH...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Top Bar */}
          <div>
            <Button variant="outline" asChild className="mb-4">
              <Link href="/admin/integrations">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar às Integrações
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold font-headline">Conector de Recursos Humanos & Folha Salarial</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Gere ficheiros de exportação direta de horas, presenças e encargos para os principais ERPs de RH (Primavera, SAP, Sage).
            </p>
          </div>

          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" /> Parâmetros de Exportação
              </CardTitle>
              <CardDescription>
                Selecione o formato de ficheiro do seu ERP, período de referência e projeto pretendido.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Sistema de Destino</Label>
                  <Select value={selectedFormat} onValueChange={(v: any) => setSelectedFormat(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primavera">Primavera BSS (RH / Payroll)</SelectItem>
                      <SelectItem value="sap">SAP HCM / SuccessFactors</SelectItem>
                      <SelectItem value="sage">SAGE X3 / SAGE RH</SelectItem>
                      <SelectItem value="csv">Excel / CSV Estruturado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Filtrar por Projeto</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os Projetos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Projetos</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Data de Início</Label>
                  <DatePicker date={dateRange.from} setDate={(d) => setDateRange(p => ({ ...p, from: d || p.from }))} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Data de Fim</Label>
                  <DatePicker date={dateRange.to} setDate={(d) => setDateRange(p => ({ ...p, to: d || p.to }))} />
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="p-3 rounded-lg border bg-muted/30 text-center">
                  <Users className="h-4 w-4 mx-auto text-primary mb-1" />
                  <div className="text-xl font-bold">{totals.count}</div>
                  <div className="text-[10px] text-muted-foreground">Colaboradores</div>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30 text-center">
                  <Clock className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                  <div className="text-xl font-bold">{totals.hours.toLocaleString()} h</div>
                  <div className="text-[10px] text-muted-foreground">Horas Totais</div>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30 text-center">
                  <DollarSign className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
                  <div className="text-xl font-bold text-emerald-700">{formatCurrency(totals.pay)}</div>
                  <div className="text-[10px] text-muted-foreground">Massa Salarial Estimada</div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button onClick={handleExportFile} disabled={isExporting || filteredWorkers.length === 0} className="w-full sm:w-auto">
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Exportar Ficheiro {selectedFormat.toUpperCase()}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pré-visualização dos Dados ({filteredWorkers.length} colaboradores)</CardTitle>
              <CardDescription>
                Verifique as horas consolidadas antes de gerar o ficheiro para o processamento de vencimentos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Regime</TableHead>
                        <TableHead className="text-right">Horas</TableHead>
                        <TableHead className="text-right">Custo/h</TableHead>
                        <TableHead className="text-right">Total a Pagar</TableHead>
                        <TableHead>Alocação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWorkers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Nenhum registo de mão-de-obra disponível para o filtro selecionado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredWorkers.map(w => (
                          <TableRow key={w.id}>
                            <TableCell className="font-medium text-xs">{w.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{w.role}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{w.employmentType}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono font-semibold">{w.totalHours}h</TableCell>
                            <TableCell className="text-xs text-right font-mono">{formatCurrency(w.costPerHour)}</TableCell>
                            <TableCell className="text-xs text-right font-mono font-bold text-emerald-700">{formatCurrency(w.totalPay)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{w.project}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
