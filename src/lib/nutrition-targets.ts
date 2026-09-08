/** Limites compartilhados pelas duas telas que editam metas nutricionais. */
export const NUTRITION_TARGET_MAX = {
  calories: 20000,
  protein: 2000,
  carbs: 2000,
  fat: 2000,
} as const;

/** Vazio limpa a meta; null indica valor inválido. Metas são inteiros. */
export function parseNutritionTarget(
  raw: string,
  field: keyof typeof NUTRITION_TARGET_MAX,
): number | undefined | null {
  if (raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 && value <= NUTRITION_TARGET_MAX[field]
    ? value
    : null;
}
