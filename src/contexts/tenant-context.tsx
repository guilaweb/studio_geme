'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode, useCallback } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp, 
  getDocs 
} from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useFirebase } from '@/firebase';
import { 
  Organization, 
  OrganizationMember, 
  DEFAULT_ORGANIZATION, 
  DEFAULT_ORGANIZATION_ID 
} from '@/types/organization';

interface TenantContextType {
  activeOrganization: Organization | null;
  activeMembership: OrganizationMember | null;
  organizations: Organization[];
  memberships: OrganizationMember[];
  loading: boolean;
  switchOrganization: (organizationId: string) => Promise<void>;
  createOrganization: (data: Partial<Organization>) => Promise<Organization>;
  updateActiveOrganization: (data: Partial<Organization>) => Promise<void>;
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
  canAccessProject: (projectId: string) => boolean;
}

const TenantContext = createContext<TenantContextType>({
  activeOrganization: null,
  activeMembership: null,
  organizations: [],
  memberships: [],
  loading: true,
  switchOrganization: async () => {},
  createOrganization: async () => ({} as Organization),
  updateActiveOrganization: async () => {},
  isOrgAdmin: false,
  isSuperAdmin: false,
  canAccessProject: () => true,
});

const ACTIVE_TENANT_KEY = 'profundidade_active_tenant_id';

