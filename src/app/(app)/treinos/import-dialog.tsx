"use client";

import { todayISO } from "@/lib/date";
import { describeSets } from "@/lib/workouts";
import type { ImportedWorkout } from "@/lib/ai/import-workouts";
import { Input } from "@/components/ui/input";
import { PdfImportDialog } from "@/components/ai/pdf-import-dialog";
import { confirmWorkoutImportAction } from "./import-actions";

export function ImportWorkoutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <PdfImportDialog<ImportedWorkout>
      open={open}
      onOpenChange={onOpenChange}
      endpoint="/api/importar/treinos"
      resultKey="workouts"
      title="Importar treino de PDF"
      description="A IA lê a ficha e monta os treinos. Você revê antes de salvar — confira nomes, cargas e datas."
      emptyMessage="A IA não encontrou treinos neste PDF."
      normalize={(workout) => ({
        ...workout,
        date: workout.date ?? todayISO(),
      })}
      apply={confirmWorkoutImportAction}
      renderCard={(workout, patch) => (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              value={workout.name}
              onChange={(e) => patch({ name: e.target.value })}
              className="h-8"
            />
            <Input
              type="date"
              value={workout.date ?? todayISO()}
              onChange={(e) => patch({ date: e.target.value })}
              className="h-8 w-auto"
            />
          </div>
          {workout.muscleGroups.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {workout.muscleGroups.map((group) => (
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
            {workout.exercises.map((exercise, i) => (
              <li key={i}>
                <span className="text-foreground">{exercise.name}</span>
                {" — "}
                {describeSets(exercise)}
              </li>
            ))}
          </ul>
        </div>
      )}
    />
  );
}
