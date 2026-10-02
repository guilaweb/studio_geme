'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  PlusCircle, CheckCircle2, XCircle, AlertTriangle, Clock, ClipboardCheck,
  Ruler, Shield, FileText, Camera, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import type { InspectionResult, RebarDiameter, SteelGrade, RebarCheck, ReinforcementInspection } from '@/types/reinforcement';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const resultConfig: Record<InspectionResult, { label: string; color: string; icon: React.ElementType }> = {
  approved:    { label: 'Aprovado',     color: 'bg-green-100 text-green-800 border-green-200',   icon: CheckCircle2 },
  conditional: { label: 'Condicional',  color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
  rejected:    { label: 'Reprovado',    color: 'bg-red-100 text-red-800 border-red-200',         icon: XCircle },
  pending:     { label: 'Pendente',     color: 'bg-gray-100 text-gray-700 border-gray-200',      icon: Clock },
};

const shiftLabel: Record<string, string> = {
  morning: 'Manhã', afternoon: 'Tarde', night: 'Noite',
};

const cleanlinessLabel: Record<string, string> = {
  clean: 'Limpa', minor_rust: 'Oxidação leve', major_rust: 'Oxidação grave', contaminated: 'Contaminada',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ReinforcementInspectionTabProps {
  projectId: string;
}

export default function ReinforcementInspectionTab({ projectId }: ReinforcementInspectionTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inspections, setInspections] = useState<ReinforcementInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    const q = query(
      collection(db, 'projects', projectId, 'reinforcementInspections'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as ReinforcementInspection));
      setInspections(items);
      setLoading(false);
    }, (error) => {
      console.error("Error loading reinforcement inspections:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  // Form state
  const [formElement, setFormElement] = useState('');
  const [formFloor, setFormFloor] = useState('');
  const [formDiameter, setFormDiameter] = useState<RebarDiameter>('12');
  const [formGrade, setFormGrade] = useState<SteelGrade>('A500NR');
  const [formCover, setFormCover] = useState('');
  const [formOverlap, setFormOverlap] = useState('');
  const [formSpacingOk, setFormSpacingOk] = useState(true);
  const [formTieWireOk, setFormTieWireOk] = useState(true);
  const [formStraightnessOk, setFormStraightnessOk] = useState(true);
  const [formCleanliness, setFormCleanliness] = useState<'clean' | 'minor_rust' | 'major_rust' | 'contaminated'>('clean');
  const [formDeficiencies, setFormDeficiencies] = useState('');
  const [formCorrectiveActions, setFormCorrectiveActions] = useState('');
  const [formResult, setFormResult] = useState<InspectionResult>('approved');
  const [formInspectedBy, setFormInspectedBy] = useState('');
  const [formReviewedBy, setFormReviewedBy] = useState('');
  const [formObservations, setFormObservations] = useState('');
  const [formShift, setFormShift] = useState<'morning' | 'afternoon' | 'night'>('morning');

  // KPI calculations
  const total = inspections.length;
  const approved = inspections.filter(i => i.status === 'approved').length;
  const conditional = inspections.filter(i => i.status === 'conditional').length;
  const rejected = inspections.filter(i => i.status === 'rejected').length;
  const conformityRate = total > 0 ? Math.round(((approved + conditional) / total) * 100) : 0;
  const totalChecks = inspections.reduce((sum, ins) => sum + ins.checks.length, 0);
  const openNcrs = inspections.flatMap(i => i.checks).filter(c => c.ncrNumber).length;

  const handleSave = async () => {
    if (!formElement.trim()) {
      toast({ title: 'Campo Obrigatório', description: 'Indique o elemento estrutural inspecionado.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newCheck: RebarCheck = {
        element: formElement,
        floor: formFloor || 'Piso Térreo',
        rebarDiameter: formDiameter,
        steelGrade: formGrade,
        coverThickness: parseFloat(formCover) || 0,
        overlapLength: parseFloat(formOverlap) || 0,
        spacingOk: formSpacingOk,
        tieWireOk: formTieWireOk,
        straightnessOk: formStraightnessOk,
        cleanliness: formCleanliness,
        deficiencies: formDeficiencies || 'Nenhuma',
        correctiveActions: formCorrectiveActions,
        result: formResult,
        inspectedBy: formInspectedBy || user?.displayName || 'Inspetor de Qualidade',
        reviewedBy: formReviewedBy || 'Direção de Obra',
        inspectionDate: new Date().toISOString().split('T')[0],
        photoCount: 0,
        ncrNumber: formResult === 'rejected' ? `NCR-${Date.now()}` : undefined,
      };

      const newInspectionData = {
        projectId,
        inspectionNumber: `INS-ARM-${String(inspections.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        shift: formShift,
        status: formResult,
        generalObservations: formObservations,
        checks: [newCheck],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'projects', projectId, 'reinforcementInspections'), newInspectionData);

      setIsDialogOpen(false);
      resetForm();
      toast({
        title: 'Inspeção Registada!',
        description: `Inspeção de armadura do elemento ${formElement} gravada com sucesso.`,
      });
    } catch (error) {
      console.error("Error saving reinforcement inspection:", error);
      toast({ title: 'Erro ao guardar inspeção', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormElement(''); setFormFloor(''); setFormDiameter('12'); setFormGrade('A500NR');
    setFormCover(''); setFormOverlap(''); setFormSpacingOk(true); setFormTieWireOk(true);
    setFormStraightnessOk(true); setFormCleanliness('clean'); setFormDeficiencies('');
    setFormCorrectiveActions(''); setFormResult('approved'); setFormInspectedBy('');
    setFormReviewedBy(''); setFormObservations(''); setFormShift('morning');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Ruler className="h-6 w-6 text-cyan-600" />
            Inspeção de Armaduras
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Controlo de qualidade antes da betonagem — verificação de armaduras, recobrimentos e conformidade
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white">
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Inspeção
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total de Inspeções</div>
            <div className="text-3xl font-bold text-blue-700">{total}</div>
            <div className="text-xs text-muted-foreground mt-1">{totalChecks} elementos verificados</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Taxa de Conformidade</div>
            <div className="text-3xl font-bold text-green-700">{conformityRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">{approved} aprovadas · {conditional} condicionais</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Reprovadas</div>
            <div className="text-3xl font-bold text-red-700">{rejected}</div>
            <div className="text-xs text-muted-foreground mt-1">Requerem retrabalho</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">NCRs Emitidos</div>
            <div className="text-3xl font-bold text-orange-700">{openNcrs}</div>
            <div className="text-xs text-muted-foreground mt-1">Não conformidades abertas</div>
          </CardContent>
        </Card>
      </div>

      {/* Inspections List */}
      <div className="space-y-3">
        {inspections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-foreground">Nenhuma inspeção de armadura registada</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Registe verificações de armaduras, diâmetros, espaçamentos e recobrimentos antes da betonagem.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="mt-4 border-cyan-600 text-cyan-700 hover:bg-cyan-50">
                <PlusCircle className="h-4 w-4 mr-2" />
                Criar Primeira Inspeção
              </Button>
            </CardContent>
          </Card>
        ) : (
          inspections.map((inspection) => {
          const cfg = resultConfig[inspection.status];
          const Icon = cfg.icon;
          const isExpanded = expandedId === inspection.id;

          return (
            <Card key={inspection.id} className="overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : inspection.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-cyan-50 border border-cyan-200">
                    <ClipboardCheck className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <div className="font-semibold">{inspection.inspectionNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {inspection.date} · Turno: {shiftLabel[inspection.shift]} · {inspection.checks.length} elemento(s)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`${cfg.color} border font-medium flex items-center gap-1`}>
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t bg-muted/20 p-4 space-y-4">
                  {inspection.generalObservations && (
                    <div className="flex gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-muted-foreground italic">{inspection.generalObservations}</p>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Elemento</TableHead>
                          <TableHead>Piso</TableHead>
                          <TableHead>Ø (mm)</TableHead>
                          <TableHead>Aço</TableHead>
                          <TableHead>Recobr. (mm)</TableHead>
                          <TableHead>Limpeza</TableHead>
                          <TableHead>Afastamento</TableHead>
                          <TableHead>Arame</TableHead>
                          <TableHead>Resultado</TableHead>
                          <TableHead>NCR</TableHead>
                          <TableHead>Fotos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inspection.checks.map((check, idx) => {
                          const checkCfg = resultConfig[check.result];
                          const CheckIcon = checkCfg.icon;
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{check.element}</TableCell>
                              <TableCell>{check.floor}</TableCell>
                              <TableCell>Ø{check.rebarDiameter}</TableCell>
                              <TableCell>{check.steelGrade}</TableCell>
                              <TableCell>{check.coverThickness} mm</TableCell>
                              <TableCell>{cleanlinessLabel[check.cleanliness]}</TableCell>
                              <TableCell>
                                {check.spacingOk
                                  ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  : <XCircle className="h-4 w-4 text-red-600" />}
                              </TableCell>
                              <TableCell>
                                {check.tieWireOk
                                  ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  : <XCircle className="h-4 w-4 text-red-600" />}
                              </TableCell>
                              <TableCell>
                                <Badge className={`${checkCfg.color} border text-xs flex items-center gap-1 w-fit`}>
                                  <CheckIcon className="h-3 w-3" />
                                  {checkCfg.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {check.ncrNumber
                                  ? <Badge variant="destructive" className="text-xs">{check.ncrNumber}</Badge>
                                  : <span className="text-muted-foreground text-xs">—</span>}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm">
                                  <Camera className="h-3 w-3 text-muted-foreground" />
                                  {check.photoCount}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Deficiencies */}
                  {inspection.checks.some(c => c.deficiencies && c.deficiencies !== 'Nenhuma') && (
                    <div className="space-y-2">
                      <Separator />
                      {inspection.checks.filter(c => c.deficiencies && c.deficiencies !== 'Nenhuma').map((c, i) => (
                        <div key={i} className="text-sm bg-yellow-50 border border-yellow-200 rounded p-3">
                          <div className="font-medium text-yellow-800">{c.element} — Deficiências:</div>
                          <div className="text-yellow-700 mt-1">{c.deficiencies}</div>
                          {c.correctiveActions && (
                            <div className="text-green-700 mt-1">
                              <span className="font-medium">Ações corretivas:</span> {c.correctiveActions}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })
      )}
      </div>

      {/* New Inspection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-cyan-600" />
              Registar Nova Inspeção de Armaduras
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* General info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Elemento Estrutural *</Label>
                <Input placeholder="ex.: Pilar P01, Viga V3" value={formElement} onChange={e => setFormElement(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Piso / Nível *</Label>
                <Input placeholder="ex.: Piso 2, Fundação" value={formFloor} onChange={e => setFormFloor(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Diâmetro (mm)</Label>
                <Select value={formDiameter} onValueChange={v => setFormDiameter(v as RebarDiameter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['6','8','10','12','16','20','25','32'] as RebarDiameter[]).map(d => (
                      <SelectItem key={d} value={d}>Ø{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Classe de Aço</Label>
                <Select value={formGrade} onValueChange={v => setFormGrade(v as SteelGrade)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A400NR">A400NR</SelectItem>
                    <SelectItem value="A500NR">A500NR</SelectItem>
                    <SelectItem value="A500ER">A500ER</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Turno</Label>
                <Select value={formShift} onValueChange={v => setFormShift(v as 'morning' | 'afternoon' | 'night')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Manhã</SelectItem>
                    <SelectItem value="afternoon">Tarde</SelectItem>
                    <SelectItem value="night">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Recobrimento medido (mm)</Label>
                <Input type="number" placeholder="ex.: 35" value={formCover} onChange={e => setFormCover(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Comprimento de emenda (mm)</Label>
                <Input type="number" placeholder="ex.: 600" value={formOverlap} onChange={e => setFormOverlap(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Limpeza da armadura</Label>
              <Select value={formCleanliness} onValueChange={v => setFormCleanliness(v as typeof formCleanliness)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clean">Limpa</SelectItem>
                  <SelectItem value="minor_rust">Oxidação leve (aceitável)</SelectItem>
                  <SelectItem value="major_rust">Oxidação grave (não conforme)</SelectItem>
                  <SelectItem value="contaminated">Contaminada (óleo, solo, etc.)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Boolean checks */}
            <div className="grid grid-cols-3 gap-4 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Switch checked={formSpacingOk} onCheckedChange={setFormSpacingOk} id="spacing" />
                <Label htmlFor="spacing" className="cursor-pointer">Afastamento OK</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formTieWireOk} onCheckedChange={setFormTieWireOk} id="tie" />
                <Label htmlFor="tie" className="cursor-pointer">Arame de atar OK</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formStraightnessOk} onCheckedChange={setFormStraightnessOk} id="straight" />
                <Label htmlFor="straight" className="cursor-pointer">Rectidão OK</Label>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Deficiências detectadas</Label>
              <Textarea
                placeholder="Descreva as deficiências encontradas (ou deixe em branco se nenhuma)"
                value={formDeficiencies}
                onChange={e => setFormDeficiencies(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label>Ações corretivas</Label>
              <Textarea
                placeholder="Descreva as ações corretivas a executar"
                value={formCorrectiveActions}
                onChange={e => setFormCorrectiveActions(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Inspetor responsável *</Label>
                <Input placeholder="Eng. Nome Apelido" value={formInspectedBy} onChange={e => setFormInspectedBy(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Revisto por *</Label>
                <Input placeholder="Dir. Nome Apelido" value={formReviewedBy} onChange={e => setFormReviewedBy(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Observações gerais</Label>
              <Textarea
                placeholder="Observações gerais da inspeção"
                value={formObservations}
                onChange={e => setFormObservations(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label>Resultado da inspeção *</Label>
              <Select value={formResult} onValueChange={v => setFormResult(v as InspectionResult)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">✅ Aprovado</SelectItem>
                  <SelectItem value="conditional">⚠️ Condicional (com ressalvas)</SelectItem>
                  <SelectItem value="rejected">❌ Reprovado (requer correcção)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
              onClick={handleSave}
              disabled={!formElement || !formFloor || !formInspectedBy || !formReviewedBy}
            >
              <Shield className="h-4 w-4 mr-2" />
              Registar Inspeção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
