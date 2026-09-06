"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  PaperclipIcon,
  SendIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearChatAction } from "./actions";

type ChatAction = { name: string; summary: string; ok: boolean };
type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
  attachmentName?: string;
};

/** Eventos NDJSON emitidos por `/api/chat` (uma linha JSON por evento). */
type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "action"; name: string; summary: string; ok: boolean }
  | { type: "error"; message: string }
  | { type: "done" };

/** Mesmo teto do servidor (`src/lib/ai/attachment-extract.ts`) — feedback já no cliente. */
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

/**
 * Interpreta só o `**negrito**` que o modelo usa nas respostas — sem trazer
 * uma lib de markdown pra isso. Quebras de linha continuam via
 * `whitespace-pre-wrap` no elemento pai; aqui só troca os asteriscos por
 * `<strong>` em vez de mostrá-los literalmente.
 */
function renderInlineMarkdown(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}

const SUGGESTIONS = [
  "Registra meu peso de hoje: 88 kg",
  "Adiciona 2 ovos e 1 pão no café da manhã",
  "Estou treinando o suficiente para o meu objetivo?",
  "Com o que posso substituir o arroz branco mantendo os carboidratos?",
];

export function AssistantChat({
  initialMessages,
  aiEnabled,
  welcomeMessage,
}: {
  initialMessages: Msg[];
  aiEnabled: boolean;
  /** Boas-vindas roteirizadas (grátis, sem IA) — mostradas sempre que o chat está vazio. */
  welcomeMessage: string;
}) {
  const router = useRouter();
  const buildWelcome = (): Msg[] => [
    { id: "welcome", role: "assistant", content: welcomeMessage },
  ];
  const [messages, setMessages] = useState<Msg[]>(
    initialMessages.length > 0 ? initialMessages : buildWelcome(),
  );
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [clearing, startClearing] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string, file?: File | null) {
    const trimmed = text.trim();
    if (sending) return;
    if (!trimmed && !file) return;

    setInput("");
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSending(true);
    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      attachmentName: file?.name,
    };
    const assistantMsg: Msg = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };
    setMessages((current) => [...current, userMsg, assistantMsg]);

    const patchAssistant = (patch: (msg: Msg) => Msg) =>
      setMessages((current) =>
        current.map((m) => (m.id === assistantMsg.id ? patch(m) : m)),
      );

    let sawText = false;
    let sawAction = false;
    let hadError = false;

    const applyEvent = (event: StreamEvent) => {
      if (event.type === "text") {
        sawText = true;
        patchAssistant((m) => ({ ...m, content: m.content + event.delta }));
      } else if (event.type === "action") {
        sawAction = true;
        patchAssistant((m) => ({
          ...m,
          actions: [
            ...(m.actions ?? []),
            { name: event.name, summary: event.summary, ok: event.ok },
          ],
        }));
      } else if (event.type === "error") {
        hadError = true;
      }
    };

    try {
      const response = file
        ? await fetch("/api/chat", {
            method: "POST",
            body: (() => {
              const formData = new FormData();
              formData.append("message", trimmed);
              formData.append("file", file);
              return formData;
            })(),
          })
        : await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: trimmed }),
          });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha na resposta.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const drain = (chunk: string, flush = false) => {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = flush ? "" : (lines.pop() ?? "");
        for (const line of flush ? [...lines, buffer].filter(Boolean) : lines) {
          const raw = line.trim();
          if (!raw) continue;
          try {
            applyEvent(JSON.parse(raw) as StreamEvent);
          } catch {
            // linha parcial ou ruído — ignora
          }
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        drain(decoder.decode(value, { stream: true }));
      }
      drain("", true);

      if (hadError) {
        patchAssistant((m) => ({
          ...m,
          content: `${m.content}${m.content ? "\n\n" : ""}_(erro ao gerar a resposta)_`,
        }));
      } else if (!sawText && !sawAction) {
        patchAssistant((m) => ({ ...m, content: "_(sem resposta)_" }));
      }

      if (sawAction) router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível responder.",
      );
      setMessages((current) => {
        const target = current.find((m) => m.id === assistantMsg.id);
        if (target && !target.content && !target.actions?.length) {
          return current.filter((m) => m.id !== assistantMsg.id);
        }
        return current.map((m) =>
          m.id === assistantMsg.id
            ? {
                ...m,
                content: `${m.content}${m.content ? "\n\n" : ""}_(erro ao gerar a resposta)_`,
              }
            : m,
        );
      });
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input, attachedFile);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("Arquivo muito grande — o limite é 4 MB.");
      event.target.value = "";
      return;
    }
    setAttachedFile(file);
  }

  const isFreshChat = messages.length === 1 && messages[0]?.id === "welcome";

  function clearAll() {
    startClearing(async () => {
      await clearChatAction();
      setMessages(buildWelcome());
      router.refresh();
    });
  }

  if (!aiEnabled) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        O assistente ainda não está configurado. Falta adicionar a chave da
        API da Groq (<code>GROQ_API_KEY</code>) no{" "}
        <code>.env.local</code>.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col">
      <div className="flex items-center justify-between pb-2">
        <p className="text-xs text-muted-foreground">
          Orientações gerais — não substituem nutricionista, médico ou educador
          físico.
        </p>
        {!isFreshChat ? (
          <Button
            variant="ghost"
            size="xs"
            onClick={clearAll}
            disabled={clearing}
          >
            <Trash2Icon />
            Limpar
          </Button>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border bg-card p-3">
        {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col gap-1",
                message.role === "user" ? "items-end" : "items-start",
              )}
            >
              {message.attachmentName ? (
                <span
                  className={cn(
                    "inline-flex max-w-[85%] items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground",
                  )}
                >
                  <PaperclipIcon className="size-3 shrink-0" />
                  {message.attachmentName}
                </span>
              ) : null}

              {message.content || sending ? (
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {message.content ? (
                    renderInlineMarkdown(message.content)
                  ) : sending ? (
                    <span className="text-muted-foreground">pensando…</span>
                  ) : (
                    ""
                  )}
                </div>
              ) : null}

              {message.role === "assistant" && message.actions?.length ? (
                <div className="flex max-w-[85%] flex-wrap gap-1.5">
                  {message.actions.map((action, index) => (
                    <span
                      key={`${action.name}-${index}`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                        action.ok
                          ? "border-primary/30 bg-primary/5 text-foreground"
                          : "border-destructive/30 bg-destructive/5 text-destructive",
                      )}
                    >
                      {action.ok ? (
                        <CheckCircle2Icon className="size-3.5 shrink-0 text-primary" />
                      ) : (
                        <AlertCircleIcon className="size-3.5 shrink-0" />
                      )}
                      {action.summary}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        {isFreshChat ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {attachedFile ? (
        <div className="mt-2 flex items-center gap-2 self-start rounded-full border bg-card py-1 pr-1 pl-3 text-xs">
          <PaperclipIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{attachedFile.name}</span>
          <button
            type="button"
            onClick={() => {
              setAttachedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Remover anexo"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={sending}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Anexar PDF ou planilha"
        >
          <PaperclipIcon />
        </Button>
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Escreva a sua pergunta…"
          maxLength={2000}
          disabled={sending}
        />
        <Button
          type="submit"
          disabled={sending || (!input.trim() && !attachedFile)}
        >
          <SendIcon />
        </Button>
      </form>
    </div>
  );
}
