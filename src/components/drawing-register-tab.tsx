'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  PlusCircle, FileText, CheckCircle2, XCircle, Clock, AlertTriangle,
  History, GitBranch, Filter, BarChart3, Search, ChevronDown, ChevronUp,
  RefreshCw, Upload, Eye
} from 'lucide-react';
import type {
  Drawing, DrawingRevision, DrawingDiscipline, DrawingStatus,
  DrawingFormat, DrawingScale
} from '@/types/drawing-register';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const disciplineConfig: Record<DrawingDiscipline, { label: string; color: string }> = {
  architecture:    { label: 'Arquitectura',   color: 'bg-blue-100 text-blue-800' },
  structure:       { label: 'Estrutura',      color: 'bg-orange-100 text-orange-800' },
  mep_hvac:        { label: 'AVAC',           color: 'bg-cyan-100 text-cyan-800' },
  mep_electrical:  { label: 'Elétrica',       color: 'bg-yellow-100 text-yellow-800' },
  mep_plumbing:    { label: 'Hidráulica',     color: 'bg-teal-100 text-teal-800' },
  civil:           { label: 'Civil',          color: 'bg-stone-100 text-stone-800' },
  landscaping:     { label: 'Paisagismo',     color: 'bg-green-100 text-green-800' },
  geotechnics:     { label: 'Geotecnia',      color: 'bg-amber-100 text-amber-800' },
  fire_safety:     { label: 'Segurança Incêndio', color: 'bg-red-100 text-red-800' },
  other:           { label: 'Outro',          color: 'bg-gray-100 text-gray-700' },
};

