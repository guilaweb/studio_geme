import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  writeBatch, 
  query, 
  where,
  serverTimestamp,
  getDoc 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_ORGANIZATION_ID, DEFAULT_ORGANIZATION, OrganizationMember } from '@/types/organization';

export interface MigrationSummary {
  success: boolean;
  migratedUsers: number;
  migratedProjects: number;
  migratedEquipment: number;
  migratedClients: number;
  migratedContracts: number;
  migratedWorkforce: number;
  logs: string[];
}

/**
 * Script de Migração Idempotente para Arquitectura Multi-Tenant.
 * Assegura que toda a base de dados existente é associada à Organização Sede
 * sem qualquer perda de dados ou bloqueio de utilizadores.
 */
export async function runTenantMigration(): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    success: true,
    migratedUsers: 0,
    migratedProjects: 0,
    migratedEquipment: 0,
    migratedClients: 0,
    migratedContracts: 0,
    migratedWorkforce: 0,
    logs: [],
  };

  try {
    summary.logs.push('Iniciando migração de dados para multi-tenancy...');

    // 1. Criar/Garantir a Organização Sede padrão
    const orgRef = doc(db, 'organizations', DEFAULT_ORGANIZATION_ID);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) {
      await setDoc(orgRef, {
        ...DEFAULT_ORGANIZATION,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      summary.logs.push(`Organização sede [${DEFAULT_ORGANIZATION.commercialName}] criada com sucesso.`);
    } else {
      summary.logs.push(`Organização sede [${DEFAULT_ORGANIZATION_ID}] já existe.`);
    }

    // 2. Associar todos os utilizadores existentes como Membros da Organização Sede
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const uDoc of usersSnap.docs) {
        const uData = uDoc.data();
        const memberId = `${DEFAULT_ORGANIZATION_ID}_${uDoc.id}`;
        const memberRef = doc(db, 'organization_members', memberId);
        const memberSnap = await getDoc(memberRef);

        if (!memberSnap.exists()) {
          const isSuper = uData.role === 'super-admin';
          const memberData: OrganizationMember = {
            id: memberId,
            organizationId: DEFAULT_ORGANIZATION_ID,
            userId: uDoc.id,
            email: uData.email || '',
            displayName: uData.displayName || uData.email?.split('@')[0] || 'Utilizador',
            role: isSuper ? 'super-admin' : 'admin',
            projectAccessType: 'all',
            status: 'active',
            joinedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(memberRef, memberData);
          summary.migratedUsers++;
        }
      }
      summary.logs.push(`Membros associados à organização sede: ${summary.migratedUsers}`);
    } catch (e: any) {
      summary.logs.push(`Aviso na migração de utilizadores: ${e.message}`);
    }

    // 3. Migrar Projetos sem organizationId
    try {
      const projectsSnap = await getDocs(collection(db, 'projects'));
      for (const pDoc of projectsSnap.docs) {
        const data = pDoc.data();
        if (!data.organizationId) {
          await updateDoc(doc(db, 'projects', pDoc.id), {
            organizationId: DEFAULT_ORGANIZATION_ID,
          });
          summary.migratedProjects++;
        }
      }
      summary.logs.push(`Projetos migrados com organizationId: ${summary.migratedProjects}`);
    } catch (e: any) {
      summary.logs.push(`Aviso na migração de projetos: ${e.message}`);
    }

    // 4. Migrar Equipamentos Globais sem organizationId
    try {
      const eqSnap = await getDocs(collection(db, 'equipment'));
      for (const eqDoc of eqSnap.docs) {
        const data = eqDoc.data();
        if (!data.organizationId) {
          await updateDoc(doc(db, 'equipment', eqDoc.id), {
            organizationId: DEFAULT_ORGANIZATION_ID,
          });
          summary.migratedEquipment++;
        }
      }
      summary.logs.push(`Equipamentos migrados com organizationId: ${summary.migratedEquipment}`);
    } catch (e: any) {
      summary.logs.push(`Aviso na migração de equipamentos: ${e.message}`);
    }

    // 5. Migrar Clientes da Empresa sem organizationId
    try {
      const clientsSnap = await getDocs(collection(db, 'company_clients'));
      for (const cDoc of clientsSnap.docs) {
        const data = cDoc.data();
        if (!data.organizationId) {
          await updateDoc(doc(db, 'company_clients', cDoc.id), {
            organizationId: DEFAULT_ORGANIZATION_ID,
          });
          summary.migratedClients++;
        }
      }
      summary.logs.push(`Clientes migrados com organizationId: ${summary.migratedClients}`);
    } catch (e: any) {
      summary.logs.push(`Aviso na migração de clientes: ${e.message}`);
    }

    // 6. Migrar Contratos da Empresa sem organizationId
    try {
      const contractsSnap = await getDocs(collection(db, 'company_contracts'));
      for (const ctrDoc of contractsSnap.docs) {
        const data = ctrDoc.data();
        if (!data.organizationId) {
          await updateDoc(doc(db, 'company_contracts', ctrDoc.id), {
            organizationId: DEFAULT_ORGANIZATION_ID,
          });
          summary.migratedContracts++;
        }
      }
      summary.logs.push(`Contratos migrados com organizationId: ${summary.migratedContracts}`);
    } catch (e: any) {
      summary.logs.push(`Aviso na migração de contratos: ${e.message}`);
    }

    // 7. Migrar Quadro de Pessoal (Workforce) sem organizationId
    try {
      const wfSnap = await getDocs(collection(db, 'workforce'));
      for (const wfDoc of wfSnap.docs) {
        const data = wfDoc.data();
        if (!data.organizationId) {
          await updateDoc(doc(db, 'workforce', wfDoc.id), {
            organizationId: DEFAULT_ORGANIZATION_ID,
          });
          summary.migratedWorkforce++;
        }
      }
      summary.logs.push(`Quadro de pessoal migrado com organizationId: ${summary.migratedWorkforce}`);
    } catch (e: any) {
      summary.logs.push(`Aviso na migração de quadro de pessoal: ${e.message}`);
    }

    summary.logs.push('Migração multi-tenant concluída com sucesso!');
    return summary;
  } catch (err: any) {
    summary.success = false;
    summary.logs.push(`Falha crítica na migração: ${err.message}`);
    return summary;
  }
}
