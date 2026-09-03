"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { parseISODate } from "@/lib/date";
import type { FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import type { ImportedMeasurement } from "@/lib/ai/import-measurements";

function num(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 10) / 10;
}

export async function confirmMeasurementImportAction(
  entries: ImportedMeasurement[],
): Promise<FormState> {
  const user = await requireUser();
  if (!Array.isArray(entries) || entries.length === 0) {
    return { status: "error", message: "Nada para importar." };
  }

  let weightCount = 0;
  let measurementCount = 0;

  for (const entry of entries.slice(0, 30)) {
    const date = (entry.date && parseISODate(entry.date)) ?? new Date();

    const weightKg = num(entry.weightKg, 20, 400);
    if (weightKg != null) {
      await prisma.weightEntry.upsert({
        where: { profileId_date: { profileId: user.id, date } },
        create: { profileId: user.id, date, weightKg },
        update: { weightKg },
      });
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

    if (Object.values(cm).some((value) => value != null)) {
      await prisma.measurementEntry.upsert({
        where: { profileId_date: { profileId: user.id, date } },
        create: { profileId: user.id, date, ...cm },
        update: cm,
      });
      measurementCount += 1;
    }
  }

  revalidatePath("/medidas");
  revalidatePath("/evolucao");
  revalidatePath("/painel");
  return {
    status: "success",
    message: `Importado: ${weightCount} pesagem${weightCount === 1 ? "" : "ns"}, ${measurementCount} registro${measurementCount === 1 ? "" : "s"} de medidas.`,
  };
}
