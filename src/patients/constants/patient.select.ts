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
  // Extranjero
  foreignState: true,
  foreignCity: true,
  foreignPostalCode: true,
  foreignAddressLine: true,
} as const;

// ── Medical history select ────────────────────────────────────────────────────
export const MEDICAL_HISTORY_SELECT = {
  id: true,
  diseases: true,
  surgeries: true,
  hospitalizations: true,
  bloodTransfusions: true,
  traumaHistory: true,
  currentMedications: true,
  allergies: true,
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
  fatherHistory: true,
  motherHistory: true,
  childrenHistory: true,
  siblingsHistory: true,
  otherFamilyHistory: true,
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

// ── Patient list select (ligero — para tablas y búsquedas) ────────────────────
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

// ── Patient detail select (completo — para expediente) ────────────────────────
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
} as const;
