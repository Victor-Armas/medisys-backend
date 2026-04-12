/*
  Warnings:

  - You are about to drop the column `municipality` on the `PatientAddress` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `PatientAddress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PatientAddress" DROP COLUMN "municipality",
DROP COLUMN "state";
