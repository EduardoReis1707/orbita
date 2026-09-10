"use server";

import { revalidatePath } from "next/cache";
import type { WorkoutStatus } from "@prisma/client";

import { requireUser } from "@/lib/auth";
import { parseISODate } from "@/lib/date";
import type { FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { MUSCLE_GROUPS, WORKOUT_STATUS_VALUES } from "@/lib/workouts";

export type WorkoutFormState = FormState & { workoutId?: number };

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalInt(raw: string): number | undefined | null {
  if (raw === "") return undefined;
  const value = Number(raw);
  return Number.isInteger(value) ? value : null;
}

function optionalFloat(raw: string): number | undefined | null {
  if (raw === "") return undefined;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function revalidateWorkouts(workoutId?: number) {
  revalidatePath("/treinos");
  revalidatePath("/painel");
  if (workoutId) revalidatePath(`/treinos/${workoutId}`);
}

// ---------------------------------------------------------------------------
// Treino
// ---------------------------------------------------------------------------

export async function saveWorkoutAction(
  formData: FormData,
): Promise<WorkoutFormState> {
  const user = await requireUser();
  const fieldErrors: Record<string, string[]> = {};

  const idRaw = str(formData, "id");
  const editingId = idRaw ? Number(idRaw) : null;

  const name = str(formData, "name");
  if (name.length < 2) fieldErrors.name = ["Dê um nome ao treino."];
  else if (name.length > 80)
    fieldErrors.name = ["O nome do treino é longo demais (máx. 80 caracteres)."];

  const date = parseISODate(str(formData, "date"));
  if (!date) fieldErrors.date = ["Informe uma data válida."];

  const statusRaw = str(formData, "status");
  const status = (
    WORKOUT_STATUS_VALUES.includes(statusRaw as WorkoutStatus)
      ? statusRaw
      : "COMPLETED"
  ) as WorkoutStatus;

  const duration = optionalInt(str(formData, "durationMin"));
  if (duration === null || (duration !== undefined && (duration < 1 || duration > 600))) {
    fieldErrors.durationMin = ["Duração deve estar entre 1 e 600 minutos."];
  }

  const muscleGroups = formData
    .getAll("muscleGroups")
    .filter((v): v is string => typeof v === "string")
    .filter((v) => (MUSCLE_GROUPS as readonly string[]).includes(v));

  const note = str(formData, "note") || null;

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  const data = {
    name,
    date: date as Date,
    status,
    durationMin: duration ?? null,
    muscleGroups,
    note,
  };

  if (editingId) {
    const result = await prisma.workout.updateMany({
      where: { id: editingId, profileId: user.id },
      data,
    });
    if (result.count === 0) {
      return { status: "error", message: "Treino não encontrado." };
    }
    revalidateWorkouts(editingId);
    return { status: "success", message: "Treino atualizado.", workoutId: editingId };
  }

  const created = await prisma.workout.create({
    data: { profileId: user.id, ...data },
  });
  revalidateWorkouts(created.id);
  return { status: "success", message: "Treino criado.", workoutId: created.id };
}

export async function deleteWorkoutAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await prisma.workout.deleteMany({ where: { id, profileId: user.id } });
  revalidateWorkouts();
}

// ---------------------------------------------------------------------------
// Exercício
// ---------------------------------------------------------------------------

export async function saveExerciseAction(
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const fieldErrors: Record<string, string[]> = {};

  const workoutId = Number(formData.get("workoutId"));
  if (!Number.isInteger(workoutId)) {
    return { status: "error", message: "Treino inválido." };
  }

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, profileId: user.id },
    select: { id: true },
  });
  if (!workout) {
    return { status: "error", message: "Treino não encontrado." };
  }

  const idRaw = str(formData, "id");
  const editingId = idRaw ? Number(idRaw) : null;

  const name = str(formData, "name");
  if (name.length < 1) fieldErrors.name = ["Informe o nome do exercício."];

  const sets = optionalInt(str(formData, "sets"));
  if (sets === null || (sets !== undefined && (sets < 1 || sets > 50))) {
    fieldErrors.sets = ["Entre 1 e 50."];
  }
  const reps = optionalInt(str(formData, "reps"));
  if (reps === null || (reps !== undefined && (reps < 1 || reps > 500))) {
    fieldErrors.reps = ["Entre 1 e 500."];
  }
  const weightKg = optionalFloat(str(formData, "weightKg"));
  if (weightKg === null || (weightKg !== undefined && (weightKg < 0 || weightKg > 1000))) {
    fieldErrors.weightKg = ["Entre 0 e 1000 kg."];
  }
  const restSec = optionalInt(str(formData, "restSec"));
  if (restSec === null || (restSec !== undefined && (restSec < 0 || restSec > 3600))) {
    fieldErrors.restSec = ["Entre 0 e 3600 segundos."];
  }

  const note = str(formData, "note") || null;

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  const data = {
    name,
    sets: sets ?? null,
    reps: reps ?? null,
    weightKg: weightKg ?? null,
    restSec: restSec ?? null,
    note,
  };

  if (editingId) {
    const result = await prisma.exercise.updateMany({
      where: { id: editingId, workoutId },
      data,
    });
    if (result.count === 0) {
      return { status: "error", message: "Exercício não encontrado." };
    }
  } else {
    const last = await prisma.exercise.findFirst({
      where: { workoutId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    await prisma.exercise.create({
      data: { workoutId, position: (last?.position ?? -1) + 1, ...data },
    });
  }

  revalidateWorkouts(workoutId);
  return { status: "success", message: editingId ? "Exercício atualizado." : "Exercício adicionado." };
}

export async function deleteExerciseAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const deleted = await prisma.exercise.deleteMany({
    where: { id, workout: { profileId: user.id } },
  });
  if (deleted.count > 0) revalidateWorkouts();
}
