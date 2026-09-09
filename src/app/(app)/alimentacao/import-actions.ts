"use server";

import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { revalidatePath } from "next/cache";
import type { MealType } from "@prisma/client";

import { requireUser } from "@/lib/auth";
import { parseISODate, todayISO } from "@/lib/date";
import type { FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { MEAL_TYPE_ORDER } from "@/lib/nutrition";
import type { ImportedMeal } from "@/lib/ai/import-meals";
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
  type: optionalText, date: importDate, note: optionalText,
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullish(),
  items: z.array(z.object({
    name: optionalText, quantity: optionalText, calories: numeric(0, 10000),
    proteinG: numeric(0, 2000), carbsG: numeric(0, 2000), fatG: numeric(0, 2000),
  })).max(40).nullish(),
})).min(1).max(60);

function num(value: unknown, min: number, max: number): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 10) / 10;
}

export async function confirmMealImportAction(
  meals: ImportedMeal[],
  requestId: string,
): Promise<FormState> {
  const user = await requireUser();
  const today = parseISODate(todayISO())!;
  if (!Array.isArray(meals) || meals.length === 0) {
    return { status: "error", message: "Nada para importar." };
  }

  const parsed = batchSchema.safeParse(meals);
  if (!parsed.success) {
    return { status: "error", message: "Lote inválido. Revise os dados e os limites da importação." };
  }
  if (!validImportRequestId(requestId)) {
    return { status: "error", message: "Confirmação de importação inválida. Tente novamente." };
  }

  const payloadHash = importPayloadHash(parsed.data);
  const existing = await prisma.importOperation.findUnique({
    where: { profileId_kind_requestId: { profileId: user.id, kind: "MEALS", requestId } },
    select: { payloadHash: true, resultMessage: true },
  });
  if (existing) {
    return sameImportPayload(existing, payloadHash)
      ? { status: "success", message: existing.resultMessage }
      : { status: "error", message: "Esta confirmação já foi usada com dados diferentes. Revise o PDF e tente de novo." };
  }

  const records: Prisma.MealCreateArgs[] = [];
  let created = 0;

  for (const meal of parsed.data) {
    const type = (
      MEAL_TYPE_ORDER.includes(meal.type as MealType) ? meal.type : "OTHER"
    ) as MealType;
    const date = (meal.date && parseISODate(meal.date)) ?? today;
    const time =
      typeof meal.time === "string" && /^\d{2}:\d{2}$/.test(meal.time)
        ? meal.time
        : null;

    const items = (Array.isArray(meal.items) ? meal.items : [])
      .slice(0, 40)
      .map((item, index) => ({
        name: (typeof item.name === "string" && item.name.trim()
          ? item.name.trim()
          : `Alimento ${index + 1}`
        ).slice(0, 120),
        position: index,
        quantity:
          typeof item.quantity === "string" && item.quantity.trim()
            ? item.quantity.trim().slice(0, 60)
            : null,
        calories: num(item.calories, 0, 10000),
        proteinG: num(item.proteinG, 0, 2000),
        carbsG: num(item.carbsG, 0, 2000),
        fatG: num(item.fatG, 0, 2000),
      }));

    if (items.length === 0) continue;

    records.push({
      data: {
        profileId: user.id,
        date,
        type,
        time,
        note:
          typeof meal.note === "string" && meal.note.trim()
            ? meal.note.trim().slice(0, 200)
            : null,
        items: { create: items },
      },
    });
    created += 1;
  }

  if (records.length === 0) {
    return { status: "error", message: "Nenhuma refeição válida foi selecionada para importar." };
  }

  const message = `${created} refeição${created === 1 ? "" : "s"} importada${created === 1 ? "" : "s"}.`;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.importOperation.create({
        data: { profileId: user.id, kind: "MEALS", requestId, payloadHash, resultMessage: message },
      });
      for (const record of records) await tx.meal.create(record);
    });
  } catch (error) {
    if ((error as { code?: string } | undefined)?.code !== "P2002") throw error;
    const replay = await prisma.importOperation.findUnique({
      where: { profileId_kind_requestId: { profileId: user.id, kind: "MEALS", requestId } },
      select: { payloadHash: true, resultMessage: true },
    });
    if (!replay) throw error;
    return sameImportPayload(replay, payloadHash)
      ? { status: "success", message: replay.resultMessage }
      : { status: "error", message: "Esta confirmação já foi usada com dados diferentes. Revise o PDF e tente de novo." };
  }

  revalidatePath("/alimentacao");
  revalidatePath("/painel");
  return {
    status: "success",
    message,
  };
}
