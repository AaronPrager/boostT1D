-- CreateTable
CREATE TABLE "BasalProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BasalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasalRate" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BasalRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BasalProfile_userId_idx" ON "BasalProfile"("userId");

-- CreateIndex
CREATE INDEX "BasalRate_profileId_idx" ON "BasalRate"("profileId");

-- AddForeignKey
ALTER TABLE "BasalProfile" ADD CONSTRAINT "BasalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasalRate" ADD CONSTRAINT "BasalRate_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "BasalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
