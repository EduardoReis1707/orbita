"use server";

import { revalidatePath } from "next/cache";
import type { WorkoutStatus } from "@prisma/client";

import { requireUser } from "@/lib/auth";
import { parseISODate } from "@/lib/date";
import type { FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { MUSCLE_GROUPS } from "@/lib/workouts";
import type { ImportedWorkout } from "@/lib/ai/import-workouts";

function clampInt(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampFloat(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
}

/** Cria os treinos revisados pelo usuário a partir da importação por IA. */
export async function confirmWorkoutImportAction(
  workouts: ImportedWorkout[],
): Promise<FormState> {
  const user = await requireUser();

  if (!Array.isArray(workouts) || workouts.length === 0) {
    return { status: "error", message: "Nada para importar." };
  }

  let created = 0;

  for (const workout of workouts.slice(0, 50)) {
    const name =
      typeof workout.name === "string" && workout.name.trim()
        ? workout.name.trim().slice(0, 120)
        : "Treino importado";

    const date =
      (workout.date && parseISODate(workout.date)) ?? new Date();

    const muscleGroups = Array.isArray(workout.muscleGroups)
      ? workout.muscleGroups.filter((g): g is string =>
          (MUSCLE_GROUPS as readonly string[]).includes(g),
        )
      : [];

    const exercises = Array.isArray(workout.exercises)
      ? workout.exercises.slice(0, 60).map((exercise, index) => ({
          name:
            typeof exercise.name === "string" && exercise.name.trim()
              ? exercise.name.trim().slice(0, 120)
              : `Exercício ${index + 1}`,
          position: index,
          sets: clampInt(exercise.sets, 1, 50),
          reps: clampInt(exercise.reps, 1, 500),
          weightKg: clampFloat(exercise.weightKg, 0, 1000),
          restSec: clampInt(exercise.restSec, 0, 3600),
          note:
            typeof exercise.note === "string" && exercise.note.trim()
              ? exercise.note.trim().slice(0, 300)
              : null,
        }))
      : [];

    await prisma.workout.create({
      data: {
        profileId: user.id,
        name,
        date,
        status: "COMPLETED" as WorkoutStatus,
        durationMin: clampInt(workout.durationMin, 1, 600),
        muscleGroups,
        note:
          typeof workout.note === "string" && workout.note.trim()
            ? workout.note.trim().slice(0, 300)
            : null,
        exercises: { create: exercises },
      },
    });
    created += 1;
  }

  revalidatePath("/treinos");
  revalidatePath("/painel");
  return {
    status: "success",
    message: `${created} treino${created === 1 ? "" : "s"} importado${created === 1 ? "" : "s"}.`,
  };
}
