import type { Schema } from "@google/genai";

import { AI_MODEL, createAiClient } from "./client";

/** Parte de conteúdo enviada ao Gemini: texto ou dado binário embutido. */
type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type StructuredParams = {
  content: Part[];
  system: string;
  toolName: string;
  toolDescription: string;
  /** JSON Schema do resultado (com `required` e, se objeto, `properties`). */
  schema: Record<string, unknown>;
  maxTokens?: number;
};

type JsonSchema = Record<string, unknown>;

/**
 * Converte um JSON Schema (estilo Anthropic tool, com `type: ["x", "null"]` e
 * `additionalProperties`) para o formato de `responseSchema` / `parameters` do
 * Gemini (`nullable: true`, tipos em maiúsculas, sem `additionalProperties`).
 * Também usado por `assistant-tools.ts` para declarar as ferramentas do chat.
 */
export function toGeminiSchema(schema: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  const rawType = schema.type;
  let type: string | undefined;
  if (Array.isArray(rawType)) {
    type = rawType.find((entry) => entry !== "null") as string | undefined;
    if (rawType.includes("null")) out.nullable = true;
  } else if (typeof rawType === "string") {
    type = rawType;
  }
  if (type) out.type = type.toUpperCase();

  if (typeof schema.description === "string") {
    out.description = schema.description;
  }
  if (Array.isArray(schema.enum)) {
    out.enum = schema.enum;
    out.format = "enum";
  }
  if (schema.properties && typeof schema.properties === "object") {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      schema.properties as Record<string, JsonSchema>,
    )) {
      props[key] = toGeminiSchema(value);
    }
    out.properties = props;
    out.propertyOrdering = Object.keys(props);
  }
  if (Array.isArray(schema.required)) {
    out.required = schema.required;
  }
  if (schema.items && typeof schema.items === "object") {
    out.items = toGeminiSchema(schema.items as JsonSchema);
  }

  return out;
}

/**
 * Envia partes de conteúdo (texto, PDF, imagens) ao Gemini e recebe de volta um
 * objeto que valida contra `schema`, via saída JSON estruturada.
 */
export async function extractStructured<T>(
  params: StructuredParams,
): Promise<T> {
  const client = createAiClient();

  const response = await client.models.generateContent({
    model: AI_MODEL,
    contents: [{ role: "user", parts: params.content }],
    config: {
      systemInstruction: `${params.system}\n\n${params.toolDescription}`,
      temperature: 0,
      maxOutputTokens: params.maxTokens ?? 8000,
      // Sem "pensamento": a saída é só o JSON, mais rápida e barata na cota grátis.
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: toGeminiSchema(params.schema) as unknown as Schema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("A IA não retornou dados estruturados.");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("A IA retornou uma resposta em formato inesperado.");
  }
}

type PdfParams = Omit<StructuredParams, "content"> & {
  pdfBase64: string;
  instruction: string;
};

export function extractFromPdf<T>(params: PdfParams): Promise<T> {
  return extractStructured<T>({
    ...params,
    content: [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: params.pdfBase64,
        },
      },
      { text: params.instruction },
    ],
  });
}

export type InputImage = {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
};

type ImageParams = Omit<StructuredParams, "content"> & {
  images: InputImage[];
  instruction: string;
};

export function extractFromImages<T>(params: ImageParams): Promise<T> {
  return extractStructured<T>({
    ...params,
    content: [
      ...params.images.map(
        (image): Part => ({
          inlineData: {
            mimeType: image.mediaType,
            data: image.base64,
          },
        }),
      ),
      { text: params.instruction },
    ],
  });
}
