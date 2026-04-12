/*
  Warnings:

  - A unique constraint covering the columns `[postalCodeId,sepomexId]` on the table `SepomexNeighborhood` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "SepomexNeighborhood_sepomexId_key";

-- CreateIndex
CREATE UNIQUE INDEX "SepomexNeighborhood_postalCodeId_sepomexId_key" ON "SepomexNeighborhood"("postalCodeId", "sepomexId");
