/*
  Warnings:

  - You are about to drop the column `darkMode` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `emailNotifications` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `privacyLevel` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `timeFormat` on the `Settings` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Settings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Settings" DROP CONSTRAINT "Settings_userId_fkey";

-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "darkMode",
DROP COLUMN "emailNotifications",
DROP COLUMN "language",
DROP COLUMN "privacyLevel",
DROP COLUMN "timeFormat",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "highGlucose" INTEGER NOT NULL DEFAULT 180,
ADD COLUMN     "lowGlucose" INTEGER NOT NULL DEFAULT 70,
ADD COLUMN     "nightscoutUrl" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "GlucoseReading" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sgv" DOUBLE PRECISION NOT NULL,
    "direction" TEXT,
    "source" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GlucoseReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treatment" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "glucoseValue" DOUBLE PRECISION,
    "carbsGrams" DOUBLE PRECISION,
    "insulinUnits" DOUBLE PRECISION,
    "insulinType" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GlucoseReading_userId_timestamp_idx" ON "GlucoseReading"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "Treatment_userId_timestamp_idx" ON "Treatment"("userId", "timestamp");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlucoseReading" ADD CONSTRAINT "GlucoseReading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
