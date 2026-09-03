-- A aplicação acessa o banco via Prisma com o papel dono da tabela (`postgres`),
-- que não é afetado por RLS sem FORCE, então continua funcionando normalmente.
-- Habilitar RLS aqui serve como defesa adicional: bloqueia o acesso à tabela
-- pela API REST automática do Supabase (chave publishable/anon), que não deve
-- ler dados de perfil.

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- Sem políticas: nenhum acesso via PostgREST para os papéis `anon` e
-- `authenticated`. Se no futuro quisermos expor o perfil pela API do
-- Supabase, adicionamos políticas com `auth.uid() = id`.
