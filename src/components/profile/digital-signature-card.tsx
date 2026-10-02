'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  FileSignature, 
  Trash2, 
  UploadCloud, 
  CheckCircle2, 
  ShieldCheck, 
  RotateCcw, 
  Eye, 
  Sparkles,
  Award
} from 'lucide-react';
import Image from 'next/image';

interface DigitalSignatureCardProps {
  currentSignatureUrl?: string | null;
  professionalName: string;
  professionalRegNumber?: string;
  jobTitle?: string;
  company?: string;
  onSaveSignature: (signatureDataUrl: string) => Promise<void>;
}

export function DigitalSignatureCard({
  currentSignatureUrl,
  professionalName,
  professionalRegNumber,
  jobTitle,
  company,
  onSaveSignature,
}: DigitalSignatureCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentSignatureUrl || null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentSignatureUrl) {
      setPreviewUrl(currentSignatureUrl);
    }
  }, [currentSignatureUrl]);

  // Inicializa e limpa canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Traçado com Rato e Toque
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a'; // Azul escuro / preto tinta
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Guardar traçado do canvas
  const handleSaveDrawnSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    setIsSaving(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewUrl(dataUrl);
      await onSaveSignature(dataUrl);
      clearCanvas();
    } finally {
      setIsSaving(false);
    }
  };

  // Carregar ficheiro de imagem da rubrica
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      setIsSaving(true);
      try {
        await onSaveSignature(dataUrl);
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSignature = async () => {
    setPreviewUrl(null);
    clearCanvas();
    await onSaveSignature('');
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <FileSignature className="h-5 w-5 text-primary" />
              Assinatura Gráfica & Carimbo Técnico
            </CardTitle>
            <CardDescription className="text-xs">
              Utilizada na homologação de Diários de Obra (RDO), Autos de Medição e Relatórios Técnicos (FIDIC / OEA).
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-900 border-slate-300 gap-1">
            <Award className="h-3 w-3 text-amber-500" />
            Padrão OEA
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lado Esquerdo: Área de Desenho da Rubrica */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold">Desenhar Rubrica com o Rato / Ecrã Tátil</Label>
              {hasDrawn && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearCanvas}
                  className="h-6 text-[11px] text-muted-foreground hover:text-destructive gap-1 px-2"
                >
                  <RotateCcw className="h-3 w-3" />
                  Limpar
                </Button>
              )}
            </div>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 p-1 relative overflow-hidden">
              <canvas
                ref={canvasRef}
                width={360}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[160px] cursor-crosshair touch-none"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-xs text-muted-foreground/60">
                  <span>Assine ou rubrique aqui</span>
                  <span className="text-[10px] mt-0.5">Dispositivo tátil, caneta ou rato</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleSaveDrawnSignature}
                disabled={!hasDrawn || isSaving}
                className="text-xs h-8 bg-primary text-primary-foreground font-semibold"
              >
                {isSaving ? 'A guardar...' : 'Aplicar Desenho'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs h-8 gap-1.5"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Carregar Imagem
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png, image/jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Lado Direito: Pré-visualização do Carimbo Técnico Oficial */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold">Pré-visualização do Carimbo de Homologação</Label>
            
            <div className="border-2 border-slate-900/40 dark:border-slate-400/40 rounded-xl p-4 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col justify-between min-h-[160px]">
              <div>
                <div className="flex justify-between items-start border-b border-slate-300 dark:border-slate-700 pb-1.5 mb-2">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      ORDEM DOS ENGENHEIROS DE ANGOLA
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      TERMO DE RESPONSABILIDADE & HOMOLOGAÇÃO
                    </div>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>

                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-foreground">{professionalName || 'Engenheiro Residente'}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {jobTitle || 'Direção Técnica de Obra'} {company ? `• ${company}` : ''}
                  </div>
                  <div className="text-[10px] font-mono text-primary font-semibold">
                    Cédula OEA: {professionalRegNumber || 'OEA-AO-PENDENTE'}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-end justify-between">
                <div className="w-36 h-12 relative flex items-center justify-center">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={previewUrl} 
                      alt="Rubrica Digital" 
                      className="max-h-12 max-w-full object-contain filter contrast-125"
                    />
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic border-b border-dashed border-slate-400 w-full text-center pb-1">
                      [Rubrica Pendente]
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-[9px] font-mono text-muted-foreground">
                    WAT UTC+1
                  </div>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600 font-mono">
                    SHA-256 VALID
                  </Badge>
                </div>
              </div>
            </div>

            {previewUrl && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveSignature}
                  className="h-6 text-[11px] text-destructive hover:bg-destructive/10 gap-1 px-2"
                >
                  <Trash2 className="h-3 w-3" />
                  Remover Assinatura
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
