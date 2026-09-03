"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Goal, GoalMetric } from "@prisma/client";

import { toISODate } from "@/lib/date";
import { GOAL_METRIC_LABELS, GOAL_METRIC_VALUES, goalUnit } from "@/lib/goals";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/form-feedback";
import { saveGoalAction } from "./actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
};

export function GoalDialog({ open, onOpenChange, goal }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [metric, setMetric] = useState<GoalMetric>(goal?.metric ?? "WEIGHT");

  const editing = Boolean(goal);
  const unit = goalUnit(metric);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFieldErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await saveGoalAction(formData);
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
          <DialogTitle>{editing ? "Editar meta" : "Nova meta"}</DialogTitle>
          <DialogDescription>
            O progresso é calculado a partir dos seus registros, exceto na meta
            personalizada, que você atualiza à mão.
          </DialogDescription>
        </DialogHeader>
        <form
          key={goal?.id ?? "new"}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {goal ? <input type="hidden" name="id" value={goal.id} /> : null}
          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="g-title">Nome</Label>
            <Input
              id="g-title"
              name="title"
              defaultValue={goal?.title ?? ""}
              placeholder="Chegar a 88 kg"
              required
            />
            <FieldError errors={fieldErrors.title} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-metric">O que acompanhar</Label>
            <Select
              name="metric"
              value={metric}
              onValueChange={(value) =>
                setMetric((value as GoalMetric) ?? "WEIGHT")
              }
            >
              <SelectTrigger id="g-metric" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_METRIC_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {GOAL_METRIC_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={fieldErrors.metric} />
          </div>

          {metric === "MEASUREMENT" ? (
            <div className="space-y-1.5">
              <Label htmlFor="g-key">Circunferência</Label>
              <Select
                name="metricKey"
                defaultValue={goal?.metricKey ?? undefined}
              >
                <SelectTrigger id="g-key" className="w-full">
                  <SelectValue placeholder="Escolha" />
                </SelectTrigger>
                <SelectContent>
                  {MEASUREMENT_FIELDS.map(({ key, label }) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={fieldErrors.metricKey} />
            </div>
          ) : null}

          {metric === "EXERCISE_LOAD" ? (
            <div className="space-y-1.5">
              <Label htmlFor="g-key">Nome do exercício</Label>
              <Input
                id="g-key"
                name="metricKey"
                defaultValue={goal?.metricKey ?? ""}
                placeholder="Supino reto"
              />
              <p className="text-xs text-muted-foreground">
                Deve bater com o nome usado nos treinos.
              </p>
              <FieldError errors={fieldErrors.metricKey} />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-start">
                Valor inicial{unit ? ` (${unit})` : ""}
              </Label>
              <Input
                id="g-start"
                name="startValue"
                type="number"
                inputMode="decimal"
                step="0.1"
                defaultValue={goal?.startValue ?? ""}
                required
              />
              <FieldError errors={fieldErrors.startValue} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-target">
                Valor desejado{unit ? ` (${unit})` : ""}
              </Label>
              <Input
                id="g-target"
                name="targetValue"
                type="number"
                inputMode="decimal"
                step="0.1"
                defaultValue={goal?.targetValue ?? ""}
                required
              />
              <FieldError errors={fieldErrors.targetValue} />
            </div>
          </div>

          {metric === "CUSTOM" ? (
            <div className="space-y-1.5">
              <Label htmlFor="g-current">Valor atual</Label>
              <Input
                id="g-current"
                name="currentValue"
                type="number"
                inputMode="decimal"
                step="0.1"
                defaultValue={goal?.currentValue ?? ""}
              />
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="g-deadline">Prazo (opcional)</Label>
              <Input
                id="g-deadline"
                name="deadline"
                type="date"
                defaultValue={goal?.deadline ? toISODate(goal.deadline) : ""}
              />
              <FieldError errors={fieldErrors.deadline} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-desc">Descrição (opcional)</Label>
            <Input
              id="g-desc"
              name="description"
              defaultValue={goal?.description ?? ""}
              maxLength={300}
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
              {pending ? "Salvando…" : editing ? "Salvar" : "Criar meta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
