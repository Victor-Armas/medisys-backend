/*
  Warnings:

  - A unique constraint covering the columns `[code,municipalityId]` on the table `SepomexPostalCode` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SepomexPostalCode_code_municipalityId_key" ON "SepomexPostalCode"("code", "municipalityId");
