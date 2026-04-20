/*
  Warnings:

  - You are about to drop the column `allergies` on the `MedicalHistory` table. All the data in the column will be lost.
  - You are about to drop the column `childrenHistory` on the `MedicalHistory` table. All the data in the column will be lost.
  - You are about to drop the column `currentMedications` on the `MedicalHistory` table. All the data in the column will be lost.
  - You are about to drop the column `diseases` on the `MedicalHistory` table. All the data in the column will be lost.
  - You are about to drop the column `fatherHistory` on the `MedicalHistory` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalizations` on the `MedicalHistory` table. All the data in the column will be lost.
  - You are about to drop the column `motherHistory` on the `MedicalHistory` table. All the data in the column will be lost.
  - You are about to drop the column `otherFamilyHistory` on the `MedicalHistory` table. All the data in the column will be lost.
  - You are about to drop the column `siblingsHistory` on the `MedicalHistory` table. All the data in the column will be lost.
  - You are about to drop the column `surgeries` on the `MedicalHistory` table. All the data in the column will be lost.
  - You are about to drop the column `traumaHistory` on the `MedicalHistory` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ConditionType" AS ENUM ('PATHOLOGICAL', 'FAMILY');

-- CreateEnum
CREATE TYPE "ConditionCategory" AS ENUM ('DISEASE', 'SURGERY', 'HOSPITALIZATION', 'TRAUMA');

-- CreateEnum
CREATE TYPE "FamilyMember" AS ENUM ('FATHER', 'MOTHER', 'SIBLINGS', 'CHILDREN', 'OTHER');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'UNKNOWN');

-- AlterTable
ALTER TABLE "MedicalHistory" DROP COLUMN "allergies",
DROP COLUMN "childrenHistory",
DROP COLUMN "currentMedications",
DROP COLUMN "diseases",
DROP COLUMN "fatherHistory",
DROP COLUMN "hospitalizations",
DROP COLUMN "motherHistory",
DROP COLUMN "otherFamilyHistory",
DROP COLUMN "siblingsHistory",
DROP COLUMN "surgeries",
DROP COLUMN "traumaHistory";

-- CreateTable
CREATE TABLE "Icd10Code" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "searchCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Icd10Code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rxnormCode" TEXT,
    "searchCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MedicationCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientCondition" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "icd10Code" TEXT,
    "description" TEXT NOT NULL,
    "category" "ConditionCategory" NOT NULL,
    "type" "ConditionType" NOT NULL DEFAULT 'PATHOLOGICAL',
    "familyMember" "FamilyMember",
    "notes" TEXT,
    "isNonCoded" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientMedication" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "catalogId" TEXT,
    "name" TEXT NOT NULL,
    "dose" TEXT,
    "frequency" TEXT,
    "isNonCoded" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientMedication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAllergy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "substance" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" "AllergySeverity" NOT NULL DEFAULT 'UNKNOWN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAllergy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Icd10Code_code_key" ON "Icd10Code"("code");

-- CreateIndex
CREATE INDEX "Icd10Code_code_idx" ON "Icd10Code"("code");

-- CreateIndex
CREATE INDEX "Icd10Code_description_idx" ON "Icd10Code"("description");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationCatalog_name_key" ON "MedicationCatalog"("name");

-- CreateIndex
CREATE INDEX "MedicationCatalog_name_idx" ON "MedicationCatalog"("name");

-- CreateIndex
CREATE INDEX "PatientCondition_patientId_category_idx" ON "PatientCondition"("patientId", "category");

-- CreateIndex
CREATE INDEX "PatientCondition_patientId_type_idx" ON "PatientCondition"("patientId", "type");

-- CreateIndex
CREATE INDEX "PatientMedication_patientId_idx" ON "PatientMedication"("patientId");

-- CreateIndex
CREATE INDEX "PatientAllergy_patientId_idx" ON "PatientAllergy"("patientId");

-- AddForeignKey
ALTER TABLE "PatientCondition" ADD CONSTRAINT "PatientCondition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMedication" ADD CONSTRAINT "PatientMedication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMedication" ADD CONSTRAINT "PatientMedication_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "MedicationCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
