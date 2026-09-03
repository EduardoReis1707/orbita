import type { ActivityLevel, GoalType, Sex } from "@prisma/client";

export const SEX_LABELS: Record<Sex, string> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
  OTHER: "Outro / prefiro não informar",
};

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: "Sedentário — pouco ou nenhum exercício",
  LIGHT: "Leve — 1 a 3 treinos por semana",
  MODERATE: "Moderado — 3 a 5 treinos por semana",
  ACTIVE: "Ativo — 6 a 7 treinos por semana",
  VERY_ACTIVE: "Muito ativo — treino intenso diário ou trabalho físico",
};

/** Fator multiplicador do gasto energético (TMB × fator = GET estimado). */
export const ACTIVITY_LEVEL_FACTOR: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  LOSE_WEIGHT: "Perder peso",
  MAINTAIN_WEIGHT: "Manter o peso",
  GAIN_WEIGHT: "Ganhar peso",
  GAIN_MUSCLE: "Ganhar massa muscular",
  IMPROVE_FITNESS: "Melhorar o condicionamento",
};

export const SEX_VALUES = Object.keys(SEX_LABELS) as Sex[];
export const ACTIVITY_LEVEL_VALUES = Object.keys(
  ACTIVITY_LEVEL_LABELS,
) as ActivityLevel[];
export const GOAL_TYPE_VALUES = Object.keys(GOAL_TYPE_LABELS) as GoalType[];
