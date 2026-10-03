import { NextRequest, NextResponse } from "next/server";
import {
  detectIdentityInputType,
  INITIAL_PHONE_RECORDS,
  INITIAL_SOCIAL_PROFILES,
  INITIAL_IDENTITY_GRAPH_NODES,
  INITIAL_IDENTITY_GRAPH_EDGES,
  INITIAL_ENTITY_CANDIDATES,
  INITIAL_IDENTITY_SOURCES,
  INITIAL_IDENTITY_SEARCH_HISTORY,
} from "@/lib/identity-resolution-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const type = searchParams.get("type") || "";

    if (query) {
      const detected = detectIdentityInputType(query);
      return NextResponse.json({
        query,
        detectedType: detected,
        phones: INITIAL_PHONE_RECORDS,
        profiles: INITIAL_SOCIAL_PROFILES,
        candidates: INITIAL_ENTITY_CANDIDATES,
        sources: INITIAL_IDENTITY_SOURCES,
      });
    }

    return NextResponse.json({
      phones: INITIAL_PHONE_RECORDS,
      profiles: INITIAL_SOCIAL_PROFILES,
      graph: {
        nodes: INITIAL_IDENTITY_GRAPH_NODES,
        edges: INITIAL_IDENTITY_GRAPH_EDGES,
      },
      candidates: INITIAL_ENTITY_CANDIDATES,
      sources: INITIAL_IDENTITY_SOURCES,
      history: INITIAL_IDENTITY_SEARCH_HISTORY,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro interno no motor de resolução de identidade." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, action, edgeId, newState, validatorName } = body;

    if (action === "DETECT") {
      const detectedType = detectIdentityInputType(query || "");
      return NextResponse.json({ query, detectedType });
    }

    if (action === "UPDATE_EDGE") {
      // Retorna sucesso de atualização de estado no grafo
      return NextResponse.json({
        success: true,
        edgeId,
        newState,
        validatorName: validatorName || "Perito Responsável",
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, message: "Operação de identidade processada." });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao processar solicitação de identidade." },
      { status: 500 }
    );
  }
}
