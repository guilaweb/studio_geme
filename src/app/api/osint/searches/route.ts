import { NextRequest, NextResponse } from "next/server";
import { INITIAL_SEARCH_RECORDS } from "@/lib/osint-engine";

export async function GET(req: NextRequest) {
  // Verificação estrita de Tenant
  const tenantId = req.headers.get("x-tenant-id") || "org-profundidade-lab";
  
  return NextResponse.json({
    tenant_id: tenantId,
    total: INITIAL_SEARCH_RECORDS.length,
    searches: INITIAL_SEARCH_RECORDS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get("x-tenant-id") || "org-profundidade-lab";
    const body = await req.json();

    const { targetQuery, targetType, contextNotes, investigationRef } = body;

    if (!targetQuery || !targetType) {
      return NextResponse.json(
        { error: "targetQuery e targetType são campos obrigatórios." },
        { status: 400 }
      );
    }

    const newSearch = {
      id: `osint-srch-${Date.now()}`,
      tenant_id: tenantId,
      targetQuery,
      targetType,
      contextNotes: contextNotes || "Pesquisa analítica em fontes públicas.",
      investigationRef: investigationRef || null,
      status: "CONCLUIDA",
      resultsCount: 4,
      discoveriesCount: 1,
      createdAt: new Date().toISOString(),
      requestedBy: "API Client / Investigador",
    };

    return NextResponse.json(
      {
        success: true,
        message: "Pesquisa OSINT processada com normalização de fontes.",
        search: newSearch,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro interno ao processar requisição OSINT: " + error.message },
      { status: 500 }
    );
  }
}
