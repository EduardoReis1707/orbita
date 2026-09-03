import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/** Usuário autenticado da requisição atual, ou `null`. Memoizado por request. */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Garante um usuário logado; caso contrário redireciona para a tela de login. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/entrar");
  return user;
}

/** Perfil do usuário atual (tabela `profiles`), ou `null` se ainda não existir. */
export const getProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  return prisma.profile.findUnique({ where: { id: user.id } });
});
