import type { MeasurementEntry } from "@prisma/client";

/** Circunferências corporais registráveis, em centímetros. */
export const MEASUREMENT_FIELDS = [
  {
    key: "neckCm",
    label: "Pescoço",
    howTo:
      "Meça na base do pescoço, logo acima da linha dos ombros, com a fita reta e sem apertar.",
  },
  {
    key: "chestCm",
    label: "Peito / tórax",
    howTo:
      "Passe a fita por baixo das axilas, na altura dos mamilos, respirando normalmente.",
  },
  {
    key: "waistCm",
    label: "Cintura",
    howTo:
      "Meça no ponto mais estreito do tronco, em geral na altura do umbigo, ao terminar de expirar sem forçar.",
  },
  {
    key: "hipCm",
    label: "Quadril",
    howTo:
      "Meça na parte mais larga dos glúteos, com os pés juntos e o peso igual nas duas pernas.",
  },
  {
    key: "armCm",
    label: "Braço",
    howTo:
      "Braço relaxado ao lado do corpo. Meça no ponto mais grosso, a meia distância entre ombro e cotovelo.",
  },
  {
    key: "thighCm",
    label: "Coxa",
    howTo:
      "Em pé, meça a coxa relaxada logo abaixo da dobra do glúteo, no ponto mais grosso.",
  },
  {
    key: "calfCm",
    label: "Panturrilha",
    howTo:
      "Em pé, com o peso nos dois pés, meça a panturrilha no ponto mais grosso.",
  },
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
