/*
  Warnings:

  - Made the column `address` on table `DoctorProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `city` on table `DoctorProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `state` on table `DoctorProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `zipCode` on table `DoctorProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `professionalLicense` on table `DoctorProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "DoctorProfile" ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "state" SET NOT NULL,
ALTER COLUMN "zipCode" SET NOT NULL,
ALTER COLUMN "professionalLicense" SET NOT NULL;
