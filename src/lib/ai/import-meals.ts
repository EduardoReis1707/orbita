import { MEAL_TYPE_ORDER } from "@/lib/nutrition";
import { extractFromPdf } from "./extract";

export type ImportedFoodItem = {
  name: string;
  quantity: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type ImportedMeal = {
  type: string;
  date: string | null;
  time: string | null;
  note: string | null;
  items: ImportedFoodItem[];
};

export type MealImportResult = { meals: ImportedMeal[] };

const itemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "quantity", "calories", "proteinG", "carbsG", "fatG"],
  properties: {
    name: { type: "string" },
    quantity: {
      type: ["string", "null"],
      description: 'Quantidade como texto, ex.: "150 g", "1 unidade"',
    },
    calories: { type: ["number", "null"], description: "kcal, se informado" },
    proteinG: { type: ["number", "null"] },
    carbsG: { type: ["number", "null"] },
    fatG: { type: ["number", "null"] },
  },
} as const;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["meals"],
  properties: {
    meals: {
      type: "array",
      description: "Uma entrada por refeição do plano ou diário alimentar",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "date", "time", "note", "items"],
        properties: {
          type: {
            type: "string",
            enum: [...MEAL_TYPE_ORDER],
            description: "Momento da refeição",
          },
          date: {
            type: ["string", "null"],
            description: "Data AAAA-MM-DD, se houver; senão null",
          },
          time: {
            type: ["string", "null"],
            description: "Horário HH:MM, se houver",
          },
          note: { type: ["string", "null"] },
          items: { type: "array", items: itemSchema },
        },
      },
    },
  },
} as const;

export function importMealsFromPdf(pdfBase64: string) {
  return extractFromPdf<MealImportResult>({
    pdfBase64,
    system:
      "Você lê planos alimentares e diários de alimentação em PDF e os transforma em dados estruturados. Seja fiel ao documento: não invente alimentos nem valores nutricionais que não estejam escritos. Use null para o que não aparecer.",
    instruction:
      "Extraia todas as refeições e alimentos deste PDF. Cada refeição vira um item em 'meals', classificada pelo momento (café da manhã, almoço, etc.). Preserve as quantidades como texto.",
    toolName: "salvar_refeicoes",
    toolDescription: "Registra as refeições e alimentos extraídos do PDF.",
    schema: schema as unknown as Record<string, unknown>,
  });
}
