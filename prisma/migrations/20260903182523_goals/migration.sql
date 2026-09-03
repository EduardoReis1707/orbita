-- CreateEnum
CREATE TYPE "GoalMetric" AS ENUM ('WEIGHT', 'BODY_FAT', 'MEASUREMENT', 'EXERCISE_LOAD', 'WORKOUT_FREQUENCY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'ABANDONED');

-- CreateTable
CREATE TABLE "goals" (
    "id" SERIAL NOT NULL,
    "profile_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metric" "GoalMetric" NOT NULL,
    "metric_key" TEXT,
    "start_value" DOUBLE PRECISION NOT NULL,
    "target_value" DOUBLE PRECISION NOT NULL,
    "current_value" DOUBLE PRECISION,
    "deadline" DATE,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "achieved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_profile_id_status_idx" ON "goals"("profile_id", "status");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
