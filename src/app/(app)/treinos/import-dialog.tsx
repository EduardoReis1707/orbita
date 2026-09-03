"use client";

import { type ChangeEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SparklesIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { todayISO } from "@/lib/date";
import { describeSets } from "@/lib/workouts";
import type { ImportedWorkout } from "@/lib/ai/import-workouts";
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
import { confirmWorkoutImportAction } from "./import-actions";

type ReviewItem = { workout: ImportedWorkout; included: boolean };
type Phase = "pick" | "analyzing" | "review";

export function ImportWorkoutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("pick");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [saving, startSaving] = useTransition();

  function reset() {
    setPhase("pick");
    setError(null);
    setItems([]);
  }

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setPhase("analyzing");

    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch("/api/importar/treinos", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível ler o PDF.");
        setPhase("pick");
        return;
      }
      const workouts: ImportedWorkout[] = data.workouts ?? [];
      if (workouts.length === 0) {
        setError("A IA não encontrou treinos neste PDF.");
        setPhase("pick");
        return;
      }
      setItems(
        workouts.map((workout) => ({
          workout: { ...workout, date: workout.date ?? todayISO() },
          included: true,
        })),
      );
      setPhase("review");
    } catch {
      setError("Falha ao enviar o arquivo.");
      setPhase("pick");
    } finally {
      event.target.value = "";
    }
  }

  function patch(index: number, changes: Partial<ImportedWorkout>) {
    setItems((current) =>
      current.map((item, i) =>
        i === index
          ? { ...item, workout: { ...item.workout, ...changes } }
          : item,
      ),
    );
  }

  function toggle(index: number) {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, included: !item.included } : item,
      ),
    );
  }

  function confirm() {
    const selected = items
      .filter((item) => item.included)
      .map((item) => item.workout);
    if (selected.length === 0) {
      setError("Selecione ao menos um treino.");
      return;
    }
    startSaving(async () => {
      const result = await confirmWorkoutImportAction(selected);
      if (result.status === "success") {
        toast.success(result.message ?? "Importado.");
        close(false);
        router.refresh();
      } else {
        setError(result.message ?? "Não foi possível importar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar treino de PDF</DialogTitle>
          <DialogDescription>
            A IA lê a ficha e monta os treinos. Você revê antes de salvar. A
            leitura é uma interpretação automática — confira os valores.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        {phase === "pick" ? (
          <div className="space-y-2">
            <Label htmlFor="wk-pdf">Arquivo PDF (até 15 MB)</Label>
            <Input
              id="wk-pdf"
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
            {items.map((item, index) => (
              <div
                key={index}
                className={`rounded-lg border p-3 transition-opacity ${
                  item.included ? "" : "opacity-50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={item.included}
                    onChange={() => toggle(index)}
                    className="mt-1"
                    aria-label="Incluir este treino"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <Input
                        value={item.workout.name}
                        onChange={(e) => patch(index, { name: e.target.value })}
                        className="h-8"
                      />
                      <Input
                        type="date"
                        value={item.workout.date ?? todayISO()}
                        onChange={(e) => patch(index, { date: e.target.value })}
                        className="h-8 w-auto"
                      />
                    </div>
                    {item.workout.muscleGroups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.workout.muscleGroups.map((group) => (
                          <span
                            key={group}
                            className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground"
                          >
                            {group}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      {item.workout.exercises.map((exercise, i) => (
                        <li key={i}>
                          <span className="text-foreground">
                            {exercise.name}
                          </span>
                          {" — "}
                          {describeSets(exercise)}
                        </li>
                      ))}
                    </ul>
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
              {saving
                ? "Importando…"
                : `Importar ${items.filter((i) => i.included).length}`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
