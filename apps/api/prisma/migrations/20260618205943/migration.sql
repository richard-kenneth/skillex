-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'RECORDING_FEE';
ALTER TYPE "TransactionType" ADD VALUE 'RECORDING_REFUND';

-- AlterTable
ALTER TABLE "AppConfig" ADD COLUMN     "recordingPointsPerMinute" INTEGER NOT NULL DEFAULT 4;

-- AlterTable
ALTER TABLE "SessionRecording" ADD COLUMN     "billingUserId" TEXT,
ADD COLUMN     "recordingStartedAt" TIMESTAMP(3),
ADD COLUMN     "totalChargedPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalLockedPoints" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "SessionRecording" ADD CONSTRAINT "SessionRecording_billingUserId_fkey" FOREIGN KEY ("billingUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
