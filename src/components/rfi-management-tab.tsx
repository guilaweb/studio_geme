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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  PlusCircle, MessageSquare, CheckCircle2, XCircle, Clock, AlertTriangle,
  Flame, TrendingUp, Calendar, ChevronDown, ChevronUp, Send, Search
} from 'lucide-react';
import type { Rfi, RfiStatus, RfiPriority, RfiImpact, RfiDiscipline } from '@/types/rfi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<RfiStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:            { label: 'Rascunho',         color: 'bg-gray-100 text-gray-700 border-gray-200',    icon: Clock },
  open:             { label: 'Aberto',           color: 'bg-blue-100 text-blue-800 border-blue-200',    icon: MessageSquare },
  pending_response: { label: 'Aguarda Resposta', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  answered:         { label: 'Respondido',       color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  closed:           { label: 'Encerrado',        color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  cancelled:        { label: 'Cancelado',        color: 'bg-gray-50 text-gray-400 border-gray-100',     icon: XCircle },
};

const priorityConfig: Record<RfiPriority, { label: string; color: string; icon: React.ElementType }> = {
  low:      { label: 'Baixa',    color: 'bg-gray-100 text-gray-700',   icon: Clock },
  medium:   { label: 'Média',    color: 'bg-blue-100 text-blue-800',   icon: Clock },
  high:     { label: 'Alta',     color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  critical: { label: 'Crítica',  color: 'bg-red-100 text-red-800',     icon: Flame },
};

const impactConfig: Record<RfiImpact, { label: string; color: string }> = {
  none:              { label: 'Sem Impacto',       color: 'bg-gray-100 text-gray-600' },
  cost:              { label: 'Custo',             color: 'bg-orange-100 text-orange-800' },
  schedule:          { label: 'Prazo',             color: 'bg-yellow-100 text-yellow-800' },
  cost_and_schedule: { label: 'Custo e Prazo',     color: 'bg-red-100 text-red-800' },
  technical:         { label: 'Técnico',           color: 'bg-blue-100 text-blue-800' },
};

const disciplineLabel: Record<RfiDiscipline, string> = {
  architecture: 'Arquitetura',
  structure:    'Estruturas',
  mep:          'Instalações Técnicas (MEP)',
  civil:        'Civil / Vias',
  geotechnics:  'Geotecnia',
  fire_safety:  'Segurança Incêndio',
  contract:     'Contratual',
  other:        'Outro',
};

const formatEUR = (v: number) =>
  new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(v);

// ─── Component ────────────────────────────────────────────────────────────────

interface RfiManagementTabProps {
  projectId: string;
}

export default function RfiManagementTab({ projectId }: RfiManagementTabProps) {
  const [rfis, setRfis] = useState<Rfi[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<RfiStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<RfiPriority | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [fSubject, setFSubject] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fDiscipline, setFDiscipline] = useState<RfiDiscipline>('structure');
  const [fPriority, setFPriority] = useState<RfiPriority>('medium');
  const [fSubmittedBy, setFSubmittedBy] = useState('');
  const [fSubmittedTo, setFSubmittedTo] = useState('');
  const [fDueDate, setFDueDate] = useState('');
  const [fImpact, setFImpact] = useState<RfiImpact>('none');
  const [fCostImpact, setFCostImpact] = useState('');
  const [fScheduleImpact, setFScheduleImpact] = useState('');
  const [fClause, setFClause] = useState('');
  const [fNotes, setFNotes] = useState('');

  // Response state
  const [respondingToId, setRespondingToId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseBy, setResponseBy] = useState('');

  // KPIs
  const open = rfis.filter(r => r.status === 'open' || r.status === 'pending_response').length;
  const overdue = rfis.filter(r => r.isOverdue).length;
  const totalCostImpact = rfis.reduce((s, r) => s + (r.costImpact || 0), 0);
  const totalScheduleImpact = rfis.reduce((s, r) => s + (r.scheduleImpact || 0), 0);
  const avgDaysOpen = rfis.length > 0 ? Math.round(rfis.reduce((s, r) => s + r.daysOpen, 0) / rfis.length) : 0;

  const filtered = useMemo(() => {
    return rfis.filter(r => {
      const matchSearch = searchTerm === '' ||
        r.rfiNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchPriority = filterPriority === 'all' || r.priority === filterPriority;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [rfis, searchTerm, filterStatus, filterPriority]);

  const handleCreate = () => {
    const newRfi: Rfi = {
      id: `rfi-${Date.now()}`, projectId,
      rfiNumber: `RFI-${new Date().getFullYear()}-${String(rfis.length + 1).padStart(3, '0')}`,
      subject: fSubject, description: fDesc, discipline: fDiscipline,
      priority: fPriority, status: 'open',
      submittedBy: fSubmittedBy, submittedTo: fSubmittedTo,
      submittedDate: new Date().toISOString().split('T')[0], dueDate: fDueDate,
      impact: fImpact,
      costImpact: fCostImpact ? parseFloat(fCostImpact) : undefined,
      scheduleImpact: fScheduleImpact ? parseInt(fScheduleImpact) : undefined,
      linkedDrawingIds: [], linkedClauseRef: fClause,
      daysOpen: 0, isOverdue: false, notes: fNotes,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setRfis(prev => [newRfi, ...prev]);
    setIsDialogOpen(false);
    setFSubject(''); setFDesc(''); setFDiscipline('structure'); setFPriority('medium');
    setFSubmittedBy(''); setFSubmittedTo(''); setFDueDate(''); setFImpact('none');
    setFCostImpact(''); setFScheduleImpact(''); setFClause(''); setFNotes('');
  };

  const handleRespond = (rfiId: string) => {
    if (!responseText || !responseBy) return;
    setRfis(prev => prev.map(r => {
      if (r.id !== rfiId) return r;
      return {
        ...r,
        status: 'answered' as RfiStatus,
        response: {
          id: `resp-${Date.now()}`,
          responseDate: new Date().toISOString().split('T')[0],
          respondedBy: responseBy, responseText, attachments: [], accepted: false,
        },
        updatedAt: new Date().toISOString(),
      };
    }));
    setRespondingToId(null);
    setResponseText(''); setResponseBy('');
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-indigo-600" />
            Gestão de RFIs
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Pedidos de Informação e Esclarecimento — rastreio de respostas, impacto e prazo
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <PlusCircle className="h-4 w-4 mr-2" />
          Novo RFI
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">Total RFIs</div>
            <div className="text-3xl font-bold text-indigo-700">{rfis.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">Em Aberto</div>
            <div className="text-3xl font-bold text-blue-700">{open}</div>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${overdue > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">Em Atraso</div>
            <div className={`text-3xl font-bold ${overdue > 0 ? 'text-red-700' : 'text-green-700'}`}>{overdue}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">Impacto Custo</div>
            <div className="text-lg font-bold text-orange-700">{formatEUR(totalCostImpact)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">Impacto Prazo</div>
            <div className="text-3xl font-bold text-yellow-700">{totalScheduleImpact}<span className="text-base ml-1">dias</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar RFI..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as RfiStatus | 'all')}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {(Object.keys(statusConfig) as RfiStatus[]).map(s => (
              <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={v => setFilterPriority(v as RfiPriority | 'all')}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Prioridade..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {(Object.keys(priorityConfig) as RfiPriority[]).map(p => (
              <SelectItem key={p} value={p}>{priorityConfig[p].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* RFI List */}
      <div className="space-y-3">
        {filtered.map(rfi => {
          const sCfg = statusConfig[rfi.status];
          const SIcon = sCfg.icon;
          const pCfg = priorityConfig[rfi.priority];
          const PIcon = pCfg.icon;
          const iCfg = impactConfig[rfi.impact];
          const isExpanded = expandedId === rfi.id;
          const isAnswered = rfi.status === 'answered' || rfi.status === 'closed';
          const canRespond = rfi.status === 'open' || rfi.status === 'pending_response';

          return (
            <Card key={rfi.id} className={`overflow-hidden ${rfi.isOverdue ? 'ring-2 ring-red-400' : ''}`}>
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : rfi.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-10 rounded-full shrink-0 ${rfi.priority === 'critical' ? 'bg-red-500' : rfi.priority === 'high' ? 'bg-orange-400' : rfi.priority === 'medium' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-indigo-700">{rfi.rfiNumber}</span>
                      {rfi.isOverdue && <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs">⚠️ Em atraso</Badge>}
                    </div>
                    <div className="font-medium text-sm truncate" title={rfi.subject}>{rfi.subject}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{disciplineLabel[rfi.discipline]}</span>
                      <span>·</span>
                      <span>Para: {rfi.submittedTo}</span>
                      <span>·</span>
                      <span>Prazo: {rfi.dueDate}</span>
                      <span>·</span>
                      <span>{rfi.daysOpen}d aberto</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Badge className={`${pCfg.color} border-0 text-xs flex items-center gap-1 hidden sm:flex`}>
                    <PIcon className="h-3 w-3" />
                    {pCfg.label}
                  </Badge>
                  <Badge className={`${iCfg.color} text-xs hidden md:flex`}>{iCfg.label}</Badge>
                  <Badge className={`${sCfg.color} border flex items-center gap-1`}>
                    <SIcon className="h-3 w-3" />
                    {sCfg.label}
                  </Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t bg-muted/10 p-4 space-y-4">
                  {/* Description */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Descrição / Questão</div>
                      <p className="text-sm">{rfi.description}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-xs text-muted-foreground">Submetido por</span><div className="font-medium">{rfi.submittedBy}</div></div>
                        <div><span className="text-xs text-muted-foreground">Data Subm.</span><div>{rfi.submittedDate}</div></div>
                        <div><span className="text-xs text-muted-foreground">Prazo</span><div className={rfi.isOverdue ? 'text-red-700 font-bold' : ''}>{rfi.dueDate}</div></div>
                        <div><span className="text-xs text-muted-foreground">Ref. Cláusula</span><div className="font-mono text-xs">{rfi.linkedClauseRef || '—'}</div></div>
                      </div>
                      {(rfi.costImpact || rfi.scheduleImpact) && (
                        <div className="flex gap-3 pt-1">
                          {rfi.costImpact && <div className="text-xs bg-orange-50 border border-orange-200 rounded px-2 py-1">💰 {formatEUR(rfi.costImpact)}</div>}
                          {rfi.scheduleImpact && <div className="text-xs bg-yellow-50 border border-yellow-200 rounded px-2 py-1">📅 +{rfi.scheduleImpact} dias</div>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Response */}
                  {rfi.response && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-800">Resposta — {rfi.response.respondedBy} · {rfi.response.responseDate}</span>
                      </div>
                      <p className="text-sm text-emerald-900 mt-1">{rfi.response.responseText}</p>
                      {rfi.response.accepted && (
                        <div className="text-xs text-emerald-700 mt-1">✅ Resposta aceite por {rfi.response.acceptedBy} em {rfi.response.acceptedDate}</div>
                      )}
                    </div>
                  )}

                  {/* Respond form */}
                  {canRespond && respondingToId === rfi.id && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                      <div className="text-sm font-semibold text-blue-800">Registar Resposta</div>
                      <div className="space-y-2">
                        <Textarea
                          rows={3}
                          placeholder="Texto da resposta..."
                          value={responseText}
                          onChange={e => setResponseText(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Input placeholder="Respondido por" value={responseBy} onChange={e => setResponseBy(e.target.value)} />
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0" onClick={() => handleRespond(rfi.id)}>
                            <Send className="h-3 w-3 mr-1" /> Submeter
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRespondingToId(null)}>Cancelar</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {canRespond && respondingToId !== rfi.id && (
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={e => { e.stopPropagation(); setRespondingToId(rfi.id); }}>
                        <Send className="h-3 w-3 mr-1.5" />
                        Responder
                      </Button>
                    )}
                    {rfi.status === 'answered' && (
                      <Button size="sm" variant="outline" onClick={e => {
                        e.stopPropagation();
                        setRfis(prev => prev.map(r => r.id === rfi.id ? { ...r, status: 'closed' as RfiStatus } : r));
                      }}>
                        <CheckCircle2 className="h-3 w-3 mr-1.5" />
                        Fechar RFI
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum RFI encontrado.</p>
          </div>
        )}
      </div>

      {/* New RFI Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              Submeter Novo RFI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Assunto *</Label>
              <Input placeholder="Descrição curta do pedido" value={fSubject} onChange={e => setFSubject(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Descrição / Questão *</Label>
              <Textarea rows={4} placeholder="Descreva detalhadamente o pedido de informação ou esclarecimento..." value={fDesc} onChange={e => setFDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Disciplina</Label>
                <Select value={fDiscipline} onValueChange={v => setFDiscipline(v as RfiDiscipline)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(disciplineLabel) as RfiDiscipline[]).map(d => (
                      <SelectItem key={d} value={d}>{disciplineLabel[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Prioridade</Label>
                <Select value={fPriority} onValueChange={v => setFPriority(v as RfiPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(priorityConfig) as RfiPriority[]).map(p => (
                      <SelectItem key={p} value={p}>{priorityConfig[p].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Impacto</Label>
                <Select value={fImpact} onValueChange={v => setFImpact(v as RfiImpact)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(impactConfig) as RfiImpact[]).map(i => (
                      <SelectItem key={i} value={i}>{impactConfig[i].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Submetido por *</Label>
                <Input placeholder="Eng. Nome" value={fSubmittedBy} onChange={e => setFSubmittedBy(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Destinatário *</Label>
                <Input placeholder="Arq./Eng. Nome / Empresa" value={fSubmittedTo} onChange={e => setFSubmittedTo(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Prazo de Resposta</Label>
                <Input type="date" value={fDueDate} onChange={e => setFDueDate(e.target.value)} />
              </div>
              {(fImpact === 'cost' || fImpact === 'cost_and_schedule') && (
                <div className="space-y-1">
                  <Label>Impacto Custo (€)</Label>
                  <Input type="number" placeholder="ex.: 5000" value={fCostImpact} onChange={e => setFCostImpact(e.target.value)} />
                </div>
              )}
              {(fImpact === 'schedule' || fImpact === 'cost_and_schedule') && (
                <div className="space-y-1">
                  <Label>Impacto Prazo (dias)</Label>
                  <Input type="number" placeholder="ex.: 5" value={fScheduleImpact} onChange={e => setFScheduleImpact(e.target.value)} />
                </div>
              )}
              <div className="space-y-1">
                <Label>Ref. Cláusula / Norma</Label>
                <Input placeholder="ex.: CE §18.3" value={fClause} onChange={e => setFClause(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea rows={2} value={fNotes} onChange={e => setFNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleCreate}
              disabled={!fSubject || !fDesc || !fSubmittedBy || !fSubmittedTo}
            >
              <Send className="h-4 w-4 mr-2" />
              Submeter RFI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
