import { NextRequest } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export interface ServerHrUser {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  profileId: string;
  department: string;
  jobTitle: string;
  assignedProjects: Array<{ projectId: string; projectRole?: string; responsibility?: string }>;
  isAdmin: boolean;
  isHrManager: boolean;
  isDirector: boolean;
  isManager: boolean;
  isCollaborator: boolean;
}

export async function verifyServerHrAuth(req: NextRequest): Promise<ServerHrUser | null> {
  const adminApp = getAdminApp();
  if (!adminApp) return null;
  const adminAuth = admin.auth(adminApp);
  const adminDb = getAdminDb() || admin.firestore(adminApp);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data() || {};

    const role = (userData.role || '').toLowerCase();
    const profileId = (userData.accessProfile || userData.profileId || '').toLowerCase();
    const department = userData.department || '';

    const isAdmin = 
      role === 'super-admin' || 
      role === 'admin' || 
      profileId === 'admin';

    const isHrManager = 
      isAdmin || 
      userData.role === 'Gestor de RH' || 
      profileId === 'hr_manager' || 
      department === 'Recursos Humanos';

    const isDirector = 
      isAdmin || 
      profileId === 'director' || 
      role === 'diretor' || 
      role === 'director' || 
      department === 'Direcção';

    const hasAssignedProjectsAsManager = (userData.assignedProjects || []).some(
      (p: any) => p.projectRole === 'Gestor' || p.responsibility === 'Responsável pelo Projecto'
    );

    const isManager = 
      isAdmin || 
      isHrManager || 
      isDirector || 
      profileId === 'project_manager' || 
      hasAssignedProjectsAsManager;

    return {
      uid: decodedToken.uid,
      email: decodedToken.email || userData.email || '',
      displayName: userData.displayName || decodedToken.name || 'Colaborador',
      role: userData.role || 'user',
      profileId: userData.profileId || userData.accessProfile || 'collaborator',
      department,
      jobTitle: userData.jobTitle || 'Colaborador',
      assignedProjects: userData.assignedProjects || [],
      isAdmin,
      isHrManager,
      isDirector,
      isManager,
      isCollaborator: true,
    };
  } catch (err) {
    console.error('Error verifying HR auth token:', err);
    return null;
  }
}
