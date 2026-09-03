import { extractFromPdf } from "./extract";

export type ImportedMeasurement = {
  date: string | null;
  weightKg: number | null;
  neckCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  calfCm: number | null;
  bodyFatPct: number | null;
};

export type MeasurementImportResult = { entries: ImportedMeasurement[] };

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["entries"],
  properties: {
    entries: {
      type: "array",
      description:
        "Uma entrada por data de avaliação. Avaliações comparativas podem ter mais de uma.",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "date",
          "weightKg",
          "neckCm",
          "chestCm",
          "waistCm",
          "hipCm",
          "armCm",
          "thighCm",
          "calfCm",
          "bodyFatPct",
        ],
        properties: {
          date: {
            type: ["string", "null"],
            description: "Data AAAA-MM-DD da avaliação, se houver",
          },
          weightKg: { type: ["number", "null"], description: "Peso em kg" },
          neckCm: { type: ["number", "null"], description: "Pescoço (cm)" },
          chestCm: { type: ["number", "null"], description: "Peito/tórax (cm)" },
          waistCm: { type: ["number", "null"], description: "Cintura (cm)" },
          hipCm: { type: ["number", "null"], description: "Quadril (cm)" },
          armCm: {
            type: ["number", "null"],
            description: "Braço (cm); use o maior lado se houver dois",
          },
          thighCm: { type: ["number", "null"], description: "Coxa (cm)" },
          calfCm: { type: ["number", "null"], description: "Panturrilha (cm)" },
          bodyFatPct: {
            type: ["number", "null"],
            description: "Percentual de gordura corporal",
          },
        },
      },
    },
  },
} as const;

export function importMeasurementsFromPdf(pdfBase64: string) {
  return extractFromPdf<MeasurementImportResult>({
    pdfBase64,
    system:
      "Você lê avaliações físicas e laudos de composição corporal em PDF e extrai as medidas. Seja fiel ao documento: só registre valores explícitos. Use null para o que não aparecer. Todas as medidas são aproximações do documento de origem.",
    instruction:
      "Extraia peso, circunferências e percentual de gordura desta avaliação. Se o documento comparar datas, gere uma entrada por data.",
    toolName: "salvar_medidas",
    toolDescription: "Registra as medidas corporais extraídas do PDF.",
    schema: schema as unknown as Record<string, unknown>,
  });
}
