/*
  Warnings:

  - You are about to drop the column `date` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `approvedByAt` on the `Workshop` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "date";

-- AlterTable
ALTER TABLE "Workshop" DROP COLUMN "approvedByAt";
