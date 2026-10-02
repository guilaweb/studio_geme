'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, FileText, CheckCircle2, ShieldCheck, X, Loader2 } from 'lucide-react';
import type { jsPDFWithAutoTable } from '@/lib/pdf/executive-pdf-engine';

interface ExecutivePdfViewerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pdfDoc: jsPDFWithAutoTable | null;
    title: string;
    fileName?: string;
    documentType?: string;
}

export function ExecutivePdfViewerModal({
    open,
    onOpenChange,
    pdfDoc,
    title,
    fileName = 'documento_oficial_profundidade.pdf',
    documentType = 'DOCUMENTO TÉCNICO OFICIAL'
}: ExecutivePdfViewerModalProps) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [pageCount, setPageCount] = useState<number>(1);
    const [isPrinting, setIsPrinting] = useState<boolean>(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (pdfDoc && open) {
            try {
                const blob = pdfDoc.output('blob');
                const url = URL.createObjectURL(blob);
                setBlobUrl(url);
                setPageCount(pdfDoc.getNumberOfPages());

                return () => {
                    URL.revokeObjectURL(url);
                };
            } catch (err) {
                console.error('Erro ao gerar visualização do PDF:', err);
            }
        } else {
            setBlobUrl(null);
        }
    }, [pdfDoc, open]);

    const handleDownload = () => {
        if (!pdfDoc) return;
        const cleanName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
        pdfDoc.save(cleanName);
    };

    const handleDirectPrint = () => {
        if (!iframeRef.current || !blobUrl) {
            // Fallback caso iframe não esteja pronto: abrir blob em nova aba e disparar print
            const printWindow = window.open(blobUrl || '', '_blank');
            if (printWindow) {
                printWindow.focus();
                printWindow.print();
            }
            return;
        }

        setIsPrinting(true);
        try {
            const frame = iframeRef.current;
            frame.focus();
            if (frame.contentWindow) {
                frame.contentWindow.print();
            }
        } catch (e) {
            console.warn('Impressão via iframe restrita, abrindo janela auxiliar:', e);
            const w = window.open(blobUrl, '_blank');
            if (w) {
                w.focus();
                w.print();
            }
        } finally {
            setTimeout(() => setIsPrinting(false), 1000);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 bg-slate-900 border-slate-800 text-white overflow-hidden shadow-2xl">
                {/* Header da Barra de Ferramentas */}
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <DialogTitle className="text-sm sm:text-base font-bold text-white uppercase tracking-tight">
                                    {title}
                                </DialogTitle>
                                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                                    {documentType}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> Padrão Executivo ({pageCount} {pageCount === 1 ? 'Página' : 'Páginas'})
                                </Badge>
                            </div>
                            <DialogDescription className="text-xs text-slate-400 mt-0.5">
                                Layout de engenharia com paginação formal, cabeçalhos institucionais e assinatura probatória SHA-256.
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDirectPrint}
                            disabled={!blobUrl || isPrinting}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs font-semibold gap-1.5 h-9"
                        >
                            {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                            Imprimir Documento
                        </Button>

                        <Button
                            size="sm"
                            onClick={handleDownload}
                            disabled={!pdfDoc}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-1.5 h-9 shadow-sm"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Descarregar PDF Oficial
                        </Button>
                    </div>
                </div>

                {/* Área de Visualização do PDF */}
                <div className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-hidden flex items-center justify-center">
                    {blobUrl ? (
                        <iframe
                            ref={iframeRef}
                            src={`${blobUrl}#toolbar=1&navpanes=0`}
                            title={title}
                            className="w-full h-full rounded-lg border border-slate-800 bg-white shadow-inner"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <span className="text-xs font-medium">A compilar documento em alta definição...</span>
                        </div>
                    )}
                </div>

                {/* Rodapé Informativo */}
                <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Compilação vetorial milimétrica • Sem cortes do navegador
                    </span>
                    <span>PROFUNDIDADE OS • Motor de Decisão & Engenharia</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
