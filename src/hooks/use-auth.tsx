'use client';

import { useState, useEffect, createContext, useContext, type ReactNode, useRef } from 'react';
import { type User, onIdTokenChanged, updateProfile } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { type UserRoleType } from '@/types/user-roles';

export interface AppUser extends User {
  role?: UserRoleType;
  plan?: string;
  status?: 'Activo' | 'Convidado' | 'Pendente' | 'Suspenso' | 'Inactivo';
  department?: string;
  accessProfile?: string;
  assignedProjects?: Array<{
    projectId: string;
    projectTitle?: string;
    projectRole?: string;
    responsibility?: string;
    assignedAt?: string;
  }>;
  requestsToday?: number;
  lastRequestDate?: string;
  jobTitle?: string;
  company?: string;
  professionalRegNumber?: string;
  province?: string;
  digitalSignatureUrl?: string;
  defaultViewMode?: 'field_operation' | 'cost_engineer' | 'executive_cockpit' | 'full_engineering';
  preferredTheme?: 'light' | 'dark' | 'system';
  notifications?: {
    emailAlerts?: boolean;
    costDeviationAlerts?: boolean;
    hseqAlerts?: boolean;
    dailyReportReminders?: boolean;
    measurementApprovals?: boolean;
  };
}

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  idToken: string | null;
  loginAsDemoUser: (role?: UserRoleType) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  idToken: null,
  loginAsDemoUser: () => {},
  logout: async () => {},
});

const DEMO_USER_KEY = 'profundidade_demo_user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);
  const lastUserJson = useRef<string | null>(null);

  // Demo user handlers
  const loginAsDemoUser = (role: UserRoleType = 'super-admin') => {
    const demoUser: AppUser = {
      uid: 'demo-user-master-id',
      email: 'demo@profundidade.ao',
      displayName: 'Gestor Demonstração (Local)',
      role: role,
      plan: 'enterprise',
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: 'demo-token',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => 'demo-token',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: '+244900000000',
      photoURL: null,
      providerId: 'demo',
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    }
    setUser(demoUser);
    setIdToken('demo-id-token');
    setLoading(false);
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DEMO_USER_KEY);
    }
    if (auth) {
      try {
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
      } catch (e) {
        console.warn('Firebase signOut error or offline:', e);
      }
    }
    setUser(null);
    setIdToken(null);
  };

  const createUserDocument = async (firebaseUser: User) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    try {
      await setDoc(userDocRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utilizador',
        role: 'user',
        plan: 'hobby',
        requestsToday: 0,
        lastRequestDate: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error creating user document:", error);
    }
  };

  useEffect(() => {
    // Check local demo user first
    if (typeof window !== 'undefined') {
      const cachedDemo = localStorage.getItem(DEMO_USER_KEY);
      if (cachedDemo) {
        try {
          const parsed = JSON.parse(cachedDemo);
          if (parsed && typeof parsed.uid === 'string' && parsed.uid.trim()) {
            setUser({
              ...parsed,
              getIdToken: async () => 'demo-token',
            });
            setIdToken('demo-id-token');
            setLoading(false);
            return;
          } else {
            localStorage.removeItem(DEMO_USER_KEY);
          }
        } catch (e) {
          localStorage.removeItem(DEMO_USER_KEY);
        }
      }
    }

    if (!auth || !firestore) {
      setLoading(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.uid) {
        const token = await firebaseUser.getIdToken();
        setIdToken(token);
        
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const unsubSnapshot = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.status === 'Suspenso' || userData.status === 'Inactivo') {
              console.warn(`A conta do utilizador ${firebaseUser.uid} encontra-se ${userData.status}. Acesso bloqueado.`);
              logout();
              if (typeof window !== 'undefined') {
                window.location.href = '/login?error=account_suspended';
              }
              return;
            }

            const finalUser = { ...firebaseUser, ...userData } as AppUser;
            const userJson = JSON.stringify({
                uid: finalUser.uid,
                role: finalUser.role,
                status: finalUser.status,
                accessProfile: finalUser.accessProfile,
                department: finalUser.department,
                plan: finalUser.plan,
                displayName: finalUser.displayName,
                email: finalUser.email,
                phoneNumber: finalUser.phoneNumber,
                jobTitle: finalUser.jobTitle,
                company: finalUser.company,
                professionalRegNumber: finalUser.professionalRegNumber,
                province: finalUser.province,
                digitalSignatureUrl: finalUser.digitalSignatureUrl ? 'present' : 'none',
                defaultViewMode: finalUser.defaultViewMode,
                preferredTheme: finalUser.preferredTheme,
                notifications: finalUser.notifications,
            });

            if (userJson !== lastUserJson.current) {
              lastUserJson.current = userJson;
              setUser(finalUser);
            }
          } else {
            createUserDocument(firebaseUser);
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore user doc snapshot error:", error);
          setUser(firebaseUser as AppUser);
          setLoading(false);
        });

        return () => unsubSnapshot();
      } else {
        // If not logged in and not in demo mode
        if (typeof window !== 'undefined' && localStorage.getItem(DEMO_USER_KEY)) {
          return;
        }
        setUser(null);
        setIdToken(null);
        lastUserJson.current = null;
        setLoading(false);
      }
    });
      
    return () => unsubscribe();
  }, [auth, firestore]);

  return (
    <AuthContext.Provider value={{ user, loading, idToken, loginAsDemoUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const useRequireAuth = (allowedRolesOrRedirectUrl?: string[] | string) => {
  const { user, loading, idToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const redirectUrl = typeof allowedRolesOrRedirectUrl === 'string' ? allowedRolesOrRedirectUrl : '/login';
  const allowedRoles = Array.isArray(allowedRolesOrRedirectUrl) ? allowedRolesOrRedirectUrl : null;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push(redirectUrl);
      return;
    }

    if (allowedRoles && user.role && !allowedRoles.includes(user.role)) {
      toast({
        title: 'Acesso Negado',
        description: 'Não tem permissão para aceder a esta página.',
        variant: 'destructive',
      });
      router.push('/dashboard');
    }
  }, [user, loading, router, redirectUrl, allowedRoles, toast]);

  return { user, loading, idToken };
};

export const useRedirectIfAuthenticated = (intendedFor: 'user' | 'client' | 'any' = 'user') => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;

        if (user) {
            const isAuthPage = pathname === '/login' || pathname === '/signup';
            const isPortalLoginPage = pathname === '/portal';

            if (user.role === 'cliente') {
                if (isAuthPage || isPortalLoginPage || intendedFor === 'user') {
                     router.push('/portal/dashboard');
                }
            } else {
                if (isAuthPage || isPortalLoginPage || intendedFor === 'client') {
                    const redirectUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') || '/investigacao' : '/investigacao';
                    router.push(redirectUrl);
                }
            }
        }
    }, [user, loading, router, pathname, intendedFor]);

    return { user, loading };
}
