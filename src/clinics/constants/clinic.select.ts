import { Prisma } from '@generated/prisma/client';

export const SCHEDULE_SELECT = {
  id: true,
  weekDay: true,
  startTime: true,
  endTime: true,
  isActive: true,
} as const;

export const DOCTOR_IN_CLINIC_SELECT = {
  id: true,
  isPrimary: true,
  isActive: true,
  assignedAt: true,
  doctorProfile: {
    select: {
      id: true,
      specialty: true,
      professionalLicense: true,
      isAvailable: true,
      defaultAppointmentDuration: true,
      canManageOwnSchedule: true,
      user: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastNamePaternal: true,
          lastNameMaternal: true,
          photoUrl: true,
          phone: true,
          isActive: true,
        },
      },
    },
  },
  schedules: { select: SCHEDULE_SELECT },
} as const;

export const CLINIC_SELECT: Prisma.ClinicSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  phone: true,
  email: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  rfc: true,
  professionalLicense: true,
  brandColor: true,
  maxDoctors: true,
  isActive: true,
  createdAt: true,
  doctorClinics: { select: DOCTOR_IN_CLINIC_SELECT },
} as const;
