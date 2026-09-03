"use client";

import { useEffect, useState } from "react";
import { HelpCircleIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Revela o texto caractere a caractere, com um cursor piscando no fim. */
function TypedText({ text }: { text: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCount((current) => (current >= text.length ? current : current + 1));
    }, 18);
    return () => window.clearInterval(id);
  }, [text]);

  return (
    <span>
      {text.slice(0, count)}
      {count < text.length ? (
        <span className="ml-px inline-block w-1 animate-pulse">▍</span>
      ) : null}
    </span>
  );
}

/**
 * Ícone de ajuda que, ao passar o mouse (desktop) ou tocar (mobile), abre
 * uma caixa flutuante com a descrição "sendo digitada".
 */
export function MeasurementInfo({
  label,
  howTo,
}: {
  label: string;
  howTo: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`Como medir ${label}`}
            onClick={() => setOpen((value) => !value)}
          />
        }
        className="text-muted-foreground transition-colors hover:text-primary"
      >
        <HelpCircleIcon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[15rem] text-left leading-relaxed">
        {open ? <TypedText text={howTo} /> : null}
      </TooltipContent>
    </Tooltip>
  );
}
