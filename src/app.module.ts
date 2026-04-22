import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DoctorsModule } from './doctors/doctors.module';
import { PatientsModule } from './patients/patients.module';
import { ClinicsModule } from './clinics/clinics.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { UsersModule } from '@users/users.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PatientAuthModule } from './patient-auth/patient-auth.module';
import { SepomexModule } from './sepomex/sepomex.module';
import { MedicalCatalogModule } from './medical-catalog/medical-catalog.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting global — protege todos los endpoints.
    // Los endpoints críticos (auth) sobrescriben con @Throttle() propio.
    // default: 60 requests / 60 segundos por IP
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 60 segundos
        limit: 60,
      },
    ]),
    PrismaModule, // @Global() — PrismaService disponible en toda la app
    CloudinaryModule, // @Global

    // ── Fase 1 ────────────────────────────────────────────────

    AuthModule,
    UsersModule,
    ClinicsModule,
    DoctorsModule,

    // ── Fase 2 ────────────────────────────────────────────────
    PatientsModule,
    PatientAuthModule,
    SepomexModule,
    MedicalCatalogModule,

    //── Fase 3 ────────────────────────────────────────────────
    AppointmentsModule,
    WhatsappModule,
  ],
  providers: [
    // Aplica ThrottlerGuard a TODOS los endpoints de la app
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
