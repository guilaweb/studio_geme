
import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

/**
 * @fileOverview Firebase Admin SDK initialization.
 * 
 * Securely initializes the Admin SDK using either an environment variable 
 * (FIREBASE_SERVICE_ACCOUNT) or a local JSON file (for development only).
 */

if (!admin.apps.length) {
  try {
    let serviceAccount: any = null;

    // 1. Try to get credentials from environment variable (Best for Production/CI)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env var as JSON');
      }
    } 
    
    // 2. Fallback to local file (Useful for local development, excluded via .gitignore)
    if (!serviceAccount) {
      const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
      if (fs.existsSync(serviceAccountPath)) {
        const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
        // Only parse if it looks like a real JSON service account
        if (fileContent.includes('"project_id"')) {
           serviceAccount = JSON.parse(fileContent);
        }
      }
    }

    if (serviceAccount) {
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`;

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: bucketName
      });
      console.log('Firebase Admin initialized with service account.');
    } else {
      // 3. Fallback: initialize with projectId from environment or config
      const fallbackProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-6533808029-72cdc';
      admin.initializeApp({
        projectId: fallbackProjectId,
      });
      console.log('Firebase Admin initialized with fallback projectId:', fallbackProjectId);
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }
}

import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

const adminApp = admin.apps.length > 0 && admin.apps[0] ? admin.apps[0] : undefined;

function getAdminApp(): admin.app.App | undefined {
  return adminApp;
}

function getAdminDb(): admin.firestore.Firestore | undefined {
  if (!adminApp) return undefined;
  const databaseId = process.env.FIRESTORE_DATABASE_ID || 'profundidadedboasis';
  return getAdminFirestore(adminApp, databaseId);
}

export { getAdminApp, getAdminDb };
