import { extractFromImages, type InputImage } from "./extract";

export type BodyPhotoEstimate = {
  weightKg: number | null;
  neckCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  calfCm: number | null;
  bodyFatPct: number | null;
  confidence: "baixa" | "média";
  note: string | null;
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "weightKg",
    "neckCm",
    "chestCm",
    "waistCm",
    "hipCm",
    "armCm",
    "thighCm",
    "calfCm",
    "bodyFatPct",
    "confidence",
    "note",
  ],
  properties: {
    weightKg: {
      type: ["number", "null"],
      description: "Só se houver alguma referência clara; normalmente null",
    },
    neckCm: { type: ["number", "null"] },
    chestCm: { type: ["number", "null"] },
    waistCm: { type: ["number", "null"], description: "Circunferência da cintura (cm)" },
    hipCm: { type: ["number", "null"] },
    armCm: { type: ["number", "null"] },
    thighCm: { type: ["number", "null"] },
    calfCm: { type: ["number", "null"] },
    bodyFatPct: {
      type: ["number", "null"],
      description: "Percentual de gordura corporal aproximado",
    },
    confidence: {
      type: "string",
      enum: ["baixa", "média"],
      description: "Confiança geral da estimativa (nunca 'alta' só por foto)",
    },
    note: {
      type: ["string", "null"],
      description: "Ressalvas: ângulo, roupa, ausência de escala, etc.",
    },
  },
} as const;

export function estimateBodyFromPhotos(images: InputImage[]) {
  return extractFromImages<BodyPhotoEstimate>({
    images,
    system:
      "Você dá uma estimativa GROSSEIRA de circunferências corporais e percentual de gordura a partir de fotos (idealmente frente e costas). Isto é muito impreciso: sem referência de escala e sem medição real, o erro é grande. Nunca use confiança 'alta'. Prefira faixas conservadoras; use null para o que não der para estimar. Explique as limitações em 'note'.",
    instruction:
      "Estime as circunferências (cm) e o percentual de gordura desta pessoa. Se só houver uma foto ou o enquadramento for ruim, retorne menos campos e confiança 'baixa'.",
    toolName: "estimar_corpo",
    toolDescription:
      "Registra a estimativa aproximada de medidas corporais a partir de fotos.",
    schema: schema as unknown as Record<string, unknown>,
    maxTokens: 2000,
  });
}
