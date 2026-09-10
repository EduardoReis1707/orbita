import type { ActivityLevel, Sex } from "@prisma/client";

import { parseISODate, todayISO } from "@/lib/date";

import { ACTIVITY_LEVEL_FACTOR } from "@/lib/profile";

/**
 * Cálculos de composição corporal. Todos os resultados são **estimativas**
 * baseadas em fórmulas populacionais e não substituem avaliação profissional.
 */

/** Índice de Massa Corporal: peso (kg) / altura (m)². */
export function bmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export type BmiBand = {
  label: string;
  /** token de cor semântico para a faixa */
  tone: "success" | "warning" | "destructive" | "muted";
};

/** Faixa de classificação do IMC para adultos (OMS). */
export function bmiBand(value: number): BmiBand {
  if (value < 18.5) return { label: "Abaixo do peso", tone: "warning" };
  if (value < 25) return { label: "Peso normal", tone: "success" };
  if (value < 30) return { label: "Sobrepeso", tone: "warning" };
  if (value < 35) return { label: "Obesidade grau I", tone: "destructive" };
  if (value < 40) return { label: "Obesidade grau II", tone: "destructive" };
  return { label: "Obesidade grau III", tone: "destructive" };
}

/** Idade em anos completos a partir da data de nascimento. */
export function ageInYears(birthDate: Date, on: Date = new Date()): number {
  const civilOn = parseISODate(todayISO(on))!;
  let age = civilOn.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = civilOn.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && civilOn.getUTCDate() < birthDate.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Taxa Metabólica Basal (kcal/dia) pela equação de Mifflin-St Jeor.
 * Para sexo "OTHER" usa a média entre as constantes masculina e feminina.
 */
export function basalMetabolicRate(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}): number {
  const { sex, weightKg, heightCm, ageYears } = input;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const sexConstant = sex === "MALE" ? 5 : sex === "FEMALE" ? -161 : -78;
  return base + sexConstant;
}

/** Gasto Energético Total estimado (kcal/dia) = TMB × fator de atividade. */
export function totalDailyEnergyExpenditure(
  bmr: number,
  activityLevel: ActivityLevel,
): number {
  return bmr * ACTIVITY_LEVEL_FACTOR[activityLevel];
}

/** Variação percentual de `from` para `to`. */
export function percentChange(from: number, to: number): number | null {
  if (from === 0) return null;
  return ((to - from) / from) * 100;
}

export type WeightGoalProgress = {
  /** kg que faltam (positivo) ou que passaram da meta (negativo) */
  remainingKg: number;
  /** 0–100; quanto do caminho entre início e meta já foi percorrido */
  percent: number;
  direction: "lose" | "gain" | "maintain";
};

/**
 * Progresso rumo ao peso-meta. `startKg` é o primeiro registro de peso;
 * `currentKg` o mais recente; `targetKg` a meta do perfil.
 */
export function weightGoalProgress(
  startKg: number,
  currentKg: number,
  targetKg: number,
): WeightGoalProgress {
  const totalDelta = targetKg - startKg;
  const doneDelta = currentKg - startKg;
  const remainingDelta = totalDelta > 0.05
    ? targetKg - currentKg
    : currentKg - targetKg;
  const remainingKg = Math.round(remainingDelta * 10) / 10;

  const direction =
    totalDelta < -0.05 ? "lose" : totalDelta > 0.05 ? "gain" : "maintain";

  let percent: number;
  if (Math.abs(totalDelta) < 0.05) {
    percent = Math.abs(currentKg - targetKg) <= 0.5 ? 100 : 0;
  } else {
    percent = (doneDelta / totalDelta) * 100;
  }

  return {
    remainingKg,
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    direction,
  };
}

/** Formata número no padrão brasileiro com N casas decimais. */
export function formatNumber(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Formata calorias (sem casas decimais) — ex.: "1.850 kcal". */
export function formatKcal(value: number): string {
  return `${new Intl.NumberFormat("pt-BR").format(Math.round(value))} kcal`;
}
