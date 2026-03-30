import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@generated/prisma/client';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const password = await bcrypt.hash('4m3n2b1v', 10);

  // ─── Admin System ────────────────────────────────────────────
  // const admin = await prisma.user.upsert({
  //   where: { email: 'victor.961004@outlook.com' },
  //   update: {},
  //   create: {
  //     email: 'victor.961004@outlook.com',
  //     password,
  //     firstName: 'Victor',
  //     middleName: 'Jesus',
  //     lastNamePaternal: 'Garzon',
  //     lastNameMaternal: 'Armas',
  //     role: 'ADMIN_SYSTEM',
  //     isActive: true,
  //   },
  // });

  // ─── Main Doctor ─────────────────────────────────────────────
  const mainDoctorUser = await prisma.user.upsert({
    where: { email: 'dracarolina.cervantesa@gmail.com' },
    update: {},
    create: {
      email: 'dracarolina.cervantesa@gmail.com',
      password,
      firstName: 'Carolina',
      lastNamePaternal: 'Cervantes',
      lastNameMaternal: 'Arellano',
      role: 'MAIN_DOCTOR',
      isActive: true,
    },
  });

  let mainDoctorProfile = await prisma.doctorProfile.findUnique({
    where: { userId: mainDoctorUser.id },
  });

  if (!mainDoctorProfile) {
    mainDoctorProfile = await prisma.doctorProfile.create({
      data: {
        userId: mainDoctorUser.id,
        address: 'Av. Constitución',
        numHome: '1200',
        colony: 'Centro',
        city: 'Monterrey',
        state: 'Nuevo León',
        zipCode: '64000',
        specialty: 'Medicina General',
        professionalLicense: '12345678',
        fullTitle: 'Dra. Carolina Cervantes Arellano',
        isAvailable: true,
        defaultAppointmentDuration: 30,
        canManageOwnSchedule: true,
      },
    });
  }

  // ─── Doctor secundario ───────────────────────────────────────
  const doctorUser = await prisma.user.upsert({
    where: { email: 'arturo.ramos@medisys.mx' },
    update: {},
    create: {
      email: 'arturo.ramos@medisys.mx',
      password,
      firstName: 'Arturo',
      lastNamePaternal: 'Ramos',
      lastNameMaternal: 'García',
      role: 'DOCTOR',
      isActive: true,
    },
  });

  let doctorProfile = await prisma.doctorProfile.findUnique({
    where: { userId: doctorUser.id },
  });

  if (!doctorProfile) {
    doctorProfile = await prisma.doctorProfile.create({
      data: {
        userId: doctorUser.id,
        address: 'Calle Hidalgo',
        numHome: '450',
        colony: 'Obispado',
        city: 'Monterrey',
        state: 'Nuevo León',
        zipCode: '64010',
        specialty: 'Cardiología',
        professionalLicense: '87654321',
        fullTitle: 'Dr. Arturo Ramos García',
        isAvailable: true,
        defaultAppointmentDuration: 45,
        canManageOwnSchedule: false,
      },
    });
  }

  // ─── Recepcionista ───────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'recepcion@medisys.mx' },
    update: {},
    create: {
      email: 'recepcion@medisys.mx',
      password,
      firstName: 'Ana',
      lastNamePaternal: 'Gómez',
      lastNameMaternal: 'Martínez',
      role: 'RECEPTIONIST',
      isActive: true,
    },
  });

  // ─── 3 Consultorios ──────────────────────────────────────────
  const clinicPrincipal = await prisma.clinic.upsert({
    where: { slug: 'clinica-principal' },
    update: {},
    create: {
      name: 'Clínica Principal',
      slug: 'clinica-principal',
      phone: '81 1234 5678',
      email: 'contacto@clinicaprincipal.mx',
      address: 'Av. Constitución 1200',
      city: 'Monterrey',
      state: 'Nuevo León',
      zipCode: '64000',
      rfc: 'CPR123456ABC',
      professionalLicense: '12345678',
      brandColor: '#5c4a7b',
      maxDoctors: 3,
      isActive: true,
    },
  });

  const clinicNorte = await prisma.clinic.upsert({
    where: { slug: 'clinica-norte' },
    update: {},
    create: {
      name: 'Clínica Norte',
      slug: 'clinica-norte',
      phone: '81 9876 5432',
      address: 'Blvd. Díaz Ordaz 500',
      city: 'San Nicolás',
      state: 'Nuevo León',
      zipCode: '66480',
      brandColor: '#1d9e75',
      maxDoctors: 2,
      isActive: true,
    },
  });

  const clinicDomicilio = await prisma.clinic.upsert({
    where: { slug: 'consulta-domicilio' },
    update: {},
    create: {
      name: 'Consulta a Domicilio',
      slug: 'consulta-domicilio',
      phone: '81 1234 5678',
      brandColor: '#3182ce',
      maxDoctors: 1,
      isActive: true,
    },
  });

  // ─── Asignaciones DoctorClinic ───────────────────────────────
  // Main doctor → Clínica Principal (primaria) + Domicilio
  const dc1 = await prisma.doctorClinic.upsert({
    where: {
      doctorProfileId_clinicId: {
        doctorProfileId: mainDoctorProfile.id,
        clinicId: clinicPrincipal.id,
      },
    },
    update: {},
    create: {
      doctorProfileId: mainDoctorProfile.id,
      clinicId: clinicPrincipal.id,
      isPrimary: true,
      isActive: true,
    },
  });

  const dc2 = await prisma.doctorClinic.upsert({
    where: {
      doctorProfileId_clinicId: {
        doctorProfileId: mainDoctorProfile.id,
        clinicId: clinicDomicilio.id,
      },
    },
    update: {},
    create: {
      doctorProfileId: mainDoctorProfile.id,
      clinicId: clinicDomicilio.id,
      isPrimary: false,
      isActive: true,
    },
  });

  // Doctor secundario → Clínica Principal + Clínica Norte
  const dc3 = await prisma.doctorClinic.upsert({
    where: {
      doctorProfileId_clinicId: {
        doctorProfileId: doctorProfile.id,
        clinicId: clinicPrincipal.id,
      },
    },
    update: {},
    create: {
      doctorProfileId: doctorProfile.id,
      clinicId: clinicPrincipal.id,
      isPrimary: true,
      isActive: true,
    },
  });

  const dc4 = await prisma.doctorClinic.upsert({
    where: {
      doctorProfileId_clinicId: {
        doctorProfileId: doctorProfile.id,
        clinicId: clinicNorte.id,
      },
    },
    update: {},
    create: {
      doctorProfileId: doctorProfile.id,
      clinicId: clinicNorte.id,
      isPrimary: false,
      isActive: true,
    },
  });

  // ─── Horarios (Schedule) ─────────────────────────────────────
  // Main doctor — Clínica Principal: Lun-Vie con pausa 14-16
  const mainSchedules = [
    // Lunes con dos bloques
    {
      doctorClinicId: dc1.id,
      weekDay: 1,
      startTime: '08:00',
      endTime: '14:00',
    },
    {
      doctorClinicId: dc1.id,
      weekDay: 1,
      startTime: '16:00',
      endTime: '20:00',
    },
    // Martes - Viernes: bloque único
    {
      doctorClinicId: dc1.id,
      weekDay: 2,
      startTime: '08:00',
      endTime: '14:00',
    },
    {
      doctorClinicId: dc1.id,
      weekDay: 3,
      startTime: '08:00',
      endTime: '14:00',
    },
    {
      doctorClinicId: dc1.id,
      weekDay: 4,
      startTime: '08:00',
      endTime: '14:00',
    },
    {
      doctorClinicId: dc1.id,
      weekDay: 5,
      startTime: '08:00',
      endTime: '14:00',
    },
    // Domicilio: viernes tarde
    {
      doctorClinicId: dc2.id,
      weekDay: 5,
      startTime: '15:00',
      endTime: '19:00',
    },
  ];

  // Doctor secundario — Clínica Principal: Mar-Jue
  const doctorSchedules = [
    {
      doctorClinicId: dc3.id,
      weekDay: 2,
      startTime: '09:00',
      endTime: '17:00',
    },
    {
      doctorClinicId: dc3.id,
      weekDay: 4,
      startTime: '09:00',
      endTime: '17:00',
    },
    // Clínica Norte: Sábados
    {
      doctorClinicId: dc4.id,
      weekDay: 6,
      startTime: '08:00',
      endTime: '13:00',
    },
  ];

  for (const s of [...mainSchedules, ...doctorSchedules]) {
    const exists = await prisma.schedule.findFirst({
      where: {
        doctorClinicId: s.doctorClinicId,
        weekDay: s.weekDay,
        startTime: s.startTime,
      },
    });
    if (!exists) await prisma.schedule.create({ data: s });
  }

  console.log('✅ Seed completado');
  console.log('   Admin:       victor.961004@outlook.com');
  console.log('   Main Doctor: carolina.cervantes@medisys.mx');
  console.log('   Doctor:      arturo.ramos@medisys.mx');
  console.log('   Recepción:   recepcion@medisys.mx');
  console.log('   Password:    Admin1234!');
  console.log(
    `   Clínicas:    ${clinicPrincipal.name} | ${clinicNorte.name} | ${clinicDomicilio.name}`,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
