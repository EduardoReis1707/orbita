import type Anthropic from "@anthropic-ai/sdk";

import { AI_MODEL, createAiClient } from "./client";

type ExtractParams = {
  /** PDF em base64 (sem quebras de linha). */
  pdfBase64: string;
  system: string;
  instruction: string;
  toolName: string;
  toolDescription: string;
  /** JSON Schema do resultado. Precisa ter `additionalProperties: false` e `required`. */
  schema: Record<string, unknown>;
};

/**
 * Envia um PDF para a Claude e recebe de volta um objeto que valida contra
 * `schema` (via tool use estrito). Lança erro se a IA não retornar dados.
 */
export async function extractFromPdf<T>(params: ExtractParams): Promise<T> {
  const client = createAiClient();

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 8000,
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
    messages: [
      {
        role: "user",
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
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não conseguiu extrair dados estruturados do PDF.");
  }
  return toolUse.input as T;
}
