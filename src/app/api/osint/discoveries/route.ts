import { NextRequest, NextResponse } from "next/server";
import { INITIAL_OSINT_DISCOVERIES } from "@/lib/osint-engine";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id") || "org-profundidade-lab";
  return NextResponse.json({
    tenant_id: tenantId,
    total: INITIAL_OSINT_DISCOVERIES.length,
    discoveries: INITIAL_OSINT_DISCOVERIES,
  });
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get("x-tenant-id") || "org-profundidade-lab";
    const body = await req.json();

    const { title, description, type, sources, evidences, validatedBy } = body;

    if (!title || !type) {
      return NextResponse.json(
        { error: "title e type são obrigatórios para registrar uma descoberta." },
        { status: 400 }
      );
    }

    const newDiscovery = {
      id: `disc-${Date.now()}`,
      tenant_id: tenantId,
      title,
      description: description || "Constatação técnica fundamentada em fontes públicas.",
      type,
      sources: sources || ["Motor OSINT"],
      evidences: evidences || [],
      validationStatus: "VALIDADO",
      createdAt: new Date().toISOString(),
      validatedBy: validatedBy || "Perito Humano (API)",
    };

    return NextResponse.json(
      {
        success: true,
        message: "Descoberta registrada com sucesso no dossiê de inteligência.",
        discovery: newDiscovery,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao registrar descoberta: " + error.message },
      { status: 500 }
    );
  }
}
