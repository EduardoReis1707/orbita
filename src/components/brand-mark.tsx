import { ActivityIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Marca do produto: quadrado com gradiente roxo e o ícone. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-sm shadow-primary/30",
        className,
      )}
    >
      <ActivityIcon className="size-4" />
    </span>
  );
}
