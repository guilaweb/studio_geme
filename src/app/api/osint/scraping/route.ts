import { NextRequest, NextResponse } from "next/server";
import {
  INITIAL_SCRAPE_JOBS,
  INITIAL_SCRAPE_RESULTS,
  INITIAL_WEBSITE_SNAPSHOT,
  evaluateComplianceGate,
} from "@/lib/osint-advanced-engine";
import { ScrapeJob } from "@/lib/osint-advanced-types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (jobId) {
    const job = INITIAL_SCRAPE_JOBS.find((j) => j.id === jobId);
    const results = INITIAL_SCRAPE_RESULTS.filter((r) => r.jobId === jobId);
    return NextResponse.json({
      job: job || null,
      results,
      snapshot: INITIAL_WEBSITE_SNAPSHOT,
    });
  }

  return NextResponse.json({
    jobs: INITIAL_SCRAPE_JOBS,
    results: INITIAL_SCRAPE_RESULTS,
    snapshot: INITIAL_WEBSITE_SNAPSHOT,
  });
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get("x-tenant-id") || "org-profundidade-lab";
    const body = await req.json();

    const {
      targetUrl,
      objective,
      crawlType = "SITE",
      maxDepth = 2,
      maxPages = 100,
      respectRobots = true,
      verifyTosFirst = true,
      rateLimitSafe = true,
      investigationId = "CASO-2026-001",
    } = body;

    if (!targetUrl) {
      return NextResponse.json(
        { error: "targetUrl é obrigatório para iniciar um coletor de scraping." },
        { status: 400 }
      );
    }

    // Validação pelo Compliance Gate Central
    const compliance = evaluateComplianceGate(
      targetUrl,
      respectRobots,
      verifyTosFirst,
      rateLimitSafe
    );

    if (compliance.decision === "BLOCK") {
      return NextResponse.json(
        {
          success: false,
          blocked: true,
          message: "Coleta bloqueada pelo Compliance Gate do PROFUNDIDADE.",
          compliance,
        },
        { status: 403 }
      );
    }

    const newJob: ScrapeJob = {
      id: `SCR-${Date.now().toString().slice(-5)}`,
      tenantId,
      investigationId,
      targetUrl,
      objective: objective || "Coleta e indexação passiva de conteúdos públicos autorizados.",
      crawlType,
      maxDepth,
      maxPages,
      requestIntervalMs: 1500,
      respectRobots,
      verifyTosFirst,
      rateLimitSafe,
      status: "EM_EXECUCAO",
      progressPercentage: 15,
      pagesDiscovered: 12,
      pagesProcessed: 2,
      errorCount: 0,
      evidencesCount: 2,
      lastDiscoveredUrls: [targetUrl],
      startedAt: new Date().toISOString(),
      complianceDecision: compliance.decision,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Coletor de Scraping instanciado com sucesso.",
        job: newJob,
        compliance,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao processar criação do coletor: " + error.message },
      { status: 500 }
    );
  }
}
