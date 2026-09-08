import type { NextRequest } from "next/server";
import Groq from "groq-sdk";

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
import {
  extractAttachmentText,
  isSupportedAttachment,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/ai/attachment-extract";

export const maxDuration = 60;

const MAX_MESSAGE_CHARS = 2000;
const HISTORY_LIMIT = 20;
/** Rodadas modelo→ferramenta→modelo por requisição. */
const MAX_ITERATIONS = 5;
/** Teto de ações executadas numa única requisição (trava anti-loop). */
const MAX_TOOL_CALLS = 8;

/**
 * Instrução extra anexada ao prompt enquanto o perfil não tem metas de
 * nutrição definidas — sinal de que a pessoa acabou de completar o cadastro
 * e ainda não passou pela sugestão inicial. Some sozinha assim que
 * `definir_metas_nutricao` for chamada (o campo deixa de ser nulo).
 */
const ONBOARDING_KICKOFF = `

Modo de boas-vindas: esta pessoa ainda não tem metas de nutrição definidas — provavelmente acabou de completar o cadastro. Mesmo que ela já tenha mandado o objetivo com bastante detalhe (peso-meta, frequência de treino, etc.), não monte o plano de cara na primeira resposta — puxe 2 ou 3 perguntas específicas primeiro, pra personalizar de verdade: como é a rotina alimentar atual dela (o que costuma comer, algum alimento que não abre mão ou não come de jeito nenhum), como é o treino que ela já faz hoje (divisão, experiência, alguma lesão ou limitação), e o que mais parecer relevante pro caso dela. Faça isso de um jeito leve, como uma conversa normal, não como formulário — e só depois que ela responder (ou disser algo como "pode decidir você"/"monta aí"), monte o ponto de partida de verdade chamando as ferramentas: definir_metas_nutricao (calorias/macros), registrar_treino com status "planejado" e registrar_refeicao para algumas refeições de exemplo do dia de hoje, batendo com as metas de calorias definidas.

Ao montar um treino com vários dias/divisões (ex.: 5-6 treinos por semana tipo ABC), NUNCA junte tudo numa chamada só de registrar_treino com dezenas de exercícios — chame registrar_treino uma vez pra cada dia/divisão (ex.: uma chamada pro "Treino A — Peito e tríceps", outra pro "Treino B — Costas e bíceps", etc.), cada uma com seus poucos exercícios próprios e uma data diferente (hoje, amanhã, depois de amanhã...). Em "exercicios", cada item é sempre um objeto com os campos pedidos (nome, series, repeticoes, cargaKg, descansoSeg) — nunca uma frase de texto solta.`;

/** Um evento do stream NDJSON (uma linha JSON por evento). */
type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "action"; name: string; summary: string; ok: boolean }
  | { type: "error"; message: string }
  | { type: "done" };

/**
 * Traduz uma falha da chamada à Groq numa frase curta que diz de verdade o que
 * aconteceu — chave inválida, limite de uso, modelo indisponível, rede fora do
 * ar — em vez de um "erro" genérico que não ajuda ninguém a resolver.
 */
