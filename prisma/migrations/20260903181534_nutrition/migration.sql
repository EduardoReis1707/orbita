-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'SUPPER', 'OTHER');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "target_calories" INTEGER,
ADD COLUMN     "target_carbs_g" INTEGER,
ADD COLUMN     "target_fat_g" INTEGER,
ADD COLUMN     "target_protein_g" INTEGER;

-- CreateTable
CREATE TABLE "meals" (
    "id" SERIAL NOT NULL,
    "profile_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "type" "MealType" NOT NULL,
    "time" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_items" (
    "id" SERIAL NOT NULL,
    "meal_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "calories" DOUBLE PRECISION,
    "protein_g" DOUBLE PRECISION,
    "carbs_g" DOUBLE PRECISION,
    "fat_g" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meals_profile_id_date_idx" ON "meals"("profile_id", "date");

-- CreateIndex
CREATE INDEX "food_items_meal_id_idx" ON "food_items"("meal_id");

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_items" ADD CONSTRAINT "food_items_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