const statusConfig: Record<DrawingStatus, { label: string; color: string; icon: React.ElementType }> = {
  for_review:        { label: 'Para Revisão',       color: 'bg-gray-100 text-gray-700 border-gray-200',    icon: Eye },
  for_approval:      { label: 'Para Aprovação',     color: 'bg-blue-100 text-blue-800 border-blue-200',    icon: Clock },
  approved:          { label: 'Aprovado',           color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  approved_as_noted: { label: 'Aprovado c/ Notas',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  revise_resubmit:   { label: 'Rever e Resubmeter', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: RefreshCw },
  rejected:          { label: 'Reprovado',          color: 'bg-red-100 text-red-800 border-red-200',       icon: XCircle },
  superseded:        { label: 'Substituído',        color: 'bg-gray-100 text-gray-500 border-gray-200',    icon: History },
  as_built:          { label: 'Telas Finais',       color: 'bg-purple-100 text-purple-800 border-purple-200', icon: GitBranch },
  cancelled:         { label: 'Cancelado',          color: 'bg-gray-50 text-gray-400 border-gray-100',     icon: XCircle },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface DrawingRegisterTabProps {
  projectId: string;
}

export default function DrawingRegisterTab({ projectId }: DrawingRegisterTabProps) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState<DrawingDiscipline | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<DrawingStatus | 'all'>('all');

  // New drawing form
  const [fNumber, setFNumber] = useState('');
  const [fTitle, setFTitle] = useState('');
  const [fDiscipline, setFDiscipline] = useState<DrawingDiscipline>('structure');
  const [fPhase, setFPhase] = useState('Projeto de Execução');
  const [fFormat, setFFormat] = useState<DrawingFormat>('A1');
  const [fScale, setFScale] = useState<DrawingScale>('1:50');
  const [fRevDesc, setFRevDesc] = useState('Emissão inicial');
  const [fIssuedBy, setFIssuedBy] = useState('');
  const [fStatus, setFStatus] = useState<DrawingStatus>('for_review');
  const [fNotes, setFNotes] = useState('');

  // KPIs
  const total = drawings.length;
  const approved = drawings.filter(d => d.currentStatus === 'approved' || d.currentStatus === 'approved_as_noted').length;
  const pendingApproval = drawings.filter(d => d.currentStatus === 'for_approval' || d.currentStatus === 'for_review').length;
  const needsRevision = drawings.filter(d => d.currentStatus === 'revise_resubmit' || d.currentStatus === 'rejected').length;
  const totalRevisions = drawings.reduce((s, d) => s + d.revisions.length, 0);

  // Discipline breakdown
  const byDiscipline = useMemo(() => {
    const map: Record<string, number> = {};
    drawings.forEach(d => {
      map[d.discipline] = (map[d.discipline] || 0) + 1;
    });
    return map;
  }, [drawings]);

  // Filtered drawings
  const filtered = useMemo(() => {
    return drawings.filter(d => {
      const matchSearch = searchTerm === '' ||
        d.drawingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDiscipline = filterDiscipline === 'all' || d.discipline === filterDiscipline;
      const matchStatus = filterStatus === 'all' || d.currentStatus === filterStatus;
      return matchSearch && matchDiscipline && matchStatus;
    });
  }, [drawings, searchTerm, filterDiscipline, filterStatus]);

  const handleSave = () => {
    const newDrawing: Drawing = {
      id: `drw-${Date.now()}`, projectId,
      drawingNumber: fNumber, title: fTitle, discipline: fDiscipline,
      phase: fPhase, format: fFormat, scale: fScale,
      currentRevision: 'A', currentStatus: fStatus,
      revisions: [{
        revision: 'A', date: new Date().toISOString().split('T')[0],
        description: fRevDesc, issuedBy: fIssuedBy, status: fStatus,
      }],
      linkedRfiIds: [], linkedBimElementIds: [],
      tags: [], notes: fNotes,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setDrawings(prev => [newDrawing, ...prev]);
    setIsDialogOpen(false);
    setFNumber(''); setFTitle(''); setFDiscipline('structure'); setFPhase('Projeto de Execução');
    setFFormat('A1'); setFScale('1:50'); setFRevDesc('Emissão inicial'); setFIssuedBy('');
    setFStatus('for_review'); setFNotes('');
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Registo de Peças Desenhadas
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Controlo de revisões de projecto, emissões por disciplina e estado de aprovação
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Peça
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">Total Peças</div>
            <div className="text-3xl font-bold text-blue-700">{total}</div>
            <div className="text-xs text-muted-foreground">{totalRevisions} revisões</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">Aprovadas</div>
            <div className="text-3xl font-bold text-green-700">{approved}</div>
            <div className="text-xs text-muted-foreground">Para construção</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">Em Aprovação</div>
            <div className="text-3xl font-bold text-blue-600">{pendingApproval}</div>
            <div className="text-xs text-muted-foreground">Rev/Aprov. pendente</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">Requer Revisão</div>
            <div className="text-3xl font-bold text-orange-700">{needsRevision}</div>
            <div className="text-xs text-muted-foreground">Rever/Reprovar</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">Disciplinas</div>
            <div className="text-3xl font-bold text-slate-700">{Object.keys(byDiscipline).length}</div>
            <div className="text-xs text-muted-foreground">Especialidades</div>
          </CardContent>
        </Card>
      </div>

      {/* Discipline breakdown pills */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(byDiscipline).map(([disc, count]) => {
          const cfg = disciplineConfig[disc as DrawingDiscipline];
          return (
            <button
              key={disc}
              onClick={() => setFilterDiscipline(filterDiscipline === disc as DrawingDiscipline ? 'all' : disc as DrawingDiscipline)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${cfg.color} ${filterDiscipline === disc ? 'ring-2 ring-offset-1 ring-blue-500' : 'opacity-80 hover:opacity-100'}`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pesquisar por número ou título..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as DrawingStatus | 'all')}>
          <SelectTrigger className="w-[190px]">
            <Filter className="h-3 w-3 mr-2" />
            <SelectValue placeholder="Estado..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {(Object.keys(statusConfig) as DrawingStatus[]).map(s => (
              <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Drawings Table / List */}
      <div className="space-y-2">
        {filtered.map(drawing => {
          const sCfg = statusConfig[drawing.currentStatus];
          const SIcon = sCfg.icon;
          const dCfg = disciplineConfig[drawing.discipline];
          const isExpanded = expandedId === drawing.id;

          return (
            <Card key={drawing.id} className="overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : drawing.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="font-mono text-sm font-bold text-blue-700 shrink-0 w-28">{drawing.drawingNumber}</div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate" title={drawing.title}>{drawing.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${dCfg.color}`}>{dCfg.label}</span>
                      <span className="text-xs text-muted-foreground">{drawing.phase}</span>
                      <span className="text-xs text-muted-foreground">{drawing.format} · {drawing.scale}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <div className="text-center hidden sm:block">
                    <div className="text-lg font-bold text-slate-700">Rev.{drawing.currentRevision}</div>
                    <div className="text-xs text-muted-foreground">{drawing.revisions.length} rev.</div>
                  </div>
                  <Badge className={`${sCfg.color} border flex items-center gap-1 whitespace-nowrap`}>
                    <SIcon className="h-3 w-3" />
                    {sCfg.label}
                  </Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t bg-muted/10 p-4 space-y-4">
                  {drawing.notes && (
                    <p className="text-sm text-muted-foreground italic">{drawing.notes}</p>
                  )}

                  {/* Revision history timeline */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                      <History className="h-3 w-3" />
                      Histórico de Revisões
                    </div>
                    <div className="overflow-x-auto rounded border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-16">Rev.</TableHead>
                            <TableHead className="w-28">Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Emitido por</TableHead>
                            <TableHead>Recebido por</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...drawing.revisions].reverse().map((rev, i) => {
                            const rCfg = statusConfig[rev.status];
                            const RIcon = rCfg.icon;
                            const isCurrent = rev.revision === drawing.currentRevision;
                            return (
                              <TableRow key={i} className={isCurrent ? 'bg-blue-50/50' : ''}>
                                <TableCell>
                                  <span className={`font-bold font-mono ${isCurrent ? 'text-blue-700' : 'text-muted-foreground'}`}>
                                    Rev.{rev.revision} {isCurrent && '★'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm">{rev.date}</TableCell>
                                <TableCell className="text-sm">{rev.description}</TableCell>
                                <TableCell className="text-sm">{rev.issuedBy}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{rev.receivedBy || '—'}</TableCell>
                                <TableCell>
                                  <Badge className={`${rCfg.color} border text-xs flex items-center gap-1 w-fit`}>
                                    <RIcon className="h-3 w-3" />
                                    {rCfg.label}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Linked RFIs */}
                  {drawing.linkedRfiIds.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">RFIs ligados:</span>
                      {drawing.linkedRfiIds.map(id => (
                        <Badge key={id} variant="outline" className="text-xs">{id}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Upload className="h-3 w-3 mr-1.5" />
                      Nova Revisão
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3 mr-1.5" />
                      Ver PDF
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma peça desenhada encontrada com os filtros actuais.</p>
          </div>
        )}
      </div>

      {/* New Drawing Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Registar Nova Peça Desenhada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nº da Peça *</Label>
                <Input placeholder="ex.: EST-105, ARQ-A01-002" value={fNumber} onChange={e => setFNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Disciplina *</Label>
                <Select value={fDiscipline} onValueChange={v => setFDiscipline(v as DrawingDiscipline)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(disciplineConfig) as DrawingDiscipline[]).map(d => (
                      <SelectItem key={d} value={d}>{disciplineConfig[d].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input placeholder="ex.: Planta de Estrutura – Piso 2" value={fTitle} onChange={e => setFTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Fase</Label>
                <Select value={fPhase} onValueChange={setFPhase}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Estudo Prévio">Estudo Prévio</SelectItem>
                    <SelectItem value="Anteprojeto">Anteprojeto</SelectItem>
                    <SelectItem value="Projeto de Execução">Proj. Execução</SelectItem>
                    <SelectItem value="Telas Finais">Telas Finais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Formato</Label>
                <Select value={fFormat} onValueChange={v => setFFormat(v as DrawingFormat)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['A0','A1','A2','A3','A4','custom'] as DrawingFormat[]).map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Escala</Label>
                <Select value={fScale} onValueChange={v => setFScale(v as DrawingScale)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['1:1','1:2','1:5','1:10','1:20','1:25','1:50','1:100','1:200','1:500','1:1000','NTS'] as DrawingScale[]).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Estado de emissão</Label>
                <Select value={fStatus} onValueChange={v => setFStatus(v as DrawingStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(statusConfig) as DrawingStatus[]).slice(0, 6).map(s => (
                      <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Emitido por *</Label>
                <Input placeholder="Arq. / Eng. Nome" value={fIssuedBy} onChange={e => setFIssuedBy(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descrição da Rev. A</Label>
              <Input value={fRevDesc} onChange={e => setFRevDesc(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea rows={2} value={fNotes} onChange={e => setFNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSave}
              disabled={!fNumber || !fTitle || !fIssuedBy}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Registar Peça
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
