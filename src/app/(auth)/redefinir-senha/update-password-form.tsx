"use client";

import { useActionState } from "react";

import { initialFormState } from "@/lib/forms";
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
import { FieldError, FormAlert, SubmitButton } from "@/components/form-feedback";
import { updatePasswordAction } from "../actions";

export function UpdatePasswordForm() {
  const [state, action] = useActionState(
    updatePasswordAction,
    initialFormState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Definir nova senha</CardTitle>
        <CardDescription>
          Escolha uma nova senha para a sua conta.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          <FormAlert state={state} />
          <div className="space-y-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <FieldError errors={state.fieldErrors?.password} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmar nova senha</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <FieldError errors={state.fieldErrors?.confirm} />
          </div>
        </CardContent>
        <CardFooter>
          <SubmitButton>Salvar nova senha</SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
