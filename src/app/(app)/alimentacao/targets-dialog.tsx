"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { NutritionTargets } from "@/lib/nutrition";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/form-feedback";
import { saveNutritionTargetsAction } from "./actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: {
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
  };
  suggestion: NutritionTargets | null;
};

export function TargetsDialog({
  open,
  onOpenChange,
  current,
  suggestion,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function applySuggestion() {
    if (!suggestion || !formRef.current) return;
    const form = formRef.current;
    (form.elements.namedItem("calories") as HTMLInputElement).value = String(
      suggestion.calories,
    );
    (form.elements.namedItem("protein") as HTMLInputElement).value = String(
      suggestion.proteinG,
    );
    (form.elements.namedItem("carbs") as HTMLInputElement).value = String(
      suggestion.carbsG,
    );
    (form.elements.namedItem("fat") as HTMLInputElement).value = String(
      suggestion.fatG,
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFieldErrors({});
    startTransition(async () => {
      const result = await saveNutritionTargetsAction(formData);
      if (result.status === "error") {
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.success(result.message ?? "Salvo.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Metas de nutrição</DialogTitle>
          <DialogDescription>
            Alvos diários de calorias e macronutrientes. Deixe em branco o que
            não quiser acompanhar.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-cal">Calorias (kcal)</Label>
              <Input
                id="t-cal"
                name="calories"
                type="number"
                min={0}
                defaultValue={current.calories ?? ""}
              />
              <FieldError errors={fieldErrors.calories} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-p">Proteína (g)</Label>
              <Input
                id="t-p"
                name="protein"
                type="number"
                min={0}
                defaultValue={current.proteinG ?? ""}
              />
              <FieldError errors={fieldErrors.protein} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-c">Carboidrato (g)</Label>
              <Input
                id="t-c"
                name="carbs"
                type="number"
                min={0}
                defaultValue={current.carbsG ?? ""}
              />
              <FieldError errors={fieldErrors.carbs} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-f">Gordura (g)</Label>
              <Input
                id="t-f"
                name="fat"
                type="number"
                min={0}
                defaultValue={current.fatG ?? ""}
              />
              <FieldError errors={fieldErrors.fat} />
            </div>
          </div>

          {suggestion ? (
            <button
              type="button"
              onClick={applySuggestion}
              className="text-xs font-medium text-primary hover:underline"
            >
              Usar sugestão: {suggestion.calories} kcal · {suggestion.proteinG}
              /{suggestion.carbsG}/{suggestion.fatG} g (P/C/G)
            </button>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar metas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
