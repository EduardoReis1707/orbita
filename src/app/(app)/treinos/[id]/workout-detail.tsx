"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { Exercise, Workout } from "@prisma/client";

import { formatDateBR } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
  WORKOUT_STATUS_LABELS,
  WORKOUT_STATUS_TONE,
  describeSets,
} from "@/lib/workouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { WorkoutDialog } from "../workout-dialog";
import { deleteExerciseAction, deleteWorkoutAction } from "../actions";
import { ExerciseDialog } from "./exercise-dialog";

const toneClass: Record<"success" | "warning" | "muted", string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  muted: "bg-muted text-muted-foreground",
};

type WorkoutWithExercises = Workout & { exercises: Exercise[] };

export function WorkoutDetail({ workout }: { workout: WorkoutWithExercises }) {
  const router = useRouter();
  const [editingWorkout, setEditingWorkout] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, startDeleting] = useTransition();

  function handleDeleteWorkout() {
    const formData = new FormData();
    formData.set("id", String(workout.id));
    startDeleting(async () => {
      await deleteWorkoutAction(formData);
      toast.success("Treino excluído.");
      router.push("/treinos");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg">{workout.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDateBR(workout.date)}
                {workout.durationMin ? ` · ${workout.durationMin} min` : ""}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                toneClass[WORKOUT_STATUS_TONE[workout.status]],
              )}
            >
              {WORKOUT_STATUS_LABELS[workout.status]}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {workout.muscleGroups.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {workout.muscleGroups.map((group) => (
                <span
                  key={group}
                  className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                >
                  {group}
                </span>
              ))}
            </div>
          ) : null}
          {workout.note ? (
            <p className="text-sm text-muted-foreground">{workout.note}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingWorkout(true)}
            >
              <PencilIcon />
              Editar treino
            </Button>
            {confirmingDelete ? (
              <span className="flex items-center gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                  onClick={handleDeleteWorkout}
                >
                  {deleting ? "Excluindo…" : "Confirmar exclusão"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancelar
                </Button>
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(true)}
              >
                Excluir treino
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold">
            Exercícios ({workout.exercises.length})
          </h2>
          <Button size="sm" onClick={() => setAddingExercise(true)}>
            <PlusIcon />
            Adicionar
          </Button>
        </div>

        {workout.exercises.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum exercício ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {workout.exercises.map((exercise) => (
              <li key={exercise.id}>
                <Card className="py-0">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{exercise.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {describeSets(exercise)}
                        {exercise.restSec != null
                          ? ` · descanso ${exercise.restSec}s`
                          : ""}
                      </p>
                      {exercise.note ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {exercise.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar exercício"
                        onClick={() => setEditingExercise(exercise)}
                      >
                        <PencilIcon />
                      </Button>
                      <ConfirmDeleteButton
                        action={deleteExerciseAction}
                        id={exercise.id}
                        ariaLabel="Excluir exercício"
                        successMessage="Exercício excluído."
                      />
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <WorkoutDialog
        open={editingWorkout}
        onOpenChange={setEditingWorkout}
        workout={workout}
      />
      <ExerciseDialog
        workoutId={workout.id}
        open={addingExercise}
        onOpenChange={setAddingExercise}
      />
      <ExerciseDialog
        workoutId={workout.id}
        open={editingExercise !== null}
        onOpenChange={(open) => {
          if (!open) setEditingExercise(null);
        }}
        exercise={editingExercise}
      />
    </div>
  );
}
