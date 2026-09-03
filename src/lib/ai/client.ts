import Anthropic from "@anthropic-ai/sdk";

/** Modelo usado para ler os PDFs importados. */
export const AI_MODEL = "claude-sonnet-5";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Cliente Anthropic (somente servidor). Lê ANTHROPIC_API_KEY do ambiente. */
export function createAiClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY ausente. Adicione a chave da API da Anthropic em .env.local.",
    );
  }
  return new Anthropic();
}
