import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

export function Cta() {
  return (
    <section
      data-lp-surface="light"
      className="lp-section lp-light overflow-x-clip bg-[var(--lp-paper)] pb-[clamp(4rem,10vw,7rem)]"
    >
      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-[var(--lp-void)] text-[#e8ecf1]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 120% at 12% 50%, color-mix(in srgb, #2fe4e0 16%, transparent), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid w-full max-w-[1400px] gap-10 px-[clamp(1rem,3.5vw,2.25rem)] py-[clamp(4rem,10vw,7.5rem)] lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="lp-eyebrow mb-4" style={{ color: "#8b95a4" }}>
              Pronto para começar
            </p>
            <h2 className="lp-display max-w-[16ch] text-[clamp(2.1rem,5vw,3.6rem)]">
              Comece a registrar hoje.
            </h2>
            <p
              className="mt-5 max-w-[44ch] text-[0.95rem] leading-relaxed"
              style={{ color: "#8b95a4" }}
            >
              Crie a sua conta, defina o seu objetivo e comece a registrar os
              seus treinos, medidas e alimentação.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/cadastrar" className="lp-btn lp-btn-primary">
              Criar conta
              <ArrowRightIcon />
            </Link>
            <Link
              href="/entrar"
              className="lp-btn lp-btn-ghost"
              style={{ borderColor: "rgb(255 255 255 / 0.16)", color: "#e8ecf1" }}
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
