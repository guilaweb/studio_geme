'use server';

import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const leadSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  email: z.string().email('Endereço de email inválido'),
  phone: z.string().optional(),
  message: z.string().min(10, 'A mensagem deve ter pelo menos 10 caracteres.'),
});

export async function createLeadFromPublicForm(formData: FormData) {
    const adminApp = getAdminApp();
    if (!adminApp) {
        return { success: false, message: 'Configuração do servidor em falta.' };
    }
    const adminDb = admin.firestore(adminApp);
    
    const rawData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        message: formData.get('message'),
    };

    const validation = leadSchema.safeParse(rawData);

    if (!validation.success) {
        return { 
            success: false, 
            message: 'Dados inválidos.', 
            errors: validation.error.flatten().fieldErrors 
        };
    }
    
    try {
        await adminDb.collection('leads').add({
            name: validation.data.name,
            email: validation.data.email,
            phone: validation.data.phone || '',
            message: validation.data.message,
            source: 'Formulário de Contacto',
            status: 'Novo',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            author: {
                uid: 'public_form',
                displayName: 'Site Público',
            }
        });
        
        revalidatePath('/crm');
        return { success: true, message: 'A sua mensagem foi enviada com sucesso!' };
    } catch (error) {
        console.error("Error creating lead from public form: ", error);
        return { success: false, message: 'Ocorreu um erro ao enviar a sua mensagem.' };
    }
}

export async function createLeadFromLandingDemo(data: {
    name: string;
    email: string;
    company: string;
    phone?: string;
    industry?: string;
    message?: string;
}) {
    const adminApp = getAdminApp();
    if (!adminApp) {
        return { success: false, message: 'Configuração do servidor indisponível.' };
    }
    const adminDb = admin.firestore(adminApp);

    if (!data.name || !data.email) {
        return { success: false, message: 'Nome e email corporativo são obrigatórios.' };
    }

    try {
        await adminDb.collection('leads').add({
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            company: data.company || '',
            industry: data.industry || 'Geral',
            message: data.message || `Pedido de Demonstração Executiva - Empresa: ${data.company || 'N/A'} - Setor: ${data.industry || 'Geral'}`,
            source: 'Demonstração Executiva Landing Page',
            status: 'Novo',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            author: {
                uid: 'public_landing',
                displayName: 'Demonstração Executiva',
            }
        });

        revalidatePath('/crm');
        return { success: true, message: 'Demonstração agendada com sucesso! Um engenheiro especialista entrará em contacto.' };
    } catch (error) {
        console.error("Error creating demo lead: ", error);
        return { success: false, message: 'Falha ao agendar demonstração. Tente novamente.' };
    }
}

export async function createLeadFromBottomCta(email: string) {
    const adminApp = getAdminApp();
    if (!adminApp) {
        return { success: false, message: 'Configuração do servidor indisponível.' };
    }
    const adminDb = admin.firestore(adminApp);

    if (!email || !email.includes('@')) {
        return { success: false, message: 'Insira um e-mail corporativo válido.' };
    }

    try {
        await adminDb.collection('leads').add({
            name: email.split('@')[0],
            email: email,
            phone: '',
            message: 'Contato solicitado via banner final de engenharia especializada.',
            source: 'Banner CTA Landing Page',
            status: 'Novo',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            author: {
                uid: 'public_landing_cta',
                displayName: 'CTA Final Landing',
            }
        });

        revalidatePath('/crm');
        return { success: true, message: 'Solicitação recebida! Um engenheiro entrará em contacto nas próximas horas.' };
    } catch (error) {
        console.error("Error creating bottom CTA lead: ", error);
        return { success: false, message: 'Falha ao enviar solicitação.' };
    }
}

