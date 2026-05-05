-- AlterTable
ALTER TABLE "PatientMedicalFile" ADD COLUMN     "consultationId" TEXT;

-- CreateIndex
CREATE INDEX "PatientMedicalFile_consultationId_idx" ON "PatientMedicalFile"("consultationId");

-- AddForeignKey
ALTER TABLE "PatientMedicalFile" ADD CONSTRAINT "PatientMedicalFile_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
