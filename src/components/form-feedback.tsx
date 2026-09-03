"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";

export function SubmitButton({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className={cn("w-full", className)} disabled={pending}>
      {pending ? "Aguarde…" : children}
    </Button>
  );
}

export function FormAlert({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;

  const success = state.status === "success";
  const Icon = success ? CircleCheckIcon : CircleAlertIcon;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        success
          ? "border-success/30 bg-success/10 text-foreground"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          success ? "text-success" : "text-destructive",
        )}
      />
      <p>{state.message}</p>
    </div>
  );
}

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-destructive">{errors[0]}</p>;
}
