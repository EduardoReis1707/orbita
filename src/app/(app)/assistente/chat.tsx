"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { SendIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearChatAction } from "./actions";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Com o que posso substituir o arroz branco mantendo os carboidratos?",
  "Estou treinando o suficiente para o meu objetivo?",
  "Como ajustar minhas calorias para perder gordura sem perder músculo?",
  "Monte um exemplo de treino de pernas para casa.",
];

export function AssistantChat({
  initialMessages,
  aiEnabled,
}: {
  initialMessages: Msg[];
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [clearing, startClearing] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setInput("");
    setSending(true);
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const assistantMsg: Msg = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };
    setMessages((current) => [...current, userMsg, assistantMsg]);

    try {
      const response = await fetch("/api/chat", {
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
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: acc } : m,
          ),
        );
      }
      if (!acc.trim()) {
        setMessages((current) =>
          current.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: "_(sem resposta)_" }
              : m,
          ),
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível responder.",
      );
      setMessages((current) =>
        current.filter((m) => m.id !== assistantMsg.id),
      );
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  function clearAll() {
    startClearing(async () => {
      await clearChatAction();
      setMessages([]);
      router.refresh();
    });
  }

  if (!aiEnabled) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        O assistente ainda não está configurado. Falta adicionar a chave da
        API da Anthropic (<code>ANTHROPIC_API_KEY</code>) no{" "}
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
        {messages.length > 0 ? (
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
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <span className="flex size-10 items-center justify-center rounded-lg bg-brand-gradient text-white">
              <SparklesIcon className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              Pergunte sobre treino, alimentação ou suas metas. O assistente
              conhece o seu perfil e os seus registros recentes.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
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
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                {message.content ||
                  (sending ? (
                    <span className="text-muted-foreground">pensando…</span>
                  ) : (
                    ""
                  ))}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Escreva a sua pergunta…"
          maxLength={2000}
          disabled={sending}
        />
        <Button type="submit" disabled={sending || !input.trim()}>
          <SendIcon />
        </Button>
      </form>
    </div>
  );
}
