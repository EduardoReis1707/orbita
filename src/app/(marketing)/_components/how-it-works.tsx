import { Reveal } from "./reveal";

const STEPS = [
  {
    n: "01",
    title: "Criar sua conta",
    line: "E-mail e senha. Leva um minuto.",
  },
  {
    n: "02",
    title: "Definir seu objetivo",
    line: "Peso, medidas ou desempenho, com o seu nível de atividade.",
  },
  {
    n: "03",
    title: "Registrar a rotina",
    line: "Treinos, refeições, peso e medidas conforme o dia a dia.",
  },
  {
    n: "04",
    title: "Acompanhar a evolução",
    line: "Gráficos, metas e relatórios mostram o que mudou.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      data-lp-surface="light"
      className="lp-section lp-light overflow-x-clip"
      style={{
        background:
          "linear-gradient(180deg, var(--lp-dusk) 0%, var(--lp-paper) 22%, var(--lp-paper) 100%)",
      }}
    >
      <div className="mx-auto grid w-full max-w-[1400px] gap-16 px-[clamp(1rem,3.5vw,2.25rem)] py-[clamp(5rem,12vw,9rem)] lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="lp-eyebrow mb-4">Como funciona</p>
          <h2 className="lp-display mb-12 text-[clamp(1.9rem,4vw,3.1rem)]">
            Do cadastro ao gráfico.
          </h2>

          <Reveal className="flex flex-col">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 border-t border-[color:var(--lp-line)] py-6 first:border-t-0"
              >
                <span className="font-mono text-sm text-[#5b93ff]">{s.n}</span>
                <h3 className="text-[1.1rem] font-semibold tracking-tight">
                  {s.title}
                </h3>
                <span />
                <p className="lp-dim max-w-[44ch] text-[0.92rem] leading-relaxed">
                  {s.line}
                </p>
              </div>
            ))}
          </Reveal>
        </div>

        <div className="relative hidden aspect-square w-full max-w-[460px] justify-self-center lg:block">
          <svg
            viewBox="0 0 400 400"
            fill="none"
            className="lp-arc-ring absolute inset-0 h-full w-full text-[color:var(--lp-line-strong)] [transform-origin:50%_50%]"
            aria-hidden
          >
            <circle
              cx="200"
              cy="200"
              r="150"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2 10"
            />
            <circle
              cx="200"
              cy="200"
              r="110"
              stroke="currentColor"
              strokeWidth="1"
            />
            {STEPS.map((_, i) => {
              const a = (i / STEPS.length) * Math.PI * 2 - Math.PI / 2;
              return (
                <circle
                  key={i}
                  cx={200 + Math.cos(a) * 150}
                  cy={200 + Math.sin(a) * 150}
                  r={i === 3 ? 6 : 3.5}
                  fill={i === 3 ? "#4f8cff" : "currentColor"}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="font-mono text-[2.6rem] font-semibold tracking-tight text-[var(--lp-fg)]">
                04
              </div>
              <p className="lp-eyebrow mt-1">passos</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
