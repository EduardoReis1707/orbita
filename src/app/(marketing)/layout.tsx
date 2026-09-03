import type { ReactNode } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark />
            <span className="font-heading text-sm font-semibold">
              Auxiliar de Treino
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/entrar"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Entrar
            </Link>
            <Link href="/cadastrar" className={buttonVariants({ size: "sm" })}>
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-muted-foreground">
          <p>
            Auxiliar de Treino — acompanhamento pessoal de treino, alimentação e
            evolução. As estimativas e dicas do sistema não substituem a
            avaliação de profissionais de saúde.
          </p>
        </div>
      </footer>
    </div>
  );
}
