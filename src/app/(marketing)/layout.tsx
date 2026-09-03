import type { ReactNode } from "react";
import Link from "next/link";
import { ActivityIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ActivityIcon className="size-4" />
            </span>
            <span className="font-heading text-sm font-semibold">
              Auxiliar de Treino
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" render={<Link href="/entrar" />}>
              Entrar
            </Button>
            <Button size="sm" render={<Link href="/cadastrar" />}>
              Criar conta
            </Button>
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
