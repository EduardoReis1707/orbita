import type { Exercise, WorkoutStatus } from "@prisma/client";

/** Grupos musculares oferecidos ao marcar um treino. */
export const MUSCLE_GROUPS = [
  "Peito",
  "Costas",
  "Pernas",
  "Glúteos",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Abdômen",
  "Cardio",
  "Corpo inteiro",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const WORKOUT_STATUS_LABELS: Record<WorkoutStatus, string> = {
  PLANNED: "Planejado",
  COMPLETED: "Realizado",
  SKIPPED: "Não feito",
};

export const WORKOUT_STATUS_TONE: Record<
  WorkoutStatus,
  "success" | "warning" | "muted"
> = {
  PLANNED: "warning",
  COMPLETED: "success",
  SKIPPED: "muted",
};

export const WORKOUT_STATUS_VALUES = Object.keys(
  WORKOUT_STATUS_LABELS,
) as WorkoutStatus[];

/** Volume de um exercício = séries × repetições × carga (kg). 0 se faltar dado. */
export function exerciseVolume(
  exercise: Pick<Exercise, "sets" | "reps" | "weightKg">,
): number {
  if (
    exercise.sets == null ||
    exercise.reps == null ||
    exercise.weightKg == null
  ) {
    return 0;
  }
  return exercise.sets * exercise.reps * exercise.weightKg;
}

/** Volume total de uma lista de exercícios. */
export function totalVolume(
  exercises: Pick<Exercise, "sets" | "reps" | "weightKg">[],
): number {
  return exercises.reduce((sum, exercise) => sum + exerciseVolume(exercise), 0);
}

/** Descreve as séries de um exercício, ex.: "4 × 10 · 60 kg". */
export function describeSets(
  exercise: Pick<Exercise, "sets" | "reps" | "weightKg">,
): string {
  const parts: string[] = [];
  if (exercise.sets != null && exercise.reps != null) {
    parts.push(`${exercise.sets} × ${exercise.reps}`);
  } else if (exercise.sets != null) {
    parts.push(`${exercise.sets} série${exercise.sets === 1 ? "" : "s"}`);
  } else if (exercise.reps != null) {
    parts.push(`${exercise.reps} rep.`);
  }
  if (exercise.weightKg != null) {
    parts.push(
      `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(exercise.weightKg)} kg`,
    );
  }
  return parts.join(" · ") || "—";
}
