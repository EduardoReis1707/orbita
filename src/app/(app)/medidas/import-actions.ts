"use server";

import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { parseISODate, todayISO } from "@/lib/date";
import type { FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import type { ImportedMeasurement } from "@/lib/ai/import-measurements";
import {
  importPayloadHash,
  sameImportPayload,
  validImportRequestId,
} from "@/lib/import-idempotency";

const importDate = z.string().refine((value) => {
  const date = parseISODate(value);
  return date !== null && date.toISOString().slice(0, 10) === value;
}, "Data inválida.").nullish();
const numeric = (min: number, max: number) => z.number().min(min).max(max).nullish();
const batchSchema = z.array(z.object({
  date: importDate, weightKg: numeric(20, 400), neckCm: numeric(10, 300),
  chestCm: numeric(10, 300), waistCm: numeric(10, 300), hipCm: numeric(10, 300),
  armCm: numeric(10, 300), thighCm: numeric(10, 300), calfCm: numeric(10, 300),
  bodyFatPct: numeric(1, 70),
})).min(1).max(30);

function num(value: unknown, min: number, max: number): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 10) / 10;
}

export async function confirmMeasurementImportAction(
  entries: ImportedMeasurement[],
  requestId: string,
): Promise<FormState> {
  const user = await requireUser();
  const today = parseISODate(todayISO())!;
  if (!Array.isArray(entries) || entries.length === 0) {
    return { status: "error", message: "Nada para importar." };
  }

  const parsed = batchSchema.safeParse(entries);
  if (!parsed.success) {
    return { status: "error", message: "Lote inválido. Revise os dados e os limites da importação." };
  }
  if (!validImportRequestId(requestId)) {
    return { status: "error", message: "Confirmação de importação inválida. Tente novamente." };
  }

  const payloadHash = importPayloadHash(parsed.data);
  const existing = await prisma.importOperation.findUnique({
    where: { profileId_kind_requestId: { profileId: user.id, kind: "MEASUREMENTS", requestId } },
    select: { payloadHash: true, resultMessage: true },
  });
  if (existing) {
    return sameImportPayload(existing, payloadHash)
      ? { status: "success", message: existing.resultMessage }
      : { status: "error", message: "Esta confirmação já foi usada com dados diferentes. Revise o PDF e tente de novo." };
  }

  const operations: Array<{ weight?: Prisma.WeightEntryUpsertArgs; measurement?: Prisma.MeasurementEntryUpsertArgs }> = [];
  let weightCount = 0;
  let measurementCount = 0;

  for (const entry of parsed.data) {
    const date = (entry.date && parseISODate(entry.date)) ?? today;

    const operation: (typeof operations)[number] = {};
    const weightKg = num(entry.weightKg, 20, 400);
    if (weightKg != null) {
      operation.weight = {
        where: { profileId_date: { profileId: user.id, date } },
        create: { profileId: user.id, date, weightKg },
        update: { weightKg },
      };
      weightCount += 1;
    }

    const cm = {
      neckCm: num(entry.neckCm, 10, 300),
      chestCm: num(entry.chestCm, 10, 300),
      waistCm: num(entry.waistCm, 10, 300),
      hipCm: num(entry.hipCm, 10, 300),
      armCm: num(entry.armCm, 10, 300),
      thighCm: num(entry.thighCm, 10, 300),
      calfCm: num(entry.calfCm, 10, 300),
      bodyFatPct: num(entry.bodyFatPct, 1, 70),
    };

    // Null from extraction means absent in the document, not a request to clear.
    const patch = Object.fromEntries(
      Object.entries(cm).filter(([, value]) => value != null),
    ) as Partial<Record<keyof typeof cm, number>>;
    if (Object.keys(patch).length > 0) {
      operation.measurement = {
        where: { profileId_date: { profileId: user.id, date } },
        create: { profileId: user.id, date, ...cm },
        update: patch,
      };
      measurementCount += 1;
    }
    operations.push(operation);
  }

  if (weightCount === 0 && measurementCount === 0) {
    return { status: "error", message: "Nenhuma medida válida foi selecionada para importar." };
  }

  const message = `Importado: ${weightCount} pesagem${weightCount === 1 ? "" : "ns"}, ${measurementCount} registro${measurementCount === 1 ? "" : "s"} de medidas.`;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.importOperation.create({
        data: { profileId: user.id, kind: "MEASUREMENTS", requestId, payloadHash, resultMessage: message },
      });
      for (const operation of operations) {
        if (operation.weight) await tx.weightEntry.upsert(operation.weight);
        if (operation.measurement) await tx.measurementEntry.upsert(operation.measurement);
      }
    });
  } catch (error) {
    if ((error as { code?: string } | undefined)?.code !== "P2002") throw error;
    const replay = await prisma.importOperation.findUnique({
      where: { profileId_kind_requestId: { profileId: user.id, kind: "MEASUREMENTS", requestId } },
      select: { payloadHash: true, resultMessage: true },
    });
    if (!replay) throw error;
    return sameImportPayload(replay, payloadHash)
      ? { status: "success", message: replay.resultMessage }
      : { status: "error", message: "Esta confirmação já foi usada com dados diferentes. Revise o PDF e tente de novo." };
  }

  revalidatePath("/medidas");
  revalidatePath("/evolucao");
  revalidatePath("/painel");
  return {
    status: "success",
    message,
  };
}
