import type { FoodItem, GoalType, MealType } from "@prisma/client";

export const MEAL_TYPE_ORDER: MealType[] = [
  "BREAKFAST",
  "MORNING_SNACK",
  "LUNCH",
  "AFTERNOON_SNACK",
  "DINNER",
  "SUPPER",
  "OTHER",
];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: "Café da manhã",
  MORNING_SNACK: "Lanche da manhã",
  LUNCH: "Almoço",
  AFTERNOON_SNACK: "Lanche da tarde",
  DINNER: "Jantar",
  SUPPER: "Ceia",
  OTHER: "Outro",
};

export type MacroTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export const EMPTY_TOTALS: MacroTotals = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
};

/** Soma calorias e macros de uma lista de alimentos (ignora nulos). */
export function sumFoodItems(
  items: Pick<FoodItem, "calories" | "proteinG" | "carbsG" | "fatG">[],
): MacroTotals {
  return items.reduce<MacroTotals>(
    (totals, item) => ({
      calories: totals.calories + (item.calories ?? 0),
      proteinG: totals.proteinG + (item.proteinG ?? 0),
      carbsG: totals.carbsG + (item.carbsG ?? 0),
      fatG: totals.fatG + (item.fatG ?? 0),
    }),
    { ...EMPTY_TOTALS },
  );
}

/** Calorias a partir dos macros (4/4/9 kcal por grama). */
export function kcalFromMacros(
  proteinG: number,
  carbsG: number,
  fatG: number,
): number {
  return proteinG * 4 + carbsG * 4 + fatG * 9;
}

export type NutritionTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Sugestão de metas diárias a partir do gasto energético (GET) e do objetivo.
 * É uma estimativa e serve só como ponto de partida.
 */
export function suggestTargets(
  tdee: number,
  goal: GoalType | null,
  currentWeightKg: number | null,
): NutritionTargets {
  let calories = tdee;
  if (goal === "LOSE_WEIGHT") calories = tdee - 400;
  else if (goal === "GAIN_WEIGHT" || goal === "GAIN_MUSCLE") calories = tdee + 300;
  calories = roundTo(Math.max(calories, 1200), 10);

  const proteinG = currentWeightKg
    ? roundTo(currentWeightKg * 1.8, 5)
    : roundTo((calories * 0.3) / 4, 5);
  const fatG = roundTo((calories * 0.25) / 9, 5);
  const carbsG = roundTo(
    Math.max((calories - proteinG * 4 - fatG * 9) / 4, 0),
    5,
  );

  return { calories, proteinG, carbsG, fatG };
}
