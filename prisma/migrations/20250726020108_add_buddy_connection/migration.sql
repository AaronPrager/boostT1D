-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "data" JSONB,
ADD COLUMN     "diagnosisAge" INTEGER,
ADD COLUMN     "favoriteActivities" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "state" TEXT;

-- CreateTable
CREATE TABLE "BuddyConnection" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuddyConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuddyConnection_requesterId_idx" ON "BuddyConnection"("requesterId");

-- CreateIndex
CREATE INDEX "BuddyConnection_targetId_idx" ON "BuddyConnection"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "BuddyConnection_requesterId_targetId_key" ON "BuddyConnection"("requesterId", "targetId");

-- AddForeignKey
ALTER TABLE "BuddyConnection" ADD CONSTRAINT "BuddyConnection_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyConnection" ADD CONSTRAINT "BuddyConnection_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
