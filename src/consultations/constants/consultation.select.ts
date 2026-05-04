// src/consultations/constants/consultation.select.ts

import { Prisma } from '@generated/prisma/client';

// ── Signos vitales ─────────────────────────────────────────────────────────────
export const VITAL_SIGNS_SELECT = {
  id: true,
  weightKg: true,
  heightCm: true,
  bmi: true,
  bloodPressure: true,
  heartRateBpm: true,
  respiratoryRate: true,
  temperatureC: true,
  oxygenSaturation: true,
  glucoseMgdl: true,
  generalCondition: true,
  notes: true,
  createdAt: true,
} as const;

// ── Diagnóstico ────────────────────────────────────────────────────────────────
export const DIAGNOSIS_SELECT = {
  id: true,
  icd10Code: true,
  description: true,
  diagnosisType: true,
  isMain: true,
  notes: true,
  sortOrder: true,
  createdAt: true,
} as const;

// ── Consulta en lista (ligero) ─────────────────────────────────────────────────
export const CONSULTATION_LIST_SELECT = {
  id: true,
  folioNumber: true,
  consultationType: true,
  reasonForVisit: true,
  requiresFollowUp: true,
  followUpDays: true,
  consultedAt: true,
  createdAt: true,
  patient: {
    select: {
      id: true,
      firstName: true,
      lastNamePaternal: true,
      birthDate: true,
      gender: true,
      allergies: {
        where: { isActive: true },
        select: { substance: true, severity: true },
      },
    },
  },
  doctorClinic: {
    select: {
      id: true,
      clinic: { select: { id: true, name: true } },
      doctorProfile: {
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastNamePaternal: true,
            },
          },
        },
      },
    },
  },
  // Solo el diagnóstico principal en la lista
  diagnoses: {
    where: { isMain: true },
    select: DIAGNOSIS_SELECT,
    take: 1,
  },
  prescription: {
    select: {
      id: true,
      folioNumber: true,
      status: true,
      pdfUrl: true,
      issuedAt: true,
    },
  },
} satisfies Prisma.ConsultationSelect;

// ── Consulta en detalle (completo) ────────────────────────────────────────────
export const CONSULTATION_DETAIL_SELECT = {
  ...CONSULTATION_LIST_SELECT,
  doctorClinic: {
    select: {
      id: true,
      clinic: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          logoUrl: true,
        },
      },
      doctorProfile: {
        select: {
          professionalLicense: true,
          specialty: true,
          signatureUrl: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastNamePaternal: true,
            },
          },
        },
      },
    },
  },
  currentCondition: true,
  physicalExamFindings: true,
  labResultsSummary: true,
  clinicalImpressions: true,
  treatmentPlan: true,
  patientInstructions: true,
  prognosis: true,
  followUpNotes: true,
  updatedAt: true,
  // Todos los diagnósticos en el detalle
  diagnoses: {
    select: DIAGNOSIS_SELECT,
    orderBy: [
      { isMain: 'desc' },
      { sortOrder: 'asc' },
    ] as Prisma.ConsultationDiagnosisOrderByWithRelationInput[],
  },
  vitalSigns: { select: VITAL_SIGNS_SELECT },
  // Receta completa con sus ítems
  prescription: {
    select: {
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
    },
  },
  // Contexto del paciente para el expediente
  patient: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastNamePaternal: true,
      lastNameMaternal: true,
      birthDate: true,
      gender: true,
      curp: true,
      phone: true,
      email: true,
      bloodType: true,
      allergies: {
        where: { isActive: true },
        select: { substance: true, severity: true },
      },
    },
  },
} satisfies Prisma.ConsultationSelect;
