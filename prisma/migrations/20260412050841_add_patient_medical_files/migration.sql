-- CreateEnum
CREATE TYPE "MedicalFileCategory" AS ENUM ('LAB_RESULTS', 'IMAGING', 'PRESCRIPTION', 'REFERRAL', 'SURGERY_REPORT', 'PATHOLOGY', 'OTHER');

-- CreateTable
CREATE TABLE "PatientMedicalFile" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "category" "MedicalFileCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientMedicalFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientMedicalFile_patientId_category_idx" ON "PatientMedicalFile"("patientId", "category");

-- CreateIndex
CREATE INDEX "PatientMedicalFile_patientId_createdAt_idx" ON "PatientMedicalFile"("patientId", "createdAt");

-- AddForeignKey
ALTER TABLE "PatientMedicalFile" ADD CONSTRAINT "PatientMedicalFile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
