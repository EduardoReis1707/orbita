import { cn } from "@/lib/utils";

/** Ícone da marca: um planeta com uma lua orbitando. Mesmas coordenadas
 * usadas em `src/app/icon.tsx` e `src/app/apple-icon.tsx` — qualquer ajuste
 * de forma deve ser replicado nos três lugares. */
function OrbitGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <circle cx="10" cy="14" r="5.5" />
      <circle cx="16.5" cy="7" r="2.6" />
    </svg>
  );
}

/** Marca do produto: quadrado com o gradiente azul-ciano da Órbita e o ícone. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-sm shadow-primary/30",
        className,
      )}
    >
      <OrbitGlyph className="size-4" />
    </span>
  );
}
