"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { WeightEntry } from "@prisma/client";

import { toISODate, todayISO } from "@/lib/date";
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
import { saveWeightEntryAction } from "./actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: WeightEntry | null;
};

export function WeightDialog({ open, onOpenChange, entry }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const editing = Boolean(entry);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      const result = await saveWeightEntryAction(formData);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar peso" : "Registrar peso"}</DialogTitle>
          <DialogDescription>
            Um registro por dia. Registrar de novo na mesma data substitui o
            valor.
          </DialogDescription>
        </DialogHeader>
        <form
          key={entry?.id ?? "new"}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="w-date">Data</Label>
              <Input
                id="w-date"
                name="date"
                type="date"
                max={todayISO()}
                defaultValue={entry ? toISODate(entry.date) : todayISO()}
                required
              />
              <FieldError errors={fieldErrors.date} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-weight">Peso (kg)</Label>
              <Input
                id="w-weight"
                name="weightKg"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={20}
                max={400}
                defaultValue={entry?.weightKg ?? ""}
                placeholder="72,5"
                required
              />
              <FieldError errors={fieldErrors.weightKg} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="w-note">Observação (opcional)</Label>
            <Input
              id="w-note"
              name="note"
              defaultValue={entry?.note ?? ""}
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
