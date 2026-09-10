-- Limites persistentes do assistente e deduplicação de confirmações de importação.
CREATE TYPE "ImportKind" AS ENUM ('WORKOUTS', 'MEALS', 'MEASUREMENTS');

CREATE TABLE "ai_usage_windows" (
    "profile_id" UUID NOT NULL,
    "window_started_at" TIMESTAMPTZ(6) NOT NULL,
    "text_requests" INTEGER NOT NULL DEFAULT 0,
    "attachment_requests" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_windows_pkey" PRIMARY KEY ("profile_id", "window_started_at"),
    CONSTRAINT "ai_usage_windows_text_requests_nonnegative" CHECK ("text_requests" >= 0),
    CONSTRAINT "ai_usage_windows_attachment_requests_nonnegative" CHECK ("attachment_requests" >= 0),
    CONSTRAINT "ai_usage_windows_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "import_operations" (
    "id" BIGSERIAL NOT NULL,
    "profile_id" UUID NOT NULL,
    "kind" "ImportKind" NOT NULL,
    "request_id" UUID NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "result_message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_operations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "import_operations_profile_id_kind_request_id_key" UNIQUE ("profile_id", "kind", "request_id"),
    CONSTRAINT "import_operations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Essas tabelas são usadas apenas pelo servidor. O RLS também bloqueia
-- qualquer leitura ou gravação direta pela API REST do Supabase.
ALTER TABLE "public"."ai_usage_windows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."import_operations" ENABLE ROW LEVEL SECURITY;
