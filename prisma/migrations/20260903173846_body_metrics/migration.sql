-- AlterTable
ALTER TABLE "profiles" ALTER COLUMN "onboarded_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "weight_entries" (
    "id" SERIAL NOT NULL,
    "profile_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "weight_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurement_entries" (
    "id" SERIAL NOT NULL,
    "profile_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "neck_cm" DOUBLE PRECISION,
    "chest_cm" DOUBLE PRECISION,
    "waist_cm" DOUBLE PRECISION,
    "hip_cm" DOUBLE PRECISION,
    "arm_cm" DOUBLE PRECISION,
    "thigh_cm" DOUBLE PRECISION,
    "calf_cm" DOUBLE PRECISION,
    "body_fat_pct" DOUBLE PRECISION,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "measurement_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weight_entries_profile_id_date_idx" ON "weight_entries"("profile_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "weight_entries_profile_id_date_key" ON "weight_entries"("profile_id", "date");

-- CreateIndex
CREATE INDEX "measurement_entries_profile_id_date_idx" ON "measurement_entries"("profile_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_entries_profile_id_date_key" ON "measurement_entries"("profile_id", "date");

-- AddForeignKey
ALTER TABLE "weight_entries" ADD CONSTRAINT "weight_entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement_entries" ADD CONSTRAINT "measurement_entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
