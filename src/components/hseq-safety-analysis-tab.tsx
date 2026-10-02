'use client';

import React, { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, Shield, X, ShieldAlert, ShieldCheck, CheckCircle, AlertCircle, XCircle, HelpCircle } from 'lucide-react';
import Image from 'next/image';
import { analyzeSafetyImage } from '@/ai/flows/safety-analysis-flow';
import type { SafetyAnalysisResult, IdentifiedHazard, PpeCheck } from '@/types/hseq';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HseqSafetyAnalysisTabProps {
    projectId: string;
}

export default function HseqSafetyAnalysisTab({ projectId }: HseqSafetyAnalysisTabProps) {
    const { toast } = useToast();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<SafetyAnalysisResult | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit for Gemini
                toast({ title: 'Ficheiro muito grande', description: 'Por favor, selecione uma imagem com menos de 4MB.', variant: 'destructive'});
                return;
            }
            setImageFile(file);
            setAnalysisResult(null); // Reset previous results
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
         if (file) {
             handleFileChange({ target: { files: [file] } } as any);
        }
    };

    const handleAnalyze = async () => {
        if (!imagePreview) return;
        setIsAnalyzing(true);
        setAnalysisResult(null);
        toast({ title: 'Análise em progresso...', description: 'O assistente de IA está a inspecionar a imagem.' });

        try {
            const result = await analyzeSafetyImage(imagePreview);
            setAnalysisResult(result);
            toast({ title: 'Análise concluída!' });
        } catch (error) {
            console.error("Error during safety analysis:", error);
            toast({ title: 'Erro na Análise', description: 'Não foi possível analisar a imagem. Tente novamente.', variant: 'destructive' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getPpeIcon = (status: PpeCheck['status']) => {
        switch (status) {
            case 'Presente': return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'Ausente': return <XCircle className="h-5 w-5 text-red-600" />;
            case 'Não Visível': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
        }
    };

    const getHazardSeverityVariant = (severity: IdentifiedHazard['severity']) => {
        switch (severity) {
            case 'Alta': return 'destructive';
            case 'Média': return 'secondary';
            case 'Baixa': return 'outline';
        }
    };
    
    const getScoreColor = (score: number) => {
        if (score < 40) return 'bg-red-500';
        if (score < 75) return 'bg-yellow-500';
        return 'bg-green-500';
    }

    return (
        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center justify-between">
                    <span>Análise de Segurança de Imagem com IA</span>
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs">Carregue uma fotografia do estaleiro para que o assistente de IA identifique potenciais riscos de segurança e conformidade de EPIs.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardTitle>
                <CardDescription>Carregue uma fotografia do estaleiro para que o assistente de IA identifique potenciais riscos de segurança e conformidade de EPIs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Upload Area */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors h-96"
                        onClick={() => document.getElementById('image-upload')?.click()}
                    >
                         {imagePreview ? (
                            <div className="relative w-full h-full">
                                <Image src={imagePreview} alt="Pré-visualização" layout="fill" objectFit="contain" />
                                 <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 z-10" onClick={(e) => {e.stopPropagation(); setImagePreview(null); setImageFile(null); setAnalysisResult(null); }}>
                                    <X className="h-4 w-4"/>
                                </Button>
                            </div>
                         ) : (
                             <div className="text-center text-muted-foreground">
                                <UploadCloud className="mx-auto h-12 w-12 mb-4" />
                                <h3 className="font-semibold">Arraste e solte uma imagem aqui</h3>
                                <p className="text-sm">ou clique para selecionar um ficheiro</p>
                                <p className="text-xs mt-2">(Max 4MB por imagem)</p>
                            </div>
                         )}
                    </div>

                    {/* Analysis Trigger & Results */}
                    <div className="space-y-4">
                        <Button onClick={handleAnalyze} disabled={!imagePreview || isAnalyzing} className="w-full">
                            {isAnalyzing ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A analisar...</>
                            ) : (
                                <><Shield className="mr-2 h-4 w-4" /> Analisar Imagem com IA</>
                            )}
                        </Button>
                        
                        {isAnalyzing && (
                             <div className="flex flex-col items-center justify-center h-72 border rounded-lg bg-secondary/50">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <p className="mt-4 font-semibold">O nosso engenheiro de segurança virtual está a inspecionar a imagem...</p>
                                <p className="text-sm text-muted-foreground">Isto pode demorar alguns segundos.</p>
                             </div>
                        )}
                        
                        {analysisResult && (
                            <div className="space-y-6 animate-in fade-in-50">
                                <Card>
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-lg">Pontuação Geral de Segurança</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 space-y-2">
                                        <Progress value={analysisResult.overallSafetyScore} indicatorClassName={getScoreColor(analysisResult.overallSafetyScore)}/>
                                        <p className="text-right text-2xl font-bold">{analysisResult.overallSafetyScore}/100</p>
                                    </CardContent>
                                </Card>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <Card>
                                         <CardHeader className="p-4">
                                            <CardTitle className="text-lg">Perigos Identificados</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 space-y-3 max-h-60 overflow-y-auto">
                                            {analysisResult.hazards.length === 0 ? <p className="text-sm text-green-600">Nenhum perigo óbvio identificado.</p> :
                                            analysisResult.hazards.map((h, i) => (
                                                <div key={i} className="p-2 border-l-4 rounded-r-md" style={{ borderColor: getHazardSeverityVariant(h.severity) === 'destructive' ? 'hsl(var(--destructive))' : getHazardSeverityVariant(h.severity) === 'secondary' ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--border))' }}>
                                                    <p className="text-sm font-semibold">{h.description}</p>
                                                    <p className="text-xs text-muted-foreground">{h.recommendation}</p>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                     <Card>
                                         <CardHeader className="p-4">
                                            <CardTitle className="text-lg">Conformidade de EPIs</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 space-y-2">
                                             {analysisResult.ppeCompliance.map((p, i) => (
                                                <div key={i} className="flex items-center justify-between text-sm">
                                                    <p>{p.item}</p>
                                                    <div className="flex items-center gap-2">
                                                        {getPpeIcon(p.status)}
                                                        <span className="font-medium">{p.status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                 <input
                    id="image-upload"
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </CardContent>
        </Card>
    );
}
