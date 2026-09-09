"use client";

import { type ChangeEvent, type ReactNode, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SparklesIcon, UploadIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Phase = "pick" | "analyzing" | "review";
type Row<T> = { item: T; included: boolean };

type Props<T> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rota POST que recebe o PDF e devolve `{ [resultKey]: T[] }`. */
  endpoint: string;
  resultKey: string;
  title: string;
  description: string;
  emptyMessage: string;
  /** Ajusta cada item logo após a extração (ex.: preencher data com hoje). */
  normalize?: (item: T) => T;
  /** Renderiza o cartão de revisão de um item; `patch` altera o item. */
  renderCard: (item: T, patch: (changes: Partial<T>) => void) => ReactNode;
  /** Server Action que grava os itens selecionados. */
  apply: (items: T[], requestId: string) => Promise<FormState>;
};

export function PdfImportDialog<T>({
  open,
  onOpenChange,
  endpoint,
  resultKey,
  title,
  description,
  emptyMessage,
  normalize,
  renderCard,
  apply,
}: Props<T>) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("pick");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row<T>[]>([]);
  const [importRequestId, setImportRequestId] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const requestRef = useRef<AbortController | null>(null);
  const sessionRef = useRef(0);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
      sessionRef.current += 1;
    };
  }, [open]);

  function reset() {
    requestRef.current?.abort();
    sessionRef.current += 1;
    setPhase("pick");
    setError(null);
    setRows([]);
    setImportRequestId(null);
  }

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    event.target.value = "";
    setError(null);
    setPhase("analyzing");

    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch(endpoint, { method: "POST", body: formData, signal: controller.signal });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        setError(data.error ?? "Não foi possível ler o PDF.");
        setPhase("pick");
        return;
      }
      const items: T[] = data[resultKey] ?? [];
      if (items.length === 0) {
        setError(emptyMessage);
        setPhase("pick");
        return;
      }
      setRows(
        items.map((item) => ({
          item: normalize ? normalize(item) : item,
          included: true,
        })),
      );
      setPhase("review");
    } catch {
      if (controller.signal.aborted) return;
      setError("Falha ao enviar o arquivo.");
      setPhase("pick");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  function patch(index: number, changes: Partial<T>) {
    setRows((current) =>
      current.map((row, i) =>
        i === index ? { ...row, item: { ...row.item, ...changes } } : row,
      ),
    );
  }

  function toggle(index: number) {
    setRows((current) =>
      current.map((row, i) =>
        i === index ? { ...row, included: !row.included } : row,
      ),
    );
  }

  const selectedCount = rows.filter((row) => row.included).length;

  function confirm() {
    const selected = rows.filter((row) => row.included).map((row) => row.item);
    if (selected.length === 0) {
      setError("Selecione ao menos um item.");
      return;
    }
    if (saving) return;
    setError(null);
    const session = sessionRef.current;
    startSaving(async () => {
      try {
        const requestId = importRequestId ?? crypto.randomUUID();
        if (!importRequestId) setImportRequestId(requestId);
        const result = await apply(selected, requestId);
        if (session !== sessionRef.current) return;
        if (result.status === "success") {
          toast.success(result.message ?? "Importado.");
          close(false);
          router.refresh();
        } else {
          setError(result.message ?? "Não foi possível importar.");
        }
      } catch {
        if (session !== sessionRef.current) return;
        setError("Não foi possível confirmar a importação. Confira seus registros antes de tentar novamente.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

        {phase === "pick" ? (
          <div className="space-y-2">
            <Label htmlFor="import-pdf">Arquivo PDF (até 15 MB)</Label>
            <Input
              id="import-pdf"
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFile}
            />
          </div>
        ) : null}

        {phase === "analyzing" ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <SparklesIcon className="size-6 animate-pulse text-primary" />
            <p className="text-sm text-muted-foreground">
              Lendo o PDF com a IA… isso pode levar alguns segundos.
            </p>
          </div>
        ) : null}

        {phase === "review" ? (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={index}
                className={cn(
                  "rounded-lg border p-3 transition-opacity",
                  !row.included && "opacity-50",
                )}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={row.included}
                    onChange={() => toggle(index)}
                    className="mt-1"
                    aria-label="Incluir este item"
                  />
                  <div className="min-w-0 flex-1">
                    {renderCard(row.item, (changes) => patch(index, changes))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancelar
          </Button>
          {phase === "review" ? (
            <Button onClick={confirm} disabled={saving}>
              <UploadIcon />
              {saving ? "Importando…" : `Importar ${selectedCount}`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
