/*
  Warnings:

  - Added the required column `updatedAt` to the `Permission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Permission" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Mettez à jour les valeurs de la colonne `updatedAt` pour les lignes existantes
UPDATE "Permission" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

-- Définissez la colonne `updatedAt" comme non nulle
ALTER TABLE "Permission" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Optionnel : Si vous souhaitez que `updatedAt" se mette à jour automatiquement, vous pouvez créer un trigger dans PostgreSQL.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW."updatedAt" = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_permission_updated_at
BEFORE UPDATE ON "Permission"
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
