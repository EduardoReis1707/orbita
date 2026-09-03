import type { Goal, GoalMetric } from "@prisma/client";

export const GOAL_METRIC_LABELS: Record<GoalMetric, string> = {
  WEIGHT: "Peso corporal",
  BODY_FAT: "Percentual de gordura",
  MEASUREMENT: "Circunferência",
  EXERCISE_LOAD: "Carga de um exercício",
  WORKOUT_FREQUENCY: "Frequência de treino",
  CUSTOM: "Personalizada",
};

export const GOAL_METRIC_VALUES = Object.keys(
  GOAL_METRIC_LABELS,
) as GoalMetric[];

/** Métricas cujo valor atual é calculado dos registros (não é manual). */
export const AUTOMATIC_METRICS: GoalMetric[] = [
  "WEIGHT",
  "BODY_FAT",
  "MEASUREMENT",
  "EXERCISE_LOAD",
  "WORKOUT_FREQUENCY",
];

export function goalUnit(metric: GoalMetric): string {
  switch (metric) {
    case "WEIGHT":
    case "EXERCISE_LOAD":
      return "kg";
    case "BODY_FAT":
      return "%";
    case "MEASUREMENT":
      return "cm";
    case "WORKOUT_FREQUENCY":
      return "/semana";
    default:
      return "";
  }
}

export function isDecreasingGoal(
  goal: Pick<Goal, "startValue" | "targetValue">,
): boolean {
  return goal.targetValue < goal.startValue;
}

export type GoalProgress = {
  current: number | null;
  percent: number;
  achieved: boolean;
  remaining: number | null;
};

/**
 * Progresso de uma meta. `liveValue` é o valor atual vindo dos registros
 * (para métricas automáticas); para `CUSTOM` usa `goal.currentValue`.
 */
export function computeGoalProgress(
  goal: Pick<Goal, "startValue" | "targetValue" | "metric" | "currentValue">,
  liveValue: number | null,
): GoalProgress {
  const current = goal.metric === "CUSTOM" ? goal.currentValue : liveValue;
  if (current == null) {
    return { current: null, percent: 0, achieved: false, remaining: null };
  }

  const total = goal.targetValue - goal.startValue;
  const done = current - goal.startValue;
  const decreasing = goal.targetValue < goal.startValue;
  const achieved = decreasing
    ? current <= goal.targetValue
    : current >= goal.targetValue;

  let percent: number;
  if (Math.abs(total) < 1e-6) {
    percent = achieved ? 100 : 0;
  } else {
    percent = Math.round(Math.max(0, Math.min(100, (done / total) * 100)));
  }

  return {
    current,
    percent: achieved ? 100 : percent,
    achieved,
    remaining: achieved ? 0 : Math.abs(goal.targetValue - current),
  };
}

/** Dias restantes até o prazo (negativo = atrasado). Null se sem prazo. */
export function daysUntil(deadline: Date | null): number | null {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
