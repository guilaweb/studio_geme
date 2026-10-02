import { NextRequest } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { DEFAULT_ORGANIZATION_ID, DEFAULT_ORGANIZATION, Organization, OrganizationMember } from '@/types/organization';

export interface AuthenticatedTenantContext {
  uid: string;
  email?: string;
  tenantId: string;
  membership?: OrganizationMember;
  organization?: Organization;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
}

export async function getAuthenticatedTenant(req: NextRequest): Promise<AuthenticatedTenantContext> {
  const adminApp = getAdminApp();
  if (!adminApp) {
    throw new Error('Firebase Admin not initialized.');
  }

  const adminAuth = admin.auth(adminApp);
  const adminDb = getAdminDb();
  if (!adminDb) {
    throw new Error('Firebase Admin DB not initialized.');
  }

  // 1. Verificar Token JWT Bearer
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  let idToken: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    idToken = authHeader.split('Bearer ')[1];
  }

  if (!idToken) {
    throw new Error('Unauthorized: Ausência de token de autenticação.');
  }

  const decodedToken = await adminAuth.verifyIdToken(idToken);
  const uid = decodedToken.uid;
  const email = decodedToken.email;

  // 2. Extrair Tenant ID de cabeçalho ou cookie
  let tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/x-tenant-id=([^;]+)/);
    if (match) {
      tenantId = decodeURIComponent(match[1]);
    }
  }

  if (!tenantId) {
    tenantId = DEFAULT_ORGANIZATION_ID;
  }

  // 3. Verificar Perfil do Utilizador (para determinar Super Admin)
  let isSuperAdmin = false;
  try {
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (userDoc.exists && userDoc.data()?.role === 'super-admin') {
      isSuperAdmin = true;
    }
  } catch (e) {
    console.warn('Could not verify super-admin from users collection:', e);
  }

  // 4. Se for Super Admin, permitir acesso a qualquer tenant
  if (isSuperAdmin) {
    let orgData: Organization = DEFAULT_ORGANIZATION;
    try {
      const orgSnap = await adminDb.collection('organizations').doc(tenantId).get();
      if (orgSnap.exists) {
        orgData = orgSnap.data() as Organization;
      }
    } catch {}

    return {
      uid,
      email,
      tenantId,
      organization: orgData,
      isSuperAdmin: true,
      isOrgAdmin: true,
    };
  }

  // 5. Verificar Pertença ao Tenant na colecção organization_members
  const memberDocId = `${tenantId}_${uid}`;
  const memberDoc = await adminDb.collection('organization_members').doc(memberDocId).get();

  if (!memberDoc.exists) {
    // Se o tenant for a organização padrão e não houver registo, auto-provisionar membro inicial
    if (tenantId === DEFAULT_ORGANIZATION_ID) {
      const defaultMember: OrganizationMember = {
        id: memberDocId,
        organizationId: DEFAULT_ORGANIZATION_ID,
        userId: uid,
        email: email || '',
        displayName: decodedToken.name || email?.split('@')[0] || 'Utilizador',
        role: 'admin',
        projectAccessType: 'all',
        status: 'active',
      };
      await adminDb.collection('organization_members').doc(memberDocId).set(defaultMember);
      return {
        uid,
        email,
        tenantId,
        membership: defaultMember,
        organization: DEFAULT_ORGANIZATION,
        isSuperAdmin: false,
        isOrgAdmin: true,
      };
    }

    throw new Error(`Forbidden: O utilizador não tem permissão para aceder à organização ${tenantId}.`);
  }

  const membership = memberDoc.data() as OrganizationMember;
  if (membership.status !== 'active') {
    throw new Error('Forbidden: A sua conta nesta organização encontra-se inativa ou suspensa.');
  }

  const isOrgAdmin = membership.role === 'admin' || membership.role === 'director' || membership.role === 'super-admin';

  let orgData: Organization = DEFAULT_ORGANIZATION;
  try {
    const orgSnap = await adminDb.collection('organizations').doc(tenantId).get();
    if (orgSnap.exists) {
      orgData = orgSnap.data() as Organization;
    }
  } catch {}

  return {
    uid,
    email,
    tenantId,
    membership,
    organization: orgData,
    isSuperAdmin,
    isOrgAdmin,
  };
}
