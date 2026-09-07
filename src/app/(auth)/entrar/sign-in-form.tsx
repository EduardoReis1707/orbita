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
import { signInAction } from "../actions";

export function SignInForm() {
  const [state, action] = useActionState(signInAction, initialFormState);
  // Mantém o e-mail digitado após um erro (o React reseta o form ao concluir a action).
  const [email, setEmail] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          Acesse a sua conta do Auxiliar de Treino.
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
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link
                href="/recuperar-senha"
                className="text-xs text-muted-foreground hover:underline"
              >
                Esqueci a senha
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <FieldError errors={state.fieldErrors?.password} />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <SubmitButton>Entrar</SubmitButton>
          <p className="text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link
              href="/cadastrar"
              className="font-medium text-foreground hover:underline"
            >
              Cadastre-se
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
