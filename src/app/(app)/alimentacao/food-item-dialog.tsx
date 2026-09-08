"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FoodItem } from "@prisma/client";

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
import { saveFoodItemAction } from "./actions";

type Props = {
  mealId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: FoodItem | null;
};

export function FoodItemDialog({ mealId, open, onOpenChange, item }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const editing = Boolean(item);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFieldErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await saveFoodItemAction(formData);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar alimento" : "Adicionar alimento"}
          </DialogTitle>
          <DialogDescription>
            Os valores nutricionais são estimativas suas — preencha o que
            souber.
          </DialogDescription>
        </DialogHeader>
        <form
          key={item?.id ?? "new"}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <input type="hidden" name="mealId" value={mealId} />
          {item ? <input type="hidden" name="id" value={item.id} /> : null}
          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="fi-name">Alimento</Label>
              <Input
                id="fi-name"
                name="name"
                defaultValue={item?.name ?? ""}
                placeholder="Peito de frango grelhado"
                required
              />
              <FieldError errors={fieldErrors.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fi-qty">Quantidade</Label>
              <Input
                id="fi-qty"
                name="quantity"
                defaultValue={item?.quantity ?? ""}
                placeholder="150 g"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fi-cal">kcal</Label>
              <Input
                id="fi-cal"
                name="calories"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                defaultValue={item?.calories ?? ""}
              />
              <FieldError errors={fieldErrors.calories} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fi-p">Prot. (g)</Label>
              <Input
                id="fi-p"
                name="proteinG"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                defaultValue={item?.proteinG ?? ""}
              />
              <FieldError errors={fieldErrors.proteinG} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fi-c">Carb. (g)</Label>
              <Input
                id="fi-c"
                name="carbsG"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                defaultValue={item?.carbsG ?? ""}
              />
              <FieldError errors={fieldErrors.carbsG} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fi-f">Gord. (g)</Label>
              <Input
                id="fi-f"
                name="fatG"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                defaultValue={item?.fatG ?? ""}
              />
              <FieldError errors={fieldErrors.fatG} />
            </div>
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
