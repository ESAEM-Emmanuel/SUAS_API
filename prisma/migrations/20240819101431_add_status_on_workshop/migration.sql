-- CreateEnum
CREATE TYPE "StatusWorkshop" AS ENUM ('NOTBEGUN', 'STARTED', 'ONGOING', 'FINISHED');

-- AlterTable
ALTER TABLE "Workshop" ADD COLUMN     "status" "StatusWorkshop" NOT NULL DEFAULT 'NOTBEGUN';
