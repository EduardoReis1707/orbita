"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const lastPushed = useRef(initialQuery);

  const go = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === lastPushed.current.trim()) return;
    lastPushed.current = trimmed;
    router.replace(
      trimmed ? `/busca?q=${encodeURIComponent(trimmed)}` : "/busca",
    );
  };

  // Busca conforme se digita (com um respiro de 300 ms), sem precisar clicar.
  useEffect(() => {
    const id = setTimeout(() => go(value), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go(value);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Buscar treinos, exercícios, alimentos, metas, arquivos…"
          className="w-full pl-8"
          autoFocus
        />
      </div>
      <Button type="submit">Buscar</Button>
    </form>
  );
}
