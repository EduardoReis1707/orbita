import type { MeasurementEntry } from "@prisma/client";

/** Circunferências corporais registráveis, em centímetros. */
export const MEASUREMENT_FIELDS = [
  { key: "neckCm", label: "Pescoço" },
  { key: "chestCm", label: "Peito / tórax" },
  { key: "waistCm", label: "Cintura" },
  { key: "hipCm", label: "Quadril" },
  { key: "armCm", label: "Braço" },
  { key: "thighCm", label: "Coxa" },
  { key: "calfCm", label: "Panturrilha" },
] as const;

export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number]["key"];

export const MEASUREMENT_KEYS = MEASUREMENT_FIELDS.map(
  (f) => f.key,
) as MeasurementKey[];

/** Limites de sanidade para validação (cm). */
export const MEASUREMENT_RANGE = { min: 10, max: 300 } as const;
export const BODY_FAT_RANGE = { min: 1, max: 70 } as const;

/** Uma entrada tem conteúdo se ao menos uma medida ou o % de gordura foi informado. */
export function measurementHasValues(
  entry: Pick<MeasurementEntry, MeasurementKey | "bodyFatPct">,
): boolean {
  return (
    entry.bodyFatPct != null ||
    MEASUREMENT_KEYS.some((key) => entry[key] != null)
  );
}
