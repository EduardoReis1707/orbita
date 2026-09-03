"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Meal } from "@prisma/client";

import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from "@/lib/nutrition";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/form-feedback";
import { saveMealAction } from "./actions";

type Props = {
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal?: Meal | null;
};

export function MealDialog({ date, open, onOpenChange, meal }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const editing = Boolean(meal);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFieldErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await saveMealAction(formData);
      if (result.status === "error") {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message ?? null);
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
          <DialogTitle>
            {editing ? "Editar refeição" : "Nova refeição"}
          </DialogTitle>
          <DialogDescription>
            Depois de criar, adicione os alimentos.
          </DialogDescription>
        </DialogHeader>
        <form
          key={meal?.id ?? "new"}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <input type="hidden" name="date" value={date} />
          {meal ? <input type="hidden" name="id" value={meal.id} /> : null}
          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="meal-type">Refeição</Label>
            <Select name="type" defaultValue={meal?.type ?? "LUNCH"}>
              <SelectTrigger id="meal-type" className="w-full">
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meal-time">Horário (opcional)</Label>
            <Input
              id="meal-time"
              name="time"
              type="time"
              defaultValue={meal?.time ?? ""}
            />
            <FieldError errors={fieldErrors.time} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meal-note">Observação (opcional)</Label>
            <Input
              id="meal-note"
              name="note"
              defaultValue={meal?.note ?? ""}
              maxLength={200}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
