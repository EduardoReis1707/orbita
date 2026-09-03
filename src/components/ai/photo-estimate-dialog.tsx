"use client";

import {
  type ChangeEvent,
  type ReactNode,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { CircleAlertIcon, SparklesIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import type { FormState } from "@/lib/forms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Phase = "pick" | "analyzing" | "review";

type Props<T> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rota POST que recebe as imagens (campo `files`) e devolve `T`. */
  endpoint: string;
  title: string;
  description: string;
  /** Texto do aviso de aproximação, sempre visível na revisão. */
  disclaimer: string;
  fileHint: string;
  multiple?: boolean;
  /** Ajusta o objeto recém-recebido da API (ex.: injetar a data de hoje). */
  normalize?: (raw: unknown) => T;
  renderReview: (value: T, patch: (changes: Partial<T>) => void) => ReactNode;
  apply: (value: T) => Promise<FormState>;
};

export function PhotoEstimateDialog<T>({
  open,
  onOpenChange,
  endpoint,
  title,
  description,
  disclaimer,
  fileHint,
  multiple = false,
  normalize,
  renderReview,
  apply,
}: Props<T>) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("pick");
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<T | null>(null);
  const [saving, startSaving] = useTransition();

  function reset() {
    setPhase("pick");
    setError(null);
    setValue(null);
  }

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    setPhase("analyzing");

    const formData = new FormData();
    for (const file of files.slice(0, 3)) formData.append("files", file);

    try {
      const response = await fetch(endpoint, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível analisar a foto.");
        setPhase("pick");
        return;
      }
      setValue(normalize ? normalize(data) : (data as T));
      setPhase("review");
    } catch {
      setError("Falha ao enviar a foto.");
      setPhase("pick");
    } finally {
      event.target.value = "";
    }
  }

  function patch(changes: Partial<T>) {
    setValue((current) => (current ? { ...current, ...changes } : current));
  }

  function confirm() {
    if (!value) return;
    startSaving(async () => {
      const result = await apply(value);
      if (result.status === "success") {
        toast.success(result.message ?? "Salvo.");
        close(false);
        router.refresh();
      } else {
        setError(result.message ?? "Não foi possível salvar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {phase === "pick" ? (
          <div className="space-y-2">
            <Label htmlFor="estimate-photo">{fileHint}</Label>
            <Input
              id="estimate-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={multiple}
              onChange={handleFiles}
            />
          </div>
        ) : null}

        {phase === "analyzing" ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <SparklesIcon className="size-6 animate-pulse text-primary" />
            <p className="text-sm text-muted-foreground">
              Analisando a foto com a IA…
            </p>
          </div>
        ) : null}

        {phase === "review" && value ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" />
              <p>{disclaimer}</p>
            </div>
            {renderReview(value, patch)}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancelar
          </Button>
          {phase === "review" ? (
            <Button onClick={confirm} disabled={saving}>
              <UploadIcon />
              {saving ? "Salvando…" : "Salvar estimativa"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
