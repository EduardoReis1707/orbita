"use client";

import { useActionState } from "react";

import { initialFormState } from "@/lib/forms";
import {
  ACTIVITY_LEVEL_LABELS,
  ACTIVITY_LEVEL_VALUES,
  GOAL_TYPE_LABELS,
  GOAL_TYPE_VALUES,
  SEX_LABELS,
  SEX_VALUES,
} from "@/lib/profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError, FormAlert, SubmitButton } from "@/components/form-feedback";
import { completeOnboardingAction } from "./actions";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState(
    completeOnboardingAction,
    initialFormState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vamos configurar o seu perfil</CardTitle>
        <CardDescription>
          Só o objetivo é obrigatório. Os demais dados ajudam nos cálculos e
          podem ser preenchidos depois em Configurações.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          <FormAlert state={state} />

          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nome</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={defaultName}
              autoComplete="name"
              required
            />
            <FieldError errors={state.fieldErrors?.fullName} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goalType">Objetivo principal</Label>
            <Select name="goalType" required>
              <SelectTrigger id="goalType" className="w-full">
                <SelectValue placeholder="Selecione um objetivo" />
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Data de nascimento</Label>
              <Input id="birthDate" name="birthDate" type="date" />
              <FieldError errors={state.fieldErrors?.birthDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sex">Sexo</Label>
              <Select name="sex">
                <SelectTrigger id="sex" className="w-full">
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
              <FieldError errors={state.fieldErrors?.sex} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="heightCm">Altura (cm)</Label>
              <Input
                id="heightCm"
                name="heightCm"
                type="number"
                inputMode="numeric"
                min={80}
                max={260}
                placeholder="175"
              />
              <FieldError errors={state.fieldErrors?.heightCm} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="targetWeightKg">Peso-meta (kg)</Label>
              <Input
                id="targetWeightKg"
                name="targetWeightKg"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={20}
                max={400}
                placeholder="72"
              />
              <FieldError errors={state.fieldErrors?.targetWeightKg} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="activityLevel">Nível de atividade</Label>
            <Select name="activityLevel">
              <SelectTrigger id="activityLevel" className="w-full">
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_LEVEL_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {ACTIVITY_LEVEL_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={state.fieldErrors?.activityLevel} />
          </div>
        </CardContent>
        <CardFooter>
          <SubmitButton>Concluir e ir para o painel</SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
