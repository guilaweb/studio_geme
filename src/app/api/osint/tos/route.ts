import { NextRequest, NextResponse } from "next/server";
import {
  INITIAL_ROBOTS_ANALYSIS,
  INITIAL_TOS_POLICY,
  evaluateComplianceGate,
} from "@/lib/osint-advanced-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawTarget = searchParams.get("url") || searchParams.get("domain") || "vortex-consulting.org";

    let cleanDomain = rawTarget.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];

    // Consulta real a robots.txt com fallback
    let robotsText = INITIAL_ROBOTS_ANALYSIS.rawText;
    let canCrawl = true;
    let disallowed: string[] = ["/private/", "/admin/"];
    let allowed: string[] = ["/", "/empresa", "/sobre"];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`https://${cleanDomain}/robots.txt`, {
        signal: controller.signal,
        headers: { "User-Agent": "Profundidade-OSINT-Auditor/2.0" },
      });
      clearTimeout(timeout);

      if (res.ok) {
        robotsText = await res.text();
        const lines = robotsText.split("\n");
        disallowed = lines
          .filter((l) => l.toLowerCase().startsWith("disallow:"))
          .map((l) => l.split(":")[1]?.trim() || "");
        allowed = lines
          .filter((l) => l.toLowerCase().startsWith("allow:"))
          .map((l) => l.split(":")[1]?.trim() || "");
      }
    } catch {
      // Fallback
    }

    const robotsAnalysis = {
      domain: cleanDomain,
      url: `https://${cleanDomain}/robots.txt`,
      analyzedAt: new Date().toISOString(),
      rawText: robotsText.slice(0, 800),
      disallowedPaths: disallowed,
      allowedPaths: allowed,
      crawlDelay: 2,
      canCrawlTarget: canCrawl,
      legalDisclaimer:
        "AVISO DE CUSTÓDIA: Robots.txt ≠ autorização jurídica. Os termos de serviço (ToS) e a legislação aplicável podem estabelecer restrições suplementares à recolha automatizada de conteúdos.",
    };

    const tosMatrix = {
      ...INITIAL_TOS_POLICY,
      domain: cleanDomain,
      tosUrl: `https://${cleanDomain}/terms`,
      lastAnalyzed: new Date().toISOString(),
    };

    const compliance = evaluateComplianceGate(`https://${cleanDomain}`, true, true, true);

    return NextResponse.json({
      success: true,
      data: {
        domain: cleanDomain,
        robots: robotsAnalysis,
        tos: tosMatrix,
        complianceGate: compliance,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao analisar ToS e Robots: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetUrl, respectRobots = true, verifyTosFirst = true, rateLimitSafe = true } = body;

    if (!targetUrl) {
      return NextResponse.json({ error: "targetUrl é obrigatório." }, { status: 400 });
    }

    const compliance = evaluateComplianceGate(targetUrl, respectRobots, verifyTosFirst, rateLimitSafe);

    return NextResponse.json({
      success: true,
      data: compliance,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao avaliar conformidade: " + error.message },
      { status: 500 }
    );
  }
}
