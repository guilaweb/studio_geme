"use client";

import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  OsintSearchRecord,
  OsintResult,
  OsintDiscovery,
} from "@/lib/osint-types";
import {
  ScrapeJob,
  ScrapeResult,
} from "@/lib/osint-advanced-types";
import {
  PhoneIdentityRecord,
  IdentityGraphEdge,
  SocialProfileRecord,
  IdentitySourceRecord,
} from "@/lib/identity-resolution-types";
import {
  INITIAL_SEARCH_RECORDS,
  INITIAL_OSINT_RESULTS,
  INITIAL_OSINT_DISCOVERIES,
} from "@/lib/osint-engine";
import {
  INITIAL_SCRAPE_JOBS,
  INITIAL_SCRAPE_RESULTS,
} from "@/lib/osint-advanced-engine";
import {
  INITIAL_PHONE_RECORDS,
  INITIAL_SOCIAL_PROFILES,
  INITIAL_IDENTITY_GRAPH_EDGES,
  INITIAL_IDENTITY_SOURCES,
} from "@/lib/identity-resolution-engine";

// ========================================================
// 1. PESQUISAS OSINT (FIRESTORE)
// ========================================================

export function subscribeToOsintSearches(
  callback: (searches: OsintSearchRecord[]) => void
) {
  try {
    const coll = collection(db, "osint_searches");
    const q = query(coll, orderBy("createdAt", "desc"));

    return onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          // Inicializa a coleção na primeira execução
          for (const s of INITIAL_SEARCH_RECORDS) {
            await setDoc(doc(db, "osint_searches", s.id), s);
          }
          callback(INITIAL_SEARCH_RECORDS);
        } else {
          const list = snapshot.docs.map((d) => d.data() as OsintSearchRecord);
          callback(list);
        }
      },
      (error) => {
        console.warn("Firestore osint_searches offline fallback:", error);
        callback(INITIAL_SEARCH_RECORDS);
      }
    );
  } catch (e) {
    console.warn("Fallback offline osint_searches:", e);
    callback(INITIAL_SEARCH_RECORDS);
    return () => {};
  }
}

export async function saveOsintSearch(search: OsintSearchRecord) {
  try {
    await setDoc(doc(db, "osint_searches", search.id), search);
  } catch (e) {
    console.error("Erro ao salvar pesquisa OSINT no banco:", e);
  }
}

// ========================================================
// 2. RESULTADOS NORMALIZADOS & EVIDÊNCIAS
// ========================================================

export function subscribeToOsintResults(
  callback: (results: OsintResult[]) => void
) {
  try {
    const coll = collection(db, "osint_results");
    const q = query(coll, orderBy("collectedAt", "desc"));

    return onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          for (const r of INITIAL_OSINT_RESULTS) {
            await setDoc(doc(db, "osint_results", r.id), r);
          }
          callback(INITIAL_OSINT_RESULTS);
        } else {
          const list = snapshot.docs.map((d) => d.data() as OsintResult);
          callback(list);
        }
      },
      (error) => {
        console.warn("Firestore osint_results offline fallback:", error);
        callback(INITIAL_OSINT_RESULTS);
      }
    );
  } catch (e) {
    console.warn("Fallback offline osint_results:", e);
    callback(INITIAL_OSINT_RESULTS);
    return () => {};
  }
}

export async function saveOsintResult(res: OsintResult) {
  try {
    await setDoc(doc(db, "osint_results", res.id), res);
  } catch (e) {
    console.error("Erro ao salvar resultado no banco:", e);
  }
}

// ========================================================
// 3. DESCOBERTAS FORMAIS (DISCOVERIES)
// ========================================================

export function subscribeToOsintDiscoveries(
  callback: (discoveries: OsintDiscovery[]) => void
) {
  try {
    const coll = collection(db, "osint_discoveries");
    return onSnapshot(
      coll,
      async (snapshot) => {
        if (snapshot.empty) {
          for (const d of INITIAL_OSINT_DISCOVERIES) {
            await setDoc(doc(db, "osint_discoveries", d.id), d);
          }
          callback(INITIAL_OSINT_DISCOVERIES);
        } else {
          const list = snapshot.docs.map((d) => d.data() as OsintDiscovery);
          callback(list);
        }
      },
      (error) => {
        console.warn("Firestore osint_discoveries fallback:", error);
        callback(INITIAL_OSINT_DISCOVERIES);
      }
    );
  } catch (e) {
    callback(INITIAL_OSINT_DISCOVERIES);
    return () => {};
  }
}

