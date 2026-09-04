import Groq from "groq-sdk";

/**
 * Modelo da Groq usado só pelo assistente de chat (as ferramentas de escrita
 * e a leitura de dados). Tier gratuito, sem cartão. Suporta function calling.
 * PDF e estimativa por foto continuam no Gemini (`./client.ts`) — a Groq não
 * lê documentos/imagens do mesmo jeito.
 */
export const GROQ_MODEL = "openai/gpt-oss-120b";

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

/** Cliente Groq (somente servidor). Lê GROQ_API_KEY do ambiente. */
export function createGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY ausente. Gere uma chave gratuita em console.groq.com/keys e adicione em .env.local.",
    );
  }
  return new Groq({ apiKey });
}
