/*
  Warnings:

  - You are about to drop the `NewsArticle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NewsBookmark` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NewsInteraction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NewsPreference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NewsSource` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "NewsArticle" DROP CONSTRAINT "NewsArticle_sourceId_fkey";

-- DropForeignKey
ALTER TABLE "NewsBookmark" DROP CONSTRAINT "NewsBookmark_articleId_fkey";

-- DropForeignKey
ALTER TABLE "NewsBookmark" DROP CONSTRAINT "NewsBookmark_userId_fkey";

-- DropForeignKey
ALTER TABLE "NewsInteraction" DROP CONSTRAINT "NewsInteraction_articleId_fkey";

-- DropForeignKey
ALTER TABLE "NewsInteraction" DROP CONSTRAINT "NewsInteraction_userId_fkey";

-- DropForeignKey
ALTER TABLE "NewsPreference" DROP CONSTRAINT "NewsPreference_userId_fkey";

-- DropTable
DROP TABLE "NewsArticle";

-- DropTable
DROP TABLE "NewsBookmark";

-- DropTable
DROP TABLE "NewsInteraction";

-- DropTable
DROP TABLE "NewsPreference";

-- DropTable
DROP TABLE "NewsSource";
