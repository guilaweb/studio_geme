'use server';
/**
 * @fileOverview A flow to simulate running project automations.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

const AutomationInputSchema = z.object({
  config: z.object({
    trigger: z.string(),
    action: z.string(),
    destination: z.string().url(),
  }),
  projectId: z.string(),
});

const AutomationOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type AutomationInput = z.infer<typeof AutomationInputSchema>;
export type AutomationOutput = z.infer<typeof AutomationOutputSchema>;

// Helper function to get an authenticated Google Sheets client
async function getSheetsClient() {
    // Use the existing service account credentials
    const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
    if (!fs.existsSync(serviceAccountPath)) {
        throw new Error('Conta de serviço do Firebase não encontrada. Assegure-se que o ficheiro firebase-service-account.json existe na raiz do projeto.');
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: serviceAccountPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient as any });
}

// Helper function to fetch data based on the trigger
async function fetchDataForExport(trigger: string, projectId: string): Promise<any[][]> {
  const adminApp = getAdminApp();
  if (!adminApp) throw new Error('Admin SDK não inicializado.');
  const db = admin.firestore(adminApp);

  let headers: string[] = [];
  let data: any[][] = [];

  if (trigger === 'Exportar Custos') {
    headers = ['Data', 'Descrição', 'Valor', 'Conta', 'Atividade EAP'];
    const snapshot = await db.collection('projects').doc(projectId).collection('transactions').where('type', '==', 'Despesa').orderBy('date', 'desc').get();
    data = snapshot.docs.map(doc => {
      const t = doc.data();
      return [
        t.date?.toDate().toLocaleDateString('pt-AO') || '',
        t.description,
        t.amount,
        t.accountName || t.accountId,
        t.wbsItemName || ''
      ];
    });
  } else if (trigger === 'Exportar EAP') {
    headers = ['ID', 'Nome', 'Descrição', 'Orçamento', 'Progresso (%)'];
    const snapshot = await db.collection('projects').doc(projectId).collection('wbs').orderBy('name').get();
    data = snapshot.docs.map(doc => {
        const item = doc.data();
        return [
            doc.id,
            item.name,
            item.description || '',
            item.budget || 0,
            item.progress || 0,
        ];
    });
  }
  
  return [headers, ...data];
}

// New helper function to get overdue tasks and send notification
async function sendOverdueTasksNotification(): Promise<AutomationOutput> {
    const adminApp = getAdminApp();
    if (!adminApp) throw new Error("Admin SDK não inicializado.");
    const db = admin.firestore(adminApp);
    
    // 1. Get all projects that have a webhookUrl
    const projectsWithWebhooksQuery = db.collection('projects').where('webhookUrl', '!=', '');
    const projectsSnapshot = await projectsWithWebhooksQuery.get();
    
    if (projectsSnapshot.empty) {
        return { success: true, message: "Nenhum projeto com webhook configurado encontrado." };
    }
    
    let totalNotificationsSent = 0;
    let projectsWithOverdueTasks = 0;

    // 2. Iterate over each project
    for (const projectDoc of projectsSnapshot.docs) {
        const project = projectDoc.data();
        const projectId = projectDoc.id;
        const webhookUrl = project.webhookUrl;

        // 3. Find overdue tasks for the project
        const today = admin.firestore.Timestamp.now();
        const tasksQuery = db.collection('projects').doc(projectId).collection('wbs').where('endDate', '<', today).where('progress', '<', 100);
        const overdueTasksSnapshot = await tasksQuery.get();

        if (!overdueTasksSnapshot.empty) {
            projectsWithOverdueTasks++;
            const overdueTasks = overdueTasksSnapshot.docs.map(doc => doc.data());
            
            // 4. Send notification
            const message = {
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "themeColor": "E81123", // Red for alerts
                "summary": `${overdueTasks.length} tarefas estão atrasadas no projeto ${project.name}`,
                "sections": [{
                    "activityTitle": `**Alerta: ${overdueTasks.length} Tarefas Atrasadas no Projeto ${project.name}**`,
                    "facts": overdueTasks.slice(0, 10).map(task => ({ // Limit to 10 for brevity
                        "name": task.name,
                        "value": `Prazo: ${task.endDate.toDate().toLocaleDateString('pt-AO')}, Progresso: ${task.progress || 0}%`
                    })),
                    "markdown": true
                }]
            };
            
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message),
            });
            totalNotificationsSent++;
        }
    }
    
    if (projectsWithOverdueTasks === 0) {
        return { success: true, message: 'Nenhuma tarefa atrasada encontrada em todos os projetos.' };
    }

    return { success: true, message: `Notificações enviadas para ${totalNotificationsSent} projeto(s) com tarefas atrasadas.` };
}

async function sendMaintenanceAlertNotification(): Promise<AutomationOutput> {
    const adminApp = getAdminApp();
    if (!adminApp) throw new Error("Admin SDK não inicializado.");
    const db = admin.firestore(adminApp);

    // 1. Get all equipment with a defined maintenance interval
    const equipmentQuery = db.collection('equipment').where('maintenanceIntervalHours', '>', 0);
    const equipmentSnapshot = await equipmentQuery.get();

    if (equipmentSnapshot.empty) {
        return { success: true, message: "Nenhum equipamento com plano de manutenção configurado." };
    }

    let notificationsSent = 0;
    const projectsNotified = new Set<string>();

    for (const equipmentDoc of equipmentSnapshot.docs) {
        const eq = equipmentDoc.data();
        
        const hoursSinceLast = (eq.currentHours || 0) - (eq.lastMaintenanceHours || 0);
        const needsMaintenance = hoursSinceLast >= eq.maintenanceIntervalHours;

        if (needsMaintenance && eq.currentProjectId) {
            // Find project to get webhookUrl
            const projectRef = db.collection('projects').doc(eq.currentProjectId);
            const projectDoc = await projectRef.get();
            const project = projectDoc.data();

            if (project && project.webhookUrl) {
                const hoursOverdue = hoursSinceLast - eq.maintenanceIntervalHours;
                
                const message = {
                    "@type": "MessageCard",
                    "@context": "http://schema.org/extensions",
                    "themeColor": "FFC300", // Yellow for warning
                    "summary": `Alerta de Manutenção para ${eq.name}`,
                    "sections": [{
                        "activityTitle": `**Alerta de Manutenção: ${eq.name} no projeto ${project.name}**`,
                        "facts": [
                            { "name": "Equipamento", "value": eq.name },
                            { "name": "Horas Desde Última Manutenção", "value": `${hoursSinceLast.toFixed(0)}h` },
                            { "name": "Intervalo Programado", "value": `${eq.maintenanceIntervalHours}h` },
                            { "name": "Horas Atrasadas", "value": `${hoursOverdue.toFixed(0)}h` }
                        ],
                        "markdown": true
                    }]
                };

                await fetch(project.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(message),
                });
                
                if (!projectsNotified.has(eq.currentProjectId)) {
                    notificationsSent++;
                    projectsNotified.add(eq.currentProjectId);
                }
            }
        }
    }

    if (notificationsSent === 0) {
        return { success: true, message: 'Nenhum equipamento com manutenção atrasada encontrado.' };
    }

    return { success: true, message: `Alertas de manutenção enviados para ${notificationsSent} projeto(s).` };
}

async function sendWeeklyReportNotification(): Promise<AutomationOutput> {
    const adminApp = getAdminApp();
    if (!adminApp) throw new Error("Admin SDK não inicializado.");
    const db = admin.firestore(adminApp);
    
    // Get all projects with a webhookUrl
    const projectsWithWebhooksQuery = db.collection('projects').where('webhookUrl', '!=', '');
    const projectsSnapshot = await projectsWithWebhooksQuery.get();
    
    if (projectsSnapshot.empty) {
        return { success: true, message: "Nenhum projeto com webhook para relatórios configurado." };
    }
    
    let notificationsSent = 0;

    for (const projectDoc of projectsSnapshot.docs) {
        const project = projectDoc.data();
        const projectId = projectDoc.id;
        const webhookUrl = project.webhookUrl;

        // Fetch recent activities (last 7 days of daily reports)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const reportsQuery = db.collection('projects').doc(projectId).collection('daily-reports')
            .where('date', '>=', sevenDaysAgo)
            .orderBy('date', 'desc')
            .limit(3);
        const reportsSnapshot = await reportsQuery.get();
        const recentActivities = reportsSnapshot.docs.map(doc => doc.data().activities).join('; ');
        
        // Fetch financial summary
        const transactionsSnapshot = await db.collection('projects').doc(projectId).collection('transactions').get();
        const totalCost = transactionsSnapshot.docs
            .filter(doc => doc.data().type === 'Despesa')
            .reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

        // Format message
        const message = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": "0076D7", // Blue
            "summary": `Relatório Semanal do Projeto ${project.name}`,
            "sections": [{
                "activityTitle": `**Relatório Semanal: ${project.name}**`,
                "facts": [
                    { "name": "Progresso Geral", "value": `${(project.progress || 0).toFixed(1)}%` },
                    { "name": "Orçamento", "value": `${new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(project.budget || 0)}` },
                    { "name": "Custo Real", "value": `${new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(totalCost)}` },
                    { "name": "Atividades Recentes", "value": recentActivities || "Nenhuma atividade registada na última semana." }
                ],
                "markdown": true
            }],
            "potentialAction": [{
                "@type": "OpenUri",
                "name": "Ver Dashboard do Projeto",
                "targets": [{ "os": "default", "uri": `https://profundidade.app/projects/${projectId}` }]
            }]
        };

        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message),
            });
            notificationsSent++;
        } catch (e) {
            console.error(`Failed to send report for project ${projectId}:`, e);
        }
    }

    if (notificationsSent === 0) {
        return { success: true, message: 'Nenhum relatório enviado. Verifique as configurações de webhook.' };
    }

    return { success: true, message: `Relatórios semanais enviados para ${notificationsSent} projeto(s).` };
}

export async function runAutomationFlow(input: AutomationInput): Promise<AutomationOutput> {
    console.log('Running automation with config:', input.config);

    if (input.config.action === 'add_to_sheet') {
        try {
            const sheets = await getSheetsClient();
            const spreadsheetId = input.config.destination.split('/d/')[1].split('/')[0];
            
            const dataToExport = await fetchDataForExport(input.config.trigger, input.projectId);
            
            if (dataToExport.length <= 1) { // Only headers
                 return {
                    success: true,
                    message: 'Nenhum dado novo para exportar.',
                };
            }
            
            // Clear the sheet before appending new data to avoid duplicates
            try {
                await sheets.spreadsheets.values.clear({
                    spreadsheetId,
                    range: 'Sheet1', // Assumes default sheet name.
                });
            } catch (clearError) {
                console.warn("Could not clear sheet, may not exist or have permissions. Appending data.", clearError);
            }


            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'A1', // Appends after the last row with data
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: dataToExport,
                },
            });

            return {
                success: true,
                message: `Dados de "${input.config.trigger}" foram exportados com sucesso para a sua planilha.`,
            };

        } catch (error: any) {
             console.error("Automation flow error:", error);
             let errorMessage = error.message;
             if (error.code === 403) {
                 errorMessage = 'Acesso negado. Partilhe a sua Planilha Google com o email da conta de serviço (client_email no ficheiro firebase-service-account.json) e ative a API do Google Sheets no seu projeto Google Cloud.';
             } else if (error.code === 404) {
                  errorMessage = 'Planilha não encontrada. Verifique o URL de destino.';
             }
             return {
                success: false,
                message: `Falha na automação: ${errorMessage}`,
             }
        }
    } else if (input.config.action === 'send_overdue_tasks_notification') {
        try {
            // This action runs for all projects, so it ignores the input.projectId
            return await sendOverdueTasksNotification();
        } catch (error: any) {
            return { success: false, message: `Falha na automação: ${error.message}`};
        }
    } else if (input.config.action === 'send_maintenance_alert') {
        try {
            return await sendMaintenanceAlertNotification();
        } catch (error: any) {
            return { success: false, message: `Falha na automação: ${error.message}`};
        }
    } else if (input.config.action === 'send_report_email') {
        try {
            return await sendWeeklyReportNotification();
        } catch (error: any) {
            return { success: false, message: `Falha na automação: ${error.message}`};
        }
    }

    return {
        success: false,
        message: 'Ação de automação não reconhecida.',
    };
}
