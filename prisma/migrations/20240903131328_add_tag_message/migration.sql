-- CreateEnum
CREATE TYPE "Tags" AS ENUM ('SUPPORT', 'MODERATOR');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "tag" "Tags";
