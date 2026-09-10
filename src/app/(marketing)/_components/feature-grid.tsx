import { ArrowUpRightIcon } from "lucide-react";

import { HERO_MOCKS } from "./hero-card-mocks";
import { Reveal } from "./reveal";

const mock = (key: string) => HERO_MOCKS.find((m) => m.key === key)?.node ?? null;

type Feature = {
  n: string;
  title: string;
  description: string;
  mock: string;
  size: "big" | "small";
  spanClass: string;
};

const FEATURES: Feature[] = [
  {
    n: "01",
    title: "Dashboard consolidada",
    description:
      "Peso, IMC, treinos da semana e progresso das metas em cards e gráficos fáceis de ler.",
    mock: "area",
    size: "big",
    spanClass: "lg:col-span-7",
  },
  {
    n: "02",
    title: "Treinos com histórico",
    description:
      "Registre exercícios, séries, repetições e cargas e acompanhe a evolução ao longo do tempo.",
    mock: "workout",
    size: "small",
    spanClass: "lg:col-span-5",
  },
  {
    n: "03",
    title: "Alimentação",
    description:
      "Refeições, calorias e macronutrientes, comparados com as suas metas diárias.",
    mock: "macros",
    size: "small",
    spanClass: "lg:col-span-5",
  },
  {
    n: "04",
    title: "Metas objetivas",
    description:
      "Defina objetivos de peso, medidas, carga ou frequência e veja o percentual concluído.",
    mock: "goals",
    size: "big",
    spanClass: "lg:col-span-7",
  },
  {
    n: "05",
    title: "Evolução visual",
    description:
      "Gráficos de peso, medidas e desempenho por período: 7 dias, 30 dias, 3 meses ou personalizado.",
    mock: "imc",
    size: "big",
    spanClass: "lg:col-span-7",
  },
  {
    n: "06",
    title: "Seus documentos",
    description:
      "Fichas de treino, planos alimentares e avaliações físicas em PDF, organizados num só lugar.",
    mock: "doc",
    size: "small",
    spanClass: "lg:col-span-5",
  },
];

function MockPane({ node, className }: { node: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-[var(--lp-panel-2)] text-[#39424e] transition-colors duration-300 group-hover:text-[#5b93ff] ${className ?? ""}`}
    >
      <div className="absolute inset-0">{node}</div>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, transparent 55%, var(--lp-bg) 100%)",
        }}
      />
    </div>
  );
}

export function FeatureGrid() {
  return (
    <section
      id="recursos"
      data-lp-surface="dark"
      className="lp-section lp-dark overflow-x-clip"
      style={{
        background:
          "linear-gradient(180deg, var(--lp-void) 0%, var(--lp-dusk) 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-[1400px] px-[clamp(1rem,3.5vw,2.25rem)] py-[clamp(5rem,12vw,9rem)]">
        <div className="mb-14 max-w-[52ch] lg:pl-[8%]">
          <p className="lp-eyebrow mb-4">O que você acompanha</p>
          <h2 className="lp-display text-[clamp(1.9rem,4vw,3.1rem)]">
            Seis áreas, um só registro.
          </h2>
        </div>

        <Reveal className="grid grid-cols-1 border-t border-l border-[color:var(--lp-line)] md:grid-cols-2 lg:grid-cols-12">
          {FEATURES.map((f) => (
            <article
              key={f.n}
              className={`group relative flex border-r border-b border-[color:var(--lp-line)] ${f.spanClass} ${
                f.size === "big" ? "flex-col sm:flex-row" : "flex-col"
              }`}
            >
              {f.size === "small" && (
                <MockPane node={mock(f.mock)} className="h-44 w-full" />
              )}

              <div
                className={`flex flex-1 flex-col justify-between gap-10 p-7 lg:p-9 ${
                  f.size === "big" ? "sm:max-w-[52%]" : ""
                }`}
              >
                <span className="lp-eyebrow">{f.n}</span>
                <div>
                  <h3 className="mb-2.5 text-[1.15rem] font-semibold tracking-tight text-[var(--lp-fg)]">
                    {f.title}
                  </h3>
                  <p className="lp-dim max-w-[42ch] text-[0.92rem] leading-relaxed">
                    {f.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-[0.8rem] text-[#5b93ff] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    ver no app
                    <ArrowUpRightIcon className="size-3.5" />
                  </span>
                </div>
              </div>

              {f.size === "big" && (
                <MockPane
                  node={mock(f.mock)}
                  className="min-h-44 flex-1 border-t border-[color:var(--lp-line)] sm:border-t-0 sm:border-l"
                />
              )}
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
