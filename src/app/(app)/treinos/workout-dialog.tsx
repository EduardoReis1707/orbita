"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Workout } from "@prisma/client";

import { toISODate, todayISO } from "@/lib/date";
import {
  MUSCLE_GROUPS,
  WORKOUT_STATUS_LABELS,
  WORKOUT_STATUS_VALUES,
} from "@/lib/workouts";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/form-feedback";
import { saveWorkoutAction } from "./actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout?: Workout | null;
};

export function WorkoutDialog({ open, onOpenChange, workout }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const editing = Boolean(workout);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      const result = await saveWorkoutAction(formData);
      if (result.status === "error") {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message ?? null);
        return;
      }
      toast.success(result.message ?? "Salvo.");
      onOpenChange(false);
      if (!editing && result.workoutId) {
        router.push(`/treinos/${result.workoutId}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar treino" : "Novo treino"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Ajuste os dados do treino."
              : "Depois de criar, você adiciona os exercícios."}
          </DialogDescription>
        </DialogHeader>
        <form
          key={workout?.id ?? "new"}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {workout ? (
            <input type="hidden" name="id" value={workout.id} />
          ) : null}
          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="w-name">Nome</Label>
            <Input
              id="w-name"
              name="name"
              defaultValue={workout?.name ?? ""}
              placeholder="Treino A — Peito e tríceps"
              maxLength={80}
              required
            />
            <FieldError errors={fieldErrors.name} />
          </div>

          <div className="space-y-1.5">
            <Label>Grupos musculares</Label>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.map((group) => (
                <label
                  key={group}
                  className="cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors select-none has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
                >
                  <input
                    type="checkbox"
                    name="muscleGroups"
                    value={group}
                    defaultChecked={workout?.muscleGroups.includes(group)}
                    className="sr-only"
                  />
                  {group}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="w-date">Data</Label>
              <Input
                id="w-date"
                name="date"
                type="date"
                defaultValue={
                  workout ? toISODate(workout.date) : todayISO()
                }
                required
              />
              <FieldError errors={fieldErrors.date} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-duration">Duração (min)</Label>
              <Input
                id="w-duration"
                name="durationMin"
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                defaultValue={workout?.durationMin ?? ""}
                placeholder="60"
              />
              <FieldError errors={fieldErrors.durationMin} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="w-status">Situação</Label>
            <Select
              name="status"
              defaultValue={workout?.status ?? "COMPLETED"}
              items={WORKOUT_STATUS_LABELS}
            >
              <SelectTrigger id="w-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKOUT_STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {WORKOUT_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="w-note">Observações (opcional)</Label>
            <Input
              id="w-note"
              name="note"
              defaultValue={workout?.note ?? ""}
              maxLength={300}
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
              {pending ? "Salvando…" : editing ? "Salvar" : "Criar treino"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
