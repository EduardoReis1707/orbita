"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Exercise } from "@prisma/client";

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
import { FieldError } from "@/components/form-feedback";
import { saveExerciseAction } from "../actions";

type Props = {
  workoutId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise?: Exercise | null;
};

export function ExerciseDialog({
  workoutId,
  open,
  onOpenChange,
  exercise,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const editing = Boolean(exercise);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      const result = await saveExerciseAction(formData);
      if (result.status === "error") {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message ?? null);
        return;
      }
      toast.success(result.message ?? "Salvo.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar exercício" : "Adicionar exercício"}
          </DialogTitle>
          <DialogDescription>
            Preencha o que fizer sentido — todos os campos além do nome são
            opcionais.
          </DialogDescription>
        </DialogHeader>
        <form
          key={exercise?.id ?? "new"}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <input type="hidden" name="workoutId" value={workoutId} />
          {exercise ? (
            <input type="hidden" name="id" value={exercise.id} />
          ) : null}
          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="e-name">Exercício</Label>
            <Input
              id="e-name"
              name="name"
              defaultValue={exercise?.name ?? ""}
              placeholder="Supino reto"
              required
            />
            <FieldError errors={fieldErrors.name} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e-sets">Séries</Label>
              <Input
                id="e-sets"
                name="sets"
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                defaultValue={exercise?.sets ?? ""}
                placeholder="4"
              />
              <FieldError errors={fieldErrors.sets} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-reps">Repetições</Label>
              <Input
                id="e-reps"
                name="reps"
                type="number"
                inputMode="numeric"
                min={1}
                max={500}
                defaultValue={exercise?.reps ?? ""}
                placeholder="10"
              />
              <FieldError errors={fieldErrors.reps} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-weight">Carga (kg)</Label>
              <Input
                id="e-weight"
                name="weightKg"
                type="number"
                inputMode="decimal"
                step="0.5"
                min={0}
                max={1000}
                defaultValue={exercise?.weightKg ?? ""}
                placeholder="60"
              />
              <FieldError errors={fieldErrors.weightKg} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-rest">Descanso (s)</Label>
              <Input
                id="e-rest"
                name="restSec"
                type="number"
                inputMode="numeric"
                min={0}
                max={3600}
                defaultValue={exercise?.restSec ?? ""}
                placeholder="90"
              />
              <FieldError errors={fieldErrors.restSec} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-note">Observação (opcional)</Label>
            <Input
              id="e-note"
              name="note"
              defaultValue={exercise?.note ?? ""}
              maxLength={200}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
