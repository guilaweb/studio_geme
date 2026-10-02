import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const adminApp = getAdminApp();
let adminDb: admin.firestore.Firestore | undefined;

if (adminApp) {
    adminDb = admin.firestore(adminApp);
}

const supplierSubmissionSchema = z.object({
    supplierName: z.string().min(1),
    contactPerson: z.string().min(1),
    phoneNumber: z.string().min(1),
    paymentTerms: z.string().min(1),
    proposalValidityDays: z.number().positive(),
    items: z.array(z.object({
        itemId: z.string(),
        itemName: z.string(),
        quantity: z.number().positive(),
        unit: z.string(),
        unitPriceAOA: z.number().positive(),
        deliveryTimeDays: z.number().nonnegative(),
        brandOrOrigin: z.string().optional(),
        notes: z.string().optional(),
    })),
    totalQuotationAOA: z.number().positive(),
});

const supervisionSubmissionSchema = z.object({
    measurementId: z.string().min(1),
    reviewerName: z.string().min(1),
    decision: z.enum(['aprovado', 'aprovado_com_reservas', 'rejeitado']),
    technicalNotes: z.string().min(1),
    recommendedDeductionAOA: z.number().nonnegative().optional(),
});

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    try {
        if (!adminDb) {
            throw new Error('Firebase Admin SDK não inicializado.');
        }

        const tokenDoc = await adminDb.collection('extranet-tokens').doc(token).get();
        if (!tokenDoc.exists) {
            return NextResponse.json({ error: 'Token de acesso inválido ou expirado.' }, { status: 404 });
        }

        const tokenData = tokenDoc.data()!;
        const now = new Date();
        const expiry = tokenData.expiresAt?.toDate ? tokenData.expiresAt.toDate() : new Date(tokenData.expiresAt);

        if (tokenData.isRevoked || expiry < now) {
            return NextResponse.json({ error: 'Este link de acesso expirou ou foi revogado por motivos de segurança.' }, { status: 403 });
        }

        // Atualizar timestamp de último acesso
        await tokenDoc.ref.update({ lastAccessedAt: admin.firestore.FieldValue.serverTimestamp() });

        return NextResponse.json({
            valid: true,
            tokenData: {
                token,
                role: tokenData.role,
                projectName: tokenData.projectName,
                projectId: tokenData.projectId,
                recipientName: tokenData.recipientName,
                referenceId: tokenData.referenceId,
                expiresAt: expiry,
                payload: tokenData.payload || null
            }
        });
    } catch (error: any) {
        console.error('Erro na validação do token de extranet:', error);
        return NextResponse.json({ error: 'Erro ao validar link de acesso.' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    try {
        if (!adminDb) {
            throw new Error('Firebase Admin SDK não inicializado.');
        }

        const tokenDoc = await adminDb.collection('extranet-tokens').doc(token).get();
        if (!tokenDoc.exists) {
            return NextResponse.json({ error: 'Token inválido.' }, { status: 404 });
        }

        const tokenData = tokenDoc.data()!;
        const body = await req.json();

        if (tokenData.role === 'fornecedor') {
            const validation = supplierSubmissionSchema.safeParse(body);
            if (!validation.success) {
                return NextResponse.json({ error: 'Dados de cotação incompletos.', details: validation.error.flatten() }, { status: 400 });
            }

            const submissionData = {
                token,
                projectId: tokenData.projectId,
                requestId: tokenData.referenceId,
                ...validation.data,
                submittedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            await adminDb.collection('projects').doc(tokenData.projectId).collection('supplier-quotations').add(submissionData);

            // Marcar token como concluído
            await tokenDoc.ref.update({ isRevoked: true });

            return NextResponse.json({ success: true, message: 'Cotação enviada com sucesso ao mapa comparativo da obra.' }, { status: 201 });
        }

        if (tokenData.role === 'fiscalizacao') {
            const validation = supervisionSubmissionSchema.safeParse(body);
            if (!validation.success) {
                return NextResponse.json({ error: 'Parecer da fiscalização incompleto.', details: validation.error.flatten() }, { status: 400 });
            }

            const reviewData = {
                token,
                projectId: tokenData.projectId,
                ...validation.data,
                reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            await adminDb.collection('projects').doc(tokenData.projectId).collection('supervision-reviews').add(reviewData);

            // Atualizar status do auto de medição se existir
            if (validation.data.measurementId) {
                const newStatus = validation.data.decision === 'aprovado' ? 'approved' : validation.data.decision === 'rejeitado' ? 'disputed' : 'submitted';
                await adminDb.collection('projects').doc(tokenData.projectId).collection('measurement-certificates').doc(validation.data.measurementId).update({
                    status: newStatus,
                    supervisionNotes: validation.data.technicalNotes,
                    updatedAt: new Date().toISOString()
                });
            }

            return NextResponse.json({ success: true, message: 'Parecer técnico registado e auto de medição atualizado.' }, { status: 200 });
        }

        return NextResponse.json({ error: 'Ação não suportada para este perfil.' }, { status: 400 });
    } catch (error: any) {
        console.error('Erro na submissão da extranet:', error);
        return NextResponse.json({ error: 'Erro interno ao submeter dados.' }, { status: 500 });
    }
}
