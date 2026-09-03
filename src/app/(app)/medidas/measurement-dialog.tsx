"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { MeasurementEntry } from "@prisma/client";

import { toISODate, todayISO } from "@/lib/date";
import { MEASUREMENT_FIELDS } from "@/lib/measurements";
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
import { MeasurementInfo } from "@/components/measurement-info";
import { saveMeasurementEntryAction } from "./actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: MeasurementEntry | null;
};

export function MeasurementDialog({ open, onOpenChange, entry }: Props) {
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
      const result = await saveMeasurementEntryAction(formData);
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar medidas" : "Registrar medidas"}
          </DialogTitle>
          <DialogDescription>
            Preencha só o que você mediu. Um registro por dia — registrar de novo
            na mesma data substitui os valores.
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

          <div className="space-y-1.5">
            <Label htmlFor="m-date">Data</Label>
            <Input
              id="m-date"
              name="date"
              type="date"
              max={todayISO()}
              defaultValue={entry ? toISODate(entry.date) : todayISO()}
              required
            />
            <FieldError errors={fieldErrors.date} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {MEASUREMENT_FIELDS.map(({ key, label, howTo }) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor={`m-${key}`}>{label} (cm)</Label>
                  <MeasurementInfo label={label} howTo={howTo} />
                </div>
                <Input
                  id={`m-${key}`}
                  name={key}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min={10}
                  max={300}
                  defaultValue={entry?.[key] ?? ""}
                />
                <FieldError errors={fieldErrors[key]} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="m-bodyFatPct">Gordura (%)</Label>
              <Input
                id="m-bodyFatPct"
                name="bodyFatPct"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={1}
                max={70}
                defaultValue={entry?.bodyFatPct ?? ""}
              />
              <FieldError errors={fieldErrors.bodyFatPct} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-note">Observação (opcional)</Label>
            <Input
              id="m-note"
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
