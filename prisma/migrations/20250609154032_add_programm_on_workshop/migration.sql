-- DropIndex
DROP INDEX "Event_photo_key";

-- DropIndex
DROP INDEX "Event_program_key";

-- AlterTable
ALTER TABLE "Workshop" ADD COLUMN     "program" TEXT;
