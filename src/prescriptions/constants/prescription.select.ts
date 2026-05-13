import { Prisma } from '@generated/prisma/browser';

export const PRESCRIPTION_DETAIL_SELECT = {
  id: true,
  folioNumber: true,
  status: true,
  doctorName: true,
  doctorLicense: true,
  doctorSpecialty: true,
  clinicName: true,
  clinicAddress: true,
  clinicPhone: true,
  pdfUrl: true,
  pdfPublicId: true,
  issuedAt: true,
  expiresAt: true,
  createdAt: true,
  consultation: { select: { id: true, folioNumber: true, consultedAt: true } },
  patient: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastNamePaternal: true,
      lastNameMaternal: true,
      birthDate: true,
      gender: true,
    },
  },
  items: {
    select: {
      id: true,
      medicationName: true,
      brandName: true,
      dose: true,
      frequency: true,
      duration: true,
      route: true,
      quantity: true,
      instructions: true,
      sortOrder: true,
      catalogId: true,
      consultationDiagnosisId: true,
    },
    orderBy: {
      sortOrder: 'asc',
    } as Prisma.PrescriptionItemOrderByWithRelationInput,
  },
} satisfies Prisma.PrescriptionSelect;

export const SELECT_PRESCRIPTION_ISSUE = {
  id: true,
  status: true,
  folioNumber: true,
  issuedAt: true,
  expiresAt: true,
  doctorName: true,
  doctorLicense: true,
  doctorSpecialty: true,
  clinicName: true,
  clinicAddress: true,
  clinicPhone: true,
  doctorClinic: {
    select: {
      clinic: { select: { logoUrl: true } },
      doctorProfile: { select: { signatureUrl: true, university: true } },
    },
  },
  patient: {
    select: {
      firstName: true,
      middleName: true,
      lastNamePaternal: true,
      lastNameMaternal: true,
      birthDate: true,
      gender: true,
    },
  },
  consultation: {
    select: {
      patientInstructions: true,
      diagnoses: {
        where: { isMain: true },
        select: { icd10Code: true, description: true },
        take: 3,
      },
    },
  },
  items: {
    select: {
      medicationName: true,
      brandName: true,
      dose: true,
      frequency: true,
      duration: true,
      route: true,
      quantity: true,
      instructions: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.PrescriptionSelect;

export const PRESCRIPTION_VALIDITY_DAYS = 30;
