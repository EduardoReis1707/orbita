"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { ScrambleText } from "./scramble-text";

const NAV = [
  { id: "recursos", label: "Recursos" },
  { id: "como-funciona", label: "Como funciona" },
  { id: "evolucao", label: "Evolução" },
];

export function CornerChrome() {
  const [surface, setSurface] = useState<"dark" | "light">("dark");
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const surfaces = Array.from(
      document.querySelectorAll<HTMLElement>("[data-lp-surface]"),
    );
    let raf = 0;
    const measure = () => {
      raf = 0;
      const probe = 76;
      let current: "dark" | "light" = "dark";
      for (const el of surfaces) {
        const r = el.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) {
          current = (el.dataset.lpSurface as "dark" | "light") ?? "dark";
        }
      }
      setSurface(current);

      let seen: string | null = null;
      for (const { id } of NAV) {
        const s = document.getElementById(id);
        if (!s) continue;
        const r = s.getBoundingClientRect();
        if (r.top <= window.innerHeight * 0.4 && r.bottom >= 120) seen = id;
      }
      setActive(seen);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header className="lp-chrome" data-surface={surface}>
      <div className="flex items-center gap-2.5">
        <BrandMark className="rounded-[4px]" />
        <span className="font-sans text-[0.82rem] font-semibold tracking-tight">
          Órbita
        </span>
      </div>

      <nav className="lp-chrome-nav hidden items-center gap-7 pt-1.5 text-[0.78rem] md:flex">
        {NAV.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            data-active={active === item.id}
          >
            <ScrambleText text={item.label} trigger="hover" duration={420} />
          </a>
        ))}
      </nav>
      <div className="md:hidden" />

      <div className="flex items-center justify-end gap-2.5">
        <Link
          href="/entrar"
          className="hidden text-[0.78rem] text-[color:var(--lp-chrome-dim)] transition-colors hover:text-[color:var(--lp-chrome-fg)] sm:block"
        >
          Entrar
        </Link>
        <Link
          href="/cadastrar"
          className="inline-flex h-8 items-center rounded-[3px] bg-[var(--lp-blue)] px-3 text-[0.78rem] font-medium text-[#04122e] transition-[background-color,box-shadow] hover:bg-[color-mix(in_srgb,var(--lp-blue)_88%,white)] hover:shadow-[0_8px_28px_-10px_color-mix(in_srgb,var(--lp-cyan)_60%,transparent)]"
        >
          Criar conta
        </Link>
      </div>
    </header>
  );
}
