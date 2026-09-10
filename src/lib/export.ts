/** Escapa um valor para uma célula CSV (RFC 4180). */
function csvCell(value: unknown): string {
  if (value == null) return "";
  const raw = String(value);
  // Valores numéricos mantêm o tipo; texto não pode iniciar fórmulas.
  const text = typeof value === "string" && /^[\s\u0000-\u001f]*[=+@-]|^[\t\r\n]/.test(raw)
    ? "'" + raw
    : raw;
  if (/[",\r\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Monta um CSV a partir de linhas e uma lista de colunas
 * `[chave, cabeçalho]`. Inclui BOM para o Excel abrir em UTF-8.
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: readonly (readonly [keyof T, string])[],
): string {
  const header = columns.map(([, label]) => csvCell(label)).join(",");
  const body = rows
    .map((row) => columns.map(([key]) => csvCell(row[key])).join(","))
    .join("\n");
  return `﻿${header}\n${body}\n`;
}

/** Cabeçalhos para forçar o download de um arquivo. */
export function downloadHeaders(
  filename: string,
  contentType: string,
): HeadersInit {
  return {
    "Content-Type": `${contentType}; charset=utf-8`,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}
