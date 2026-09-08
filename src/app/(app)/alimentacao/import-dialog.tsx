"use client";

import { todayISO } from "@/lib/date";
import { formatNumber } from "@/lib/metrics";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from "@/lib/nutrition";
import type { ImportedMeal } from "@/lib/ai/import-meals";
import type { MealType } from "@prisma/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PdfImportDialog } from "@/components/ai/pdf-import-dialog";
import { confirmMealImportAction } from "./import-actions";

export function ImportMealsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <PdfImportDialog<ImportedMeal>
      open={open}
      onOpenChange={onOpenChange}
      endpoint="/api/importar/alimentacao"
      resultKey="meals"
      title="Importar plano alimentar de PDF"
      description="A IA lê o plano ou diário e monta as refeições. Você revê antes de salvar — confira os alimentos e os valores."
      emptyMessage="A IA não encontrou refeições neste PDF."
      normalize={(meal) => ({
        ...meal,
        date: meal.date ?? todayISO(),
        type: (MEAL_TYPE_ORDER.includes(meal.type as MealType)
          ? meal.type
          : "OTHER") as string,
      })}
      apply={confirmMealImportAction}
      renderCard={(meal, patch) => (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Select
              value={meal.type}
              onValueChange={(value) => patch({ type: value ?? "OTHER" })}
              items={MEAL_TYPE_LABELS}
            >
              <SelectTrigger aria-label="Tipo de refeição" className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPE_ORDER.map((value) => (
                  <SelectItem key={value} value={value}>
                    {MEAL_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              aria-label="Data da refeição"
              value={meal.date ?? todayISO()}
              onChange={(e) => patch({ date: e.target.value })}
              className="h-8 w-auto"
            />
          </div>
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {meal.items.map((item, i) => (
              <li key={i}>
                <span className="text-foreground">{item.name}</span>
                {item.quantity ? ` — ${item.quantity}` : ""}
                {item.calories != null
                  ? ` · ${formatNumber(item.calories, 0)} kcal`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    />
  );
}
