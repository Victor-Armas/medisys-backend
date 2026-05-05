// src/patients/constants/patient.select.ts
import { Prisma } from '@generated/prisma/client';

// ── Address select ────────────────────────────────────────────────────────────
export const ADDRESS_SELECT = {
  id: true,
  country: true,
  isPrimary: true,
  street: true,
  extNumber: true,
  intNumber: true,
  postalCode: {
    select: {
      id: true,
      code: true,
      municipality: {
        select: {
          name: true,
          state: { select: { name: true } },
        },
      },
    },
  },
  neighborhood: { select: { name: true, type: true } },
  foreignState: true,
  foreignCity: true,
  foreignPostalCode: true,
  foreignAddressLine: true,
} as const;

// ── Medical history select (habits + gynecological only) ──────────────────────
export const MEDICAL_HISTORY_SELECT = {
  id: true,
  // Remaining pathological fact
  bloodTransfusions: true,
  // Non-pathological habits
  smoking: true,
  smokingDetail: true,
  alcoholUse: true,
  alcoholDetail: true,
  drugUse: true,
  drugDetail: true,
  immunizations: true,
  physicalActivity: true,
  pets: true,
  tattoos: true,
  woodSmokeExposure: true,
  // Gynecological
  menarche: true,
  menstrualCycle: true,
  lastMenstrualPeriod: true,
  sexualActivityStart: true,
  gestations: true,
  deliveries: true,
  abortions: true,
  caesareans: true,
  contraceptiveMethod: true,
  menopause: true,
  mammography: true,
  cervicalCytology: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ── Condition select ──────────────────────────────────────────────────────────
export const CONDITION_SELECT = {
  id: true,
  icd10Code: true,
  description: true,
  category: true,
  type: true,
  familyMember: true,
  notes: true,
  isNonCoded: true,
  createdAt: true,
} as const;

// ── Medication select ─────────────────────────────────────────────────────────
export const MEDICATION_SELECT = {
  id: true,
  name: true,
  dose: true,
  frequency: true,
  isNonCoded: true,
  catalogId: true,
  createdAt: true,
} as const;

// ── Allergy select ────────────────────────────────────────────────────────────
export const ALLERGY_SELECT = {
  id: true,
  substance: true,
  reaction: true,
  severity: true,
  createdAt: true,
} as const;

// ── Medical file select ───────────────────────────────────────────────────────
export const MEDICAL_FILE_SELECT = {
  id: true,
  category: true,
  description: true,
  fileName: true,
  fileUrl: true,
  publicId: true,
  mimeType: true,
  fileSize: true,
  uploadedById: true,
  createdAt: true,
} as const;

// ── Patient list select (lightweight — tables, search) ────────────────────────
export const PATIENT_LIST_SELECT: Prisma.PatientSelect = {
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
  isActive: true,
  createdAt: true,
  clinics: {
    where: { isActive: true },
    select: { clinic: { select: { id: true, name: true } } },
  },
} as const;

// ── Patient detail select (full — clinical record) ────────────────────────────
export const PATIENT_DETAIL_SELECT: Prisma.PatientSelect = {
  ...PATIENT_LIST_SELECT,
  maritalStatus: true,
  occupation: true,
  educationLevel: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  emergencyContactRelation: true,
  addresses: { select: ADDRESS_SELECT },
  medicalHistory: { select: MEDICAL_HISTORY_SELECT },
  conditions: {
    where: { isActive: true },
    select: CONDITION_SELECT,
    orderBy: [{ type: 'asc' }, { category: 'asc' }, { createdAt: 'asc' }],
  },
  medications: {
    where: { isActive: true },
    select: MEDICATION_SELECT,
    orderBy: { createdAt: 'asc' },
  },
  allergies: {
    where: { isActive: true },
    select: ALLERGY_SELECT,
    orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
  },
} as const;
