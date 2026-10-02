'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { WbsItem } from '@/types/wbs';
import { parseMsProjectXml } from '@/lib/gantt-xml-converter';
import { format } from 'date-fns';
import { Upload, FileCode, CheckCircle2, AlertTriangle, Loader2, FileSpreadsheet } from 'lucide-react';

interface GanttImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onImportComplete?: () => void;
}

export function GanttImportModal({
  open,
  onOpenChange,
  projectId,
  onImportComplete,
}: GanttImportModalProps) {
  const { toast } = useToast();
  const [parsedTasks, setParsedTasks] = useState<Partial<WbsItem>[]>([]);
  const [fileName, setFileName] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsReading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith('.xml')) {
          const tasks = parseMsProjectXml(text);
          setParsedTasks(tasks);
          toast({
            title: 'Ficheiro Lido',
            description: `${tasks.length} atividades identificadas no XML do MS Project.`,
          });
        } else if (file.name.endsWith('.csv')) {
          // Parsing simples de CSV
          const lines = text.split('\n').filter((l) => l.trim().length > 0);
          const tasks: Partial<WbsItem>[] = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';').map((c) => c.replace(/^"|"$/g, '').trim());
            if (cols.length >= 4) {
              const code = cols[0];
              const name = cols[1];
              const startStr = cols[2];
              const endStr = cols[3];
              if (name && startStr && endStr) {
                const startDate = new Date(startStr);
                const endDate = new Date(endStr);
                tasks.push({
                  name,
                  code: code || undefined,
                  startDate,
                  endDate,
                  durationDays: parseInt(cols[4] || '1', 10) || 1,
                  progress: parseInt(cols[5] || '0', 10) || 0,
                  status: 'not_started',
                  level: 'activity',
                  category: 'Estrutura',
                });
              }
            }
          }
          setParsedTasks(tasks);
        }
      } catch (err: any) {
        console.error('Erro ao fazer parsing de ficheiro:', err);
        toast({
          title: 'Erro de Leitura',
          description: 'Não foi possível interpretar o ficheiro. Verifique se é um XML do MS Project ou CSV válido.',
          variant: 'destructive',
        });
      } finally {
        setIsReading(false);
      }
    };

    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (parsedTasks.length === 0 || !projectId) return;

    setIsImporting(true);
    try {
      const batch = writeBatch(db);
      const wbsCollection = collection(db, 'projects', projectId, 'wbs');

      parsedTasks.forEach((t) => {
        const newDocRef = doc(wbsCollection);
        batch.set(newDocRef, {
          name: t.name,
          code: t.code || null,
          startDate: t.startDate ? Timestamp.fromDate(t.startDate) : Timestamp.now(),
          endDate: t.endDate ? Timestamp.fromDate(t.endDate) : Timestamp.now(),
          durationDays: t.durationDays || 1,
          progress: t.progress || 0,
          status: t.status || 'not_started',
          isMilestone: !!t.isMilestone,
          category: t.category || 'Estrutura',
          level: 'activity',
          createdAt: Timestamp.now(),
        });
      });

      await batch.commit();

      toast({
        title: 'Importação Concluída!',
        description: `${parsedTasks.length} atividades foram adicionadas ao cronograma com sucesso.`,
      });

      if (onImportComplete) onImportComplete();
      onOpenChange(false);
      setParsedTasks([]);
      setFileName('');
    } catch (err: any) {
      console.error('Erro ao importar para Firestore:', err);
      toast({
        title: 'Erro na Importação',
        description: err.message || 'Falha ao gravar as atividades no banco de dados.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-1">
            <Upload className="h-5 w-5" />
          </div>
          <DialogTitle className="text-base font-bold">
            Importar Cronograma (MS Project XML / CSV)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Carregue ficheiros oficiais exportados do Microsoft Project (.xml), Primavera P6 ou folhas de cálculo (.csv).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Caixa de Upload */}
          <div className="border-2 border-dashed rounded-lg p-5 text-center hover:bg-muted/30 transition-colors">
            <input
              type="file"
              accept=".xml,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="gantt-file-import-input"
            />
            <label htmlFor="gantt-file-import-input" className="cursor-pointer space-y-2 block">
              <FileCode className="h-8 w-8 text-primary mx-auto" />
              <div className="text-xs font-bold text-foreground">
                {fileName ? fileName : 'Clique para selecionar o ficheiro (.xml ou .csv)'}
              </div>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Suporta formato nativo Microsoft Project Schema (MSPDI XML) e planilhas de cronograma.
              </p>
            </label>
          </div>

          {/* Pré-visualização das Atividades */}
          {parsedTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold px-1">
                <span>Atividades Reconhecidas ({parsedTasks.length}):</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Pronto para Inserção
                </Badge>
              </div>

              <ScrollArea className="h-48 border rounded-md p-2 bg-muted/10">
                <div className="space-y-1.5">
                  {parsedTasks.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded border bg-card text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {t.code && (
                          <span className="font-mono text-[10px] text-primary font-bold">
                            [{t.code}]
                          </span>
                        )}
                        <span className="truncate font-medium text-foreground">{t.name}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[11px] text-muted-foreground font-mono">
                        <span>{t.startDate ? format(t.startDate, 'dd/MM/yy') : ''}</span>
                        <span>→</span>
                        <span>{t.endDate ? format(t.endDate, 'dd/MM/yy') : ''}</span>
                        <span className="font-bold text-foreground">({t.durationDays}d)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmImport}
            disabled={parsedTasks.length === 0 || isImporting}
            className="font-bold"
          >
            {isImporting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Importar {parsedTasks.length > 0 ? `(${parsedTasks.length} Atividades)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
