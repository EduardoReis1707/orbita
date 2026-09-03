import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { isAiConfigured } from "./client";
import type { InputImage } from "./extract";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const IMAGE_TYPES: Record<string, InputImage["mediaType"]> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};

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

/**
 * Fluxo comum das rotas de estimativa por foto: exige login, valida as
 * imagens (1 a 3), chama `estimate` e devolve o JSON estimado.
 */
export async function handleImageEstimate(
  request: NextRequest,
  logLabel: string,
  estimate: (images: InputImage[]) => Promise<unknown>,
): Promise<NextResponse> {
  await requireUser();

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "A estimativa por foto ainda não está configurada." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "Envie ao menos uma foto." }, { status: 400 });
  }
  if (files.length > 3) {
    return NextResponse.json({ error: "Máximo de 3 fotos." }, { status: 400 });
  }

  const images: InputImage[] = [];
  for (const file of files) {
    const mediaType = IMAGE_TYPES[file.type];
    if (!mediaType) {
      return NextResponse.json(
        { error: "Formato de imagem não suportado (use JPG, PNG ou WebP)." },
        { status: 400 },
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Cada foto deve ter no máximo 8 MB." },
        { status: 400 },
      );
    }
    images.push({
      base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      mediaType,
    });
  }

  try {
    return NextResponse.json(await estimate(images));
  } catch (error) {
    console.error(`[${logLabel}]`, error);
    return NextResponse.json(
      { error: "Não foi possível analisar a foto. Tente outra imagem." },
      { status: 502 },
    );
  }
}
