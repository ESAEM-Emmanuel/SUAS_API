-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Workshop" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;
