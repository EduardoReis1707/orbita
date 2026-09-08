import { Reveal } from "./reveal";

const PERIODS = ["7 dias", "30 dias", "3 meses", "6 meses", "1 ano", "tudo"];

export function Showcase() {
  return (
    <section
      id="evolucao"
      data-lp-surface="light"
      className="lp-section lp-light overflow-x-clip bg-[var(--lp-paper)]"
    >
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-14 px-[clamp(1rem,3.5vw,2.25rem)] py-[clamp(5rem,12vw,9rem)] lg:grid-cols-[0.82fr_1.18fr]">
        <Reveal className="flex flex-col">
          <p className="lp-eyebrow mb-4">Evolução</p>
          <h2 className="lp-display mb-5 text-[clamp(1.9rem,4vw,3.1rem)]">
            Veja o que mudou, no período que importar.
          </h2>
          <p className="lp-dim mb-8 max-w-[46ch] text-[0.95rem] leading-relaxed">
            Gráficos de peso, medidas e desempenho — de 7 dias a personalizado.
            A linha da meta acompanha o traçado, então dá pra saber o quanto
            falta sem fazer conta.
          </p>
          <ul className="flex flex-wrap gap-2">
            {PERIODS.map((p, i) => (
              <li
                key={p}
                className={`border px-3 py-1.5 text-[0.78rem] ${
                  i === 2
                    ? "border-[#4f8cff] bg-[color-mix(in_srgb,#4f8cff_10%,transparent)] text-[#2f6ae0]"
                    : "border-[color:var(--lp-line-strong)] text-[color:var(--lp-dim)]"
                }`}
              >
                {p}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="flex">
          <figure className="relative w-full border border-[color:var(--lp-line-strong)] bg-[var(--lp-panel)] p-6 sm:p-8 lg:-mr-[10%]">
            <figcaption className="lp-eyebrow mb-6 flex items-center justify-between">
              <span>peso · kg</span>
              <span className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-px w-4 bg-[#4f8cff]" />
                  registrado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-px w-4 border-t border-dashed border-[color:var(--lp-mute)]" />
                  meta
                </span>
              </span>
            </figcaption>

            <svg viewBox="0 0 620 300" fill="none" className="w-full">
              <g stroke="var(--lp-line)" strokeWidth="1">
                {[60, 120, 180, 240].map((y) => (
                  <line key={y} x1="0" y1={y} x2="620" y2={y} />
                ))}
              </g>
              <path
                d="M0 96 L88 120 L176 108 L264 150 L352 138 L440 176 L528 168 L620 196 L620 300 L0 300 Z"
                fill="#4f8cff"
                fillOpacity="0.09"
              />
              <line
                x1="0"
                y1="150"
                x2="620"
                y2="214"
                stroke="var(--lp-mute)"
                strokeWidth="1.5"
                strokeDasharray="3 5"
              />
              <polyline
                points="0,96 88,120 176,108 264,150 352,138 440,176 528,168 620,196"
                stroke="#4f8cff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="352" cy="138" r="4.5" fill="#4f8cff" />
              <g transform="translate(352 138)">
                <rect
                  x="-34"
                  y="-42"
                  width="68"
                  height="28"
                  rx="3"
                  fill="var(--lp-fg)"
                />
                <text
                  x="0"
                  y="-23"
                  textAnchor="middle"
                  fontSize="13"
                  fill="var(--lp-panel)"
                >
                  78,4 kg
                </text>
              </g>
            </svg>

            <div className="lp-eyebrow mt-4 flex justify-between">
              {["mar", "abr", "mai", "jun", "jul", "ago"].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
