-- RLS como defesa extra (bloqueia a API REST do Supabase).
ALTER TABLE "public"."goals" ENABLE ROW LEVEL SECURITY;
