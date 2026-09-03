-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('WORKOUT_PLAN', 'DIET_PLAN', 'ASSESSMENT', 'EXAM', 'REPORT', 'OTHER');

-- CreateTable
CREATE TABLE "file_documents" (
    "id" SERIAL NOT NULL,
    "profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "storage_path" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_documents_profile_id_category_idx" ON "file_documents"("profile_id", "category");

-- AddForeignKey
ALTER TABLE "file_documents" ADD CONSTRAINT "file_documents_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
