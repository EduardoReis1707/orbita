"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Abre um diálogo automaticamente quando a URL chega com `?<param>=<match>`
 * (ou com qualquer valor no `param`, se `match` for omitido) e então limpa o
 * parâmetro da URL. Usado pelos atalhos do painel ("Registrar peso", "Novo
 * treino"…) para abrir o formulário direto em vez de só navegar até a página.
 */
export function useOpenFromParam(param = "novo", match?: string): boolean {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const raw = searchParams.get(param);
  const shouldOpen = match ? raw === match : raw != null;
  const [open] = useState(shouldOpen);

  useEffect(() => {
    if (!shouldOpen) return;
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [shouldOpen, param, pathname, router, searchParams]);

  return open;
}
