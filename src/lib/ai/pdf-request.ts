import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { isAiConfigured } from "./client";

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Fluxo comum das rotas de importação de PDF: exige login, valida o arquivo,
 * chama `extract` com o PDF em base64 e devolve o JSON extraído.
 */
export async function handlePdfImport(
  request: NextRequest,
  logLabel: string,
  extract: (pdfBase64: string) => Promise<unknown>,
): Promise<NextResponse> {
  await requireUser();

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "A leitura por IA ainda não está configurada." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
  }
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return NextResponse.json(
      { error: "Apenas arquivos PDF são aceitos." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "O PDF deve ter no máximo 15 MB." },
      { status: 400 },
    );
  }

  try {
    const pdfBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    return NextResponse.json(await extract(pdfBase64));
  } catch (error) {
    console.error(`[${logLabel}]`, error);
    return NextResponse.json(
      { error: "Não foi possível ler o PDF. Tente outro arquivo." },
      { status: 502 },
    );
  }
}
