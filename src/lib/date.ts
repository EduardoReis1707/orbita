const civilDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data civil do produto em Sao Paulo, no formato yyyy-mm-dd. */
export function todayISO(now: Date = new Date()): string {
  const parts = civilDateFormatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)!.value;
  return [part("year").padStart(4, "0"), part("month"), part("day")].join("-");
}

/** Converte `yyyy-mm-dd` para um `Date` (meia-noite UTC). Retorna null se inválido. */
export function parseISODate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || toISODate(date) !== value ? null : date;
}

/** `Date` -> `yyyy-mm-dd` usando os componentes UTC. */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

/** "03/09/2026" */
export function formatDateBR(date: Date): string {
  return dateFormatter.format(date);
}

/** "03 set" — para eixos de gráfico */
export function formatDateShort(date: Date): string {
  return shortDateFormatter.format(date);
}
