"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import type { FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import {
  ACTIVITY_LEVEL_VALUES,
  GOAL_TYPE_VALUES,
  SEX_VALUES,
} from "@/lib/profile";
import type { ActivityLevel, GoalType, Sex } from "@prisma/client";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function completeOnboardingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const fieldErrors: Record<string, string[]> = {};

  const fullName = str(formData, "fullName");
  if (fullName.length < 2) fieldErrors.fullName = ["Informe o seu nome."];

  const goalTypeRaw = str(formData, "goalType");
  if (!GOAL_TYPE_VALUES.includes(goalTypeRaw as GoalType)) {
    fieldErrors.goalType = ["Escolha um objetivo."];
  }

  const sexRaw = str(formData, "sex");
  if (sexRaw && !SEX_VALUES.includes(sexRaw as Sex)) {
    fieldErrors.sex = ["Opção inválida."];
  }

  const activityRaw = str(formData, "activityLevel");
  if (activityRaw && !ACTIVITY_LEVEL_VALUES.includes(activityRaw as ActivityLevel)) {
    fieldErrors.activityLevel = ["Opção inválida."];
  }

  let birthDate: Date | null = null;
  const birthDateRaw = str(formData, "birthDate");
  if (birthDateRaw) {
    const parsed = new Date(birthDateRaw);
    if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
      fieldErrors.birthDate = ["Data inválida."];
    } else {
      birthDate = parsed;
    }
  }

  let heightCm: number | null = null;
  const heightRaw = str(formData, "heightCm");
  if (heightRaw) {
    const value = Number(heightRaw);
    if (!Number.isFinite(value) || value < 80 || value > 260) {
      fieldErrors.heightCm = ["A altura deve estar entre 80 e 260 cm."];
    } else {
      heightCm = Math.round(value);
    }
  }

  let targetWeightKg: number | null = null;
  const targetRaw = str(formData, "targetWeightKg");
  if (targetRaw) {
    const value = Number(targetRaw.replace(",", "."));
    if (!Number.isFinite(value) || value < 20 || value > 400) {
      fieldErrors.targetWeightKg = ["O peso-meta deve estar entre 20 e 400 kg."];
    } else {
      targetWeightKg = Math.round(value * 10) / 10;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  const values = {
    fullName,
    goalType: goalTypeRaw as GoalType,
    sex: sexRaw ? (sexRaw as Sex) : null,
    activityLevel: activityRaw ? (activityRaw as ActivityLevel) : null,
    birthDate,
    heightCm,
    targetWeightKg,
    onboardedAt: new Date(),
  };

  await prisma.profile.upsert({
    where: { id: user.id },
    create: { id: user.id, ...values },
    update: values,
  });

  redirect("/assistente");
}
