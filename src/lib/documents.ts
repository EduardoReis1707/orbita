import type { DocumentCategory } from "@prisma/client";

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  WORKOUT_PLAN: "Ficha de treino",
  DIET_PLAN: "Plano alimentar",
  ASSESSMENT: "Avaliação física",
  EXAM: "Exame",
  REPORT: "Relatório",
  OTHER: "Outro",
};

export const DOCUMENT_CATEGORY_VALUES = Object.keys(
  DOCUMENT_CATEGORY_LABELS,
) as DocumentCategory[];

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

/** Formata bytes em KB/MB no padrão brasileiro. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(kb)} KB`;
  }
  const mb = kb / 1024;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(mb)} MB`;
}
