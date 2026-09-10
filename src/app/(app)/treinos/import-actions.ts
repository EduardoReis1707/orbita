"use server";

import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { parseISODate, todayISO } from "@/lib/date";
import type { FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { MUSCLE_GROUPS } from "@/lib/workouts";
import type { ImportedWorkout } from "@/lib/ai/import-workouts";
import {
  importPayloadHash,
  sameImportPayload,
  validImportRequestId,
} from "@/lib/import-idempotency";

const optionalText = z.string().nullish();
const importDate = z.string().refine((value) => {
  const date = parseISODate(value);
  return date !== null && date.toISOString().slice(0, 10) === value;
}, "Data inválida.").nullish();
const numeric = (min: number, max: number) => z.number().min(min).max(max).nullish();
const batchSchema = z.array(z.object({
  // Mudança intencional: fichas importadas não comprovam realização.
  // Aceitar ausência mantém compatibilidade com clientes anteriores.
  status: z.enum(["PLANNED", "COMPLETED"]).default("PLANNED"),
  name: optionalText, date: importDate, note: optionalText,
  durationMin: numeric(1, 600), muscleGroups: z.array(z.string()).nullish(),
  exercises: z.array(z.object({
    name: optionalText, note: optionalText, sets: numeric(1, 50),
    reps: numeric(1, 500), weightKg: numeric(0, 1000), restSec: numeric(0, 3600),
  })).max(60).nullish(),
})).min(1).max(50);

function clampInt(value: unknown, min: number, max: number): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampFloat(value: unknown, min: number, max: number): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
}

/** Cria os treinos revisados pelo usuário a partir da importação por IA. */
export async function confirmWorkoutImportAction(
  workouts: ImportedWorkout[],
  requestId: string,
): Promise<FormState> {
  const user = await requireUser();
  const today = parseISODate(todayISO())!;

  if (!Array.isArray(workouts) || workouts.length === 0) {
    return { status: "error", message: "Nada para importar." };
  }

  const parsed = batchSchema.safeParse(workouts);
  if (!parsed.success) {
    return { status: "error", message: "Lote inválido. Revise os dados e os limites da importação." };
  }
  if (!validImportRequestId(requestId)) {
    return { status: "error", message: "Confirmação de importação inválida. Tente novamente." };
  }

  const payloadHash = importPayloadHash(parsed.data);
  const existing = await prisma.importOperation.findUnique({
    where: { profileId_kind_requestId: { profileId: user.id, kind: "WORKOUTS", requestId } },
    select: { payloadHash: true, resultMessage: true },
  });
  if (existing) {
    return sameImportPayload(existing, payloadHash)
      ? { status: "success", message: existing.resultMessage }
      : { status: "error", message: "Esta confirmação já foi usada com dados diferentes. Revise o PDF e tente de novo." };
  }

  const records: Prisma.WorkoutCreateArgs[] = [];
  let created = 0;

  for (const workout of parsed.data) {
    const name =
      typeof workout.name === "string" && workout.name.trim()
        ? workout.name.trim().slice(0, 120)
        : "Treino importado";

    const date =
      (workout.date && parseISODate(workout.date)) ?? today;

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

    records.push({
      data: {
        profileId: user.id,
        name,
        date,
        status: workout.status,
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

  const message = `${created} treino${created === 1 ? "" : "s"} importado${created === 1 ? "" : "s"}.`;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.importOperation.create({
        data: { profileId: user.id, kind: "WORKOUTS", requestId, payloadHash, resultMessage: message },
      });
      for (const record of records) await tx.workout.create(record);
    });
  } catch (error) {
    if ((error as { code?: string } | undefined)?.code !== "P2002") throw error;
    const replay = await prisma.importOperation.findUnique({
      where: { profileId_kind_requestId: { profileId: user.id, kind: "WORKOUTS", requestId } },
      select: { payloadHash: true, resultMessage: true },
    });
    if (!replay) throw error;
    return sameImportPayload(replay, payloadHash)
      ? { status: "success", message: replay.resultMessage }
      : { status: "error", message: "Esta confirmação já foi usada com dados diferentes. Revise o PDF e tente de novo." };
  }

  revalidatePath("/treinos");
  revalidatePath("/painel");
  return {
    status: "success",
    message,
  };
}
