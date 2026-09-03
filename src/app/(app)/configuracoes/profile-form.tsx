"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Profile } from "@prisma/client";

import { toISODate } from "@/lib/date";
import {
  ACTIVITY_LEVEL_LABELS,
  ACTIVITY_LEVEL_VALUES,
  GOAL_TYPE_LABELS,
  GOAL_TYPE_VALUES,
  SEX_LABELS,
  SEX_VALUES,
} from "@/lib/profile";
import { initialFormState, type FormState } from "@/lib/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FieldError, FormAlert } from "@/components/form-feedback";
import { updateProfileAction } from "./actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>(initialFormState);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateProfileAction(formData);
      setState(result);
      if (result.status === "success") {
        toast.success(result.message ?? "Salvo.");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormAlert state={state} />

          <div className="space-y-1.5">
            <Label htmlFor="p-name">Nome</Label>
            <Input
              id="p-name"
              name="fullName"
              defaultValue={profile.fullName}
              required
            />
            <FieldError errors={state.fieldErrors?.fullName} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-birth">Data de nascimento</Label>
              <Input
                id="p-birth"
                name="birthDate"
                type="date"
                defaultValue={
                  profile.birthDate ? toISODate(profile.birthDate) : ""
                }
              />
              <FieldError errors={state.fieldErrors?.birthDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-sex">Sexo</Label>
              <Select
                name="sex"
                defaultValue={profile.sex ?? undefined}
                items={SEX_LABELS}
              >
                <SelectTrigger id="p-sex" className="w-full">
                  <SelectValue placeholder="Não informar" />
                </SelectTrigger>
                <SelectContent>
                  {SEX_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {SEX_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-height">Altura (cm)</Label>
              <Input
                id="p-height"
                name="heightCm"
                type="number"
                min={80}
                max={260}
                defaultValue={profile.heightCm ?? ""}
              />
              <FieldError errors={state.fieldErrors?.heightCm} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-target">Peso-meta (kg)</Label>
              <Input
                id="p-target"
                name="targetWeightKg"
                type="number"
                step="0.1"
                min={20}
                max={400}
                defaultValue={profile.targetWeightKg ?? ""}
              />
              <FieldError errors={state.fieldErrors?.targetWeightKg} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-goal">Objetivo principal</Label>
              <Select
                name="goalType"
                defaultValue={profile.goalType ?? undefined}
                items={GOAL_TYPE_LABELS}
              >
                <SelectTrigger id="p-goal" className="w-full">
                  <SelectValue placeholder="Escolha" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {GOAL_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={state.fieldErrors?.goalType} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-activity">Nível de atividade</Label>
              <Select
                name="activityLevel"
                defaultValue={profile.activityLevel ?? undefined}
                items={ACTIVITY_LEVEL_LABELS}
              >
                <SelectTrigger id="p-activity" className="w-full">
                  <SelectValue placeholder="Não informar" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVEL_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {ACTIVITY_LEVEL_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <fieldset className="space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">
              Metas de nutrição (diárias)
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-cal">Calorias</Label>
                <Input
                  id="p-cal"
                  name="targetCalories"
                  type="number"
                  min={0}
                  defaultValue={profile.targetCalories ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-prot">Proteína (g)</Label>
                <Input
                  id="p-prot"
                  name="targetProteinG"
                  type="number"
                  min={0}
                  defaultValue={profile.targetProteinG ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-carb">Carbo (g)</Label>
                <Input
                  id="p-carb"
                  name="targetCarbsG"
                  type="number"
                  min={0}
                  defaultValue={profile.targetCarbsG ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-fat">Gordura (g)</Label>
                <Input
                  id="p-fat"
                  name="targetFatG"
                  type="number"
                  min={0}
                  defaultValue={profile.targetFatG ?? ""}
                />
              </div>
            </div>
          </fieldset>

          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar perfil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
