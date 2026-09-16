"use client";

import { useState } from "react";
import { ArrowUpRightIcon, CreditCardIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type SubscriptionCardProps = {
  plan: "FREE" | "PRO";
  status: string | null;
  statusLabel: string;
};

export function SubscriptionCard({ plan, status, statusLabel }: SubscriptionCardProps) {
  const [pending, setPending] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pro = plan === "PRO";

  async function openBilling(kind: "checkout" | "portal") {
    setPending(kind);
    setError(null);
    try {
      const response = await fetch(`/api/stripe/${kind}`, { method: "POST" });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Não foi possível abrir o Stripe.");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o Stripe.");
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <SparklesIcon className="size-4 text-primary" />
              Plano {pro ? "Pro" : "Gratuito"}
            </CardTitle>
            <CardDescription className="mt-1">
              {pro
                ? "Mais mensagens, anexos e exportações em PDF para acompanhar sua evolução."
                : "Use o app sem custo e assine quando quiser mais recursos."}
            </CardDescription>
          </div>
          <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {statusLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Gratuito: 20 mensagens, 4 anexos e 2 PDFs a cada 10 minutos.</p>
        <p>Pro: 60 mensagens, 12 anexos e 12 PDFs a cada 10 minutos.</p>
        {status === "past_due" ? (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-foreground">
            Há um pagamento pendente. Atualize sua forma de pagamento no Stripe.
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        {pro || status ? (
          <Button
            variant="outline"
            onClick={() => openBilling("portal")}
            disabled={pending !== null}
          >
            <CreditCardIcon />
            {pending === "portal" ? "Abrindo…" : "Gerenciar assinatura"}
          </Button>
        ) : (
          <Button onClick={() => openBilling("checkout")} disabled={pending !== null}>
            <ArrowUpRightIcon />
            {pending === "checkout" ? "Abrindo checkout…" : "Conhecer o plano Pro"}
          </Button>
        )}
        {error ? <p role="alert" className="text-center text-xs text-destructive">{error}</p> : null}
      </CardFooter>
    </Card>
  );
}
