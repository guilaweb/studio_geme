'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useRedirectIfAuthenticated } from '@/hooks/use-auth';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(1, { message: 'A senha é obrigatória.' }),
});

export default function ClientPortalPage() {
  useRedirectIfAuthenticated('client');
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // Redirection is handled by useRedirectIfAuthenticated
    } catch (error) {
      console.error('Client Portal Login Error:', error);
      toast({
        title: 'Erro de Login',
        description: 'As credenciais estão incorretas ou você não tem permissão de cliente.',
        variant: 'destructive',
      });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-secondary/50">
      <Header />
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="mx-auto max-w-sm w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Portal do Cliente</CardTitle>
            <CardDescription>
              Aceda à área restrita para visualizar o progresso do seu projeto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="o.seu@email.com"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <div className="flex items-center">
                        <FormLabel>Senha</FormLabel>
                      </div>
                      <FormControl>
                        <Input type="password" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? 'A entrar...' : 'Entrar'}
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center text-sm">
                <Link href="/" className="underline">
                    Voltar à página inicial
                </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
