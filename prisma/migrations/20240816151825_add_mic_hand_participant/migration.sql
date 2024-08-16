-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "isActiveMicrophone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHandRaised" BOOLEAN NOT NULL DEFAULT false;
