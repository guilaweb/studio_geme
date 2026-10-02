import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const siteSchema = z.object({
  siteId: z.string().min(1, "Código do site é obrigatório"),
  name: z.string().min(1, "Nome do site é obrigatório"),
  type: z.enum(['Torre Greenfield', 'Rooftop', 'Poste / Monopolo', 'Indoor / Small Cell']),
  status: z.enum([
    'Planeado', 
    'Site Acquisition', 
    'Obra Civil', 
    'Instalação Telecom', 
    'Comissionamento', 
    'Ativo', 
    'Em Manutenção', 
    'Desativado'
  ]).default('Planeado'),
  progressPercent: z.number().min(0).max(100).optional(),
  towerHeightMeters: z.number().positive().optional(),
  operator: z.string().optional(),
  province: z.string().min(1, "Província é obrigatória"),
  municipality: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90, "Latitude inválida"),
  longitude: z.number().min(-180).max(180, "Longitude inválida"),
  altitudeMeters: z.number().optional(),
  powerType: z.enum([
    'Rede Pública (ENDE)', 
    'Gerador Diesel', 
    'Híbrido Solar-Diesel', 
    'Solar Fotovoltaico', 
    'Baterias / BESS'
  ]).optional(),
  targetOnAirDate: z.string().datetime().optional(),
  actualOnAirDate: z.string().datetime().optional(),
  equipments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum([
      'Antena RF', 
      'RRU', 
      'BBU', 
      'Micro-ondas (MW)', 
      'Roteador / Switch', 
      'Gerador', 
      'Retificador', 
      'Bateria', 
      'Climatização', 
      'Outro'
    ]),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    frequencyBand: z.string().optional(),
    heightMeters: z.number().optional(),
    azimuth: z.number().optional(),
    tilt: z.number().optional(),
    status: z.enum(['Operacional', 'Em Teste', 'Defeituoso', 'Desmontado']).default('Operacional'),
  })).optional(),
  notes: z.string().optional(),
  wbsItemId: z.string().nullable().optional(),
  wbsItemName: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const projectId = (await params).id;

  try {
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin SDK não inicializado.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(idToken);

    const snapshot = await adminDb.collection('projects').doc(projectId).collection('sites')
      .orderBy('createdAt', 'desc').get();

    const sites = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString() || null,
      targetOnAirDate: doc.data().targetOnAirDate?.toDate().toISOString() || null,
      actualOnAirDate: doc.data().actualOnAirDate?.toDate().toISOString() || null,
    }));

    return NextResponse.json({ sites }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao listar sites:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const projectId = (await params).id;

  try {
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin SDK não inicializado.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const body = await req.json();
    const validation = siteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const data = validation.data;
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const authorDisplayName = userDoc.exists ? userDoc.data()?.displayName : 'Utilizador';

    const newSiteData: Record<string, any> = {
      siteId: data.siteId,
      name: data.name,
      type: data.type,
      status: data.status,
      progressPercent: data.progressPercent ?? (data.status === 'Ativo' ? 100 : data.status === 'Planeado' ? 0 : 50),
      province: data.province,
      latitude: data.latitude,
      longitude: data.longitude,
      equipments: data.equipments || [],
      author: {
        uid: decodedToken.uid,
        displayName: authorDisplayName,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (data.towerHeightMeters) newSiteData.towerHeightMeters = data.towerHeightMeters;
    if (data.operator) newSiteData.operator = data.operator;
    if (data.municipality) newSiteData.municipality = data.municipality;
    if (data.address) newSiteData.address = data.address;
    if (data.altitudeMeters) newSiteData.altitudeMeters = data.altitudeMeters;
    if (data.powerType) newSiteData.powerType = data.powerType;
    if (data.targetOnAirDate) newSiteData.targetOnAirDate = admin.firestore.Timestamp.fromDate(new Date(data.targetOnAirDate));
    if (data.actualOnAirDate) newSiteData.actualOnAirDate = admin.firestore.Timestamp.fromDate(new Date(data.actualOnAirDate));
    if (data.notes) newSiteData.notes = data.notes;
    if (data.wbsItemId) newSiteData.wbsItemId = data.wbsItemId;
    if (data.wbsItemName) newSiteData.wbsItemName = data.wbsItemName;

    const docRef = await adminDb.collection('projects').doc(projectId).collection('sites').add(newSiteData);

    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar site de telecom:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
