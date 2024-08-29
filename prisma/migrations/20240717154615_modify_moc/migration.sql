/*
  Warnings:

  - You are about to drop the column `endDate` on the `MasterOfCeremony` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `MasterOfCeremony` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MasterOfCeremony" DROP COLUMN "endDate",
DROP COLUMN "startDate",
ADD COLUMN     "name" TEXT;
