/*
  Warnings:

  - You are about to drop the column `approvedByAt` on the `Event` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[photo]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "approvedByAt",
ALTER COLUMN "updatedAt" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Event_photo_key" ON "Event"("photo");