function describeChatError(error: unknown): string {
  if (error instanceof Groq.APIError) {
    const status = error.status;
    if (status === 401 || status === 403) {
      return "O assistente está com a chave de acesso à IA inválida ou sem permissão. Quem cuida do app precisa revisar a GROQ_API_KEY.";
    }
    if (status === 429) {
      return "O assistente bateu no limite de uso agora há pouco. Espere um ou dois minutos e tente de novo.";
    }
    if (status === 404) {
      return "O modelo de IA configurado não está disponível para esta conta. Quem cuida do app precisa revisar o modelo em uso.";
    }
    if (status != null && status >= 500) {
      return "O serviço de IA está instável neste momento. Tente de novo em instantes.";
    }
  }
  if (error instanceof Groq.APIConnectionError) {
    return "Não consegui falar com o serviço de IA — parece um problema de conexão. Tente de novo em instantes.";
  }
  return "Não consegui gerar a resposta agora. Tente de novo em instantes.";
}

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

  /** O que vai pro modelo nesta requisição (pode incluir texto extraído de um anexo). */
  let promptForModel: string;
  /** O que fica salvo no histórico — resumido, sem o texto extraído do anexo. */
  let persistedMessage: string;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: "Requisição inválida." }, { status: 400 });
    }

    const messageField = formData.get("message");
    const typedMessage =
      typeof messageField === "string" ? messageField.trim() : "";
    if (typedMessage.length > MAX_MESSAGE_CHARS) {
      return Response.json(
        { error: "Mensagem muito longa." },
        { status: 400 },
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Nenhum arquivo anexado." }, { status: 400 });
    }
    if (file.size === 0) {
      return Response.json({ error: "Arquivo vazio." }, { status: 400 });
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return Response.json(
        { error: "Arquivo muito grande — o limite é 4 MB." },
        { status: 400 },
      );
    }
    if (!isSupportedAttachment(file.name, file.type)) {
      return Response.json(
        {
          error:
            "Formato de arquivo não suportado — anexe um PDF ou uma planilha Excel (.xlsx/.xls).",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractAttachmentText(buffer, file.name, file.type);
    if (!extracted.ok) {
      return Response.json({ error: extracted.error }, { status: 400 });
    }

    const userText =
      typedMessage || "Segue meu arquivo, me ajuda a organizar isso.";
    promptForModel = `Arquivo anexado: "${file.name}"\n\n${extracted.text}\n\n---\n\n${userText}\n\n[Instrução: isto veio de um arquivo anexado. Primeiro resuma pro usuário, em texto corrido, o que você entendeu do documento — sem chamar nenhuma ferramenta ainda. Depois sugira o que ele pode fazer com isso (ex.: registrar as refeições típicas de hoje na aba de alimentação, ou o treino na aba de treinos), deixando claro que é uma sugestão. Só use as ferramentas de registro numa mensagem seguinte, depois que o usuário confirmar o que quer registrar.]`;
    persistedMessage = `[Arquivo anexado: ${file.name}]${typedMessage ? ` ${typedMessage}` : ""}`;
  } else {
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
    promptForModel = message;
    persistedMessage = message;
  }

  const history = await prisma.chatMessage.findMany({
    where: { profileId: user.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  history.reverse();

  await prisma.chatMessage.create({
    data: { profileId: user.id, role: "USER", content: persistedMessage },
  });

  const [context, profileForKickoff] = await Promise.all([
    buildAssistantContext(user.id),
    prisma.profile.findUnique({
      where: { id: user.id },
      select: { targetCalories: true },
    }),
  ]);
  const needsKickoff = (profileForKickoff?.targetCalories ?? null) == null;
  const systemContent = `${ASSISTANT_SYSTEM_PROMPT}\n\n${context}${needsKickoff ? ONBOARDING_KICKOFF : ""}`;

  const messages: Message[] = [
    { role: "system", content: systemContent },
    ...history.map(
      (m): Message => ({
        role: m.role === "USER" ? "user" : "assistant",
        content: m.content,
      }),
    ),
    { role: "user", content: promptForModel },
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

          // Chamadas de ferramenta chegam fragmentadas por chunk, indexadas.
          const pending = new Map<
            number,
            { id: string; name: string; args: string }
          >();

          try {
            const groqStream = await client.chat.completions.create({
              model: GROQ_MODEL,
              messages,
              tools,
              stream: true,
            });

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
          } catch (streamError) {
            // A Groq valida os argumentos de tool call no lado dela antes de
            // aceitar — se o modelo mandar um formato errado (ex.: lista de
            // strings em vez de objetos), ela recusa com esse erro específico.
            // Em vez de desistir, devolve o motivo pro modelo tentar de novo.
            const toolValidationDetail =
              streamError instanceof Groq.BadRequestError &&
              (streamError.error as { code?: string } | undefined)?.code ===
                "tool_use_failed"
                ? ((streamError.error as { message?: string } | undefined)
                    ?.message ?? "formato inválido")
                : null;
            if (toolValidationDetail === null) throw streamError;

            messages.push({
              role: "system",
              content: `A sua última chamada de ferramenta falhou na validação: ${toolValidationDetail}. Gere os argumentos de novo, seguindo exatamente o schema da ferramenta — cada item de uma lista de objetos (como "exercicios" ou "itens") precisa ser um objeto com os campos pedidos, nunca uma string de texto solta. Se for um plano com vários treinos/dias, registre cada um numa chamada de ferramenta separada em vez de juntar tudo numa lista só.`,
            });
            continue;
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
        send({ type: "error", message: describeChatError(error) });
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
