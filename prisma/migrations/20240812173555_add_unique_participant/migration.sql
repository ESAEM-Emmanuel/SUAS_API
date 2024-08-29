/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `ParticipantRole` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ParticipantRole_name_key" ON "ParticipantRole"("name");
