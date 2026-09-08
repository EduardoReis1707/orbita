export const PERIOD_OPTIONS = [
  { value: "7d", label: "7 dias", days: 7 },
  { value: "30d", label: "30 dias", days: 30 },
  { value: "90d", label: "3 meses", days: 90 },
  { value: "180d", label: "6 meses", days: 180 },
  { value: "365d", label: "1 ano", days: 365 },
  { value: "all", label: "Tudo", days: null },
] as const;

export type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];

export const DEFAULT_PERIOD: PeriodValue = "90d";

export function resolvePeriod(value: string | undefined): PeriodValue {
  const match = PERIOD_OPTIONS.find((option) => option.value === value);
  return match ? match.value : DEFAULT_PERIOD;
}

/** Data de corte (inclusive) para o período, ou null para "tudo". */
export function periodStartDate(value: PeriodValue): Date | null {
  const option = PERIOD_OPTIONS.find((o) => o.value === value);
  if (!option || option.days == null) return null;
  const date = new Date();
  date.setDate(date.getDate() - option.days);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Número de dias do período, ou null para "tudo". */
export function periodDays(value: PeriodValue): number | null {
  return PERIOD_OPTIONS.find((o) => o.value === value)?.days ?? null;
}

/** Rótulo curto do período (ex.: "30 dias"). */
export function periodLabel(value: PeriodValue): string {
  return PERIOD_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
