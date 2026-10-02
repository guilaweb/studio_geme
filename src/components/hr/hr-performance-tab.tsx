'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Star,
  Plus,
  Loader2,
  HardHat,
  Share2,
  Eye,
  CheckCircle2,
  ShieldAlert,
  Award
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type WorkforceMember } from '@/types/workforce';
import { type HrPerformanceReview } from '@/types/hr';

interface HrPerformanceTabProps {
  workforce: WorkforceMember[];
  canManage: boolean;
}

export default function HrPerformanceTab({ workforce, canManage }: HrPerformanceTabProps) {
  const { idToken, user } = useAuth();
  const { toast } = useToast();

  const [reviews, setReviews] = useState<HrPerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);

  // New review dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeUid, setEmployeeUid] = useState('');
  const [cycleName, setCycleName] = useState('Avaliação 2026 - 1º Semestre');
  const [period, setPeriod] = useState('01/2026 - 06/2026');
  const [technicalScore, setTechnicalScore] = useState(4);
  const [behavioralScore, setBehavioralScore] = useState(4);
  const [safetyScore, setSafetyScore] = useState(5);
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [goals, setGoals] = useState('');
  const [confidentialComments, setConfidentialComments] = useState('');
  const [sharedWithEmployee, setSharedWithEmployee] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Details Modal
  const [selectedReview, setSelectedReview] = useState<HrPerformanceReview | null>(null);

  const fetchReviews = async () => {
    if (!idToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/hr/reviews', {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao carregar avaliações', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [idToken]);

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const selMember = workforce.find(m => m.id === employeeUid);
    if (!employeeUid || !selMember) {
      toast({ title: 'Colaborador obrigatório', description: 'Selecione o profissional a avaliar.', variant: 'destructive' });
      return;
    }

    const overall = Number(((technicalScore + behavioralScore + safetyScore) / 3).toFixed(1));

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/hr/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          employeeUid,
          employeeName: selMember.name,
          cycleName,
          period,
          technicalScore,
          behavioralScore,
          safetyScore,
          overallScore: overall,
          strengths,
          improvements,
          goals,
          confidentialComments,
          sharedWithEmployee,
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao gravar avaliação.');
      }

      toast({
        title: 'Avaliação Registada!',
        description: `Avaliação de desempenho de ${selMember.name} gravada com nota global ${overall}/5.`,
      });

      setIsModalOpen(false);
      setEmployeeUid('');
      setStrengths('');
      setImprovements('');
      setGoals('');
      setConfidentialComments('');
      await fetchReviews();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Ciclos de Avaliação de Desempenho & Competências
            </CardTitle>
            <CardDescription className="text-xs">
              Métricas técnicas, comportamentais e de cumprimento de normas HSEQ em obra
            </CardDescription>
          </div>
          {canManage && (
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="gap-1.5 text-xs h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              Emitir Nova Avaliação
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              A carregar avaliações...
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs space-y-2">
              <Award className="h-8 w-8 mx-auto text-muted-foreground/30" />
              <p>Nenhuma avaliação de desempenho registada no ciclo atual.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Ciclo / Período</TableHead>
                    <TableHead className="text-center">Técnico</TableHead>
                    <TableHead className="text-center">Comportamental</TableHead>
                    <TableHead className="text-center">HSEQ</TableHead>
                    <TableHead className="text-center">Nota Global</TableHead>
                    <TableHead>Avaliador</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((rev) => (
                    <TableRow key={rev.id}>
                      <TableCell className="font-semibold text-xs">{rev.employeeName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{rev.cycleName} ({rev.period})</TableCell>
                      <TableCell className="text-xs text-center">{rev.technicalScore}/5</TableCell>
                      <TableCell className="text-xs text-center">{rev.behavioralScore}/5</TableCell>
                      <TableCell className="text-xs text-center">{rev.safetyScore}/5</TableCell>
                      <TableCell className="text-xs text-center">
                        <Badge variant="secondary" className="font-bold text-amber-600">
                          ★ {rev.overallScore}/5
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{rev.reviewerName}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setSelectedReview(rev)}
                        >
                          Ver Ficha
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL NOVA AVALIAÇÃO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleCreateReview}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4 text-primary" />
                Registar Avaliação de Desempenho
              </DialogTitle>
              <DialogDescription>
                Pontue as dimensões técnicas, comportamentais e de segurança do colaborador.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-1.5">
                <Label htmlFor="eval-member">Colaborador Avaliado *</Label>
                <Select value={employeeUid} onValueChange={setEmployeeUid}>
                  <SelectTrigger id="eval-member">
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {workforce.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name} ({m.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="eval-cycle">Ciclo *</Label>
                  <Input
                    id="eval-cycle"
                    value={cycleName}
                    onChange={(e) => setCycleName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eval-period">Período *</Label>
                  <Input
                    id="eval-period"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg border space-y-3">
                <p className="text-xs font-bold text-foreground">Pontuação por Dimensão (Escala 1 a 5 estrelas)</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="space-y-1">
                    <Label htmlFor="score-tech" className="text-[11px]">Técnica / Execução</Label>
                    <Input
                      id="score-tech"
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      value={technicalScore}
                      onChange={(e) => setTechnicalScore(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="score-beh" className="text-[11px]">Comportamental</Label>
                    <Input
                      id="score-beh"
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      value={behavioralScore}
                      onChange={(e) => setBehavioralScore(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="score-safe" className="text-[11px]">Segurança HSEQ</Label>
                    <Input
                      id="score-safe"
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      value={safetyScore}
                      onChange={(e) => setSafetyScore(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="text-center font-bold text-amber-600 text-xs pt-1">
                  Média Prevista: {((technicalScore + behavioralScore + safetyScore) / 3).toFixed(1)} / 5.0
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eval-strengths">Pontos Fortes Demonstrados</Label>
                <Textarea
                  id="eval-strengths"
                  placeholder="Ex: Excelente pontualidade, rigor no cálculo de armaduras..."
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eval-improvements">Oportunidades de Melhoria</Label>
                <Textarea
                  id="eval-improvements"
                  placeholder="Ex: Reforçar comunicação de desvios no RDO diário..."
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eval-goals">Metas & Objetivos para o Próximo Período</Label>
                <Textarea
                  id="eval-goals"
                  placeholder="Ex: Concluir formação em gestão de contratos FIDIC..."
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eval-confidential" className="text-amber-700 dark:text-amber-400 font-semibold text-xs">
                  Notas Confidenciais da Chefia / RH (Ocultas do Colaborador)
                </Label>
                <Textarea
                  id="eval-confidential"
                  placeholder="Observações restritas ao dossier de gestão..."
                  value={confidentialComments}
                  onChange={(e) => setConfidentialComments(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Gravar Avaliação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALHE DA AVALIAÇÃO */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Award className="h-5 w-5 text-amber-500" />
              Ficha de Desempenho Homologada
            </DialogTitle>
            <DialogDescription>
              {selectedReview?.employeeName} • {selectedReview?.cycleName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between">
              <span className="font-semibold text-foreground">Classificação Global:</span>
              <Badge className="bg-amber-600 text-white font-bold text-sm">
                ★ {selectedReview?.overallScore}/5
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded border bg-card">
                <p className="text-[10px] text-muted-foreground">Técnica</p>
                <p className="font-bold">{selectedReview?.technicalScore}/5</p>
              </div>
              <div className="p-2 rounded border bg-card">
                <p className="text-[10px] text-muted-foreground">Comportamental</p>
                <p className="font-bold">{selectedReview?.behavioralScore}/5</p>
              </div>
              <div className="p-2 rounded border bg-card">
                <p className="text-[10px] text-muted-foreground">Segurança</p>
                <p className="font-bold">{selectedReview?.safetyScore}/5</p>
              </div>
            </div>

            {selectedReview?.strengths && (
              <div>
                <p className="font-bold text-foreground">Pontos Fortes:</p>
                <p className="text-muted-foreground mt-0.5">{selectedReview.strengths}</p>
              </div>
            )}
            {selectedReview?.improvements && (
              <div>
                <p className="font-bold text-foreground">Oportunidades de Melhoria:</p>
                <p className="text-muted-foreground mt-0.5">{selectedReview.improvements}</p>
              </div>
            )}
            {selectedReview?.goals && (
              <div>
                <p className="font-bold text-foreground">Metas Estabelecidas:</p>
                <p className="text-muted-foreground mt-0.5">{selectedReview.goals}</p>
              </div>
            )}
            {selectedReview?.confidentialComments && (
              <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-amber-800 dark:text-amber-300">
                <p className="font-bold text-[11px]">Nota Confidencial:</p>
                <p className="mt-0.5">{selectedReview.confidentialComments}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReview(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