export async function saveOsintDiscovery(disc: OsintDiscovery) {
  try {
    await setDoc(doc(db, "osint_discoveries", disc.id), disc);
  } catch (e) {
    console.error("Erro ao salvar descoberta no banco:", e);
  }
}

// ========================================================
// 4. JOBS DE SCRAPING
// ========================================================

export function subscribeToScrapeJobs(
  callback: (jobs: ScrapeJob[]) => void
) {
  try {
    const coll = collection(db, "osint_scrape_jobs");
    return onSnapshot(
      coll,
      async (snapshot) => {
        if (snapshot.empty) {
          for (const j of INITIAL_SCRAPE_JOBS) {
            await setDoc(doc(db, "osint_scrape_jobs", j.id), j);
          }
          callback(INITIAL_SCRAPE_JOBS);
        } else {
          const list = snapshot.docs.map((d) => d.data() as ScrapeJob);
          callback(list);
        }
      },
      (error) => {
        console.warn("Firestore osint_scrape_jobs fallback:", error);
        callback(INITIAL_SCRAPE_JOBS);
      }
    );
  } catch (e) {
    callback(INITIAL_SCRAPE_JOBS);
    return () => {};
  }
}

export async function saveScrapeJob(job: ScrapeJob) {
  try {
    await setDoc(doc(db, "osint_scrape_jobs", job.id), job);
  } catch (e) {
    console.error("Erro ao salvar job de scraping no banco:", e);
  }
}

// ========================================================
// 5. IDENTIDADE DIGITAL & ARESTAS DO GRAFO
// ========================================================

export function subscribeToPhoneRecords(
  callback: (phones: PhoneIdentityRecord[]) => void
) {
  try {
    const coll = collection(db, "osint_phone_records");
    return onSnapshot(
      coll,
      async (snapshot) => {
        if (snapshot.empty) {
          for (const p of INITIAL_PHONE_RECORDS) {
            const cleanId = p.phoneNumber.replace(/\s+/g, "_").replace(/\+/g, "plus_");
            await setDoc(doc(db, "osint_phone_records", cleanId), p);
          }
          callback(INITIAL_PHONE_RECORDS);
        } else {
          const list = snapshot.docs.map((d) => d.data() as PhoneIdentityRecord);
          callback(list);
        }
      },
      (error) => {
        console.warn("Firestore osint_phone_records fallback:", error);
        callback(INITIAL_PHONE_RECORDS);
      }
    );
  } catch (e) {
    callback(INITIAL_PHONE_RECORDS);
    return () => {};
  }
}

export function subscribeToIdentityGraphEdges(
  callback: (edges: IdentityGraphEdge[]) => void
) {
  try {
    const coll = collection(db, "osint_identity_edges");
    return onSnapshot(
      coll,
      async (snapshot) => {
        if (snapshot.empty) {
          for (const e of INITIAL_IDENTITY_GRAPH_EDGES) {
            await setDoc(doc(db, "osint_identity_edges", e.id), e);
          }
          callback(INITIAL_IDENTITY_GRAPH_EDGES);
        } else {
          const list = snapshot.docs.map((d) => d.data() as IdentityGraphEdge);
          callback(list);
        }
      },
      (error) => {
        console.warn("Firestore osint_identity_edges fallback:", error);
        callback(INITIAL_IDENTITY_GRAPH_EDGES);
      }
    );
  } catch (e) {
    callback(INITIAL_IDENTITY_GRAPH_EDGES);
    return () => {};
  }
}

export async function updateIdentityGraphEdgeDoc(
  edgeId: string,
  updates: Partial<IdentityGraphEdge>
) {
  try {
    const ref = doc(db, "osint_identity_edges", edgeId);
    await updateDoc(ref, updates);
  } catch (e) {
    console.error("Erro ao atualizar aresta no banco:", e);
  }
}
