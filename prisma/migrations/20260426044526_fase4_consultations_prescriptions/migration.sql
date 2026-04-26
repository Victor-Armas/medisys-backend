-- CreateEnum
CREATE TYPE "ConsultationType" AS ENUM ('FIRST_VISIT', 'FOLLOW_UP', 'URGENT', 'ROUTINE', 'PROCEDURE');

-- CreateEnum
CREATE TYPE "DiagnosisType" AS ENUM ('DEFINITIVE', 'PRESUMPTIVE', 'ASSOCIATED', 'COMPLICATION');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GeneralCondition" AS ENUM ('GOOD', 'FAIR', 'POOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MedicationRoute" AS ENUM ('ORAL', 'TOPICAL', 'INTRAVENOUS', 'INTRAMUSCULAR', 'SUBCUTANEOUS', 'INHALED', 'SUBLINGUAL', 'RECTAL', 'OPHTHALMIC', 'OTIC', 'NASAL', 'OTHER');

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "folioNumber" TEXT NOT NULL,
    "appointmentId" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorClinicId" TEXT NOT NULL,
    "consultationType" "ConsultationType" NOT NULL DEFAULT 'FOLLOW_UP',
    "reasonForVisit" TEXT NOT NULL,
    "currentCondition" TEXT NOT NULL,
    "physicalExamFindings" TEXT,
    "labResultsSummary" TEXT,
    "clinicalImpressions" TEXT,
    "treatmentPlan" TEXT,
    "patientInstructions" TEXT,
    "prognosis" TEXT,
    "requiresFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "followUpDays" INTEGER,
    "followUpNotes" TEXT,
    "consultedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_signs" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bloodPressure" TEXT,
    "heartRateBpm" INTEGER,
    "respiratoryRate" INTEGER,
    "temperatureC" DOUBLE PRECISION,
    "oxygenSaturation" INTEGER,
    "glucoseMgdl" TEXT,
    "generalCondition" "GeneralCondition" NOT NULL DEFAULT 'GOOD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_diagnoses" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "icd10Code" TEXT,
    "description" TEXT NOT NULL,
    "diagnosisType" "DiagnosisType" NOT NULL DEFAULT 'DEFINITIVE',
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultation_diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "folioNumber" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorClinicId" TEXT NOT NULL,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "doctorName" TEXT NOT NULL,
    "doctorLicense" TEXT NOT NULL,
    "doctorSpecialty" TEXT,
    "clinicName" TEXT NOT NULL,
    "clinicAddress" TEXT,
    "clinicPhone" TEXT,
    "pdfUrl" TEXT,
    "pdfPublicId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "consultationDiagnosisId" TEXT,
    "catalogId" TEXT,
    "medicationName" TEXT NOT NULL,
    "brandName" TEXT,
    "dose" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "route" TEXT,
    "quantity" INTEGER,
    "instructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icd_medication_suggestions" (
    "id" TEXT NOT NULL,
    "icd10Code" TEXT NOT NULL,
    "medicationCatalogId" TEXT NOT NULL,
    "defaultDose" TEXT,
    "defaultFrequency" TEXT,
    "defaultDuration" TEXT,
    "defaultRoute" TEXT,
    "defaultQuantity" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 10,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "icd_medication_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folio_sequences" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folio_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consultations_folioNumber_key" ON "consultations"("folioNumber");

-- CreateIndex
CREATE UNIQUE INDEX "consultations_appointmentId_key" ON "consultations"("appointmentId");

-- CreateIndex
CREATE INDEX "consultations_patientId_consultedAt_idx" ON "consultations"("patientId", "consultedAt");

-- CreateIndex
CREATE INDEX "consultations_doctorClinicId_consultedAt_idx" ON "consultations"("doctorClinicId", "consultedAt");

-- CreateIndex
CREATE INDEX "consultations_folioNumber_idx" ON "consultations"("folioNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vital_signs_consultationId_key" ON "vital_signs"("consultationId");

-- CreateIndex
CREATE INDEX "consultation_diagnoses_consultationId_idx" ON "consultation_diagnoses"("consultationId");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_folioNumber_key" ON "prescriptions"("folioNumber");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_consultationId_key" ON "prescriptions"("consultationId");

-- CreateIndex
CREATE INDEX "prescriptions_patientId_issuedAt_idx" ON "prescriptions"("patientId", "issuedAt");

-- CreateIndex
CREATE INDEX "prescriptions_doctorClinicId_issuedAt_idx" ON "prescriptions"("doctorClinicId", "issuedAt");

-- CreateIndex
CREATE INDEX "prescription_items_prescriptionId_idx" ON "prescription_items"("prescriptionId");

-- CreateIndex
CREATE INDEX "icd_medication_suggestions_icd10Code_priority_usageCount_idx" ON "icd_medication_suggestions"("icd10Code", "priority", "usageCount");

-- CreateIndex
CREATE UNIQUE INDEX "icd_medication_suggestions_icd10Code_medicationCatalogId_key" ON "icd_medication_suggestions"("icd10Code", "medicationCatalogId");

-- CreateIndex
CREATE UNIQUE INDEX "folio_sequences_clinicId_type_year_key" ON "folio_sequences"("clinicId", "type", "year");

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_doctorClinicId_fkey" FOREIGN KEY ("doctorClinicId") REFERENCES "DoctorClinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_diagnoses" ADD CONSTRAINT "consultation_diagnoses_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctorClinicId_fkey" FOREIGN KEY ("doctorClinicId") REFERENCES "DoctorClinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_consultationDiagnosisId_fkey" FOREIGN KEY ("consultationDiagnosisId") REFERENCES "consultation_diagnoses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "MedicationCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icd_medication_suggestions" ADD CONSTRAINT "icd_medication_suggestions_medicationCatalogId_fkey" FOREIGN KEY ("medicationCatalogId") REFERENCES "MedicationCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folio_sequences" ADD CONSTRAINT "folio_sequences_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
