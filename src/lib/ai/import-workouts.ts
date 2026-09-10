import { MUSCLE_GROUPS } from "@/lib/workouts";
import { extractFromPdf } from "./extract";

export type ImportedExercise = {
  name: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  restSec: number | null;
  note: string | null;
};

export type ImportedWorkout = {
  /** Revisado pelo usuário; ausente passa intencionalmente a significar PLANNED. */
  status?: "PLANNED" | "COMPLETED";
  name: string;
  muscleGroups: string[];
  date: string | null;
  durationMin: number | null;
  note: string | null;
  exercises: ImportedExercise[];
};

export type WorkoutImportResult = { workouts: ImportedWorkout[] };

const exerciseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "sets", "reps", "weightKg", "restSec", "note"],
  properties: {
    name: { type: "string", description: "Nome do exercício" },
    sets: { type: ["integer", "null"], description: "Número de séries" },
    reps: {
      type: ["integer", "null"],
      description: "Repetições por série (use o valor central se for faixa)",
    },
    weightKg: {
      type: ["number", "null"],
      description: "Carga em kg, se informada",
    },
    restSec: {
      type: ["integer", "null"],
      description: "Descanso entre séries em segundos",
    },
    note: { type: ["string", "null"], description: "Observação do exercício" },
  },
} as const;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["workouts"],
  properties: {
    workouts: {
      type: "array",
      description: "Um item por treino/dia encontrado na ficha",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "muscleGroups",
          "date",
          "durationMin",
          "note",
          "exercises",
        ],
        properties: {
          name: {
            type: "string",
            description: 'Nome do treino (ex.: "Treino A", "Peito e tríceps")',
          },
          muscleGroups: {
            type: "array",
            items: { type: "string", enum: [...MUSCLE_GROUPS] },
            description: "Grupos musculares do treino, desta lista fixa",
          },
          date: {
            type: ["string", "null"],
            description: "Data no formato AAAA-MM-DD, se houver; senão null",
          },
          durationMin: {
            type: ["integer", "null"],
            description: "Duração prevista em minutos, se houver",
          },
          note: { type: ["string", "null"] },
          exercises: { type: "array", items: exerciseSchema },
        },
      },
    },
  },
} as const;

export function importWorkoutsFromPdf(pdfBase64: string) {
  return extractFromPdf<WorkoutImportResult>({
    pdfBase64,
    system:
      "Você é um assistente que lê fichas de treino em PDF e as transforma em dados estruturados. Seja fiel ao documento: não invente exercícios, cargas ou datas que não estejam escritos. Quando um campo não aparecer, use null.",
    instruction:
      "Extraia todos os treinos e exercícios desta ficha. Cada treino/dia vira um item em 'workouts'. Preserve a ordem dos exercícios. Para grupos musculares, escolha apenas os que se encaixam na lista permitida.",
    toolName: "salvar_treinos",
    toolDescription: "Registra os treinos e exercícios extraídos do PDF.",
    schema: schema as unknown as Record<string, unknown>,
  });
}
