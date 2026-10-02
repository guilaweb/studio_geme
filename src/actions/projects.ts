
'use server';

import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { revalidatePath } from 'next/cache';

const adminApp = getAdminApp();
if (!adminApp) {
  throw new Error('Firebase Admin SDK not initialized.');
}
const adminDb = admin.firestore(adminApp);

// A helper function to recursively delete a collection
async function deleteCollection(collectionPath: string, batchSize: number) {
  const collectionRef = adminDb.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve, reject);
  });
}

async function deleteQueryBatch(query: admin.firestore.Query, resolve: (value: unknown) => void, reject: (reason?: any) => void) {
  const snapshot = await query.get();

  if (snapshot.size === 0) {
    // When there are no documents left, we are done
    resolve(true);
    return;
  }

  // Delete documents in a batch
  const batch = adminDb.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid hitting stack limits
  process.nextTick(() => {
    deleteQueryBatch(query, resolve, reject);
  });
}


export async function deleteProject(projectId: string) {
    if (!projectId) {
        return { success: false, message: 'Project ID is required.' };
    }

    try {
        const subcollections = [
            'wbs', 'transactions', 'documents', 'annotations', 'team',
            'daily-reports', 'incidents', 'audits', 'quality-control',
            'risks', 'changeRequests', 'requirements', 'meetingMinutes',
            'transmittals', 'clientMessages', 'suppliers', 'purchaseRequests',
            'quotes', 'purchaseOrders', 'supplierInvoices', 'inventory',
            'equipment', 'insurancePolicies', 'licenses', 'contracts',
            'contractAmendments', 'axes', 'topoPoints',
            // Added for completeness
            'concessions', 'production-logs', 'energy-logs', 'sites',
            'inspections', 'warranties', 'customerQuotes', 'rfis'
        ];

        for (const sub of subcollections) {
            // Also need to delete sub-subcollections like comments, movements, etc.
            if (sub === 'annotations' || sub === 'incidents') {
                 const parentDocs = await adminDb.collection('projects').doc(projectId).collection(sub).get();
                 for (const doc of parentDocs.docs) {
                     await deleteCollection(`projects/${projectId}/${sub}/${doc.id}/comments`, 100);
                 }
            }
             if (sub === 'inventory' || sub === 'equipment') {
                 const parentDocs = await adminDb.collection('projects').doc(projectId).collection(sub).get();
                 for (const doc of parentDocs.docs) {
                     const subSub = sub === 'inventory' ? 'movements' : 'usageLogs';
                     await deleteCollection(`projects/${projectId}/${sub}/${doc.id}/${subSub}`, 100);
                 }
            }
            await deleteCollection(`projects/${projectId}/${sub}`, 100);
        }
        
        // Finally, delete the project document itself
        await adminDb.collection('projects').doc(projectId).delete();

        // Invalidate the cache for the dashboard page
        revalidatePath('/dashboard');

        return { success: true, message: 'Projeto e todos os seus dados foram eliminados com sucesso.' };

    } catch (error: any) {
        console.error('Error deleting project:', error);
        return { success: false, message: error.message || 'Ocorreu um erro ao eliminar o projeto.' };
    }
}
