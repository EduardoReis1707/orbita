import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a chave secreta (service_role). Ignora RLS e só pode
 * ser usado no servidor. Usado para o Storage: o app é o único que fala com
 * o bucket, sempre depois de checar a posse pelo `profileId`.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY ausente. Adicione a chave secreta do Supabase em .env.local.",
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const STORAGE_BUCKET = "documentos";

export function isStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SECRET_KEY);
}
