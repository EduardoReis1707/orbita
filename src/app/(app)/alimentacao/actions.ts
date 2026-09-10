"use server";

import { revalidatePath } from "next/cache";
import type { MealType } from "@prisma/client";

import { requireUser } from "@/lib/auth";
import { parseISODate } from "@/lib/date";
import type { FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { MEAL_TYPE_ORDER } from "@/lib/nutrition";
import { parseNutritionTarget } from "@/lib/nutrition-targets";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optNum(raw: string): number | undefined | null {
  if (raw === "") return undefined;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function revalidateNutrition() {
  revalidatePath("/alimentacao");
  revalidatePath("/painel");
}

// ---------------------------------------------------------------------------
// Metas de nutrição (no Profile)
// ---------------------------------------------------------------------------

export async function saveNutritionTargetsAction(
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const fieldErrors: Record<string, string[]> = {};

  const fields = ["calories", "protein", "carbs", "fat"] as const;
  const parsed: Record<string, number | null> = {};
  for (const field of fields) {
    const value = parseNutritionTarget(str(formData, field), field);
    if (value === null) {
      fieldErrors[field] = ["Valor inválido."];
    } else {
      parsed[field] = value ?? null;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  await prisma.profile.update({
    where: { id: user.id },
    data: {
      targetCalories: parsed.calories,
      targetProteinG: parsed.protein,
      targetCarbsG: parsed.carbs,
      targetFatG: parsed.fat,
    },
  });

  revalidateNutrition();
  return { status: "success", message: "Metas de nutrição salvas." };
}

// ---------------------------------------------------------------------------
// Refeição
// ---------------------------------------------------------------------------

export async function saveMealAction(formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const fieldErrors: Record<string, string[]> = {};

  const idRaw = str(formData, "id");
  const editingId = idRaw ? Number(idRaw) : null;

  const date = parseISODate(str(formData, "date"));
  if (!date) fieldErrors.date = ["Informe uma data válida."];

  const typeRaw = str(formData, "type");
  const type = (
    MEAL_TYPE_ORDER.includes(typeRaw as MealType) ? typeRaw : "OTHER"
  ) as MealType;

  const time = str(formData, "time");
  if (time && !/^\d{2}:\d{2}$/.test(time)) {
    fieldErrors.time = ["Horário inválido."];
  }

  const note = str(formData, "note") || null;

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  const data = {
    date: date as Date,
    type,
    time: time || null,
    note,
  };

  if (editingId) {
    const result = await prisma.meal.updateMany({
      where: { id: editingId, profileId: user.id },
      data,
    });
    if (result.count === 0) {
      return { status: "error", message: "Refeição não encontrada." };
    }
  } else {
    await prisma.meal.create({ data: { profileId: user.id, ...data } });
  }

  revalidateNutrition();
  return {
    status: "success",
    message: editingId ? "Refeição atualizada." : "Refeição adicionada.",
  };
}

export async function deleteMealAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await prisma.meal.deleteMany({ where: { id, profileId: user.id } });
  revalidateNutrition();
}

// ---------------------------------------------------------------------------
// Alimento
// ---------------------------------------------------------------------------

export async function saveFoodItemAction(
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const fieldErrors: Record<string, string[]> = {};

  const mealId = Number(formData.get("mealId"));
  if (!Number.isInteger(mealId)) {
    return { status: "error", message: "Refeição inválida." };
  }
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, profileId: user.id },
    select: { id: true },
  });
  if (!meal) return { status: "error", message: "Refeição não encontrada." };

  const idRaw = str(formData, "id");
  const editingId = idRaw ? Number(idRaw) : null;

  const name = str(formData, "name");
  if (name.length < 1) fieldErrors.name = ["Informe o alimento."];

  const numericFields: Array<[string, string, number]> = [
    ["calories", "calories", 10000],
    ["proteinG", "proteinG", 2000],
    ["carbsG", "carbsG", 2000],
    ["fatG", "fatG", 2000],
  ];
  const values: Record<string, number | null> = {};
  for (const [field, key, max] of numericFields) {
    const parsed = optNum(str(formData, field));
    if (parsed === null || (parsed !== undefined && (parsed < 0 || parsed > max))) {
      fieldErrors[field] = [`Entre 0 e ${max}.`];
    } else {
      values[key] =
        parsed === undefined ? null : Math.round(parsed * 10) / 10;
    }
  }

  const quantity = str(formData, "quantity") || null;

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  const data = {
    name,
    quantity,
    calories: values.calories ?? null,
    proteinG: values.proteinG ?? null,
    carbsG: values.carbsG ?? null,
    fatG: values.fatG ?? null,
  };

  if (editingId) {
    const result = await prisma.foodItem.updateMany({
      where: { id: editingId, mealId },
      data,
    });
    if (result.count === 0) {
      return { status: "error", message: "Alimento não encontrado." };
    }
  } else {
    const last = await prisma.foodItem.findFirst({
      where: { mealId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    await prisma.foodItem.create({
      data: { mealId, position: (last?.position ?? -1) + 1, ...data },
    });
  }

  revalidateNutrition();
  return {
    status: "success",
    message: editingId ? "Alimento atualizado." : "Alimento adicionado.",
  };
}

export async function deleteFoodItemAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await prisma.foodItem.deleteMany({
    where: { id, meal: { profileId: user.id } },
  });
  revalidateNutrition();
}
