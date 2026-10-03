'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, signInWithPopup, type ConfirmationResult, sendPasswordResetEmail, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useAuth, useRedirectIfAuthenticated } from '@/hooks/use-auth';
import { Loader2, Mail, Phone, KeyRound, AlertTriangle, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const emailFormSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(1, { message: 'A senha é obrigatória.' }),
});

const phoneFormSchema = z.object({
    phone: z.string().min(9, { message: 'Por favor, insira um número válido.' }),
});

const codeFormSchema = z.object({
    code: z.string().length(6, { message: 'O código deve ter 6 caracteres.' }),
});

export default function LoginPage() {
  useRedirectIfAuthenticated();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetingPassword, setIsResetingPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    try {
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
        });
        setRecaptchaVerifier(verifier);
        return () => {
            verifier.clear();
        };
    } catch (e) {
        console.error("Recaptcha init error:", e);
    }
  }, []);

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: '' },
  });

  const codeForm = useForm<z.infer<typeof codeFormSchema>>({
    resolver: zodResolver(codeFormSchema),
    defaultValues: { code: '' },
  });

  const handleFirebaseError = (error: any, defaultTitle: string) => {
    console.error(defaultTitle, error);
    let description = 'Ocorreu um erro. Por favor, tente novamente.';

    const errorMessage = error?.message?.toLowerCase() || '';

    // Detetar erro de bloqueio da API do Identity Toolkit
    if (errorMessage.includes('identitytoolkit') && errorMessage.includes('blocked')) {
        setApiError('O serviço de autenticação do Firebase está bloqueado na sua configuração de nuvem. RESOLUÇÃO: 1. Aceda ao Google Cloud Console. 2. Ative a "Identity Toolkit API". 3. Em "Credenciais", selecione a sua Chave de API e remova as restrições que bloqueiam esta API.');
        return;
    }

    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'As credenciais estão incorretas ou o utilizador não existe.';
    } else if (error.code === 'auth/too-many-requests') {
        description = 'Demasiadas tentativas. Por favor, tente mais tarde.';
    } else {
        description = error.message || description;
    }

    toast({ title: defaultTitle, description, variant: 'destructive' });
  };

  const onEmailSubmit = async (values: z.infer<typeof emailFormSchema>) => {
    setLoading(true);
    setApiError(null);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      const redirectUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') || '/investigacao' : '/investigacao';
      router.push(redirectUrl);
    } catch (error: any) {
      handleFirebaseError(error, 'Erro de Login');
    } finally {
        setLoading(false);
    }
  };

  const onPhoneSubmit = async (values: z.infer<typeof phoneFormSchema>) => {
    if (!recaptchaVerifier) {
        toast({ title: 'Erro', description: 'O verificador de segurança não foi carregado.', variant: 'destructive' });
        return;
    }
    setLoading(true);
    setApiError(null);
    try {
        const phoneNumber = values.phone.startsWith('+') ? values.phone : `+244${values.phone}`;
        const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        setConfirmationResult(result);
        setIsCodeSent(true);
        toast({ title: "Código enviado!", description: `Verifique o SMS enviado para ${phoneNumber}` });
    } catch (error: any) {
        handleFirebaseError(error, 'Erro no SMS');
    } finally {
        setLoading(false);
    }
  };

  const onCodeSubmit = async (values: z.infer<typeof codeFormSchema>) => {
    if (!confirmationResult) return;
    setLoading(true);
    try {
      await confirmationResult.confirm(values.code);
      const redirectUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') || '/investigacao' : '/investigacao';
      router.push(redirectUrl);
    } catch (error) {
      handleFirebaseError(error, 'Erro de Verificação');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setApiError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      const redirectUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') || '/investigacao' : '/investigacao';
      router.push(redirectUrl);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        handleFirebaseError(error, 'Erro com o Google');
      }
    } finally {
        setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
        toast({ title: "Email obrigatório", description: "Insira o seu email para recuperar a senha.", variant: "destructive" });
        return;
    }
    setIsResetingPassword(true);
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        toast({ title: "Email Enviado!", description: "Verifique a sua caixa de entrada para redefinir a senha." });
        setIsResetDialogOpen(false);
    } catch (error: any) {
        handleFirebaseError(error, 'Erro no Reset');
    } finally {
        setIsResetingPassword(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-secondary/30">
      <div id="recaptcha-container"></div>
      <Header />
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="mx-auto max-w-sm w-full shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline font-bold">Aceder</CardTitle>
            <CardDescription>
              Entre na plataforma para aceder aos seus casos e investigações.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {apiError && (
              <Alert variant="destructive" className="mb-4 border-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="font-bold">Ação Necessária</AlertTitle>
                <AlertDescription className="text-xs">
                  {apiError}
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email" className="flex items-center gap-2"><Mail className="h-4 w-4"/>Email</TabsTrigger>
                    <TabsTrigger value="phone" className="flex items-center gap-2"><Phone className="h-4 w-4"/>Telemóvel</TabsTrigger>
                </TabsList>
                
                <TabsContent value="email" className="pt-4">
                     <Form {...emailForm}>
                        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="grid gap-4">
                            <FormField
                                control={emailForm.control}
                                name="email"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="exemplo@profundidade.ao" {...field} disabled={loading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={emailForm.control}
                                name="password"
                                render={({field}) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel>Palavra-passe</FormLabel>
                                            <Button 
                                                variant="link" 
                                                className="p-0 h-auto text-xs" 
                                                type="button"
                                                onClick={() => setIsResetDialogOpen(true)}
                                            >
                                                Esqueceu-se?
                                            </Button>
                                        </div>
                                        <FormControl>
                                            <Input type="password" {...field} disabled={loading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
                            </Button>
                        </form>
                    </Form>
                </TabsContent>

                <TabsContent value="phone" className="pt-4">
                    {!isCodeSent ? (
                        <Form {...phoneForm}>
                            <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="grid gap-4">
                                <FormField
                                    control={phoneForm.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Número de Telemóvel</FormLabel>
                                            <FormControl>
                                                <div className="flex gap-2">
                                                    <Badge variant="outline" className="h-10 px-3 flex items-center justify-center">+244</Badge>
                                                    <Input placeholder="9XX XXX XXX" {...field} disabled={loading} />
                                                </div>
                                            </FormControl>
                                            <FormDescription className="text-[10px]">
                                                Será enviado um SMS de confirmação.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : 'Enviar Código'}
                                </Button>
                            </form>
                        </Form>
                    ) : (
                        <Form {...codeForm}>
                            <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="grid gap-4">
                                <FormField
                                    control={codeForm.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Código de Verificação</FormLabel>
                                            <FormControl>
                                                <Input placeholder="123456" {...field} disabled={loading} className="text-center tracking-widest text-lg font-bold" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex flex-col gap-2">
                                    <Button type="submit" className="w-full" disabled={loading}>
                                        {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : 'Confirmar e Entrar'}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setIsCodeSent(false)} disabled={loading}>
                                        Alterar número
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </TabsContent>
            </Tabs>
           
            <div className="relative my-6">
              <Separator />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-background text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                Ou continuar com
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Image src="/google.svg" width={18} height={18} alt="Google icon" className="mr-2"/>}
              Google
            </Button>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Ainda não tem conta?{' '}
              <Link href="/signup" className="text-primary font-semibold hover:underline">
                Crie uma grátis
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary"/>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Introduza o seu e-mail para receber um link de redefinição.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reset-email">Email</Label>
            <Input 
                id="reset-email" 
                type="email" 
                placeholder="m@exemplo.ao" 
                value={resetEmail} 
                onChange={(e) => setResetEmail(e.target.value)} 
                className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsResetDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handlePasswordReset} disabled={isResetingPassword}>
                {isResetingPassword ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                Enviar Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
