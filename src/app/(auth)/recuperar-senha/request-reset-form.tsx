"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

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
import { requestPasswordResetAction } from "../actions";

export function RequestResetForm() {
  const [state, action] = useActionState(
    requestPasswordResetAction,
    initialFormState,
  );
  const [email, setEmail] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          Enviaremos um link para você definir uma nova senha.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4 pb-6">
          <FormAlert state={state} />
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <FieldError errors={state.fieldErrors?.email} />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <SubmitButton>Enviar link</SubmitButton>
          <p className="text-sm text-muted-foreground">
            Lembrou a senha?{" "}
            <Link
              href="/entrar"
              className="font-medium text-foreground hover:underline"
            >
              Entrar
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
