import type Anthropic from "@anthropic-ai/sdk";

import { AI_MODEL, createAiClient } from "./client";

type StructuredParams = {
  content: Anthropic.ContentBlockParam[];
  system: string;
  toolName: string;
  toolDescription: string;
  /** JSON Schema do resultado. Precisa ter `additionalProperties: false` e `required`. */
  schema: Record<string, unknown>;
  maxTokens?: number;
};

/**
 * Envia blocos de conteúdo (texto, PDF, imagens) para a Claude e recebe de
 * volta um objeto que valida contra `schema`, via tool use estrito.
 */
export async function extractStructured<T>(
  params: StructuredParams,
): Promise<T> {
  const client = createAiClient();

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: params.maxTokens ?? 8000,
    system: params.system,
    tools: [
      {
        name: params.toolName,
        description: params.toolDescription,
        input_schema: params.schema as Anthropic.Tool["input_schema"],
        strict: true,
      } as Anthropic.Tool,
    ],
    tool_choice: { type: "tool", name: params.toolName },
    messages: [{ role: "user", content: params.content }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não conseguiu extrair dados estruturados.");
  }
  return toolUse.input as T;
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
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: params.pdfBase64,
        },
      },
      { type: "text", text: params.instruction },
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
        (image): Anthropic.ContentBlockParam => ({
          type: "image",
          source: {
            type: "base64",
            media_type: image.mediaType,
            data: image.base64,
          },
        }),
      ),
      { type: "text", text: params.instruction },
    ],
  });
}
