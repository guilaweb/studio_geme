'use client';

import { initializeFirebase } from '@/firebase';
import { GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

/**
 * @fileOverview This file provides a transition layer for code that still imports 
 * from '@/lib/firebase'. It uses the centralized initialization from '@/firebase'.
 */

const services = initializeFirebase();

export const app = services.firebaseApp;
export const auth = services.auth;
export const db = services.firestore;
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

export { RecaptchaVerifier, signInWithPhoneNumber };
