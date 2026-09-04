import type { NextRequest } from "next/server";
import type Groq from "groq-sdk";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GROQ_MODEL, createGroqClient, isGroqConfigured } from "@/lib/ai/groq-client";
import {
  ASSISTANT_SYSTEM_PROMPT,
  buildAssistantContext,
} from "@/lib/ai/assistant-context";
import {
  buildToolDeclarations,
  executeToolCall,
} from "@/lib/ai/assistant-tools";

export const maxDuration = 60;

const MAX_MESSAGE_CHARS = 2000;
const HISTORY_LIMIT = 20;
/** Rodadas modelo→ferramenta→modelo por requisição. */
const MAX_ITERATIONS = 5;
/** Teto de ações executadas numa única requisição (trava anti-loop). */
const MAX_TOOL_CALLS = 8;

/** Um evento do stream NDJSON (uma linha JSON por evento). */
type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "action"; name: string; summary: string; ok: boolean }
  | { type: "error"; message: string }
  | { type: "done" };

type Message = Groq.Chat.Completions.ChatCompletionMessageParam;
type ToolCall = Groq.Chat.Completions.ChatCompletionMessageToolCall;

export async function POST(request: NextRequest) {
  const user = await requireUser();

  if (!isGroqConfigured()) {
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
  const messages: Message[] = [
    { role: "system", content: `${ASSISTANT_SYSTEM_PROMPT}\n\n${context}` },
    ...history.map(
      (m): Message => ({
        role: m.role === "USER" ? "user" : "assistant",
        content: m.content,
      }),
    ),
    { role: "user", content: message },
  ];

  const tools: Groq.Chat.Completions.ChatCompletionTool[] =
    buildToolDeclarations();
  const client = createGroqClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      /** Texto acumulado só da rodada atual (vai na mensagem do assistente). */
      let turnText = "";
      /** Texto de todas as rodadas — o que é salvo no histórico ao final. */
      let fullAnswer = "";
      const actionSummaries: string[] = [];
      let toolCallsUsed = 0;

      try {
        for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
          turnText = "";
          const groqStream = await client.chat.completions.create({
            model: GROQ_MODEL,
            messages,
            tools,
            stream: true,
          });

          // Chamadas de ferramenta chegam fragmentadas por chunk, indexadas.
          const pending = new Map<
            number,
            { id: string; name: string; args: string }
          >();

          for await (const chunk of groqStream) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              turnText += delta.content;
              send({ type: "text", delta: delta.content });
            }

            for (const toolCallDelta of delta.tool_calls ?? []) {
              const entry = pending.get(toolCallDelta.index) ?? {
                id: "",
                name: "",
                args: "",
              };
              if (toolCallDelta.id) entry.id = toolCallDelta.id;
              if (toolCallDelta.function?.name) {
                entry.name += toolCallDelta.function.name;
              }
              if (toolCallDelta.function?.arguments) {
                entry.args += toolCallDelta.function.arguments;
              }
              pending.set(toolCallDelta.index, entry);
            }
          }

          fullAnswer += turnText;
          if (pending.size === 0) break;

          const calls = [...pending.values()];
          const toolCalls: ToolCall[] = calls.map((call) => ({
            id: call.id,
            type: "function",
            function: { name: call.name, arguments: call.args },
          }));
          messages.push({
            role: "assistant",
            content: turnText || null,
            tool_calls: toolCalls,
          });

          for (const call of calls) {
            let result: { ok: boolean; summary: string; data?: unknown };
            if (toolCallsUsed >= MAX_TOOL_CALLS) {
              result = {
                ok: false,
                summary:
                  "Muitas ações numa mensagem só — parei aqui por segurança.",
              };
            } else {
              toolCallsUsed += 1;
              let args: Record<string, unknown> = {};
              try {
                args = call.args ? JSON.parse(call.args) : {};
              } catch {
                result = {
                  ok: false,
                  summary: "A IA mandou argumentos inválidos para a ação.",
                };
                send({
                  type: "action",
                  name: call.name,
                  summary: result.summary,
                  ok: false,
                });
                messages.push({
                  role: "tool",
                  tool_call_id: call.id,
                  content: JSON.stringify({ error: result.summary }),
                });
                continue;
              }
              result = await executeToolCall(call.name, args, {
                profileId: user.id,
              });
            }

            send({
              type: "action",
              name: call.name,
              summary: result.summary,
              ok: result.ok,
            });
            actionSummaries.push(result.summary);
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(
                result.ok
                  ? { output: result.data ?? { message: result.summary } }
                  : { error: result.summary },
              ),
            });
          }
        }
      } catch (error) {
        console.error("[chat]", error);
        send({ type: "error", message: "erro ao gerar a resposta" });
      } finally {
        send({ type: "done" });
        controller.close();

        const toPersist =
          fullAnswer.trim() ||
          (actionSummaries.length > 0 ? actionSummaries.join("\n") : "");
        if (toPersist) {
          await prisma.chatMessage
            .create({
              data: {
                profileId: user.id,
                role: "ASSISTANT",
                content: toPersist,
              },
            })
            .catch(() => {});
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
