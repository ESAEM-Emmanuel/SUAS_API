/*
  Warnings:

  - You are about to drop the column `photo` on the `ParticipantRole` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "photo" TEXT;

-- AlterTable
ALTER TABLE "ParticipantRole" DROP COLUMN "photo";
