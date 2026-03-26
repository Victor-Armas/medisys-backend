import { Prisma } from '@generated/prisma/client';

// Campos que siempre se devuelven al consultar un doctor.
// Nunca incluir password ni photoPublicId ni signaturePublicId.

// Fragmento reutilizable para la Clínica
export const CLINIC_BASIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  city: true,
  isActive: true,
} as const;

// Fragmento para el Perfil (evita la anidación infinita visual)
export const DOCTOR_PROFILE_SELECT = {
  id: true,
  address: true,
  numHome: true,
  colony: true,
  city: true,
  state: true,
  zipCode: true,
  specialty: true,
  professionalLicense: true,
  university: true,
  fullTitle: true,
  signatureUrl: true,
  createdAt: true,
  doctorClinics: {
    where: { isActive: true },
    select: {
      id: true,
      isPrimary: true,
      assignedAt: true,
      clinic: { select: CLINIC_BASIC_SELECT },
    },
  },
} as const;

// Selección final del Usuario/Doctor
export const DOCTOR_SELECT: Prisma.UserSelect = {
  id: true,
  email: true,
  firstName: true,
  middleName: true,
  lastNamePaternal: true,
  lastNameMaternal: true,
  role: true,
  phone: true,
  photoUrl: true,
  isActive: true,
  createdAt: true,
  doctorProfile: { select: DOCTOR_PROFILE_SELECT },
} as const;
