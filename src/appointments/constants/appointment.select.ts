// src/appointments/constants/appointment.select.ts
import { Prisma } from '@generated/prisma/client';

/**
 * Selección ligera para listas y calendarios.
 * Incluye solo los campos necesarios para renderizar la vista de agenda.
 */
export const APPOINTMENT_LIST_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
  status: true,
  type: true,
  bookedVia: true,
  reason: true,
  guestName: true,
  guestPhone: true,
  // Paciente registrado (puede ser null si es guest)
  patient: {
    select: {
      id: true,
      firstName: true,
      lastNamePaternal: true,
      phone: true,
    },
  },
  // Médico + consultorio para identificar de qué agenda es la cita
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
} satisfies Prisma.AppointmentSelect;

/**
 * Selección completa para la vista de detalle de una cita.
 * Incluye notas internas, email del paciente y datos del consultorio completos.
 */
export const APPOINTMENT_DETAIL_SELECT = {
  ...APPOINTMENT_LIST_SELECT,
  internalNotes: true,
  homeAddress: true,
  waPhoneNumber: true,
  createdAt: true,
  updatedAt: true,
  // Completamos el paciente con más campos para el detalle
  patient: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastNamePaternal: true,
      lastNameMaternal: true,
      phone: true,
      email: true,
      birthDate: true,
      bloodType: true,
    },
  },
} satisfies Prisma.AppointmentSelect;
