-- RLS como defesa extra (bloqueia a API REST do Supabase).
ALTER TABLE "public"."meals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."food_items" ENABLE ROW LEVEL SECURITY;
