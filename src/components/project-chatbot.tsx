'use client';

import React from 'react';
import { useChat } from 'ai/react';
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  FileSignature, 
  Fuel, 
  Receipt, 
  ArrowRight,
  HelpCircle,
  Clock,
  Printer,
  ClipboardCheck,
  PackageCheck
} from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';

interface ProjectChatbotProps {
  projectId: string;
  onOpenMeasurementWizard?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export function ProjectChatbot({ projectId, onOpenMeasurementWizard, onNavigateTab }: ProjectChatbotProps) {
  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: {
      projectId: projectId,
    }
  });

  const executivePrompts = [
    { label: 'Atividades Atrasadas', icon: 'clock', query: 'Quais atividades estão atrasadas e afetam o caminho crítico?' },
    { label: 'Desvios de Orçamento', icon: 'dollar', query: 'Onde estamos acima do orçamento e com CPI menor que 1.0?' },
    { label: 'Não Conformidades (NCR)', icon: 'alert', query: 'Quais Não Conformidades e Pontos de Paragem (Hold Points) estão pendentes na fiscalização?' },
    { label: 'Stock de Cimento e Aço', icon: 'package', query: 'Qual o saldo atual de cimento, varão de aço e materiais no estaleiro?' },
    { label: 'Produção da Semana', icon: 'layers', query: 'Qual foi a produção e os volumes executados desta semana?' },
    { label: 'Paragens de Máquinas', icon: 'truck', query: 'Quais equipamentos tiveram mais paragens ou consumo anómalo de combustível?' },
    { label: 'Riscos de Conclusão', icon: 'alert', query: 'Quais riscos podem afetar a data prevista de conclusão do projeto?' },
  ];

  // Renderiza conteúdo formatado e detecta tags de ação
  const renderMessageContent = (content: string) => {
    const hasMeasurementAction = content.includes('[ACTION:OPEN_MEASUREMENT_WIZARD]');
    const hasEquipmentAction = content.includes('[ACTION:INSPECT_EQUIPMENT]');
    const hasInvoicesAction = content.includes('[ACTION:VIEW_INVOICES]');
    const hasFiscalizacaoAction = content.includes('[ACTION:OPEN_FISCALIZACAO]');
    const hasMaterialsAction = content.includes('[ACTION:VIEW_MATERIALS]');

    // Remove as tags técnicas do texto exibido
    const cleanContent = content
      .replace(/\[ACTION:OPEN_MEASUREMENT_WIZARD\]/g, '')
      .replace(/\[ACTION:INSPECT_EQUIPMENT\]/g, '')
      .replace(/\[ACTION:VIEW_INVOICES\]/g, '')
      .replace(/\[ACTION:OPEN_FISCALIZACAO\]/g, '')
      .replace(/\[ACTION:VIEW_MATERIALS\]/g, '')
      .trim();

    return (
      <div className="space-y-3">
        <p className="leading-relaxed whitespace-pre-wrap text-xs md:text-sm">{cleanContent}</p>

        {/* Action Cards Executáveis */}
        {hasMeasurementAction && (
          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="text-xs font-semibold text-emerald-950 dark:text-emerald-100">
                Auto de Medição Preparado
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (onOpenMeasurementWizard) onOpenMeasurementWizard();
                else if (onNavigateTab) onNavigateTab('measurement-certificates');
              }}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              Abrir Wizard & Emitir PDF
            </Button>
          </div>
        )}

        {hasEquipmentAction && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-amber-600 shrink-0" />
              <div className="text-xs font-semibold text-amber-950 dark:text-amber-100">
                Desvio de Gasóleo Identificado
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onNavigateTab && onNavigateTab('equipment')}
              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              <ArrowRight className="h-3.5 w-3.5 mr-1" />
              Ver Frotas & Horímetros
            </Button>
          </div>
        )}

        {hasInvoicesAction && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600 shrink-0" />
              <div className="text-xs font-semibold text-blue-950 dark:text-blue-100">
                Faturas Pendentes de Homologação
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onNavigateTab && onNavigateTab('compras')}
              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              <ArrowRight className="h-3.5 w-3.5 mr-1" />
              Ver Faturas & Aprovar
            </Button>
          </div>
        )}

        {hasFiscalizacaoAction && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-red-600 shrink-0" />
              <div className="text-xs font-semibold text-red-950 dark:text-red-100">
                Fiscalização Técnica: NCRs & Pontos H
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onNavigateTab && onNavigateTab('fiscalizacao')}
              className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              <ArrowRight className="h-3.5 w-3.5 mr-1" />
              Abrir Fiscalização
            </Button>
          </div>
        )}

        {hasMaterialsAction && (
          <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-indigo-600 shrink-0" />
              <div className="text-xs font-semibold text-indigo-950 dark:text-indigo-100">
                Stocks de Estaleiro & Homologação
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onNavigateTab && onNavigateTab('materials-control')}
              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              <ArrowRight className="h-3.5 w-3.5 mr-1" />
              Ver Armazém & Entregas
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="py-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Profundidade Intelligence</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Copiloto de IA para Engenharia e Gestão de Obras. Pergunte ao projeto em linguagem natural:
              </p>
            </div>

            <div className="space-y-2 pt-2 text-left">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block px-1">
                Perguntas Frequentes ao Projeto:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {executivePrompts.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInput(item.query)}
                    className="text-left p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-card hover:bg-accent/40 hover:border-primary/40 transition-colors text-xs text-foreground flex flex-col justify-between gap-1 shadow-xs group"
                  >
                    <div className="font-semibold text-primary group-hover:underline flex items-center justify-between">
                      <span>{item.label}</span>
                      <ArrowRight className="h-3 w-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <span className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                      "{item.query}"
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((m) => (
              <div key={m.id} className="flex gap-3 text-slate-700 dark:text-slate-200 text-sm">
                {m.role === 'user' ? (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-xs">U</AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 space-y-1">
                  <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    {m.role === 'user' ? 'Você' : 'Profundidade AI Copilot'}
                    {m.role !== 'user' && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                        Executivo
                      </Badge>
                    )}
                  </div>
                  {renderMessageContent(m.content)}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-3 border-t bg-secondary/30">
        <div className="flex w-full items-center space-x-2">
          <Input
            value={input}
            placeholder="Pergunte em linguagem natural (ex: 'Gera o auto desta semana...')"
            onChange={handleInputChange}
            className="bg-background text-xs h-9"
          />
          <Button type="submit" size="sm" disabled={isLoading} className="h-9 px-3">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
