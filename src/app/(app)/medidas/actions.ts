"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { parseISODate } from "@/lib/date";
import type { FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import {
  BODY_FAT_RANGE,
  MEASUREMENT_FIELDS,
  MEASUREMENT_RANGE,
  type MeasurementKey,
} from "@/lib/measurements";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** "" -> undefined; número válido -> number; texto inválido -> null. */
function optionalNumber(raw: string): number | undefined | null {
  if (raw === "") return undefined;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function revalidateMetrics() {
  revalidatePath("/medidas");
  revalidatePath("/evolucao");
  revalidatePath("/painel");
}

// ---------------------------------------------------------------------------
// Peso
// ---------------------------------------------------------------------------

export async function saveWeightEntryAction(
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const fieldErrors: Record<string, string[]> = {};

  const date = parseISODate(str(formData, "date"));
  if (!date || date > new Date()) {
    fieldErrors.date = ["Informe uma data válida (não futura)."];
  }

  const weight = optionalNumber(str(formData, "weightKg"));
  if (
    weight === undefined ||
    weight === null ||
    weight < 20 ||
    weight > 400
  ) {
    fieldErrors.weightKg = ["O peso deve estar entre 20 e 400 kg."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  const weightKg = round1(weight as number);
  const note = str(formData, "note") || null;

  await prisma.weightEntry.upsert({
    where: { profileId_date: { profileId: user.id, date: date as Date } },
    create: { profileId: user.id, date: date as Date, weightKg, note },
    update: { weightKg, note },
  });

  revalidateMetrics();
  return { status: "success", message: "Peso registrado." };
}

export async function deleteWeightEntryAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await prisma.weightEntry.deleteMany({ where: { id, profileId: user.id } });
  revalidateMetrics();
}

// ---------------------------------------------------------------------------
// Medidas
// ---------------------------------------------------------------------------

type MeasurementValues = Partial<
  Record<MeasurementKey | "bodyFatPct", number | null>
>;

export async function saveMeasurementEntryAction(
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const fieldErrors: Record<string, string[]> = {};

  const date = parseISODate(str(formData, "date"));
  if (!date || date > new Date()) {
    fieldErrors.date = ["Informe uma data válida (não futura)."];
  }

  const values: MeasurementValues = {};
  let filledCount = 0;

  for (const { key } of MEASUREMENT_FIELDS) {
    const parsed = optionalNumber(str(formData, key));
    if (parsed === null) {
      fieldErrors[key] = ["Valor inválido."];
    } else if (parsed === undefined) {
      values[key] = null;
    } else if (
      parsed < MEASUREMENT_RANGE.min ||
      parsed > MEASUREMENT_RANGE.max
    ) {
      fieldErrors[key] = [
        `Deve estar entre ${MEASUREMENT_RANGE.min} e ${MEASUREMENT_RANGE.max} cm.`,
      ];
    } else {
      values[key] = round1(parsed);
      filledCount += 1;
    }
  }

  const bodyFat = optionalNumber(str(formData, "bodyFatPct"));
  if (bodyFat === null) {
    fieldErrors.bodyFatPct = ["Valor inválido."];
  } else if (bodyFat === undefined) {
    values.bodyFatPct = null;
  } else if (bodyFat < BODY_FAT_RANGE.min || bodyFat > BODY_FAT_RANGE.max) {
    fieldErrors.bodyFatPct = [
      `Deve estar entre ${BODY_FAT_RANGE.min} e ${BODY_FAT_RANGE.max}%.`,
    ];
  } else {
    values.bodyFatPct = round1(bodyFat);
    filledCount += 1;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  if (filledCount === 0) {
    return { status: "error", message: "Informe ao menos uma medida." };
  }

  const note = str(formData, "note") || null;

  await prisma.measurementEntry.upsert({
    where: { profileId_date: { profileId: user.id, date: date as Date } },
    create: { profileId: user.id, date: date as Date, note, ...values },
    update: { note, ...values },
  });

  revalidateMetrics();
  return { status: "success", message: "Medidas registradas." };
}

export async function deleteMeasurementEntryAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await prisma.measurementEntry.deleteMany({
    where: { id, profileId: user.id },
  });
  revalidateMetrics();
}
