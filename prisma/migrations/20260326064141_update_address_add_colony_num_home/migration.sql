/*
  Warnings:

  - Added the required column `colony` to the `DoctorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numHome` to the `DoctorProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DoctorProfile" ADD COLUMN     "colony" TEXT NOT NULL,
ADD COLUMN     "numHome" TEXT NOT NULL;
