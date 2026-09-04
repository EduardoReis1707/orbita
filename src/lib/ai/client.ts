import { GoogleGenAI } from "@google/genai";

/**
 * Modelo do Google Gemini usado para ler PDFs, estimar fotos e responder no
 * assistente. O `gemini-2.5-flash` tem cota gratuita generosa.
 */
export const AI_MODEL = "gemini-2.5-flash";

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Cliente Gemini (somente servidor). Lê GEMINI_API_KEY do ambiente. */
export function createAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY ausente. Gere uma chave gratuita em aistudio.google.com/apikey e adicione em .env.local.",
    );
  }
  return new GoogleGenAI({ apiKey });
}
