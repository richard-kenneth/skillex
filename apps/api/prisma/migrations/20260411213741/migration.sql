/*
  Warnings:

  - The values [ACCEPTED,COMPLETED] on the enum `RequestStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `completionCriteria` on the `Exchange` table. All the data in the column will be lost.
  - You are about to drop the column `learnerId` on the `Exchange` table. All the data in the column will be lost.
  - You are about to drop the column `sessionCount` on the `Exchange` table. All the data in the column will be lost.
  - You are about to drop the column `sessionDuration` on the `Exchange` table. All the data in the column will be lost.
  - You are about to drop the column `teacherId` on the `Exchange` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `ExchangeRequest` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `isPredefined` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `comment` on the `Review` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[referralCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `receiverId` to the `Exchange` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderId` to the `Exchange` table without a default value. This is not possible if the table is not empty.
  - Added the required column `skillId` to the `ExchangeSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `messageKey` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('PENDING_CONSENT', 'RECORDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'CONVERTED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageKey" AS ENUM ('INTERESTED_IN_EXCHANGE', 'PROPOSE_TERMS', 'AGREE_TO_TERMS', 'PROPOSE_SLOTS', 'ACCEPT_SLOTS', 'PROPOSE_SCHEDULE', 'AVAILABLE_WEEKDAYS', 'AVAILABLE_WEEKENDS', 'NEED_MORE_TIME', 'REQUEST_RESCHEDULE', 'CONFIRM_SESSION', 'SESSION_WENT_WELL', 'SESSION_HAD_ISSUES', 'READY_TO_COMPLETE', 'THANKS_FOR_EXCHANGE');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewTag" AS ENUM ('GREAT_TEACHER', 'PATIENT', 'KNOWLEDGEABLE', 'ON_TIME', 'CLEAR_EXPLANATIONS', 'GOOD_COMMUNICATOR', 'WELL_PREPARED', 'WOULD_EXCHANGE_AGAIN', 'NEEDS_IMPROVEMENT', 'UNRESPONSIVE');

-- AlterEnum
BEGIN;
CREATE TYPE "RequestStatus_new" AS ENUM ('PENDING', 'REJECTED', 'COMMITTED', 'CANCELLED');
ALTER TABLE "public"."ExchangeRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ExchangeRequest" ALTER COLUMN "status" TYPE "RequestStatus_new" USING ("status"::text::"RequestStatus_new");
ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";
ALTER TYPE "RequestStatus_new" RENAME TO "RequestStatus";
DROP TYPE "public"."RequestStatus_old";
ALTER TABLE "ExchangeRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'EXCHANGE_COMMISSION';
ALTER TYPE "TransactionType" ADD VALUE 'FACILITATION_FEE';
ALTER TYPE "TransactionType" ADD VALUE 'WITHDRAWAL';
ALTER TYPE "TransactionType" ADD VALUE 'REFERRAL_REWARD';
ALTER TYPE "TransactionType" ADD VALUE 'REFERRAL_BONUS';

-- DropForeignKey
ALTER TABLE "Exchange" DROP CONSTRAINT "Exchange_learnerId_fkey";

-- DropForeignKey
ALTER TABLE "Exchange" DROP CONSTRAINT "Exchange_teacherId_fkey";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "sponsorLogo" TEXT,
ADD COLUMN     "sponsorName" TEXT,
ADD COLUMN     "sponsorUrl" TEXT;

-- AlterTable
ALTER TABLE "Exchange" DROP COLUMN "completionCriteria",
DROP COLUMN "learnerId",
DROP COLUMN "sessionCount",
DROP COLUMN "sessionDuration",
DROP COLUMN "teacherId",
ADD COLUMN     "offeredSkillDuration" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "offeredSkillSessions" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pointsPayerId" TEXT,
ADD COLUMN     "receiverCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receiverId" TEXT NOT NULL,
ADD COLUMN     "requestedSkillDuration" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "requestedSkillSessions" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "senderCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "senderId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ExchangeRequest" DROP COLUMN "message",
ADD COLUMN     "offeredSkillDuration" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "offeredSkillSessions" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pointsPayerId" TEXT,
ADD COLUMN     "pointsProposal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointsProposedBy" TEXT,
ADD COLUMN     "receiverAgreed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receiverAvailability" JSONB,
ADD COLUMN     "requestedSkillDuration" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "requestedSkillSessions" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "senderAgreed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "senderAvailability" JSONB;

-- AlterTable
ALTER TABLE "ExchangeSession" ADD COLUMN     "duration" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "skillId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "content",
DROP COLUMN "isPredefined",
ADD COLUMN     "messageKey" "MessageKey" NOT NULL,
ADD COLUMN     "offeredSkillDuration" INTEGER,
ADD COLUMN     "offeredSkillSessions" INTEGER,
ADD COLUMN     "pointsPayerId" TEXT,
ADD COLUMN     "pointsProposal" INTEGER,
ADD COLUMN     "requestedSkillDuration" INTEGER,
ADD COLUMN     "requestedSkillSessions" INTEGER;

-- AlterTable
ALTER TABLE "PointsTransaction" ADD COLUMN     "fiatAmount" DOUBLE PRECISION,
ADD COLUMN     "fiatCurrency" TEXT,
ADD COLUMN     "flwRef" TEXT,
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "comment",
ADD COLUMN     "tags" "ReviewTag"[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredCurrency" TEXT,
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredById" TEXT;

-- CreateTable
CREATE TABLE "SessionRecording" (
    "id" TEXT NOT NULL,
    "exchangeSessionId" TEXT NOT NULL,
    "recordingKey" TEXT,
    "recordingEgressId" TEXT,
    "recordingStatus" "RecordingStatus" NOT NULL DEFAULT 'RECORDING',
    "recordingExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordingConsent" (
    "id" TEXT NOT NULL,
    "exchangeSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consented" BOOLEAN NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordingConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposedSlot" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposedSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionChatMessage" (
    "id" TEXT NOT NULL,
    "exchangeSessionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionChatReadReceipt" (
    "id" TEXT NOT NULL,
    "exchangeSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionChatReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeChatMessage" (
    "id" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT,
    "fileKey" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "exchangeCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "facilitationFee" INTEGER NOT NULL DEFAULT 5,
    "withdrawalSpread" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
    "minWithdrawalPoints" INTEGER NOT NULL DEFAULT 200,
    "referralRewardReferrer" INTEGER NOT NULL DEFAULT 200,
    "referralRewardReferee" INTEGER NOT NULL DEFAULT 200,
    "referralBonusPerExchange" INTEGER NOT NULL DEFAULT 50,
    "referralBonusCap" INTEGER NOT NULL DEFAULT 500,
    "referralMonthlyCap" INTEGER NOT NULL DEFAULT 5000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "referrerRewarded" BOOLEAN NOT NULL DEFAULT false,
    "refereeRewarded" BOOLEAN NOT NULL DEFAULT false,
    "bonusAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" TIMESTAMP(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionRecording_recordingEgressId_key" ON "SessionRecording"("recordingEgressId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordingConsent_exchangeSessionId_userId_key" ON "RecordingConsent"("exchangeSessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionChatReadReceipt_exchangeSessionId_userId_key" ON "SessionChatReadReceipt"("exchangeSessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referrerId_refereeId_key" ON "Referral"("referrerId", "refereeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeSession" ADD CONSTRAINT "ExchangeSession_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRecording" ADD CONSTRAINT "SessionRecording_exchangeSessionId_fkey" FOREIGN KEY ("exchangeSessionId") REFERENCES "ExchangeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordingConsent" ADD CONSTRAINT "RecordingConsent_exchangeSessionId_fkey" FOREIGN KEY ("exchangeSessionId") REFERENCES "ExchangeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordingConsent" ADD CONSTRAINT "RecordingConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposedSlot" ADD CONSTRAINT "ProposedSlot_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ExchangeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposedSlot" ADD CONSTRAINT "ProposedSlot_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposedSlot" ADD CONSTRAINT "ProposedSlot_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionChatMessage" ADD CONSTRAINT "SessionChatMessage_exchangeSessionId_fkey" FOREIGN KEY ("exchangeSessionId") REFERENCES "ExchangeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionChatMessage" ADD CONSTRAINT "SessionChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionChatReadReceipt" ADD CONSTRAINT "SessionChatReadReceipt_exchangeSessionId_fkey" FOREIGN KEY ("exchangeSessionId") REFERENCES "ExchangeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionChatReadReceipt" ADD CONSTRAINT "SessionChatReadReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeChatMessage" ADD CONSTRAINT "ExchangeChatMessage_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeChatMessage" ADD CONSTRAINT "ExchangeChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
