import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Rotas acessíveis sem login; usuários logados NÃO são redirecionados delas. */
const OPEN_PATHS = ["/", "/redefinir-senha", "/offline"];

/** Rotas de autenticação: sem login liberadas, com login mandam para o painel. */
const AUTH_PATHS = ["/entrar", "/cadastrar", "/recuperar-senha"];

function matches(pathname: string, list: string[]): boolean {
  return list.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isOpen = matches(pathname, OPEN_PATHS);
  const isAuth = matches(pathname, AUTH_PATHS);
  const isPublicRoute = pathname.startsWith("/auth/");

  if (!user && !isOpen && !isAuth && !isPublicRoute) {
    // Sinaliza pra tela de login que a pessoa foi trazida de uma rota protegida
    // (sessão ausente/expirada) e pra onde ela queria ir.
    const search = new URLSearchParams({ next: `${pathname}${request.nextUrl.search}` });
    return redirectTo(request, "/entrar", response, `?${search.toString()}`);
  }

  if (user && isAuth) {
    return redirectTo(request, "/painel", response);
  }

  return response;
}

function redirectTo(
  request: NextRequest,
  path: string,
  base: NextResponse,
  search = "",
) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = search;
  const redirect = NextResponse.redirect(url);
  // Copia o cabeçalho Set-Cookie inteiro dos cookies de sessão já revalidados,
  // preservando todas as flags (httpOnly, path, maxAge, sameSite). Reatribuir
  // via `cookies.set({ name, value })` perde essas opções e pode encurtar ou
  // corromper o cookie de sessão em qualquer redirect.
  for (const cookie of base.headers.getSetCookie()) {
    redirect.headers.append("set-cookie", cookie);
  }
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
