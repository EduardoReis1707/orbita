"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton({ next = "/onboarding" }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);

    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);

    const supabase = createClient();
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
    });

    if (oauthError || !data.url) {
      setLoading(false);
      setError("Não foi possível iniciar o login com Google. Tente novamente.");
      return;
    }

    window.location.assign(data.url);
  }

  return (
    <div className="w-full space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={signInWithGoogle}
        disabled={loading}
      >
        <span aria-hidden="true" className="font-semibold text-primary">G</span>
        {loading ? "Abrindo Google…" : "Continuar com Google"}
      </Button>
      {error ? <p role="alert" className="text-center text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
