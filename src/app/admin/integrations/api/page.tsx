
'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Copy, Check, RefreshCw, AlertTriangle, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ApiManagementPage() {
    const { user: adminUser, loading: authLoading } = useRequireAuth(['super-admin']);
    const router = useRouter();
    const { toast } = useToast();
    const [apiUrl, setApiUrl] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setApiUrl(`${window.location.origin}/api/crm/leads`);
    }, []);

    const handleCopyExampleUsage = () => {
        const exampleCurl = `curl -X POST ${apiUrl} \\
-H "Content-Type: application/json" \\
-H "x-api-key: SUA_CHAVE_AQUI" \\
-d '{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "999888777",
  "source": "Website Form"
}'`;
        navigator.clipboard.writeText(exampleCurl);
        setCopied(true);
        toast({ title: 'Exemplo de uso copiado!' });
        setTimeout(() => setCopied(false), 3000);
    };
    
    if (authLoading || !adminUser) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex flex-1 items-center justify-center">
                    <p>Carregando...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-secondary/50">
            <Header />
            <main className="flex-1 p-4 md:p-8">
                 <TooltipProvider>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div>
                            <Button variant="outline" asChild className="mb-4">
                                <Link href="/admin/integrations">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar às Integrações
                                </Link>
                            </Button>
                             <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold font-headline">Gestão de API & Webhooks</h1>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><HelpCircle className="h-4 w-4 text-muted-foreground"/></Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p className="max-w-xs">Use esta página para gerir as chaves de API que permitem a sistemas externos (como o seu website) comunicar com a Profundidade.</p></TooltipContent>
                                </Tooltip>
                            </div>
                            <p className="text-muted-foreground">Gere as suas chaves de API e configure webhooks para integrações personalizadas.</p>
                        </div>
                        
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Configuração Necessária</AlertTitle>
                            <AlertDescription>
                                Para usar a API de Leads, adicione uma variável `CRM_API_KEY=sua_chave_secreta_aqui` ao seu ficheiro `.env` na raiz do projeto e reinicie o servidor.
                            </AlertDescription>
                        </Alert>

                        <Card>
                            <CardHeader>
                                <CardTitle>Chave de API para Leads (CRM)</CardTitle>
                                <CardDescription>Use esta chave para autenticar pedidos de sistemas externos e criar novos leads automaticamente.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Sua Chave de API Secreta</Label>
                                    <div className="flex items-center gap-2">
                                        <Input value="********************************" readOnly className="font-mono" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Esta chave deve ser mantida em segredo. Use-a no cabeçalho `x-api-key` para enviar novos leads para o endpoint <code className="bg-muted px-1 py-0.5 rounded">/api/crm/leads</code>.
                                    </p>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="secondary" onClick={handleCopyExampleUsage}>
                                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                                    Copiar Exemplo de Uso (cURL)
                                </Button>
                                <Button variant="destructive" disabled>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Gerar Nova Chave (Em breve)
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TooltipProvider>
            </main>
        </div>
    );
}
