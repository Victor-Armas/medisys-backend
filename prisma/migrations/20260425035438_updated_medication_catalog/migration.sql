/*
  Warnings:

  - A unique constraint covering the columns `[rxnormCode]` on the table `MedicationCatalog` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "MedicationCatalog" ADD COLUMN     "concentration" TEXT,
ADD COLUMN     "form" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MedicationCatalog_rxnormCode_key" ON "MedicationCatalog"("rxnormCode");
