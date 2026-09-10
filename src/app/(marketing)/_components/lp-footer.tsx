import Link from "next/link";

const LINKS = [
  { href: "#recursos", label: "Recursos" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#evolucao", label: "Evolução" },
  { href: "/entrar", label: "Entrar" },
  { href: "/cadastrar", label: "Criar conta" },
];

export function LpFooter() {
  return (
    <footer
      data-lp-surface="dark"
      className="lp-section lp-dark overflow-x-clip bg-[var(--lp-void)]"
    >
      <div className="mx-auto w-full max-w-[1400px] px-[clamp(1rem,3.5vw,2.25rem)] pt-[clamp(4rem,9vw,7rem)] pb-10">
        <p className="lp-display text-[clamp(2.4rem,9vw,6.5rem)] leading-[0.9] text-[var(--lp-fg)]">
          Auxiliar
          <br />
          de Treino
        </p>

        <div className="mt-16 grid gap-10 border-t border-[color:var(--lp-line)] pt-8 md:grid-cols-[auto_1fr] md:gap-20">
          <nav className="flex flex-wrap gap-x-7 gap-y-2 text-[0.82rem]">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="lp-link">
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="lp-mute max-w-[64ch] text-[0.8rem] leading-relaxed md:justify-self-end md:text-right">
            Auxiliar de Treino — acompanhamento pessoal de treino, alimentação e
            evolução. As estimativas e dicas do sistema não substituem a
            avaliação de profissionais de saúde.
          </p>
        </div>

        <p className="lp-eyebrow mt-10">© 2026 Auxiliar de Treino</p>
      </div>
    </footer>
  );
}
