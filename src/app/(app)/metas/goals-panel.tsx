"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2Icon, PencilIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import type { Goal } from "@prisma/client";

import { formatDateBR } from "@/lib/date";
import { formatNumber } from "@/lib/metrics";
import { MEASUREMENT_FIELDS } from "@/lib/measurements";
import type { GoalProgress } from "@/lib/goals";

/** Rótulo legível para a chave interna de uma meta (ex.: waistCm → Cintura). */
function metricKeyLabel(key: string): string {
  return MEASUREMENT_FIELDS.find((f) => f.key === key)?.label ?? key;
}
import { cn } from "@/lib/utils";
import { useOpenFromParam } from "@/lib/use-open-from-param";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  deleteGoalAction,
  setGoalStatusAction,
  updateGoalValueAction,
} from "./actions";
import { GoalDialog } from "./goal-dialog";

export type GoalCardData = Goal & {
  progress: GoalProgress;
  daysLeft: number | null;
  unit: string;
  metricLabel: string;
};

export function GoalsPanel({ goals }: { goals: GoalCardData[] }) {
  const [creating, setCreating] = useState(useOpenFromParam("novo", "1"));
  const [editing, setEditing] = useState<Goal | null>(null);

  const active = goals.filter((g) => g.status === "ACTIVE");
  const done = goals.filter((g) => g.status !== "ACTIVE");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating(true)}>
          <PlusIcon />
          Nova meta
        </Button>
      </div>

      {goals.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhuma meta ainda. Crie a primeira com o botão acima.
        </p>
      ) : (
        <div className="space-y-4">
          {active.length > 0 ? (
            <ul className="space-y-2">
              {active.map((goal) => (
                <GoalRow key={goal.id} goal={goal} onEdit={setEditing} />
              ))}
            </ul>
          ) : null}

          {done.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Concluídas e abandonadas
              </p>
              <ul className="space-y-2">
                {done.map((goal) => (
                  <GoalRow key={goal.id} goal={goal} onEdit={setEditing} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <GoalDialog open={creating} onOpenChange={setCreating} />
      <GoalDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        goal={editing}
      />
    </div>
  );
}

function GoalRow({
  goal,
  onEdit,
}: {
  goal: GoalCardData;
  onEdit: (goal: Goal) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { progress } = goal;

  function changeStatus(status: "ACHIEVED" | "ACTIVE") {
    const formData = new FormData();
    formData.set("id", String(goal.id));
    formData.set("status", status);
    startTransition(async () => {
      await setGoalStatusAction(formData);
      toast.success(status === "ACHIEVED" ? "Meta concluída." : "Meta reaberta.");
      router.refresh();
    });
  }

  function updateValue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateGoalValueAction(formData);
      if (result.status === "success") {
        toast.success("Valor atualizado.");
        (event.target as HTMLFormElement).reset();
        router.refresh();
      } else {
        toast.error(result.message ?? "Não foi possível atualizar.");
      }
    });
  }

  const overdue =
    goal.status === "ACTIVE" && goal.daysLeft != null && goal.daysLeft < 0;

  return (
    <li>
      <Card className={cn("py-0", goal.status !== "ACTIVE" && "opacity-70")}>
        <CardContent className="space-y-3 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{goal.title}</p>
              <p className="text-xs text-muted-foreground">
                {goal.metricLabel}
                {goal.metricKey ? ` · ${metricKeyLabel(goal.metricKey)}` : ""}
                {" · "}
                {formatNumber(goal.startValue)} → {formatNumber(goal.targetValue)}
                {goal.unit ? ` ${goal.unit}` : ""}
              </p>
              {goal.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {goal.description}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Editar meta"
                onClick={() => onEdit(goal)}
              >
                <PencilIcon />
              </Button>
              <ConfirmDeleteButton
                action={deleteGoalAction}
                id={goal.id}
                ariaLabel="Excluir meta"
                successMessage="Meta excluída."
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {progress.current == null
                  ? "Sem dados para calcular"
                  : `Atual: ${formatNumber(progress.current)}${goal.unit ? ` ${goal.unit}` : ""}`}
              </span>
              <span className="font-medium tabular-nums">
                {progress.percent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  progress.achieved ? "bg-success" : "bg-primary",
                )}
                style={{ width: `${Math.max(2, progress.percent)}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {progress.achieved
                  ? "Alvo alcançado"
                  : progress.remaining != null
                    ? `Faltam ${formatNumber(progress.remaining)}${goal.unit ? ` ${goal.unit}` : ""}`
                    : ""}
              </span>
              {goal.deadline ? (
                <span className={cn(overdue && "text-destructive")}>
                  {formatDateBR(goal.deadline)}
                  {goal.status === "ACTIVE" && goal.daysLeft != null
                    ? goal.daysLeft >= 0
                      ? ` · faltam ${goal.daysLeft}d`
                      : ` · ${Math.abs(goal.daysLeft)}d atrás`
                    : ""}
                </span>
              ) : null}
            </div>
          </div>

          {goal.status === "ACTIVE" ? (
            <div className="flex flex-wrap items-center gap-2">
              {goal.metric === "CUSTOM" ? (
                <form
                  onSubmit={updateValue}
                  className="flex items-center gap-1.5"
                >
                  <input type="hidden" name="id" value={goal.id} />
                  <Input
                    name="currentValue"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    placeholder="Novo valor"
                    className="h-7 w-28"
                  />
                  <Button type="submit" size="xs" variant="outline" disabled={pending}>
                    Atualizar
                  </Button>
                </form>
              ) : null}
              {progress.achieved ? (
                <Button
                  size="xs"
                  disabled={pending}
                  onClick={() => changeStatus("ACHIEVED")}
                >
                  <CheckCircle2Icon />
                  Confirmar conclusão
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  goal.status === "ACHIEVED"
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {goal.status === "ACHIEVED" ? "Concluída" : "Abandonada"}
              </span>
              <Button
                size="xs"
                variant="ghost"
                disabled={pending}
                onClick={() => changeStatus("ACTIVE")}
              >
                <RotateCcwIcon />
                Reabrir
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </li>
  );
}
