import type { NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AI_MODEL, createAiClient, isAiConfigured } from "@/lib/ai/client";
import {
  ASSISTANT_SYSTEM_PROMPT,
  buildAssistantContext,
} from "@/lib/ai/assistant-context";

export const maxDuration = 60;

const MAX_MESSAGE_CHARS = 2000;
const HISTORY_LIMIT = 20;

export async function POST(request: NextRequest) {
  const user = await requireUser();

  if (!isAiConfigured()) {
    return Response.json(
      { error: "O assistente ainda não está configurado." },
      { status: 503 },
    );
  }

  let body: { message?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const message =
    typeof body.message === "string" ? body.message.trim() : "";
  if (message.length === 0) {
    return Response.json({ error: "Mensagem vazia." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return Response.json(
      { error: "Mensagem muito longa." },
      { status: 400 },
    );
  }

  const history = await prisma.chatMessage.findMany({
    where: { profileId: user.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  history.reverse();

  await prisma.chatMessage.create({
    data: { profileId: user.id, role: "USER", content: message },
  });

  const context = await buildAssistantContext(user.id);
  const messages: Anthropic.MessageParam[] = [
    ...history.map(
      (m): Anthropic.MessageParam => ({
        role: m.role === "USER" ? "user" : "assistant",
        content: m.content,
      }),
    ),
    { role: "user", content: message },
  ];

  const client = createAiClient();
  const encoder = new TextEncoder();
  let full = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const aiStream = client.messages.stream({
          model: AI_MODEL,
          max_tokens: 1500,
          system: `${ASSISTANT_SYSTEM_PROMPT}\n\n${context}`,
          messages,
        });
        for await (const event of aiStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        await aiStream.finalMessage();
      } catch (error) {
        console.error("[chat]", error);
        controller.enqueue(
          encoder.encode("\n\n_(erro ao gerar a resposta)_"),
        );
      } finally {
        controller.close();
        if (full.trim()) {
          await prisma.chatMessage
            .create({
              data: {
                profileId: user.id,
                role: "ASSISTANT",
                content: full,
              },
            })
            .catch(() => {});
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
