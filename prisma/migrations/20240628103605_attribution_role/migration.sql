/*
  Warnings:

  - You are about to drop the column `approvedByAt` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `isIntegratedAs` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `userRole` on the `User` table. All the data in the column will be lost.
  - Added the required column `participantRoleId` to the `Participant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'FILE', 'OTHER');

-- AlterTable
ALTER TABLE "Participant" DROP COLUMN "approvedByAt",
DROP COLUMN "isIntegratedAs",
ADD COLUMN     "participantRoleId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "userRole",
ADD COLUMN     "userRoleId" TEXT;

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "workshopId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Message_referenceNumber_key" ON "Message"("referenceNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_userRoleId_fkey" FOREIGN KEY ("userRoleId") REFERENCES "UserRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_participantRoleId_fkey" FOREIGN KEY ("participantRoleId") REFERENCES "ParticipantRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
