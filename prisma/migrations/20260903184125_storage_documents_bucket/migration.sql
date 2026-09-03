-- RLS na tabela de metadados (defesa extra; o app usa Prisma).
ALTER TABLE "public"."file_documents" ENABLE ROW LEVEL SECURITY;
