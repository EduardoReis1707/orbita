"use server";

import { revalidatePath } from "next/cache";
import type { ActivityLevel, GoalType, Sex } from "@prisma/client";

import { requireUser } from "@/lib/auth";
import type { FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import {
  ACTIVITY_LEVEL_VALUES,
  GOAL_TYPE_VALUES,
  SEX_VALUES,
} from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optInt(
  raw: string,
  min: number,
  max: number,
): number | undefined | null {
  if (raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return Math.round(value);
}

function optFloat(
  raw: string,
  min: number,
  max: number,
): number | undefined | null {
  if (raw === "") return undefined;
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return Math.round(value * 10) / 10;
}

export async function updateProfileAction(
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
  if (
    activityRaw &&
    !ACTIVITY_LEVEL_VALUES.includes(activityRaw as ActivityLevel)
  ) {
    fieldErrors.activityLevel = ["Opção inválida."];
  }

  let birthDate: Date | null = null;
  const birthRaw = str(formData, "birthDate");
  if (birthRaw) {
    const parsed = new Date(birthRaw);
    if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
      fieldErrors.birthDate = ["Data inválida."];
    } else {
      birthDate = parsed;
    }
  }

  const heightCm = optInt(str(formData, "heightCm"), 80, 260);
  if (heightCm === null) fieldErrors.heightCm = ["Entre 80 e 260 cm."];

  const targetWeightKg = optFloat(str(formData, "targetWeightKg"), 20, 400);
  if (targetWeightKg === null) {
    fieldErrors.targetWeightKg = ["Entre 20 e 400 kg."];
  }

  const targetCalories = optInt(str(formData, "targetCalories"), 0, 20000);
  const targetProteinG = optInt(str(formData, "targetProteinG"), 0, 2000);
  const targetCarbsG = optInt(str(formData, "targetCarbsG"), 0, 2000);
  const targetFatG = optInt(str(formData, "targetFatG"), 0, 2000);
  for (const [key, value] of [
    ["targetCalories", targetCalories],
    ["targetProteinG", targetProteinG],
    ["targetCarbsG", targetCarbsG],
    ["targetFatG", targetFatG],
  ] as const) {
    if (value === null) fieldErrors[key] = ["Valor inválido."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  await prisma.profile.update({
    where: { id: user.id },
    data: {
      fullName,
      goalType: goalTypeRaw as GoalType,
      sex: sexRaw ? (sexRaw as Sex) : null,
      activityLevel: activityRaw ? (activityRaw as ActivityLevel) : null,
      birthDate,
      heightCm: heightCm ?? null,
      targetWeightKg: targetWeightKg ?? null,
      targetCalories: targetCalories ?? null,
      targetProteinG: targetProteinG ?? null,
      targetCarbsG: targetCarbsG ?? null,
      targetFatG: targetFatG ?? null,
    },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/painel");
  revalidatePath("/medidas");
  revalidatePath("/alimentacao");
  return { status: "success", message: "Perfil atualizado." };
}

export async function changePasswordAction(
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const password = str(formData, "password");
  const confirm = str(formData, "confirm");

  if (password.length < 8) {
    return {
      status: "error",
      fieldErrors: { password: ["A senha precisa ter ao menos 8 caracteres."] },
    };
  }
  if (password !== confirm) {
    return {
      status: "error",
      fieldErrors: { confirm: ["As senhas não coincidem."] },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      status: "error",
      message: "Não foi possível trocar a senha. Tente novamente.",
    };
  }

  return { status: "success", message: "Senha atualizada." };
}
