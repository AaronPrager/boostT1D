/*
  Warnings:

  - Added the required column `category` to the `NewsSource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `website` to the `NewsSource` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "NewsSource" ADD COLUMN     "apiUrl" TEXT,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "website" TEXT NOT NULL,
ALTER COLUMN "rssUrl" DROP NOT NULL;
