"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, PencilIcon, PlusIcon } from "lucide-react";
import type { Workout } from "@prisma/client";

import { formatDateBR } from "@/lib/date";
import { formatNumber } from "@/lib/metrics";
import { WORKOUT_STATUS_LABELS, WORKOUT_STATUS_TONE } from "@/lib/workouts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { deleteWorkoutAction } from "./actions";
import { WorkoutDialog } from "./workout-dialog";

export type WorkoutCardData = Workout & {
  exerciseCount: number;
  volume: number;
};

const toneClass: Record<"success" | "warning" | "muted", string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  muted: "bg-muted text-muted-foreground",
};

export function WorkoutsPanel({ workouts }: { workouts: WorkoutCardData[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Workout | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating(true)}>
          <PlusIcon />
          Novo treino
        </Button>
      </div>

      {workouts.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhum treino registrado. Crie o primeiro com o botão acima.
        </p>
      ) : (
        <ul className="space-y-2">
          {workouts.map((workout) => (
            <li key={workout.id}>
              <Card className="py-0">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/treinos/${workout.id}`}
                        className="font-medium hover:underline"
                      >
                        {workout.name}
                      </Link>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          toneClass[WORKOUT_STATUS_TONE[workout.status]],
                        )}
                      >
                        {WORKOUT_STATUS_LABELS[workout.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateBR(workout.date)}
                      {" · "}
                      {workout.exerciseCount} exercício
                      {workout.exerciseCount === 1 ? "" : "s"}
                      {workout.durationMin ? ` · ${workout.durationMin} min` : ""}
                      {workout.volume > 0
                        ? ` · ${formatNumber(workout.volume, 0)} kg de volume`
                        : ""}
                    </p>
                    {workout.muscleGroups.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
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
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Editar treino"
                      onClick={() => setEditing(workout)}
                    >
                      <PencilIcon />
                    </Button>
                    <ConfirmDeleteButton
                      action={deleteWorkoutAction}
                      id={workout.id}
                      ariaLabel="Excluir treino"
                      successMessage="Treino excluído."
                    />
                    <Link
                      href={`/treinos/${workout.id}`}
                      aria-label="Abrir treino"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ChevronRightIcon className="size-5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <WorkoutDialog open={creating} onOpenChange={setCreating} />
      <WorkoutDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        workout={editing}
      />
    </div>
  );
}
