import { MEAL_TYPE_ORDER } from "@/lib/nutrition";
import { extractFromImages, type InputImage } from "./extract";

export type EstimatedFood = {
  name: string;
  portion: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type MealPhotoEstimate = {
  mealType: string;
  foods: EstimatedFood[];
  note: string | null;
};

const foodSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "portion", "calories", "proteinG", "carbsG", "fatG"],
  properties: {
    name: { type: "string", description: "Nome do alimento identificado" },
    portion: {
      type: ["string", "null"],
      description: 'Porção estimada como texto, ex.: "~150 g", "1 concha"',
    },
    calories: { type: ["number", "null"], description: "kcal estimadas" },
    proteinG: { type: ["number", "null"] },
    carbsG: { type: ["number", "null"] },
    fatG: { type: ["number", "null"] },
  },
} as const;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["mealType", "foods", "note"],
  properties: {
    mealType: {
      type: "string",
      enum: [...MEAL_TYPE_ORDER],
      description: "Palpite do momento da refeição pela composição do prato",
    },
    foods: {
      type: "array",
      description: "Um item por alimento visível no prato",
      items: foodSchema,
    },
    note: {
      type: ["string", "null"],
      description: "Ressalvas da estimativa (o que ficou incerto)",
    },
  },
} as const;

export function estimateMealFromPhoto(images: InputImage[]) {
  return extractFromImages<MealPhotoEstimate>({
    images,
    system:
      "Você estima o valor nutricional de refeições a partir de fotos. As estimativas são aproximadas: sem balança e sem os rótulos, o erro pode passar de 30%. Não invente alimentos que não aparecem. Quando não der para estimar um número, use null. Deixe as ressalvas em 'note'.",
    instruction:
      "Identifique os alimentos neste prato e estime a porção, as calorias e os macronutrientes de cada um. Some mentalmente para conferir se o total faz sentido.",
    toolName: "estimar_refeicao",
    toolDescription: "Registra a estimativa nutricional da foto da refeição.",
    schema: schema as unknown as Record<string, unknown>,
    maxTokens: 3000,
  });
}
