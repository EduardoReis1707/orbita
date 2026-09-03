-- Mesma abordagem da migration profiles: RLS habilitado como defesa extra
-- (bloqueia acesso pela API REST do Supabase com a chave publishable/anon).
-- O app acessa via Prisma com o papel dono das tabelas, que não é afetado
-- por RLS sem FORCE, então continua funcionando normalmente.

ALTER TABLE "public"."weight_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."measurement_entries" ENABLE ROW LEVEL SECURITY;
