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
    return redirectTo(request, "/entrar", response);
  }

  if (user && isAuth) {
    return redirectTo(request, "/painel", response);
  }

  return response;
}

function redirectTo(request: NextRequest, path: string, base: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  base.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
