/*
  Warnings:

  - You are about to drop the column `isActive` on the `BasalProfile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `BasalProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BasalProfile" DROP COLUMN "isActive",
ADD COLUMN     "carbsHr" INTEGER,
ADD COLUMN     "delay" INTEGER,
ADD COLUMN     "dia" DOUBLE PRECISION,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "units" TEXT;

-- CreateTable
CREATE TABLE "CarbRatio" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CarbRatio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sensitivity" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Sensitivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetRange" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TargetRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarbRatio_profileId_idx" ON "CarbRatio"("profileId");

-- CreateIndex
CREATE INDEX "Sensitivity_profileId_idx" ON "Sensitivity"("profileId");

-- CreateIndex
CREATE INDEX "TargetRange_profileId_idx" ON "TargetRange"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "BasalProfile_userId_key" ON "BasalProfile"("userId");

-- AddForeignKey
ALTER TABLE "CarbRatio" ADD CONSTRAINT "CarbRatio_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "BasalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sensitivity" ADD CONSTRAINT "Sensitivity_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "BasalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetRange" ADD CONSTRAINT "TargetRange_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "BasalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
