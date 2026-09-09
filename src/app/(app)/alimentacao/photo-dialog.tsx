"use client";

import type { MealType } from "@prisma/client";

import { todayISO } from "@/lib/date";
import { formatNumber } from "@/lib/metrics";
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  sumFoodItems,
} from "@/lib/nutrition";
import type {
  EstimatedFood,
  MealPhotoEstimate,
} from "@/lib/ai/estimate-meal-photo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoEstimateDialog } from "@/components/ai/photo-estimate-dialog";
import { confirmMealImportAction } from "./import-actions";

type MealValue = MealPhotoEstimate & { date: string };

function numOrNull(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function MealPhotoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <PhotoEstimateDialog<MealValue>
      open={open}
      onOpenChange={onOpenChange}
      endpoint="/api/estimar/alimentacao"
      title="Estimar refeição por foto"
      description="A IA identifica os alimentos e estima calorias e macros. Revise antes de salvar."
      disclaimer="Estimativa aproximada: sem balança e sem os rótulos, o erro pode passar de 30%. Ajuste os valores se você souber melhor."
      fileHint="Foto do prato (JPG, PNG ou WebP)"
      normalize={(raw) => ({
        ...(raw as MealPhotoEstimate),
        date: todayISO(),
      })}
      apply={(value, requestId) =>
        confirmMealImportAction([
          {
            type: value.mealType,
            date: value.date,
            time: null,
            note: value.note,
            items: value.foods.map((food) => ({
              name: food.name,
              quantity: food.portion,
              calories: food.calories,
              proteinG: food.proteinG,
              carbsG: food.carbsG,
              fatG: food.fatG,
            })),
          },
        ], requestId)
      }
      renderReview={(value, patch) => {
        function patchFood(index: number, changes: Partial<EstimatedFood>) {
          patch({
            foods: value.foods.map((food, i) =>
              i === index ? { ...food, ...changes } : food,
            ),
          });
        }
        const totals = sumFoodItems(
          value.foods.map((f) => ({
            calories: f.calories,
            proteinG: f.proteinG,
            carbsG: f.carbsG,
            fatG: f.fatG,
          })),
        );

        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="mp-type">Refeição</Label>
                <Select
                  items={MEAL_TYPE_LABELS}
                  value={
                    (MEAL_TYPE_ORDER.includes(value.mealType as MealType)
                      ? value.mealType
                      : "OTHER") as string
                  }
                  onValueChange={(v) => patch({ mealType: v ?? "OTHER" })}
                >
                  <SelectTrigger id="mp-type" className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPE_ORDER.map((v) => (
                      <SelectItem key={v} value={v}>
                        {MEAL_TYPE_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="mp-date">Data</Label>
                <Input
                  id="mp-date"
                  type="date"
                  value={value.date}
                  onChange={(e) => patch({ date: e.target.value })}
                  className="h-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              {value.foods.map((food, index) => (
                <div key={index} className="rounded-lg border p-2">
                  <Input
                    value={food.name}
                    onChange={(e) =>
                      patchFood(index, { name: e.target.value })
                    }
                    className="h-8"
                  />
                  <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                    {(
                      [
                        ["calories", "kcal"],
                        ["proteinG", "P (g)"],
                        ["carbsG", "C (g)"],
                        ["fatG", "G (g)"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key}>
                        <span className="text-[10px] text-muted-foreground">
                          {label}
                        </span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={food[key] ?? ""}
                          onChange={(e) =>
                            patchFood(index, {
                              [key]: numOrNull(e.target.value),
                            } as Partial<EstimatedFood>)
                          }
                          className="h-7"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Total estimado: {formatNumber(totals.calories, 0)} kcal · P{" "}
              {formatNumber(totals.proteinG, 0)} · C{" "}
              {formatNumber(totals.carbsG, 0)} · G {formatNumber(totals.fatG, 0)}
            </p>
          </div>
        );
      }}
    />
  );
}
