-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('O_POSITIVE', 'O_NEGATIVE', 'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'FREE_UNION', 'OTHER');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('NONE', 'PRIMARY', 'SECONDARY', 'HIGH_SCHOOL', 'TECHNICAL', 'BACHELOR', 'POSTGRADUATE');

-- CreateEnum
CREATE TYPE "HabitStatus" AS ENUM ('NEVER', 'FORMER', 'CURRENT', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastNamePaternal" TEXT NOT NULL,
    "lastNameMaternal" TEXT,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "curp" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "maritalStatus" "MaritalStatus",
    "occupation" TEXT,
    "educationLevel" "EducationLevel",
    "bloodType" "BloodType",
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAccount" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAddress" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'MX',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "postalCodeId" TEXT,
    "neighborhoodId" TEXT,
    "street" TEXT,
    "extNumber" TEXT,
    "intNumber" TEXT,
    "foreignState" TEXT,
    "foreignCity" TEXT,
    "foreignPostalCode" TEXT,
    "foreignAddressLine" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientClinic" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PatientClinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "diseases" TEXT,
    "surgeries" TEXT,
    "hospitalizations" TEXT,
    "bloodTransfusions" BOOLEAN NOT NULL DEFAULT false,
    "traumaHistory" TEXT,
    "currentMedications" TEXT,
    "allergies" TEXT,
    "smoking" "HabitStatus" NOT NULL DEFAULT 'UNKNOWN',
    "smokingDetail" TEXT,
    "alcoholUse" "HabitStatus" NOT NULL DEFAULT 'UNKNOWN',
    "alcoholDetail" TEXT,
    "drugUse" "HabitStatus" NOT NULL DEFAULT 'UNKNOWN',
    "drugDetail" TEXT,
    "immunizations" TEXT,
    "physicalActivity" TEXT,
    "pets" BOOLEAN NOT NULL DEFAULT false,
    "tattoos" BOOLEAN NOT NULL DEFAULT false,
    "woodSmokeExposure" BOOLEAN NOT NULL DEFAULT false,
    "fatherHistory" TEXT,
    "motherHistory" TEXT,
    "childrenHistory" TEXT,
    "siblingsHistory" TEXT,
    "otherFamilyHistory" TEXT,
    "menarche" INTEGER,
    "menstrualCycle" TEXT,
    "lastMenstrualPeriod" TIMESTAMP(3),
    "sexualActivityStart" INTEGER,
    "gestations" INTEGER,
    "deliveries" INTEGER,
    "abortions" INTEGER,
    "caesareans" INTEGER,
    "contraceptiveMethod" TEXT,
    "menopause" BOOLEAN,
    "mammography" TEXT,
    "cervicalCytology" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SepomexState" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SepomexState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SepomexMunicipality" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,

    CONSTRAINT "SepomexMunicipality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SepomexPostalCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,

    CONSTRAINT "SepomexPostalCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SepomexNeighborhood" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "zone" TEXT,
    "postalCodeId" TEXT NOT NULL,
    "sepomexId" TEXT,

    CONSTRAINT "SepomexNeighborhood_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_curp_key" ON "Patient"("curp");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAccount_patientId_key" ON "PatientAccount"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAccount_email_key" ON "PatientAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PatientClinic_patientId_clinicId_key" ON "PatientClinic"("patientId", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalHistory_patientId_key" ON "MedicalHistory"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "SepomexState_code_key" ON "SepomexState"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SepomexMunicipality_code_stateId_key" ON "SepomexMunicipality"("code", "stateId");

-- CreateIndex
CREATE INDEX "SepomexPostalCode_code_idx" ON "SepomexPostalCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SepomexNeighborhood_sepomexId_key" ON "SepomexNeighborhood"("sepomexId");

-- AddForeignKey
ALTER TABLE "PatientAccount" ADD CONSTRAINT "PatientAccount_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAddress" ADD CONSTRAINT "PatientAddress_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAddress" ADD CONSTRAINT "PatientAddress_postalCodeId_fkey" FOREIGN KEY ("postalCodeId") REFERENCES "SepomexPostalCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAddress" ADD CONSTRAINT "PatientAddress_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "SepomexNeighborhood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientClinic" ADD CONSTRAINT "PatientClinic_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientClinic" ADD CONSTRAINT "PatientClinic_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SepomexMunicipality" ADD CONSTRAINT "SepomexMunicipality_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "SepomexState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SepomexPostalCode" ADD CONSTRAINT "SepomexPostalCode_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "SepomexMunicipality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SepomexNeighborhood" ADD CONSTRAINT "SepomexNeighborhood_postalCodeId_fkey" FOREIGN KEY ("postalCodeId") REFERENCES "SepomexPostalCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
