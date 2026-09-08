/**
 * Utilitários para comparação período-a-período — "estou melhor que o mês
 * passado?". Mantido separado de `metrics.ts` para não colidir com outros
 * trabalhos em andamento nesse arquivo.
 */

export type Delta = {
  /** to − from */
  abs: number;
  /** variação percentual; null quando `from` é 0 (não dá pra dividir) */
  pct: number | null;
  dir: "up" | "down" | "flat";
};

/** Diferença entre dois valores. `flatEps` trata variações minúsculas como estáveis. */
export function computeDelta(from: number, to: number, flatEps = 0): Delta {
  const abs = to - from;
  const pct = from === 0 ? null : (abs / from) * 100;
  const dir = abs > flatEps ? "up" : abs < -flatEps ? "down" : "flat";
  return { abs, pct, dir };
}

const nf = (digits: number) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

type FormatDeltaOptions = {
  /** Casas decimais do valor absoluto (padrão 1). */
  digits?: number;
  /** Sufixo de unidade, ex.: "kg". */
  unit?: string;
  /** Inclui "(±x%)" quando houver percentual (padrão true). */
  withPct?: boolean;
};

/** "−2,3 kg (−2,6%)" — sinal com traço tipográfico, padrão pt-BR. */
export function formatDelta(d: Delta, options: FormatDeltaOptions = {}): string {
  const { digits = 1, unit, withPct = true } = options;
  const sign = d.abs > 0 ? "+" : d.abs < 0 ? "−" : "±";
  const value = nf(digits).format(Math.abs(d.abs));
  let text = `${sign}${value}${unit ? ` ${unit}` : ""}`;
  if (withPct && d.pct != null && Number.isFinite(d.pct)) {
    const pctSign = d.pct > 0 ? "+" : d.pct < 0 ? "−" : "±";
    text += ` (${pctSign}${nf(1).format(Math.abs(d.pct))}%)`;
  }
  return text;
}

/**
 * Token de cor para um delta, dado se "subir" é bom ou ruim para a métrica.
 * Peso pra quem quer emagrecer: subir é ruim. Volume de treino: subir é bom.
 */
export function deltaTone(
  d: Delta,
  goodDirection: "up" | "down" | "any" = "any",
): "success" | "destructive" | "muted" {
  if (d.dir === "flat" || goodDirection === "any") return "muted";
  const good = d.dir === goodDirection;
  return good ? "success" : "destructive";
}
