import Link from "next/link";
import { CheckIcon } from "lucide-react";

type Plan = {
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  features: string[];
  cta: string;
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Base",
    tagline: "Pra quem tá começando a criar o hábito.",
    price: "Grátis",
    priceNote: "sem cartão pra começar",
    features: [
      "20 mensagens de IA a cada 10 min",
      "4 anexos a cada 10 min",
      "2 PDFs exportados a cada 10 min",
      "Treinos, alimentação, metas e evolução sem limite de registros",
    ],
    cta: "Começar grátis",
  },
  {
    name: "Ritmo",
    tagline: "Pra quem treina toda semana e quer o assistente sempre à mão.",
    price: "R$ 24,90",
    priceNote: "por mês · R$ 249/ano",
    features: [
      "60 mensagens de IA a cada 10 min",
      "12 anexos a cada 10 min",
      "12 PDFs exportados a cada 10 min",
      "Prioridade nas respostas do assistente",
    ],
    cta: "Assinar Ritmo",
    highlight: true,
  },
  {
    name: "Pico",
    tagline: "Uso pesado, sem pensar em limite.",
    price: "R$ 49,90",
    priceNote: "por mês · R$ 499/ano",
    features: [
      "200 mensagens de IA a cada 10 min",
      "40 anexos a cada 10 min",
      "40 PDFs exportados a cada 10 min",
      "Tudo do Ritmo, com folga de sobra",
    ],
    cta: "Assinar Pico",
  },
];

export function Pricing() {
  return (
    <section
      id="planos"
      data-lp-surface="dark"
      className="lp-section lp-dark overflow-x-clip"
      style={{
        background:
          "linear-gradient(180deg, var(--lp-paper) 0%, var(--lp-dusk) 14%, var(--lp-void) 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-[1400px] px-[clamp(1rem,3.5vw,2.25rem)] py-[clamp(5rem,12vw,9rem)]">
        <div className="mx-auto mb-14 max-w-[52ch] text-center">
          <p className="lp-eyebrow mb-4 justify-center">Planos</p>
          <h2 className="lp-display text-[clamp(1.9rem,4vw,3.1rem)]">
            Do primeiro treino ao seu melhor momento.
          </h2>
          <p className="lp-dim mx-auto mt-5 max-w-[44ch] text-[0.95rem] leading-relaxed">
            Comece de graça, sem cartão. Evolua pro seu ritmo quando fizer
            sentido — e cancele quando quiser, direto pelo app.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex flex-col gap-6 rounded-[6px] border p-7 lg:p-8 ${
                plan.highlight
                  ? "border-[#4f8cff] bg-[color-mix(in_srgb,#4f8cff_7%,var(--lp-panel-2))] shadow-[0_20px_60px_-24px_rgba(79,140,255,0.45)]"
                  : "border-[color:var(--lp-line)] bg-[var(--lp-panel-2)]"
              }`}
            >
              {plan.highlight ? (
                <span className="absolute -top-3 left-7 rounded-full bg-[var(--lp-blue)] px-3 py-1 text-[0.7rem] font-medium text-[#04122e]">
                  Mais escolhido
                </span>
              ) : null}

              <div>
                <h3 className="text-[1.3rem] font-semibold tracking-tight text-[var(--lp-fg)]">
                  {plan.name}
                </h3>
                <p className="lp-dim mt-1.5 text-[0.85rem] leading-relaxed">
                  {plan.tagline}
                </p>
              </div>

              <div>
                <span className="text-[2rem] font-semibold tracking-tight text-[var(--lp-fg)]">
                  {plan.price}
                </span>
                <p className="lp-mute mt-1 text-[0.75rem]">{plan.priceNote}</p>
              </div>

              <ul className="flex flex-1 flex-col gap-2.5 border-t border-[color:var(--lp-line)] pt-6">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[0.85rem] text-[var(--lp-fg)]"
                  >
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-[#5b93ff]" />
                    <span className="lp-dim">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/cadastrar"
                className={
                  plan.highlight ? "lp-btn lp-btn-primary" : "lp-btn lp-btn-ghost"
                }
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
