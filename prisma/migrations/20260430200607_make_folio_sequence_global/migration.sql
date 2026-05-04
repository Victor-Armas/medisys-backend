/*
  Warnings:

  - You are about to drop the column `clinicId` on the `folio_sequences` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[type,year]` on the table `folio_sequences` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "folio_sequences" DROP CONSTRAINT "folio_sequences_clinicId_fkey";

-- DropIndex
DROP INDEX "folio_sequences_clinicId_type_year_key";

-- AlterTable
ALTER TABLE "folio_sequences" DROP COLUMN "clinicId";

-- CreateIndex
CREATE UNIQUE INDEX "folio_sequences_type_year_key" ON "folio_sequences"("type", "year");