function setTenantCookie(tenantId: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `x-tenant-id=${tenantId}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { firestore } = useFirebase();

  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_TENANT_KEY) || DEFAULT_ORGANIZATION_ID;
    }
    return DEFAULT_ORGANIZATION_ID;
  });

  const [memberships, setMemberships] = useState<OrganizationMember[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Escuta membros da organização aos quais o utilizador pertence
  useEffect(() => {
    if (authLoading) return;

    if (!user || !user.uid || typeof user.uid !== 'string' || !user.uid.trim()) {
      setMemberships([]);
      setOrganizations([]);
      setLoading(false);
      return;
    }

    // Caso de Utilizador Demo Local
    if (user.uid === 'demo-user-master-id' || !firestore) {
      const demoOrg = DEFAULT_ORGANIZATION;
      const demoMembership: OrganizationMember = {
        id: `${DEFAULT_ORGANIZATION_ID}_${user.uid}`,
        organizationId: DEFAULT_ORGANIZATION_ID,
        userId: user.uid,
        email: user.email || 'demo@profundidade.ao',
        displayName: user.displayName || 'Gestor Demonstração',
        role: 'super-admin',
        projectAccessType: 'all',
        status: 'active',
      };
      setOrganizations([demoOrg]);
      setMemberships([demoMembership]);
      setActiveOrgId(DEFAULT_ORGANIZATION_ID);
      setTenantCookie(DEFAULT_ORGANIZATION_ID);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const membersRef = collection(firestore, 'organization_members');
      const q = query(membersRef, where('userId', '==', user.uid), where('status', '==', 'active'));

    const unsubscribeMembers = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Se o utilizador ainda não tem nenhuma associação a organização no Firestore:
        // Inicializa automaticamente associação à Organização Sede padrão
        try {
          const orgDocRef = doc(firestore, 'organizations', DEFAULT_ORGANIZATION_ID);
          const orgSnap = await getDoc(orgDocRef);
          if (!orgSnap.exists()) {
            await setDoc(orgDocRef, {
              ...DEFAULT_ORGANIZATION,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          const defaultMemberRef = doc(firestore, 'organization_members', `${DEFAULT_ORGANIZATION_ID}_${user.uid}`);
          const defaultMemberData: OrganizationMember = {
            id: `${DEFAULT_ORGANIZATION_ID}_${user.uid}`,
            organizationId: DEFAULT_ORGANIZATION_ID,
            userId: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'Membro',
            role: user.role === 'super-admin' ? 'super-admin' : 'admin',
            projectAccessType: 'all',
            status: 'active',
          };
          await setDoc(defaultMemberRef, {
            ...defaultMemberData,
            joinedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setMemberships([defaultMemberData]);
          setOrganizations([DEFAULT_ORGANIZATION]);
          setActiveOrgId(DEFAULT_ORGANIZATION_ID);
          setTenantCookie(DEFAULT_ORGANIZATION_ID);
          setLoading(false);
          return;
        } catch (err) {
          console.warn('Erro ao associar utilizador à organização padrão:', err);
          // Fallback gracioso para a organização padrão em memória
          setOrganizations([DEFAULT_ORGANIZATION]);
          setMemberships([{
            id: `${DEFAULT_ORGANIZATION_ID}_${user.uid}`,
            organizationId: DEFAULT_ORGANIZATION_ID,
            userId: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Utilizador',
            role: 'admin',
            projectAccessType: 'all',
            status: 'active',
          }]);
          setActiveOrgId(DEFAULT_ORGANIZATION_ID);
          setTenantCookie(DEFAULT_ORGANIZATION_ID);
          setLoading(false);
          return;
        }
      }

      const fetchedMemberships: OrganizationMember[] = [];
      const orgIds: string[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as OrganizationMember;
        fetchedMemberships.push({ ...data, id: docSnap.id });
        if (data.organizationId && !orgIds.includes(data.organizationId)) {
          orgIds.push(data.organizationId);
        }
      });

      setMemberships(fetchedMemberships);

      // Carregar os documentos de cada Organização
      try {
        const orgDocs = await Promise.all(
          orgIds.map(async (id) => {
            const orgSnap = await getDoc(doc(firestore, 'organizations', id));
            if (orgSnap.exists()) {
              return { ...(orgSnap.data() as Organization), id: orgSnap.id };
            }
            if (id === DEFAULT_ORGANIZATION_ID) {
              return DEFAULT_ORGANIZATION;
            }
            return null;
          })
        );

        const validOrgs = orgDocs.filter(Boolean) as Organization[];
        setOrganizations(validOrgs);

        // Se o activeOrgId guardado não estiver entre as organizações do utilizador, selecionar a primeira
        if (!validOrgs.some((o) => o.id === activeOrgId)) {
          const firstOrgId = validOrgs[0]?.id || DEFAULT_ORGANIZATION_ID;
          setActiveOrgId(firstOrgId);
          if (typeof window !== 'undefined') {
            localStorage.setItem(ACTIVE_TENANT_KEY, firstOrgId);
          }
          setTenantCookie(firstOrgId);
        }
      } catch (e) {
        console.error('Erro ao carregar organizações:', e);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.warn('Firestore snapshot error on organization_members:', error);
      // Fallback para não bloquear a experiência do utilizador
      setOrganizations([DEFAULT_ORGANIZATION]);
      setMemberships([{
        id: `${DEFAULT_ORGANIZATION_ID}_${user.uid}`,
        organizationId: DEFAULT_ORGANIZATION_ID,
        userId: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Utilizador',
        role: 'admin',
        projectAccessType: 'all',
        status: 'active',
      }]);
      setActiveOrgId(DEFAULT_ORGANIZATION_ID);
      setTenantCookie(DEFAULT_ORGANIZATION_ID);
      setLoading(false);
    });

    return () => unsubscribeMembers();
  } catch (queryErr) {
    console.warn('Erro ao configurar listener de membros da organização:', queryErr);
    setOrganizations([DEFAULT_ORGANIZATION]);
    setLoading(false);
  }
}, [user, authLoading, firestore]);

  // Sincronizar o activeOrgId com localStorage e Cookie
  const switchOrganization = useCallback(async (newOrgId: string) => {
    setActiveOrgId(newOrgId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_TENANT_KEY, newOrgId);
    }
    setTenantCookie(newOrgId);
  }, []);

  // Criar uma nova Organização (Tenant)
  const createOrganization = useCallback(async (data: Partial<Organization>): Promise<Organization> => {
    if (!user) throw new Error('Utilizador não autenticado');

    const newOrgId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newOrg: Organization = {
      id: newOrgId,
      legalName: data.legalName || 'Nova Empresa, Lda.',
      commercialName: data.commercialName || data.legalName || 'Nova Empresa',
      nif: data.nif || '',
      email: data.email || user.email || '',
      phone: data.phone || '',
      address: data.address || '',
      province: data.province || 'Luanda',
      municipality: data.municipality || 'Luanda',
      currency: 'AOA',
      timezone: 'Africa/Luanda',
      language: 'pt-AO',
      status: 'active',
      plan: 'starter',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...data,
    };

    if (firestore) {
      await setDoc(doc(firestore, 'organizations', newOrgId), newOrg);

      // Adicionar o utilizador criador como Admin da nova organização
      const memberDocId = `${newOrgId}_${user.uid}`;
      const newMember: OrganizationMember = {
        id: memberDocId,
        organizationId: newOrgId,
        userId: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Administrador',
        role: 'admin',
        projectAccessType: 'all',
        status: 'active',
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(firestore, 'organization_members', memberDocId), newMember);
    }

    setOrganizations((prev) => [...prev, newOrg]);
    await switchOrganization(newOrgId);
    return newOrg;
  }, [user, firestore, switchOrganization]);

  // Actualizar dados da organização activa
  const updateActiveOrganization = useCallback(async (data: Partial<Organization>) => {
    if (!activeOrgId) return;
    if (firestore) {
      const orgRef = doc(firestore, 'organizations', activeOrgId);
      await updateDoc(orgRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    }
    setOrganizations((prev) =>
      prev.map((org) => (org.id === activeOrgId ? { ...org, ...data } : org))
    );
  }, [activeOrgId, firestore]);

  // Organização e Membro activos actuais
  const activeOrganization = useMemo(() => {
    if (!organizations.length) return DEFAULT_ORGANIZATION;
    const found = organizations.find((o) => o.id === activeOrgId);
    return found || organizations[0] || DEFAULT_ORGANIZATION;
  }, [organizations, activeOrgId]);

  const activeMembership = useMemo(() => {
    if (!memberships.length) return null;
    return memberships.find((m) => m.organizationId === activeOrganization?.id) || memberships[0] || null;
  }, [memberships, activeOrganization]);

  const isSuperAdmin = user?.role === 'super-admin' || activeMembership?.role === 'super-admin';
  const isOrgAdmin = isSuperAdmin || activeMembership?.role === 'admin' || activeMembership?.role === 'director';

  const canAccessProject = useCallback((projectId: string): boolean => {
    if (isSuperAdmin || isOrgAdmin) return true;
    if (!activeMembership) return true;
    if (activeMembership.projectAccessType === 'all') return true;
    if (activeMembership.assignedProjectIds && activeMembership.assignedProjectIds.includes(projectId)) {
      return true;
    }
    return false;
  }, [isSuperAdmin, isOrgAdmin, activeMembership]);

  const value = useMemo<TenantContextType>(() => ({
    activeOrganization,
    activeMembership,
    organizations,
    memberships,
    loading,
    switchOrganization,
    createOrganization,
    updateActiveOrganization,
    isOrgAdmin,
    isSuperAdmin,
    canAccessProject,
  }), [
    activeOrganization,
    activeMembership,
    organizations,
    memberships,
    loading,
    switchOrganization,
    createOrganization,
    updateActiveOrganization,
    isOrgAdmin,
    isSuperAdmin,
    canAccessProject,
  ]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
