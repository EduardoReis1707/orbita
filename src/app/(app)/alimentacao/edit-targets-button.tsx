"use client";

import { useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";

import type { NutritionTargets } from "@/lib/nutrition";
import { Button } from "@/components/ui/button";
import { TargetsDialog } from "./targets-dialog";

type Props = {
  current: {
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
  };
  suggestion: NutritionTargets | null;
};

export function EditTargetsButton({ current, suggestion }: Props) {
  const [open, setOpen] = useState(false);
  const hasTargets =
    current.calories != null ||
    current.proteinG != null ||
    current.carbsG != null ||
    current.fatG != null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <SlidersHorizontalIcon />
        {hasTargets ? "Ajustar metas" : "Definir metas"}
      </Button>
      <TargetsDialog
        open={open}
        onOpenChange={setOpen}
        current={current}
        suggestion={suggestion}
      />
    </>
  );
}
