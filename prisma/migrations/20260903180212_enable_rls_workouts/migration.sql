-- RLS como defesa extra (bloqueia acesso pela API REST do Supabase).
-- O app usa Prisma com o papel dono das tabelas, não afetado sem FORCE.

ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;
