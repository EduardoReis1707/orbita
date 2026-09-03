"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { formatDateBR, parseISODate, toISODate, todayISO } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DayNav({ date }: { date: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function go(iso: string) {
    router.replace(`${pathname}?d=${iso}`, { scroll: false });
  }

  function shift(days: number) {
    const base = parseISODate(date) ?? new Date();
    base.setUTCDate(base.getUTCDate() + days);
    go(toISODate(base));
  }

  const parsed = parseISODate(date);
  const isToday = date === todayISO();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Dia anterior"
        onClick={() => shift(-1)}
      >
        <ChevronLeftIcon />
      </Button>
      <div className="min-w-40 text-center">
        <p className="text-sm font-medium">
          {parsed ? formatDateBR(parsed) : date}
          {isToday ? " · hoje" : ""}
        </p>
      </div>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Próximo dia"
        onClick={() => shift(1)}
      >
        <ChevronRightIcon />
      </Button>
      <Input
        type="date"
        value={date}
        max={todayISO()}
        onChange={(event) => event.target.value && go(event.target.value)}
        className="w-auto"
        aria-label="Escolher data"
      />
    </div>
  );
}
