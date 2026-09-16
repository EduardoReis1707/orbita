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
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { signUpAction } from "../actions";

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initialFormState);
  // Mantém nome e e-mail após um erro (o React reseta o form ao concluir a action).
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>
          Comece a acompanhar os seus treinos e a sua evolução.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4 pb-6">
          <FormAlert state={state} />
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nome</Label>
            <Input
              id="fullName"
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <FieldError errors={state.fieldErrors?.fullName} />
          </div>
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
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <FieldError errors={state.fieldErrors?.password} />
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <SubmitButton>Criar conta</SubmitButton>
          <div className="flex w-full items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleSignInButton />
          <p className="text-sm text-muted-foreground">
            Já tem conta?{" "}
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
