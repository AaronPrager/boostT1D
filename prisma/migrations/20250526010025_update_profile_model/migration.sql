/*
  Warnings:

  - You are about to drop the column `bio` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `birthDate` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `occupation` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `nightscoutApiToken` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `BasalProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BasalRate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CarbRatio` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GlucoseReading` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Photo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sensitivity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TargetRange` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `data` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Treatment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BasalProfile" DROP CONSTRAINT "BasalProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "BasalRate" DROP CONSTRAINT "BasalRate_profileId_fkey";

-- DropForeignKey
ALTER TABLE "CarbRatio" DROP CONSTRAINT "CarbRatio_profileId_fkey";

-- DropForeignKey
ALTER TABLE "GlucoseReading" DROP CONSTRAINT "GlucoseReading_userId_fkey";

-- DropForeignKey
ALTER TABLE "Photo" DROP CONSTRAINT "Photo_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Sensitivity" DROP CONSTRAINT "Sensitivity_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Settings" DROP CONSTRAINT "Settings_userId_fkey";

-- DropForeignKey
ALTER TABLE "TargetRange" DROP CONSTRAINT "TargetRange_profileId_fkey";

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "bio",
DROP COLUMN "birthDate",
DROP COLUMN "location",
DROP COLUMN "occupation",
DROP COLUMN "phoneNumber",
DROP COLUMN "website",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "data" JSONB NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "nightscoutApiToken";

-- AlterTable
ALTER TABLE "Treatment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "timestamp" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "password";

-- DropTable
DROP TABLE "BasalProfile";

-- DropTable
DROP TABLE "BasalRate";

-- DropTable
DROP TABLE "CarbRatio";

-- DropTable
DROP TABLE "GlucoseReading";

-- DropTable
DROP TABLE "Photo";

-- DropTable
DROP TABLE "Sensitivity";

-- DropTable
DROP TABLE "TargetRange";

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Reading" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sgv" INTEGER NOT NULL,
    "direction" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Reading_userId_date_idx" ON "Reading"("userId", "date");

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- First, add the updatedAt column as nullable
ALTER TABLE "Treatment" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Set the initial value for all existing rows
UPDATE "Treatment" SET "updatedAt" = "createdAt";

-- Now make the column required
ALTER TABLE "Treatment" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Drop unused tables and columns
DROP TABLE IF EXISTS "GlucoseReading";
DROP TABLE IF EXISTS "Photo";
DROP TABLE IF EXISTS "BasalProfile";
DROP TABLE IF EXISTS "BasalRate";
DROP TABLE IF EXISTS "CarbRatio";
DROP TABLE IF EXISTS "Sensitivity";
DROP TABLE IF EXISTS "TargetRange";

-- Remove unused columns
ALTER TABLE "Settings" DROP COLUMN IF EXISTS "nightscoutApiToken";
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";

-- Drop existing Profile table and recreate it
DROP TABLE IF EXISTS "Profile";

-- Create new Profile table
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE INDEX "Reading_userId_date_idx" ON "Reading"("userId", "date");
CREATE INDEX "Treatment_userId_timestamp_idx" ON "Treatment"("userId", "timestamp");

-- Add foreign key constraints
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
