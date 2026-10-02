
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { createLeadFromPublicForm } from '@/actions/crm';
import Link from 'next/link';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  phone: z.string().optional(),
  message: z.string().min(10, { message: 'A mensagem deve ter pelo menos 10 caracteres.' }),
});

export default function ContactPage() {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: '', email: '', phone: '', message: '' },
    });

    const { isSubmitting } = form.formState;

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('email', values.email);
        if (values.phone) formData.append('phone', values.phone);
        formData.append('message', values.message);

        const result = await createLeadFromPublicForm(formData);

        if (result.success) {
            toast({
                title: 'Sucesso!',
                description: result.message,
            });
            form.reset();
        } else {
            toast({
                title: 'Erro ao enviar mensagem',
                description: result.message,
                variant: 'destructive',
            });
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="container mx-auto flex-1 py-16 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-bold font-headline">Agende uma Demonstração Técnica</h1>
                        <p className="mt-2 text-muted-foreground">Fale com os nossos especialistas para compreender como a Profundidade assegura a integridade da custódia probatória, acelera a análise de casos complexos e garante conformidade pericial. Preencha o formulário para agendamento confidencial.</p>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome Completo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Seu nome" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="seu.email@exemplo.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefone (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="+244 9XX XXX XXX" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sua Mensagem</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Descreva as suas necessidades ou o seu projeto..." className="min-h-[150px]" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isSubmitting} className="w-full">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Pedir Demonstração
                            </Button>
                        </form>
                    </Form>
                </div>
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
