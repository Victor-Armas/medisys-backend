import { Prisma } from '@generated/prisma/client';

export const SCHEDULE_SELECT: Prisma.ScheduleRangeSelect = {
  id: true,
  weekDay: true,
  startTime: true,
  endTime: true,
  dateFrom: true,
  dateTo: true,
  isActive: true,
} as const;

export const SCHEDULE_OVERRIDE_SELECT: Prisma.ScheduleOverrideSelect = {
  id: true,
  date: true,
  startTime: true,
  endTime: true,
  type: true,
  note: true,
} as const;

export const DOCTOR_IN_CLINIC_SELECT: Prisma.DoctorClinicSelect = {
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
  scheduleRanges: { select: SCHEDULE_SELECT },
  scheduleOverrides: { select: SCHEDULE_OVERRIDE_SELECT },
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
