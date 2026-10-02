'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { HOBBY_PLAN_DAILY_LIMIT } from '@/lib/config';
import { Loader2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PrecosPage() {
  const { user, idToken, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [subscriptionFile, setSubscriptionFile] = useState<File | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const handleAuthAction = (action: 'login' | 'signup') => {
    router.push(`/${action}`);
  };

  const handleRequestSubscription = async (plan: 'pro' | 'enterprise') => {
    if (!user || !idToken) {
      toast({
        title: "Autenticação Necessária",
        description: "Por favor, crie uma conta ou faça login para subscrever.",
        variant: "destructive"
      });
      router.push('/login');
      return;
    }

    if (!subscriptionFile) {
        toast({ title: 'Comprovativo em falta', description: 'Por favor, anexe o comprovativo de pagamento.', variant: 'destructive' });
        return;
    }

    setIsRequesting(true);
    toast({ title: 'A enviar o seu pedido...', description: 'Por favor, aguarde.'});

    try {
        const formData = new FormData();
        formData.append('plan', plan);
        formData.append('userName', user.displayName || user.email!);
        formData.append('userEmail', user.email!);
        formData.append('file', subscriptionFile);

        const response = await fetch('/api/subscriptions/request', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${idToken}`,
            },
            body: formData,
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao criar o pedido de subscrição.');
        }

        toast({
            title: "Pedido Recebido!",
            description: "O seu pedido de subscrição foi enviado com sucesso. A sua conta será atualizada assim que o pagamento for confirmado.",
        });

    } catch (error: any) {
        toast({ title: 'Erro ao enviar pedido', description: error.message, variant: 'destructive' });
    } finally {
        setIsRequesting(false);
        setSubscriptionFile(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <section id="pricing" className="w-full py-20 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold font-headline">Planos e Preços</h1>
              <p className="max-w-2xl mx-auto mt-2 text-muted-foreground md:text-xl">Escolha o plano que melhor se adapta à dimensão da sua operação. Simples, transparente e sem surpresas.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Hobby Plan */}
              <Card>
                <CardHeader>
                  <CardTitle>Iniciação</CardTitle>
                  <CardDescription>Para analistas individuais ou pequenos casos.</CardDescription>
                  <p className="text-4xl font-bold pt-4">Grátis<span className="text-sm font-normal text-muted-foreground">/sempre</span></p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary"/>1 Caso / Dossiê Ativo</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary"/>Até 5 utilizadores</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary"/>1GB de armazenamento forense</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary"/>{HOBBY_PLAN_DAILY_LIMIT} Ações de SI/dia</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="secondary" onClick={() => handleAuthAction('signup')}>Começar Agora</Button>
                </CardFooter>
              </Card>

              {/* Pro Plan */}
              <Card className="border-primary ring-2 ring-primary">
                 <CardHeader>
                  <CardTitle>Professional</CardTitle>
                  <CardDescription>Para departamentos de compliance e equipas de investigação.</CardDescription>
                  <p className="text-4xl font-bold pt-4">49.999 Kz<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary"/>Casos & Dossiês ilimitados</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary"/>Investigadores ilimitados</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary"/>50GB de armazenamento forense (GCS)</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary"/>Ações de SI (Inteligência) ilimitadas</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary"/>Cadeia de custódia SHA-256 e suporte prioritário</li>
                  </ul>
                </CardContent>
                <CardFooter>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="w-full">Contratar</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Pagamento por Transferência</DialogTitle>
                                <DialogDescription>
                                    Para subscrever o plano Profissional, por favor, realize uma transferência bancária e carregue o comprovativo abaixo.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="p-4 bg-secondary rounded-md">
                                    <p className="text-sm font-semibold">Nome da Empresa:</p>
                                    <p className="font-mono">DIANGUILA EMPREENDIMENTOS, LDA.</p>
                                    <p className="text-sm font-semibold mt-2">IBAN:</p>
                                    <p className="font-mono">AO06 0055 0000 1437 0893 1010 9</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="proof-upload">Anexar Comprovativo</Label>
                                    <Input 
                                        id="proof-upload" 
                                        type="file" 
                                        onChange={(e) => setSubscriptionFile(e.target.files?.[0] || null)}
                                        accept="image/png, image/jpeg, application/pdf"
                                    />
                                    {subscriptionFile && <p className="text-xs text-muted-foreground">Ficheiro selecionado: {subscriptionFile.name}</p>}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Após o envio, a sua conta será ativada assim que o pagamento for confirmado pela nossa equipa.
                                </p>
                            </div>
                            <DialogFooter>
                                <Button onClick={() => handleRequestSubscription('pro')} disabled={isRequesting || !subscriptionFile}>
                                    {isRequesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    {isRequesting ? 'A enviar...' : 'Já fiz a transferência'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
              </Card>

              {/* Enterprise Plan */}
              <Card>
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <CardDescription>Soluções personalizadas e segurança avançada.</CardDescription>
                  <p className="text-4xl font-bold pt-4">Customizado</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="font-semibold text-foreground">Tudo do Pro e mais...</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary"/>Single Sign-On (SSO)</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary"/>Permissões customizadas</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary"/>Gerente de conta dedicado</li>
                  </ul>
                </CardContent>
                <CardFooter>
                   <Button className="w-full" variant="secondary" asChild>
                    <Link href="/contact">Fale Connosco</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="py-6 border-t mt-16">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-center text-sm text-muted-foreground gap-4">
          <span>© {new Date().getFullYear()} Profundidade. Todos os direitos reservados.</span>
          <div className="flex gap-4">
             <Link href="/ajuda" className="hover:underline">Como Usar</Link>
             <Link href="/contact" className="hover:underline">Contacto</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
