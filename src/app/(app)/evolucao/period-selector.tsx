"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { PERIOD_OPTIONS, type PeriodValue } from "./period";

export function PeriodSelector({ current }: { current: PeriodValue }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(value: PeriodValue) {
    const params = new URLSearchParams(searchParams);
    params.set("p", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-1 rounded-lg border p-1">
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => select(option.value)}
          aria-pressed={current === option.value}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            current === option.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
