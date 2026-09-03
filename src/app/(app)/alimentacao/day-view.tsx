"use client";

import { useState } from "react";
import { CameraIcon, PencilIcon, PlusIcon, SparklesIcon } from "lucide-react";
import type { FoodItem, Meal } from "@prisma/client";

import { formatNumber } from "@/lib/metrics";
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  sumFoodItems,
} from "@/lib/nutrition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { deleteFoodItemAction, deleteMealAction } from "./actions";
import { FoodItemDialog } from "./food-item-dialog";
import { ImportMealsDialog } from "./import-dialog";
import { MealDialog } from "./meal-dialog";
import { MealPhotoDialog } from "./photo-dialog";

export type MealWithItems = Meal & { items: FoodItem[] };

export function DayView({
  date,
  meals,
  aiEnabled,
}: {
  date: string;
  meals: MealWithItems[];
  aiEnabled: boolean;
}) {
  const [creatingMeal, setCreatingMeal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [addingItemMealId, setAddingItemMealId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);

  const sortedMeals = [...meals].sort((a, b) => {
    const byType =
      MEAL_TYPE_ORDER.indexOf(a.type) - MEAL_TYPE_ORDER.indexOf(b.type);
    if (byType !== 0) return byType;
    return (a.time ?? "").localeCompare(b.time ?? "");
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        {aiEnabled ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPhoto(true)}
            >
              <CameraIcon />
              Estimar por foto
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImporting(true)}
            >
              <SparklesIcon />
              Importar PDF
            </Button>
          </>
        ) : null}
        <Button size="sm" onClick={() => setCreatingMeal(true)}>
          <PlusIcon />
          Adicionar refeição
        </Button>
      </div>

      {sortedMeals.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhuma refeição registrada neste dia.
        </p>
      ) : (
        sortedMeals.map((meal) => {
          const totals = sumFoodItems(meal.items);
          return (
            <Card key={meal.id} className="gap-0 py-0">
              <CardHeader className="flex-row items-center justify-between gap-2 border-b p-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {MEAL_TYPE_LABELS[meal.type]}
                    {meal.time ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {meal.time}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(totals.calories, 0)} kcal · P{" "}
                    {formatNumber(totals.proteinG, 0)} · C{" "}
                    {formatNumber(totals.carbsG, 0)} · G{" "}
                    {formatNumber(totals.fatG, 0)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Editar refeição"
                    onClick={() => setEditingMeal(meal)}
                  >
                    <PencilIcon />
                  </Button>
                  <ConfirmDeleteButton
                    action={deleteMealAction}
                    id={meal.id}
                    ariaLabel="Excluir refeição"
                    successMessage="Refeição excluída."
                  />
                </div>
              </CardHeader>
              <CardContent className="p-3">
                {meal.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem alimentos.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {meal.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {item.name}
                            {item.quantity ? (
                              <span className="text-muted-foreground">
                                {" "}
                                — {item.quantity}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.calories != null
                              ? `${formatNumber(item.calories, 0)} kcal`
                              : "kcal —"}
                            {" · P "}
                            {item.proteinG != null
                              ? formatNumber(item.proteinG, 0)
                              : "—"}
                            {" · C "}
                            {item.carbsG != null
                              ? formatNumber(item.carbsG, 0)
                              : "—"}
                            {" · G "}
                            {item.fatG != null
                              ? formatNumber(item.fatG, 0)
                              : "—"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Editar alimento"
                            onClick={() => setEditingItem(item)}
                          >
                            <PencilIcon />
                          </Button>
                          <ConfirmDeleteButton
                            action={deleteFoodItemAction}
                            id={item.id}
                            ariaLabel="Excluir alimento"
                            successMessage="Alimento excluído."
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setAddingItemMealId(meal.id)}
                >
                  <PlusIcon />
                  Adicionar alimento
                </Button>
              </CardContent>
            </Card>
          );
        })
      )}

      {aiEnabled ? (
        <>
          <ImportMealsDialog open={importing} onOpenChange={setImporting} />
          <MealPhotoDialog open={photo} onOpenChange={setPhoto} />
        </>
      ) : null}
      <MealDialog
        date={date}
        open={creatingMeal}
        onOpenChange={setCreatingMeal}
      />
      <MealDialog
        date={date}
        open={editingMeal !== null}
        onOpenChange={(open) => {
          if (!open) setEditingMeal(null);
        }}
        meal={editingMeal}
      />
      {addingItemMealId !== null ? (
        <FoodItemDialog
          mealId={addingItemMealId}
          open
          onOpenChange={(open) => {
            if (!open) setAddingItemMealId(null);
          }}
        />
      ) : null}
      {editingItem !== null ? (
        <FoodItemDialog
          mealId={editingItem.mealId}
          open
          onOpenChange={(open) => {
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
        />
      ) : null}
    </div>
  );
}
