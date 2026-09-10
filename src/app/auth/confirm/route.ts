import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Recebe os links de confirmação de e-mail e de recuperação de senha enviados
 * pelo Supabase, valida o token (`verifyOtp`) e encaminha para `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/painel";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      const fallback = new URL("/painel", request.url);
      let destination = fallback;
      try {
        const candidate = new URL(next, request.url);
        if (candidate.origin === fallback.origin) destination = candidate;
      } catch {
        // Destinos malformados usam o painel.
      }
      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(
    new URL("/entrar?erro=link-invalido", request.url),
  );
}
