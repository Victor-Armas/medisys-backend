/*
  Warnings:

  - You are about to drop the column `appointmentDuration` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `clinicId` on the `Schedule` table. All the data in the column will be lost.
  - Added the required column `doctorClinicId` to the `Schedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PATIENT';

-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_clinicId_fkey";

-- DropIndex
DROP INDEX "Schedule_clinicId_weekDay_key";

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "maxDoctors" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "DoctorProfile" ADD COLUMN     "canManageOwnSchedule" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defaultAppointmentDuration" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "appointmentDuration",
DROP COLUMN "clinicId",
ADD COLUMN     "doctorClinicId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "isActive" SET DEFAULT true;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_doctorClinicId_fkey" FOREIGN KEY ("doctorClinicId") REFERENCES "DoctorClinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
