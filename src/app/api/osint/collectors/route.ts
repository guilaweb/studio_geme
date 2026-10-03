import { NextRequest, NextResponse } from "next/server";
import { INITIAL_COLLECTOR_JOBS, OSINT_SOURCES_CATALOG } from "@/lib/osint-engine";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id") || "org-profundidade-lab";
  return NextResponse.json({
    tenant_id: tenantId,
    total_jobs: INITIAL_COLLECTOR_JOBS.length,
    collectors_catalog: OSINT_SOURCES_CATALOG,
    jobs: INITIAL_COLLECTOR_JOBS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get("x-tenant-id") || "org-profundidade-lab";
    const body = await req.json();

    const { connector, target, investigationId } = body;

    if (!connector || !target) {
      return NextResponse.json(
        { error: "connector e target são obrigatórios para disparar um coletor." },
        { status: 400 }
      );
    }

    const newJob = {
      id: `job-col-${Date.now()}`,
      tenantId,
      investigationId: investigationId || "CASO-2026-001",
      connector,
      target,
      requestedBy: "API Client / Investigador",
      startedAt: new Date().toISOString(),
      status: "EXECUTANDO",
      resultsCount: 0,
      logSummary: "Sessão assíncrona iniciada. Tarefa enviada para a fila de background workers.",
    };

    return NextResponse.json(
      {
        success: true,
        message: "Job de coleta assíncrona disparado com sucesso.",
        job: newJob,
      },
      { status: 202 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao disparar coletor assíncrono: " + error.message },
      { status: 500 }
    );
  }
}
