"use server";

import { revalidatePath } from "next/cache";
import type { GoalMetric, GoalStatus } from "@prisma/client";

import { requireUser } from "@/lib/auth";
import { parseISODate } from "@/lib/date";
import type { FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { GOAL_METRIC_VALUES } from "@/lib/goals";
import { MEASUREMENT_KEYS } from "@/lib/measurements";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function num(raw: string): number | null {
  if (raw === "") return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function revalidateGoals() {
  revalidatePath("/metas");
  revalidatePath("/painel");
}

export async function saveGoalAction(formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const fieldErrors: Record<string, string[]> = {};

  const idRaw = str(formData, "id");
  const editingId = idRaw ? Number(idRaw) : null;

  const title = str(formData, "title");
  if (title.length < 2) fieldErrors.title = ["Dê um nome à meta."];

  const metricRaw = str(formData, "metric");
  if (!GOAL_METRIC_VALUES.includes(metricRaw as GoalMetric)) {
    fieldErrors.metric = ["Escolha o que a meta acompanha."];
  }
  const metric = metricRaw as GoalMetric;

  let metricKey: string | null = str(formData, "metricKey") || null;
  if (metric === "MEASUREMENT") {
    if (!metricKey || !(MEASUREMENT_KEYS as string[]).includes(metricKey)) {
      fieldErrors.metricKey = ["Escolha a circunferência."];
    }
  } else if (metric === "EXERCISE_LOAD") {
    if (!metricKey) fieldErrors.metricKey = ["Informe o nome do exercício."];
  } else {
    metricKey = null;
  }

  const startValue = num(str(formData, "startValue"));
  if (startValue == null) fieldErrors.startValue = ["Informe o valor inicial."];

  const targetValue = num(str(formData, "targetValue"));
  if (targetValue == null) fieldErrors.targetValue = ["Informe o valor desejado."];

  if (
    startValue != null &&
    targetValue != null &&
    Math.abs(startValue - targetValue) < 1e-6
  ) {
    fieldErrors.targetValue = ["O valor desejado deve ser diferente do inicial."];
  }

  const deadline = str(formData, "deadline")
    ? parseISODate(str(formData, "deadline"))
    : null;
  if (str(formData, "deadline") && !deadline) {
    fieldErrors.deadline = ["Data inválida."];
  }

  const description = str(formData, "description") || null;

  const currentValue =
    metric === "CUSTOM" ? num(str(formData, "currentValue")) : null;

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  const data = {
    title,
    description,
    metric,
    metricKey,
    startValue: startValue as number,
    targetValue: targetValue as number,
    currentValue: metric === "CUSTOM" ? (currentValue ?? startValue) : null,
    deadline,
  };

  if (editingId) {
    const result = await prisma.goal.updateMany({
      where: { id: editingId, profileId: user.id },
      data,
    });
    if (result.count === 0) {
      return { status: "error", message: "Meta não encontrada." };
    }
  } else {
    await prisma.goal.create({ data: { profileId: user.id, ...data } });
  }

  revalidateGoals();
  return {
    status: "success",
    message: editingId ? "Meta atualizada." : "Meta criada.",
  };
}

export async function deleteGoalAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await prisma.goal.deleteMany({ where: { id, profileId: user.id } });
  revalidateGoals();
}

export async function setGoalStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const statusRaw = String(formData.get("status"));
  if (
    !Number.isInteger(id) ||
    !["ACTIVE", "ACHIEVED", "ABANDONED"].includes(statusRaw)
  ) {
    return;
  }
  const status = statusRaw as GoalStatus;
  await prisma.goal.updateMany({
    where: { id, profileId: user.id },
    data: {
      status,
      achievedAt: status === "ACHIEVED" ? new Date() : null,
    },
  });
  revalidateGoals();
}

export async function updateGoalValueAction(
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const value = num(str(formData, "currentValue"));
  if (!Number.isInteger(id) || value == null) {
    return { status: "error", message: "Valor inválido." };
  }
  const result = await prisma.goal.updateMany({
    where: { id, profileId: user.id, metric: "CUSTOM" },
    data: { currentValue: value },
  });
  if (result.count === 0) {
    return { status: "error", message: "Meta não encontrada." };
  }
  revalidateGoals();
  return { status: "success", message: "Valor atualizado." };
}
