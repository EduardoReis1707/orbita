-- CreateEnum
CREATE TYPE "WorkoutStatus" AS ENUM ('PLANNED', 'COMPLETED', 'SKIPPED');

-- CreateTable
CREATE TABLE "workouts" (
    "id" SERIAL NOT NULL,
    "profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "muscle_groups" TEXT[],
    "date" DATE NOT NULL,
    "duration_min" INTEGER,
    "status" "WorkoutStatus" NOT NULL DEFAULT 'COMPLETED',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" SERIAL NOT NULL,
    "workout_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "sets" INTEGER,
    "reps" INTEGER,
    "weight_kg" DOUBLE PRECISION,
    "rest_sec" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workouts_profile_id_date_idx" ON "workouts"("profile_id", "date");

-- CreateIndex
CREATE INDEX "workouts_profile_id_status_idx" ON "workouts"("profile_id", "status");

-- CreateIndex
CREATE INDEX "exercises_workout_id_idx" ON "exercises"("workout_id");

-- CreateIndex
CREATE INDEX "exercises_name_idx" ON "exercises"("name");

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
