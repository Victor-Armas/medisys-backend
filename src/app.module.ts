import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DoctorsModule } from './doctors/doctors.module';
import { PatientsModule } from './patients/patients.module';
import { ClinicsModule } from './clinics/clinics.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { UsersModule } from '@users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, // @Global() — PrismaService disponible en toda la app
    CloudinaryModule,
    UsersModule,
    AuthModule,
    ClinicsModule,
    DoctorsModule,
    PatientsModule,
  ],
})
export class AppModule {}
