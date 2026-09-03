-- RLS como defesa extra (bloqueia a API REST do Supabase).
ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;
