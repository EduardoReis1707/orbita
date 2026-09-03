"use server";

import { revalidatePath } from "next/cache";
import type { MealType } from "@prisma/client";

import { requireUser } from "@/lib/auth";
import { parseISODate } from "@/lib/date";
import type { FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { MEAL_TYPE_ORDER } from "@/lib/nutrition";
import type { ImportedMeal } from "@/lib/ai/import-meals";

function num(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 10) / 10;
}

export async function confirmMealImportAction(
  meals: ImportedMeal[],
): Promise<FormState> {
  const user = await requireUser();
  if (!Array.isArray(meals) || meals.length === 0) {
    return { status: "error", message: "Nada para importar." };
  }

  let created = 0;

  for (const meal of meals.slice(0, 60)) {
    const type = (
      MEAL_TYPE_ORDER.includes(meal.type as MealType) ? meal.type : "OTHER"
    ) as MealType;
    const date = (meal.date && parseISODate(meal.date)) ?? new Date();
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

    await prisma.meal.create({
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

  revalidatePath("/alimentacao");
  revalidatePath("/painel");
  return {
    status: "success",
    message: `${created} refeição${created === 1 ? "" : "s"} importada${created === 1 ? "" : "s"}.`,
  };
}
