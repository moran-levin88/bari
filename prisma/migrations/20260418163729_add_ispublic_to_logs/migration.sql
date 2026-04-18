-- AlterTable
ALTER TABLE "StepLog" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "WaterLog" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "WeightLog" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;
