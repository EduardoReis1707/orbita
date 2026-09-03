"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { initialFormState, type FormState } from "@/lib/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormAlert } from "@/components/form-feedback";
import { changePasswordAction } from "./actions";

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>(initialFormState);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await changePasswordAction(formData);
      setState(result);
      if (result.status === "success") {
        toast.success(result.message ?? "Senha atualizada.");
        formRef.current?.reset();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trocar senha</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <FormAlert state={state} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-pass">Nova senha</Label>
              <Input
                id="new-pass"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <FieldError errors={state.fieldErrors?.password} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pass-confirm">Confirmar</Label>
              <Input
                id="new-pass-confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <FieldError errors={state.fieldErrors?.confirm} />
            </div>
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Salvando…" : "Atualizar senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
