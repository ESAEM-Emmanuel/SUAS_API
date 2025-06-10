/*
  Warnings:

  - You are about to drop the column `isOnlineWorkshop` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `room` on the `Participant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Participant" DROP COLUMN "isOnlineWorkshop",
DROP COLUMN "room",
ADD COLUMN     "isOnlineParticipation" BOOLEAN NOT NULL DEFAULT false;
