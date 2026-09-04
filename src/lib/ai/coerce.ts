import { parseISODate } from "@/lib/date";

/**
 * Helpers de coerção usados pelas ferramentas do assistente (`assistant-tools.ts`).
 * O modelo pode mandar números como string, com vírgula, fora de faixa ou nulos;
 * estas funções normalizam do mesmo jeito que os `import-actions.ts` das telas.
 */

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value.trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Número dentro de `[min, max]`, arredondado a `decimals` casas. Retorna `null`
 * se ausente/invivável — nunca lança. Valores fora da faixa são grampeados.
 */
export function clampNumber(
  value: unknown,
  min: number,
  max: number,
  decimals = 1,
): number | null {
  const n = toNumber(value);
  if (n == null) return null;
  const factor = 10 ** decimals;
  return Math.min(max, Math.max(min, Math.round(n * factor) / factor));
}

/**
 * Número dentro de `[min, max]`, arredondado a `decimals` casas — mas, ao
 * contrário de `clampNumber`, **recusa** (retorna `null`) um valor fora da
 * faixa em vez de forçá-lo pro limite. Use para valores que o usuário digitou
 * diretamente (peso, medidas) — igual ao comportamento das telas — onde
 * "grampear" um número absurdo (ex.: "8,4" de cintura virando 10 cm)
 * gravaria um dado errado silenciosamente.
 */
export function numberInRange(
  value: unknown,
  min: number,
  max: number,
  decimals = 1,
): number | null {
  const n = toNumber(value);
  if (n == null || n < min || n > max) return null;
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

/** Inteiro dentro de `[min, max]`. `null` se ausente/inválido. */
export function clampInt(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const n = toNumber(value);
  if (n == null) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Arredonda a 1 casa decimal. `null` se ausente/inválido. */
export function round1(value: unknown): number | null {
  const n = toNumber(value);
  return n == null ? null : Math.round(n * 10) / 10;
}

/**
 * `yyyy-mm-dd` -> `Date` (meia-noite UTC). Sem valor válido -> hoje.
 * Datas no futuro são recuadas para hoje (o app não aceita registro futuro).
 */
export function parseDateOrToday(value: unknown): Date {
  const parsed =
    typeof value === "string" ? parseISODate(value.trim()) : null;
  const date = parsed ?? new Date();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return date.getTime() > today.getTime() ? today : date;
}

/**
 * Devolve `value` se estiver em `allowed` (comparação frouxa, sem acento e
 * sem caixa); senão `fallback`. Útil para mapear rótulos que o modelo escreve.
 */
export function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback?: T,
): T | undefined {
  if (typeof value !== "string") return fallback;
  const norm = normalize(value);
  const hit = allowed.find((option) => normalize(option) === norm);
  return hit ?? fallback;
}

/** Texto aparado e limitado a `max` caracteres. `null` se vazio. */
export function trimTo(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

/** minúsculas, sem acento, sem espaço nas pontas — para casar rótulos. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}
