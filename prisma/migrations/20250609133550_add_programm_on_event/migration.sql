/*
  Warnings:

  - A unique constraint covering the columns `[program]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "program" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_program_key" ON "Event"("program");
