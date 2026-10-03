import { NextRequest, NextResponse } from "next/server";
import {
  INITIAL_DORK_TEMPLATES,
  validateDorkQuery,
} from "@/lib/osint-advanced-engine";

export async function GET() {
  return NextResponse.json({
    templates: INITIAL_DORK_TEMPLATES,
    ethicalNotice:
      "O PROFUNDIDADE restringe Dorks estritamente à descoberta de fontes e documentos públicos. Consultas para recolha de credenciais, chaves ou intrusão são automaticamente bloqueadas.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      engine = "Google",
      domain = "",
      term = "",
      inurl = "",
      filetype = "",
      dateRange = "",
      rawQuery = "",
    } = body;

    let queryText = rawQuery.trim();

    // Se construído via wizard
    if (!queryText) {
      const parts: string[] = [];
      if (domain.trim()) parts.push(`site:${domain.trim()}`);
      if (inurl.trim()) parts.push(`inurl:${inurl.trim()}`);
      if (filetype.trim()) parts.push(`filetype:${filetype.trim()}`);
      if (term.trim()) parts.push(`"${term.trim()}"`);
      queryText = parts.join(" ");
    }

    if (!queryText) {
      return NextResponse.json(
        { error: "Nenhum parâmetro ou consulta fornecida para o construtor de Dork." },
        { status: 400 }
      );
    }

    // Validação ética
    const ethicalCheck = validateDorkQuery(queryText);

    if (!ethicalCheck.isAllowed) {
      return NextResponse.json(
        {
          success: false,
          isEthicallyApproved: false,
          blockedReason: ethicalCheck.reason,
          queryText,
        },
        { status: 422 }
      );
    }

    const queryRecord = {
      id: `dork-${Date.now()}`,
      queryText,
      engine,
      domain: domain || undefined,
      term: term || undefined,
      inurl: inurl || undefined,
      filetype: filetype || undefined,
      dateRange: dateRange || undefined,
      executedAt: new Date().toISOString(),
      resultsCount: 14,
      isEthicallyApproved: true,
      operatorsUsed: queryText.split(" ").filter((w: string) => w.includes(":")),
    };

    return NextResponse.json({
      success: true,
      data: queryRecord,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao processar consulta de Dork: " + error.message },
      { status: 500 }
    );
  }
}
